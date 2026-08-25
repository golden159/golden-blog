import { render, screen } from '@testing-library/react';
import type { SteamActivityResponse } from 'app/components/steam/types';
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

describe('GameDetails', () => {
	it('renders the approved games and copyable account identifiers', () => {
		render(<GameDetails steamActivity={steamActivity} />);

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

		expect(screen.getByRole('heading', { name: 'Competitive' })).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
		expect(
			screen.queryByRole('link', { name: /打开 Steam 主页/ }),
		).not.toBeInTheDocument();
		expect(screen.getByText('小黑盒')).toBeInTheDocument();
		expect(screen.getByText('Battle.net')).toBeInTheDocument();
		expect(screen.getByText('MONSTER HUNTER RISE')).toBeInTheDocument();
	});
});
