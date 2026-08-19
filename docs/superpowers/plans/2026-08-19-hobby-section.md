# Hobby Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth homepage `/hobby` entry and a responsive, accessible Bento Hobby page covering Games, Anime, Music, Food, and Travel, including safe recent NetEase Cloud Music activity.

**Architecture:** Keep the route shell server-rendered and isolate interactive disclosure state in one client-side `HobbyGrid`. Store static personal content in typed configuration, render category-specific details through focused components, and place the non-official NetEase integration behind a server-only Route Handler that returns a normalized secret-free response.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, Motion 12, SWR 2, Vitest 4, React Testing Library, jsdom, Biome 2.4.

## Global Constraints

- Work only in `/home/aimall/golden-xzs-blog/.worktrees/feature-hobby-section` on branch `feature/hobby-section`.
- The route must remain exactly `/hobby`; the homepage link label must remain exactly `/hobby`.
- Games and Anime are the primary Bento cards; Music, Food, and Travel are equal-width secondary cards.
- Category headings are English; summaries and detail copy are Chinese; proper names retain their original form.
- All cards start closed, and at most one card may be open at a time.
- Do not install Magic UI, shadcn/ui, Motion Primitives, or another UI framework.
- Do not add Bangumi scraping or Steam, 小黑盒, or Battle.net presence/authentication APIs.
- Never claim authoritative NetEase `Online` or `Now Playing`; use `Recently active`, `Last listened`, `No recent track`, or `Unavailable`.
- Never commit or expose `NETEASE_MUSIC_COOKIE`.
- The page and production build must succeed without any NetEase environment variables.
- Standard Motion transitions last 300 ms; reduced-motion detail fades last 150 ms and omit layout translation/scale.
- Use TDD for every behavior change: failing test, observed failure, minimal implementation, passing test.
- Keep Biome at zero errors and zero warnings and preserve the existing successful production build baseline.

---

## Planned File Map

### Existing files to modify

- `package.json` — add the test script and development-only test dependencies.
- `bun.lock` — lock the test dependencies.
- `app/components/hero/hero.tsx` — delegate the route list to a testable component.
- `app/sitemap.ts` — include `/hobby` in static routes.
- `next.config.ts` — allow HTTPS NetEase album-art hosts.
- `.env.example` — document server-only NetEase variables without values.
- `README.md` — explain the optional Hobby music integration and degradation behavior.

### New feature files

- `vitest.config.ts` — jsdom test configuration and aliases.
- `tests/setup.ts` — jest-dom, cleanup, and browser API defaults.
- `tests/server-only.ts` — harmless Vitest alias for the `server-only` marker package.
- `app/components/hero/hero-routes.tsx` — homepage internal route links.
- `app/components/hero/hero-routes.test.tsx` — homepage route tests.
- `app/sitemap.test.ts` — static sitemap route test.
- `app/hobby/layout.tsx` — shared page container.
- `app/hobby/page.tsx` — metadata, header, intro, and grid.
- `app/hobby/types.ts` — Hobby category and account types.
- `app/hobby/content.ts` — approved personal content and destinations.
- `app/hobby/content.test.ts` — content order and approved-value tests.
- `app/hobby/components/hobby-grid.tsx` — sole owner of open-card state.
- `app/hobby/components/hobby-grid.test.tsx` — disclosure integration tests.
- `app/hobby/components/hobby-card.tsx` — common card shell, ARIA, spans, and Motion.
- `app/hobby/components/category-visual.tsx` — decorative compact-state visuals.
- `app/hobby/components/account-copy-button.tsx` — clipboard interaction and live status.
- `app/hobby/components/account-copy-button.test.tsx` — copy success/failure tests.
- `app/hobby/components/game-details.tsx` — game groups and account cards.
- `app/hobby/components/game-details.test.tsx` — game content and link tests.
- `app/hobby/components/anime-details.tsx` — Bangumi identity and profile link.
- `app/hobby/components/anime-details.test.tsx` — Bangumi link test.
- `app/hobby/components/music-details.tsx` — SWR activity UI and music tags.
- `app/hobby/components/music-details.test.tsx` — valid and unavailable music-state tests.
- `app/hobby/components/food-details.tsx` — explicit first-release placeholder.
- `app/hobby/components/food-details.test.tsx` — no-invented-content placeholder test.
- `app/hobby/components/travel-details.tsx` — approved city cards.
- `app/hobby/components/travel-details.test.tsx` — city-content test.
- `app/components/netease/types.ts` — stable browser response contract.
- `app/components/netease/normalize-recent-track.ts` — unknown JSON normalizer.
- `app/components/netease/normalize-recent-track.test.ts` — state and malformed-data tests.
- `app/components/netease/netease.ts` — server-only upstream request.
- `app/components/netease/netease.test.ts` — configuration, request, timeout, and secrecy tests.
- `app/api/hobby/netease/route.ts` — public normalized Route Handler.
- `app/api/hobby/netease/route.test.ts` — stable fallback and cache-header tests.
- `public/static/hobby/food-placeholder.svg` — local Food image placeholder.
- `public/static/hobby/music-placeholder.svg` — local album-art fallback.

---

### Task 1: Add the test harness and make `/hobby` discoverable

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/server-only.ts`
- Create: `app/components/hero/hero-routes.test.tsx`
- Create: `app/components/hero/hero-routes.tsx`
- Modify: `app/components/hero/hero.tsx:1-70`
- Create: `app/sitemap.test.ts`
- Modify: `app/sitemap.ts:1-18`

**Interfaces:**
- Produces: `HeroRoutes(): JSX.Element`
- Produces: `staticRoutes: readonly string[]`
- Produces: `npm test` as `vitest run`
- Consumes: existing Next.js `Link`, `Hero`, and sitemap patterns.

- [ ] **Step 1: Add the exact test dependencies and lock them with Bun**

Run:

```bash
cd /home/aimall/golden-xzs-blog/.worktrees/feature-hobby-section
npx --yes bun@1.3.14 add --dev \
  vitest@4.1.11 \
  @testing-library/react@16.3.2 \
  @testing-library/jest-dom@7.0.1 \
  jsdom@30.0.1 \
  --ignore-scripts
```

Add this script to `package.json`:

```json
"test": "vitest run"
```

Expected: `package.json` and `bun.lock` contain the four development-only dependencies, and no `package-lock.json` is created.

- [ ] **Step 2: Create the Vitest configuration and setup**

Create `vitest.config.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			app: path.resolve(rootDir, 'app'),
			'server-only': path.resolve(rootDir, 'tests/server-only.ts'),
		},
	},
	test: {
		clearMocks: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
	},
});
```

Create `tests/server-only.ts`:

```ts
export {};
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
		writable: true,
	});
}
```

- [ ] **Step 3: Write failing homepage and sitemap tests**

Create `app/components/hero/hero-routes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroRoutes from './hero-routes';

describe('HeroRoutes', () => {
	it('renders the five internal route links in order', () => {
		render(<HeroRoutes />);

		const links = screen.getAllByRole('link');
		expect(links.map((link) => link.textContent)).toEqual([
			'/projects',
			'/thoughts',
			'/uses',
			'/stats',
			'/hobby',
		]);
		expect(links.at(-1)).toHaveAttribute('href', '/hobby');
	});
});
```

Create `app/sitemap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { staticRoutes } from './sitemap';

