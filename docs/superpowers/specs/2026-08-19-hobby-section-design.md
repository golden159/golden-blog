# Hobby Section Design

**Date:** 2026-08-19
**Status:** Approved
**Route:** `/hobby`

## 1. Objective

Add a fifth `/hobby` entry beside the homepage's existing `/projects`, `/thoughts`, `/uses`, and `/stats` links. The new page presents Golden's interests in games, anime, music, food, and travel while preserving the blog's current visual language, light/dark themes, typography, and restrained Motion interactions.

The page uses a progressive-disclosure Bento layout: visitors first see all five categories, then expand one category at a time for selected details. It must remain useful when optional third-party music data is unavailable.

## 2. Scope

### Included

- A homepage `/hobby` link matching the four existing links.
- A standalone `/hobby` page using the shared `PageContainer` and `Header` patterns.
- Five Hobby categories with mixed English headings and Chinese descriptions.
- A responsive, asymmetric Bento grid.
- Single-open disclosure behavior with accessible keyboard controls.
- Static personal-interest content and game account links/identifiers.
- A Bangumi profile link.
- A server-only, failure-tolerant integration for recent NetEase Cloud Music activity.
- Local placeholder visuals for content that does not yet have personal media.
- Automated interaction, normalization, and fallback tests.

### Excluded

- Bangumi collection, rating, or watch-progress scraping.
- Steam, 小黑盒, or Battle.net authentication, online presence, achievements, or game-time APIs.
- Strict real-time NetEase playback or authoritative online status.
- A food gallery or restaurant database in the first release.
- Search, filtering, pagination, URL-persisted expansion state, or multiple simultaneously expanded categories.
- Installing Magic UI, shadcn/ui, or Motion Primitives as UI frameworks.

## 3. Content and Language

The interface uses mixed language:

- Category headings: `Games`, `Anime`, `Music`, `Food`, and `Travel`.
- Summaries, explanations, status help, and detail copy: Chinese.
- Proper names retain their original form.

The page title is `Hobby`. Its introductory copy communicates that this page collects the things that sustain curiosity and happiness outside work and study.

### Games

Selected interests are grouped by experience rather than ranked:

- `Competitive`: 守望先锋
- `Hunting`: 怪物猎人
- `Co-op Nights`: R.E.P.O.、PEAK、胡闹厨房、链在一起、机械狂欢

The expanded Games card also contains a `Game Accounts` section:

- Steam profile: `https://steamcommunity.com/profiles/76561198985102331/`
- 小黑盒 ID: `29362113`
- Battle.net BattleTag: `小朱诺诺的#5394`

Steam opens as an external link. 小黑盒 and Battle.net use copy actions because no confirmed public profile URLs are available. Login email, cookies, and other private credentials are never displayed.

### Anime

The Anime card highlights the Bangumi profile:

- User ID: `1022640`
- Profile: `https://bangumi.tv/user/1022640`

The first release does not fetch Bangumi data. It provides an explicit external call to action and explains that the complete collection can be viewed on Bangumi.

### Music

Music preferences are shown as tags:

- 日语
- ACG
- 流行
- 说唱
- 粤语
- 民谣

NetEase Cloud Music identity:

- User ID: `3719820729`
- Profile: `https://y.music.163.com/m/user?id=3719820729`

The card displays the latest available listening record, album art, track name, artist, album, activity label, and profile link when the server integration is configured.

### Food

The first release intentionally uses a polished local image placeholder, a short Chinese paragraph, and a `Coming soon` label. It does not invent restaurants, dishes, or reviews. The data and visual slot are structured so personal food photos and writing can replace the placeholder later.

### Travel

The Travel card presents four cities:

- 杭州
- 佛山
- 深圳
- 中山

The first release uses consistent local city placeholder visuals and does not invent trip dates or travel stories. The visual entries are replaceable with personal photographs later.

## 4. Information Architecture

### Homepage

Append `/hobby` to the existing `More about me` route list:

```text
/projects  /thoughts  /uses  /stats  /hobby
```

It uses the same Link treatment, spacing, type size, and `data-skip-splash-cursor` behavior as its siblings. Small screens may wrap the list naturally.

### Hobby page

The route follows existing page conventions:

- `app/hobby/layout.tsx` wraps children in `PageContainer`.
- `app/hobby/page.tsx` supplies metadata, the shared `Header`, introductory copy, and the Hobby grid.
- Metadata title: `Hobby`.
- Metadata description: a concise description of Golden's hobbies.

## 5. Layout

