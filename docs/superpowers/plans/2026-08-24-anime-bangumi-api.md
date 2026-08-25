# Anime Bangumi API Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Anime hobby panel with public Bangumi profile and anime collection data while preserving the existing profile link when the upstream API is unavailable.

**Architecture:** Keep Bangumi access server-side in a focused `app/components/bangumi` module. Normalize the public v0 user and paged collection payload into a small stable response (`profile`, the API's exact collection total, and a bounded list of recent entries), expose it through `/api/hobby/bangumi`, and let the client-side Anime panel fetch and render that response with an explicit unavailable fallback. No Bangumi token is required for the configured public user.

**Tech Stack:** Next.js App Router, TypeScript, React, SWR, Vitest, Testing Library, Bangumi v0 REST API.

## Global Constraints

- Use Bangumi's documented v0 API endpoints and a descriptive `User-Agent`.
- Do not expose credentials or call Bangumi directly from the browser.
- Accept only HTTPS Bangumi image URLs and cap collection results before rendering.
- Preserve `animeProfile.userId` and its profile URL for web links; use `animeProfile.apiUsername` for v0 API requests.
- Follow the repository's TDD workflow: each behavior gets a failing test before production code.

---

### Task 1: Define and normalize Bangumi response data

**Files:**
- Create: `app/components/bangumi/types.ts`
- Create: `app/components/bangumi/normalize.ts`
- Test: `app/components/bangumi/normalize.test.ts`

**Interfaces:**
- Produces `BangumiAnimeResponse`, `BangumiAnimeEntry`, `normalizeBangumiProfile`, and `normalizeBangumiCollections` for the fetcher and UI.

- [x] **Step 1: Write failing tests** for a complete profile/collection payload, empty collections, malformed records, image URL sanitization, and count/status aggregation.
- [x] **Step 2: Run `npx vitest run app/components/bangumi/normalize.test.ts` and confirm the new tests fail because the module does not exist.
- [x] **Step 3: Implement the minimal stable types and normalization helpers.** Keep at most six entries, sort by collection update timestamp, preserve the API's exact `total`, map the five documented collection statuses, and use `null`/`unavailable` for malformed input.
- [x] **Step 4: Re-run the focused test and confirm it passes.

### Task 2: Fetch Bangumi data on the server and expose a cached route

**Files:**
- Create: `app/components/bangumi/bangumi.ts`
- Create: `app/api/hobby/bangumi/route.ts`
- Test: `app/components/bangumi/bangumi.test.ts`
- Test: `app/api/hobby/bangumi/route.test.ts`

**Interfaces:**
- Consumes `animeProfile.apiUsername` and the Task 1 normalizers.
- Produces `fetchBangumiAnime(options?)` and `GET /api/hobby/bangumi` returning `BangumiAnimeResponse`.

- [x] **Step 1: Write failing tests** for a missing API username, successful profile + collections requests, non-OK responses, thrown fetches, request URLs/headers, and route cache headers.
- [x] **Step 2: Run the focused tests and confirm they fail before implementation.
- [x] **Step 3: Implement `fetchBangumiAnime` with two GET requests to `/v0/users/{username}` and `/v0/users/{username}/collections?subject_type=2&limit=6&offset=0`, independent 5-second abort timeouts, a descriptive `User-Agent`, and an unavailable collection state that still preserves a valid profile response.
- [x] **Step 4: Implement the route with `dynamic = 'force-dynamic'`, `Cache-Control: public, s-maxage=300, stale-while-revalidate=900`, and JSON output.
- [x] **Step 5: Re-run focused tests and confirm they pass.

### Task 3: Expand the Anime panel with client data and resilient UI

**Files:**
- Modify: `app/hobby/components/anime-details.tsx`
- Modify: `app/hobby/components/anime-details.test.tsx`
- Create: `app/hobby/components/anime-activity.ts`
- Test: `app/hobby/components/anime-activity.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes `BangumiAnimeResponse` from `/api/hobby/bangumi`.
- Produces a compact profile summary, status/score metrics, and a six-item anime list with links to Bangumi subject pages.

- [x] **Step 1: Write failing tests** for loading, ready, empty, and unavailable states, including visible profile name, counts, score, entry links, and the preserved profile link.
- [x] **Step 2: Run focused component tests and confirm they fail.
- [x] **Step 3: Implement a small SWR hook in `anime-activity.ts` and render the normalized response in `AnimeDetails`; keep the existing direct profile link visible in all states.
- [x] **Step 4: Add `bgm.tv`/`bangumi.tv` HTTPS image host patterns to `next.config.ts` only if using `next/image`; otherwise render safe native image links.
- [x] **Step 5: Run focused tests and then the full test suite.

### Task 4: Verify integration and document the open-source references

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-24-anime-bangumi-api.md`

- [x] **Step 1: Run `npx vitest run` and `npx biome check .` and inspect all output.
- [x] **Step 2: Run `npm run build` to verify the Next.js route and client boundary compile together.
- [x] **Step 3: Add a short README note linking the official [`bangumi/api`](https://github.com/bangumi/api), [`bangumi/server`](https://github.com/bangumi/server), and [`bangumi/frontend`](https://github.com/bangumi/frontend), explaining that this implementation only borrows public API/normalization ideas.
- [x] **Step 4: Re-run verification after documentation changes and report the exact test/build results.