describe('staticRoutes', () => {
	it('includes the hobby route', () => {
		expect(staticRoutes).toContain('hobby');
	});
});
```

- [ ] **Step 4: Run the tests and observe the expected failures**

Run:

```bash
npm test -- app/components/hero/hero-routes.test.tsx app/sitemap.test.ts
```

Expected: FAIL because `hero-routes.tsx` and the `staticRoutes` export do not yet exist.

- [ ] **Step 5: Implement the homepage route component**

Create `app/components/hero/hero-routes.tsx`:

```tsx
import Link from 'next/link';

const routes = ['/projects', '/thoughts', '/uses', '/stats', '/hobby'] as const;

export default function HeroRoutes() {
	return (
		<div
			className='flex flex-wrap space-x-3 space-y-1'
			data-skip-splash-cursor
		>
			{routes.map((route) => (
				<Link key={route} href={route}>
					{route}
				</Link>
			))}
		</div>
	);
}
```

Modify `app/components/hero/hero.tsx` to import `HeroRoutes` and replace only the existing route-list `<div>` with:

```tsx
<HeroRoutes />
```

Do not change the surrounding social links or divider.

- [ ] **Step 6: Export and use the sitemap route list**

Change `app/sitemap.ts` to:

```ts
import { getPosts } from './thoughts/utils';

export const baseUrl = 'https://golden-xzs-blog.vercel.app';
export const staticRoutes = [
	'',
	'thoughts',
	'projects',
	'stats',
	'uses',
	'hobby',
] as const;

export default async function sitemap() {
	const blogs = getPosts().map((post) => ({
		url: `${baseUrl}/thoughts/${post.slug}`,
		lastModified: post.metadata.publishedAt,
	}));

	const routes = staticRoutes.map((route) => ({
		url: route === '' ? `${baseUrl}/` : `${baseUrl}/${route}`,
		lastModified: new Date().toISOString().split('T')[0],
	}));

	return [...routes, ...blogs];
}
```

- [ ] **Step 7: Run focused tests and Biome**

Run:

```bash
npm test -- app/components/hero/hero-routes.test.tsx app/sitemap.test.ts
npm run check
```

Expected: both tests PASS; Biome reports zero errors and zero warnings.

- [ ] **Step 8: Commit the test harness and discoverability changes**

```bash
git add package.json bun.lock vitest.config.ts tests \
  app/components/hero/hero-routes.tsx \
  app/components/hero/hero-routes.test.tsx \
  app/components/hero/hero.tsx app/sitemap.ts app/sitemap.test.ts
git commit -m "test: add hobby feature harness"
```

---

### Task 2: Add typed Hobby content and the route shell

**Files:**
- Create: `app/hobby/types.ts`
- Create: `app/hobby/content.ts`
- Create: `app/hobby/content.test.ts`
- Create: `app/hobby/layout.tsx`
- Create: `app/hobby/page.tsx`
- Create: `app/hobby/components/hobby-grid.tsx`
- Create: `app/hobby/components/hobby-grid.test.tsx`

**Interfaces:**
- Produces: `HobbyId`, `HobbyCategory`, `GameGroup`, and `GameAccount` types.
- Produces: `hobbyCategories`, `gameGroups`, `gameAccounts`, `animeProfile`, `musicProfile`, `musicGenres`, `foodContent`, and `travelCities` constants.
- Produces: an initially static `HobbyGrid()` that Task 3 upgrades to disclosure behavior.
- Consumes: shared `Header` and `PageContainer`.

- [ ] **Step 1: Write failing content and route-grid tests**

Create `app/hobby/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	animeProfile,
	gameAccounts,
	hobbyCategories,
	musicProfile,
	travelCities,
} from './content';

describe('hobby content', () => {
	it('keeps the approved category order and desktop proportions', () => {
		expect(hobbyCategories.map(({ id }) => id)).toEqual([
			'games',
			'anime',
			'music',
			'food',
			'travel',
		]);
		expect(hobbyCategories.map(({ compactSpan }) => compactSpan)).toEqual([
			'md:col-span-7',
			'md:col-span-5',
			'md:col-span-4',
			'md:col-span-4',
			'md:col-span-4',
		]);
	});

	it('stores the approved public destinations and identifiers', () => {
		expect(animeProfile.url).toBe('https://bangumi.tv/user/1022640');
		expect(musicProfile.url).toBe(
			'https://y.music.163.com/m/user?id=3719820729',
		);
		expect(gameAccounts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ platform: '小黑盒', value: '29362113' }),
				expect.objectContaining({
					platform: 'Battle.net',
					value: '小朱诺诺的#5394',
				}),
			]),
		);
		expect(travelCities).toEqual(['杭州', '佛山', '深圳', '中山']);
	});
});
```

Create the first version of `app/hobby/components/hobby-grid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HobbyGrid from './hobby-grid';

describe('HobbyGrid content', () => {
	it('renders all five category headings', () => {
		render(<HobbyGrid />);

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
		}
	});
});
```

- [ ] **Step 2: Run the tests and verify that they fail**

Run:

```bash
npm test -- app/hobby/content.test.ts app/hobby/components/hobby-grid.test.tsx
```

Expected: FAIL because the Hobby files do not exist.

- [ ] **Step 3: Define the Hobby types**

Create `app/hobby/types.ts`:

```ts
export type HobbyId = 'games' | 'anime' | 'music' | 'food' | 'travel';

export type HobbyCategory = {
	id: HobbyId;
	index: string;
	title: string;
	summary: string;
	compactSpan: string;
};

export type GameGroup = {
	label: 'Competitive' | 'Hunting' | 'Co-op Nights';
	games: string[];
};

export type GameAccount =
	| {
			kind: 'link';
			platform: 'Steam';
			value: string;
			url: string;
	  }
	| {
			kind: 'copy';
			platform: '小黑盒' | 'Battle.net';
			value: string;
	  };
```

- [ ] **Step 4: Add the approved typed content**

Create `app/hobby/content.ts`:

```ts
import type {
	GameAccount,
	GameGroup,
	HobbyCategory,
} from './types';

export const hobbyCategories: HobbyCategory[] = [
	{
		id: 'games',
		index: '01',
		title: 'Games',
		summary: '竞技、狩猎，以及和朋友一起制造混乱的联机夜晚。',
		compactSpan: 'md:col-span-7',
	},
	{
		id: 'anime',
		index: '02',
		title: 'Anime',
		summary: '我的动画收藏、观看记录与评分都整理在 Bangumi。',
		compactSpan: 'md:col-span-5',
	},
	{
		id: 'music',
		index: '03',
		title: 'Music',
		summary: '从日语与 ACG，到流行、说唱、粤语和民谣。',
		compactSpan: 'md:col-span-4',
	},
	{
		id: 'food',
		index: '04',
		title: 'Food',
		summary: '用照片和文字保留值得再吃一次的味道。',
		compactSpan: 'md:col-span-4',
	},
	{
		id: 'travel',
		index: '05',
		title: 'Travel',
		summary: '走过杭州、佛山、深圳和中山，也继续寻找下一站。',
		compactSpan: 'md:col-span-4',
	},
];

export const gameGroups: GameGroup[] = [
	{ label: 'Competitive', games: ['守望先锋'] },
	{ label: 'Hunting', games: ['怪物猎人'] },
	{
		label: 'Co-op Nights',
		games: ['R.E.P.O.', 'PEAK', '胡闹厨房', '链在一起', '机械狂欢'],
	},
];

export const gameAccounts: GameAccount[] = [
	{
		kind: 'link',
		platform: 'Steam',
		value: '76561198985102331',
		url: 'https://steamcommunity.com/profiles/76561198985102331/',
	},
	{ kind: 'copy', platform: '小黑盒', value: '29362113' },
	{ kind: 'copy', platform: 'Battle.net', value: '小朱诺诺的#5394' },
];

