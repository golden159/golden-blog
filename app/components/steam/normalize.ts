import {
	STEAM_RECENT_GAMES_LIMIT,
	type SteamActivityResponse,
	type SteamCurrentGame,
	type SteamGame,
	type SteamProfile,
	unavailableSteamActivity,
} from './types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const nonEmptyText = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const positiveInteger = (value: unknown): number | null => {
	const numberValue =
		typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
	return typeof numberValue === 'number' &&
		Number.isSafeInteger(numberValue) &&
		numberValue > 0
		? numberValue
		: null;
};

const optionalMinutes = (
	value: unknown,
): { valid: boolean; value: number | null } => {
	if (value === undefined) return { valid: true, value: null };
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
		? { valid: true, value }
		: { valid: false, value: null };
};

const trustedAvatar = (value: unknown): string | null => {
	const raw = nonEmptyText(value);
	if (!raw) return null;

	try {
		const url = new URL(raw);
		const host = url.hostname.toLowerCase();
		return url.protocol === 'https:' &&
			(host === 'steamstatic.com' || host.endsWith('.steamstatic.com'))
			? url.toString()
			: null;
	} catch {
		return null;
	}
};

const gameIconUrl = (appId: number, hash: unknown): string | null => {
	if (typeof hash !== 'string' || !/^[a-f0-9]{8,64}$/i.test(hash)) {
		return null;
	}

	return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`;
};

const normalizeProfile = (
	payload: unknown,
	steamId: string,
	profileUrl: string,
): {
	profile: SteamProfile;
	currentAppId: number | null;
	currentName: string | null;
} | null => {
	const response = asRecord(asRecord(payload)?.response);
	const players = response?.players;
	if (!Array.isArray(players)) return null;

	const player = players
		.map(asRecord)
		.find((candidate) => candidate?.steamid === steamId);
	const personaName = nonEmptyText(player?.personaname);
	if (!player || !personaName) return null;

	return {
		profile: {
			steamId,
			personaName,
			profileUrl,
			avatarUrl: trustedAvatar(player.avatarfull),
		},
		currentAppId: positiveInteger(player.gameid),
		currentName: nonEmptyText(player.gameextrainfo),
	};
};

const normalizeGame = (value: unknown): SteamGame | null => {
	const game = asRecord(value);
	const appId = positiveInteger(game?.appid);
	const name = nonEmptyText(game?.name);
	const twoWeeks = optionalMinutes(game?.playtime_2weeks);
	const forever = optionalMinutes(game?.playtime_forever);

	if (!game || !appId || !name || !twoWeeks.valid || !forever.valid) {
		return null;
	}

	return {
		appId,
		name,
		iconUrl: gameIconUrl(appId, game.img_icon_url),
		playtime2WeeksMinutes: twoWeeks.value,
		playtimeForeverMinutes: forever.value,
	};
};

export function normalizeSteamActivity(
	playerPayload: unknown,
	recentPayload: unknown,
	steamId: string,
	profileUrl: string,
	generatedAt: number,
): SteamActivityResponse {
	const normalizedProfile = normalizeProfile(
		playerPayload,
		steamId,
		profileUrl,
	);
	if (!normalizedProfile) {
		return unavailableSteamActivity({ generatedAt });
	}

	const { profile, currentAppId, currentName } = normalizedProfile;
	const recentResponse = asRecord(asRecord(recentPayload)?.response);
	if (!recentResponse) {
		return unavailableSteamActivity({
			generatedAt,
			profile,
			currentGame:
				currentAppId && currentName
					? { appId: currentAppId, name: currentName, iconUrl: null }
					: null,
		});
	}

	const rawGames = recentResponse.games;
	if (rawGames !== undefined && !Array.isArray(rawGames)) {
		return unavailableSteamActivity({ generatedAt, profile });
	}

	const games = (Array.isArray(rawGames) ? rawGames : [])
		.map(normalizeGame)
		.filter((game): game is SteamGame => game !== null);
	if (Array.isArray(rawGames) && rawGames.length > 0 && games.length === 0) {
		return unavailableSteamActivity({ generatedAt, profile });
	}

	const matchingCurrentGame = currentAppId
		? games.find((game) => game.appId === currentAppId)
		: undefined;
	const currentGame: SteamCurrentGame | null =
		currentAppId && currentName
			? {
					appId: currentAppId,
					name: currentName,
					iconUrl: matchingCurrentGame?.iconUrl ?? null,
				}
			: null;
	const recentGames = games
		.filter((game) => game.appId !== currentAppId)
		.slice(0, STEAM_RECENT_GAMES_LIMIT);

	return {
		state: currentGame || recentGames.length > 0 ? 'ready' : 'empty',
		generatedAt,
		profile,
		currentGame,
		recentGames,
	};
}
