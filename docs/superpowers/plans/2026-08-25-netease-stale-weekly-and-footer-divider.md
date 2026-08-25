# NetEase Stale Weekly and Footer Divider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give weekly NetEase requests an eight-second budget, retain the last validated weekly ranking across transient failures, keep recent playback at five seconds and failures non-cacheable, and remove the gray divider above the three collapsed profile footers.

**Architecture:** Keep the existing overview API and cache contracts. Separate recent and weekly timeout constants at the server boundary, then make the browser overview fetcher store only validated non-unavailable weekly payloads in session storage and reuse that ranking when a later overview branch is unavailable. Preserve all existing activity data from the current response. Remove only the border utilities from the three profile footers so their alignment and spacing remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, SWR, TypeScript, Vitest, React Testing Library, Vercel CDN.

## Global Constraints

- Recent playback POST requests must keep a 5,000 ms timeout.
- Weekly `/user/record` GET requests must use an 8,000 ms timeout in both the dedicated weekly fetcher and activity fallback.
- `unavailable` weekly and overview responses must remain `Cache-Control: no-store, max-age=0`.
- Only a weekly ranking that passes the existing client normalizer and has state `ready` or `empty` may replace the stored last-successful ranking.
- A transient failure may reuse the stored weekly ranking, but current activity data must not be replaced with stale activity.
- Session-storage access must fail closed when unavailable, malformed, or blocked.
- Remove the top border above Steam, Bangumi, and NetEase IDs without changing their bottom alignment, right alignment, or profile links.
- Add no runtime dependency and never expose or log NetEase credentials.

---

### Task 1: Separate recent and weekly timeout budgets

**Files:**
- Modify: `app/components/netease/netease.test.ts`
- Modify: `app/components/netease/netease.ts`
- Modify: `app/components/netease/fetch-weekly-ranking.test.ts`
- Modify: `app/components/netease/fetch-weekly-ranking.ts`

**Interfaces:**
- Consumes: existing `AbortSignal.timeout` request signals.
- Produces: 5,000 ms recent POST signals and 8,000 ms weekly GET signals.

- [x] **Step 1: Update timeout behavior tests and verify RED**

Change the dedicated weekly expectation to `8000`. In the activity fallback test, require the first timeout call to be `5000` and the second to be `8000`, proving the two request types use different budgets.

Run: `npm test -- app/components/netease/netease.test.ts app/components/netease/fetch-weekly-ranking.test.ts --run --maxWorkers=1`

Expected: FAIL because both weekly paths still request a 5,000 ms signal.

- [x] **Step 2: Implement the minimal timeout split**

Add named server-only constants for recent and weekly timeout values and use them at their respective request sites. Do not change cache, redirect, credential, or failure-classification behavior.

- [x] **Step 3: Verify GREEN**

Run the focused command from Step 1.

Expected: PASS.

### Task 2: Preserve the last validated weekly ranking on transient failure

**Files:**
- Modify: `app/hobby/components/music-overview-data.test.ts`
- Modify: `app/hobby/components/music-overview-data.ts`

**Interfaces:**
- Consumes: `normalizeMusicWeeklyRanking`, `NeteaseOverview`, and browser `sessionStorage`.
- Produces: `fetchMusicOverview(url)` results whose current activity is unchanged while an unavailable weekly branch is replaced by the last validated `ready` or `empty` ranking, when one exists.

- [x] **Step 1: Write the failing retention tests**

Fetch one valid overview to establish the last-successful ranking, then return an overview whose activity is current but whose weekly branch is `unavailable`. Assert the second result keeps the second response's activity and the first response's weekly ranking. Add a malformed stored-value case that remains unavailable instead of trusting unvalidated data.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- app/hobby/components/music-overview-data.test.ts --run --maxWorkers=1`

Expected: FAIL because the fetcher currently replaces a successful ranking with `unavailable` and does not retain validated weekly data.

- [x] **Step 3: Implement safe session retention**

Use one private session-storage key. Read and parse it inside `try/catch`, validate it with `normalizeMusicWeeklyRanking`, and ignore `unavailable`. After normalizing a new overview, store a `ready` or `empty` weekly ranking; if it is `unavailable`, reuse a validated stored ranking without changing `activity`. Treat unavailable or throwing storage as a cache miss.

- [x] **Step 4: Verify GREEN**

Run the focused command from Step 2.

Expected: PASS.

### Task 3: Remove collapsed profile footer dividers

**Files:**
- Modify: `app/hobby/components/hobby-grid.test.tsx`
- Modify: `app/hobby/components/steam-profile-footer.tsx`
- Modify: `app/hobby/components/anime-profile-footer.tsx`
- Modify: `app/hobby/components/music-profile-footer.tsx`

**Interfaces:**
- Consumes: the existing `topFooter` slot in `HobbyCard`.
- Produces: the same three aligned ID/link footers without top-border utility classes.

- [x] **Step 1: Write the failing no-divider integration test**

For the Steam, Anime, and Music profile footer test IDs, assert each keeps `mt-auto`, `justify-end`, and `text-right`, while it does not have `border-t`, `border-gray-200/80`, or `dark:border-gray-700`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- app/hobby/components/hobby-grid.test.tsx --run --maxWorkers=1`

Expected: FAIL because all three footers still render the gray top border.

- [x] **Step 3: Remove only the divider classes**

Delete `border-t border-gray-200/80 dark:border-gray-700` from each footer. Keep `pt-3` so the existing vertical rhythm and shared baseline remain stable.

- [x] **Step 4: Verify GREEN**

Run the focused command from Step 2.

Expected: PASS.

### Task 4: Full verification and Preview deployment

**Files:**
- Verify all files changed by Tasks 1-3.

**Interfaces:**
- Consumes: the completed timeout, retention, cache, and footer changes.
- Produces: a verified Vercel Preview for `/hobby`.

- [x] **Step 1: Verify existing no-store route contracts**

Run: `npm test -- app/api/hobby/netease/weekly/route.test.ts app/api/hobby/netease/overview/route.test.ts --run --maxWorkers=1`

Expected: PASS with unavailable responses still using `no-store, max-age=0`.

- [x] **Step 2: Run repository verification**

Run: `npm run check`, `npx tsc --noEmit --incremental false`, and `npm test -- --run --maxWorkers=1`.

Expected: all commands exit 0.

- [x] **Step 3: Deploy and verify Preview**

Run `npx vercel deploy --yes --target=preview`, wait for READY, then use authenticated `vercel curl` to verify `/hobby` returns 200 and `/api/hobby/netease/overview` returns either a coherent ranking or a non-cacheable unavailable response.
