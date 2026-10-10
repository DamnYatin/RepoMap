# Workflow: /verify

This workflow performs automated validation of RepoMap across code quality, test suites, browser execution, design compliance, and end-to-end repository analysis.

## Verification Steps

1. **Static Analysis & Type Checking**
   - Run TypeScript type checker: `npm run type-check` (or `npx tsc --noEmit`).
   - Run linter: `npm run lint`.
   - Verify zero errors or type mismatches.

2. **Unit Test Suite**
   - Run Vitest suite: `npm test` (or `npx vitest run`).
   - Confirm all test cases pass:
     - `parseGithubUrl` validation and sanitization.
     - Server-side Mermaid flowchart generator and label sanitization.
     - Tree path validation and `startHere` backfill logic.
     - JSON extraction and code fence stripping.

3. **Dev Server & Browser End-to-End Analysis**
   - Start dev server: `npm run dev` with timeout monitoring on port 3000.
   - Launch browser subagent and navigate to `http://localhost:3000`.
   - Perform end-to-end analysis on one repository (e.g., `expressjs/express` or `fastify/fastify`).
   - Confirm step events stream cleanly (`Validating`, `Fetching tree`, `Reading files`, `Analyzing architecture`, `Preparing guide`).
   - Verify all 8 P0 sections render without console errors or runtime warnings.

4. **Theme & Visual Verification**
   - Capture screenshot of results view in Light Mode.
   - Toggle theme switch to Dark Mode.
   - Capture screenshot of results view in Dark Mode.
   - Verify Mermaid diagram re-renders cleanly in both modes.

5. **Design System & Banned Patterns Audit**
   - Scan UI components and CSS for banned patterns:
     - Zero gradients (`linear-gradient`, `bg-gradient-*`)
     - Zero box shadows (except focus outlines)
     - Zero rounded-xl or pill buttons (border-radius <= 2px)
     - Zero glassmorphism (`backdrop-blur`)
     - Zero emojis or sparkle icons in UI
     - Zero buzzword marketing copy
   - Report any offending file and rule violation.

6. **Teardown & Summary**
   - Terminate dev server process cleanly.
   - Output summary table indicating status (PASS/FAIL) for each checkpoint.
