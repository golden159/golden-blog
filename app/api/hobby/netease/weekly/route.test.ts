// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/netease/fetch-weekly-ranking', () => ({
	fetchNeteaseWeeklyRanking: vi.fn(),
}));

import { fetchNeteaseWeeklyRanking } from 'app/components/netease/fetch-weekly-ranking';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchNeteaseWeeklyRanking);

describe('GET /api/hobby/netease/weekly', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			state: 'unavailable',
			generatedAt: 1_800_000_000_000,
			tracks: [],
		});
	});

	it('returns the ranking with five-minute public cache headers', async () => {
		const response = await GET();

		expect(mockedFetch).toHaveBeenCalledOnce();
		expect(await response.json()).toEqual({
			state: 'unavailable',
			generatedAt: 1_800_000_000_000,
			tracks: [],
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=300, stale-while-revalidate=600',
		);
	});
});
