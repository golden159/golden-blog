import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const validId = (value: unknown): string | null => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? String(value) : null;
	}
	return text(value);
};

const finiteNumber = (value: unknown): number | null => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const normalizeImageUrl = (value: unknown): string | null => {
	const raw = text(value);
	if (!raw) return null;

	try {
		const url = new URL(raw);
		if (url.protocol === 'http:') url.protocol = 'https:';
		const trustedHost =
			url.hostname === 'music.126.net' ||
			url.hostname.endsWith('.music.126.net');
		return url.protocol === 'https:' && trustedHost ? url.toString() : null;
	} catch {
		return null;
	}
};

export function normalizeWeeklyTrack(
	payload: unknown,
): NeteaseActivityResponse {
	const root = asRecord(payload);
	const weekData = root?.weekData;
	if (!Array.isArray(weekData)) return unavailableActivity();
	if (weekData.length === 0) return { state: 'empty', track: null };

	const song = asRecord(asRecord(weekData[0])?.song);
	const id = validId(song?.id);
	const title = text(song?.name);
	if (!id || !title) return unavailableActivity();

	const artistValues = Array.isArray(song?.ar) ? song.ar : [];
	const artists = artistValues
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	const album = asRecord(song?.al);
	const durationMs = finiteNumber(song?.dt);
	if (durationMs !== null && durationMs < 0) return unavailableActivity();

	return {
		state: 'weekly',
		track: {
			title,
			artists: artists.length > 0 ? artists : ['未知歌手'],
			album: text(album?.name) ?? '未知专辑',
			albumArtUrl: normalizeImageUrl(album?.picUrl),
			songUrl: `https://music.163.com/song?id=${encodeURIComponent(id)}`,
			playedAt: null,
			...(durationMs !== null ? { durationMs } : {}),
		},
	};
}
