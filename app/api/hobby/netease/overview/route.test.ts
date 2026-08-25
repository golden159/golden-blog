// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/netease/fetch-overview', () => ({
	fetchNeteaseOverview: vi.fn(),
}));

import { fetchNeteaseOverview } from 'app/components/netease/fetch-overview';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchNeteaseOverview);

describe('GET /api/hobby/netease/overview', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			activity: { state: 'unavailable', track: null },
			weeklyRanking: {
				state: 'unavailable',
				generatedAt: 1_800_000_000_000,
				tracks: [],
			},
		});
	});

	it('does not cache an overview with unavailable data', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			activity: { state: 'unavailable', track: null },
			weeklyRanking: {
				state: 'unavailable',
				generatedAt: 1_800_000_000_000,
				tracks: [],
			},
		});
		expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
	});

	it('uses the recent-activity cache window for coherent overview data', async () => {
		mockedFetch.mockResolvedValue({
			activity: {
				state: 'recent',
				track: {
					title: 'Recent Track',
					artists: ['Artist'],
					album: 'Album',
					albumArtUrl: null,
					songUrl: 'https://music.163.com/song?id=1',
					playedAt: 1_800_000_000_000,
				},
			},
			weeklyRanking: {
				state: 'empty',
				generatedAt: 1_800_000_000_000,
				tracks: [],
			},
		});

		const response = await GET();

		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=30, stale-while-revalidate=60',
		);
	});
});
