// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/steam/steam', () => ({
	fetchSteamActivity: vi.fn(),
}));

import { fetchSteamActivity } from 'app/components/steam/steam';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchSteamActivity);

describe('GET /api/hobby/steam', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			state: 'empty',
			generatedAt: 1_800_000_000_000,
			profile: null,
			currentGame: null,
			recentGames: [],
		});
	});

	it('returns the public response with a short stale-while-revalidate cache', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			state: 'empty',
			generatedAt: 1_800_000_000_000,
			profile: null,
			currentGame: null,
			recentGames: [],
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=60, stale-while-revalidate=300',
		);
	});
});
