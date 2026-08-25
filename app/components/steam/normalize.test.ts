import { describe, expect, it } from 'vitest';
import { normalizeSteamActivity } from './normalize';

const steamId = '76561198985102331';
const profileUrl = `https://steamcommunity.com/profiles/${steamId}/`;

const avatarUrl =
	'https://avatars.fastly.steamstatic.com/f0145aefde1fe5d7c7b72fb517dfc1e00cc4e9df_full.jpg';
const iconHash = '560dd364b52075b783424961a43c01f9b69fde15';

const summaryPayload = {
	response: {
		players: [
			{
				steamid: steamId,
				personaname: 'Golden',
				avatarfull: avatarUrl,
				gameid: '1446780',
				gameextrainfo: 'MONSTER HUNTER RISE',
			},
		],
	},
};

const recentPayload = {
	response: {
		total_count: 2,
		games: [
			{
				appid: 1446780,
				name: 'MONSTER HUNTER RISE',
				playtime_2weeks: 2328,
				playtime_forever: 2880,
				img_icon_url: iconHash,
			},
			{
				appid: 3241660,
				name: 'R.E.P.O.',
				playtime_2weeks: 198,
				playtime_forever: 918,
				img_icon_url: 'b8bf4770408fc369e15cebd42e0026a27b67aaa8',
			},
		],
	},
};

const normalize = (
	playerPayload: unknown = summaryPayload,
	recent: unknown = recentPayload,
) =>
	normalizeSteamActivity(
		playerPayload,
		recent,
		steamId,
		profileUrl,
		1_800_000_000_000,
	);

describe('normalizeSteamActivity', () => {
	it('normalizes the public profile, current game, and recent playtimes', () => {
		expect(normalize()).toEqual({
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			profile: {
				steamId,
				personaName: 'Golden',
				profileUrl,
				avatarUrl,
			},
			currentGame: {
				appId: 1446780,
				name: 'MONSTER HUNTER RISE',
				iconUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/1446780/${iconHash}.jpg`,
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
		});
	});

	it('keeps a profile and current game when the recent-games branch is unavailable', () => {
		const result = normalize(summaryPayload, null);

		expect(result.state).toBe('unavailable');
		expect(result.profile?.personaName).toBe('Golden');
		expect(result.currentGame).toEqual({
			appId: 1446780,
			name: 'MONSTER HUNTER RISE',
			iconUrl: null,
		});
		expect(result.recentGames).toEqual([]);
	});

	it('returns empty when Steam successfully reports no recent games', () => {
		const result = normalize(
			{
				response: {
					players: [
						{
							steamid: steamId,
							personaname: 'Golden',
							avatarfull: avatarUrl,
						},
					],
				},
			},
			{ response: {} },
		);

		expect(result.state).toBe('empty');
		expect(result.profile).not.toBeNull();
		expect(result.currentGame).toBeNull();
		expect(result.recentGames).toEqual([]);
	});

	it('limits recent games after removing the current game', () => {
		const games = Array.from({ length: 7 }, (_, index) => ({
			appid: index === 0 ? 1446780 : 500000 + index,
			name: index === 0 ? 'MONSTER HUNTER RISE' : `Game ${index}`,
			playtime_2weeks: index + 1,
			playtime_forever: index + 10,
			img_icon_url: 'abcdef0123456789',
		}));
		const result = normalize(summaryPayload, {
			response: { total_count: games.length, games },
		});

		expect(result.recentGames).toHaveLength(5);
		expect(result.recentGames.map((game) => game.appId)).toEqual([
			500001, 500002, 500003, 500004, 500005,
		]);
	});

	it('falls back to a safe null image for untrusted image inputs', () => {
		const result = normalize(
			{
				response: {
					players: [
						{
							...summaryPayload.response.players[0],
							avatarfull: 'http://evil.example/avatar.jpg',
						},
					],
				},
			},
			{
				response: {
					total_count: 1,
					games: [
						{
							...recentPayload.response.games[0],
							img_icon_url: 'not-a-hash',
						},
					],
				},
			},
		);

		expect(result.profile?.avatarUrl).toBeNull();
		expect(result.currentGame?.iconUrl).toBeNull();
		expect(result.recentGames).toEqual([]);
	});

	it('returns unavailable for an invalid profile or wholly invalid non-empty games', () => {
		expect(normalize({ response: { players: [] } })).toMatchObject({
			state: 'unavailable',
			profile: null,
			recentGames: [],
		});

		const invalidGames = normalize(summaryPayload, {
			response: {
				total_count: 1,
				games: [{ appid: -1, name: '', playtime_2weeks: -1 }],
			},
		});
		expect(invalidGames.state).toBe('unavailable');
	});
});
