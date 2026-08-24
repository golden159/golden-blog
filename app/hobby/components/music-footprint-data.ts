'use client';

import type {
	FootprintTrack,
	ListeningBucket,
	ListeningSlice,
	NeteaseListeningFootprint,
} from 'app/components/netease/footprint-types';
import useSWR from 'swr';

type UnknownRecord = Record<string, unknown>;

const MAX_DATE_MS = 8.64e15;
const bucketCounts = { today: 12, week: 7, month: 5, year: 12 } as const;

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isNonNegativeNumberOrNull = (value: unknown): value is number | null =>
	value === null ||
	(typeof value === 'number' && Number.isFinite(value) && value >= 0);

const isNonNegativeIntegerOrNull = (value: unknown): value is number | null =>
	isNonNegativeNumberOrNull(value) &&
	(value === null || Number.isInteger(value));

const isNonNegativeInteger = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	value >= 0 &&
	Number.isInteger(value);

const isSafeTimestampOrNull = (value: unknown): value is number | null =>
	value === null ||
	(typeof value === 'number' &&
		Number.isFinite(value) &&
		Math.abs(value) <= MAX_DATE_MS);

const isSafeTimestamp = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	Math.abs(value) <= MAX_DATE_MS;

const isTrustedAlbumArtUrl = (value: unknown): value is string | null => {
	if (value === null) return true;
	if (!nonEmptyString(value)) return false;

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
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		const songIds = url.searchParams.getAll('id');
		return (
			url.protocol === 'https:' &&
			url.hostname === 'music.163.com' &&
			url.pathname === '/song' &&
			songIds.length === 1 &&
			/^\d+$/.test(songIds[0])
		);
	} catch {
		return false;
	}
};

const normalizeBucket = (value: unknown): ListeningBucket | null => {
	const bucket = asRecord(value);
	if (
		!bucket ||
		!nonEmptyString(bucket.label) ||
		!isNonNegativeNumberOrNull(bucket.durationMs) ||
		!isNonNegativeIntegerOrNull(bucket.recordCount)
	) {
		return null;
	}
	return {
		label: bucket.label,
		durationMs: bucket.durationMs,
		recordCount: bucket.recordCount,
	};
};

const normalizeSlice = (
	value: unknown,
	bucketCount: number,
): ListeningSlice | null => {
	const slice = asRecord(value);
	if (
		!slice ||
		!isNonNegativeNumberOrNull(slice.durationMs) ||
		!isNonNegativeIntegerOrNull(slice.recordCount) ||
		!isNonNegativeIntegerOrNull(slice.uniqueTrackCount) ||
		!(slice.topArtist === null || nonEmptyString(slice.topArtist)) ||
		!(slice.topTrack === null || nonEmptyString(slice.topTrack)) ||
		!Array.isArray(slice.buckets) ||
		slice.buckets.length !== bucketCount
	) {
		return null;
	}

	const buckets = slice.buckets.map(normalizeBucket);
	if (buckets.some((bucket) => bucket === null)) return null;

	return {
		durationMs: slice.durationMs,
		recordCount: slice.recordCount,
		uniqueTrackCount: slice.uniqueTrackCount,
		topArtist: slice.topArtist,
		topTrack: slice.topTrack,
		buckets: buckets as ListeningBucket[],
	};
};

const normalizeWeeklyHighlight = (value: unknown): FootprintTrack | null => {
	if (value === null) return null;
	const track = asRecord(value);
	if (
		!track ||
		!nonEmptyString(track.title) ||
		!Array.isArray(track.artists) ||
		track.artists.length === 0 ||
		!track.artists.every(nonEmptyString) ||
		!nonEmptyString(track.album) ||
		!isTrustedAlbumArtUrl(track.albumArtUrl) ||
		!isTrustedSongUrl(track.songUrl) ||
		!isNonNegativeNumberOrNull(track.durationMs)
	) {
		return null;
	}
	return {
		title: track.title,
		artists: [...track.artists],
		album: track.album,
		albumArtUrl: track.albumArtUrl,
		songUrl: track.songUrl,
		durationMs: track.durationMs,
	};
};

const unavailableSlice = (bucketCount: number): ListeningSlice => ({
	durationMs: null,
	recordCount: null,
	uniqueTrackCount: null,
	topArtist: null,
	topTrack: null,
	buckets: Array.from({ length: bucketCount }, (_, index) => ({
		label: `Unavailable ${index + 1}`,
		durationMs: null,
		recordCount: null,
	})),
});

