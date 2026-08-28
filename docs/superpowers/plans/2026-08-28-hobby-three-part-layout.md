# Hobby Three-Part Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Food and Travel sections and present Games, Anime, and Music in a responsive three-part Hobby layout.

**Architecture:** Keep the existing 12-column Hobby grid and single-open accordion. Static category metadata controls the closed-card spans at `md` and `lg`; open cards continue to use the existing full-width override. Remove Food/Travel from the active type, content, render branches, tests, and local asset while preserving historical design documents and all Steam internals.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4 utility classes, Motion, Vitest, Testing Library, Vercel.

## Global Constraints

- The only Hobby categories are `Games`, `Anime`, and `Music`, in that order, numbered `01`, `02`, and `03`.
- Below `768px`, cards remain one column. From `768px` through `1023px`, Games spans 12 columns and Anime/Music span 6 each. At `1024px` and above, all three span 4 columns.
- Keep the current single-open accordion behavior; an open card spans all 12 columns.
- Do not change `app/hobby/components/steam-library-bubbles.tsx` or the Steam bubble CSS restored from Vercel deployment `4S73Dr95S`.
- Preserve Steam current game, recent games, playtime, library, show-all, links, fallbacks, and data loading.
- Remove active Food/Travel code, dedicated tests, and `public/static/hobby/food-placeholder.svg`; preserve historical files under `docs/superpowers/specs/` and older files under `docs/superpowers/plans/`.
- Preserve all unrelated and pre-existing uncommitted work. Do not reset, checkout, clean, or commit the dirty working tree.
- Deliver a Vercel Preview only; do not deploy Production.

---

### Task 1: Specify the three-category contract with failing tests

**Files:**
- Modify: `app/hobby/content.test.ts`
- Modify: `app/hobby/components/hobby-grid.test.tsx`
- Create: `app/hobby/page.test.tsx`

**Interfaces:**
- Consumes: `hobbyCategories`, `HobbyGrid`, and exported Hobby page `metadata`.
- Produces: regression coverage for category membership/order, responsive spans, rendered headings, and page metadata.

- [x] **Step 1: Change the content contract test**

Replace the five-category expectations with the hand-derived three-category contract:

```ts
expect(hobbyCategories.map(({ id }) => id)).toEqual([
	'games',
	'anime',
	'music',
]);
expect(hobbyCategories.map(({ compactSpan }) => compactSpan)).toEqual([
	'md:col-span-12 lg:col-span-4',
	'md:col-span-6 lg:col-span-4',
	'md:col-span-6 lg:col-span-4',
]);
```

Remove the obsolete `travelCities` import and assertion.

- [x] **Step 2: Change the rendered-category test**

Require exactly the retained headings and explicitly reject the removed headings:

```ts
for (const title of ['Games', 'Anime', 'Music']) {
	expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument();
}
expect(screen.queryByRole('heading', { name: 'Food' })).not.toBeInTheDocument();
expect(screen.queryByRole('heading', { name: 'Travel' })).not.toBeInTheDocument();
```

Keep the existing assertions for the Games indicator and three informative previews. Delete Food/Travel visual assertions because those components will no longer exist.

- [x] **Step 3: Add the metadata contract test**

Create `app/hobby/page.test.tsx`:

```ts
import { describe, expect, it } from 'vitest';
import { metadata } from './page';

describe('Hobby page metadata', () => {
	it('describes only the three retained interests', () => {
		expect(metadata.description).toBe('Golden 的游戏、动漫与音乐兴趣。');
	});
});
```

- [x] **Step 4: Run the RED tests**

Run:

```bash
corepack yarn test app/hobby/content.test.ts app/hobby/components/hobby-grid.test.tsx app/hobby/page.test.tsx --maxWorkers=1
```

Expected: FAIL because Food/Travel still render, the old spans remain, and metadata still mentions them.

---

### Task 2: Remove Food/Travel and implement responsive spans

