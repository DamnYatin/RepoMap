import { z } from "zod";

// Component Schema
export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  responsibility: z.string(),
});
export type Component = z.infer<typeof ComponentSchema>;

// Edge Schema
export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
});
export type Edge = z.infer<typeof EdgeSchema>;

// Directory Schema
export const DirectorySchema = z.object({
  path: z.string(),
  purpose: z.string(),
});
export type Directory = z.infer<typeof DirectorySchema>;

// Start Here Item Schema
export const StartHereItemSchema = z.object({
  path: z.string(),
  why: z.string(),
  learn: z.string(),
  estimatedMinutes: z.number().optional(),
});
export type StartHereItem = z.infer<typeof StartHereItemSchema>;

// Concept Schema
export const ConceptSchema = z.object({
  name: z.string(),
  explanation: z.string(),
  seeIn: z.string(),
});
export type Concept = z.infer<typeof ConceptSchema>;

// Run Locally Schema
export const RunLocallySchema = z.object({
  prerequisites: z.array(z.string()),
  steps: z.array(z.string()),
  testCommand: z.string().nullable(),
  envVars: z.array(z.string()),
  sources: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});
export type RunLocally = z.infer<typeof RunLocallySchema>;

// Contribute Schema
export const ContributeSchema = z.object({
  conventions: z.array(z.string()),
  firstAreas: z.array(
    z.object({
      path: z.string(),
      why: z.string(),
    })
  ),
  contributingPath: z.string().nullable().optional(),
});
export type Contribute = z.infer<typeof ContributeSchema>;

// Summary Schema
export const SummarySchema = z.object({
  purpose: z.string(),
  techStack: z.array(z.string()),
  pattern: z.string(),
  overview: z.string(),
});
export type Summary = z.infer<typeof SummarySchema>;

// Complete LLM Guide Output Schema
export const LLMGuideOutputSchema = z.object({
  summary: SummarySchema,
  components: z.array(ComponentSchema).min(3),
  edges: z.array(EdgeSchema),
  directories: z.array(DirectorySchema),
  startHere: z.array(StartHereItemSchema).min(3),
  concepts: z.array(ConceptSchema),
  runLocally: RunLocallySchema,
  contribute: ContributeSchema,
});
export type LLMGuideOutput = z.infer<typeof LLMGuideOutputSchema>;

// Analysis Metadata
export const AnalysisMetadataSchema = z.object({
  repoName: z.string(),
  owner: z.string(),
  repo: z.string(),
  branch: z.string(),
  commitSha: z.string(),
  stars: numberOrZero(),
  primaryLanguage: z.string(),
  languages: z.record(z.number()),
  description: z.string().nullable(),
  filesAnalyzed: z.number(),
  filesSkipped: z.number(),
  durationSeconds: z.number(),
  model: z.string(),
  scope: z.string().optional(),
  warnings: z.array(z.string()),
  cached: z.boolean().optional(),
  analyzedFilesList: z
    .array(
      z.object({
        path: z.string(),
        bytes: z.number(),
      })
    )
    .optional(),
});
function numberOrZero() {
  return z.number().default(0);
}
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

// Full Analysis Result contract returned to client
export interface RepoGuide {
  summary: Summary;
  components: Component[];
  edges: Edge[];
  directories: Directory[];
  startHere: StartHereItem[];
  concepts: Concept[];
  runLocally: RunLocally;
  contribute: Contribute;
  mermaid: string;
  metadata: AnalysisMetadata;
}

// GitHub RepoContext internal object
export interface RepoContextFile {
  path: string;
  content: string;
  bytes: number;
}

export interface RepoContext {
  meta: {
    owner: string;
    repo: string;
    description: string | null;
    defaultBranch: string;
    stars: number;
    size: number;
    archived: boolean;
    primaryLanguage: string;
    languages: Record<string, number>;
  };
  readme: string | null;
  treePaths: string[];
  files: RepoContextFile[];
  skippedCount: number;
  warnings: string[];
  treeSha: string;
  scope?: string;
}

// Typed Error Codes
export type RepoErrorCode =
  | "INVALID_URL"
  | "NOT_FOUND"
  | "PRIVATE_OR_FORBIDDEN"
  | "EMPTY_REPO"
  | "RATE_LIMITED"
  | "NETWORK"
  | "ANALYSIS_FAILED"
  | "TIMEOUT";

export interface RepoErrorPayload {
  code: RepoErrorCode;
  message: string;
  details?: string;
  resetAt?: string;
}

// Streaming Stage Event
export type StageId =
  | "validating"
  | "fetch_tree"
  | "reading_files"
  | "analyzing"
  | "preparing";

export type StageStatus = "pending" | "running" | "done" | "failed";

export type StreamEvent =
  | { type: "stage"; id: StageId; status: StageStatus; message?: string }
  | { type: "result"; data: RepoGuide }
  | { type: "error"; code: RepoErrorCode; message: string; details?: string };
