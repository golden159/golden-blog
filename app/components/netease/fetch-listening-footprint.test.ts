// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { fetchNeteaseListeningFootprint } from './fetch-listening-footprint';

const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/netease-api',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=abc=def==',
	NETEASE_USER_ID: '3719820729',
	NODE_ENV: 'production',
};
const now = 1_800_000_000_000;

const recentPayload = {
	code: 200,
	data: {
		list: [
			{
				playTime: now - 1,
				data: {
					id: 7,
					name: 'Recent Track',
					ar: [{ name: 'Recent Artist' }],
					al: { name: 'Recent Album', picUrl: null },
					dt: 210_000,
				},
			},
		],
		total: 1,
	},
};
const weeklyPayload = {
	code: 200,
	weekData: [
		{
			song: {
				id: 8,
				name: 'Weekly Track',
				ar: [{ name: 'Weekly Artist' }],
				al: { name: 'Weekly Album', picUrl: null },
				dt: 180_000,
			},
		},
	],
};
const detailPayload = { code: 200, listenSongs: 12 };

const jsonResponse = (payload: unknown) =>
	new Response(JSON.stringify(payload), { status: 200 });

describe('fetchNeteaseListeningFootprint', () => {
	it('sends the Cookie only to the recent POST', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(recentPayload))
			.mockResolvedValueOnce(jsonResponse(weeklyPayload))
			.mockResolvedValueOnce(jsonResponse(detailPayload));

		await fetchNeteaseListeningFootprint({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
			Cookie: env.NETEASE_MUSIC_COOKIE,
		});
		expect(fetchImpl.mock.calls[1][1]?.headers).toBeUndefined();
		expect(fetchImpl.mock.calls[2][1]?.headers).toBeUndefined();
	});

	it('skips only recent when the Cookie is missing', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(weeklyPayload))
			.mockResolvedValueOnce(jsonResponse(detailPayload));

		const result = await fetchNeteaseListeningFootprint({
			env: { ...env, NETEASE_MUSIC_COOKIE: '' },
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
			'https://netease.internal.example/netease-api/user/record?uid=3719820729&type=1',
			'https://netease.internal.example/netease-api/user/detail?uid=3719820729',
		]);
		expect(result.state).toBe('partial');
		expect(result.coverage.recentAvailable).toBe(false);
		expect(result.weeklyHighlight?.title).toBe('Weekly Track');
	});

	it('uses a capped recent body and hardened fetch options', async () => {
		const timeoutSignal = new AbortController().signal;
		const timeoutSpy = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(timeoutSignal);
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(recentPayload))
			.mockResolvedValueOnce(jsonResponse(weeklyPayload))
			.mockResolvedValueOnce(jsonResponse(detailPayload));

		await fetchNeteaseListeningFootprint({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		const [recentUrl, recentOptions] = fetchImpl.mock.calls[0];
		expect(recentUrl).toBe(
			'https://netease.internal.example/netease-api/record/recent/song',
		);
		expect(recentOptions).toMatchObject({
			method: 'POST',
			cache: 'no-store',
			redirect: 'error',
			signal: timeoutSignal,
		});
		expect([...(recentOptions?.body as URLSearchParams).entries()]).toEqual([
			['limit', '100'],
			['timestamp', String(now)],
			['uid', env.NETEASE_USER_ID],
		]);
		for (const [, options] of fetchImpl.mock.calls) {
			expect(options).toMatchObject({
				cache: 'no-store',
				redirect: 'error',
				signal: timeoutSignal,
			});
		}
		expect(timeoutSpy).toHaveBeenCalledTimes(3);
		expect(timeoutSpy).toHaveBeenCalledWith(5000);
	});

	it('returns usable partial data when one public source fails', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(recentPayload))
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(jsonResponse(detailPayload));

		const result = await fetchNeteaseListeningFootprint({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		expect(result).toMatchObject({
			state: 'partial',
			coverage: { recentAvailable: true, recordCount: 1 },
			lifetime: { listenCount: 12 },
			weeklyHighlight: null,
		});
	});

	it('makes no request for a rejected base URL', async () => {
		const fetchImpl = vi.fn();

		const result = await fetchNeteaseListeningFootprint({
			env: { ...env, NETEASE_API_BASE_URL: 'https://user:pass@example.com' },
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(result.state).toBe('unavailable');
	});

	it('never serializes the Cookie or upstream base URL', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(recentPayload))
			.mockResolvedValueOnce(jsonResponse(weeklyPayload))
			.mockResolvedValueOnce(jsonResponse(detailPayload));

		const result = await fetchNeteaseListeningFootprint({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now,
		});

		expect(JSON.stringify(result)).not.toContain(env.NETEASE_MUSIC_COOKIE);
		expect(JSON.stringify(result)).not.toContain('netease.internal.example');
	});
});