**Files:**
- Modify: `app/hobby/content.ts`
- Modify: `app/hobby/types.ts`
- Modify: `app/hobby/components/hobby-grid.tsx`
- Modify: `app/hobby/components/category-visual.tsx`
- Modify: `app/hobby/page.tsx`
- Delete: `app/hobby/components/food-details.tsx`
- Delete: `app/hobby/components/food-details.test.tsx`
- Delete: `app/hobby/components/travel-details.tsx`
- Delete: `app/hobby/components/travel-details.test.tsx`
- Delete: `public/static/hobby/food-placeholder.svg`
- Test: `app/hobby/content.test.ts`
- Test: `app/hobby/components/hobby-grid.test.tsx`
- Test: `app/hobby/page.test.tsx`

**Interfaces:**
- Consumes: the existing `HobbyCategory.compactSpan` mechanism and `HobbyCard` full-width open state.
- Produces: `HobbyId = 'games' | 'anime' | 'music'` and three category records with responsive spans.

- [x] **Step 1: Reduce the typed content model**

Use this union:

```ts
export type HobbyId = 'games' | 'anime' | 'music';
```

Set category spans to:

```ts
// Games
compactSpan: 'md:col-span-12 lg:col-span-4'
// Anime and Music
compactSpan: 'md:col-span-6 lg:col-span-4'
```

Delete the Food/Travel category records, `foodContent`, and `travelCities`. Leave profiles, accounts, music genres, and Steam data unchanged.

- [x] **Step 2: Remove obsolete runtime branches**

Delete Food/Travel imports and branches from `hobby-grid.tsx`. Make `CategoryVisual` exhaustive for the three remaining IDs by returning `MusicPreview` after the Games and Anime branches:

```tsx
if (id === 'games') return <SteamPreview steamActivity={steamActivity} />;
if (id === 'anime') return <AnimePreview animeActivity={animeActivity} />;
return <MusicPreview musicActivity={musicActivity} />;
```

- [x] **Step 3: Update metadata and delete obsolete files**

Set:

```ts
description: 'Golden 的游戏、动漫与音乐兴趣。'
```

Delete the two details components, their tests, and the Food placeholder SVG. Do not edit historical design/plan documents.

- [x] **Step 4: Run the GREEN tests**

Run:

```bash
corepack yarn test app/hobby/content.test.ts app/hobby/components/hobby-grid.test.tsx app/hobby/page.test.tsx --maxWorkers=1
```

Expected: all targeted tests pass; all existing accordion, footer, and activity-data assertions remain green.

- [x] **Step 5: Search for active leftovers**

Run:

```bash
rg -n 'Food|Travel|foodContent|travelCities|food-preview|travel-preview|food-placeholder' app public
```

Expected: no active-code or active-asset matches.

---

### Task 3: Verify behavior, responsive layout, and Preview delivery

**Files:**
- Verify: all changed Hobby files
- Preserve unchanged: `app/hobby/components/steam-library-bubbles.tsx`
- Preserve unchanged: Steam bubble rules in `app/tailwind.css`

**Interfaces:**
- Consumes: the completed three-category UI.
- Produces: test/build/visual evidence and a Vercel Preview URL.

- [x] **Step 1: Run static and automated verification**

Run:

```bash
corepack yarn biome check app/hobby app/components/steam app/tailwind.css
corepack yarn test --exclude '**/.worktrees/**' --maxWorkers=1
corepack yarn build
git diff --check
```

Expected: Biome, all tests, build, and whitespace validation pass. The existing Spotify `invalid_client` fallback log is non-blocking if it is the only build warning.

- [x] **Step 2: Verify responsive layouts**

Inspect `/hobby` at widths `390`, `768`, `1024`, and `1280` pixels. Confirm:

```text
390: Games / Anime / Music are stacked one per row.
768: Games is full width; Anime and Music share the next row.
1024 and 1280: Games / Anime / Music are equal-width on one row.
All widths: no Food/Travel, no horizontal overflow, only one open panel, open panel full width.
```

- [x] **Step 3: Confirm Steam layout preservation**

Compare the current Steam bubble component and CSS against their pre-task hashes/diff. No changes are allowed in `steam-library-bubbles.tsx` or Steam bubble CSS rules.

- [x] **Step 4: Deploy and inspect Preview**

Run:

```bash
npx --yes vercel@latest deploy --yes
npx --yes vercel@latest inspect <preview-host>
```

Expected: target `preview`, status `Ready`. Do not pass `--prod`.