### Desktop and tablet

The default closed state uses a 12-column grid:

```text
┌──────────────── Games · 7 ───────────────┬──── Anime · 5 ────┐
├──────── Music · 4 ───────┬──── Food · 4 ─┼─── Travel · 4 ────┤
```

Games and Anime are the primary cards. Music, Food, and Travel form an equal-width second row.

When a card opens, it spans all 12 columns and reveals its detail area inside the same card. Remaining cards reflow through the grid. Only one card can be open at a time.

### Mobile

The layout becomes a single column in this order:

1. Games
2. Anime
3. Music
4. Food
5. Travel

No interaction depends on hover. Cards must not produce horizontal page overflow.

## 6. Visual Design

The page extends, rather than replaces, the existing blog style:

- Light mode uses white or soft-gray surfaces and dark text.
- Dark mode uses near-black surfaces, muted gray borders, and readable light text.
- `primary-500` pink is reserved for focus rings, status indicators, thin underlines, and small accents.
- Cards use medium rounded corners, thin borders, restrained shadows, and generous spacing.
- Continuous glows, saturated full-card gradients, and exaggerated bounce effects are excluded.

Default cards contain:

- English category heading
- One-line Chinese overview
- A small category index or status label
- A visual region appropriate to the category
- A visible disclosure indicator

Image treatment:

- Games uses a local abstract multiplayer-gaming visual and textual game names; third-party game covers are not bundled into the MIT-licensed source tree.
- Anime uses a local Bangumi-oriented entry visual without scraping the user's avatar.
- Music uses upstream album art when available and a local fallback when it is not.
- Food uses a local placeholder visual.
- Travel uses a coordinated set of local city placeholder visuals.

## 7. Interaction and Accessibility

Each category is an `<article>`. Its disclosure trigger is a real `<button>` rather than a clickable container. External links and copy controls live outside the trigger to avoid nested interactive elements.

State is represented by:

```ts
activeCategory: HobbyId | null
```

Rules:

- Initial value is `null`; all cards are closed.
- Selecting a closed card opens it.
- Selecting the currently open card closes it.
- Selecting another card closes the previous card and opens the selected card.
- State is not saved in the URL or local storage.

The component uses Motion `layout` for grid reflow and `AnimatePresence` for detail content. The standard transition lasts 300 ms. The reduced-motion path removes layout translation and scale, using a 150 ms opacity fade only. The implementation borrows the disclosure model from Motion Primitives but is written to fit this codebase instead of importing the library.

Accessibility requirements:

- `Enter` and Space activate each disclosure trigger.
- Triggers expose `aria-expanded` and `aria-controls`.
- Detail panels have stable IDs and appropriate labelled relationships.
- Opening a card does not forcibly move keyboard focus.
- Focus indicators remain visible in both themes.
- `prefers-reduced-motion` disables large position and scale movement, retaining only a brief fade.
- External links identify their destination and open with `noopener noreferrer`.
- Dynamic album art has track-specific alternative text.
- Copy success is announced through an accessible live status message.

## 8. Component Boundaries

Planned feature files:

```text
app/hobby/
├── layout.tsx
├── page.tsx
├── content.ts
├── types.ts
└── components/
    ├── hobby-grid.tsx
    ├── hobby-card.tsx
    ├── game-details.tsx
    ├── anime-details.tsx
    ├── music-details.tsx
    ├── food-details.tsx
    ├── travel-details.tsx
    └── account-copy-button.tsx

app/api/hobby/netease/
└── route.ts

app/components/netease/
├── netease.ts
├── normalize-recent-track.ts
└── types.ts
```

Responsibilities:

- `content.ts`: typed static category content, account data, links, copy, and local visual metadata.
- `hobby-grid.tsx`: the sole owner of `activeCategory`.
- `hobby-card.tsx`: shared card shell, trigger semantics, grid span, Motion layout, and detail visibility.
- Category detail components: category-specific rendering only.
- `account-copy-button.tsx`: clipboard action, fallback state, and accessible success announcement.
- `netease.ts`: server-only upstream fetch, timeout, cache policy, and safe fallback.
- `normalize-recent-track.ts`: converts unknown upstream JSON into the blog's stable public shape.
- NetEase Route Handler: returns only normalized public fields to the browser.

No global state library is needed.

## 9. NetEase Data Flow

The integration is deliberately isolated because it relies on a non-official API:

```text
Music UI
  → SWR request to /api/hobby/netease
  → server-only Route Handler
  → configured NeteaseCloudMusicApi service
  → normalized recent-track response
```

