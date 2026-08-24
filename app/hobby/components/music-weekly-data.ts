'use client';

import type {
	NeteaseWeeklyRanking,
	WeeklyRankingTrack,
} from 'app/components/netease/types';
import { NETEASE_WEEKLY_RANKING_LIMIT } from 'app/components/netease/types';
import useSWR from 'swr';

type UnknownRecord = Record<string, unknown>;

const MAX_DATE_MS = 8.64e15;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isSafeTimestamp = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	Math.abs(value) <= MAX_DATE_MS;

const isNonNegativeNumberOrNull = (value: unknown): value is number | null =>
	value === null ||
	(typeof value === 'number' && Number.isFinite(value) && value >= 0);

const isTrustedAlbumArtUrl = (value: unknown): value is string | null => {
	if (value === null) return true;
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		const trustedHost =
			url.hostname === 'music.126.net' ||
			url.hostname.endsWith('.music.126.net');
		return (
			url.protocol === 'https:' &&
			trustedHost &&
			!url.username &&
			!url.password &&
			!url.port
		);
	} catch {
		return false;
	}
};

const isTrustedSongUrl = (value: unknown): value is string => {
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		const entries = [...url.searchParams.entries()];
		return (
			url.origin === 'https://music.163.com' &&
			!url.username &&
			!url.password &&
			url.pathname === '/song' &&
			url.hash === '' &&
			entries.length === 1 &&
			entries[0][0] === 'id' &&
			/^[1-9]\d*$/.test(entries[0][1]) &&
			url.search === `?id=${entries[0][1]}`
		);
	} catch {
		return false;
	}
};

const normalizeTrack = (
	value: unknown,
	expectedRank: number,
): WeeklyRankingTrack | null => {
	const track = asRecord(value);
	if (
		!track ||
		track.rank !== expectedRank ||
		!nonEmptyString(track.title) ||
		!Array.isArray(track.artists) ||
		track.artists.length === 0 ||
		!track.artists.every(nonEmptyString) ||
		!nonEmptyString(track.album) ||
		!isTrustedAlbumArtUrl(track.albumArtUrl) ||
		!isTrustedSongUrl(track.songUrl) ||
		!isNonNegativeNumberOrNull(track.durationMs) ||
		!isNonNegativeNumberOrNull(track.playCount) ||
		!isNonNegativeNumberOrNull(track.score)
	) {
		return null;
	}

	return {
		rank: expectedRank,
		title: track.title,
		artists: [...track.artists],
		album: track.album,
		albumArtUrl: track.albumArtUrl,
		songUrl: track.songUrl,
		durationMs: track.durationMs,
		playCount: track.playCount,
		score: track.score,
	};
};

export const unavailableMusicWeeklyRanking: NeteaseWeeklyRanking = {
	state: 'unavailable',
	generatedAt: 0,
	tracks: [],
};

export const normalizeMusicWeeklyRanking = (
	value: unknown,
): NeteaseWeeklyRanking => {
	const root = asRecord(value);
	if (
		!root ||
		(root.state !== 'ready' &&
			root.state !== 'empty' &&
			root.state !== 'unavailable') ||
		!isSafeTimestamp(root.generatedAt) ||
		!Array.isArray(root.tracks) ||
		root.tracks.length > NETEASE_WEEKLY_RANKING_LIMIT
	) {
		return unavailableMusicWeeklyRanking;
	}

	if (root.state !== 'ready') {
		return root.tracks.length === 0
			? { state: root.state, generatedAt: root.generatedAt, tracks: [] }
			: unavailableMusicWeeklyRanking;
	}

	if (root.tracks.length === 0) return unavailableMusicWeeklyRanking;
	const tracks = root.tracks.map((track, index) =>
		normalizeTrack(track, index + 1),
	);
	if (tracks.some((track) => track === null)) {
		return unavailableMusicWeeklyRanking;
	}

	return {
		state: 'ready',
		generatedAt: root.generatedAt,
		tracks: tracks as WeeklyRankingTrack[],
	};
};

export const fetchMusicWeeklyRanking = async (
	url: string,
): Promise<NeteaseWeeklyRanking> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) return unavailableMusicWeeklyRanking;
		return normalizeMusicWeeklyRanking(await response.json());
	} catch {
		return unavailableMusicWeeklyRanking;
	}
};

export function useMusicWeeklyRanking(enabled = true) {
	return useSWR<NeteaseWeeklyRanking>(
		enabled ? '/api/hobby/netease/weekly' : null,
		fetchMusicWeeklyRanking,
		{
			refreshInterval: 300_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
