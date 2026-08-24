// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/netease/netease', () => ({
	fetchNeteaseActivity: vi.fn(),
}));

import { fetchNeteaseActivity } from 'app/components/netease/netease';
import { GET } from './route';

const mockedFetch = vi.mocked(fetchNeteaseActivity);

describe('GET /api/hobby/netease', () => {
	beforeEach(() => {
		mockedFetch.mockResolvedValue({ state: 'unavailable', track: null });
	});

	it('returns a stable fallback with public cache headers', async () => {
		const response = await GET();

		expect(await response.json()).toEqual({
			state: 'unavailable',
			track: null,
		});
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=30, stale-while-revalidate=60',
		);
	});
});
