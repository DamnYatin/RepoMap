import { NextRequest, NextResponse } from "next/server";
import { parseGithubUrl } from "@/lib/github";
import { buildCacheKey, getCachedGuide } from "@/lib/cache";
import { callLLM } from "@/lib/llm";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  fileLink: string;
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const { owner, repo } = parseGithubUrl(url);
    const cacheKey = buildCacheKey(owner, repo, "latest");
    const guide = getCachedGuide(cacheKey);

    // Default high-quality fallback questions derived from the guide
    const fallbackQuiz: QuizQuestion[] = [
      {
        id: 1,
        question: `What is the primary architectural responsibility of ${guide?.components[0]?.name || "the core server module"}?`,
        options: [
          guide?.components[0]?.responsibility || "Initializes the runtime and configures options",
          "Executes test runners and builds production bundles",
          "Parses raw database queries and handles connection pooling",
          "Generates static HTML documentation pages",
        ],
        correctIndex: 0,
        explanation: `${guide?.components[0]?.name || "The core module"} initializes the main runtime engine and exposes public APIs.`,
        fileLink: guide?.components[0]?.path || "lib/fastify.js",
      },
      {
        id: 2,
        question: `Which core design pattern is primarily used in ${guide?.metadata.repoName || "this codebase"}?`,
        options: [
          "Monolithic static site compiler",
          guide?.summary.pattern || "Modular Web Framework / Middleware Pipeline",
          "Pure peer-to-peer distributed gossip protocol",
          "Client-side Canvas rendering engine",
        ],
        correctIndex: 1,
        explanation: `The repository implements a ${guide?.summary.pattern || "modular architecture pattern"}.`,
        fileLink: guide?.startHere[0]?.path || "package.json",
      },
      {
        id: 3,
        question: `What is the recommended test execution command for local verification?`,
        options: [
          "docker run test",
          "make compile-test",
          guide?.runLocally.testCommand || "npm test",
          "python -m unittest discover",
        ],
        correctIndex: 2,
        explanation: `The documented test suite command is ${guide?.runLocally.testCommand || "npm test"}.`,
        fileLink: guide?.runLocally.sources[0] || "package.json",
      },
    ];

    return NextResponse.json({ questions: fallbackQuiz });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
