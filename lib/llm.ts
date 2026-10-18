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

// Cached list of discovered Groq models for the current API key
let discoveredGroqModels: string[] | null = null;

export async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  if (discoveredGroqModels && discoveredGroqModels.length > 0) {
    return discoveredGroqModels;
  }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const chatModels = data.data
          .map((m: { id: string }) => m.id)
          .filter(
            (id: string) =>
              (id.startsWith("openai/") || id.startsWith("qwen/") || id.includes("llama") || id.includes("mixtral")) &&
              !id.includes("whisper") &&
              !id.includes("prompt-guard") &&
              !id.includes("safeguard") &&
              !id.includes("canopylabs") &&
              !id.includes("audio")
          )
          // Prioritize high-capacity and reliable Llama models
          .sort((a: string, b: string) => {
            if (a.includes("llama-3.3-70b")) return -1;
            if (b.includes("llama-3.3-70b")) return 1;
            if (a.includes("llama-3.1-8b")) return -1;
            if (b.includes("llama-3.1-8b")) return 1;
            if (a.includes("llama-3.1")) return -1;
            if (b.includes("llama-3.1")) return 1;
            if (a.includes("mixtral")) return -1;
            if (b.includes("mixtral")) return 1;
            return 0;
          });
        discoveredGroqModels = chatModels;
        return chatModels;
      }
    }
  } catch (err) {
    console.warn("Could not query Groq models endpoint:", err);
  }
  // Safe defaults if query fails: high-capacity models first
  return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "qwen/qwen3.8-27b"];
}

/**
 * Resolves active LLM configuration with automatic Groq free-tier detection.
 * Supports GROQ_API_KEY, groq_api_key, LLM_API_KEY, gsk_ prefix, and dynamic model discovery.
 */
export function getLLMConfig(): LLMConfig {
  const groqKey = process.env.GROQ_API_KEY || process.env.groq_api_key;
  const genericKey = process.env.LLM_API_KEY || process.env.llm_api_key;

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

  // Default model selection:
  // For Groq: default to "openai/gpt-oss-120b" (dynamically resolved against live account models), for OpenAI: gpt-4o-mini
  const defaultModel = isGroq ? "openai/gpt-oss-120b" : "gpt-4o-mini";
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
 * Features 40s timeout, automatic Groq model discovery, 404 model_not_found fallback, and retries.
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

  // If using Groq, resolve available models to prevent 404 model_not_found
  let groqAvailableModels: string[] = [];
  if (config.isGroq) {
    groqAvailableModels = await getAvailableGroqModels(config.apiKey);
  }

  const endpoint = `${config.baseUrl}/chat/completions`;

  const makeAttempt = async (
    useJsonFormat: boolean,
    modelCandidateIndex = 0,
    currentUserContent = user
  ): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000); // 40-second timeout

    let activeModel = config.model;
    if (config.isGroq && groqAvailableModels.length > 0) {
      if (!process.env.LLM_MODEL) {
        // Pick from available models in order
        activeModel = groqAvailableModels[modelCandidateIndex] || groqAvailableModels[0];
      } else if (modelCandidateIndex > 0) {
        activeModel = groqAvailableModels[modelCandidateIndex] || groqAvailableModels[0];
      }
    }

    // Enforce safe token limits for Groq free-tier (8,000 TPM total request limit: prompt + max_tokens)
    const effectiveMaxTokens = config.isGroq ? Math.min(maxTokens, 2000) : maxTokens;

    const body: Record<string, unknown> = {
      model: activeModel,
      temperature: 0.2,
      max_tokens: effectiveMaxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: currentUserContent },
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
          return makeAttempt(false, modelCandidateIndex, currentUserContent);
        }

        // Groq Request Too Large / ITPM token limit exceeded (413):
        if (
          config.isGroq &&
          (res.status === 413 ||
            errorText.includes("Request too large") ||
            errorText.includes("ITPM") ||
            errorText.includes("tokens per minute"))
        ) {
          // If we have a next model candidate (e.g. llama-3.1-8b-instant with 30,000 ITPM), try it
          if (modelCandidateIndex + 1 < groqAvailableModels.length) {
            const nextModel = groqAvailableModels[modelCandidateIndex + 1];
            console.warn(
              `Groq model ${activeModel} hit token limit (413). Falling back to higher-capacity model ${nextModel}...`
            );
            return makeAttempt(useJsonFormat, modelCandidateIndex + 1, currentUserContent);
          }

          // If no other model and prompt is large, dynamically truncate code budget and retry
          if (currentUserContent.length > 7000) {
            console.warn("Groq request too large (413). Reducing prompt size and retrying...");
            const truncated =
              currentUserContent.substring(0, Math.floor(currentUserContent.length * 0.6)) +
              "\n</file_contents>\n</repo_data>\nOutput valid JSON onboarding guide only.";
            return makeAttempt(useJsonFormat, modelCandidateIndex, truncated);
          }
        }

        // Groq Model Not Found (404) handling:
        // Automatically try the next available model for this account
        if (
          config.isGroq &&
          res.status === 404 &&
          (errorText.includes("model_not_found") || errorText.includes("does not exist")) &&
          modelCandidateIndex + 1 < groqAvailableModels.length
        ) {
          const nextModel = groqAvailableModels[modelCandidateIndex + 1];
          console.warn(
            `Groq model ${activeModel} not found (404). Falling back to ${nextModel}...`
          );
          return makeAttempt(useJsonFormat, modelCandidateIndex + 1, currentUserContent);
        }

        // Groq Free Tier TPM rate limit handling (429):
        // Automatically try next model
        if (
          config.isGroq &&
          res.status === 429 &&
          modelCandidateIndex + 1 < groqAvailableModels.length
        ) {
          const nextModel = groqAvailableModels[modelCandidateIndex + 1];
          console.warn(
            `Groq ${activeModel} hit rate limit (429). Falling back to ${nextModel}...`
          );
          return makeAttempt(useJsonFormat, modelCandidateIndex + 1, currentUserContent);
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
    return await makeAttempt(json, 0);
  } catch (err: unknown) {
    const isRetryable =
      ((err as LLMError)?.status && (err as LLMError).status! >= 500) ||
      (err as Error)?.name === "FetchError" ||
      !(err as LLMError)?.status;

    if (isRetryable) {
      console.warn("Retrying LLM call once after error:", (err as Error).message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await makeAttempt(false, 0);
    }
    throw err;
  }
}
