import type {
	FootprintTrack,
	ListeningBucket,
	ListeningSlice,
	NeteaseListeningFootprint,
} from './footprint-types';

const SHANGHAI_OFFSET_MS = 8 * 60 * 60_000;
const MAX_DATE_MS = 8.64e15;
const TODAY_LABELS = [
	'00:00',
	'02:00',
	'04:00',
	'06:00',
	'08:00',
	'10:00',
	'12:00',
	'14:00',
	'16:00',
	'18:00',
	'20:00',
	'22:00',
] as const;
const WEEK_LABELS = [
	'周一',
	'周二',
	'周三',
	'周四',
	'周五',
	'周六',
	'周日',
] as const;
const MONTH_LABELS = [
	'1-7日',
	'8-14日',
	'15-21日',
	'22-28日',
	'29-31日',
] as const;
const YEAR_LABELS = [
	'1月',
	'2月',
	'3月',
	'4月',
	'5月',
	'6月',
	'7月',
	'8月',
	'9月',
	'10月',
	'11月',
	'12月',
] as const;

type UnknownRecord = Record<string, unknown>;

type ListeningRecord = {
	playedAt: number;
	durationMs: number;
	trackId: string;
	title: string;
	artists: string[];
	index: number;
};

export type NormalizeListeningFootprintOptions = {
	recentPayload: unknown;
	weeklyPayload: unknown;
	detailPayload: unknown;
	now?: number;
	recentLimit?: number;
};

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const hasSuccessfulCode = (value: UnknownRecord | null): boolean =>
	value !== null && (!Object.hasOwn(value, 'code') || value.code === 200);

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const finiteNumber = (value: unknown): number | null => {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const validId = (value: unknown): string | null => {
	if (typeof value === 'number')
		return Number.isFinite(value) ? String(value) : null;
	return text(value);
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

const localDate = (timestamp: number) =>
	new Date(timestamp + SHANGHAI_OFFSET_MS);

const localDayStart = (timestamp: number) => {
	const date = localDate(timestamp);
	return (
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
		SHANGHAI_OFFSET_MS
	);
};

const localWeekStart = (timestamp: number) => {
	const dayStart = localDayStart(timestamp);
	const day = localDate(timestamp).getUTCDay();
	const daysSinceMonday = day === 0 ? 6 : day - 1;
	return dayStart - daysSinceMonday * 24 * 60 * 60_000;
};

const emptyBuckets = (
	labels: readonly string[],
	available: boolean,
): ListeningBucket[] =>
	labels.map((label) => ({
		label,
		durationMs: available ? 0 : null,
		recordCount: available ? 0 : null,
	}));

const emptySlice = (
	labels: readonly string[],
	available: boolean,
): ListeningSlice => ({
	durationMs: available ? 0 : null,
	recordCount: available ? 0 : null,
	uniqueTrackCount: available ? 0 : null,
	topArtist: null,
	topTrack: null,
	buckets: emptyBuckets(labels, available),
});

const inRange = (record: ListeningRecord, start: number, end: number) =>
	record.playedAt >= start && record.playedAt < end;

const chooseTop = (
	values: Array<{ name: string; playedAt: number; index: number }>,
): string | null => {
	const counts = new Map<
		string,
		{ count: number; playedAt: number; index: number }
	>();
	for (const value of values) {
		const existing = counts.get(value.name);
		if (!existing) {
			counts.set(value.name, {
				count: 1,
				playedAt: value.playedAt,
				index: value.index,
			});
			continue;
		}
		existing.count += 1;
		if (
			value.playedAt > existing.playedAt ||
			(value.playedAt === existing.playedAt && value.index < existing.index)
		) {
			existing.playedAt = value.playedAt;
			existing.index = value.index;
		}
	}

	let top: {
		name: string;
		count: number;
		playedAt: number;
		index: number;
	} | null = null;
	for (const [name, value] of counts) {
		if (
			!top ||
			value.count > top.count ||
			(value.count === top.count && value.playedAt > top.playedAt) ||
			(value.count === top.count &&
				value.playedAt === top.playedAt &&
				value.index < top.index)
		) {
			top = { name, ...value };
		}
	}
	return top?.name ?? null;
};

const aggregateSlice = (
	records: ListeningRecord[],
	labels: readonly string[],
	bucketIndex: (record: ListeningRecord) => number | null,
	available: boolean,
): ListeningSlice => {
	const slice = emptySlice(labels, available);
	if (!available) return slice;

	slice.durationMs = records.reduce(
		(sum, record) => sum + record.durationMs,
		0,
	);
	slice.recordCount = records.length;
	slice.uniqueTrackCount = new Set(
		records.map((record) => record.trackId),
	).size;
	slice.topArtist = chooseTop(
		records.flatMap((record) =>
			record.artists.map((name) => ({
				name,
				playedAt: record.playedAt,
				index: record.index,
			})),
		),
	);
	slice.topTrack = chooseTop(
		records.map((record) => ({
			name: record.title,
			playedAt: record.playedAt,
			index: record.index,
		})),
	);

	for (const record of records) {
		const index = bucketIndex(record);
		if (index === null || !slice.buckets[index]) continue;
		const bucket = slice.buckets[index];
		bucket.durationMs = (bucket.durationMs ?? 0) + record.durationMs;
		bucket.recordCount = (bucket.recordCount ?? 0) + 1;
	}
	return slice;
};

const normalizeRecentRecord = (
	value: unknown,
	index: number,
	now: number,
): ListeningRecord | null => {
	const record = asRecord(value);
	const song = asRecord(record?.data);
	const playedAt = finiteNumber(record?.playTime);
	const durationMs = finiteNumber(song?.dt);
	const trackId = validId(song?.id);
	const title = text(song?.name);
	if (
		playedAt === null ||
		durationMs === null ||
		!trackId ||
		!title ||
		playedAt < 0 ||
		playedAt > MAX_DATE_MS ||
		playedAt > now ||
		durationMs < 0
	) {
		return null;
	}

	const artists = (Array.isArray(song?.ar) ? song.ar : [])
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	return {
		playedAt,
		durationMs,
		trackId,
		title,
		artists: artists.length > 0 ? artists : ['未知歌手'],
		index,
	};
};

const normalizeFootprintTrack = (value: unknown): FootprintTrack | null => {
	const song = asRecord(value);
	const id = validId(song?.id);
	const title = text(song?.name);
	if (!id || !title) return null;
	const artists = (Array.isArray(song?.ar) ? song.ar : [])
		.map((artist) => text(asRecord(artist)?.name))
		.filter((artist): artist is string => artist !== null);
	const album = asRecord(song?.al);
	const durationMs = finiteNumber(song?.dt);
	return {
		title,
		artists: artists.length > 0 ? artists : ['未知歌手'],
		album: text(album?.name) ?? '未知专辑',
		albumArtUrl: normalizeImageUrl(album?.picUrl),
		songUrl: `https://music.163.com/song?id=${encodeURIComponent(id)}`,
		durationMs: durationMs !== null && durationMs >= 0 ? durationMs : null,
	};
};

const median = (values: number[]): number | null => {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? sorted[middle]
		: (sorted[middle - 1] + sorted[middle]) / 2;
};

export function normalizeListeningFootprint({
	recentPayload,
	weeklyPayload,
	detailPayload,
	now = Date.now(),
	recentLimit = 100,
}: NormalizeListeningFootprintOptions): NeteaseListeningFootprint {
	const effectiveRecentLimit = Number.isFinite(recentLimit)
		? Math.min(100, Math.max(1, Math.floor(recentLimit)))
		: 100;
	const recentRoot = asRecord(recentPayload);
	const rawRecentList = asRecord(recentRoot?.data)?.list;
	const recentAvailable =
		hasSuccessfulCode(recentRoot) && Array.isArray(rawRecentList);
	const recentList = recentAvailable
		? rawRecentList.slice(0, effectiveRecentLimit)
		: [];
	const safeNow = Number.isFinite(now) ? now : Date.now();
	const records = recentAvailable
		? recentList
				.map((record, index) => normalizeRecentRecord(record, index, safeNow))
				.filter((record): record is ListeningRecord => record !== null)
		: [];
	const recentTotal = finiteNumber(asRecord(recentRoot?.data)?.total);

	const weeklyRoot = asRecord(weeklyPayload);
	const weeklyData = weeklyRoot?.weekData;
	const weeklyAvailable =
		hasSuccessfulCode(weeklyRoot) && Array.isArray(weeklyData);
	const weeklyTracks = weeklyAvailable
		? weeklyData
				.map((entry) => normalizeFootprintTrack(asRecord(entry)?.song))
				.filter((track): track is FootprintTrack => track !== null)
		: [];
	const weeklyDurations = weeklyAvailable
		? weeklyData
				.map((entry) => finiteNumber(asRecord(asRecord(entry)?.song)?.dt))
				.filter(
					(duration): duration is number => duration !== null && duration >= 0,
				)
		: [];

	const detailRoot = asRecord(detailPayload);
	const listenCount = hasSuccessfulCode(detailRoot)
		? finiteNumber(detailRoot?.listenSongs)
		: null;
	const validListenCount =
		listenCount !== null && listenCount >= 0 && Number.isInteger(listenCount)
			? listenCount
			: null;
	const sampleDurationMs = median(
		records.length > 0
			? records.map((record) => record.durationMs)
			: weeklyDurations,
	);
	const basis =
		sampleDurationMs === null
			? null
			: records.length > 0
				? 'recent-median'
				: 'weekly-median';
	const state =
		recentAvailable && weeklyAvailable && validListenCount !== null
			? 'ready'
			: recentAvailable || weeklyAvailable || validListenCount !== null
				? 'partial'
				: 'unavailable';

	const dayStart = localDayStart(safeNow);
	const weekStart = localWeekStart(safeNow);
	const currentDay = localDate(safeNow);
	const currentYear = currentDay.getUTCFullYear();
	const currentMonth = currentDay.getUTCMonth();
	const todayRecords = records.filter((record) =>
		inRange(record, dayStart, dayStart + 24 * 60 * 60_000),
	);
	const weekRecords = records.filter((record) =>
		inRange(record, weekStart, weekStart + 7 * 24 * 60 * 60_000),
	);
	const monthRecords = records.filter((record) => {
		const date = localDate(record.playedAt);
		return (
			date.getUTCFullYear() === currentYear &&
			date.getUTCMonth() === currentMonth
		);
	});
	const yearRecords = records.filter(
		(record) => localDate(record.playedAt).getUTCFullYear() === currentYear,
	);

	const today = aggregateSlice(
		todayRecords,
		TODAY_LABELS,
		(record) => Math.floor(localDate(record.playedAt).getUTCHours() / 2),
		recentAvailable,
	);
	const reports = {
		week: aggregateSlice(
			weekRecords,
			WEEK_LABELS,
			(record) => {
				const day = localDate(record.playedAt).getUTCDay();
				return day === 0 ? 6 : day - 1;
			},
			recentAvailable,
		),
		month: aggregateSlice(
			monthRecords,
			MONTH_LABELS,
			(record) =>
				Math.min(
					4,
					Math.floor((localDate(record.playedAt).getUTCDate() - 1) / 7),
				),
			recentAvailable,
		),
		year: aggregateSlice(
			yearRecords,
			YEAR_LABELS,
			(record) => localDate(record.playedAt).getUTCMonth(),
			recentAvailable,
		),
	};
	const mondayRecords = records.filter((record) =>
		inRange(record, weekStart, weekStart + 24 * 60 * 60_000),
	);

	return {
		state,
		generatedAt: safeNow,
		timezone: 'Asia/Shanghai',
		coverage: {
			recentAvailable,
			recordCount: recentAvailable ? records.length : null,
			oldestPlayedAt:
				records.length > 0
					? Math.min(...records.map((record) => record.playedAt))
					: null,
			limit: effectiveRecentLimit,
			truncated:
				recentAvailable &&
				((recentTotal !== null && recentTotal > recentList.length) ||
					rawRecentList.length > effectiveRecentLimit),
		},
		today,
		week: {
			durationMs: reports.week.durationMs,
			mondayDurationMs: recentAvailable
				? mondayRecords.reduce((sum, record) => sum + record.durationMs, 0)
				: null,
			recordCount: reports.week.recordCount,
		},
		reports,
		lifetime: {
			listenCount: validListenCount,
			estimatedDurationMs:
				validListenCount !== null && sampleDurationMs !== null
					? validListenCount * sampleDurationMs
					: null,
			sampleDurationMs,
			basis,
		},
		weeklyHighlight: weeklyTracks[0] ?? null,
	};
}
