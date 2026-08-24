import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

const RECENT_WINDOW_MS = 15 * 60_000;

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeImageUrl = (value: unknown): string | null => {
	const raw = text(value);
	if (!raw) {
		return null;
	}

	try {
		const url = new URL(raw);
		if (url.protocol === 'http:') {
			url.protocol = 'https:';
		}
		const isNeteaseImageHost =
			url.hostname === 'music.126.net' ||
			url.hostname.endsWith('.music.126.net');
		return url.protocol === 'https:' && isNeteaseImageHost
			? url.toString()
			: null;
	} catch {
		return null;
	}
};

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

const MAX_DATE_MS = 8.64e15;

export function normalizeRecentTrack(
	payload: unknown,
	now = Date.now(),
): NeteaseActivityResponse {
	const root = asRecord(payload);
	const data = asRecord(root?.data);
	const list = data?.list;

	if (!Array.isArray(list)) {
		return unavailableActivity();
	}
	if (list.length === 0) {
		return { state: 'empty', track: null };
	}

	const record = asRecord(list[0]);
	const song = asRecord(record?.data);
	const id = validId(song?.id);
	const title = text(song?.name);

	if (!id || !title) {
		return unavailableActivity();
	}

	const artistValues = Array.isArray(song?.ar) ? song.ar : [];
	const artists = artistValues
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	const album = asRecord(song?.al);
	const rawPlayedAt = record?.playTime;
	const playedAt = finiteNumber(rawPlayedAt);
	if (
		rawPlayedAt !== undefined &&
		rawPlayedAt !== null &&
		(playedAt === null || Math.abs(playedAt) > MAX_DATE_MS)
	) {
		return unavailableActivity();
	}
	const durationMs = finiteNumber(song?.dt);
	const elapsed = playedAt === null ? null : now - playedAt;
	const state =
		elapsed !== null && elapsed >= 0 && elapsed <= RECENT_WINDOW_MS
			? 'recent'
			: 'older';

	const track = {
		title,
		artists: artists.length > 0 ? artists : ['未知歌手'],
		album: text(album?.name) ?? '未知专辑',
		albumArtUrl: normalizeImageUrl(album?.picUrl),
		songUrl: `https://music.163.com/song?id=${encodeURIComponent(id)}`,
		playedAt,
		...(durationMs !== null ? { durationMs } : {}),
	};

	return {
		state,
		track,
	};
}
