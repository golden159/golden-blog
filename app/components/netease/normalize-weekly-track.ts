import type {
	NeteaseActivityResponse,
	NeteaseWeeklyRanking,
	WeeklyRankingTrack,
} from './types';
import { NETEASE_WEEKLY_RANKING_LIMIT, unavailableActivity } from './types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const validId = (value: unknown): string | null => {
	if (typeof value === 'number') {
		return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
	}
	const raw = text(value);
	return raw && /^[1-9]\d*$/.test(raw) ? raw : null;
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

const nonNegativeNumber = (value: unknown): number | null => {
	const normalized = finiteNumber(value);
	return normalized !== null && normalized >= 0 ? normalized : null;
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
		return url.protocol === 'https:' &&
			trustedHost &&
			!url.username &&
			!url.password &&
			!url.port
			? url.toString()
			: null;
	} catch {
		return null;
	}
};

const normalizeRankingEntry = (
	value: unknown,
): Omit<WeeklyRankingTrack, 'rank'> | null => {
	const record = asRecord(value);
	const song = asRecord(record?.song);
	const id = validId(song?.id);
	const title = text(song?.name);
	if (!id || !title) return null;

	const artistValues = Array.isArray(song?.ar) ? song.ar : [];
	const artists = artistValues
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	const album = asRecord(song?.al);
	const durationMs = finiteNumber(song?.dt);
	if (durationMs !== null && durationMs < 0) {
		return null;
	}

	return {
		title,
		artists: artists.length > 0 ? artists : ['未知歌手'],
		album: text(album?.name) ?? '未知专辑',
		albumArtUrl: normalizeImageUrl(album?.picUrl),
		songUrl: `https://music.163.com/song?id=${id}`,
		durationMs,
		playCount: nonNegativeNumber(record?.playCount),
		score: nonNegativeNumber(record?.score),
	};
};

export function normalizeWeeklyRanking(
	payload: unknown,
	now = Date.now(),
): NeteaseWeeklyRanking {
	const root = asRecord(payload);
	if (root?.code !== undefined && root.code !== 200) {
		return { state: 'unavailable', generatedAt: now, tracks: [] };
	}

	const weekData = root?.weekData;
	if (!Array.isArray(weekData)) {
		return { state: 'unavailable', generatedAt: now, tracks: [] };
	}
	if (weekData.length === 0) {
		return { state: 'empty', generatedAt: now, tracks: [] };
	}

	const tracks: WeeklyRankingTrack[] = [];
	for (const entry of weekData) {
		const track = normalizeRankingEntry(entry);
		if (!track) continue;
		tracks.push({ ...track, rank: tracks.length + 1 });
		if (tracks.length === NETEASE_WEEKLY_RANKING_LIMIT) break;
	}

	return tracks.length > 0
		? { state: 'ready', generatedAt: now, tracks }
		: { state: 'unavailable', generatedAt: now, tracks: [] };
}

export function normalizeWeeklyTrack(
	payload: unknown,
): NeteaseActivityResponse {
	const ranking = normalizeWeeklyRanking(payload);
	if (ranking.state === 'empty') return { state: 'empty', track: null };
	const firstTrack = ranking.tracks[0];
	if (!firstTrack) return unavailableActivity();

	return {
		state: 'weekly',
		track: {
			title: firstTrack.title,
			artists: firstTrack.artists,
			album: firstTrack.album,
			albumArtUrl: firstTrack.albumArtUrl,
			songUrl: firstTrack.songUrl,
			playedAt: null,
			...(firstTrack.durationMs !== null
				? { durationMs: firstTrack.durationMs }
				: {}),
		},
	};
}
