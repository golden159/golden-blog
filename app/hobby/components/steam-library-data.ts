'use client';

import type {
	SteamLibraryGame,
	SteamLibraryResponse,
} from 'app/components/steam/types';
import useSWR from 'swr';

export const unavailableSteamLibrary: SteamLibraryResponse = {
	state: 'unavailable',
	generatedAt: 0,
	totalCount: 0,
	games: [],
};

const STEAM_LIBRARY_GAMES_LIMIT = 5000;

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' &&
	value.trim().length > 0 &&
	value === value.trim();

const nonNegativeInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const positiveInteger = (value: unknown): value is number =>
	nonNegativeInteger(value) && value > 0;

const timestamp = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	value >= 0 &&
	value <= 8.64e15;

const normalizeGame = (value: unknown): SteamLibraryGame | null => {
	const game = asRecord(value);
	if (
		!game ||
		!positiveInteger(game.appId) ||
		!nonEmptyString(game.name) ||
		!nonNegativeInteger(game.playtimeForeverMinutes)
	) {
		return null;
	}

	return {
		appId: game.appId,
		name: game.name,
		playtimeForeverMinutes: game.playtimeForeverMinutes,
	};
};

export const normalizeSteamLibrary = (value: unknown): SteamLibraryResponse => {
	const root = asRecord(value);
	if (
		!root ||
		(root.state !== 'ready' &&
			root.state !== 'empty' &&
			root.state !== 'unavailable') ||
		!timestamp(root.generatedAt) ||
		!nonNegativeInteger(root.totalCount) ||
		!Array.isArray(root.games) ||
		root.games.length > STEAM_LIBRARY_GAMES_LIMIT ||
		root.totalCount !== root.games.length
	) {
		return unavailableSteamLibrary;
	}

	const games = root.games.map(normalizeGame);
	if (games.some((game) => game === null)) return unavailableSteamLibrary;
	const normalizedGames = games as SteamLibraryGame[];
	if (
		new Set(normalizedGames.map((game) => game.appId)).size !== games.length
	) {
		return unavailableSteamLibrary;
	}

	const coherent =
		(root.state === 'ready' && normalizedGames.length > 0) ||
		((root.state === 'empty' || root.state === 'unavailable') &&
			normalizedGames.length === 0);
	if (!coherent) return unavailableSteamLibrary;

	return {
		state: root.state,
		generatedAt: root.generatedAt,
		totalCount: root.totalCount,
		games: normalizedGames,
	};
};

export const fetchSteamLibraryData = async (
	url: string,
): Promise<SteamLibraryResponse> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) return unavailableSteamLibrary;
		return normalizeSteamLibrary(await response.json());
	} catch {
		return unavailableSteamLibrary;
	}
};

export function useSteamLibrary(enabled = true) {
	return useSWR<SteamLibraryResponse>(
		enabled ? '/api/hobby/steam/library' : null,
		fetchSteamLibraryData,
		{
			refreshInterval: 0,
			revalidateOnFocus: false,
			shouldRetryOnError: false,
		},
	);
}
