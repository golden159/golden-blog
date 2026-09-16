// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/bangumi/bangumi', () => ({
	fetchBangumiAnime: vi.fn(),
}));

import { fetchBangumiAnime } from 'app/components/bangumi/bangumi';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchBangumiAnime);

describe('GET /api/hobby/bangumi', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
		});
	});

	it('returns the normalized response with public cache headers', async () => {
		mockedFetch.mockResolvedValue({
			state: 'empty',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
			activityState: 'ready',
		});
		const response = await GET();

		expect(await response.json()).toMatchObject({
			state: 'empty',
			activityState: 'ready',
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=300, stale-while-revalidate=900',
		);
	});

	it('does not cache a response with incomplete activity data', async () => {
		mockedFetch.mockResolvedValue({
			state: 'ready',
			profile: {
				username: 'golden_xzs',
				nickname: 'golden',
				sign: null,
				avatarUrl: null,
			},
			total: 1,
			entries: [],
			activity: [],
			activityState: 'unavailable',
		});

		const response = await GET();

		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});
