# Hobby Flat Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Steam and Anime profile dividers on desktop and replace nested expanded-card surfaces with a compact, readable mobile layout.

**Architecture:** Keep `HobbyCard` as the only outer card surface. Make its summary a full-height flex column so profile footers share the row baseline, then render category details as flat sections separated by whitespace or single dividers. Preserve all data, links, copy actions, and accordion semantics.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Motion, Vitest, React Testing Library, Playwright browser verification.

## Global Constraints

- Preserve the five categories, their order, and the one-open-at-a-time accordion behavior.
- Preserve Steam, Bangumi, and NetEase destination URLs and visible IDs.
- Keep `HobbyCard` as the only rounded bordered container around an expanded category.
- At 390 px, avoid horizontal overflow and keep primary text, account actions, anime entries, and music ranking rows readable.
- Do not change API contracts, fetch timing, or personal content.

---

### Task 1: Align summary footers and compact closed cards

**Files:**
- Modify: `app/hobby/components/hobby-card.tsx`
- Modify: `app/hobby/components/category-visual.tsx`
- Modify: `app/hobby/components/steam-profile-footer.tsx`
- Modify: `app/hobby/components/anime-profile-footer.tsx`
- Modify: `app/hobby/components/music-profile-footer.tsx`
- Test: `app/hobby/components/hobby-grid.test.tsx`

**Interfaces:**
- Consumes: existing `topFooter?: ReactNode` and category visuals.
- Produces: full-height summary columns and auto-positioned footer dividers.

- [ ] **Step 1: Write failing layout-contract tests**

Assert the Games, Anime, and Music summary wrappers use a full-height flex column, and all three profile footers use `mt-auto`. Assert decorative-only Games, Food, and Travel visuals are hidden below `sm` while Anime and Music previews remain visible.

- [ ] **Step 2: Run the focused test and verify the new expectations fail**

Run: `npm test -- app/hobby/components/hobby-grid.test.tsx --run --maxWorkers=1`

Expected: FAIL because summary wrappers are plain padding containers and footers use `mt-5`.

- [ ] **Step 3: Implement the shared summary layout**

Use a summary wrapper equivalent to:

```tsx
<div
  data-testid={`hobby-${category.id}-summary`}
  className='flex h-full flex-col p-5 sm:p-6 md:p-8'
>
```

Change profile footer spacing to `mt-auto` with `pt-3`, and hide only decorative compact visuals on phones with responsive display classes.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- app/hobby/components/hobby-grid.test.tsx --run --maxWorkers=1`

Expected: PASS.

### Task 2: Flatten Games and Travel details

**Files:**
- Modify: `app/hobby/components/hobby-card.tsx`
- Modify: `app/hobby/components/game-details.tsx`
- Modify: `app/hobby/components/account-copy-button.tsx`
- Modify: `app/hobby/components/travel-details.tsx`
- Test: `app/hobby/components/game-details.test.tsx`
- Test: `app/hobby/components/account-copy-button.test.tsx`
- Test: `app/hobby/components/travel-details.test.tsx`

**Interfaces:**
- Consumes: existing game groups, account values, clipboard action, and city list.
- Produces: flat detail sections with one divider level and no nested bordered cards.

- [ ] **Step 1: Write failing flat-layout tests**

Assert account rows expose the same copy action without a rounded bordered wrapper. Assert Travel renders city sections without nested `article` card elements. Preserve all existing content and interaction assertions.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- app/hobby/components/game-details.test.tsx app/hobby/components/account-copy-button.test.tsx app/hobby/components/travel-details.test.tsx --run --maxWorkers=1`

Expected: FAIL on the existing nested surface classes and Travel articles.

- [ ] **Step 3: Implement flat rows and responsive panel padding**

Use simple `border-b`/`divide-y` rows, keep small pills only where they encode a status or category, and reduce `HobbyPanel` mobile padding to `px-5 py-5` while retaining `md:px-8 md:py-8`.

