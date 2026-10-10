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

/**
 * Executes a call to any OpenAI-compatible /chat/completions endpoint.
 * Supports OpenAI, Gemini OpenAI endpoint, Groq, Mistral, Ollama, etc.
 * Enforces 40s timeout, temperature 0.2, and automatic retry on 5xx or network errors.
 */
export async function callLLM({
  system,
  user,
  maxTokens = 4096,
  json = false,
}: CallLLMOptions): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey || apiKey.includes("your_llm_api_key")) {
    throw new LLMError(
      "LLM_API_KEY is not configured in .env.local. Please configure LLM_API_KEY to enable live AI analysis.",
      "MISSING_API_KEY"
    );
  }

  const endpoint = `${baseUrl}/chat/completions`;

  const makeAttempt = async (useJsonFormat: boolean): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000); // 40-second timeout

    const body: Record<string, unknown> = {
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
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
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        // If provider rejects json_object format, fallback without it
        if (useJsonFormat && res.status === 400 && errorText.toLowerCase().includes("response_format")) {
          return makeAttempt(false);
        }

        const is5xx = res.status >= 500 && res.status < 600;
        throw new LLMError(
          `LLM provider returned HTTP ${res.status}: ${errorText.substring(0, 300)}`,
          is5xx ? "PROVIDER_5XX" : "PROVIDER_ERROR",
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
      (err as LLMError)?.status && (err as LLMError).status! >= 500 ||
      (err as Error)?.name === "FetchError" ||
      !(err as LLMError)?.status;

    if (isRetryable) {
      console.warn("Retrying LLM call once after error:", (err as Error).message);
      // Brief 1s delay before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await makeAttempt(false);
    }
    throw err;
  }
}
