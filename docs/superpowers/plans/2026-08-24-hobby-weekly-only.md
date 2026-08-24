# Hobby Weekly-Only Music Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the listening-footprint dashboard with one honest NetEase weekly top-10 ranking and remove today, lifetime estimate, Monday comparison, month report, and year report functionality.

**Architecture:** Reuse the repository's existing `/user/record?type=1` fallback, NetEase URL validation, and weekly-track normalization. Extend that mature boundary to normalize the first ten valid `weekData` entries, expose them through a Cookie-free `/api/hobby/netease/weekly` route, validate the public payload client-side, and render an adapted ranked-song list based on the established `Chilfish/chilfish.top` and `Flames1217/HuoYu` implementations rather than inventing a new ranking model.

**Tech Stack:** Next.js App Router, TypeScript, React 19, SWR, Tailwind CSS 4, Vitest, Testing Library, Biome.

## Reference implementations

- `Chilfish/chilfish.top/src/utils/fetchMusic.ts`: maps `/user/record?type=1` `weekData`, normalizes HTTP artwork to HTTPS, keeps `playCount`/`score`, and caps the list.
- `Chilfish/chilfish.top/src/components/music/Songs.astro`: renders rank, cover, song, artist/album, duration, and optional play count as a compact linked row.
- `Flames1217/HuoYu/app/api/netease-music/route.ts`: maps the weekly source into a top-10 public contract.

## Global Constraints

- The weekly ranking is the only new statistics module below the Music hero.
- Remove all production code and tests dedicated to today, lifetime duration estimation, Monday comparison, month reports, and year reports.
- Do not claim or calculate a total listening duration; NetEase does not expose that value.
- Fetch only public `GET /user/record?uid=<NETEASE_USER_ID>&type=1` for the ranking and never attach `NETEASE_MUSIC_COOKIE`.
- Preserve the existing recent-song activity endpoint, Music hero, and its 60-second refresh; weekly ranking refreshes every 300,000 ms.
- Return at most ten valid ranked tracks; malformed items are skipped without invalidating later valid tracks.
- Preserve only non-negative finite `playCount`, `score`, and duration values; display play count only when greater than zero.
- Trusted artwork remains HTTPS-only on `music.126.net` hosts and song links remain `https://music.163.com/song?id=<decimal-id>`.
- The ranking must remain legible in light/dark themes, responsive at 390 px and 1440 px, keyboard accessible, and free of page-level horizontal overflow.
- Add no runtime dependency.

---

### Task 1: Extend the existing weekly boundary into a top-10 API

**Files:**
- Modify: `app/components/netease/types.ts`
- Modify: `app/components/netease/normalize-weekly-track.ts`
- Modify: `app/components/netease/normalize-weekly-track.test.ts`
- Create: `app/components/netease/fetch-weekly-ranking.ts`
- Create: `app/components/netease/fetch-weekly-ranking.test.ts`
- Create: `app/api/hobby/netease/weekly/route.ts`
- Create: `app/api/hobby/netease/weekly/route.test.ts`
- Delete: `app/components/netease/footprint-types.ts`
- Delete: `app/components/netease/normalize-listening-footprint.ts`
- Delete: `app/components/netease/normalize-listening-footprint.test.ts`
- Delete: `app/components/netease/fetch-listening-footprint.ts`
- Delete: `app/components/netease/fetch-listening-footprint.test.ts`
- Delete: `app/api/hobby/netease/footprint/route.ts`
- Delete: `app/api/hobby/netease/footprint/route.test.ts`

**Interfaces:**
- Produces `NETEASE_WEEKLY_RANKING_LIMIT = 10`, `WeeklyRankingTrack`, and `NeteaseWeeklyRanking` from `app/components/netease/types.ts`.
- Produces `normalizeWeeklyRanking(payload: unknown, now?: number): NeteaseWeeklyRanking` while preserving the existing `normalizeWeeklyTrack(payload)` public behavior for the compact fallback.
- Produces `fetchNeteaseWeeklyRanking(options?): Promise<NeteaseWeeklyRanking>` and `GET /api/hobby/netease/weekly`.

- [x] **Step 1: Write failing weekly-ranking normalizer tests**

