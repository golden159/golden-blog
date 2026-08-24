'use client';

import type { NeteaseActivityResponse } from 'app/components/netease/types';
import useSWR from 'swr';

export const unavailableMusicActivity: NeteaseActivityResponse = {
	state: 'unavailable',
	track: null,
};

export const musicStateLabels: Record<
	NeteaseActivityResponse['state'],
	string
> = {
	recent: '最近活跃',
	older: '最近听过',
	empty: '暂无记录',
	unavailable: '暂时不可用',
};

export const musicPreviewLabels: Record<
	NeteaseActivityResponse['state'],
	string
> = {
	recent: '最近播放',
	older: '最近听过',
	empty: '暂无最近歌曲',
	unavailable: '暂时无法获取',
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isActivityState = (
	value: unknown,
): value is NeteaseActivityResponse['state'] =>
	value === 'recent' ||
	value === 'older' ||
	value === 'empty' ||
	value === 'unavailable';

const isFiniteNumberOrNull = (value: unknown): value is number | null =>
	value === null || (typeof value === 'number' && Number.isFinite(value));

const MAX_DATE_MS = 8.64e15;

const isValidTimestampOrNull = (value: unknown): value is number | null =>
	isFiniteNumberOrNull(value) &&
	(value === null || Math.abs(value) <= MAX_DATE_MS);

const isTrustedAlbumArtUrl = (value: unknown): value is string | null => {
	if (value === null) {
		return true;
	}
	if (!nonEmptyString(value)) {
		return false;
	}

	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			(url.hostname === 'music.126.net' ||
				url.hostname.endsWith('.music.126.net'))
		);
	} catch {
		return false;
	}
};

const isTrustedSongUrl = (value: unknown): value is string => {
	if (!nonEmptyString(value)) {
		return false;
	}

	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			url.hostname === 'music.163.com' &&
			url.pathname === '/song' &&
			url.searchParams.has('id')
		);
	} catch {
		return false;
	}
};

export const normalizeMusicActivity = (
	value: unknown,
): NeteaseActivityResponse => {
	const root = asRecord(value);
	if (!root) {
		return unavailableMusicActivity;
	}

	const state = root?.state;
	if (!isActivityState(state)) {
		return unavailableMusicActivity;
	}

	if (root.track === null) {
		return state === 'empty' || state === 'unavailable'
			? { state, track: null }
			: unavailableMusicActivity;
	}
	if (state === 'empty' || state === 'unavailable') {
		return unavailableMusicActivity;
	}

	const rawTrack = asRecord(root.track);
	const artists = rawTrack?.artists;
	const albumArtUrl = rawTrack?.albumArtUrl;
	const durationMs = rawTrack?.durationMs;
	if (
		!rawTrack ||
		!nonEmptyString(rawTrack.title) ||
		!Array.isArray(artists) ||
		artists.length === 0 ||
		!artists.every(nonEmptyString) ||
		!nonEmptyString(rawTrack.album) ||
		!isTrustedAlbumArtUrl(albumArtUrl) ||
		!isTrustedSongUrl(rawTrack.songUrl) ||
		!isValidTimestampOrNull(rawTrack.playedAt) ||
		(durationMs !== undefined &&
			(typeof durationMs !== 'number' ||
				!Number.isFinite(durationMs) ||
				durationMs < 0))
	) {
		return unavailableMusicActivity;
	}

	return {
		state,
		track: {
			title: rawTrack.title,
			artists: [...artists],
			album: rawTrack.album,
			albumArtUrl,
			songUrl: rawTrack.songUrl,
			playedAt: rawTrack.playedAt,
			...(durationMs !== undefined ? { durationMs } : {}),
		},
	};
};

export const fetchMusicActivity = async (
	url: string,
): Promise<NeteaseActivityResponse> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			return unavailableMusicActivity;
		}

		return normalizeMusicActivity(await response.json());
	} catch {
		return unavailableMusicActivity;
	}
};

export function useMusicActivity(enabled = true) {
	return useSWR<NeteaseActivityResponse>(
		enabled ? '/api/hobby/netease' : null,
		fetchMusicActivity,
		{
			refreshInterval: 60_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
