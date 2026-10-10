# Engineering Rules: Security and Robustness

## Security and Robustness Checklist
- Only call GitHub hosts. Never fetch arbitrary URLs derived from user input.
- Render all model and repo text as plain text (no `dangerouslySetInnerHTML`). The Markdown export escapes backticks inside code blocks.
- Mermaid runs with `securityLevel: "strict"` and receives only server-generated, sanitized strings.
- Handle empty repos, archived repos, huge monorepos (use the truncated tree and warn), non-English READMEs, and repos with no manifest (lower confidence).
- Never log secrets. Never return stack traces to the client.

## Working Rules
- Keep the code simple, typed, and readable. No over-engineering, no unused abstractions.
- All secrets stay server-side. Never expose API keys to the client.
- Zod validation for every external payload (GitHub responses, LLM output).
- Never fake AI output, except for the temporary stub in build step 1 that is replaced in step 3.
- Keep each terminal command bounded. Use timeouts for dev servers and tests, and never leave a process hanging.
- Initialize git and commit after each numbered build step, so any step can be reverted.
- Verify in browser: open running app, test real user flow, verify console has no errors.
