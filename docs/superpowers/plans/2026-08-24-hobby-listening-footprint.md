# Hobby Listening Footprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an honest, visually striking “听歌足迹” dashboard to the expanded Hobby music card with today, lifetime estimate, this-week/Monday duration, and switchable week/month/year reports.

**Architecture:** Keep the existing recent/weekly activity endpoint unchanged for the compact card. Add a separate server-only footprint pipeline that requests up to 100 authenticated recent records plus Cookie-free weekly ranking and profile detail, normalizes those sources into a public statistics contract, and exposes it through `/api/hobby/netease/footprint`. A client validator and SWR hook feed a dedicated bento-style React dashboard; exact period values come only from timestamped recent records, while lifetime duration is explicitly labeled as an estimate based on the account listen count and a median track-duration sample.

**Tech Stack:** Next.js App Router, TypeScript, React 19, SWR, Tailwind CSS 4, Motion, Vitest, Testing Library, Biome.

## Global Constraints

- Never expose, serialize, or log `NETEASE_MUSIC_COOKIE`; only the authenticated `/record/recent/song` POST may receive it.
- Weekly `/user/record` and profile `/user/detail` requests are public GET requests and must never receive Cookie headers.
- Preserve the existing recent-song card behavior and its 60-second refresh interval; footprint statistics refresh every 5 minutes.
- Request at most 100 recent records and label today/week/month/year values as recent-record coverage rather than complete NetEase history.
- Show `null`/unavailable period durations as `—`; never convert missing history into a false zero.
- Lifetime duration must be labeled “估算” and calculated as `listenSongs × median(valid recent durations, else valid weekly durations)`.
- Calendar calculations use `Asia/Shanghai` (UTC+8), weeks start on Monday, and reports cover the current calendar week, month, and year.
- Keep trusted artwork restricted to HTTPS `music.126.net` hosts and public song links restricted to `https://music.163.com/song?id=...`.
- The dashboard must remain readable in light/dark themes, responsive from mobile through desktop, keyboard accessible, and respectful of reduced-motion preferences.
- Add no new runtime dependency.

---

### Task 1: Normalize listening-history statistics

**Files:**
- Create: `app/components/netease/footprint-types.ts`
- Create: `app/components/netease/normalize-listening-footprint.ts`
- Create: `app/components/netease/normalize-listening-footprint.test.ts`

**Interfaces:**
- Consumes: `normalizeListeningFootprint({ recentPayload, weeklyPayload, detailPayload, now, recentLimit })` where all three payloads are `unknown`.
- Produces: `NeteaseListeningFootprint` with `state`, `generatedAt`, `timezone`, `coverage`, `today`, `week`, `reports`, `lifetime`, and `weeklyHighlight`.
- `ListeningSlice` contains `durationMs: number | null`, `recordCount: number | null`, `uniqueTrackCount: number | null`, `topArtist: string | null`, `topTrack: string | null`, and literal `buckets`.

- [x] **Step 1: Write failing normalizer tests**

```ts
const now = Date.UTC(2026, 7, 26, 4); // 2026-08-26 12:00 UTC+8

it('aggregates today, Monday, week, month, and year from recent records', () => {
	const result = normalizeListeningFootprint({
		recentPayload: recentFixture,
		weeklyPayload: weeklyFixture,
		detailPayload: { code: 200, listenSongs: 17_620 },
		now,
		recentLimit: 100,
	});

	expect(result.today).toMatchObject({ durationMs: 200_000, recordCount: 1 });
	expect(result.week.mondayDurationMs).toBe(180_000);
	expect(result.reports.week.durationMs).toBe(380_000);
	expect(result.reports.month.recordCount).toBe(3);
	expect(result.reports.year.recordCount).toBe(4);
});

it('marks period history unavailable but keeps an estimated lifetime from public data', () => {
	const result = normalizeListeningFootprint({
		recentPayload: null,
		weeklyPayload: weeklyFixture,
		detailPayload: { code: 200, listenSongs: 17_620 },
		now,
		recentLimit: 100,
	});

	expect(result.state).toBe('partial');
	expect(result.today.durationMs).toBeNull();
	expect(result.lifetime).toMatchObject({ listenCount: 17_620, basis: 'weekly-median' });
});
```

Also cover valid empty recent history, malformed timestamps/durations being skipped, trusted weekly highlight artwork, deterministic top-artist ties, 12 two-hour today buckets, 7 weekday week buckets, 5 month-range buckets, 12 year-month buckets, and a fully unavailable result.

