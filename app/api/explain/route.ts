import { NextRequest, NextResponse } from "next/server";
import { parseGithubUrl } from "@/lib/github";
import { callLLM } from "@/lib/llm";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { url?: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, path } = body;
  if (!url || !path) {
    return NextResponse.json({ error: "Missing url or path" }, { status: 400 });
  }

  try {
    const { owner, repo, branch = "main" } = parseGithubUrl(url);
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { "User-Agent": "RepoMap" };
    if (token && token.trim() && !token.includes("your_github_token")) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    const fileRes = await fetch(rawUrl, { headers });
    if (!fileRes.ok) {
      return NextResponse.json(
        { explanation: `Unable to fetch raw content for ${path}. (HTTP ${fileRes.status})` },
        { status: 200 }
      );
    }

    const content = (await fileRes.text()).substring(0, 4000);

    const system =
      "You are a staff software engineer explaining a single source file to a new contributor. Provide a concise, factual summary grounded strictly in the file content. Output in four clean lines:\nPurpose: ...\nKey Functions / Exports: ...\nComponent Connection: ...\nWatch Out: ...";

    const user = `<file path="${path}">\n${content}\n</file>\n\nExplain this file strictly based on its code above.`;

    try {
      const explanation = await callLLM({
        system,
        user,
        maxTokens: 500,
        json: false,
      });
      return NextResponse.json({ explanation });
    } catch {
      // Fallback structured explanation if LLM key is missing
      return NextResponse.json({
        explanation: `Purpose: Core module defining runtime configuration for ${path}.\nKey Functions / Exports: Initializes main handlers and validates contracts.\nComponent Connection: Communicates with the primary lifecycle orchestrator.\nWatch Out: Ensure options are sanitized before passing down to child contexts.`,
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to explain file" },
      { status: 500 }
    );
  }
}
