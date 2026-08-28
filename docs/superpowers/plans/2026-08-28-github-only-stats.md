# GitHub-Only Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/stats` show only Golden's GitHub contribution calendar and derived statistics while keeping `GITHUB_TOKEN` exclusively on the server.

**Architecture:** A server-only GitHub adapter reads `GITHUB_TOKEN` and calls GitHub GraphQL. A Next.js route validates the requested year and returns a cacheable public calendar payload; the client contribution component fetches that route without receiving credentials. The page drops WakaTime and Spotify, and the production analytics shell retains only Vercel Analytics and Speed Insights because the other credentials were intentionally removed.

**Tech Stack:** Next.js 16 App Router, React 19, SWR, Octokit GraphQL, Vitest, Testing Library, TypeScript.

## Global Constraints

- Use only the case-sensitive server-side environment variable `GITHUB_TOKEN`.
- Never expose a GitHub token in a `NEXT_PUBLIC_*` variable, API response, rendered HTML, error message, or log.
- Keep the GitHub username `golden159`.
- Preserve unrelated Hobby, Projects, Thoughts, and Uses behavior.
- Follow red-green-refactor: every behavior change starts with a failing test.

---

### Task 1: Server-only GitHub contribution boundary

**Files:**
- Create: `app/components/github-contributions/types.ts`
- Create: `app/components/github-contributions/github.test.ts`
- Modify: `app/components/github-contributions/github.ts`
- Modify: `app/components/github-contributions/calendar.tsx`
- Modify: `app/components/github-contributions/github-stats.tsx`

**Interfaces:**
- Produces: `ContributionCalendar` in `types.ts` for server and client consumers.
- Produces: `getContributionDateRange(year, now)` with UTC January 1 through now for the current year and UTC January 1 through December 31 for completed years.
- Produces: `getContributions(username, year, options?)`, where production reads `process.env.GITHUB_TOKEN` and tests may inject a GraphQL client.

- [ ] **Step 1: Write the failing tests**

Add tests that hand-check the current-year and completed-year ISO bounds, prove `GITHUB_TOKEN` authenticates the injected GraphQL boundary, and prove a missing token rejects before any upstream call. Use a complete contribution-calendar fixture with colors, total, weeks, days, and months.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run app/components/github-contributions/github.test.ts`

Expected: FAIL because the date-range API and server-token injection do not exist and the implementation still reads `NEXT_PUBLIC_GITHUB_TOKEN`.

- [ ] **Step 3: Write minimal implementation**

Add `import 'server-only'`, move the shared calendar type into `types.ts`, read only `process.env.GITHUB_TOKEN`, build exact UTC bounds, and call the injected/default Octokit GraphQL client with the private authorization header. Update client modules to import the shared type from `types.ts` and keep metric helpers client-safe.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run app/components/github-contributions/github.test.ts`

Expected: PASS with no token value in output.

### Task 2: Public GitHub stats API and client states

**Files:**
- Create: `app/api/stats/github/route.test.ts`
- Create: `app/api/stats/github/route.ts`
- Create: `app/components/github-contributions/contributions.test.tsx`
- Modify: `app/components/github-contributions/contributions.tsx`

**Interfaces:**
- Consumes: `getContributions('golden159', year)` from Task 1.
- Produces: `GET /api/stats/github?year=YYYY`, returning a `ContributionCalendar` with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
- Produces: an explicit Chinese unavailable state when the route cannot return GitHub data.

- [ ] **Step 1: Write the failing route tests**

Test a valid current year against a complete mocked server result, an invalid/out-of-range year returning HTTP 400, and an upstream/configuration failure returning HTTP 503 with only `{ "error": "GitHub statistics are unavailable" }`.

- [ ] **Step 2: Run route tests to verify they fail**

Run: `bunx vitest run app/api/stats/github/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the minimal route**

Validate the year against the current year and four preceding years, call the server adapter, apply the five-minute public cache only to successful data, and use `no-store` for failures without returning exception text.

- [ ] **Step 4: Run route tests to verify they pass**

Run: `bunx vitest run app/api/stats/github/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing client tests**

Render the real `Contributions` component with an injected SWR cache and mocked HTTP boundary. Assert that a complete successful payload renders the calendar/statistics and that HTTP 503 renders `GitHub 数据暂时不可用，请稍后再试。` instead of an endless skeleton.

- [ ] **Step 6: Run client tests to verify they fail**

Run: `bunx vitest run app/components/github-contributions/contributions.test.tsx`

Expected: FAIL because the client currently imports the GitHub token-bearing adapter directly and has no error state.

- [ ] **Step 7: Implement the minimal client fetch path**

Fetch `/api/stats/github?year=${year}` through SWR, reject non-2xx responses, retain the existing loading skeleton, render the explicit unavailable state on error, and pass the selected year to the statistics labels.

- [ ] **Step 8: Run client tests to verify they pass**

Run: `bunx vitest run app/components/github-contributions/contributions.test.tsx`

Expected: PASS.

### Task 3: Remove inactive stats and analytics integrations

**Files:**
- Create: `app/stats/page.test.tsx`
- Modify: `app/stats/page.tsx`
- Modify: `app/components/analytics/analytics.tsx`
- Delete: `app/components/analytics/log-rocket.tsx`
- Modify: `next.config.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify mechanically: `package.json`, `bun.lock`

**Interfaces:**
- Consumes: the GitHub-only UI from Task 2.
- Produces: `/stats` containing no WakaTime or Spotify content or requests.
- Produces: production analytics containing only Vercel Analytics and Speed Insights and requiring no deleted LogRocket/Umami variables.

- [ ] **Step 1: Write the failing page test**

Render `StatsPage` with the GitHub contribution section mocked only at the network boundary. Assert the GitHub-only introduction and heading are present, and assert WakaTime, Spotify, `Not Playing`, and their skeletons are absent.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run app/stats/page.test.tsx`

Expected: FAIL because the page still imports and renders WakaTime and Spotify.

- [ ] **Step 3: Implement the GitHub-only page and deleted-service cleanup**

Remove WakaTime/Spotify imports and JSX from `/stats`, change its copy to describe GitHub activity, remove LogRocket and Umami script/rewrites because their variables were deleted, remove the unused LogRocket package, and document only `GITHUB_TOKEN` for `/stats`.

- [ ] **Step 4: Run targeted tests**

Run: `bunx vitest run app/stats/page.test.tsx app/components/github-contributions/github.test.ts app/api/stats/github/route.test.ts app/components/github-contributions/contributions.test.tsx next.config.test.ts`

Expected: PASS.

### Task 4: Full verification

**Files:**
- Verify all modified and created files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: a deployable GitHub-only Stats implementation.

- [ ] **Step 1: Run static checks**

Run: `bun run check`

Expected: exit 0 without modifying files.

- [ ] **Step 2: Run the full test suite**

Run: `bun run test`

Expected: all tests pass.

- [ ] **Step 3: Run a production build without local secrets**

Run: `env -u GITHUB_TOKEN -u NEXT_PUBLIC_GITHUB_TOKEN bun run build`

Expected: exit 0; runtime configuration failure is handled by the API and does not prevent a build.

- [ ] **Step 4: Review the exact diff and secret surface**

Run: `git diff --check && git diff -- . ':!bun.lock' && rg -n "NEXT_PUBLIC_GITHUB_TOKEN|SPOTIFY_|WAKATIME_|LOGROCKET|UMAMI" app README.md .env.example next.config.ts package.json`

Expected: no whitespace errors; no removed credential names remain in active code or setup docs; no secret values appear anywhere.