- [x] **Step 2: Run tests to verify RED**

Run: `npx vitest run app/components/netease/normalize-listening-footprint.test.ts`

Expected: FAIL because the module and public types do not exist.

- [x] **Step 3: Implement the minimal pure normalizer**

```ts
export type NeteaseListeningFootprint = {
	state: 'ready' | 'partial' | 'unavailable';
	generatedAt: number;
	timezone: 'Asia/Shanghai';
	coverage: {
		recentAvailable: boolean;
		recordCount: number | null;
		oldestPlayedAt: number | null;
		limit: 100;
		truncated: boolean;
	};
	today: ListeningSlice;
	week: { durationMs: number | null; mondayDurationMs: number | null; recordCount: number | null };
	reports: Record<'week' | 'month' | 'year', ListeningSlice>;
	lifetime: {
		listenCount: number | null;
		estimatedDurationMs: number | null;
		sampleDurationMs: number | null;
		basis: 'recent-median' | 'weekly-median' | null;
	};
	weeklyHighlight: FootprintTrack | null;
};
```

Normalize records independently and skip malformed entries. Use fixed UTC+8 calendar boundaries, literal bucket labels, median sampling, stable latest-record tie breaking, and the existing NetEase URL trust rules.

- [x] **Step 4: Run normalizer tests to verify GREEN**

Run: `npx vitest run app/components/netease/normalize-listening-footprint.test.ts app/components/netease/normalize-recent-track.test.ts app/components/netease/normalize-weekly-track.test.ts`

Expected: PASS.

- [x] **Step 5: Commit Task 1**

```bash
git add app/components/netease/footprint-types.ts app/components/netease/normalize-listening-footprint.ts app/components/netease/normalize-listening-footprint.test.ts
git commit -m "feat: normalize netease listening footprint"
```

### Task 2: Fetch footprint sources securely and expose the API

**Files:**
- Create: `app/components/netease/netease-api-url.ts`
- Create: `app/components/netease/netease-api-url.test.ts`
- Modify: `app/components/netease/netease.ts`
- Modify: `app/components/netease/netease.test.ts`
- Create: `app/components/netease/fetch-listening-footprint.ts`
- Create: `app/components/netease/fetch-listening-footprint.test.ts`
- Create: `app/api/hobby/netease/footprint/route.ts`
- Create: `app/api/hobby/netease/footprint/route.test.ts`

**Interfaces:**
- Consumes: `NETEASE_API_BASE_URL`, optional `NETEASE_MUSIC_COOKIE`, `NETEASE_USER_ID`, and injected `fetchImpl`/`now` for tests.
- Produces: `fetchNeteaseListeningFootprint(options?): Promise<NeteaseListeningFootprint>` and `GET /api/hobby/netease/footprint`.
- Shared URL helpers: `parseNeteaseApiBaseUrl(raw, nodeEnv): URL | null` and `buildNeteaseApiUrl(base, endpoint): URL`; path prefixes are preserved, query/hash/credentials are rejected, production remains HTTPS-only, and development HTTP remains loopback-only.

- [x] **Step 1: Write failing URL and fetch-boundary tests**

```ts
it('preserves an API base path prefix', () => {
	const base = parseNeteaseApiBaseUrl('https://example.com/netease-api', 'production');
	expect(buildNeteaseApiUrl(base as URL, '/user/detail').toString()).toBe(
		'https://example.com/netease-api/user/detail',
	);
});

it('sends the Cookie only to the recent POST', async () => {
	await fetchNeteaseListeningFootprint({ env, fetchImpl, now: 1_800_000_000_000 });
	expect(fetchImpl).toHaveBeenCalledTimes(3);
	expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({ Cookie: env.NETEASE_MUSIC_COOKIE });
	expect(fetchImpl.mock.calls[1][1]?.headers).toBeUndefined();
	expect(fetchImpl.mock.calls[2][1]?.headers).toBeUndefined();
});
```

Cover malformed base URLs with zero fetches, missing Cookie with only two public requests, recent body `limit=100`, exact weekly/detail URLs, no-store/redirect-error/5-second timeouts, partial results when one source fails, and no secret in serialized output.

- [x] **Step 2: Run boundary tests to verify RED**

Run: `npx vitest run app/components/netease/netease-api-url.test.ts app/components/netease/fetch-listening-footprint.test.ts app/components/netease/netease.test.ts`

