import { afterEach, describe, expect, it, vi } from 'vitest';
import { steamProfile } from '../content';
import {
	fetchSteamActivity,
	normalizeSteamActivity,
	unavailableSteamActivity,
} from './steam-activity';

const readyActivity = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	profile: {
		steamId: steamProfile.userId,
		personaName: 'Golden',
		profileUrl: steamProfile.url,
		avatarUrl:
			'https://avatars.fastly.steamstatic.com/f0145aefde1fe5d7c7b72fb517dfc1e00cc4e9df_full.jpg',
	},
	currentGame: {
		appId: 1446780,
		name: 'MONSTER HUNTER RISE',
		iconUrl:
			'https://media.steampowered.com/steamcommunity/public/images/apps/1446780/560dd364b52075b783424961a43c01f9b69fde15.jpg',
	},
	recentGames: [
		{
			appId: 3241660,
			name: 'R.E.P.O.',
			iconUrl:
				'https://media.steampowered.com/steamcommunity/public/images/apps/3241660/b8bf4770408fc369e15cebd42e0026a27b67aaa8.jpg',
			playtime2WeeksMinutes: 198,
			playtimeForeverMinutes: 918,
		},
	],
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('normalizeSteamActivity', () => {
	it('accepts a coherent public activity response', () => {
		expect(normalizeSteamActivity(readyActivity)).toEqual(readyActivity);
	});

	it('keeps validated profile data in the unavailable state', () => {
		const result = normalizeSteamActivity({
			...readyActivity,
			state: 'unavailable',
			recentGames: [],
		});

		expect(result.state).toBe('unavailable');
		expect(result.profile?.personaName).toBe('Golden');
		expect(result.currentGame?.name).toBe('MONSTER HUNTER RISE');
	});

	it('rejects untrusted URLs and contradictory state', () => {
		for (const value of [
			{
				...readyActivity,
				profile: {
					...readyActivity.profile,
					avatarUrl: 'https://evil.test/a.jpg',
				},
			},
			{
				...readyActivity,
				profile: { ...readyActivity.profile, steamId: '76561198000000000' },
			},
			{
				...readyActivity,
				state: 'empty',
			},
			{
				...readyActivity,
				recentGames: [
					{
						...readyActivity.recentGames[0],
						iconUrl: 'https://evil.test/game.jpg',
					},
				],
			},
		]) {
			expect(normalizeSteamActivity(value)).toEqual(unavailableSteamActivity);
		}
	});

	it('rejects duplicate, excessive, or invalid recent games', () => {
		const duplicateCurrent = {
			...readyActivity.recentGames[0],
			appId: readyActivity.currentGame.appId,
		};
		const tooMany = Array.from({ length: 6 }, (_, index) => ({
			...readyActivity.recentGames[0],
			appId: 500000 + index,
			name: `Game ${index}`,
			iconUrl: null,
		}));

		for (const recentGames of [
			[duplicateCurrent],
			tooMany,
			[{ ...readyActivity.recentGames[0], playtimeForeverMinutes: -1 }],
		]) {
			expect(normalizeSteamActivity({ ...readyActivity, recentGames })).toEqual(
				unavailableSteamActivity,
			);
		}
	});
});

describe('fetchSteamActivity', () => {
	it('normalizes a successful local API response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(readyActivity))),
		);

		expect(await fetchSteamActivity('/api/hobby/steam')).toEqual(readyActivity);
	});

	it('returns unavailable after HTTP or network errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('unavailable', { status: 503 })),
		);
		expect(await fetchSteamActivity('/api/hobby/steam')).toEqual(
			unavailableSteamActivity,
		);

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('offline');
			}),
		);
		expect(await fetchSteamActivity('/api/hobby/steam')).toEqual(
			unavailableSteamActivity,
		);
	});
});
