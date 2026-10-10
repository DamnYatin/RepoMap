# Workflow: /demo-check

This workflow confirms demo readiness for hackathon judging and presentations.

## Steps

1. **Precache Generation**
   - Run `npm run precache`.
   - Ensure the 3 curated example repositories are analyzed and serialized to disk (`.cache/`):
     - Small: `expressjs/morgan` or `sindresorhus/is`
     - Medium: `fastify/fastify` or `expressjs/express`
     - Large/Diverse: `pallets/flask` or `gin-gonic/gin`
   - Confirm cache files exist on disk with valid checksums.

2. **Cached Repositories Verification**
   - Query each of the 3 example repositories via UI / API.
   - Confirm response timing is under 200ms and the "Cached" badge is rendered.
   - Verify all 8 dashboard panels populate immediately.

3. **Uncached Live Analysis**
   - Submit an uncached valid public repository URL.
   - Confirm real-time NDJSON streaming lifecycle runs to completion.
   - Measure and record duration (target ~30-60s).

4. **Error Handling & Resilience Check**
   - Submit an invalid URL format (e.g. `not-a-url` or `http://malicious.com`).
   - Verify inline validation error: "Enter a URL in the form github.com/owner/repository."
   - Submit a nonexistent repo (e.g. `github.com/doesnotexist12345/nowhere-repo-999`).
   - Verify typed error: "NOT_FOUND - Repository was not found or is private."

5. **Timings and Report**
   - Output structured benchmark table reporting response times and cache status for each scenario.