export const unavailableMusicFootprint: NeteaseListeningFootprint = {
	state: 'unavailable',
	generatedAt: 0,
	timezone: 'Asia/Shanghai',
	coverage: {
		recentAvailable: false,
		recordCount: null,
		oldestPlayedAt: null,
		limit: 0,
		truncated: false,
	},
	today: unavailableSlice(bucketCounts.today),
	week: { durationMs: null, mondayDurationMs: null, recordCount: null },
	reports: {
		week: unavailableSlice(bucketCounts.week),
		month: unavailableSlice(bucketCounts.month),
		year: unavailableSlice(bucketCounts.year),
	},
	lifetime: {
		listenCount: null,
		estimatedDurationMs: null,
		sampleDurationMs: null,
		basis: null,
	},
	weeklyHighlight: null,
};

export const normalizeMusicFootprint = (
	value: unknown,
): NeteaseListeningFootprint => {
	const root = asRecord(value);
	const coverage = asRecord(root?.coverage);
	const week = asRecord(root?.week);
	const reports = asRecord(root?.reports);
	const lifetime = asRecord(root?.lifetime);
	if (
		!root ||
		(root.state !== 'ready' &&
			root.state !== 'partial' &&
			root.state !== 'unavailable') ||
		!isSafeTimestamp(root.generatedAt) ||
		root.timezone !== 'Asia/Shanghai' ||
		!coverage ||
		typeof coverage.recentAvailable !== 'boolean' ||
		!isNonNegativeIntegerOrNull(coverage.recordCount) ||
		!isSafeTimestampOrNull(coverage.oldestPlayedAt) ||
		!isNonNegativeInteger(coverage.limit) ||
		typeof coverage.truncated !== 'boolean' ||
		!week ||
		!isNonNegativeNumberOrNull(week.durationMs) ||
		!isNonNegativeNumberOrNull(week.mondayDurationMs) ||
		!isNonNegativeIntegerOrNull(week.recordCount) ||
		!reports ||
		!lifetime ||
		!isNonNegativeIntegerOrNull(lifetime.listenCount) ||
		!isNonNegativeNumberOrNull(lifetime.estimatedDurationMs) ||
		!isNonNegativeNumberOrNull(lifetime.sampleDurationMs) ||
		(lifetime.basis !== 'recent-median' &&
			lifetime.basis !== 'weekly-median' &&
			lifetime.basis !== null)
	) {
		return unavailableMusicFootprint;
	}

	const today = normalizeSlice(root.today, bucketCounts.today);
	const reportWeek = normalizeSlice(reports.week, bucketCounts.week);
	const reportMonth = normalizeSlice(reports.month, bucketCounts.month);
	const reportYear = normalizeSlice(reports.year, bucketCounts.year);
	const weeklyHighlight = normalizeWeeklyHighlight(root.weeklyHighlight);
	if (
		!today ||
		!reportWeek ||
		!reportMonth ||
		!reportYear ||
		(root.weeklyHighlight !== null && !weeklyHighlight)
	) {
		return unavailableMusicFootprint;
	}

	return {
		state: root.state,
		generatedAt: root.generatedAt,
		timezone: root.timezone,
		coverage: {
			recentAvailable: coverage.recentAvailable,
			recordCount: coverage.recordCount,
			oldestPlayedAt: coverage.oldestPlayedAt,
			limit: coverage.limit,
			truncated: coverage.truncated,
		},
		today,
		week: {
			durationMs: week.durationMs,
			mondayDurationMs: week.mondayDurationMs,
			recordCount: week.recordCount,
		},
		reports: { week: reportWeek, month: reportMonth, year: reportYear },
		lifetime: {
			listenCount: lifetime.listenCount,
			estimatedDurationMs: lifetime.estimatedDurationMs,
			sampleDurationMs: lifetime.sampleDurationMs,
			basis: lifetime.basis,
		},
		weeklyHighlight,
	};
};

export const fetchMusicFootprint = async (
	url: string,
): Promise<NeteaseListeningFootprint> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) return unavailableMusicFootprint;
		return normalizeMusicFootprint(await response.json());
	} catch {
		return unavailableMusicFootprint;
	}
};

export function useMusicFootprint(enabled = true) {
	return useSWR<NeteaseListeningFootprint>(
		enabled ? '/api/hobby/netease/footprint' : null,
		fetchMusicFootprint,
		{
			refreshInterval: 300_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
