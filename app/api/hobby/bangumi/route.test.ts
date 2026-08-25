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
		});
	});

	it('returns the normalized response with public cache headers', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=300, stale-while-revalidate=900',
		);
	});
});
