import type { SteamLibraryGame, SteamLibraryResponse } from './types';
import { unavailableSteamLibrary } from './types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const nonEmptyText = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const nonNegativeInteger = (value: unknown): number | null => {
	const numberValue =
		typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
	return typeof numberValue === 'number' &&
		Number.isSafeInteger(numberValue) &&
		numberValue >= 0
		? numberValue
		: null;
};

const positiveInteger = (value: unknown): number | null => {
	const numberValue = nonNegativeInteger(value);
	return numberValue !== null && numberValue > 0 ? numberValue : null;
};

const timestamp = (value: number): boolean =>
	Number.isFinite(value) && value >= 0 && value <= 8.64e15;

const normalizeGame = (value: unknown): SteamLibraryGame | null => {
	const game = asRecord(value);
	const appId = positiveInteger(game?.appid);
	const name = nonEmptyText(game?.name);
	const playtimeForeverMinutes = nonNegativeInteger(game?.playtime_forever);

	if (!appId || !name || playtimeForeverMinutes === null) return null;

	return { appId, name, playtimeForeverMinutes };
};

const sortGames = (games: SteamLibraryGame[]): SteamLibraryGame[] =>
	games.sort(
		(a, b) =>
			b.playtimeForeverMinutes - a.playtimeForeverMinutes ||
			a.name.localeCompare(b.name, 'zh-CN'),
	);

export function normalizeSteamLibrary(
	payload: unknown,
	generatedAt: number,
): SteamLibraryResponse {
	if (!timestamp(generatedAt)) return unavailableSteamLibrary();

	const root = asRecord(payload);
	const response = asRecord(root?.response);
	const reportedCount = nonNegativeInteger(response?.game_count);
	const rawGames = response?.games;

	if (!response || reportedCount === null) {
		return unavailableSteamLibrary(generatedAt);
	}
	if (reportedCount === 0 && rawGames === undefined) {
		return { state: 'empty', generatedAt, totalCount: 0, games: [] };
	}
	if (!Array.isArray(rawGames)) return unavailableSteamLibrary(generatedAt);
	if (reportedCount === 0 && rawGames.length === 0) {
		return { state: 'empty', generatedAt, totalCount: 0, games: [] };
	}
	if (reportedCount > 0 && rawGames.length === 0) {
		return unavailableSteamLibrary(generatedAt);
	}

	const uniqueGames = new Map<number, SteamLibraryGame>();
	for (const rawGame of rawGames) {
		const game = normalizeGame(rawGame);
		if (!game) continue;
		const existing = uniqueGames.get(game.appId);
		if (
			!existing ||
			game.playtimeForeverMinutes > existing.playtimeForeverMinutes ||
			(game.playtimeForeverMinutes === existing.playtimeForeverMinutes &&
				game.name.localeCompare(existing.name, 'zh-CN') < 0)
		) {
			uniqueGames.set(game.appId, game);
		}
	}

	if (rawGames.length > 0 && uniqueGames.size === 0) {
		return unavailableSteamLibrary(generatedAt);
	}

	const games = sortGames([...uniqueGames.values()]);
	return {
		state: games.length > 0 ? 'ready' : 'empty',
		generatedAt,
		totalCount: games.length,
		games,
	};
}
