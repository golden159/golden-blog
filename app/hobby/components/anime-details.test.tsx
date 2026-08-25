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
	vi.unstubAllGlobals();
});

describe('AnimeDetails', () => {
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

	it('renders an unavailable state without hiding the explanation', () => {
		renderAnime({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
		});

		expect(screen.getByText(/Bangumi 数据暂时不可用/)).toBeInTheDocument();
	});

	it('renders a profile-aware empty state', () => {
		renderAnime({
			state: 'empty',
			profile: readyActivity.profile,
			total: 0,
			entries: [],
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
