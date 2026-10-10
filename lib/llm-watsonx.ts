/**
 * Watsonx.ai Provider Adapter
 * Exchanges IBM Cloud API key for an IAM bearer token, caches token with expiry,
 * and calls the official IBM watsonx.ai text chat endpoint.
 */

interface CachedIamToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedIamToken | null = null;

async function getIamToken(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const tokenUrl = "https://iam.cloud.ibm.com/identity/token";
  const params = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });

  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    throw new Error(`watsonx IAM auth failed at network connection: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`watsonx IAM token exchange failed with HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("watsonx IAM response did not contain access_token");
  }

  const expiresIn = data.expires_in || 3600;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return data.access_token;
}

export async function callWatsonx({
  system,
  user,
  maxTokens = 3000,
}: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const baseUrl = (process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com").replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("watsonx failed: WATSONX_API_KEY is not defined");
  }
  if (!projectId) {
    throw new Error("watsonx failed: WATSONX_PROJECT_ID is not defined");
  }

  const token = await getIamToken(apiKey);
  const endpoint = `${baseUrl}/ml/v1/text/chat?version=2023-05-29`;

  const body = {
    project_id: projectId,
    model_id: "ibm/granite-13b-chat-v2",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    parameters: {
      temperature: 0.2,
      max_new_tokens: maxTokens,
    },
  };

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`watsonx chat API request failed at network step: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`watsonx chat endpoint failed with HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.results?.[0]?.generated_text || data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("watsonx response did not contain generated text");
  }

  return text;
}
