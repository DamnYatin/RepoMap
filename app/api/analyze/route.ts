import { NextRequest, NextResponse } from "next/server";
import { parseGithubUrl, getRepoContext, GithubApiError } from "@/lib/github";
import { analyzeRepoWithLLM } from "@/lib/analyzer";
import { buildCacheKey, getCachedGuide, setCachedGuide } from "@/lib/cache";
import { StageId, StreamEvent } from "@/lib/types";
import { SAMPLE_GUIDE } from "@/lib/sample-data";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 10 requests per minute per IP
const ipRateLimits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;

  const timestamps = (ipRateLimits.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  ipRateLimits.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        error: true,
        code: "RATE_LIMITED",
        message: "Too many analysis requests. Limit is 10 requests per minute.",
      },
      { status: 429 }
    );
  }

  let body: { url?: string; forceFresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        code: "INVALID_URL",
        message: "Invalid JSON request body",
      },
      { status: 400 }
    );
  }

  const { url, forceFresh = false } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      {
        error: true,
        code: "INVALID_URL",
        message: "Enter a URL in the form github.com/owner/repository.",
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: StreamEvent) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
    } catch {
      // client may have disconnected
    }
  };

  const sendStage = async (id: StageId, status: "pending" | "running" | "done" | "failed") => {
    await sendEvent({ type: "stage", id, status });
  };

  // Run analysis pipeline asynchronously in stream
  (async () => {
    const startTime = Date.now();
    try {
      // Stage 1: Validating repository
      await sendStage("validating", "running");
      const parsed = parseGithubUrl(url);
      await sendStage("validating", "done");

      // Stage 2: Fetch tree & metadata
      await sendStage("fetch_tree", "running");
      const context = await getRepoContext(url);
      await sendStage("fetch_tree", "done");

      // Check Cache
      const cacheKey = buildCacheKey(
        context.meta.owner,
        context.meta.repo,
        context.treeSha,
        context.scope
      );

      if (!forceFresh) {
        const cached = getCachedGuide(cacheKey);
        if (cached) {
          console.log(`Cache HIT for ${cacheKey}`);
          await sendStage("reading_files", "done");
          await sendStage("analyzing", "done");
          await sendStage("preparing", "done");
          await sendEvent({ type: "result", data: cached });
          await writer.close();
          return;
        }
      }

      // Stage 3: Reading files
      await sendStage("reading_files", "running");
      // Files were already fetched in getRepoContext
      await sendStage("reading_files", "done");

      // Stage 4: Analyzing architecture
      await sendStage("analyzing", "running");
      
      let guide;
      try {
        guide = await analyzeRepoWithLLM(context);
      } catch (llmErr: unknown) {
        // If LLM API key is missing or failed, check if this is fastify/fastify sample or fallback
        const errMessage = (llmErr as Error).message || "";
        if (errMessage.includes("MISSING_API_KEY") || errMessage.includes("LLM_API_KEY")) {
          // If no LLM key is configured in user's environment, check if sample matches or notify clearly
          if (
            context.meta.owner.toLowerCase() === "fastify" &&
            context.meta.repo.toLowerCase() === "fastify"
          ) {
            guide = SAMPLE_GUIDE;
          } else {
            throw new GithubApiError(
              "ANALYSIS_FAILED",
              "LLM_API_KEY is not configured in .env.local. Please configure LLM_API_KEY or use one of the precached example repositories.",
              errMessage
            );
          }
        } else {
          throw llmErr;
        }
      }
      await sendStage("analyzing", "done");

      // Stage 5: Preparing guide
      await sendStage("preparing", "running");
      // Cache result
      setCachedGuide(cacheKey, guide);
      await sendStage("preparing", "done");

      // Emit Final Result
      await sendEvent({ type: "result", data: guide });
    } catch (err: unknown) {
      console.error("Error in /api/analyze stream:", err);
      if (err instanceof GithubApiError) {
        await sendEvent({
          type: "error",
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        await sendEvent({
          type: "error",
          code: "ANALYSIS_FAILED",
          message: (err as Error).message || "An error occurred during analysis.",
          details: String(err),
        });
      }
    } finally {
      try {
        await writer.close();
      } catch {
        // already closed
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
