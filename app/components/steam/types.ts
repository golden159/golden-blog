export const STEAM_RECENT_GAMES_LIMIT = 5;

export type SteamProfile = {
	steamId: string;
	personaName: string;
	profileUrl: string;
	avatarUrl: string | null;
};

export type SteamCurrentGame = {
	appId: number;
	name: string;
	iconUrl: string | null;
};

export type SteamGame = SteamCurrentGame & {
	playtime2WeeksMinutes: number | null;
	playtimeForeverMinutes: number | null;
};

export type SteamActivityResponse = {
	state: 'ready' | 'empty' | 'unavailable';
	generatedAt: number;
	profile: SteamProfile | null;
	currentGame: SteamCurrentGame | null;
	recentGames: SteamGame[];
};

type UnavailableSteamActivityOptions = {
	generatedAt?: number;
	profile?: SteamProfile | null;
	currentGame?: SteamCurrentGame | null;
};

export const unavailableSteamActivity = (
	options: UnavailableSteamActivityOptions = {},
): SteamActivityResponse => ({
	state: 'unavailable',
	generatedAt: options.generatedAt ?? Date.now(),
	profile: options.profile ?? null,
	currentGame: options.currentGame ?? null,
	recentGames: [],
});
