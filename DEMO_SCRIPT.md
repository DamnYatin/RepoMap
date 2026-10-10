# RepoMap — 2-Minute Demo Script

**Speaker Persona:** Staff Engineer presenting at the Hackathon Pitch / Demo Day.  
**Total Target Duration:** ~120 seconds.

---

### [0:00 – 0:25] The Problem & Hook
> *"Every software engineer knows this pain: you join a new team or look at an unfamiliar open-source project. You open the repository, you look at 400 files across 30 directories, the README is either three lines long or three years out of date, and you have no idea where request execution starts or how to run it safely without breaking something.*
>
> *Today, we built **RepoMap**: an enterprise codebase onboarding tool that turns any public GitHub repository into an actionable, verified learning roadmap in about 60 seconds."*

---

### [0:25 – 0:50] The Live Demo (Instant Precache & Architecture)
> *(Action: Open RepoMap at `http://localhost:3000`. Point to clean IBM Carbon interface and theme toggle).*
>
> *"Notice the interface: no marketing fluff, zero gradients, strictly built on IBM Carbon design tokens with full light and dark mode support.*
>
> *(Action: Click 'Load' next to `fastify/fastify` under Example Repositories).*
>
> *"Because this repo was precached, it loads instantly with the 'Cached' tag.*
>
> *Look at what RepoMap gives us:*
> 1. *In the **Overview**, it isolates the exact pattern—Modular Web Framework—and generates a factual language breakdown.*
> 2. *In the **Architecture** section, this diagram isn't a hallucinatory model drawing. It was synthesized server-side from validated component models, perfectly synced to light and dark theme."*

---

### [0:50 – 1:20] Guided Learning Path ("Start Here" & File Deep Dive)
> *(Action: Scroll to Section 4: Start Here).*
>
> *"A README summary is not enough for an onboarding engineer. RepoMap provides an ordered 5-step learning curriculum with computed read times based on real file line counts.*
>
> *It starts with the factory entry point `lib/fastify.js`, moves to the router, down to lifecycle hooks, and finally context isolation.*
>
> *(Action: Click 'Explain this file' on item 1: `lib/fastify.js`).*
>
> *"With one click, RepoMap pulls the raw code and generates a four-point inspection: Purpose, Key Functions, Component Connection, and Watch Outs—grounded strictly in the file source."*

---

### [1:20 – 1:45] Run Locally, First Contribution & Verification
> *(Action: Scroll to Section 6: Run Locally and Section 7: First Contribution).*
>
> *"Under **Run Locally**, RepoMap extracted the exact prerequisites, copyable terminal commands, test runner, and environment variable names with a confidence rating derived from CI files.*
>
> *And for a newcomer eager to make their first pull request, **First Contribution** highlights low-risk starter areas—like documentation and isolated unit tests—so you never accidentally break core middleware on day one.*
>
> *(Action: Scroll to Check Your Understanding / Ask about this repo).*
>
> *"You can even test your comprehension with interactive concept questions or ask targeted technical questions in the docked assistant."*

---

### [1:45 – 2:00] Close
> *(Action: Return to top of page or click 'Copy as Markdown').*
>
> *"You can export the entire onboarding guide directly into your team's knowledge base as Markdown.*
>
> *RepoMap bridges the gap between raw source code and developer productivity: **from clone to understanding in about 60 seconds.** Thank you!"*
