import { render, screen } from '@testing-library/react';
import type { BangumiAnimeResponse } from 'app/components/bangumi/types';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnimeDetails from './anime-details';

const readyActivity: BangumiAnimeResponse = {
	state: 'ready',
	profile: {
		username: '1022640',
		nickname: 'Golden',
		sign: '动画和生活都要认真记录。',
		avatarUrl: null,
	},
	total: 27,
	activity: [
		{ date: '2025-09-16', count: 4 },
		{ date: '2026-08-24', count: 2 },
		{ date: '2026-08-25', count: 1 },
	],
	entries: [
		{
			id: 400602,
			title: '葬送的芙莉莲',
			originalTitle: '葬送のフリーレン',
			imageUrl: null,
			status: '看过',
			personalScore: 9,
			communityScore: 8.8,
			watchedEpisodes: 28,
			totalEpisodes: 28,
		},
		{
			id: 501701,
			title: '正在看的动画',
			originalTitle: null,
			imageUrl: null,
			status: '在看',
			personalScore: null,
			communityScore: 7.5,
			watchedEpisodes: 4,
			totalEpisodes: 12,
		},
	],
};

const renderAnime = (activity?: BangumiAnimeResponse) =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<AnimeDetails activity={activity} />
		</SWRConfig>,
	);

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('AnimeDetails', () => {
	it('renders a one-year Bangumi public activity heatmap', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-15T12:00:00+08:00'));

		const { container } = renderAnime(readyActivity);

		expect(
			screen.getByRole('img', { name: '近一年有 7 次 Bangumi 活动' }),
		).toBeInTheDocument();
		expect(container.querySelectorAll('[data-level]')).toHaveLength(365);
		expect(screen.getAllByText('10月')).toHaveLength(1);
		const animatedCell = screen.getByTitle('2025-09-16：4 次活动');
		expect(animatedCell).toHaveAttribute('data-level', '4');
		expect(animatedCell).toHaveStyle({
			opacity: '0',
			transform: 'translateY(-20px)',
		});
		expect(
			screen.getByText('基于最近 365 天的公开时间胶囊活动'),
		).toBeInTheDocument();
		expect(screen.getByTitle('2026-08-24：2 次活动')).toHaveAttribute(
			'data-level',
			'2',
		);
		expect(screen.getByTitle('2026-08-25：1 次活动')).toHaveAttribute(
			'data-level',
			'1',
		);
	});

	it('renders the public profile, exact total and collection entries', () => {
		renderAnime(readyActivity);

		expect(screen.getByRole('heading', { name: 'Golden' })).toBeInTheDocument();
		expect(screen.getByText('@1022640')).toBeInTheDocument();
		expect(screen.getByText('27')).toBeInTheDocument();
		expect(screen.getByText('动画收藏')).toBeInTheDocument();
		expect(screen.getByText('动画和生活都要认真记录。')).toBeInTheDocument();
		expect(screen.getByText('葬送的芙莉莲')).toBeInTheDocument();
		expect(screen.getByText('葬送のフリーレン')).toBeInTheDocument();
		expect(screen.getByText('我的评分 9')).toBeInTheDocument();
		expect(screen.getByText('28 / 28 话')).toBeInTheDocument();
		expect(screen.getByText('4 / 12 话')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /打开《葬送的芙莉莲》/ }),
		).toHaveAttribute('href', 'https://bgm.tv/subject/400602');
	});

	it('keeps the expanded anime layout flat instead of nesting card surfaces', () => {
		const { container } = renderAnime(readyActivity);

		expect(container.firstElementChild).not.toHaveClass(
			'rounded-2xl',
			'border',
		);

		const collectionLink = screen.getByRole('link', {
			name: /打开《葬送的芙莉莲》/,
		});
		expect(collectionLink).not.toHaveClass('rounded-2xl', 'border');

		const total = screen.getByText('动画收藏').parentElement?.parentElement;
		expect(total).not.toHaveClass('rounded-2xl', 'border');
	});

	it('renders an unavailable state without hiding the explanation', () => {
		renderAnime({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
		});

		expect(screen.getByText(/Bangumi 数据暂时不可用/)).toBeInTheDocument();
	});

	it('explains an activity-only failure while keeping the collection visible', () => {
		renderAnime({
			...readyActivity,
			activity: [],
			activityState: 'unavailable',
		});

		expect(screen.getByText(/Bangumi 活跃日历暂时不可用/)).toBeInTheDocument();
		expect(screen.getByText('葬送的芙莉莲')).toBeInTheDocument();
	});

	it('renders a profile-aware empty state', () => {
		renderAnime({
			state: 'empty',
			profile: readyActivity.profile,
			total: 0,
			entries: [],
			activity: [],
		});

		expect(screen.getByRole('heading', { name: 'Golden' })).toBeInTheDocument();
		expect(screen.getByText('还没有公开的动画收藏。')).toBeInTheDocument();
	});

	it('shows a loading state while the local API is pending', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => new Promise(() => {})),
		);

		renderAnime();

		expect(screen.getByText('正在连接 Bangumi…')).toBeInTheDocument();
	});
});