export const animeProfile = {
	userId: '1022640',
	url: 'https://bangumi.tv/user/1022640',
} as const;

export const musicProfile = {
	userId: '3719820729',
	url: 'https://y.music.163.com/m/user?id=3719820729',
} as const;

export const musicGenres = ['日语', 'ACG', '流行', '说唱', '粤语', '民谣'];

export const foodContent = {
	label: 'Coming soon',
	description: '这里会慢慢收集喜欢的食物、照片，以及它们背后的片段。',
} as const;

export const travelCities = ['杭州', '佛山', '深圳', '中山'];
```

- [ ] **Step 5: Create the route shell and initial static grid**

Create `app/hobby/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import PageContainer from '../components/layouts/page-container';

export default function HobbyLayout({ children }: { children: ReactNode }) {
	return <PageContainer>{children}</PageContainer>;
}
```

Create the initial `app/hobby/components/hobby-grid.tsx`:

```tsx
import { hobbyCategories } from '../content';

export default function HobbyGrid() {
	return (
		<section
			aria-label='兴趣分类'
			className='grid grid-cols-1 gap-4 md:grid-cols-12'
		>
			{hobbyCategories.map((category) => (
				<article
					key={category.id}
					className={`${category.compactSpan} rounded-2xl border border-gray-200 p-6 dark:border-gray-700`}
				>
					<p className='text-xs text-primary-500'>{category.index}</p>
					<h2 className='mt-2 text-2xl font-semibold'>{category.title}</h2>
					<p className='mt-3 text-gray-600 dark:text-gray-300'>
						{category.summary}
					</p>
				</article>
			))}
		</section>
	);
}
```

Create `app/hobby/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Header from '../components/header';
import HobbyGrid from './components/hobby-grid';

export const metadata: Metadata = {
	title: 'Hobby',
	description: 'Golden 的游戏、动漫、音乐、美食与旅行兴趣。',
};

export default function HobbyPage() {
	return (
		<>
			<Header title='Hobby' />
			<p className='mb-4 text-lg leading-7 text-gray-500 dark:text-gray-400'>
				工作和学习之外，这里收集了一些让我持续保持好奇与快乐的事。
			</p>
			<HobbyGrid />
		</>
	);
}
```

- [ ] **Step 6: Run focused tests, then build the new route**

Run:

```bash
npm test -- app/hobby/content.test.ts app/hobby/components/hobby-grid.test.tsx
npm run check
npm run build
```

Expected: tests PASS; `/hobby` is included in the build output; missing Spotify or NetEase credentials do not fail the build.

- [ ] **Step 7: Commit the typed content and page shell**

```bash
git add app/hobby
git commit -m "feat: add hobby page content shell"
```

---

### Task 3: Implement the accessible single-open Bento disclosure

**Files:**
- Modify: `app/hobby/components/hobby-grid.test.tsx`
- Modify: `app/hobby/components/hobby-grid.tsx`
- Create: `app/hobby/components/hobby-card.tsx`

**Interfaces:**
- Produces: `HobbyCard({ category, isOpen, onToggle, children })`.
- Preserves: `HobbyGrid()` with no public props.
- Consumes: `HobbyCategory`, `motion/react`, and the typed category content.

- [ ] **Step 1: Extend the grid test with the approved disclosure behavior**

Replace `app/hobby/components/hobby-grid.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HobbyGrid from './hobby-grid';

const trigger = (name: string) =>
	screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('HobbyGrid', () => {
	it('renders five closed categories initially', () => {
		render(<HobbyGrid />);

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
			expect(trigger(title)).toHaveAttribute('aria-expanded', 'false');
		}
	});

	it('keeps only one category open at a time', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('region', { name: /Games/ })).toBeInTheDocument();

		fireEvent.click(trigger('Anime'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
		expect(trigger('Anime')).toHaveAttribute('aria-expanded', 'true');
		expect(
			screen
				.getAllByRole('button')
				.filter((button) => button.getAttribute('aria-expanded') === 'true'),
		).toHaveLength(1);
	});

	it('closes a category when its open trigger is selected again', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		fireEvent.click(trigger('Games'));

		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
	});

	it('matches trigger and panel identifiers', () => {
		render(<HobbyGrid />);
		const gamesTrigger = trigger('Games');

		fireEvent.click(gamesTrigger);
		const panel = screen.getByRole('region', { name: /Games/ });

		expect(gamesTrigger).toHaveAttribute('aria-controls', panel.id);
		expect(panel).toHaveAttribute('aria-labelledby', gamesTrigger.id);
	});
});
```

- [ ] **Step 2: Run the disclosure test and observe failure**

Run:

```bash
npm test -- app/hobby/components/hobby-grid.test.tsx
```

Expected: FAIL because the static cards have no buttons, ARIA state, or panels.

- [ ] **Step 3: Implement the reusable Hobby card**

Create `app/hobby/components/hobby-card.tsx`:

```tsx
'use client';

import classNames from 'classnames';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { HobbyCategory } from '../types';

type HobbyCardProps = {
	category: HobbyCategory;
	isOpen: boolean;
	onToggle: () => void;
	children: ReactNode;
};

export default function HobbyCard({
	category,
	isOpen,
	onToggle,
	children,
}: HobbyCardProps) {
	const prefersReducedMotion = useReducedMotion();
	const triggerId = `hobby-${category.id}-trigger`;
	const panelId = `hobby-${category.id}-panel`;
	const duration = prefersReducedMotion ? 0.15 : 0.3;

	return (
		<motion.article
			layout={!prefersReducedMotion}
			transition={{ duration, ease: 'easeOut' }}
			className={classNames(
				'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950',
				isOpen ? 'md:col-span-12' : category.compactSpan,
			)}
		>
			<button
				id={triggerId}
				type='button'
				aria-label={`${category.title} 分类`}
				aria-controls={panelId}
				aria-expanded={isOpen}
				onClick={onToggle}
				className='flex w-full items-start justify-between gap-6 p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset md:p-8'
			>
				<span className='min-w-0'>
					<span className='text-xs font-semibold tracking-[0.2em] text-primary-500'>
						{category.index}
					</span>
					<span
						role='heading'
						aria-level={2}
						className='mt-2 block text-2xl font-semibold md:text-3xl'
					>
						{category.title}
					</span>
					<span className='mt-3 block text-sm leading-6 text-gray-600 dark:text-gray-300 md:text-base'>
						{category.summary}
					</span>
				</span>
				<motion.span
					aria-hidden='true'
					animate={{ rotate: isOpen ? 45 : 0 }}
					transition={{ duration }}
					className='mt-1 text-2xl text-primary-500'
				>
					+
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						id={panelId}
						role='region'
						aria-labelledby={triggerId}
						initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
						transition={{ duration }}
						className='border-t border-gray-200 px-6 py-6 dark:border-gray-700 md:px-8 md:py-8'
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
}
```

- [ ] **Step 4: Upgrade the grid to own exactly one open ID**

Replace `app/hobby/components/hobby-grid.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { hobbyCategories } from '../content';
import type { HobbyId } from '../types';
import HobbyCard from './hobby-card';

export default function HobbyGrid() {
	const [activeCategory, setActiveCategory] = useState<HobbyId | null>(null);

	return (
		<section
			aria-label='兴趣分类'
			className='grid grid-cols-1 gap-4 md:grid-cols-12'
		>
			{hobbyCategories.map((category) => {
				const isOpen = activeCategory === category.id;

				return (
					<HobbyCard
						key={category.id}
						category={category}
						isOpen={isOpen}
						onToggle={() =>
							setActiveCategory((current) =>
								current === category.id ? null : category.id,
							)
						}
					>
						<p className='leading-7 text-gray-600 dark:text-gray-300'>
							{category.summary}
						</p>
					</HobbyCard>
				);
			})}
		</section>
	);
}
```

- [ ] **Step 5: Run interaction tests and checks**

Run:

```bash
npm test -- app/hobby/components/hobby-grid.test.tsx
npm run check
```

Expected: all four interaction tests PASS; Biome reports zero errors and zero warnings.

- [ ] **Step 6: Commit the disclosure shell**

```bash
git add app/hobby/components/hobby-card.tsx \
  app/hobby/components/hobby-grid.tsx \
  app/hobby/components/hobby-grid.test.tsx
git commit -m "feat: add accessible hobby disclosure grid"
```

---

### Task 4: Add Games, Anime, and safe account-copy interactions

**Files:**
- Create: `app/hobby/components/account-copy-button.test.tsx`
- Create: `app/hobby/components/account-copy-button.tsx`
- Create: `app/hobby/components/game-details.test.tsx`
- Create: `app/hobby/components/game-details.tsx`
- Create: `app/hobby/components/anime-details.test.tsx`
- Create: `app/hobby/components/anime-details.tsx`
- Modify: `app/hobby/components/hobby-grid.tsx`
- Modify: `app/hobby/components/hobby-grid.test.tsx`

**Interfaces:**
- Produces: `AccountCopyButton({ label, value })`.
- Produces: `GameDetails()` and `AnimeDetails()`.
- Consumes: `gameGroups`, `gameAccounts`, and `animeProfile` from `content.ts`.

- [ ] **Step 1: Write failing copy, Games, and Anime tests**

Create `app/hobby/components/account-copy-button.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountCopyButton from './account-copy-button';

const setClipboard = (writeText: ReturnType<typeof vi.fn>) => {
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText },
	});
};

