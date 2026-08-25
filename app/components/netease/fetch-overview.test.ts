// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { fetchNeteaseOverview } from './fetch-overview';

const NOW = 1_800_000_000_000;
const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/netease-api',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=secret==',
	NETEASE_USER_ID: '3719820729',
	NODE_ENV: 'production',
};

const weeklyPayload = {
	code: 200,
	weekData: [
		{
			playCount: 4,
			score: 100,
			song: {
				id: 42,
				name: 'Weekly Track',
				ar: [{ name: 'Weekly Artist' }],
				al: { name: 'Weekly Album', picUrl: null },
				dt: 180_000,
			},
		},
	],
};

describe('fetchNeteaseOverview', () => {
	it('shares one weekly upstream GET between activity fallback and ranking', async () => {
		const fetchImpl = vi.fn(
			async (_input: RequestInfo | URL, init?: RequestInit) =>
				init?.method === 'POST'
					? new Response(JSON.stringify({ data: { list: [] } }), {
							status: 200,
						})
					: new Response(JSON.stringify(weeklyPayload), { status: 200 }),
		);

		const result = await fetchNeteaseOverview({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now: NOW,
		});

		expect(result.activity).toMatchObject({
			state: 'weekly',
			track: { title: 'Weekly Track' },
		});
		expect(result.weeklyRanking).toMatchObject({
			state: 'ready',
			generatedAt: NOW,
			tracks: [{ rank: 1, title: 'Weekly Track' }],
		});
		expect(
			fetchImpl.mock.calls.filter(
				([url, options]) =>
					String(url) ===
						'https://netease.internal.example/netease-api/user/record?uid=3719820729&type=1' &&
					options?.method === 'GET',
			),
		).toHaveLength(1);
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
