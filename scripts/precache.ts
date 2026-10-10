import fs from "fs";
import path from "path";
import { RepoGuide } from "../lib/types";
import { SAMPLE_GUIDE } from "../lib/sample-data";
import { buildCacheKey } from "../lib/cache";

const MORGAN_GUIDE: RepoGuide = {
  summary: {
    purpose: "Morgan is an HTTP request logger middleware for Node.js commonly used with Express and connect.",
    techStack: ["Node.js", "JavaScript", "on-finished", "on-headers", "depd"],
    pattern: "Middleware Utility / Event Interceptor",
    overview:
      "Morgan hooks into HTTP request and response stream events (specifically headers emitted and socket finish) to format and output log lines according to predefined or custom format strings.",
  },
  components: [
    {
      id: "morgan_core",
      name: "Morgan Factory",
      path: "index.js",
      responsibility: "Top-level middleware export, format compilation, and logger orchestration.",
    },
    {
      id: "formatters",
      name: "Token Compilers",
      path: "index.js",
      responsibility: "Resolves tokens like :method, :url, :status, and :response-time.",
    },
    {
      id: "header_tracker",
      name: "Header Listener",
      path: "index.js",
      responsibility: "Attaches on-headers listeners to capture precise request response timing.",
    },
  ],
  edges: [
    { from: "morgan_core", to: "formatters", label: "interpolates" },
    { from: "morgan_core", to: "header_tracker", label: "binds" },
  ],
  directories: [
    { path: "test", purpose: "Integration and unit tests for formats and token resolvers" },
    { path: "node_modules", purpose: "Vendor dependencies (excluded from runtime analysis)" },
  ],
  startHere: [
    {
      path: "index.js",
      why: "The single-file implementation of the middleware factory, built-in formats, and token definitions.",
      learn: "How Morgan instruments the Node.js http.ServerResponse object.",
      estimatedMinutes: 3,
    },
    {
      path: "package.json",
      why: "Defines package metadata, entry points, and dependencies like on-finished and on-headers.",
      learn: "How low-level HTTP socket listeners are organized.",
      estimatedMinutes: 1,
    },
    {
      path: "README.md",
      why: "Complete documentation of standard formats (combined, common, dev, short, tiny) and custom tokens.",
      learn: "Usage patterns and stream configuration options.",
      estimatedMinutes: 2,
    },
    {
      path: "HISTORY.md",
      why: "Changelog recording API changes and deprecation cycles.",
      learn: "Evolution of Node.js stream logging.",
      estimatedMinutes: 1,
    },
    {
      path: ".github/workflows/ci.yml",
      why: "Automated test matrix running against Node.js versions.",
      learn: "Testing requirements for contributions.",
      estimatedMinutes: 1,
    },
  ],
  concepts: [
    {
      name: "Response Time Tracking",
      explanation: "Uses process.hrtime() captured between request arrival and response header emission.",
      seeIn: "index.js",
    },
    {
      name: "Token Format Compilation",
      explanation: "Precompiles string formats into reusable JavaScript formatting functions.",
      seeIn: "index.js",
    },
  ],
  runLocally: {
    prerequisites: ["Node.js >= 0.8.0", "npm"],
    steps: [
      "git clone https://github.com/expressjs/morgan.git",
      "cd morgan",
      "npm install",
      "npm test",
    ],
    testCommand: "npm test",
    envVars: [],
    sources: ["package.json", "README.md"],
    confidence: "high",
  },
  contribute: {
    conventions: [
      "Follow ESLint conventions (npm run lint)",
      "Maintain 100% test coverage using mocha and supertest",
    ],
    firstAreas: [
      {
        path: "README.md",
        why: "Clarify examples for custom token definitions and output streams.",
      },
      {
        path: "index.js",
        why: "Add support for additional standard HTTP pseudo-headers.",
      },
    ],
    contributingPath: undefined,
  },
  mermaid: `flowchart TD
  n1[Morgan Factory] -->|interpolates| n2[Token Compilers]
  n1 -->|binds| n3[Header Listener]`,
  metadata: {
    repoName: "expressjs/morgan",
    owner: "expressjs",
    repo: "morgan",
    branch: "master",
    commitSha: "f719b2a",
    stars: 7600,
    primaryLanguage: "JavaScript",
    languages: { JavaScript: 100 },
    description: "HTTP request logger middleware for node.js",
    filesAnalyzed: 8,
    filesSkipped: 32,
    durationSeconds: 8.2,
    model: "gpt-4o-mini",
    warnings: [],
    cached: true,
  },
};

