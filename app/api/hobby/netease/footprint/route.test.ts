// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/netease/fetch-listening-footprint', () => ({
	fetchNeteaseListeningFootprint: vi.fn(),
}));

import { fetchNeteaseListeningFootprint } from 'app/components/netease/fetch-listening-footprint';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchNeteaseListeningFootprint);

describe('GET /api/hobby/netease/footprint', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			state: 'unavailable',
			generatedAt: 1_800_000_000_000,
			timezone: 'Asia/Shanghai',
			coverage: {
				recentAvailable: false,
				recordCount: null,
				oldestPlayedAt: null,
				limit: 100,
				truncated: false,
			},
			today: {
				durationMs: null,
				recordCount: null,
				uniqueTrackCount: null,
				topArtist: null,
				topTrack: null,
				buckets: [],
			},
			week: { durationMs: null, mondayDurationMs: null, recordCount: null },
			reports: {
				week: {
					durationMs: null,
					recordCount: null,
					uniqueTrackCount: null,
					topArtist: null,
					topTrack: null,
					buckets: [],
				},
				month: {
					durationMs: null,
					recordCount: null,
					uniqueTrackCount: null,
					topArtist: null,
					topTrack: null,
					buckets: [],
				},
				year: {
					durationMs: null,
					recordCount: null,
					uniqueTrackCount: null,
					topArtist: null,
					topTrack: null,
					buckets: [],
				},
			},
			lifetime: {
				listenCount: null,
				estimatedDurationMs: null,
				sampleDurationMs: null,
				basis: null,
			},
			weeklyHighlight: null,
		});
	});

	it('returns the normalized footprint with public cache headers', async () => {
		const response = await GET();

		expect(await response.json()).toMatchObject({ state: 'unavailable' });
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=60, stale-while-revalidate=300',
		);
	});
});