- [ ] **Step 4: Run focused tests and verify passing behavior**

Run: `npm test -- app/hobby/components/game-details.test.tsx app/hobby/components/account-copy-button.test.tsx app/hobby/components/travel-details.test.tsx --run --maxWorkers=1`

Expected: PASS.

### Task 3: Flatten Anime details

**Files:**
- Modify: `app/hobby/components/anime-details.tsx`
- Test: `app/hobby/components/anime-details.test.tsx`

**Interfaces:**
- Consumes: normalized Bangumi activity.
- Produces: a flat profile header and divider-separated anime list.

- [ ] **Step 1: Write a failing flat-layout test**

Assert the Anime details root and collection links do not create rounded bordered panel/card surfaces, while profile, totals, scores, episode counts, and destination links remain intact.

- [ ] **Step 2: Run the Anime test and verify failure**

Run: `npm test -- app/hobby/components/anime-details.test.tsx --run --maxWorkers=1`

Expected: FAIL because the root and each entry currently have bordered rounded surfaces.

- [ ] **Step 3: Implement a flat Anime hierarchy**

Remove the root frame/gradient and entry-card borders. Use a profile row, a lightweight left divider for the collection total, and a `divide-y` list with compact mobile spacing.

- [ ] **Step 4: Run the Anime test and verify passing behavior**

Run: `npm test -- app/hobby/components/anime-details.test.tsx --run --maxWorkers=1`

Expected: PASS.

### Task 4: Flatten Music and weekly ranking details

**Files:**
- Modify: `app/hobby/components/music-details.tsx`
- Modify: `app/hobby/components/listening-weekly-ranking.tsx`
- Test: `app/hobby/components/music-details.test.tsx`
- Test: `app/hobby/components/listening-weekly-ranking.test.tsx`

**Interfaces:**
- Consumes: normalized recent activity and weekly ranking.
- Produces: a flat current-track section and divider-separated weekly rows.

- [ ] **Step 1: Write failing flat-layout tests**

Assert the Music root, fixed/dynamic tag groups, weekly shell, state output, and ranking list do not add rounded bordered panel surfaces. Preserve track, tag, state, timing, ranking, and accessibility assertions.

- [ ] **Step 2: Run Music tests and verify failure**

Run: `npm test -- app/hobby/components/music-details.test.tsx app/hobby/components/listening-weekly-ranking.test.tsx --run --maxWorkers=1`

Expected: FAIL on current nested surface classes.

- [ ] **Step 3: Implement flat Music sections**

Remove outer gradients, shadows, border frames, and inner tag cards. Keep album art and semantic status chips, separate major sections with a single top border, and render ranking entries with `divide-y` and compact three-column mobile rows.

- [ ] **Step 4: Run Music tests and verify passing behavior**

Run: `npm test -- app/hobby/components/music-details.test.tsx app/hobby/components/listening-weekly-ranking.test.tsx --run --maxWorkers=1`

Expected: PASS.

### Task 5: Verify browser layout and redeploy Preview

**Files:**
- Verify all modified Hobby files.

**Interfaces:**
- Consumes: completed flat layout.
- Produces: a ready Vercel Preview URL.

- [ ] **Step 1: Run repository verification**

Run: `npm run check && npx tsc --noEmit && npm test -- --run --maxWorkers=1`

Expected: Biome clean, TypeScript exit 0, and all Vitest tests pass.

- [ ] **Step 2: Verify desktop and mobile geometry in a real browser**

At 1440×1000, confirm the Games and Anime footer divider `y` coordinates match. At 390×844, confirm `scrollWidth === 390`, compact cards expose their text/actions, and expanded Games, Anime, and Music content has no nested panel surfaces.

- [ ] **Step 3: Deploy a new Vercel Preview**

Run the linked Vercel CLI deployment with `target=preview`, wait for `READY`, then fetch `/hobby` and confirm HTTP 200 plus the Steam profile footer.