The reference service is the MIT-licensed [nooblong/NeteaseCloudMusicApiBackup](https://github.com/nooblong/NeteaseCloudMusicApiBackup). It is deployed separately from the blog.

Server-only environment variables:

```text
NETEASE_API_BASE_URL
NETEASE_MUSIC_COOKIE
NETEASE_USER_ID=3719820729
```

Security requirements:

- `NETEASE_MUSIC_COOKIE` is never committed, serialized to the client, included in a public error, or printed in logs.
- The browser never calls the upstream service directly.
- The public Route Handler response must not expose the internal API base URL.
- Production secrets are entered through the hosting provider's environment settings, not source files or chat.

The browser-facing response has this stable shape:

```ts
type NeteaseActivityResponse = {
  state: 'recent' | 'older' | 'empty' | 'unavailable';
  track: {
    title: string;
    artists: string[];
    album: string;
    albumArtUrl: string | null;
    songUrl: string;
    playedAt: number | null;
  } | null;
};
```

The Route Handler makes a server-to-server `POST` request to `/record/recent/song` with `limit=1`. The Cookie is sent in an `application/x-www-form-urlencoded` request body rather than a URL. The upstream fetch uses `cache: 'no-store'` and aborts after 5 seconds. The public Route Handler may cache only its normalized, secret-free response for 60 seconds.

SWR refreshes every 60 seconds, sets `refreshWhenHidden: false`, and does not retry unavailable responses aggressively.

Because recent history is not authoritative live playback, the UI uses these labels:

- `playedAt` within the last 15 minutes: `Recently active · 最近活跃`
- An older available record: `Last listened · 最近听过`
- An empty record: `No recent track · 暂无最近记录`
- Missing configuration or any upstream failure: `Unavailable · 暂时无法获取`

The page never labels this data as guaranteed `Online` or `Now Playing`.

## 10. Error Handling

The `/hobby` page and production build must succeed when NetEase configuration is absent or invalid.

Expected failure modes include missing environment variables, expired cookies, timeout, non-2xx responses, malformed JSON, changed upstream fields, empty records, and failed album-art requests.

Fallback behavior:

- The API returns a stable unavailable or empty result instead of throwing an error into the page.
- The Music card continues to show preference tags and the public NetEase profile link.
- Album art falls back to a local image.
- Raw upstream response bodies and credentials are not logged.
- Build-time rendering does not contact the NetEase service.

Clipboard failure leaves the identifier selectable and changes the live status to an explicit copy failure message; it does not hide the account value.

## 11. Testing Strategy

Add Vitest, React Testing Library, jest-dom, and jsdom as development-only dependencies. Feature work follows red-green-refactor cycles.

Automated coverage includes:

1. The homepage renders the `/hobby` link.
2. The Hobby grid renders exactly five categories in the defined order.
3. All cards are initially closed.
4. Opening Games sets only Games to `aria-expanded="true"`.
5. Opening Anime after Games closes Games and opens Anime.
6. Selecting an open card closes it.
7. Disclosure triggers and panels have matching accessible IDs.
8. Steam, Bangumi, and NetEase links use the approved destinations.
9. 小黑盒 ID and BattleTag copy controls expose success and failure states.
10. Valid NetEase upstream data normalizes to the public track type.
11. Missing fields, empty lists, timeout, failed requests, and missing configuration return safe fallback results.
12. The API's public response contains neither cookies nor the configured internal base URL.

Final verification commands:

```bash
npm test
npm run check
npm run build
```

Manual verification covers the 12-column desktop proportions, mobile stacking, light/dark contrast, keyboard-only use, reduced-motion behavior, external-link behavior, lack of horizontal overflow, and a clean fallback when NetEase credentials are not configured.

## 12. Acceptance Criteria

The feature is accepted when:

- `/hobby` is visible beside the four existing homepage route links.
- `/hobby` loads as an independent page that visually belongs to the existing blog.
- Games and Anime are the primary Bento cards; Music, Food, and Travel are equal-width secondary cards.
- All five categories are visible in the initial closed state.
- At most one category is expanded at any time.
- The approved personal content and account identifiers are displayed without private login information.
- Bangumi, Steam, and NetEase external destinations are correct.
- NetEase recent activity works when configured and degrades without breaking the page when unavailable.
- The UI does not claim authoritative online or now-playing status.
- Keyboard controls, ARIA state, focus visibility, and reduced-motion behavior meet the design.
- Automated tests, Biome checks, and the production build pass.
