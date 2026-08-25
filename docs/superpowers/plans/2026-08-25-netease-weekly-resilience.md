# NetEase Weekly Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent transient NetEase weekly failures from becoming a long-lived unavailable UI, expose the actual server failure category, and eliminate duplicate weekly upstream requests from the Hobby page.

**Architecture:** Keep the existing recent-activity and weekly-ranking APIs compatible. Add categorized, credential-safe failure reporting to the weekly boundary, make unavailable route responses non-cacheable, and add a page-specific overview route that composes both existing fetchers through a request-scoped GET deduper. The Hobby grid consumes the overview once while standalone Music components retain their current hooks.

**Tech Stack:** Next.js 16 App Router, React 19, SWR, TypeScript, Vitest, React Testing Library, Vercel CDN.

## Global Constraints

- Never expose, serialize, or log `NETEASE_MUSIC_COOKIE` or the configured API base URL.
- Preserve recent and older activity as the first-choice Music hero data.
- Preserve weekly data as an aggregate fallback and never label it as currently playing.
- Keep the existing `/api/hobby/netease` and `/api/hobby/netease/weekly` contracts compatible.
- Cache ready and empty weekly data, but never cache `unavailable` responses.
- Add no runtime dependency.

---

### Task 1: Categorize weekly upstream failures

**Files:**
- Modify: `app/components/netease/fetch-weekly-ranking.ts`
- Modify: `app/components/netease/fetch-weekly-ranking.test.ts`

**Interfaces:**
- Consumes: the existing validated NetEase environment and injected `fetchImpl`.
- Produces: `NeteaseWeeklyFailure` and optional `onFailure(failure)` diagnostics without secrets.

- [x] **Step 1: Write failing diagnostic tests**

Add literal cases for `invalid-configuration`, `upstream-status`, `invalid-json`, `invalid-payload`, `timeout`, and `request-failed`. Assert the default reporter uses the `[netease-weekly]` prefix and never includes the Cookie or API base URL.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- app/components/netease/fetch-weekly-ranking.test.ts --run --maxWorkers=1`

Expected: FAIL because the fetcher does not accept `onFailure` and silently catches every failure.

- [x] **Step 3: Implement minimal categorized reporting**

Add this public diagnostic contract:

```ts
export type NeteaseWeeklyFailure = {
	reason:
		| 'invalid-configuration'
		| 'upstream-status'
		| 'invalid-json'
		| 'invalid-payload'
		| 'timeout'
		| 'request-failed';
	status?: number;
};
```

Use an injected reporter in tests and `console.warn('[netease-weekly]', failure)` by default. Report only the reason and optional HTTP status.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- app/components/netease/fetch-weekly-ranking.test.ts --run --maxWorkers=1`

Expected: PASS.

### Task 2: Keep failed weekly results out of Vercel cache

**Files:**
- Modify: `app/api/hobby/netease/weekly/route.ts`
- Modify: `app/api/hobby/netease/weekly/route.test.ts`

**Interfaces:**
- Consumes: `NeteaseWeeklyRanking.state`.
- Produces: `Cache-Control: no-store, max-age=0` for unavailable results and the existing five-minute public policy for ready/empty results.

- [x] **Step 1: Write failing cache-policy tests**

Assert an unavailable ranking uses `no-store, max-age=0`; add a ready ranking case that keeps `public, s-maxage=300, stale-while-revalidate=600`.

- [x] **Step 2: Run the route test and verify RED**

Run: `npm test -- app/api/hobby/netease/weekly/route.test.ts --run --maxWorkers=1`

Expected: FAIL because unavailable results currently receive the public five-minute cache header.

- [x] **Step 3: Implement the state-aware header**

Select the cache header after fetching the ranking; do not change the JSON contract or dynamic route setting.

- [x] **Step 4: Run the route test and verify GREEN**

Run: `npm test -- app/api/hobby/netease/weekly/route.test.ts --run --maxWorkers=1`

Expected: PASS.

### Task 3: Fetch the Hobby music overview without duplicate weekly GETs

**Files:**
- Create: `app/components/netease/fetch-overview.ts`
- Create: `app/components/netease/fetch-overview.test.ts`
- Create: `app/api/hobby/netease/overview/route.ts`
- Create: `app/api/hobby/netease/overview/route.test.ts`
- Create: `app/hobby/components/music-overview-data.ts`
- Create: `app/hobby/components/music-overview-data.test.ts`
- Modify: `app/hobby/components/hobby-grid.tsx`
- Modify: `app/hobby/components/hobby-grid.test.tsx`
- Modify: `app/hobby/components/music-details.tsx`

**Interfaces:**
- Produces: `NeteaseOverview = { activity: NeteaseActivityResponse; weeklyRanking: NeteaseWeeklyRanking }`.
- Produces: `fetchNeteaseOverview(options?)`, `GET /api/hobby/netease/overview`, and `useMusicOverview()`.
- Consumes: existing `fetchNeteaseActivity`, `fetchNeteaseWeeklyRanking`, and client normalizers.

- [x] **Step 1: Write failing overview deduplication tests**

Use a real recent-empty response and a real weekly payload. Assert the composed result contains weekly activity plus a ready top ten, while `GET /user/record?uid=3719820729&type=1` reaches the injected network fetch exactly once.

- [x] **Step 2: Write failing route and client integration tests**

Assert overview unavailable results are non-cacheable, valid overview results use the 30-second activity cache, the client fails closed on malformed payloads, and `HobbyGrid` requests only `/api/hobby/netease/overview` for music even when Music opens immediately.

- [x] **Step 3: Run the focused tests and verify RED**

Run: `npm test -- app/components/netease/fetch-overview.test.ts app/api/hobby/netease/overview/route.test.ts app/hobby/components/music-overview-data.test.ts app/hobby/components/hobby-grid.test.tsx --run --maxWorkers=1`

Expected: FAIL because the overview boundary and hook do not exist and HobbyGrid still mounts two music endpoints.

- [x] **Step 4: Implement request-scoped overview composition**

Wrap the injected fetcher with a GET-only promise map keyed by URL. Clone the shared `Response` for each consumer, compose both existing fetchers with the same `now`, and keep POST recent-activity requests independent. Add state-aware overview caching and a fail-closed client normalizer.

- [x] **Step 5: Switch HobbyGrid to the overview hook**

Replace the two parent music hooks with `useMusicOverview()`. Pass both normalized results into summaries and details, and add `fetchWhenMissing={false}` to the HobbyGrid-owned `MusicDetails` so opening during an in-flight overview cannot mount the legacy endpoints.

- [x] **Step 6: Run focused tests and verify GREEN**

Run the Task 3 focused command again.

Expected: PASS with exactly one overview browser request and one upstream weekly GET.

### Task 4: Verify and deploy a fresh Preview

**Files:**
- Verify all modified NetEase and Hobby files.

**Interfaces:**
- Consumes: the completed resilient overview path.
- Produces: a ready Vercel Preview whose first unavailable response is not cached.

- [x] **Step 1: Run repository verification**

Run: `npm run check && npx tsc --noEmit && npm test -- --run --maxWorkers=1`

Expected: Biome clean, TypeScript exit 0, and all Vitest tests pass.

- [x] **Step 2: Deploy a new Vercel Preview**

Deploy with the linked Vercel project and wait for `READY`.

- [x] **Step 3: Verify Preview APIs**

Use authenticated `vercel curl` to confirm `/api/hobby/netease/overview` returns a coherent payload, `/api/hobby/netease/weekly` returns ready top-ten data, and an unavailable response cannot produce a Vercel cache HIT.