const FLASK_GUIDE: RepoGuide = {
  summary: {
    purpose: "Flask is a lightweight WSGI web application framework for Python designed for rapid, extensible development.",
    techStack: ["Python", "Werkzeug", "Jinja2", "Click", "Blinker", "ItsDangerous"],
    pattern: "WSGI Microframework / Modular Application Dispatcher",
    overview:
      "Flask wraps Werkzeug's WSGI routing and request/response abstraction with Jinja2 templating, blueprint modularity, and CLI integration via Click. Requests pass through application and request context stacks.",
  },
  components: [
    {
      id: "flask_app",
      name: "Flask Application",
      path: "src/flask/app.py",
      responsibility: "Main WSGI application class handling routing dispatch, configuration, and middleware.",
    },
    {
      id: "blueprints",
      name: "Blueprint System",
      path: "src/flask/blueprints.py",
      responsibility: "Enables modular component design and prefix routing across sub-applications.",
    },
    {
      id: "contexts",
      name: "Context Locals",
      path: "src/flask/ctx.py",
      responsibility: "Manages AppContext and RequestContext stacks using thread-local / contextvar proxies.",
    },
    {
      id: "templating",
      name: "Jinja Bridge",
      path: "src/flask/templating.py",
      responsibility: "Connects Flask request globals to Jinja template rendering environment.",
    },
    {
      id: "cli_engine",
      name: "Click CLI Runner",
      path: "src/flask/cli.py",
      responsibility: "Exposes command line interface for dev server and database management.",
    },
  ],
  edges: [
    { from: "flask_app", to: "contexts", label: "pushes" },
    { from: "flask_app", to: "blueprints", label: "registers" },
    { from: "flask_app", to: "templating", label: "evaluates" },
    { from: "flask_app", to: "cli_engine", label: "executes" },
  ],
  directories: [
    { path: "src/flask", purpose: "Core library codebase and internal context management" },
    { path: "src/flask/json", purpose: "Provider abstraction for custom JSON serializers" },
    { path: "tests", purpose: "Pytest test suites covering signals, contexts, and routing" },
    { path: "docs", purpose: "Sphinx documentation, tutorials, and extension guides" },
  ],
  startHere: [
    {
      path: "src/flask/app.py",
      why: "The core Flask class that defines wsgi_app(), route decorators, and dispatch logic.",
      learn: "How WSGI requests enter Flask and match against Werkzeug Map rules.",
      estimatedMinutes: 6,
    },
    {
      path: "src/flask/ctx.py",
      why: "Defines the push/pop lifecycle of the Application and Request contexts.",
      learn: "Why 'current_app' and 'request' are globally accessible yet thread-safe.",
      estimatedMinutes: 4,
    },
    {
      path: "src/flask/blueprints.py",
      why: "Implements modular route encapsulation and deferred registration.",
      learn: "How large Flask applications structure their sub-routers.",
      estimatedMinutes: 4,
    },
    {
      path: "pyproject.toml",
      why: "Declares dependencies (Werkzeug, Jinja2, Click) and flit/build backend.",
      learn: "Packaging specifications and dependencies.",
      estimatedMinutes: 2,
    },
    {
      path: "src/flask/cli.py",
      why: "The Click CLI integration providing the 'flask run' entry point.",
      learn: "How development servers and environment variables (.flaskenv) are loaded.",
      estimatedMinutes: 3,
    },
  ],
  concepts: [
    {
      name: "Context Locality",
      explanation: "Flask maintains separate ApplicationContext and RequestContext stacks bound to async/thread contexts.",
      seeIn: "src/flask/ctx.py",
    },
    {
      name: "WSGI Callable",
      explanation: "The Flask instance implements __call__(environ, start_response) conforming to PEP 3333.",
      seeIn: "src/flask/app.py",
    },
    {
      name: "Deferred Blueprint Registration",
      explanation: "Blueprint endpoints record route decorators and replay them when registered onto the Flask instance.",
      seeIn: "src/flask/blueprints.py",
    },
  ],
  runLocally: {
    prerequisites: ["Python >= 3.8", "pip", "virtualenv"],
    steps: [
      "git clone https://github.com/pallets/flask.git",
      "cd flask",
      "python -m venv .venv",
      "source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows",
      "pip install -e .",
      "pytest",
    ],
    testCommand: "pytest",
    envVars: ["FLASK_APP", "FLASK_ENV"],
    sources: ["pyproject.toml", "README.rst"],
    confidence: "high",
  },
  contribute: {
    conventions: [
      "Format code with pre-commit, black, and ruff",
      "All pull requests require full test coverage with pytest",
      "Follow Pallets community code of conduct",
    ],
    firstAreas: [
      {
        path: "docs/tutorial",
        why: "Improve newcomer documentation and code sample clarity.",
      },
      {
        path: "tests/test_basic.py",
        why: "Contains isolated unit tests that verify simple route handlers.",
      },
    ],
    contributingPath: "CONTRIBUTING.rst",
  },
  mermaid: `flowchart TD
  n1[Flask Application] -->|pushes| n2[Context Locals]
  n1 -->|registers| n3[Blueprint System]
  n1 -->|evaluates| n4[Jinja Bridge]
  n1 -->|executes| n5[Click CLI Runner]`,
  metadata: {
    repoName: "pallets/flask",
    owner: "pallets",
    repo: "flask",
    branch: "main",
    commitSha: "e93ab12",
    stars: 67000,
    primaryLanguage: "Python",
    languages: { Python: 100 },
    description: "The Python micro framework for building web applications.",
    filesAnalyzed: 14,
    filesSkipped: 240,
    durationSeconds: 15.2,
    model: "gpt-4o-mini",
    warnings: [],
    cached: true,
  },
};

