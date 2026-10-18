import { RepoContext, RepoContextFile, RepoErrorCode } from "./types";

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  branch?: string;
  subpath?: string;
}

export class GithubApiError extends Error {
  code: RepoErrorCode;
  resetAt?: string;
  details?: string;

  constructor(code: RepoErrorCode, message: string, details?: string, resetAt?: string) {
    super(message);
    this.name = "GithubApiError";
    this.code = code;
    this.details = details;
    this.resetAt = resetAt;
  }
}

/**
 * Validates and parses any GitHub URL or shorthand.
 * Prevents SSRF / malicious redirect targets by strictly validating owner & repo characters.
 */
export function parseGithubUrl(rawInput: string): ParsedGithubUrl {
  if (!rawInput || typeof rawInput !== "string") {
    throw new GithubApiError("INVALID_URL", "Enter a URL in the form github.com/owner/repository.");
  }

  let cleaned = rawInput.trim();
  // Strip protocols
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  // Strip www.
  cleaned = cleaned.replace(/^www\./i, "");

  // Match github.com/owner/repo or owner/repo directly
  let pathname = cleaned;
  if (cleaned.startsWith("github.com/")) {
    pathname = cleaned.replace(/^github\.com\//i, "");
  }

  // Strip trailing slashes or .git
  pathname = pathname.replace(/\.git$/i, "");
  pathname = pathname.replace(/^\/+|\/+$/g, "");

  const parts = pathname.split("/");
  if (parts.length < 2) {
    throw new GithubApiError("INVALID_URL", "Enter a URL in the form github.com/owner/repository.");
  }

  const owner = parts[0];
  const repo = parts[1];

  if (
    owner === "." ||
    owner === ".." ||
    repo === "." ||
    repo === ".." ||
    owner.includes("..") ||
    repo.includes("..")
  ) {
    throw new GithubApiError("INVALID_URL", "Invalid owner or repository name.");
  }

  const validNameRegex = /^[A-Za-z0-9_.-]+$/;
  if (!validNameRegex.test(owner) || !validNameRegex.test(repo) || owner.length > 100 || repo.length > 100) {
    throw new GithubApiError(
      "INVALID_URL",
      "Repository or owner contains invalid characters. Use letters, numbers, hyphens, and periods only."
    );
  }

  let branch: string | undefined = undefined;
  let subpath: string | undefined = undefined;

  // Support /tree/<branch> and /tree/<branch>/<subpath>
  if (parts.length >= 4 && parts[2].toLowerCase() === "tree") {
    branch = parts[3];
    if (parts.length > 4) {
      subpath = parts.slice(4).join("/");
    }
  }

  return { owner, repo, branch, subpath };
}

function getGithubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RepoMap-Codebase-Onboarding-Tool",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim() && !token.includes("your_github_token")) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Executes a GitHub API request with typed error mapping
 */
async function fetchGithubApi(endpoint: string): Promise<any> {
  const url = `https://api.github.com${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: getGithubHeaders(),
      next: { revalidate: 300 }, // 5 min cache
    });
  } catch (err: unknown) {
    throw new GithubApiError("NETWORK", "Unable to connect to GitHub. Check your network connection.", String(err));
  }

  if (!res.ok) {
    const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
    const rateLimitReset = res.headers.get("x-ratelimit-reset");
    const resetDate = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : undefined;

    if (res.status === 403 || res.status === 429) {
      if (rateLimitRemaining === "0") {
        throw new GithubApiError(
          "RATE_LIMITED",
          "GitHub API rate limit exceeded. Set a GITHUB_TOKEN in .env.local to raise your limit to 5,000 requests/hr.",
          undefined,
          resetDate
        );
      }
      throw new GithubApiError("PRIVATE_OR_FORBIDDEN", "Access to this repository was forbidden. Ensure it is public.");
    }

    if (res.status === 404) {
      throw new GithubApiError("NOT_FOUND", "Repository was not found or is private.");
    }

    if (res.status === 409) {
      throw new GithubApiError("EMPTY_REPO", "The repository is empty (no commits found).");
    }

    const errText = await res.text().catch(() => "");
    throw new GithubApiError("NETWORK", `GitHub API error: HTTP ${res.status}`, errText);
  }

  return res.json();
}

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "vendor",
  "target",
  "coverage",
  "__pycache__",
  ".cache",
  ".venv",
  "venv",
]);

const EXCLUDED_EXTENSIONS = new Set([
  // Binaries & archives
  "exe", "dll", "so", "dylib", "zip", "tar", "gz", "tgz", "7z", "rar",
  // Images & audio/video
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "mp4", "mp3", "wav",
  // Fonts
  "woff", "woff2", "ttf", "eot",
  // Documents & compiled
  "pdf", "psd", "ai", "pyc", "class", "o", "obj",
  // Minified & maps
  "map",
  // Lock files
  "lock",
]);

function isExcludedPath(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts) {
    if (EXCLUDED_DIR_NAMES.has(part.toLowerCase())) {
      return true;
    }
  }

  const filename = parts[parts.length - 1];
  if (
    filename === "package-lock.json" ||
    filename === "yarn.lock" ||
    filename === "pnpm-lock.yaml" ||
    filename === "Cargo.lock" ||
    filename === "poetry.lock" ||
    filename === "composer.lock" ||
    filename === "Gemfile.lock"
  ) {
    return true;
  }

  if (filename.endsWith(".min.js") || filename.endsWith(".min.css")) {
    return true;
  }

  const extMatch = filename.match(/\.([A-Za-z0-9]+)$/);
  if (extMatch && EXCLUDED_EXTENSIONS.has(extMatch[1].toLowerCase())) {
    return true;
  }

  return false;
}

function scoreFile(path: string, size: number): number {
  const p = path.toLowerCase();
  const parts = p.split("/");
  const depth = parts.length;
  const filename = parts[parts.length - 1];

  // Test files score zero (skip tests per prompt)
  if (
    p.includes("/test/") ||
    p.includes("/tests/") ||
    p.includes("/__tests__/") ||
    p.includes("/spec/") ||
    filename.includes(".test.") ||
    filename.includes(".spec.")
  ) {
    return -100;
  }

  // Skip files over 20KB (20,480 bytes)
  if (size > 20480) {
    return -50;
  }

  let score = 0;

  // Manifests & top config (Highest: 100+)
  const manifests = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "cargo.toml",
    "gemfile",
    "composer.json",
    "dockerfile",
    "makefile",
    ".env.example",
    "contributing.md",
  ];
  if (manifests.includes(filename) || filename.startsWith("docker-compose")) {
    score += 150 - depth * 10;
    return score;
  }

  // CI workflows
  if (p.startsWith(".github/workflows/") && (p.endsWith(".yml") || p.endsWith(".yaml"))) {
    score += 110;
    return score;
  }

  // Entry files
  const entryNames = ["index.", "main.", "app.", "server.", "manage.py", "cli."];
  const isEntry = entryNames.some((prefix) => filename.startsWith(prefix));
  if (isEntry && depth <= 3) {
    score += 85 - depth * 5;
  }

  // Core directories
  const coreDirs = ["src/", "app/", "lib/", "core/", "cmd/", "pkg/", "internal/"];
  if (coreDirs.some((dir) => p.startsWith(dir))) {
    score += 65 - depth * 4;
  } else {
    score += 35 - depth * 6;
  }

  // Shorter files give slightly higher information density
  if (size > 0 && size < 5000) {
    score += 10;
  }

  return score;
}

/**
 * Concurrently fetches raw file contents from raw.githubusercontent.com
 */
async function fetchFileContents(
  owner: string,
  repo: string,
  branch: string,
  paths: { path: string; size: number }[]
): Promise<RepoContextFile[]> {
  const results: RepoContextFile[] = [];
  const concurrency = 6;
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    "User-Agent": "RepoMap-Codebase-Onboarding-Tool",
  };
  if (token && token.trim() && !token.includes("your_github_token")) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  for (let i = 0; i < paths.length; i += concurrency) {
    const chunk = paths.slice(i, i + concurrency);
    const promises = chunk.map(async ({ path, size }) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        const res = await fetch(rawUrl, { headers });
        if (res.ok) {
          const rawText = await res.text();
          const truncated =
            rawText.length > 3000
              ? rawText.substring(0, 3000) + "\n... [truncated]"
              : rawText;
          return {
            path,
            content: truncated,
            bytes: size || rawText.length,
          };
        }
      } catch (err) {
        console.warn(`Failed to fetch raw file ${path}:`, err);
      }
      return null;
    });

    const chunkResults = await Promise.all(promises);
    for (const r of chunkResults) {
      if (r) results.push(r);
    }
  }

  return results;
}

/**
 * Full GitHub repository context extraction pipeline.
 */
export async function getRepoContext(rawUrl: string): Promise<RepoContext> {
  const { owner, repo, branch: requestedBranch, subpath } = parseGithubUrl(rawUrl);
  const warnings: string[] = [];

  // 1. Fetch repo metadata
  const metaData = await fetchGithubApi(`/repos/${owner}/${repo}`);
  const defaultBranch = metaData.default_branch || "main";
  const branch = requestedBranch || defaultBranch;

  // 2. Fetch languages breakdown
  const languagesRaw: Record<string, number> = await fetchGithubApi(`/repos/${owner}/${repo}/languages`).catch(
    () => ({})
  );
  const totalLangBytes = Object.values(languagesRaw).reduce((a, b) => a + b, 0);
  const languages: Record<string, number> = {};
  if (totalLangBytes > 0) {
    for (const [lang, bytes] of Object.entries(languagesRaw)) {
      const pct = Math.round((bytes / totalLangBytes) * 1000) / 10;
      if (pct >= 0.5) {
        languages[lang] = pct;
      }
    }
  }

  // 3. Fetch README
  let readmeText: string | null = null;
  try {
    const readmeMeta = await fetchGithubApi(`/repos/${owner}/${repo}/readme`);
    if (readmeMeta?.download_url) {
      const readmeRes = await fetch(readmeMeta.download_url);
      if (readmeRes.ok) {
        const fullReadme = await readmeRes.text();
        readmeText =
          fullReadme.length > 4000
            ? fullReadme.substring(0, 4000) + "\n... [truncated]"
            : fullReadme;
      }
    }
  } catch {
    // README optional
  }

  // 4. Fetch recursive git tree
  const treeResponse = await fetchGithubApi(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeResponse.tree || !Array.isArray(treeResponse.tree)) {
    throw new GithubApiError("EMPTY_REPO", "Could not retrieve git tree for repository.");
  }

  if (treeResponse.truncated) {
    warnings.push("Repository tree was truncated by GitHub API (>100,000 files). Analysis used available files.");
  }

  const rawTree: Array<{ path: string; type: string; size?: number }> = treeResponse.tree;

  // Filter blobs only
  let blobs = rawTree.filter((item) => item.type === "blob");

  // Subpath scoping
  if (subpath) {
    warnings.push(`Scope: ${subpath}`);
    blobs = blobs.filter((item) => item.path.startsWith(`${subpath}/`));
  }

  // Filter exclusions
  const filteredBlobs = blobs.filter((b) => !isExcludedPath(b.path));
  const skippedCount = blobs.length - filteredBlobs.length;

  // Tree paths (up to 150 shallower paths for LLM overview)
  const treePaths = filteredBlobs
    .map((b) => b.path)
    .sort((a, b) => a.split("/").length - b.split("/").length)
    .slice(0, 150);

  // Score candidate files
  const scoredCandidates = filteredBlobs
    .map((b) => ({
      path: b.path,
      size: b.size || 0,
      score: scoreFile(b.path, b.size || 0),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  // Pick top 12 to 15 files
  const filesToRead = scoredCandidates.slice(0, 14);

  // Fetch raw contents
  const files = await fetchFileContents(owner, repo, branch, filesToRead);

  return {
    meta: {
      owner,
      repo,
      description: metaData.description || null,
      defaultBranch,
      stars: metaData.stargazers_count || 0,
      size: metaData.size || 0,
      archived: Boolean(metaData.archived),
      primaryLanguage: metaData.language || "Unknown",
      languages,
    },
    readme: readmeText,
    treePaths,
    files,
    skippedCount,
    warnings,
    treeSha: treeResponse.sha || branch,
    scope: subpath,
  };
}

export interface GithubGoodFirstIssue {
  id: number;
  number: number;
  title: string;
  url: string;
  comments: number;
  createdAt: string;
  labels: Array<{ name: string; color: string }>;
}

/**
 * Fetches open issues with labels like 'good first issue' or 'help wanted'
 */
export async function fetchGoodFirstIssues(
  owner: string,
  repo: string
): Promise<GithubGoodFirstIssue[]> {
  try {
    const q = encodeURIComponent(
      `repo:${owner}/${repo} is:issue is:open label:"good first issue","good-first-issue","help wanted","beginner"`
    );
    const searchRes = await fetchGithubApi(
      `/search/issues?q=${q}&sort=updated&order=desc&per_page=5`
    );

    if (searchRes && Array.isArray(searchRes.items) && searchRes.items.length > 0) {
      return searchRes.items.map((item: any) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        url: item.html_url,
        comments: item.comments || 0,
        createdAt: item.created_at,
        labels: (item.labels || []).map((l: any) => ({
          name: String(l.name),
          color: String(l.color || "6f6f6f"),
        })),
      }));
    }

    // Direct fallback
    const directIssues = await fetchGithubApi(
      `/repos/${owner}/${repo}/issues?state=open&labels=good%20first%20issue&per_page=5`
    ).catch(() => []);

    if (Array.isArray(directIssues) && directIssues.length > 0) {
      return directIssues
        .filter((i: any) => !i.pull_request)
        .map((item: any) => ({
          id: item.id,
          number: item.number,
          title: item.title,
          url: item.html_url,
          comments: item.comments || 0,
          createdAt: item.created_at,
          labels: (item.labels || []).map((l: any) => ({
            name: String(l.name),
            color: String(l.color || "6f6f6f"),
          })),
        }));
    }

    return [];
  } catch (err) {
    console.warn("Failed to fetch good first issues:", err);
    return [];
  }
}

export interface RepoBranchesResult {
  defaultBranch: string;
  branches: string[];
}

/**
 * Fetches repository default branch and list of available branches
 */
export async function fetchRepoBranches(
  owner: string,
  repo: string
): Promise<RepoBranchesResult> {
  try {
    const [repoMeta, branchesList] = await Promise.all([
      fetchGithubApi(`/repos/${owner}/${repo}`).catch(() => null),
      fetchGithubApi(`/repos/${owner}/${repo}/branches?per_page=100`).catch(() => []),
    ]);

    const defaultBranch = repoMeta?.default_branch || "main";
    let branches: string[] = [];

    if (Array.isArray(branchesList)) {
      branches = branchesList
        .map((b: any) => (typeof b?.name === "string" ? b.name : ""))
        .filter(Boolean);
    }

    // Default branch at the very top, followed by the rest sorted alphabetically
    const otherBranches = branches
      .filter((b) => b !== defaultBranch)
      .sort((a, b) => a.localeCompare(b));

    const allBranches = [defaultBranch, ...otherBranches];

    return {
      defaultBranch,
      branches: allBranches.length > 0 ? allBranches : [defaultBranch],
    };
  } catch (err) {
    console.warn("Failed to fetch repo branches:", err);
    return {
      defaultBranch: "main",
      branches: ["main"],
    };
  }
}