describe('AccountCopyButton', () => {
	beforeEach(() => {
		setClipboard(vi.fn().mockResolvedValue(undefined));
	});

	it('copies the public identifier and announces success', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		setClipboard(writeText);
		render(<AccountCopyButton label='Battle.net' value='小朱诺诺的#5394' />);

		fireEvent.click(screen.getByRole('button', { name: '复制 Battle.net' }));

		await waitFor(() =>
			expect(writeText).toHaveBeenCalledWith('小朱诺诺的#5394'),
		);
		expect(screen.getByRole('status')).toHaveTextContent('Copied');
	});

	it('keeps the value visible and announces copy failure', async () => {
		setClipboard(vi.fn().mockRejectedValue(new Error('denied')));
		render(<AccountCopyButton label='小黑盒' value='29362113' />);

		fireEvent.click(screen.getByRole('button', { name: '复制 小黑盒' }));

		await waitFor(() =>
			expect(screen.getByRole('status')).toHaveTextContent('Copy failed'),
		);
		expect(screen.getByText('29362113')).toBeInTheDocument();
	});
});
```

Create `app/hobby/components/game-details.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameDetails from './game-details';

describe('GameDetails', () => {
	it('renders the approved games and account destinations', () => {
		render(<GameDetails />);

		for (const game of [
			'守望先锋',
			'怪物猎人',
			'R.E.P.O.',
			'PEAK',
			'胡闹厨房',
			'链在一起',
			'机械狂欢',
		]) {
			expect(screen.getByText(game)).toBeInTheDocument();
		}

		expect(screen.getByRole('link', { name: /Steam/ })).toHaveAttribute(
			'href',
			'https://steamcommunity.com/profiles/76561198985102331/',
		);
	});
});
```

Create `app/hobby/components/anime-details.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnimeDetails from './anime-details';

describe('AnimeDetails', () => {
	it('links to the approved Bangumi profile', () => {
		render(<AnimeDetails />);

		expect(screen.getByText('1022640')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /查看我的 Bangumi/ })).toHaveAttribute(
			'href',
			'https://bangumi.tv/user/1022640',
		);
	});
});
```

- [ ] **Step 2: Run the new tests and observe module-not-found failures**

Run:

```bash
npm test -- \
  app/hobby/components/account-copy-button.test.tsx \
  app/hobby/components/game-details.test.tsx \
  app/hobby/components/anime-details.test.tsx
```

Expected: FAIL because the three components do not exist.

- [ ] **Step 3: Implement the clipboard control**

Create `app/hobby/components/account-copy-button.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'failed';

type AccountCopyButtonProps = {
	label: string;
	value: string;
};

export default function AccountCopyButton({
	label,
	value,
}: AccountCopyButtonProps) {
	const [status, setStatus] = useState<CopyStatus>('idle');

	useEffect(() => {
		if (status === 'idle') {
			return;
		}

		const timeout = window.setTimeout(() => setStatus('idle'), 2000);
		return () => window.clearTimeout(timeout);
	}, [status]);

	const copy = async () => {
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error('Clipboard unavailable');
			}
			await navigator.clipboard.writeText(value);
			setStatus('copied');
		} catch {
			setStatus('failed');
		}
	};

	return (
		<div className='rounded-xl border border-gray-200 p-4 dark:border-gray-700'>
			<p className='text-sm font-semibold'>{label}</p>
			<p className='mt-1 break-all text-sm text-gray-600 dark:text-gray-300'>
				{value}
			</p>
			<button
				type='button'
				onClick={copy}
				aria-label={`复制 ${label}`}
				className='mt-3 rounded-full border border-primary-500 px-3 py-1 text-xs text-primary-500 outline-none hover:bg-primary-500 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black'
			>
				复制
			</button>
			<span role='status' aria-live='polite' className='ml-3 text-xs'>
				{status === 'copied' && 'Copied'}
				{status === 'failed' && 'Copy failed'}
			</span>
		</div>
	);
}
```

- [ ] **Step 4: Implement Games and Anime details**

Create `app/hobby/components/game-details.tsx`:

```tsx
import { gameAccounts, gameGroups } from '../content';
import AccountCopyButton from './account-copy-button';

export default function GameDetails() {
	return (
		<div className='space-y-8'>
			<div className='grid gap-4 md:grid-cols-3'>
				{gameGroups.map((group) => (
					<section key={group.label}>
						<h3 className='text-sm font-semibold text-primary-500'>
							{group.label}
						</h3>
						<ul className='mt-3 flex flex-wrap gap-2'>
							{group.games.map((game) => (
								<li
									key={game}
									className='rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800'
								>
									{game}
								</li>
							))}
						</ul>
					</section>
				))}
			</div>

			<section>
				<h3 className='text-lg font-semibold'>Game Accounts</h3>
				<div className='mt-4 grid gap-3 md:grid-cols-3'>
					{gameAccounts.map((account) =>
						account.kind === 'link' ? (
							<a
								key={account.platform}
								href={account.url}
								target='_blank'
								rel='noopener noreferrer'
								className='rounded-xl border border-gray-200 p-4 outline-none hover:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700'
							>
								<span className='font-semibold'>{account.platform}</span>
								<span className='mt-1 block break-all text-sm text-gray-600 dark:text-gray-300'>
									{account.value} ↗
								</span>
							</a>
						) : (
							<AccountCopyButton
								key={account.platform}
								label={account.platform}
								value={account.value}
							/>
						),
					)}
				</div>
			</section>
		</div>
	);
}
```

Create `app/hobby/components/anime-details.tsx`:

```tsx
import { animeProfile } from '../content';