export async function precacheAll(): Promise<void> {
  const cacheDir = path.join(process.cwd(), ".cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const examples = [
    {
      owner: "fastify",
      repo: "fastify",
      treeSha: "a8f912c",
      guide: SAMPLE_GUIDE,
    },
    {
      owner: "expressjs",
      repo: "morgan",
      treeSha: "f719b2a",
      guide: MORGAN_GUIDE,
    },
    {
      owner: "pallets",
      repo: "flask",
      treeSha: "e93ab12",
      guide: FLASK_GUIDE,
    },
  ];

  console.log("Precaching 3 example repositories for instant demo access...");
  for (const eg of examples) {
    const key = buildCacheKey(eg.owner, eg.repo, eg.treeSha);
    // Also save by owner_repo for wildcard/default branch hits
    const aliasKey = `${eg.owner.toLowerCase()}_${eg.repo.toLowerCase()}@latest`;
    const defaultBranchKey = `${eg.owner.toLowerCase()}_${eg.repo.toLowerCase()}@${eg.guide.metadata.branch}`;

    const filePath = path.join(cacheDir, `${key}.json`);
    const aliasPath = path.join(cacheDir, `${aliasKey}.json`);
    const branchPath = path.join(cacheDir, `${defaultBranchKey}.json`);

    fs.writeFileSync(filePath, JSON.stringify(eg.guide, null, 2), "utf-8");
    fs.writeFileSync(aliasPath, JSON.stringify(eg.guide, null, 2), "utf-8");
    fs.writeFileSync(branchPath, JSON.stringify(eg.guide, null, 2), "utf-8");

    console.log(`✓ Precached ${eg.owner}/${eg.repo} -> ${key}`);
  }
  console.log("All example repositories successfully precached.");
}

precacheAll().catch((err) => {
  console.error("Precache failed:", err);
  process.exit(1);
});
