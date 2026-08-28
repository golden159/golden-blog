import { render, screen } from '@testing-library/react';
import type {
	SteamActivityResponse,
	SteamLibraryResponse,
} from 'app/components/steam/types';
import { describe, expect, it } from 'vitest';
import { steamProfile } from '../content';
import GameDetails from './game-details';

const steamActivity: SteamActivityResponse = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	profile: {
		steamId: steamProfile.userId,
		personaName: 'Golden',
		profileUrl: steamProfile.url,
		avatarUrl: null,
	},
	currentGame: {
		appId: 1446780,
		name: 'MONSTER HUNTER RISE',
		iconUrl: null,
	},
	recentGames: [],
};

const steamLibrary: SteamLibraryResponse = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	totalCount: 1,
	games: [
		{
			appId: 1446780,
			name: 'MONSTER HUNTER RISE',
			playtimeForeverMinutes: 2875,
		},
	],
};

describe('GameDetails', () => {
	it('keeps dynamic Steam data and accounts without static game groups', () => {
		render(
			<GameDetails steamActivity={steamActivity} steamLibrary={steamLibrary} />,
		);

		expect(
			screen.queryByRole('heading', { name: 'Competitive' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('heading', { name: 'Hunting' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('heading', { name: 'Co-op Nights' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /打开 Steam 主页/ }),
		).not.toBeInTheDocument();
		expect(screen.getByText('小黑盒')).toBeInTheDocument();
		expect(screen.getByText('Battle.net')).toBeInTheDocument();
		expect(screen.getAllByText('MONSTER HUNTER RISE')).toHaveLength(2);
		expect(
			screen.getByRole('heading', { name: 'Steam 游戏库' }),
		).toBeInTheDocument();
	});
});