export default function AnimeDetails() {
	return (
		<div className='grid gap-6 md:grid-cols-[1fr_auto] md:items-end'>
			<div>
				<p className='max-w-2xl leading-7 text-gray-600 dark:text-gray-300'>
					动画收藏、评分和观看进度都放在 Bangumi；这里保留一个直接入口。
				</p>
				<p className='mt-4 text-sm'>
					Bangumi User ID：<strong>{animeProfile.userId}</strong>
				</p>
			</div>
			<a
				href={animeProfile.url}
				target='_blank'
				rel='noopener noreferrer'
				className='rounded-full bg-primary-500 px-5 py-2 text-center text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black'
			>
				查看我的 Bangumi ↗
			</a>
		</div>
	);
}
```

- [ ] **Step 5: Render the new details from `HobbyGrid`**

Add these imports to `hobby-grid.tsx`:

```ts
import AnimeDetails from './anime-details';
import GameDetails from './game-details';
```

Add this local function above `HobbyGrid`:

```tsx
function renderDetails(id: HobbyId, summary: string) {
	if (id === 'games') {
		return <GameDetails />;
	}
	if (id === 'anime') {
		return <AnimeDetails />;
	}
	return <p className='leading-7 text-gray-600 dark:text-gray-300'>{summary}</p>;
}
```

Replace the generic child paragraph with:

```tsx
{renderDetails(category.id, category.summary)}
```

Extend `hobby-grid.test.tsx` with one integration assertion:

```tsx
it('shows the Games account section only after Games opens', () => {
	render(<HobbyGrid />);
	expect(screen.queryByText('Game Accounts')).not.toBeInTheDocument();

	fireEvent.click(trigger('Games'));

	expect(screen.getByText('Game Accounts')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the focused and grid test suites**

Run:

```bash
npm test -- \
  app/hobby/components/account-copy-button.test.tsx \
  app/hobby/components/game-details.test.tsx \
  app/hobby/components/anime-details.test.tsx \
  app/hobby/components/hobby-grid.test.tsx
npm run check
```

Expected: all tests PASS; external links use approved URLs; Biome is clean.

- [ ] **Step 7: Commit Games and Anime details**

```bash
git add app/hobby/components
git commit -m "feat: add game and anime hobby details"
```

---

### Task 5: Add category visuals, Food, and Travel

**Files:**
- Create: `app/hobby/components/category-visual.tsx`
- Modify: `app/hobby/components/hobby-card.tsx`
- Create: `app/hobby/components/food-details.test.tsx`
- Create: `app/hobby/components/food-details.tsx`
- Create: `app/hobby/components/travel-details.test.tsx`
- Create: `app/hobby/components/travel-details.tsx`
- Create: `public/static/hobby/food-placeholder.svg`
- Create: `public/static/hobby/music-placeholder.svg`
- Modify: `app/hobby/components/hobby-grid.tsx`

**Interfaces:**
- Produces: `CategoryVisual({ id })`, `FoodDetails()`, and `TravelDetails()`.
- Produces: `/static/hobby/food-placeholder.svg` and `/static/hobby/music-placeholder.svg`.
- Consumes: `foodContent`, `travelCities`, and `HobbyId`.

- [ ] **Step 1: Write failing Food and Travel tests**

Create `app/hobby/components/food-details.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FoodDetails from './food-details';

describe('FoodDetails', () => {
	it('shows an explicit placeholder without invented restaurants', () => {
		render(<FoodDetails />);

		expect(screen.getByText('Coming soon')).toBeInTheDocument();
		expect(screen.getByAltText('等待补充的美食照片占位图')).toBeInTheDocument();
	});
});
```

Create `app/hobby/components/travel-details.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TravelDetails from './travel-details';

describe('TravelDetails', () => {
	it('renders only the four approved cities', () => {
		render(<TravelDetails />);

		for (const city of ['杭州', '佛山', '深圳', '中山']) {
			expect(screen.getByRole('heading', { name: city })).toBeInTheDocument();
		}
	});
});
```

- [ ] **Step 2: Run the new tests and observe failure**

Run:

```bash
npm test -- \
  app/hobby/components/food-details.test.tsx \
  app/hobby/components/travel-details.test.tsx
```

Expected: FAIL because the detail components do not exist.

- [ ] **Step 3: Add the local fallback SVG files**

Create `public/static/hobby/food-placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-labelledby="title description">
  <title id="title">Food photo placeholder</title>
  <desc id="description">Abstract plate and cutlery shapes in muted pink and gray.</desc>
  <rect width="960" height="540" fill="#111827"/>
  <circle cx="480" cy="270" r="150" fill="#1f2937" stroke="#de1d8d" stroke-width="12"/>
  <circle cx="480" cy="270" r="92" fill="#374151"/>
  <rect x="230" y="130" width="18" height="280" rx="9" fill="#9ca3af"/>
  <rect x="710" y="130" width="18" height="280" rx="9" fill="#9ca3af"/>
  <path d="M690 130v86c0 34 58 34 58 0v-86" fill="none" stroke="#9ca3af" stroke-width="12"/>
</svg>
```

Create `public/static/hobby/music-placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title description">
  <title id="title">Album art placeholder</title>
  <desc id="description">Abstract record shape with a pink center.</desc>
  <rect width="512" height="512" fill="#111827"/>
  <circle cx="256" cy="256" r="170" fill="#1f2937" stroke="#4b5563" stroke-width="18"/>
  <circle cx="256" cy="256" r="68" fill="#de1d8d"/>
  <circle cx="256" cy="256" r="14" fill="#111827"/>
</svg>
```

- [ ] **Step 4: Implement Food and Travel details**

Create `app/hobby/components/food-details.tsx`:

```tsx
import Image from 'next/image';
import { foodContent } from '../content';

export default function FoodDetails() {
	return (
		<div className='grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center'>
			<Image
				src='/static/hobby/food-placeholder.svg'
				width={960}
				height={540}
				alt='等待补充的美食照片占位图'
				className='aspect-video w-full rounded-xl object-cover'
			/>
			<div>
				<p className='text-sm font-semibold text-primary-500'>
					{foodContent.label}
				</p>
				<p className='mt-3 leading-7 text-gray-600 dark:text-gray-300'>
					{foodContent.description}
				</p>
			</div>
		</div>
	);
}
```

Create `app/hobby/components/travel-details.tsx`:

```tsx
import { travelCities } from '../content';

export default function TravelDetails() {
	return (
		<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
			{travelCities.map((city, index) => (
				<article
					key={city}
					className='relative min-h-40 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900'
				>
					<div aria-hidden='true' className='absolute inset-x-0 bottom-0 flex h-20 items-end gap-1 px-4 opacity-50'>
						{[36, 64, 48, 76, 44].map((height) => (
							<span
								key={height}
								className='flex-1 rounded-t bg-primary-500'
								style={{ height: `${Math.max(20, height - index * 4)}%` }}
							/>
						))}
					</div>
					<p className='text-xs text-primary-500'>{String(index + 1).padStart(2, '0')}</p>
					<h3 className='mt-2 text-xl font-semibold'>{city}</h3>
				</article>
			))}
		</div>
	);
}
```

- [ ] **Step 5: Add compact-state visuals to every card**

Create `app/hobby/components/category-visual.tsx`:

```tsx
import type { HobbyId } from '../types';

export default function CategoryVisual({ id }: { id: HobbyId }) {
	if (id === 'games') {
		return (
			<div aria-hidden='true' className='mt-5 flex gap-2'>
				<span className='rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold dark:bg-gray-800'>CO-OP</span>
				<span className='rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white'>GG</span>
			</div>
		);
	}

	if (id === 'anime') {
		return (
			<div aria-hidden='true' className='mt-5 flex items-center gap-3'>
				<span className='grid h-10 w-10 place-items-center rounded-full bg-primary-500 font-semibold text-white'>BG</span>
				<span className='text-xs text-gray-500 dark:text-gray-400'>1022640</span>
			</div>
		);
	}

	if (id === 'music') {
		return (
			<div aria-hidden='true' className='mt-5 flex h-10 items-end gap-1'>
				{[45, 80, 60, 95, 55].map((height) => (
					<span
						key={height}
						className='w-1.5 rounded-full bg-primary-500'
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
		);
	}

	if (id === 'food') {
		return <p aria-hidden='true' className='mt-5 text-3xl'>◯</p>;
	}

	return (
		<p aria-hidden='true' className='mt-5 text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400'>
			HGH · FS · SZX · ZSN
		</p>
	);
}
```

Import and render `<CategoryVisual id={category.id} />` immediately after the summary inside the Hobby card trigger.

- [ ] **Step 6: Connect Food and Travel details in the grid**

Import `FoodDetails` and `TravelDetails` in `hobby-grid.tsx`, then extend `renderDetails`:

```tsx
if (id === 'food') {
	return <FoodDetails />;
}
if (id === 'travel') {
	return <TravelDetails />;
}
```

Keep Music on the generic summary until Task 8.

- [ ] **Step 7: Run focused tests and Biome**

Run:

```bash
npm test -- \
  app/hobby/components/food-details.test.tsx \
  app/hobby/components/travel-details.test.tsx \
  app/hobby/components/hobby-grid.test.tsx
npm run check
```

Expected: all tests PASS; the SVG files remain local and contain accessible titles; Biome is clean.

- [ ] **Step 8: Commit static category details and visuals**

```bash
git add app/hobby/components public/static/hobby
git commit -m "feat: add hobby category visuals"
```

---

### Task 6: Normalize recent NetEase listening data

**Files:**
- Create: `app/components/netease/types.ts`
- Create: `app/components/netease/normalize-recent-track.test.ts`
- Create: `app/components/netease/normalize-recent-track.ts`

**Interfaces:**
- Produces: `RecentTrack` and `NeteaseActivityResponse`.
- Produces: `normalizeRecentTrack(payload: unknown, now?: number): NeteaseActivityResponse`.
- The activity window is exactly 15 minutes (`900_000` ms).

- [ ] **Step 1: Define the public response contract**

Create `app/components/netease/types.ts`:

```ts
export type RecentTrack = {
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	playedAt: number | null;
};

export type NeteaseActivityResponse = {
	state: 'recent' | 'older' | 'empty' | 'unavailable';
	track: RecentTrack | null;
};

export const unavailableActivity = (): NeteaseActivityResponse => ({
	state: 'unavailable',
	track: null,
});
```

- [ ] **Step 2: Write failing normalizer tests**

Create `app/components/netease/normalize-recent-track.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeRecentTrack } from './normalize-recent-track';

const NOW = 1_800_000_000_000;
const payload = (playTime: number) => ({
	code: 200,
	data: {
		total: 1,
		list: [
			{
				playTime,
				data: {
					id: 12345,
					name: '夜に駆ける',
					ar: [{ name: 'YOASOBI' }],
					al: {
						name: 'THE BOOK',
						picUrl: 'http://p1.music.126.net/example.jpg',
					},
				},
			},
		],
	},
});

describe('normalizeRecentTrack', () => {
	it('marks a play within fifteen minutes as recent', () => {
		expect(normalizeRecentTrack(payload(NOW - 10 * 60_000), NOW)).toEqual({
			state: 'recent',
			track: {
				title: '夜に駆ける',
				artists: ['YOASOBI'],
				album: 'THE BOOK',
				albumArtUrl: 'https://p1.music.126.net/example.jpg',
				songUrl: 'https://music.163.com/song?id=12345',
				playedAt: NOW - 10 * 60_000,
			},
		});
	});

	it('marks an older valid play as older', () => {
		expect(normalizeRecentTrack(payload(NOW - 16 * 60_000), NOW).state).toBe(
			'older',
		);
	});

	it('returns empty for a valid empty list', () => {
		expect(
			normalizeRecentTrack({ code: 200, data: { total: 0, list: [] } }, NOW),
		).toEqual({ state: 'empty', track: null });
	});

	it('returns unavailable for malformed data', () => {
		expect(normalizeRecentTrack({ data: { list: [{}] } }, NOW)).toEqual({
			state: 'unavailable',
			track: null,
		});
	});
});
```

- [ ] **Step 3: Run the tests and observe the missing normalizer failure**

Run:

```bash
npm test -- app/components/netease/normalize-recent-track.test.ts
```

Expected: FAIL because `normalize-recent-track.ts` does not exist.

- [ ] **Step 4: Implement defensive normalization**

Create `app/components/netease/normalize-recent-track.ts`:

```ts
import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

const RECENT_WINDOW_MS = 15 * 60_000;

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: null;

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeImageUrl = (value: unknown): string | null => {
	const raw = text(value);
	if (!raw) {
		return null;
	}

	try {
		const url = new URL(raw);
		if (url.protocol === 'http:') {
			url.protocol = 'https:';
		}
		const isNeteaseImageHost =
			url.hostname === 'music.126.net' ||
			url.hostname.endsWith('.music.126.net');
		return url.protocol === 'https:' && isNeteaseImageHost
			? url.toString()
			: null;
	} catch {
		return null;
	}
};

export function normalizeRecentTrack(
	payload: unknown,
	now = Date.now(),
): NeteaseActivityResponse {
	const root = asRecord(payload);
	const data = asRecord(root?.data);
	const list = data?.list;

	if (!Array.isArray(list)) {
		return unavailableActivity();
	}
	if (list.length === 0) {
		return { state: 'empty', track: null };
	}

	const record = asRecord(list[0]);
	const song = asRecord(record?.data);
	const id = song?.id;
	const title = text(song?.name);

	if ((typeof id !== 'number' && typeof id !== 'string') || !title) {
		return unavailableActivity();
	}

	const artistValues = Array.isArray(song?.ar) ? song.ar : [];
	const artists = artistValues
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	const album = asRecord(song?.al);
	const playedAt =
		typeof record?.playTime === 'number' ? record.playTime : null;
	const elapsed = playedAt === null ? null : now - playedAt;
	const state =
		elapsed !== null && elapsed >= 0 && elapsed <= RECENT_WINDOW_MS
			? 'recent'
			: 'older';

	return {
		state,
		track: {
			title,
			artists: artists.length > 0 ? artists : ['未知歌手'],
			album: text(album?.name) ?? '未知专辑',
			albumArtUrl: normalizeImageUrl(album?.picUrl),
			songUrl: `https://music.163.com/song?id=${encodeURIComponent(String(id))}`,
			playedAt,
		},
	};
}
```

- [ ] **Step 5: Run normalization tests and Biome**

Run:

```bash
npm test -- app/components/netease/normalize-recent-track.test.ts
npm run check
```

Expected: all four normalizer tests PASS; Biome is clean.

- [ ] **Step 6: Commit the stable NetEase data contract**

```bash
git add app/components/netease
git commit -m "feat: normalize netease listening data"
```

---

### Task 7: Add the server-only NetEase adapter and Route Handler

**Files:**
- Create: `app/components/netease/netease.test.ts`
- Create: `app/components/netease/netease.ts`
- Create: `app/api/hobby/netease/route.test.ts`
- Create: `app/api/hobby/netease/route.ts`
- Modify: `.env.example`
- Modify: `README.md:18-31`

**Interfaces:**
- Produces: `fetchNeteaseActivity(options?): Promise<NeteaseActivityResponse>`.
- Produces: `GET(): Promise<NextResponse<NeteaseActivityResponse>>` at `/api/hobby/netease`.
- Consumes: `normalizeRecentTrack` and server environment variables.
- Upstream request: `POST {NETEASE_API_BASE_URL}/record/recent/song`, form body, 5-second timeout, `cache: 'no-store'`.

- [ ] **Step 1: Write failing server-adapter tests**

Create `app/components/netease/netease.test.ts`:

```ts
// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { fetchNeteaseActivity } from './netease';

