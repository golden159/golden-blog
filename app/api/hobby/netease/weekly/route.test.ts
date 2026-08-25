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

	it('does not cache an unavailable ranking', async () => {
		const response = await GET();

		expect(mockedFetch).toHaveBeenCalledOnce();
		expect(await response.json()).toEqual({
			state: 'unavailable',
			generatedAt: 1_800_000_000_000,
			tracks: [],
		});
		expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
	});

	it('keeps the five-minute public cache for a ready ranking', async () => {
		mockedFetch.mockResolvedValue({
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			tracks: [
				{
					rank: 1,
					title: 'Weekly Track',
					artists: ['Artist'],
					album: 'Album',
					albumArtUrl: null,
					songUrl: 'https://music.163.com/song?id=42',
					durationMs: 180_000,
					playCount: 4,
					score: 100,
				},
			],
		});

		const response = await GET();

		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=300, stale-while-revalidate=600',
		);
	});
});
