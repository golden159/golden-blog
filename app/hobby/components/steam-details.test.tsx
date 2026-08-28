import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SteamActivityResponse } from 'app/components/steam/types';
import { SWRConfig } from 'swr';
import { describe, expect, it } from 'vitest';
import { steamProfile } from '../content';
import SteamDetails from './steam-details';

const readyActivity: SteamActivityResponse = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	profile: {
		steamId: steamProfile.userId,
		personaName: 'Golden',
		profileUrl: steamProfile.url,
		avatarUrl:
			'https://avatars.fastly.steamstatic.com/f0145aefde1fe5d7c7b72fb517dfc1e00cc4e9df_full.jpg',
	},
	currentGame: {
		appId: 1446780,
		name: 'MONSTER HUNTER RISE',
		iconUrl:
			'https://media.steampowered.com/steamcommunity/public/images/apps/1446780/560dd364b52075b783424961a43c01f9b69fde15.jpg',
	},
	recentGames: [
		{
			appId: 3241660,
			name: 'R.E.P.O.',
			iconUrl:
				'https://media.steampowered.com/steamcommunity/public/images/apps/3241660/b8bf4770408fc369e15cebd42e0026a27b67aaa8.jpg',
			playtime2WeeksMinutes: 198,
			playtimeForeverMinutes: 918,
		},
	],
};

const renderSteam = (activity: SteamActivityResponse) =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<SteamDetails activity={activity} />
		</SWRConfig>,
	);

describe('SteamDetails', () => {
	it('renders the current game and recent public playtimes', () => {
		renderSteam(readyActivity);

		expect(screen.getByRole('heading', { name: 'Golden' })).toBeInTheDocument();
		expect(screen.getByText('正在玩')).toBeInTheDocument();
		expect(screen.getByText('MONSTER HUNTER RISE')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: '最近玩过' }),
		).toBeInTheDocument();
		expect(screen.getByText('R.E.P.O.')).toBeInTheDocument();
		expect(screen.getByText('近两周 3 小时 18 分钟')).toBeInTheDocument();
		expect(screen.getByText('累计 15 小时 18 分钟')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /打开 R.E.P.O./ })).toHaveAttribute(
			'href',
			'https://store.steampowered.com/app/3241660/',
		);
		expect(screen.getAllByText('MONSTER HUNTER RISE')).toHaveLength(1);
	});

	it('keeps the expanded layout flat and responsive on narrow screens', () => {
		const { container } = renderSteam(readyActivity);

		expect(container.firstElementChild).toHaveClass('min-w-0');
		expect(container.firstElementChild).not.toHaveClass(
			'rounded-2xl',
			'border',
		);
		const recentItem = screen.getByTestId('steam-recent-game-3241660');
		expect(recentItem).toHaveClass('min-w-0', 'flex-wrap');
		expect(within(recentItem).getByText('R.E.P.O.')).toHaveClass('truncate');
		expect(screen.getByTestId('steam-playtime-3241660')).toHaveClass(
			'w-full',
			'sm:w-auto',
			'sm:text-right',
		);
	});

	it('retains current-game information when recent data is unavailable', () => {
		renderSteam({
			...readyActivity,
			state: 'unavailable',
			recentGames: [],
		});

		expect(screen.getByText('MONSTER HUNTER RISE')).toBeInTheDocument();
		expect(screen.getByText(/最近游戏数据暂时不可用/)).toBeInTheDocument();
	});

	it('distinguishes an empty public history from a full outage', () => {
		const { rerender } = renderSteam({
			state: 'empty',
			generatedAt: readyActivity.generatedAt,
			profile: readyActivity.profile,
			currentGame: null,
			recentGames: [],
		});
		expect(screen.getByText('暂无公开的最近游戏。')).toBeInTheDocument();

		rerender(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<SteamDetails
					activity={{
						state: 'unavailable',
						generatedAt: 0,
						profile: null,
						currentGame: null,
						recentGames: [],
					}}
				/>
			</SWRConfig>,
		);
		expect(screen.getByText(/Steam 数据暂时不可用/)).toBeInTheDocument();
	});

	it('falls back to a local image after a remote image error', () => {
		renderSteam(readyActivity);

		const avatar = screen.getByRole('img', { name: 'Golden 的 Steam 头像' });
		fireEvent.error(avatar);

		expect(
			decodeURIComponent(
				screen
					.getByRole('img', { name: 'Golden 的 Steam 头像占位图' })
					.getAttribute('src') ?? '',
			),
		).toContain('/static/hobby/steam-placeholder.svg');
	});
});