const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=super-secret',
	NETEASE_USER_ID: '3719820729',
};

describe('fetchNeteaseActivity', () => {
	it('returns unavailable without complete configuration', async () => {
		const fetchImpl = vi.fn();
		const result = await fetchNeteaseActivity({
			env: {},
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toEqual({ state: 'unavailable', track: null });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('posts the secret server-side but returns only normalized public data', async () => {
		const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						list: [
							{
								playTime: 1_800_000_000_000,
								data: {
									id: 7,
									name: 'Track',
									ar: [{ name: 'Artist' }],
									al: { name: 'Album', picUrl: null },
								},
							},
						],
					},
				}),
				{ status: 200 },
			),
		);

		const result = await fetchNeteaseActivity({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now: 1_800_000_000_001,
		});
		const request = fetchImpl.mock.calls[0];
		const body = request[1]?.body as URLSearchParams;

		expect(request[0]).toBe(
			'https://netease.internal.example/record/recent/song',
		);
		expect(request[1]?.method).toBe('POST');
		expect(body.get('cookie')).toBe(env.NETEASE_MUSIC_COOKIE);
		expect(body.get('limit')).toBe('1');
		expect(timeoutSpy).toHaveBeenCalledWith(5000);
		expect(JSON.stringify(result)).not.toContain('super-secret');
		expect(JSON.stringify(result)).not.toContain('netease.internal.example');
		expect(result.state).toBe('recent');
	});

	it('returns unavailable for a failed upstream response', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
		expect(
			await fetchNeteaseActivity({
				env,
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).toEqual({
			state: 'unavailable',
			track: null,
		});
	});
});
```

Create `app/api/hobby/netease/route.test.ts`:

```ts
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/netease/netease', () => ({
	fetchNeteaseActivity: vi.fn(),
}));