Add literal fixtures proving the first ten valid entries are returned with sequential ranks and preserved title, artist, album, HTTPS artwork, decimal song URL, duration, `playCount`, and `score`. Include an invalid first item followed by a valid item, explicit upstream failure code, valid empty `weekData`, unsafe artwork, invalid IDs, and negative metrics.

```ts
const result = normalizeWeeklyRanking({
	code: 200,
	weekData: Array.from({ length: 12 }, (_, index) => weeklyRecord(index + 1)),
}, 1_800_000_000_000);

expect(result.state).toBe('ready');
expect(result.tracks).toHaveLength(10);
expect(result.tracks[0]).toMatchObject({ rank: 1, playCount: 8, score: 100 });
expect(result.tracks[9].rank).toBe(10);
```

- [x] **Step 2: Run the normalizer test to verify RED**

Run: `npx vitest run app/components/netease/normalize-weekly-track.test.ts`

Expected: FAIL because `normalizeWeeklyRanking` and the public ranking types do not exist.

- [x] **Step 3: Implement the minimal reusable weekly normalizer**

Add these exact public shapes:

```ts
export const NETEASE_WEEKLY_RANKING_LIMIT = 10;

export type WeeklyRankingTrack = {
	rank: number;
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	durationMs: number | null;
	playCount: number | null;
	score: number | null;
};

export type NeteaseWeeklyRanking = {
	state: 'ready' | 'empty' | 'unavailable';
	generatedAt: number;
	tracks: WeeklyRankingTrack[];
};
```

Normalize each entry independently, keep only canonical decimal IDs and valid song titles, convert trusted artwork to HTTPS, preserve safe metrics or `null`, take ten valid entries, then assign ranks 1–10. Implement `normalizeWeeklyTrack` by selecting the first normalized ranking track so the existing compact-card fallback shares the same validation.

- [x] **Step 4: Write failing public fetch and route tests**

Assert exactly one request to the preserved base-prefix URL below, no `Cookie` header, `GET`, `no-store`, redirect rejection, five-second timeout, zero requests for rejected configuration, a fail-closed unavailable result, and route cache headers.

```text
https://netease.internal.example/netease-api/user/record?uid=3719820729&type=1
```

- [x] **Step 5: Run fetch and route tests to verify RED**

Run: `npx vitest run app/components/netease/fetch-weekly-ranking.test.ts app/api/hobby/netease/weekly/route.test.ts`

Expected: FAIL because the fetcher and route do not exist.

- [x] **Step 6: Implement the Cookie-free fetcher and route**

Use `parseNeteaseApiBaseUrl` and `buildNeteaseApiUrl`, fetch only `/user/record`, and return `normalizeWeeklyRanking(payload, now)`. The route is dynamic and returns:

```ts
{ 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
```

Delete the superseded footprint fetcher, normalizer, types, route, and their tests only after the new focused tests are green.

- [x] **Step 7: Run Task 1 tests and commit**

Run:

```bash
npx vitest run app/components/netease/normalize-weekly-track.test.ts app/components/netease/netease.test.ts app/components/netease/fetch-weekly-ranking.test.ts app/api/hobby/netease/weekly/route.test.ts
```

Expected: PASS.

Commit: `refactor: keep only netease weekly ranking data`

### Task 2: Replace the footprint dashboard with the reused weekly list UI

**Files:**
- Create: `app/hobby/components/music-weekly-data.ts`
- Create: `app/hobby/components/music-weekly-data.test.ts`
- Create: `app/hobby/components/listening-weekly-ranking.tsx`
- Create: `app/hobby/components/listening-weekly-ranking.test.tsx`
- Modify: `app/hobby/components/music-details.tsx`
- Modify: `app/hobby/components/music-details.test.tsx`
- Delete: `app/hobby/components/music-footprint-data.ts`
- Delete: `app/hobby/components/music-footprint-data.test.ts`
- Delete: `app/hobby/components/listening-footprint.tsx`
- Delete: `app/hobby/components/listening-footprint.test.tsx`

