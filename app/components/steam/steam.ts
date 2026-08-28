import 'server-only';
import { steamProfile } from 'app/hobby/content';
import { normalizeSteamActivity } from './normalize';
import { normalizeSteamLibrary } from './normalize-library';
import type { SteamActivityResponse, SteamLibraryResponse } from './types';
import { unavailableSteamActivity, unavailableSteamLibrary } from './types';

type SteamEnv = Partial<Record<'STEAM_WEB_API_KEY', string>>;

type FetchSteamOptions = {
	env?: SteamEnv;
	steamId?: string;
	profileUrl?: string;
	fetchImpl?: typeof fetch;
	now?: () => number;
};

const requestInit = (): RequestInit => ({
	method: 'GET',
	headers: {
		Accept: 'application/json',
		'User-Agent': 'golden-xzs-blog/1.0',
	},
	cache: 'no-store',
	redirect: 'error',
	signal: AbortSignal.timeout(5000),
});

const fetchJson = async (
	url: URL,
	fetchImpl: typeof fetch,
): Promise<unknown | null> => {
	try {
		const response = await fetchImpl(url.toString(), requestInit());
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
};

export async function fetchSteamActivity(
	options: FetchSteamOptions = {},
): Promise<SteamActivityResponse> {
	const env = options.env ?? (process.env as SteamEnv);
	const apiKey = env.STEAM_WEB_API_KEY?.trim();
	const steamId = options.steamId ?? steamProfile.userId;
	const profileUrl = options.profileUrl ?? steamProfile.url;
	const fetchImpl = options.fetchImpl ?? fetch;
	const now = options.now ?? Date.now;

	if (!apiKey || !/^\d{17}$/.test(steamId)) {
		return unavailableSteamActivity({ generatedAt: now() });
	}

	const summaryUrl = new URL(
		'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
	);
	summaryUrl.searchParams.set('key', apiKey);
	summaryUrl.searchParams.set('steamids', steamId);

	const recentUrl = new URL(
		'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/',
	);
	recentUrl.searchParams.set('key', apiKey);
	recentUrl.searchParams.set('steamid', steamId);
	recentUrl.searchParams.set('format', 'json');
	recentUrl.searchParams.set('count', '6');

	const [playerPayload, recentPayload] = await Promise.all([
		fetchJson(summaryUrl, fetchImpl),
		fetchJson(recentUrl, fetchImpl),
	]);

	return normalizeSteamActivity(
		playerPayload,
		recentPayload,
		steamId,
		profileUrl,
		now(),
	);
}

export async function fetchSteamLibrary(
	options: FetchSteamOptions = {},
): Promise<SteamLibraryResponse> {
	const env = options.env ?? (process.env as SteamEnv);
	const apiKey = env.STEAM_WEB_API_KEY?.trim();
	const steamId = options.steamId ?? steamProfile.userId;
	const fetchImpl = options.fetchImpl ?? fetch;
	const now = options.now ?? Date.now;

	if (!apiKey || !/^\d{17}$/.test(steamId)) {
		return unavailableSteamLibrary(now());
	}

	const ownedGamesUrl = new URL(
		'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
	);
	ownedGamesUrl.searchParams.set('key', apiKey);
	ownedGamesUrl.searchParams.set('steamid', steamId);
	ownedGamesUrl.searchParams.set('include_appinfo', 'true');
	ownedGamesUrl.searchParams.set('include_played_free_games', 'true');
	ownedGamesUrl.searchParams.set('format', 'json');

	const payload = await fetchJson(ownedGamesUrl, fetchImpl);
	return payload === null
		? unavailableSteamLibrary(now())
		: normalizeSteamLibrary(payload, now());
}
