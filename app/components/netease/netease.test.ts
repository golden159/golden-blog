// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { fetchNeteaseActivity } from './netease';

const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=super-secret',
	NETEASE_USER_ID: '3719820729',
};

describe('fetchNeteaseActivity', () => {
	it('returns unavailable without complete configuration', async () => {
		const fetchImpl = vi.fn();
		const result = await fetchNeteaseActivity({
			env: {},
			fetchImpl: fetchImpl as typeof fetch,
		});

		expect(result).toEqual({ state: 'unavailable', track: null });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('posts the secret server-side but returns only normalized public data', async () => {
		const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
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
		const request = fetchImpl.mock.calls[0];
		const body = request[1]?.body as URLSearchParams;

		expect(request[0]).toBe(
			'https://netease.internal.example/record/recent/song',
		);
		expect(request[1]?.method).toBe('POST');
		expect(body.get('cookie')).toBe(env.NETEASE_MUSIC_COOKIE);
		expect(body.get('limit')).toBe('1');
		expect(timeoutSpy).toHaveBeenCalledWith(5000);
		expect(JSON.stringify(result)).not.toContain('super-secret');
		expect(JSON.stringify(result)).not.toContain('netease.internal.example');
		expect(result.state).toBe('recent');
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
