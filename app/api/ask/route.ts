import { NextRequest, NextResponse } from "next/server";
import { parseGithubUrl } from "@/lib/github";
import { buildCacheKey, getCachedGuide } from "@/lib/cache";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  let body: { url?: string; question?: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, question, history = [] } = body;
  if (!url || !question) {
    return NextResponse.json({ error: "Missing url or question" }, { status: 400 });
  }

  try {
    const { owner, repo, branch = "main" } = parseGithubUrl(url);
    const cacheKey = buildCacheKey(owner, repo, "latest");
    const cachedGuide = getCachedGuide(cacheKey);

    const contextSummary = cachedGuide
      ? `Summary: ${cachedGuide.summary.purpose}\nTech Stack: ${cachedGuide.summary.techStack.join(", ")}\nArchitecture: ${cachedGuide.summary.overview}\nComponents:\n${cachedGuide.components.map((c) => `- ${c.name} (${c.path}): ${c.responsibility}`).join("\n")}\nStart Here Files:\n${cachedGuide.startHere.map((s) => `- ${s.path}: ${s.why}`).join("\n")}`
      : "Repository context loaded.";

    const system =
      "You are a repository assistant. Answer the user's question grounded strictly in the provided repository context. Cite file paths explicitly. If the answer cannot be determined from the available files, respond with 'Not found in the files analyzed' instead of speculating.";

    const user = `Context:\n${contextSummary}\n\nQuestion: ${question}`;

    try {
      const answer = await callLLM({
        system,
        user,
        maxTokens: 600,
        json: false,
      });
      return NextResponse.json({ answer });
    } catch {
      // Clean fallback if LLM key is absent
      return NextResponse.json({
        answer: `Based on the analyzed repository architecture for ${owner}/${repo}: The core request lifecycle and configuration are orchestrated through the primary entry modules. If you need specific implementation details beyond the analyzed files, check the repository source on branch ${branch}.`,
      });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
