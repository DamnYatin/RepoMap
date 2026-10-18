import { NextRequest, NextResponse } from "next/server";
import { parseGithubUrl, fetchGoodFirstIssues } from "@/lib/github";

export async function POST(req: NextRequest) {
  let body: { url?: string; owner?: string; repo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let owner = body.owner;
  let repo = body.repo;

  if ((!owner || !repo) && body.url) {
    try {
      const parsed = parseGithubUrl(body.url);
      owner = parsed.owner;
      repo = parsed.repo;
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner and repo" }, { status: 400 });
  }

  try {
    const issues = await fetchGoodFirstIssues(owner, repo);
    return NextResponse.json({ issues });
  } catch (err) {
    return NextResponse.json({ error: String(err), issues: [] }, { status: 500 });
  }
}
