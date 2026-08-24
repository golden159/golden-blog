// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNeteaseActivity } from './netease';

const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=abc=def==',
	NETEASE_USER_ID: '3719820729',
	NODE_ENV: 'production',
};

const incompleteEnvironments = [
	['base URL', { ...env, NETEASE_API_BASE_URL: '' }],
	['user ID', { ...env, NETEASE_USER_ID: '' }],
] as const;

describe('fetchNeteaseActivity', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each(
		incompleteEnvironments,
	)('returns unavailable when the %s is missing', async (_missingValue, incompleteEnv) => {
		const fetchImpl = vi.fn();
		const result = await fetchNeteaseActivity({
			env: incompleteEnv,
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toEqual({ state: 'unavailable', track: null });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it.each([
		['production loopback HTTP', 'http://localhost:3000', 'production'],
		[
			'development non-loopback HTTP',
			'http://netease.internal.example',
			'development',
		],
	] as const)('returns unavailable without fetching for %s', async (_case, baseUrl, nodeEnv) => {
		const fetchImpl = vi.fn();
		const result = await fetchNeteaseActivity({
			env: {
				...env,
				NETEASE_API_BASE_URL: baseUrl,
				NODE_ENV: nodeEnv,
			},
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toEqual({ state: 'unavailable', track: null });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it.each([
		'http://localhost:3000',
		'http://127.0.0.1:3000',
		'http://[::1]:3000',
	])('allows development loopback HTTP at %s', async (baseUrl) => {
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						list: [
							{
								playTime: 1_800_000_000_000,
								data: {
									id: 7,
									name: 'Track',
									ar: [{ name: 'Artist' }],
									al: { name: 'Album', picUrl: null },
								},
							},
						],
					},
				}),
				{ status: 200 },
			),
		);

		const result = await fetchNeteaseActivity({
			env: {
				...env,
				NETEASE_API_BASE_URL: baseUrl,
				NODE_ENV: 'development',
			},
			fetchImpl: fetchImpl as typeof fetch,
			now: 1_800_000_000_001,
		});

		expect(result.state).toBe('recent');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it.each([
		'not a URL',
		'https:',
		'https:/',
		'https://',
	])('returns unavailable without fetching for malformed base URL %s', async (baseUrl) => {
		const fetchImpl = vi.fn();

		await expect(
			fetchNeteaseActivity({
				env: { ...env, NETEASE_API_BASE_URL: baseUrl },
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).resolves.toEqual({ state: 'unavailable', track: null });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('skips recent and fetches public weekly activity when the cookie is missing', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					weekData: [
						{
							song: {
								id: 42,
								name: 'Weekly Track',
								ar: [{ name: 'Weekly Artist' }],
								al: { name: 'Weekly Album', picUrl: null },
							},
						},
					],
				}),
				{ status: 200 },
			),
		);

		const result = await fetchNeteaseActivity({
			env: { ...env, NETEASE_MUSIC_COOKIE: '' },
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toMatchObject({
			state: 'weekly',
			track: { title: 'Weekly Track' },
		});
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const [requestUrl, requestOptions] = fetchImpl.mock.calls[0];
		expect(requestUrl).toBe(
			'https://netease.internal.example/user/record?uid=3719820729&type=1',
		);
		expect(requestOptions?.method).toBe('GET');
		expect(requestOptions?.headers).toBeUndefined();
		expect(requestOptions?.body).toBeUndefined();
	});

	it('falls back to weekly activity without forwarding the music cookie', async () => {
		const timeoutSignal = new AbortController().signal;
		const timeoutSpy = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(timeoutSignal);
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ data: { list: [] } }), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						weekData: [
							{
								song: {
									id: 42,
									name: 'Weekly Track',
									ar: [{ name: 'Weekly Artist' }],
									al: {
										name: 'Weekly Album',
										picUrl: 'https://music.126.net/weekly.jpg',
									},
									dt: 210_000,
								},
							},
						],
					}),
					{ status: 200 },
				),
			);

		const result = await fetchNeteaseActivity({
			env,
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toEqual({
			state: 'weekly',
			track: {
				title: 'Weekly Track',
				artists: ['Weekly Artist'],
				album: 'Weekly Album',
				albumArtUrl: 'https://music.126.net/weekly.jpg',
				songUrl: 'https://music.163.com/song?id=42',
				playedAt: null,
				durationMs: 210_000,
			},
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);

		const fallbackRequest = fetchImpl.mock.calls[1];
		const fallbackOptions = fallbackRequest[1];
		expect(fallbackRequest[0]).toBe(
			'https://netease.internal.example/user/record?uid=3719820729&type=1',
		);
		expect(fallbackOptions?.method).toBe('GET');
		expect(fallbackOptions?.headers).toBeUndefined();
		expect(fallbackOptions?.body).toBeUndefined();
		expect(fallbackOptions?.cache).toBe('no-store');
		expect(fallbackOptions?.redirect).toBe('error');
		expect(fallbackOptions?.signal).toBe(timeoutSignal);
		expect(timeoutSpy).toHaveBeenCalledTimes(2);
		expect(timeoutSpy).toHaveBeenNthCalledWith(2, 5000);
	});

	it('returns empty when recent and weekly activity lists are both valid and empty', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ data: { list: [] } }), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ weekData: [] }), { status: 200 }),
			);

		expect(
			await fetchNeteaseActivity({
				env,
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).toEqual({ state: 'empty', track: null });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('falls back to weekly activity when the recent request is unavailable', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						weekData: [
							{
								song: {
									id: '99',
									name: 'Fallback Track',
									ar: [{ name: 'Fallback Artist' }],
									al: { name: 'Fallback Album', picUrl: null },
								},
							},
						],
					}),
					{ status: 200 },
				),
			);

		expect(
			await fetchNeteaseActivity({
				env,
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).toMatchObject({
			state: 'weekly',
			track: { title: 'Fallback Track' },
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('posts the secret server-side but returns only normalized public data', async () => {
		const timeoutSignal = new AbortController().signal;
		const timeoutSpy = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(timeoutSignal);
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						list: [
							{
								playTime: 1_800_000_000_000,
								data: {
									id: 7,
									name: 'Track',
									ar: [{ name: 'Artist' }],
									al: { name: 'Album', picUrl: null },
								},
							},
						],
					},
				}),
				{ status: 200 },
			),
		);

		const result = await fetchNeteaseActivity({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now: 1_800_000_000_001,
		});
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const request = fetchImpl.mock.calls[0];
		const requestOptions = request[1];
		const body = requestOptions?.body as URLSearchParams;

		expect(request[0]).toBe(
			'https://netease.internal.example/record/recent/song',
		);
		expect(requestOptions?.method).toBe('POST');
		expect(requestOptions?.headers).toEqual({
			'Content-Type': 'application/x-www-form-urlencoded',
			Cookie: env.NETEASE_MUSIC_COOKIE,
			'x-apicache-bypass': '1',
		});
		expect([...body.entries()]).toEqual([
			['limit', '1'],
			['timestamp', '1800000000001'],
			['uid', env.NETEASE_USER_ID],
		]);
		expect(requestOptions?.cache).toBe('no-store');
		expect(requestOptions?.redirect).toBe('error');
		expect(requestOptions?.signal).toBe(timeoutSignal);
		expect(timeoutSpy).toHaveBeenCalledTimes(1);
		expect(timeoutSpy).toHaveBeenCalledWith(5000);
		expect(JSON.stringify(result)).not.toContain('abc=def');
		expect(JSON.stringify(result)).not.toContain('netease.internal.example');
		expect(result.state).toBe('recent');
	});

	it('returns unavailable when fetch rejects a redirect or upstream request', async () => {
		const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

		expect(
			await fetchNeteaseActivity({
				env,
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).toEqual({ state: 'unavailable', track: null });
	});

	it('returns unavailable for a failed upstream response', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 500 }));
		expect(
			await fetchNeteaseActivity({
				env,
				fetchImpl: fetchImpl as typeof fetch,
			}),
		).toEqual({
			state: 'unavailable',
			track: null,
		});
	});
});