import { fetchNeteaseActivity } from 'app/components/netease/netease';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchNeteaseActivity);

describe('GET /api/hobby/netease', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({ state: 'unavailable', track: null });
	});

	it('returns a stable fallback with public cache headers', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			state: 'unavailable',
			track: null,
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=60, stale-while-revalidate=300',
		);
	});
});
```

- [ ] **Step 2: Run the tests and observe missing-module failures**

Run:

```bash
npm test -- \
  app/components/netease/netease.test.ts \
  app/api/hobby/netease/route.test.ts
```

Expected: FAIL because the adapter and route do not exist.

- [ ] **Step 3: Implement the server-only adapter**

Create `app/components/netease/netease.ts`:

```ts
import 'server-only';
import { normalizeRecentTrack } from './normalize-recent-track';
import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

type NeteaseEnv = Partial<
	Record<
		'NETEASE_API_BASE_URL' | 'NETEASE_MUSIC_COOKIE' | 'NETEASE_USER_ID',
		string
	>
>;

type FetchNeteaseOptions = {
	env?: NeteaseEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

export async function fetchNeteaseActivity({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now(),
}: FetchNeteaseOptions = {}): Promise<NeteaseActivityResponse> {
	const baseUrl = env.NETEASE_API_BASE_URL?.replace(/\/+$/, '');
	const cookie = env.NETEASE_MUSIC_COOKIE;
	const userId = env.NETEASE_USER_ID;

	if (!baseUrl || !cookie || !userId) {
		return unavailableActivity();
	}

	try {
		const upstreamUrl = new URL(`${baseUrl}/record/recent/song`);
		if (!['http:', 'https:'].includes(upstreamUrl.protocol)) {
			return unavailableActivity();
		}

		const response = await fetchImpl(upstreamUrl.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				cookie,
				limit: '1',
				timestamp: String(now),
				uid: userId,
			}),
			cache: 'no-store',
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			return unavailableActivity();
		}

		return normalizeRecentTrack(await response.json(), now);
	} catch {
		return unavailableActivity();
	}
}
```

- [ ] **Step 4: Implement the normalized Route Handler**

Create `app/api/hobby/netease/route.ts`:

```ts
import { fetchNeteaseActivity } from 'app/components/netease/netease';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const activity = await fetchNeteaseActivity();

	return NextResponse.json(activity, {
		headers: {
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
		},
	});
}
```

- [ ] **Step 5: Document configuration without adding a secret**

Append to `.env.example`:

```dotenv

# NetEase Cloud Music (optional Hobby recent activity)
NETEASE_API_BASE_URL=
NETEASE_MUSIC_COOKIE=
NETEASE_USER_ID=3719820729
```

Add this paragraph and list to the README environment section after the existing `/stats` variables:

```md
`/hobby` 的“最近在听”功能使用单独部署的 NeteaseCloudMusicApi 服务。未配置时 Music 卡片仍会展示音乐偏好和网易云主页入口：

- `NETEASE_API_BASE_URL` — 自建 NeteaseCloudMusicApi 服务地址
- `NETEASE_MUSIC_COOKIE` — 仅服务端保存的网易云 Cookie，禁止提交到仓库
- `NETEASE_USER_ID` — 网易云用户 ID，当前为 `3719820729`
```

- [ ] **Step 6: Run adapter, route, and security checks**

Run:

```bash
npm test -- \
  app/components/netease/netease.test.ts \
  app/api/hobby/netease/route.test.ts
npm run check
grep -R "MUSIC_U=super-secret" -n . \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude='*.test.ts' --exclude='*.test.tsx' || true
```

Expected: tests PASS; Biome is clean; the final grep prints nothing outside test fixtures.

- [ ] **Step 7: Commit the server integration**

```bash
git add app/components/netease app/api/hobby/netease .env.example README.md
git commit -m "feat: add safe netease activity endpoint"
```

---

### Task 8: Render recent NetEase activity in the Music card

**Files:**
- Create: `app/hobby/components/music-details.test.tsx`
- Create: `app/hobby/components/music-details.tsx`
- Modify: `app/hobby/components/hobby-grid.tsx`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `MusicDetails()`.
- Consumes: `/api/hobby/netease`, `NeteaseActivityResponse`, `musicGenres`, and `musicProfile`.
- Client refresh: 60 seconds, hidden refresh disabled, error retry disabled.

- [ ] **Step 1: Write failing Music UI tests**

Create `app/hobby/components/music-details.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicDetails from './music-details';

