import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SteamLibraryResponse } from 'app/components/steam/types';
import { describe, expect, it } from 'vitest';
import SteamLibraryBubbles from './steam-library-bubbles';

const readyLibrary: SteamLibraryResponse = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	totalCount: 4,
	games: [
		{ appId: 10, name: 'Balatro', playtimeForeverMinutes: 1600 },
		{ appId: 20, name: 'Portal 2', playtimeForeverMinutes: 300 },
		{ appId: 30, name: 'A Short Hike', playtimeForeverMinutes: 60 },
		{ appId: 40, name: 'PEAK', playtimeForeverMinutes: 0 },
	],
};

describe('SteamLibraryBubbles', () => {
	it('renders playtime-sized transparent bubbles linking to Steam', () => {
		render(
			<SteamLibraryBubbles library={readyLibrary} fetchWhenMissing={false} />,
		);

		expect(
			screen.getByRole('heading', { name: 'Steam 游戏库' }),
		).toBeInTheDocument();
		expect(screen.getByText('4 款游戏')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Balatro/ })).toHaveAttribute(
			'href',
			'https://store.steampowered.com/app/10/',
		);
		expect(screen.getByTestId('steam-library-game-10')).toHaveAttribute(
			'data-size-tier',
			'xl',
		);
		expect(screen.getByTestId('steam-library-game-20')).toHaveAttribute(
			'data-size-tier',
			'lg',
		);
		expect(screen.getByTestId('steam-library-game-30')).toHaveAttribute(
			'data-size-tier',
			'md',
		);
		expect(screen.getByTestId('steam-library-game-40')).toHaveAttribute(
			'data-size-tier',
			'sm',
		);
		expect(screen.getByRole('link', { name: /Balatro/ })).toHaveClass(
			'steam-bubble-motion',
			'bg-primary-500/10',
		);
		expect(screen.getByRole('link', { name: /Balatro/ })).toHaveAttribute(
			'title',
			'Balatro · 累计 26 小时 40 分钟',
		);
	});

	it('keeps the longest-played game in the center of the bubble cloud', () => {
		const games = Array.from({ length: 12 }, (_, index) => ({
			appId: index + 1,
			name: `Game ${index + 1}`,
			playtimeForeverMinutes: 1200 - index * 100,
		}));
		render(
			<SteamLibraryBubbles
				library={{ ...readyLibrary, totalCount: games.length, games }}
				fetchWhenMissing={false}
			/>,
		);

		const cloud = screen.getByTestId('steam-library-cloud');
		expect(cloud).toHaveClass('steam-bubble-cloud');
		expect(cloud).toHaveClass('flex-wrap');
		expect(screen.getByTestId('steam-library-center')).toContainElement(
			screen.getByTestId('steam-library-game-1'),
		);
		expect(screen.getByTestId('steam-library-game-1')).toHaveAttribute(
			'data-bubble-layer',
			'center',
		);
		expect(screen.getByTestId('steam-library-game-2')).toHaveAttribute(
			'data-bubble-layer',
			'inner',
		);
		expect(screen.getByTestId('steam-library-game-12')).toHaveAttribute(
			'data-bubble-layer',
			'outer',
		);
	});

	it('chooses the center from playtime when the library response is not sorted', () => {
		const games = [
			{ appId: 10, name: 'Short Session', playtimeForeverMinutes: 30 },
			{ appId: 20, name: 'Longest Session', playtimeForeverMinutes: 2400 },
		];
		render(
			<SteamLibraryBubbles
				library={{ ...readyLibrary, totalCount: games.length, games }}
				fetchWhenMissing={false}
			/>,
		);

		expect(screen.getByTestId('steam-library-center')).toContainElement(
			screen.getByTestId('steam-library-game-20'),
		);
	});

	it('gives every default-library bubble a stable position in two rings', () => {
		const games = Array.from({ length: 36 }, (_, index) => ({
			appId: index + 1,
			name: `Game ${index + 1}`,
			playtimeForeverMinutes: 3600 - index,
		}));
		render(
			<SteamLibraryBubbles
				library={{ ...readyLibrary, totalCount: games.length, games }}
				fetchWhenMissing={false}
			/>,
		);

		const orbitItems = screen
			.getAllByTestId(/steam-library-game-/)
			.slice(1)
			.map((bubble) => bubble.parentElement);
		const positions = orbitItems.map(
			(item) =>
				`${item?.style.getPropertyValue('--steam-bubble-x')}:${item?.style.getPropertyValue('--steam-bubble-y')}`,
		);
		expect(positions).toHaveLength(35);
		expect(new Set(positions).size).toBe(35);
		expect(
			screen
				.getAllByTestId(/steam-library-game-/)
				.filter((bubble) => bubble.dataset.bubbleLayer === 'inner'),
		).toHaveLength(10);
		expect(
			screen
				.getAllByTestId(/steam-library-game-/)
				.filter((bubble) => bubble.dataset.bubbleLayer === 'outer'),
		).toHaveLength(25);
	});

	it('reveals the rest of a large library without changing bubble semantics', () => {
		const games = Array.from({ length: 38 }, (_, index) => ({
			appId: index + 1,
			name: `Game ${index + 1}`,
			playtimeForeverMinutes: index,
		}));
		render(
			<SteamLibraryBubbles
				library={{ ...readyLibrary, totalCount: games.length, games }}
				fetchWhenMissing={false}
			/>,
		);

		expect(screen.getAllByRole('link')).toHaveLength(36);
		expect(
			within(screen.getByTestId('steam-library-cloud')).getAllByRole('link'),
		).toHaveLength(36);
		fireEvent.click(screen.getByRole('button', { name: '显示全部 38 款游戏' }));
		expect(screen.getAllByRole('link')).toHaveLength(38);
		expect(
			within(screen.getByTestId('steam-library-overflow')).getAllByRole('link'),
		).toHaveLength(2);
		expect(
			screen.queryByRole('button', { name: /显示全部/ }),
		).not.toBeInTheDocument();
	});

	it('renders safe empty and unavailable states', () => {
		const { rerender } = render(
			<SteamLibraryBubbles
				library={{
					state: 'empty',
					generatedAt: 1,
					totalCount: 0,
					games: [],
				}}
				fetchWhenMissing={false}
			/>,
		);
		expect(screen.getByText('暂无公开的 Steam 游戏库。')).toBeInTheDocument();

		rerender(
			<SteamLibraryBubbles
				library={{
					state: 'unavailable',
					generatedAt: 1,
					totalCount: 0,
					games: [],
				}}
				fetchWhenMissing={false}
			/>,
		);
		expect(screen.getByText('Steam 游戏库暂时不可用。')).toBeInTheDocument();
	});
});
