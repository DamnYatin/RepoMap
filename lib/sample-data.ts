import { RepoGuide } from "./types";

export const SAMPLE_GUIDE: RepoGuide = {
  summary: {
    purpose:
      "Fastify is a highly focused HTTP web framework designed to provide high performance and low overhead for Node.js backends.",
    techStack: ["Node.js", "TypeScript", "JavaScript", "Pino", "Find-My-Way"],
    pattern: "Modular Web Framework / Middleware Pipeline",
    overview:
      "Fastify provides a robust HTTP server implementation with a plugin architecture, route matching, and schema-based JSON serialization. Incoming HTTP requests pass through encapsulated context lifecycle hooks before reaching handler logic. Plugins are strictly scoped to prevent leakage across distinct server domains.",
  },
  components: [
    {
      id: "server",
      name: "Server Core",
      path: "lib/fastify.js",
      responsibility:
        "Initializes the HTTP engine, sets default options, and exposes the public server API.",
    },
    {
      id: "router",
      name: "Radix Router",
      path: "lib/route.js",
      responsibility:
        "Compiles route paths and binds HTTP methods to corresponding lifecycle hooks and handlers.",
    },
    {
      id: "plugin",
      name: "Plugin Manager",
      path: "lib/pluginOverride.js",
      responsibility:
        "Manages plugin registration, encapsulation scopes, and dependency tree loading.",
    },
    {
      id: "hooks",
      name: "Lifecycle Hooks",
      path: "lib/hooks.js",
      responsibility:
        "Executes onRequest, preParsing, preHandler, and onSend interceptors for incoming requests.",
    },
    {
      id: "context",
      name: "Context & Request",
      path: "lib/context.js",
      responsibility:
        "Instantiates FastifyRequest and FastifyReply wrappers around standard Node.js HTTP primitives.",
    },
  ],
  edges: [
    { from: "server", to: "router", label: "configures" },
    { from: "server", to: "plugin", label: "loads" },
    { from: "router", to: "hooks", label: "triggers" },
    { from: "hooks", to: "context", label: "evaluates" },
  ],
  directories: [
    { path: "lib", purpose: "Core framework implementation and internal runtime modules" },
    { path: "test", purpose: "Comprehensive test suites covering routing, hooks, and plugins" },
    { path: "docs", purpose: "Developer guides, API references, and architecture specifications" },
    { path: "types", purpose: "TypeScript type definitions for server, requests, and reply" },
  ],
  startHere: [
    {
      path: "lib/fastify.js",
      why: "The primary factory entry point that constructs the Fastify server instance and default configuration.",
      learn: "How options are validated and how the primary server instance is constructed.",
      estimatedMinutes: 4,
    },
    {
      path: "lib/route.js",
      why: "Implements route configuration, method binding, and schema validation hooks.",
      learn: "How route definitions connect with JSON schemas and handler execution.",
      estimatedMinutes: 5,
    },
    {
      path: "lib/hooks.js",
      why: "Defines the 8 sequential request lifecycle hooks executed per HTTP transaction.",
      learn: "How middleware execution and lifecycle interceptors are queued.",
      estimatedMinutes: 3,
    },
    {
      path: "lib/context.js",
      why: "Creates the encapsulated context for request and reply instances.",
      learn: "How plugin encapsulation isolates state between different sub-routers.",
      estimatedMinutes: 4,
    },
    {
      path: "package.json",
      why: "Lists core dependencies, scripts, supported Node.js versions, and build workflows.",
      learn: "The dependency graph and testing pipeline used by contributors.",
      estimatedMinutes: 2,
    },
  ],
  concepts: [
    {
      name: "Plugin Encapsulation",
      explanation:
        "Fastify isolates decorators and hooks inside child context instances so nested plugins do not pollute the parent scope.",
      seeIn: "lib/pluginOverride.js",
    },
    {
      name: "Lifecycle Pipeline",
      explanation:
        "Every request transitions through strictly ordered phases: onRequest -> preParsing -> preValidation -> preHandler -> handler.",
      seeIn: "lib/hooks.js",
    },
    {
      name: "Schema Compilation",
      explanation:
        "Fastify uses JSON schemas to compile rapid serialization functions that bypass slow JSON.stringify calls.",
      seeIn: "lib/route.js",
    },
  ],
  runLocally: {
    prerequisites: ["Node.js >= 18.0.0", "npm >= 9.0.0"],
    steps: [
      "git clone https://github.com/fastify/fastify.git",
      "cd fastify",
      "npm install",
      "npm test",
    ],
    testCommand: "npm test",
    envVars: ["NODE_ENV", "PORT"],
    sources: ["package.json", "README.md", ".github/workflows/ci.yml"],
    confidence: "high",
  },
  contribute: {
    conventions: [
      "Use StandardJS code formatting (npm run lint)",
      "All new features require unit tests in test/ directory",
      "Commit messages must adhere to Conventional Commits (fix:, feat:, docs:)",
    ],
    firstAreas: [
      {
        path: "docs/Guides",
        why: "Good place to update newcomer documentation and clarify plugin examples.",
      },
      {
        path: "test/diagnostics-channel.test.js",
        why: "Contains isolated unit tests that are easy to run and extend.",
      },
      {
        path: "types/route.d.ts",
        why: "TypeScript typing improvements have high test coverage and minimal runtime risk.",
      },
    ],
    contributingPath: "CONTRIBUTING.md",
  },
  mermaid: `flowchart TD
  n1[Server Core] -->|configures| n2[Radix Router]
  n1 -->|loads| n3[Plugin Manager]
  n2 -->|triggers| n4[Lifecycle Hooks]
  n4 -->|evaluates| n5[Context Request]`,
  metadata: {
    repoName: "fastify/fastify",
    owner: "fastify",
    repo: "fastify",
    branch: "main",
    commitSha: "a8f912c",
    stars: 31200,
    primaryLanguage: "JavaScript",
    languages: {
      JavaScript: 68.4,
      TypeScript: 29.8,
      Shell: 1.8,
    },
    description: "Fast and low overhead web framework, for Node.js",
    filesAnalyzed: 14,
    filesSkipped: 182,
    durationSeconds: 14.8,
    model: "gpt-4o-mini",
    scope: undefined,
    warnings: [],
    cached: false,
    analyzedFilesList: [
      { path: "package.json", bytes: 4210 },
      { path: "lib/fastify.js", bytes: 14890 },
      { path: "lib/route.js", bytes: 12430 },
      { path: "lib/hooks.js", bytes: 7890 },
      { path: "lib/context.js", bytes: 6420 },
      { path: "lib/pluginOverride.js", bytes: 5120 },
      { path: "README.md", bytes: 11200 },
      { path: "CONTRIBUTING.md", bytes: 3400 },
      { path: ".github/workflows/ci.yml", bytes: 2150 },
    ],
  },
};
