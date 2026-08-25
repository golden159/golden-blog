'use client';

import type {
	SteamActivityResponse,
	SteamCurrentGame,
	SteamGame,
	SteamProfile,
} from 'app/components/steam/types';
import useSWR from 'swr';
import { steamProfile } from '../content';

export const unavailableSteamActivity: SteamActivityResponse = {
	state: 'unavailable',
	generatedAt: 0,
	profile: null,
	currentGame: null,
	recentGames: [],
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const positiveInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const minutesOrNull = (value: unknown): value is number | null =>
	value === null ||
	(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);

const timestamp = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	value >= 0 &&
	value <= 8.64e15;

const trustedAvatar = (value: unknown): value is string | null => {
	if (value === null) return true;
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase();
		return (
			url.protocol === 'https:' &&
			(host === 'steamstatic.com' || host.endsWith('.steamstatic.com'))
		);
	} catch {
		return false;
	}
};

const trustedGameIcon = (
	value: unknown,
	appId: number,
): value is string | null => {
	if (value === null) return true;
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			url.hostname === 'media.steampowered.com' &&
			new RegExp(
				`^/steamcommunity/public/images/apps/${appId}/[a-f0-9]{8,64}\\.jpg$`,
				'i',
			).test(url.pathname) &&
			url.search === '' &&
			url.hash === ''
		);
	} catch {
		return false;
	}
};

const normalizeProfile = (value: unknown): SteamProfile | null => {
	const profile = asRecord(value);
	if (
		!profile ||
		profile.steamId !== steamProfile.userId ||
		profile.profileUrl !== steamProfile.url ||
		!nonEmptyString(profile.personaName) ||
		!trustedAvatar(profile.avatarUrl)
	) {
		return null;
	}

	return {
		steamId: profile.steamId,
		personaName: profile.personaName,
		profileUrl: profile.profileUrl,
		avatarUrl: profile.avatarUrl,
	};
};

const normalizeCurrentGame = (value: unknown): SteamCurrentGame | null => {
	if (value === null) return null;
	const game = asRecord(value);
	if (
		!game ||
		!positiveInteger(game.appId) ||
		!nonEmptyString(game.name) ||
		!trustedGameIcon(game.iconUrl, game.appId)
	) {
		return null;
	}

	return {
		appId: game.appId,
		name: game.name,
		iconUrl: game.iconUrl,
	};
};

const normalizeGame = (value: unknown): SteamGame | null => {
	const game = asRecord(value);
	if (
		!game ||
		!positiveInteger(game.appId) ||
		!nonEmptyString(game.name) ||
		!trustedGameIcon(game.iconUrl, game.appId) ||
		!minutesOrNull(game.playtime2WeeksMinutes) ||
		!minutesOrNull(game.playtimeForeverMinutes)
	) {
		return null;
	}

	return {
		appId: game.appId,
		name: game.name,
		iconUrl: game.iconUrl,
		playtime2WeeksMinutes: game.playtime2WeeksMinutes,
		playtimeForeverMinutes: game.playtimeForeverMinutes,
	};
};

export const normalizeSteamActivity = (
	value: unknown,
): SteamActivityResponse => {
	const root = asRecord(value);
	if (
		!root ||
		(root.state !== 'ready' &&
			root.state !== 'empty' &&
			root.state !== 'unavailable') ||
		!timestamp(root.generatedAt) ||
		!Array.isArray(root.recentGames) ||
		root.recentGames.length > 5
	) {
		return unavailableSteamActivity;
	}

	const profile = root.profile === null ? null : normalizeProfile(root.profile);
	const currentGame = normalizeCurrentGame(root.currentGame);
	const recentGames = root.recentGames.map(normalizeGame);
	if (
		(root.profile !== null && !profile) ||
		(root.currentGame !== null && !currentGame) ||
		recentGames.some((game) => game === null)
	) {
		return unavailableSteamActivity;
	}

	const games = recentGames as SteamGame[];
	const gameIds = new Set(games.map((game) => game.appId));
	if (
		gameIds.size !== games.length ||
		(currentGame !== null && gameIds.has(currentGame.appId))
	) {
		return unavailableSteamActivity;
	}

	const coherent =
		(root.state === 'ready' &&
			profile !== null &&
			(currentGame !== null || games.length > 0)) ||
		(root.state === 'empty' &&
			profile !== null &&
			currentGame === null &&
			games.length === 0) ||
		(root.state === 'unavailable' &&
			games.length === 0 &&
			(currentGame === null || profile !== null));
	if (!coherent) return unavailableSteamActivity;

	return {
		state: root.state,
		generatedAt: root.generatedAt,
		profile,
		currentGame,
		recentGames: games,
	};
};

export const fetchSteamActivity = async (
	url: string,
): Promise<SteamActivityResponse> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) return unavailableSteamActivity;
		return normalizeSteamActivity(await response.json());
	} catch {
		return unavailableSteamActivity;
	}
};

export function useSteamActivity(enabled = true) {
	return useSWR<SteamActivityResponse>(
		enabled ? '/api/hobby/steam' : null,
		fetchSteamActivity,
		{
			refreshInterval: 60_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