Expected: FAIL because shared URL and footprint fetch modules do not exist.

- [x] **Step 3: Implement shared URL validation and server fetcher**

```ts
const [recentPayload, weeklyPayload, detailPayload] = await Promise.all([
	cookie ? fetchRecentPayload({ limit: 100 }) : Promise.resolve(null),
	fetchPublicPayload('/user/record', { uid: userId, type: '1' }),
	fetchPublicPayload('/user/detail', { uid: userId }),
]);

return normalizeListeningFootprint({
	recentPayload,
	weeklyPayload,
	detailPayload,
	now,
	recentLimit: 100,
});
```

Refactor the existing activity fetcher to use the same URL helpers without changing its recent-first response behavior or 60-second client refresh.

- [x] **Step 4: Add and test the route**

```ts
export const dynamic = 'force-dynamic';

export async function GET() {
	const footprint = await fetchNeteaseListeningFootprint();
	return NextResponse.json(footprint, {
		headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
	});
}
```

Run: `npx vitest run app/components/netease/netease-api-url.test.ts app/components/netease/fetch-listening-footprint.test.ts app/components/netease/netease.test.ts app/api/hobby/netease/footprint/route.test.ts`

Expected: PASS.

- [x] **Step 5: Commit Task 2**

```bash
git add app/components/netease/netease-api-url.ts app/components/netease/netease-api-url.test.ts app/components/netease/netease.ts app/components/netease/netease.test.ts app/components/netease/fetch-listening-footprint.ts app/components/netease/fetch-listening-footprint.test.ts app/api/hobby/netease/footprint/route.ts app/api/hobby/netease/footprint/route.test.ts
git commit -m "feat: expose secure listening footprint api"
```

### Task 3: Validate and refresh the public footprint contract

**Files:**
- Create: `app/hobby/components/music-footprint-data.ts`
- Create: `app/hobby/components/music-footprint-data.test.ts`

**Interfaces:**
- Consumes: unknown JSON from `/api/hobby/netease/footprint`.
- Produces: `normalizeMusicFootprint(value): NeteaseListeningFootprint`, `fetchMusicFootprint(url)`, and `useMusicFootprint(enabled = true)` with a 300,000 ms refresh.

- [x] **Step 1: Write failing client-contract tests**

```ts
it('accepts a complete footprint and preserves literal report buckets', () => {
	expect(normalizeMusicFootprint(validFootprint)).toEqual(validFootprint);
});

it.each([
	['negative duration', withTodayDuration(-1)],
	['invalid state', { ...validFootprint, state: 'fake' }],
	['unsafe highlight artwork', withArtwork('https://example.com/cover.jpg')],
])('fails closed for %s', (_case, payload) => {
	expect(normalizeMusicFootprint(payload).state).toBe('unavailable');
});
```

Also cover `null` unavailable values, finite timestamp bounds, exact week/month/year bucket counts, unavailable fetch responses, and the five-minute SWR key/interval.

- [x] **Step 2: Run tests to verify RED**

Run: `npx vitest run app/hobby/components/music-footprint-data.test.ts`

Expected: FAIL because the client module does not exist.

- [x] **Step 3: Implement minimal fail-closed validation and hook**

```ts
export function useMusicFootprint(enabled = true) {
	return useSWR<NeteaseListeningFootprint>(
		enabled ? '/api/hobby/netease/footprint' : null,
		fetchMusicFootprint,
		{
			refreshInterval: 300_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
```

- [x] **Step 4: Run client tests to verify GREEN**

Run: `npx vitest run app/hobby/components/music-footprint-data.test.ts app/hobby/components/music-activity.test.ts`

Expected: PASS.

- [x] **Step 5: Commit Task 3**

```bash
git add app/hobby/components/music-footprint-data.ts app/hobby/components/music-footprint-data.test.ts
git commit -m "feat: validate listening footprint data"
```

### Task 4: Build the visual listening-footprint dashboard

**Files:**
- Create: `app/hobby/components/listening-footprint.tsx`
- Create: `app/hobby/components/listening-footprint.test.tsx`
- Modify: `app/hobby/components/music-details.tsx`
- Modify: `app/hobby/components/music-details.test.tsx`

**Interfaces:**
- Consumes: optional `NeteaseListeningFootprint`; otherwise `MusicDetails` loads it with `useMusicFootprint` only while the expanded Music panel is mounted.
- Produces: an accessible `section` titled `听歌足迹`, today timeline, estimated lifetime card, week/Monday comparison, and tabs for week/month/year reports.

