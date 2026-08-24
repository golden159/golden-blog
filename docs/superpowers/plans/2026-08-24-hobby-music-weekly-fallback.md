# Hobby Music Weekly Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Hobby music card useful when NetEase's authenticated recent-song endpoint returns an empty list by falling back to the verified public weekly listening record.

**Architecture:** `/record/recent/song` remains the authoritative source for `recent` and `older` activity. If it is empty or unavailable, the server requests `/user/record?type=1`, normalizes the first weekly entry as a distinct `weekly` state, and lets the existing client render its cover and metadata without claiming it is the current or latest song.

**Tech Stack:** Next.js App Router, TypeScript, SWR, Vitest, Testing Library, Biome.

## Global Constraints

- Never expose, serialize, or log `NETEASE_MUSIC_COOKIE`.
- Never label weekly aggregate data as currently playing or recently played.
- Continue trusting album art only from HTTPS `music.126.net` hosts and song links only from `music.163.com/song`.
- Keep the authenticated recent-song request as the first choice and refresh browser activity every 60 seconds.

---

### Task 1: Normalize weekly listening data

**Files:**
- Modify: `app/components/netease/types.ts`
- Create: `app/components/netease/normalize-weekly-track.ts`
- Create: `app/components/netease/normalize-weekly-track.test.ts`

**Interfaces:**
- Consumes: unknown upstream JSON shaped as `{ weekData: [{ song: {...} }] }`.
- Produces: `normalizeWeeklyTrack(payload: unknown): NeteaseActivityResponse` with `state: 'weekly'`, a public `RecentTrack`, and `playedAt: null`.

- [ ] **Step 1: Write the failing normalizer tests**

  Cover a valid weekly entry with title, artists, album, HTTPS-normalized artwork, duration, and song URL; an empty `weekData`; and malformed data.

- [ ] **Step 2: Run the test to verify RED**

  Run: `npx vitest run app/components/netease/normalize-weekly-track.test.ts`

  Expected: FAIL because `normalizeWeeklyTrack` and the `weekly` state do not exist.

- [ ] **Step 3: Implement the minimal normalizer**

  Add `weekly` to `NeteaseActivityResponse['state']`. Validate the first `weekData` record, convert only trusted NetEase artwork to HTTPS, build `https://music.163.com/song?id=<id>`, and return `empty` for a valid empty array or `unavailable` for malformed data.

- [ ] **Step 4: Run the normalizer tests to verify GREEN**

  Run: `npx vitest run app/components/netease/normalize-weekly-track.test.ts app/components/netease/normalize-recent-track.test.ts`

  Expected: PASS.

### Task 2: Fall back from recent activity to weekly activity

**Files:**
- Modify: `app/components/netease/netease.ts`
- Modify: `app/components/netease/netease.test.ts`

**Interfaces:**
- Consumes: `normalizeRecentTrack(payload, now)` and `normalizeWeeklyTrack(payload)`.
- Produces: unchanged `fetchNeteaseActivity(options?): Promise<NeteaseActivityResponse>` with recent-first, weekly-second behavior.

- [ ] **Step 1: Write failing server-fetch tests**

  Add one test where the recent request returns `{ data: { list: [] } }` and the second request returns a real-shaped `weekData` entry. Assert the public result is `weekly`, the fallback request is `GET /user/record?uid=<id>&type=1`, and the Cookie is never copied to that public fallback request. Add a test that preserves `empty` when both valid lists are empty.

- [ ] **Step 2: Run the fetch test to verify RED**

  Run: `npx vitest run app/components/netease/netease.test.ts`

  Expected: FAIL because only one upstream request is currently made.

- [ ] **Step 3: Implement the minimal fallback**

  Keep the current secure recent request. Return it immediately for `recent` or `older`; otherwise issue a 5-second, no-store, redirect-rejecting GET to `/user/record` with `uid` and `type=1` in the URL. Return a valid weekly track when present, otherwise preserve the recent endpoint's honest `empty`/`unavailable` result.

- [ ] **Step 4: Run the fetch tests to verify GREEN**

  Run: `npx vitest run app/components/netease/netease.test.ts app/api/hobby/netease/route.test.ts`

  Expected: PASS.

### Task 3: Render weekly activity honestly and deploy from main

**Files:**
- Modify: `app/hobby/components/music-activity.ts`
- Modify: `app/hobby/components/music-activity.test.ts`
- Modify: `app/hobby/components/music-details.tsx`
- Modify: `app/hobby/components/music-details.test.tsx`
- Modify: `app/hobby/components/hobby-grid.test.tsx`

**Interfaces:**
- Consumes: public `{ state: 'weekly', track }` responses.
- Produces: validated client state, closed-card cover/title with `本周常听`, and expanded details that explicitly explain weekly aggregate semantics.

- [x] **Step 1: Write failing client and UI tests**

  Verify that `weekly` survives public-response validation, drives the left album art and title, renders `Weekly favorite · 本周常听`, and says the data is a weekly aggregate rather than a live/recent-playing status.

- [x] **Step 2: Run the UI tests to verify RED**

  Run: `npx vitest run app/hobby/components/music-activity.test.ts app/hobby/components/music-details.test.tsx app/hobby/components/hobby-grid.test.tsx`

  Expected: FAIL because the client currently rejects `weekly`.

- [x] **Step 3: Implement weekly labels and copy**

  Accept `weekly` only when it has a valid track. Add `本周常听` preview/state labels, weekly-specific badge and explanation, and keep timestamps hidden because weekly records provide no play time.

- [x] **Step 4: Run focused and full verification**

  Run focused Vitest files, then `npm test`, `npm run check`, and `npm run build`.

  Expected: all tests, Biome checks, and the production build pass; the existing unrelated Spotify credential warning may remain.

- [x] **Step 5: Commit the UI task**

  Stage only the music fallback files and this plan and commit with `fix: fall back to weekly netease activity`. After the plan's required whole-branch review, merge the reviewed branch into `main`, push `main`, wait for the matching Vercel deployment to reach `READY`, and fetch `/api/hobby/netease` plus `/hobby` from that deployment.
