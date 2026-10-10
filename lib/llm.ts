export interface CallLLMOptions {
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}

export class LLMError extends Error {
  code: string;
  status?: number;
  details?: string;

  constructor(message: string, code = "LLM_ERROR", status?: number, details?: string) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface LLMConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  isGroq: boolean;
}

/**
 * Resolves active LLM configuration with automatic Groq free-tier detection.
 * Supports GROQ_API_KEY, gsk_ key prefix, custom LLM_BASE_URL, and model overrides.
 */
export function getLLMConfig(): LLMConfig {
  const groqKey = process.env.GROQ_API_KEY;
  const genericKey = process.env.LLM_API_KEY;

  const activeKey =
    groqKey && !groqKey.includes("your_groq_api_key")
      ? groqKey
      : genericKey;

  const isGroq = Boolean(
    (groqKey && !groqKey.includes("your_groq_api_key")) ||
    (activeKey && activeKey.trim().startsWith("gsk_")) ||
    (process.env.LLM_BASE_URL && process.env.LLM_BASE_URL.includes("groq.com")) ||
    (process.env.LLM_MODEL && process.env.LLM_MODEL.toLowerCase().includes("llama"))
  );

  const baseUrl = (
    process.env.LLM_BASE_URL ||
    (isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1")
  ).replace(/\/+$/, "");

  // Default to llama-3.1-8b-instant for Groq (universal free tier availability), or gpt-4o-mini for OpenAI
  const defaultModel = isGroq ? "llama-3.1-8b-instant" : "gpt-4o-mini";
  const model = process.env.LLM_MODEL || defaultModel;

  return {
    apiKey: activeKey?.trim(),
    baseUrl,
    model,
    isGroq,
  };
}

/**
 * Executes a call to any OpenAI-compatible /chat/completions endpoint.
 * Supports OpenAI, Groq, Gemini OpenAI endpoint, Mistral, Ollama, etc.
 * Features 40s timeout, Groq TPM auto-fallback to llama-3.1-8b-instant, and retries.
 */
export async function callLLM({
  system,
  user,
  maxTokens = 4096,
  json = false,
}: CallLLMOptions): Promise<string> {
  const config = getLLMConfig();

  if (!config.apiKey || config.apiKey.includes("your_llm_api_key")) {
    throw new LLMError(
      "No valid LLM API key found. Please configure GROQ_API_KEY or LLM_API_KEY in .env.local to enable live AI analysis.",
      "MISSING_API_KEY"
    );
  }

  const endpoint = `${config.baseUrl}/chat/completions`;

  const makeAttempt = async (
    useJsonFormat: boolean,
    modelOverride?: string
  ): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000); // 40-second timeout

    const activeModel = modelOverride || config.model;

    // Enforce safe token limits for Groq free-tier
    const effectiveMaxTokens = config.isGroq ? Math.min(maxTokens, 3500) : maxTokens;

    const body: Record<string, unknown> = {
      model: activeModel,
      temperature: 0.2,
      max_tokens: effectiveMaxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    if (json && useJsonFormat) {
      body.response_format = { type: "json_object" };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");

        // If provider rejects json_object format, retry without it
        if (useJsonFormat && res.status === 400 && errorText.toLowerCase().includes("response_format")) {
          return makeAttempt(false, activeModel);
        }

        // Groq Model Not Found (404) or Access Denied handling:
        // Automatically fallback to llama-3.1-8b-instant which is universally available on all free accounts
        if (
          config.isGroq &&
          res.status === 404 &&
          (errorText.includes("model_not_found") || errorText.includes("does not exist")) &&
          activeModel !== "llama-3.1-8b-instant"
        ) {
          console.warn(
            `Groq model ${activeModel} not found (404). Falling back to universal llama-3.1-8b-instant...`
          );
          return makeAttempt(useJsonFormat, "llama-3.1-8b-instant");
        }

        // Groq Free Tier TPM rate limit handling:
        // If 70B hits TPM limit (429), automatically fallback to llama-3.1-8b-instant
        // which has a massive 30,000 TPM limit and finishes in under 1 second!
        if (config.isGroq && res.status === 429 && activeModel !== "llama-3.1-8b-instant") {
          console.warn(
            `Groq ${activeModel} hit rate limit (429). Falling back to high-throughput llama-3.1-8b-instant...`
          );
          return makeAttempt(useJsonFormat, "llama-3.1-8b-instant");
        }

        const is5xx = res.status >= 500 && res.status < 600;
        throw new LLMError(
          `LLM provider (${config.isGroq ? "Groq" : "OpenAI-compatible"}) returned HTTP ${res.status}: ${errorText.substring(0, 300)}`,
          is5xx ? "PROVIDER_5XX" : res.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR",
          res.status,
          errorText
        );
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new LLMError("LLM response did not contain message content", "INVALID_RESPONSE");
      }

      return content;
    } catch (err: unknown) {
      clearTimeout(timeout);
      if ((err as Error)?.name === "AbortError") {
        throw new LLMError("LLM call timed out after 40 seconds", "TIMEOUT");
      }
      throw err;
    }
  };

  // Up to 1 retry on network or 5xx errors
  try {
    return await makeAttempt(json);
  } catch (err: unknown) {
    const isRetryable =
      ((err as LLMError)?.status && (err as LLMError).status! >= 500) ||
      (err as Error)?.name === "FetchError" ||
      !(err as LLMError)?.status;

    if (isRetryable) {
      console.warn("Retrying LLM call once after error:", (err as Error).message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await makeAttempt(false);
    }
    throw err;
  }
}
