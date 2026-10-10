import { describe, it, expect } from "vitest";
import { parseGithubUrl, GithubApiError } from "../lib/github";
import {
  extractJsonFromOutput,
  buildMermaidDiagram,
  postProcessAnalysis,
} from "../lib/analyzer";
import { Component, Edge, RepoContext } from "../lib/types";

describe("parseGithubUrl", () => {
  it("parses standard https github url", () => {
    const res = parseGithubUrl("https://github.com/expressjs/express");
    expect(res.owner).toBe("expressjs");
    expect(res.repo).toBe("express");
  });

  it("parses http url with trailing slash", () => {
    const res = parseGithubUrl("http://github.com/facebook/react/");
    expect(res.owner).toBe("facebook");
    expect(res.repo).toBe("react");
  });

  it("parses www. prefix", () => {
    const res = parseGithubUrl("https://www.github.com/vuejs/core");
    expect(res.owner).toBe("vuejs");
    expect(res.repo).toBe("core");
  });

  it("parses github.com without protocol", () => {
    const res = parseGithubUrl("github.com/vercel/next.js");
    expect(res.owner).toBe("vercel");
    expect(res.repo).toBe("next.js");
  });

  it("parses owner/repo shorthand", () => {
    const res = parseGithubUrl("pallets/flask");
    expect(res.owner).toBe("pallets");
    expect(res.repo).toBe("flask");
  });

  it("strips .git extension", () => {
    const res = parseGithubUrl("https://github.com/golang/go.git");
    expect(res.owner).toBe("golang");
    expect(res.repo).toBe("go");
  });

  it("parses branch specification /tree/<branch>", () => {
    const res = parseGithubUrl("https://github.com/fastify/fastify/tree/main");
    expect(res.owner).toBe("fastify");
    expect(res.repo).toBe("fastify");
    expect(res.branch).toBe("main");
  });

  it("parses subpath specification /tree/<branch>/<subpath>", () => {
    const res = parseGithubUrl("https://github.com/facebook/react/tree/main/packages/react-dom");
    expect(res.owner).toBe("facebook");
    expect(res.repo).toBe("react");
    expect(res.branch).toBe("main");
    expect(res.subpath).toBe("packages/react-dom");
  });

  it("throws INVALID_URL on empty string or malformed input", () => {
    expect(() => parseGithubUrl("")).toThrow(GithubApiError);
    expect(() => parseGithubUrl("just-a-single-word")).toThrow(GithubApiError);
  });

  it("rejects malicious characters and path injection targets", () => {
    expect(() => parseGithubUrl("https://github.com/../evil/repo")).toThrow();
    expect(() => parseGithubUrl("https://github.com/owner;cat/passwd")).toThrow();
    expect(() => parseGithubUrl("https://github.com/owner/<script>")).toThrow();
  });
});

describe("extractJsonFromOutput", () => {
  it("extracts clean JSON from markdown code fence", () => {
    const raw = "```json\n{\"key\": \"value\"}\n```";
    expect(extractJsonFromOutput(raw)).toBe("{\"key\": \"value\"}");
  });

  it("extracts JSON object when surrounded by conversational text", () => {
    const raw = "Here is the onboarding guide:\n```\n{\"summary\": {\"purpose\": \"test\"}}\n```\nHope this helps!";
    const extracted = extractJsonFromOutput(raw);
    expect(extracted).toContain("{\"summary\": {\"purpose\": \"test\"}}");
  });

  it("handles plain JSON with no fences", () => {
    const raw = "{\"summary\": {\"purpose\": \"direct\"}}";
    expect(extractJsonFromOutput(raw)).toBe(raw);
  });
});

describe("buildMermaidDiagram", () => {
  it("generates valid flowchart TD with sanitized labels and node keys", () => {
    const components: Component[] = [
      { id: "comp1", name: "HTTP Server & Router", path: "src/server.ts", responsibility: "Routes requests" },
      { id: "comp2", name: "Database Pool (Postgres)", path: "src/db.ts", responsibility: "Executes queries" },
    ];
    const edges: Edge[] = [
      { from: "comp1", to: "comp2", label: "queries db" },
    ];

    const diagram = buildMermaidDiagram(components, edges);
    expect(diagram).toContain("flowchart TD");
    expect(diagram).toContain("n1[HTTP Server  Router]");
    expect(diagram).toContain("n2[Database Pool Postgres]");
    expect(diagram).toContain("n1 -->|queries db| n2");
  });

  it("truncates long node and edge labels safely", () => {
    const components: Component[] = [
      { id: "c1", name: "A very long component name that definitely exceeds twenty eight characters", path: "a.ts", responsibility: "resp" },
    ];
    const edges: Edge[] = [];
    const diagram = buildMermaidDiagram(components, edges);
    expect(diagram).toContain("n1[A very long component name t]");
  });

  it("connects components linearly if no edges are provided", () => {
    const components: Component[] = [
      { id: "c1", name: "First", path: "a.ts", responsibility: "resp" },
      { id: "c2", name: "Second", path: "b.ts", responsibility: "resp" },
    ];
    const diagram = buildMermaidDiagram(components, []);
    expect(diagram).toContain("n1 --> n2");
  });
});

