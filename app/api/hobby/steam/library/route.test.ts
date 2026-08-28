// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/steam/steam', () => ({
	fetchSteamLibrary: vi.fn(),
}));

import { fetchSteamLibrary } from 'app/components/steam/steam';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchSteamLibrary);

describe('GET /api/hobby/steam/library', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			totalCount: 1,
			games: [
				{ appId: 2379780, name: 'Balatro', playtimeForeverMinutes: 1611 },
			],
		});
	});

	it('returns the public owned library with a one-hour stale cache', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			totalCount: 1,
			games: [
				{ appId: 2379780, name: 'Balatro', playtimeForeverMinutes: 1611 },
			],
		});
		expect(mockedFetch).toHaveBeenCalledTimes(1);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=3600, stale-while-revalidate=86400',
		);
	});
});
