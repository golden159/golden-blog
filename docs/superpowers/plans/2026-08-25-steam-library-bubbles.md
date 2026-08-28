# Steam Library Bubbles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the divider below the 小黑盒 account and add an animated, responsive tag cloud sourced from the public Steam game library.

**Architecture:** Keep Steam credentials server-only and expose the owned-games result through a dedicated Next.js route so the frequently refreshed activity response stays small. Normalize the upstream and browser payloads independently, then render deterministic translucent bubbles whose size reflects total playtime and whose motion respects reduced-motion preferences.

**Tech Stack:** Next.js 16 route handlers, React 19, SWR, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Never expose `STEAM_WEB_API_KEY` to browser code or API responses.
- Read the owned library from Steam's official `IPlayerService/GetOwnedGames` API.
- Render every returned public library game, sorted by lifetime playtime and then name.
- Use translucent rounded bubbles with deterministic size and animation, not game artwork.
- Keep layouts usable at 320px, 390px, 768px, and 1280px without horizontal overflow.
- Disable decorative movement when `prefers-reduced-motion: reduce` is active.
- Retain safe unavailable and empty states when the library is private or Steam fails.

---

### Task 1: Remove the account divider

**Files:**
- Modify: `app/hobby/components/account-copy-button.test.tsx`
- Modify: `app/hobby/components/account-copy-button.tsx`

**Interfaces:**
- Consumes: `AccountCopyButton({ label, value })`
- Produces: A flat account row with no bottom border.

- [x] **Step 1: Write the failing test**

Assert that the 小黑盒 row does not contain `border-b`, `border-gray-200`, or `dark:border-gray-700`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- app/hobby/components/account-copy-button.test.tsx`
Expected: FAIL because the row still has the divider classes.

- [x] **Step 3: Write minimal implementation**

Remove the divider classes from the account row while retaining spacing and the two-column layout.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- app/hobby/components/account-copy-button.test.tsx`
Expected: PASS.

### Task 2: Add a server-only Steam owned-library adapter

**Files:**
- Modify: `app/components/steam/types.ts`
- Create: `app/components/steam/normalize-library.ts`
- Create: `app/components/steam/normalize-library.test.ts`
- Modify: `app/components/steam/steam.ts`
- Modify: `app/components/steam/steam.test.ts`

**Interfaces:**
- Consumes: Steam `GetOwnedGames` payload and server-side `STEAM_WEB_API_KEY`.
- Produces: `fetchSteamLibrary(options): Promise<SteamLibraryResponse>` with `{ state, generatedAt, totalCount, games }`.

- [x] **Step 1: Write failing normalizer and adapter tests**

Cover valid owned games, playtime ordering, zero-minute games, invalid records, a private/empty library, missing credentials, official endpoint parameters, and absence of the API key from the response.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/components/steam/normalize-library.test.ts app/components/steam/steam.test.ts`
Expected: FAIL because the types, normalizer, and fetch function do not exist.

- [x] **Step 3: Implement the normalizer and adapter**

Call `IPlayerService/GetOwnedGames/v0001/` with `include_appinfo=true`, `include_played_free_games=true`, and `format=json`. Normalize positive app IDs, trimmed names, non-negative lifetime minutes, deduplicate by app ID, and sort descending by playtime with a stable name tie-breaker.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/components/steam/normalize-library.test.ts app/components/steam/steam.test.ts`
Expected: PASS.

### Task 3: Expose and validate the public library response

**Files:**
- Create: `app/api/hobby/steam/library/route.ts`
- Create: `app/api/hobby/steam/library/route.test.ts`
- Create: `app/hobby/components/steam-library-data.ts`
- Create: `app/hobby/components/steam-library-data.test.ts`

**Interfaces:**
- Consumes: `fetchSteamLibrary()` and `/api/hobby/steam/library` JSON.
- Produces: `normalizeSteamLibrary`, `fetchSteamLibraryData`, and `useSteamLibrary`.

- [x] **Step 1: Write failing route and client-validation tests**

Assert the route uses a one-hour stale cache and the browser rejects malformed, duplicated, oversized, or incoherent payloads.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/api/hobby/steam/library/route.test.ts app/hobby/components/steam-library-data.test.ts`
Expected: FAIL because the route and browser normalizer do not exist.

- [x] **Step 3: Implement route, browser normalizer, fetcher, and SWR hook**

Use a dedicated route and a no-periodic-refresh SWR hook. Fall back to a canonical unavailable response on network or validation failure.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/hobby/steam/library/route.test.ts app/hobby/components/steam-library-data.test.ts`
Expected: PASS.

### Task 4: Render the responsive animated bubble cloud

**Files:**
- Create: `app/hobby/components/steam-library-bubbles.tsx`
- Create: `app/hobby/components/steam-library-bubbles.test.tsx`
- Modify: `app/hobby/components/game-details.tsx`
- Modify: `app/hobby/components/game-details.test.tsx`
- Modify: `app/tailwind.css`

**Interfaces:**
- Consumes: `SteamLibraryResponse` or `useSteamLibrary()`.
- Produces: A `Steam 游戏库` region of store links sized by lifetime playtime.

- [x] **Step 1: Write failing component tests**

Cover the heading/count, store URLs, different size tiers, lifetime playtime labels, reveal-all behavior, safe loading/empty/unavailable states, and animation opt-out semantics.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/hobby/components/steam-library-bubbles.test.tsx app/hobby/components/game-details.test.tsx`
Expected: FAIL because the bubble component is missing.

- [x] **Step 3: Implement bubbles and integrate them below recent games**

Render an initially bounded set with a reveal-all button, translucent rounded links, deterministic animation delays, four size tiers from lifetime minutes, tooltips and accessible playtime text. Add CSS keyframes and a reduced-motion media query.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/hobby/components/steam-library-bubbles.test.tsx app/hobby/components/game-details.test.tsx`
Expected: PASS.

### Task 5: Verify the complete change

**Files:**
- Modify: `docs/superpowers/plans/2026-08-25-steam-library-bubbles.md`

**Interfaces:**
- Consumes: All tasks above.
- Produces: Verified implementation ready for Preview deployment.

- [x] **Step 1: Run focused and full verification**

Run: `npm test && npm run check && npm run build`
Expected: All tests, Biome checks, and the production build pass.

- [x] **Step 2: Check responsive layout and motion behavior**

Verify the expanded Games card at 320px, 390px, 768px, and 1280px and confirm no horizontal overflow. Confirm the bubble movement is absent under reduced motion.

- [x] **Step 3: Mark this plan complete**

Change each checkbox to `[x]` after its evidence has been observed.