describe("postProcessAnalysis and StartHere backfilling", () => {
  it("backfills startHere items from files read if fewer than 5 exist", () => {
    const dummyContext: RepoContext = {
      meta: {
        owner: "test",
        repo: "test",
        description: "Test repo",
        defaultBranch: "main",
        stars: 100,
        size: 500,
        archived: false,
        primaryLanguage: "TypeScript",
        languages: { TypeScript: 100 },
      },
      readme: "# Test README",
      treePaths: ["src/index.ts", "src/server.ts", "src/config.ts", "package.json", "src/utils.ts"],
      files: [
        { path: "src/index.ts", content: "console.log('hi');", bytes: 200 },
        { path: "src/server.ts", content: "export const app = {};", bytes: 300 },
        { path: "src/config.ts", content: "export const config = {};", bytes: 150 },
        { path: "package.json", content: "{}", bytes: 100 },
        { path: "src/utils.ts", content: "export function helper() {}", bytes: 180 },
      ],
      skippedCount: 10,
      warnings: [],
      treeSha: "abc1234",
    };

    const minimalOutput = JSON.stringify({
      summary: {
        purpose: "Test purpose",
        techStack: ["TypeScript"],
        pattern: "CLI Tool",
        overview: "Overview description here.",
      },
      components: [
        { id: "c1", name: "Index Entry", path: "src/index.ts", responsibility: "Entry" },
        { id: "c2", name: "Server Core", path: "src/server.ts", responsibility: "Server" },
        { id: "c3", name: "Config Module", path: "src/config.ts", responsibility: "Config" },
      ],
      edges: [
        { from: "c1", to: "c2", label: "starts" },
      ],
      directories: [
        { path: "src", purpose: "Source code" },
      ],
      startHere: [
        { path: "src/index.ts", why: "Main entry point", learn: "Lifecycle" },
      ], // Only 1 provided!
      concepts: [
        { name: "Modular Config", explanation: "Centralized settings", seeIn: "src/config.ts" },
      ],
      runLocally: {
        prerequisites: ["Node.js"],
        steps: ["npm install", "npm start"],
        testCommand: "npm test",
        envVars: ["PORT"],
        sources: ["package.json"],
        confidence: "high",
      },
      contribute: {
        conventions: ["Run prettier"],
        firstAreas: [
          { path: "src/utils.ts", why: "Simple helper methods" },
        ],
      },
    });

    const result = postProcessAnalysis(minimalOutput, dummyContext, 2.5, "gpt-4o-mini");
    expect(result.startHere.length).toBe(5);
    expect(result.startHere[0].path).toBe("src/index.ts");
    expect(result.startHere[1].path).toBe("src/server.ts");
    expect(result.metadata.filesAnalyzed).toBe(5);
    expect(result.mermaid).toContain("flowchart TD");
  });
});

describe("getLLMConfig and Groq detection", () => {
  const originalEnv = process.env;

  it("detects Groq when GROQ_API_KEY is provided", async () => {
    const { getLLMConfig } = await import("../lib/llm");
    process.env = { ...originalEnv, GROQ_API_KEY: "gsk_test1234567890", LLM_API_KEY: undefined, LLM_BASE_URL: undefined, LLM_MODEL: undefined };
    const config = getLLMConfig();
    expect(config.isGroq).toBe(true);
    expect(config.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(config.model).toBe("llama-3.1-8b-instant");
    expect(config.apiKey).toBe("gsk_test1234567890");
    process.env = originalEnv;
  });

  it("auto-detects Groq when generic LLM_API_KEY starts with gsk_", async () => {
    const { getLLMConfig } = await import("../lib/llm");
    process.env = { ...originalEnv, GROQ_API_KEY: undefined, LLM_API_KEY: "gsk_abcde12345", LLM_BASE_URL: undefined, LLM_MODEL: undefined };
    const config = getLLMConfig();
    expect(config.isGroq).toBe(true);
    expect(config.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(config.model).toBe("llama-3.1-8b-instant");
    process.env = originalEnv;
  });

  it("defaults to OpenAI when standard key is provided", async () => {
    const { getLLMConfig } = await import("../lib/llm");
    process.env = { ...originalEnv, GROQ_API_KEY: undefined, LLM_API_KEY: "sk-proj-testkey", LLM_BASE_URL: undefined, LLM_MODEL: undefined };
    const config = getLLMConfig();
    expect(config.isGroq).toBe(false);
    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.model).toBe("gpt-4o-mini");
    process.env = originalEnv;
  });
});