- [x] **Step 1: Write failing component tests**

```tsx
it('renders the four requested footprint modules with honest data labels', () => {
	render(<ListeningFootprint footprint={validFootprint} />);
	expect(screen.getByRole('heading', { name: '听歌足迹' })).toBeInTheDocument();
	expect(screen.getByText('今日聆听')).toBeInTheDocument();
	expect(screen.getByText('总聆听时长')).toBeInTheDocument();
	expect(screen.getByText('本周 / 周一')).toBeInTheDocument();
	expect(screen.getByRole('tab', { name: '周' })).toHaveAttribute('aria-selected', 'true');
	expect(screen.getByText('估算')).toBeInTheDocument();
	expect(screen.getByText(/最近 100 条记录/)).toBeInTheDocument();
});

it('switches the report chart and summary between week, month, and year', () => {
	render(<ListeningFootprint footprint={validFootprint} />);
	fireEvent.click(screen.getByRole('tab', { name: '月' }));
	expect(screen.getByText('本月报告')).toBeInTheDocument();
	fireEvent.click(screen.getByRole('tab', { name: '年' }));
	expect(screen.getByText('本年报告')).toBeInTheDocument();
});
```

Also cover `—` for unavailable exact durations, partial weekly highlight copy, loading skeleton semantics, duration formatting beyond 24 hours, keyboard-operable native tabs, and MusicDetails integration without a duplicate recent-activity fetch.

- [x] **Step 2: Run UI tests to verify RED**

Run: `npx vitest run app/hobby/components/listening-footprint.test.tsx app/hobby/components/music-details.test.tsx`

Expected: FAIL because the dashboard component does not exist.

- [x] **Step 3: Implement the bento dashboard**

Use a high-contrast neutral canvas with pink/violet/cyan glow layers, oversized tabular numerals, a 12-column “today signal” skyline, a conic lifetime ring, week/Monday comparison bars, and a responsive report panel with native `role="tablist"` buttons. Keep all animation in `motion-safe` utilities or Motion’s reduced-motion path. Add the dashboard below the current-track hero with `className='mt-6'` so the existing cover/status hierarchy remains intact.

- [x] **Step 4: Run UI and integration tests to verify GREEN**

Run: `npx vitest run app/hobby/components/listening-footprint.test.tsx app/hobby/components/music-details.test.tsx app/hobby/components/hobby-grid.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit Task 4**

```bash
git add app/hobby/components/listening-footprint.tsx app/hobby/components/listening-footprint.test.tsx app/hobby/components/music-details.tsx app/hobby/components/music-details.test.tsx
git commit -m "feat: add visual listening footprint dashboard"
```

### Task 5: Verify, review, merge, and deploy

**Files:**
- Modify: `docs/superpowers/plans/2026-08-24-hobby-listening-footprint.md` (check completed steps)

**Interfaces:**
- Consumes: the complete branch.
- Produces: reviewed `main`, matching Vercel deployment, and online footprint/API evidence.

- [x] **Step 1: Run focused and full verification**

```bash
npx vitest run app/components/netease/normalize-listening-footprint.test.ts app/components/netease/fetch-listening-footprint.test.ts app/api/hobby/netease/footprint/route.test.ts app/hobby/components/music-footprint-data.test.ts app/hobby/components/listening-footprint.test.tsx app/hobby/components/music-details.test.tsx
npm test
npm run check
npm run build
```

Expected: all tests, Biome checks, TypeScript, and the production Turbopack build pass.

- [x] **Step 2: Visually inspect responsive states**

Run the local site with the public API base and user ID, inspect `/hobby` at mobile and desktop widths, open Music, switch 周/月/年, and confirm loading/partial/ready states remain legible with no horizontal overflow.

- [x] **Step 3: Review the complete branch**

Review against this plan, with special attention to Cookie isolation, period-boundary math, null-versus-zero honesty, client validation, accessibility, and layout behavior.

- [ ] **Step 4: Integrate and deploy**

Fast-forward merge the reviewed branch into `main`, run the merged test suite, push `main`, wait for the matching Vercel deployment to reach `READY`, then verify:

```text
GET https://golden-xzs-blog.vercel.app/api/hobby/netease/footprint
GET https://golden-xzs-blog.vercel.app/hobby
```

Expected: footprint API returns `ready` or honest `partial` public data, `/hobby` returns HTTP 200, and no Cookie appears in any public response or log.
