# RepoMap — AI Codebase Onboarding in 60 Seconds

> Built for the Hackathon Problem Statement: **"AI for Learning & Developer Productivity"**  
> An enterprise-grade codebase onboarding tool designed in accordance with IBM Carbon principles.

---

## 1. The Problem
When developers join an unfamiliar project, onboarding is often slow, disorienting, and fragmented:
- **README decay**: README files are often outdated, inaccurate, or omit crucial local configuration nuances.
- **Cognitive overload**: Staring at a massive directory tree without knowing where runtime execution begins.
- **Unclear contribution paths**: Newcomers struggle to identify safe, isolated areas of the codebase where they can make a productive first pull request without breaking core abstractions.

## 2. The Solution
**RepoMap** turns any public GitHub repository into a structured, analytical onboarding roadmap in ~60 seconds:
1. **Interactive Architecture Diagram**: Visualizes core components and interaction flows using strict-security Mermaid.js.
2. **5-Step Reading Order ("Start Here")**: A grounded curriculum starting from entrypoints down to runtime engines, with calculated reading times.
3. **Verified Local Runbook**: Extracts prerequisites, copyable commands, test scripts, and required environment variables with a computed confidence rating.
4. **First Contribution Safe Havens**: Recommends 2–4 targeted modules for early contributions and surfaces repository contribution conventions.
5. **Interactive Deep Dives**: Inline single-file explainers ("Explain this file"), concept understanding quizzes, and context-grounded repository Q&A.

---

## 3. How It Works (Architecture Overview)

```
[ User Browser ]
       │
       ▼ (NDJSON Stream: /api/analyze)
[ Next.js API Route ]
       │
       ├──► [ GitHub Data Layer (lib/github.ts) ]
       │         • Validates repository URL & prevents SSRF
       │         • Fetches metadata, languages, and recursive git tree
       │         • Heuristic file scorer: Manifests (package.json, pyproject.toml) > Entrypoints > Shallow core modules
       │         • Concurrently fetches raw file contents (raw.githubusercontent.com)
       │
       ├──► [ Cache Engine (lib/cache.ts) ]
       │         • Keyed by owner/repo@treeSha[:subpath]
       │         • Dual layer: In-memory LRU + Disk cache (.cache/)
       │
       ├──► [ LLM Analytical Pipeline (lib/analyzer.ts & lib/llm.ts) ]
       │         • Untrusted repository sandbox: isolated inside <repo_data> XML tags
       │         • 40,000 char prompt budget management
       │         • 40s timeout with automatic retry on 5xx / network errors
       │
       └──► [ Server-Side Post-Processor & Sanitizer ]
                 • Zod schema validation & code-fence stripping
                 • Cross-checks paths against real tree (eliminates hallucinated files)
                 • Backfills missing curriculum steps from high-scoring files
                 • Synthesizes Mermaid flowchart TD server-side with sanitized node labels
```

---

## 4. Key Design Decisions

### Server-Side Diagram Synthesis (Why Not Let the LLM Write Mermaid?)
1. **Model Reliability**: Models frequently generate invalid Mermaid syntax (e.g. unescaped brackets `n1[Server (HTTP)]`, bad subgraphs, or cycles that fail Mermaid parser).
2. **Security**: Allowing arbitrary strings into client-side diagram renderers poses an XSS risk. By having the model output pure typed data (`components` and `edges`), the server validates each ID, sanitizes all labels to `[A-Za-z0-9 _./-]`, and emits clean, safe Mermaid strings.
3. **Deterministic Theme Syncing**: The client dynamically re-themes the diagram between Light and Dark modes without re-querying the LLM.

### Enterprise Design System (IBM Carbon)
Rather than a generic "vibecoded" aesthetic with gradients, emojis, and purple glow, RepoMap uses **IBM Carbon Design System** tokens:
- High-contrast neutral palette (Carbon Gray 100 in dark mode)
- 4px strict spacing grid
- 0–2px border radii (zero pill buttons)
- 1px bordered panels instead of heavy drop shadows
- IBM Plex Sans (UI) and IBM Plex Mono (code, paths, commands)

---

## 5. Technology Stack
- **Framework**: Next.js 14+ (App Router, Node.js runtime, NDJSON streaming)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with IBM Carbon CSS variable tokens
- **Schema Validation**: `zod` for GitHub API contracts and LLM outputs
- **Icons**: `lucide-react` (16px, 1.5 stroke width)
- **Diagrams**: `mermaid` (dynamically imported client-side, `securityLevel: "strict"`)
- **Testing**: `vitest` for unit tests
- **Fonts**: `next/font/google` IBM Plex Sans & IBM Plex Mono

---

## 6. Setup and Installation

### Prerequisites
- Node.js >= 18.17.0
- npm >= 9.0.0

### Installation Steps
```bash
# Clone the repository
git clone https://github.com/your-username/repomap.git
cd repomap

# Install dependencies
npm install

# Copy environment variables template
cp .env.local.example .env.local
```

### Environment Configuration (`.env.local`)
Edit `.env.local` with your preferred credentials:
```ini
# Optional: Raises GitHub rate limit from 60/hr to 5,000/hr
GITHUB_TOKEN=your_personal_access_token

# LLM Provider Configuration (OpenAI, Gemini OpenAI endpoint, Groq, Ollama)
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Optional Watsonx adapter
# LLM_PROVIDER=watsonx
# WATSONX_API_KEY=your_ibm_cloud_api_key
# WATSONX_PROJECT_ID=your_watsonx_project_id
```

### Running Locally
```bash
# Generate disk cache for the 3 example repositories (instant demo loading)
npm run precache

# Start development server
npm run dev
# App will be accessible at http://localhost:3000

# Run Vitest test suite
npm test

# Run TypeScript type check
npm run type-check
```

---

## 7. Deploying to Vercel

RepoMap is configured out-of-the-box for seamless Vercel deployment via `vercel.json`.

### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub Integration
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository.
3. In **Project Settings > Environment Variables**, add:
   - `LLM_API_KEY`: Your LLM provider API key
   - `LLM_BASE_URL`: (Optional, defaults to `https://api.openai.com/v1`)
   - `LLM_MODEL`: (Optional, defaults to `gpt-4o-mini`)
   - `GITHUB_TOKEN`: (Optional, personal access token to raise rate limit to 5,000/hr)
4. Click **Deploy**. Vercel will run `npm run build` which automatically precaches the 3 example repositories for instant demo access on serverless functions.

---

## 8. Known Limitations & Edge Cases Handled
- **Monorepos**: Supports subpath scoping via URLs like `github.com/owner/repo/tree/main/packages/core`.
- **Large Repositories**: If GitHub's tree API reports `truncated: true` (>100,000 files), RepoMap gracefully proceeds with available files and warns the user in the Analysis Scope panel.
- **Empty Repositories**: Returns typed `EMPTY_REPO` error with actionable feedback.
- **Rate Limits**: Displays typed `RATE_LIMITED` card explaining how to configure `GITHUB_TOKEN` along with exact reset time.