const renderMusic = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MusicDetails />
		</SWRConfig>,
	);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('MusicDetails', () => {
	it('renders normalized recent activity and the profile link', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: null,
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
					{ status: 200 },
				),
			),
		);

		renderMusic();

		await waitFor(() => expect(screen.getByText('夜に駆ける')).toBeInTheDocument());
		expect(screen.getByText('Recently active · 最近活跃')).toBeInTheDocument();
		expect(screen.getByText(/记录时间：/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /网易云主页/ })).toHaveAttribute(
			'href',
			'https://y.music.163.com/m/user?id=3719820729',
		);
	});

	it('keeps genres and the profile link when activity is unavailable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({ state: 'unavailable', track: null }),
					{ status: 200 },
				),
			),
		);

		renderMusic();

		await waitFor(() =>
			expect(screen.getByText('Unavailable · 暂时无法获取')).toBeInTheDocument(),
		);
		for (const genre of ['日语', 'ACG', '流行', '说唱', '粤语', '民谣']) {
			expect(screen.getByText(genre)).toBeInTheDocument();
		}
	});
});
```

- [ ] **Step 2: Run the Music tests and observe the missing-component failure**

Run:

```bash
npm test -- app/hobby/components/music-details.test.tsx
```

Expected: FAIL because `music-details.tsx` does not exist.

- [ ] **Step 3: Implement the SWR Music detail component**

Create `app/hobby/components/music-details.tsx`:

```tsx
'use client';

import type { NeteaseActivityResponse } from 'app/components/netease/types';
import Image from 'next/image';
import useSWR from 'swr';
import { musicGenres, musicProfile } from '../content';

const unavailable: NeteaseActivityResponse = {
	state: 'unavailable',
	track: null,
};

const labels: Record<NeteaseActivityResponse['state'], string> = {
	recent: 'Recently active · 最近活跃',
	older: 'Last listened · 最近听过',
	empty: 'No recent track · 暂无最近记录',
	unavailable: 'Unavailable · 暂时无法获取',
};

const fetcher = async (url: string): Promise<NeteaseActivityResponse> => {
	try {
		const response = await fetch(url);
		return response.ok ? response.json() : unavailable;
	} catch {
		return unavailable;
	}
};

const formatPlayedAt = (playedAt: number | null): string | null =>
	playedAt === null
		? null
		: new Intl.DateTimeFormat('zh-CN', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}).format(new Date(playedAt));

export default function MusicDetails() {
	const { data = unavailable } = useSWR('/api/hobby/netease', fetcher, {
		refreshInterval: 60_000,
		refreshWhenHidden: false,
		shouldRetryOnError: false,
	});
	const { track } = data;
	const playedAt = formatPlayedAt(track?.playedAt ?? null);

	return (
		<div className='grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center'>
			<Image
				src={track?.albumArtUrl ?? '/static/hobby/music-placeholder.svg'}
				width={180}
				height={180}
				alt={track ? `${track.title} 的专辑封面` : '网易云专辑封面占位图'}
				className='aspect-square w-36 rounded-xl object-cover md:w-44'
			/>
			<div className='min-w-0'>
				<p className='text-sm font-semibold text-primary-500'>{labels[data.state]}</p>
				{track && (
					<>
						<a
							href={track.songUrl}
							target='_blank'
							rel='noopener noreferrer'
							className='mt-2 block truncate text-xl font-semibold outline-none hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
						>
							{track.title}
						</a>
						<p className='mt-1 truncate text-sm text-gray-600 dark:text-gray-300'>
							{track.artists.join(', ')} · {track.album}
						</p>
						{playedAt && (
							<p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
								记录时间：{playedAt}
							</p>
						)}
					</>
				)}
				<ul className='mt-4 flex flex-wrap gap-2' aria-label='音乐偏好'>
					{musicGenres.map((genre) => (
						<li key={genre} className='rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800'>
							{genre}
						</li>
					))}
				</ul>
				<a
					href={musicProfile.url}
					target='_blank'
					rel='noopener noreferrer'
					className='mt-5 inline-block text-sm text-primary-500 underline decoration-primary-500 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
				>
					打开网易云主页 ↗
				</a>
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Connect Music details in the disclosure grid**

Import `MusicDetails` in `hobby-grid.tsx` and add this branch to `renderDetails` before Food:

```tsx
if (id === 'music') {
	return <MusicDetails />;
}
```

- [ ] **Step 5: Allow only NetEase album-art hosts in Next Image**

Add this property to the `nextConfig` object in `next.config.ts`:

```ts
images: {
	remotePatterns: [
		{
			protocol: 'https',
			hostname: '**.music.126.net',
			pathname: '/**',
		},
	],
},
```

Do not add a broad all-host wildcard.

- [ ] **Step 6: Run Music tests, the full test suite, and static checks**

Run:

```bash
npm test -- app/hobby/components/music-details.test.tsx
npm test
npm run check
```

Expected: Music tests PASS in both populated and unavailable states; the entire test suite passes; Biome is clean.

- [ ] **Step 7: Commit the Music UI**

```bash
git add app/hobby/components/music-details.tsx \
  app/hobby/components/music-details.test.tsx \
  app/hobby/components/hobby-grid.tsx next.config.ts
git commit -m "feat: show recent netease activity"
```

---

### Task 9: Perform final integration verification

**Files:**
- Verify: all files changed since `c86601f`
- Modify only if a verification command reveals a concrete defect.

**Interfaces:**
- Consumes: the complete `/hobby` feature.
- Produces: evidence that tests, Biome, build, routes, fallback behavior, and secret handling meet the approved spec.

- [ ] **Step 1: Run the full automated gate from a clean shell**

Run:

```bash
cd /home/aimall/golden-xzs-blog/.worktrees/feature-hobby-section
npm test
npm run check
npm run build
```

Expected:

- Vitest exits 0 with every test passing.
- Biome reports zero errors and zero warnings.
- Next production build exits 0 and includes `/hobby` and `/api/hobby/netease`.
- The existing `Spotify token refresh failed (400): invalid_client` local-credential message may appear as an established graceful fallback, but it must not fail the build.

- [ ] **Step 2: Start the production server and smoke-test routes without NetEase secrets**

Run:

```bash
env -u NETEASE_API_BASE_URL \
  -u NETEASE_MUSIC_COOKIE \
  -u NETEASE_USER_ID \
  PORT=3100 npm run serve > /tmp/golden-hobby-next.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID"' EXIT
for attempt in $(seq 1 30); do
  curl --fail --silent http://localhost:3100/hobby >/tmp/hobby.html && break
  sleep 1
done
curl --fail --silent http://localhost:3100/ >/tmp/home.html
curl --fail --silent http://localhost:3100/api/hobby/netease >/tmp/netease.json
grep -q '/hobby' /tmp/home.html
grep -q 'Games' /tmp/hobby.html
grep -q 'Anime' /tmp/hobby.html
grep -q '"state":"unavailable"' /tmp/netease.json
kill "$SERVER_PID"
trap - EXIT
```

Expected: every command exits 0; the public API safely returns unavailable when no credentials are configured.

- [ ] **Step 3: Inspect source and build output for accidental secrets**

Run:

```bash
git grep -nE 'NETEASE_MUSIC_COOKIE=.+|MUSIC_U=' -- . \
  ':(exclude)**/*.test.ts' ':(exclude)**/*.test.tsx' \
  ':(exclude).env.example' || true
grep -R "MUSIC_U=" -n .next \
  --exclude='*.map' || true
```

Expected: both commands print no committed or built secret values.

- [ ] **Step 4: Inspect the final diff and commit any verification-only correction**

Run:

```bash
git diff c86601f --check
git status --short
git log --oneline c86601f..HEAD
```

Expected: no whitespace errors; only approved Hobby, test, documentation, and configuration files changed; the worktree is clean after the final commit.

If a concrete correction was required during this task, rerun Steps 1–3, then commit only that correction:

```bash
git add -A
git commit -m "fix: address hobby integration verification"
```

Do not create an empty commit when no correction was necessary.
