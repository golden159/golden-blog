// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNeteaseWeeklyRanking } from './fetch-weekly-ranking';

const NOW = 1_800_000_000_000;
const env = {
	NETEASE_API_BASE_URL: 'https://netease.internal.example/netease-api',
	NETEASE_MUSIC_COOKIE: 'MUSIC_U=must-not-leave-the-server',
	NETEASE_USER_ID: '3719820729',
	NODE_ENV: 'production',
};

const weeklyPayload = {
	code: 200,
	weekData: [
		{
			playCount: 4,
			score: 99,
			song: {
				id: 42,
				name: 'Weekly Track',
				ar: [{ name: 'Weekly Artist' }],
				al: {
					name: 'Weekly Album',
					picUrl: 'https://p1.music.126.net/weekly.jpg',
				},
				dt: 210_000,
			},
		},
	],
};

const jsonResponse = (payload: unknown) =>
	new Response(JSON.stringify(payload), { status: 200 });

describe('fetchNeteaseWeeklyRanking', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fetches only the public weekly endpoint with hardened options', async () => {
		const timeoutSignal = new AbortController().signal;
		const timeoutSpy = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(timeoutSignal);
		const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(weeklyPayload));

		const result = await fetchNeteaseWeeklyRanking({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now: NOW,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(fetchImpl).toHaveBeenCalledWith(
			'https://netease.internal.example/netease-api/user/record?uid=3719820729&type=1',
			{
				method: 'GET',
				cache: 'no-store',
				redirect: 'error',
				signal: timeoutSignal,
			},
		);
		expect(timeoutSpy).toHaveBeenCalledOnce();
		expect(timeoutSpy).toHaveBeenCalledWith(8000);
		expect(result).toMatchObject({
			state: 'ready',
			generatedAt: NOW,
			tracks: [{ title: 'Weekly Track', playCount: 4, score: 99 }],
		});
		expect(JSON.stringify(result)).not.toContain(env.NETEASE_MUSIC_COOKIE);
		expect(JSON.stringify(result)).not.toContain('netease.internal.example');
	});

	it.each([
		['missing base URL', { ...env, NETEASE_API_BASE_URL: '' }],
		['missing user ID', { ...env, NETEASE_USER_ID: '' }],
		['invalid user ID', { ...env, NETEASE_USER_ID: '3719&limit=999' }],
		[
			'rejected credentialed URL',
			{ ...env, NETEASE_API_BASE_URL: 'https://user:pass@example.com' },
		],
		[
			'production HTTP URL',
			{ ...env, NETEASE_API_BASE_URL: 'http://localhost:3000' },
		],
	] as const)('makes no request for %s', async (_label, rejectedEnv) => {
		const fetchImpl = vi.fn();
		const onFailure = vi.fn();

		const result = await fetchNeteaseWeeklyRanking({
			env: rejectedEnv,
			fetchImpl: fetchImpl as typeof fetch,
			now: NOW,
			onFailure,
		});

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(result).toEqual({
			state: 'unavailable',
			generatedAt: NOW,
			tracks: [],
		});
		expect(onFailure).toHaveBeenCalledOnce();
		expect(onFailure).toHaveBeenCalledWith({
			reason: 'invalid-configuration',
		});
	});

	it.each([
		[
			'an upstream failure',
			() => Promise.resolve(new Response(null, { status: 500 })),
			{ reason: 'upstream-status', status: 500 },
		],
		[
			'a rejected redirect or request',
			() => Promise.reject(new TypeError('fetch failed')),
			{ reason: 'request-failed' },
		],
		[
			'an invalid JSON response',
			() => Promise.resolve(new Response('not json', { status: 200 })),
			{ reason: 'invalid-json' },
		],
		[
			'a response body timeout',
			() =>
				Promise.resolve(
					new Response(
						new ReadableStream({
							start(controller) {
								controller.error(new DOMException('timed out', 'TimeoutError'));
							},
						}),
						{ status: 200 },
					),
				),
			{ reason: 'timeout' },
		],
		[
			'a response body read failure',
			() =>
				Promise.resolve(
					new Response(
						new ReadableStream({
							start(controller) {
								controller.error(new TypeError('stream interrupted'));
							},
						}),
						{ status: 200 },
					),
				),
			{ reason: 'request-failed' },
		],
	] as const)('fails closed and reports %s', async (_label, responseFactory, expectedFailure) => {
		const fetchImpl = vi.fn().mockImplementation(responseFactory);
		const onFailure = vi.fn();

		const result = await fetchNeteaseWeeklyRanking({
			env,
			fetchImpl: fetchImpl as typeof fetch,
			now: NOW,
			onFailure,
		});

		expect(result).toEqual({
			state: 'unavailable',
			generatedAt: NOW,
			tracks: [],
		});
		expect(onFailure).toHaveBeenCalledOnce();
		expect(onFailure).toHaveBeenCalledWith(expectedFailure);
	});

	it('reports a structurally invalid upstream payload', async () => {
		const onFailure = vi.fn();

		const result = await fetchNeteaseWeeklyRanking({
			env,
			fetchImpl: vi
				.fn()
				.mockResolvedValue(jsonResponse({ code: 200, weekData: [{}] })),
			now: NOW,
			onFailure,
		});

		expect(result.state).toBe('unavailable');
		expect(onFailure).toHaveBeenCalledWith({ reason: 'invalid-payload' });
	});

	it('logs a categorized timeout without exposing configuration', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await fetchNeteaseWeeklyRanking({
			env,
			fetchImpl: vi
				.fn()
				.mockRejectedValue(new DOMException('timed out', 'TimeoutError')),
			now: NOW,
		});

		expect(warnSpy).toHaveBeenCalledWith('[netease-weekly]', {
			reason: 'timeout',
		});
		const logged = JSON.stringify(warnSpy.mock.calls);
		expect(logged).not.toContain(env.NETEASE_MUSIC_COOKIE);
		expect(logged).not.toContain(env.NETEASE_API_BASE_URL);
	});

	it('still fails closed when the diagnostic reporter throws', async () => {
		const result = await fetchNeteaseWeeklyRanking({
			env,
			fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
			now: NOW,
			onFailure: () => {
				throw new Error('telemetry unavailable');
			},
		});

		expect(result).toEqual({
			state: 'unavailable',
			generatedAt: NOW,
			tracks: [],
		});
	});
});
