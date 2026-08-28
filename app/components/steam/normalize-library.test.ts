import { describe, expect, it } from 'vitest';
import { normalizeSteamLibrary } from './normalize-library';

const generatedAt = 1_800_000_000_000;

describe('normalizeSteamLibrary', () => {
	it('normalizes, deduplicates, and sorts the owned library by lifetime playtime', () => {
		const result = normalizeSteamLibrary(
			{
				response: {
					game_count: 4,
					games: [
						{ appid: 20, name: ' Portal 2 ', playtime_forever: 900 },
						{ appid: 10, name: 'Balatro', playtime_forever: 1200 },
						{ appid: 30, name: 'A Short Hike', playtime_forever: 0 },
						{ appid: 20, name: 'Portal 2', playtime_forever: 1000 },
					],
				},
			},
			generatedAt,
		);

		expect(result).toEqual({
			state: 'ready',
			generatedAt,
			totalCount: 3,
			games: [
				{ appId: 10, name: 'Balatro', playtimeForeverMinutes: 1200 },
				{ appId: 20, name: 'Portal 2', playtimeForeverMinutes: 1000 },
				{ appId: 30, name: 'A Short Hike', playtimeForeverMinutes: 0 },
			],
		});
	});

	it('keeps valid games when a mixed payload contains invalid records', () => {
		const result = normalizeSteamLibrary(
			{
				response: {
					game_count: 3,
					games: [
						{ appid: -1, name: 'Invalid', playtime_forever: 10 },
						{ appid: 40, name: '', playtime_forever: 20 },
						{ appid: '50', name: 'Valid Game', playtime_forever: 30 },
					],
				},
			},
			generatedAt,
		);

		expect(result.state).toBe('ready');
		expect(result.games).toEqual([
			{ appId: 50, name: 'Valid Game', playtimeForeverMinutes: 30 },
		]);
		expect(result.totalCount).toBe(1);
	});

	it('returns empty for a public library with no owned games', () => {
		for (const payload of [
			{ response: { game_count: 0, games: [] } },
			{ response: { game_count: 0 } },
		]) {
			expect(normalizeSteamLibrary(payload, generatedAt)).toEqual({
				state: 'empty',
				generatedAt,
				totalCount: 0,
				games: [],
			});
		}
	});

	it('returns unavailable for a private, malformed, or wholly invalid library', () => {
		for (const payload of [
			null,
			{},
			{ response: {} },
			{ response: { game_count: 1, games: 'invalid' } },
			{
				response: {
					game_count: 1,
					games: [{ appid: 10, name: 'Broken', playtime_forever: -1 }],
				},
			},
		]) {
			expect(normalizeSteamLibrary(payload, generatedAt)).toEqual({
				state: 'unavailable',
				generatedAt,
				totalCount: 0,
				games: [],
			});
		}
	});
});
