// @vitest-environment node

import { steamProfile } from 'app/hobby/content';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSteamActivity, fetchSteamLibrary } from './steam';

const env = { STEAM_WEB_API_KEY: 'server-secret' };

const summaryPayload = {
	response: {
		players: [
			{
				steamid: steamProfile.userId,
				personaname: 'Golden',
				avatarfull: 'https://avatars.fastly.steamstatic.com/example_full.jpg',
				gameid: '1446780',
				gameextrainfo: 'MONSTER HUNTER RISE',
			},
		],
	},
};

const recentPayload = {
	response: {
		total_count: 1,
		games: [
			{
				appid: 1446780,
				name: 'MONSTER HUNTER RISE',
				playtime_2weeks: 60,
				playtime_forever: 120,
				img_icon_url: 'abcdef0123456789',
			},
		],
	},
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('fetchSteamActivity', () => {
	it('requests both public endpoints with the server-only key', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(summaryPayload)))
			.mockResolvedValueOnce(new Response(JSON.stringify(recentPayload)));

		const result = await fetchSteamActivity({
			env,
			fetchImpl,
			now: () => 1_800_000_000_000,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		const urls = fetchImpl.mock.calls.map(([input]) => String(input));
		expect(urls.some((url) => url.includes('GetPlayerSummaries'))).toBe(true);
		expect(urls.some((url) => url.includes('GetRecentlyPlayedGames'))).toBe(
			true,
		);
		for (const url of urls) {
			expect(new URL(url).searchParams.get('key')).toBe('server-secret');
			expect(
				new URL(url).searchParams.get('steamid') ??
					new URL(url).searchParams.get('steamids'),
			).toBe(steamProfile.userId);
		}

		for (const [, init] of fetchImpl.mock.calls) {
			expect(init).toMatchObject({
				method: 'GET',
				cache: 'no-store',
				redirect: 'error',
				headers: {
					Accept: 'application/json',
					'User-Agent': 'golden-xzs-blog/1.0',
				},
			});
			expect(init?.signal).toBeInstanceOf(AbortSignal);
		}
		expect(result.state).toBe('ready');
		expect(result.generatedAt).toBe(1_800_000_000_000);
		expect(JSON.stringify(result)).not.toContain('server-secret');
	});

	it('does not call Steam when the server-only key is missing', async () => {
		const fetchImpl = vi.fn();

		const result = await fetchSteamActivity({ env: {}, fetchImpl });

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			state: 'unavailable',
			profile: null,
			recentGames: [],
		});
	});

	it('retains a validated profile when the recent-games request fails', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(summaryPayload)))
			.mockResolvedValueOnce(
				new Response('upstream unavailable', { status: 503 }),
			);

		const result = await fetchSteamActivity({ env, fetchImpl });

		expect(result.state).toBe('unavailable');
		expect(result.profile?.personaName).toBe('Golden');
		expect(result.currentGame?.name).toBe('MONSTER HUNTER RISE');
		expect(result.recentGames).toEqual([]);
	});

	it('returns unavailable when the summary response is not usable', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(recentPayload)));

		const result = await fetchSteamActivity({ env, fetchImpl });

		expect(result).toMatchObject({
			state: 'unavailable',
			profile: null,
			currentGame: null,
			recentGames: [],
		});
	});
});

describe('fetchSteamLibrary', () => {
	it('requests owned games with app names and played free games enabled', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					response: {
						game_count: 1,
						games: [
							{
								appid: 2379780,
								name: 'Balatro',
								playtime_forever: 1611,
							},
						],
					},
				}),
			),
		);

		const result = await fetchSteamLibrary({
			env,
			fetchImpl,
			now: () => 1_800_000_000_000,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const [input, init] = fetchImpl.mock.calls[0];
		const url = new URL(String(input));
		expect(url.pathname).toContain('GetOwnedGames');
		expect(url.searchParams.get('key')).toBe('server-secret');
		expect(url.searchParams.get('steamid')).toBe(steamProfile.userId);
		expect(url.searchParams.get('include_appinfo')).toBe('true');
		expect(url.searchParams.get('include_played_free_games')).toBe('true');
		expect(url.searchParams.get('format')).toBe('json');
		expect(init).toMatchObject({ cache: 'no-store', redirect: 'error' });
		expect(result).toEqual({
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			totalCount: 1,
			games: [
				{
					appId: 2379780,
					name: 'Balatro',
					playtimeForeverMinutes: 1611,
				},
			],
		});
		expect(JSON.stringify(result)).not.toContain('server-secret');
	});

	it('does not request owned games without the server-only key', async () => {
		const fetchImpl = vi.fn();

		const result = await fetchSteamLibrary({ env: {}, fetchImpl });

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			state: 'unavailable',
			totalCount: 0,
			games: [],
		});
	});
});