**Interfaces:**
- `normalizeMusicWeeklyRanking(value): NeteaseWeeklyRanking`, `fetchMusicWeeklyRanking(url)`, and `useMusicWeeklyRanking(enabled = true)` use `/api/hobby/netease/weekly` with a 300,000 ms refresh.
- `ListeningWeeklyRanking({ ranking?: NeteaseWeeklyRanking })` renders loading, ready, empty, and unavailable states.
- `MusicDetails` accepts optional `weeklyRanking` instead of `footprint` and mounts the ranking below the unchanged hero.

- [x] **Step 1: Write failing client-contract tests**

Cover a complete top-10 response, trusted artwork/song links, sequential ranks, the ten-track cap, invalid states/metrics/URLs, ready-with-empty incoherence, empty/unavailable states, fetch failure, and the exact SWR key/interval.

```ts
expect(normalizeMusicWeeklyRanking(validRanking)).toEqual(validRanking);
expect(normalizeMusicWeeklyRanking({ ...validRanking, tracks: [] }).state).toBe('unavailable');
```

- [x] **Step 2: Write failing weekly-list and integration tests**

Adapt the referenced `Songs.astro` behavior into React tests: heading `听歌周榜`, ordered rank labels, cover, song link, artists/album, duration, score, optional positive play count, and honest empty/unavailable copy. Assert the removed labels are absent: `今日聆听`, `总聆听时长`, `本周 / 周一`, `月`, and `年` report controls. Assert `MusicDetails` requests `/api/hobby/netease/weekly` exactly once without duplicating `/api/hobby/netease`.

- [x] **Step 3: Run client and UI tests to verify RED**

Run:

```bash
npx vitest run app/hobby/components/music-weekly-data.test.ts app/hobby/components/listening-weekly-ranking.test.tsx app/hobby/components/music-details.test.tsx
```

Expected: FAIL because the weekly client and list component do not exist and `MusicDetails` still renders the footprint.

- [x] **Step 4: Implement the fail-closed client and adapted list**

Reuse the donor row structure inside the existing high-contrast section: two-digit rank, 48 px artwork, linked title, artists and album, `m:ss` duration, weekly score, and play count only when greater than zero. Use alternating neutral rows, the existing pink/violet/cyan accents, `min-w-0` shrink constraints, an ordered list, descriptive link labels, and native links. Do not render totals, time-series charts, or period tabs.

Delete the superseded client footprint validator/component and tests only after the new focused tests pass.

- [x] **Step 5: Run Task 2 tests and commit**

Run:

```bash
npx vitest run app/hobby/components/music-weekly-data.test.ts app/hobby/components/listening-weekly-ranking.test.tsx app/hobby/components/music-details.test.tsx app/hobby/components/hobby-grid.test.tsx
```

Expected: PASS.

Commit: `refactor: show only the netease weekly ranking`

### Task 3: Verify, review, merge, and deploy

**Files:**
- Modify: `docs/superpowers/plans/2026-08-24-hobby-weekly-only.md` (check completed steps)

- [x] **Step 1: Run full verification**

```bash
npm test
npm run check
npm run build
```

Expected: all tests, Biome, TypeScript, and the production build pass.

- [x] **Step 2: Inspect reused UI at desktop and mobile sizes**

Start with `NETEASE_API_BASE_URL=https://golden-netease-api.vercel.app NETEASE_USER_ID=3719820729`, open `/hobby`, expand Music, and verify 1440 px and 390 px layouts show only `听歌周榜`, expose up to ten rows, preserve keyboard links, and have no page-level horizontal overflow.

- [ ] **Step 3: Review the complete diff**

Confirm the old duration/report code and routes are removed, Cookie is never sent by the weekly path, the donor-derived list does not overstate zero play counts, and the existing recent-song card is unchanged.

- [ ] **Step 4: Integrate and deploy**

Fast-forward into `main`, run the merged suite excluding `.worktrees/**`, push `main`, wait for the matching Vercel deployment to reach `READY`, and verify:

```text
GET https://golden-xzs-blog.vercel.app/api/hobby/netease/weekly
GET https://golden-xzs-blog.vercel.app/hobby
```

Expected: weekly API returns `ready` with up to ten real `weekData` rows or an honest empty/unavailable state, `/hobby` returns HTTP 200, removed footprint route returns 404, and no Cookie appears in the weekly response or runtime logs.
