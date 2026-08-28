import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	fetchSteamLibraryData,
	normalizeSteamLibrary,
	unavailableSteamLibrary,
} from './steam-library-data';

const readyLibrary = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	totalCount: 2,
	games: [
		{ appId: 10, name: 'Balatro', playtimeForeverMinutes: 1600 },
		{ appId: 20, name: 'Portal 2', playtimeForeverMinutes: 0 },
	],
} as const;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('normalizeSteamLibrary', () => {
	it('accepts a coherent public library response', () => {
		expect(normalizeSteamLibrary(readyLibrary)).toEqual(readyLibrary);
	});

	it('accepts coherent empty and unavailable responses', () => {
		for (const state of ['empty', 'unavailable'] as const) {
			expect(
				normalizeSteamLibrary({
					state,
					generatedAt: 1_800_000_000_000,
					totalCount: 0,
					games: [],
				}),
			).toEqual({
				state,
				generatedAt: 1_800_000_000_000,
				totalCount: 0,
				games: [],
			});
		}
	});

	it('rejects malformed, duplicated, oversized, or incoherent payloads', () => {
		const oversizedGames = Array.from({ length: 5001 }, (_, index) => ({
			appId: index + 1,
			name: `Game ${index + 1}`,
			playtimeForeverMinutes: 0,
		}));
		const invalidPayloads = [
			null,
			{ ...readyLibrary, state: 'private' },
			{ ...readyLibrary, generatedAt: Number.POSITIVE_INFINITY },
			{ ...readyLibrary, totalCount: 1 },
			{
				...readyLibrary,
				games: [readyLibrary.games[0], readyLibrary.games[0]],
			},
			{
				...readyLibrary,
				totalCount: oversizedGames.length,
				games: oversizedGames,
			},
			{
				...readyLibrary,
				games: [
					{ appId: -1, name: 'Broken', playtimeForeverMinutes: 0 },
					readyLibrary.games[1],
				],
			},
			{ ...readyLibrary, state: 'empty' },
		];

		for (const value of invalidPayloads) {
			expect(normalizeSteamLibrary(value)).toEqual(unavailableSteamLibrary);
		}
	});
});

describe('fetchSteamLibraryData', () => {
	it('returns a validated response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(readyLibrary)),
		);

		expect(await fetchSteamLibraryData('/api/hobby/steam/library')).toEqual(
			readyLibrary,
		);
		expect(fetch).toHaveBeenCalledWith('/api/hobby/steam/library', {
			cache: 'no-store',
		});
	});

	it('falls back safely for failed or invalid responses', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('upstream failed', { status: 503 }),
		);
		expect(await fetchSteamLibraryData('/api/hobby/steam/library')).toEqual(
			unavailableSteamLibrary,
		);

		vi.mocked(fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ state: 'ready', games: [] })),
		);
		expect(await fetchSteamLibraryData('/api/hobby/steam/library')).toEqual(
			unavailableSteamLibrary,
		);
	});
});
