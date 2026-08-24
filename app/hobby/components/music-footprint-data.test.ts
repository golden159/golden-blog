import { afterEach, describe, expect, it, vi } from 'vitest';

const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));

vi.mock('swr', () => ({ default: useSWRMock }));

import {
	fetchMusicFootprint,
	normalizeMusicFootprint,
	unavailableMusicFootprint,
	useMusicFootprint,
} from './music-footprint-data';

const validFootprint = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	timezone: 'Asia/Shanghai',
	coverage: {
		recentAvailable: true,
		recordCount: 42,
		oldestPlayedAt: 1_700_000_000_000,
		limit: 100,
		truncated: false,
	},
	today: {
		durationMs: 120_000,
		recordCount: 2,
		uniqueTrackCount: 2,
		topArtist: 'Artist',
		topTrack: 'Track',
		buckets: Array.from({ length: 12 }, (_, index) => ({
			label: `${index * 2}:00`,
			durationMs: index === 0 ? 120_000 : 0,
			recordCount: index === 0 ? 2 : 0,
		})),
	},
	week: {
		durationMs: 240_000,
		mondayDurationMs: 120_000,
		recordCount: 4,
	},
	reports: {
		week: {
			durationMs: 240_000,
			recordCount: 4,
			uniqueTrackCount: 3,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 7 }, (_, index) => ({
				label: `Day ${index + 1}`,
				durationMs: 0,
				recordCount: 0,
			})),
		},
		month: {
			durationMs: 360_000,
			recordCount: 6,
			uniqueTrackCount: 5,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 5 }, (_, index) => ({
				label: `Range ${index + 1}`,
				durationMs: 0,
				recordCount: 0,
			})),
		},
		year: {
			durationMs: 480_000,
			recordCount: 8,
			uniqueTrackCount: 7,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 12 }, (_, index) => ({
				label: `Month ${index + 1}`,
				durationMs: 0,
				recordCount: 0,
			})),
		},
	},
	lifetime: {
		listenCount: 100,
		estimatedDurationMs: 6_000_000,
		sampleDurationMs: 60_000,
		basis: 'recent-median',
	},
	weeklyHighlight: {
		title: 'Weekly Track',
		artists: ['Artist'],
		album: 'Album',
		albumArtUrl: 'https://p1.music.126.net/cover.jpg',
		songUrl: 'https://music.163.com/song?id=12345',
		durationMs: 180_000,
	},
} as const;

const withTodayDuration = (durationMs: number) => ({
	...validFootprint,
	today: { ...validFootprint.today, durationMs },
});

const withArtwork = (albumArtUrl: string) => ({
	...validFootprint,
	weeklyHighlight: { ...validFootprint.weeklyHighlight, albumArtUrl },
});

const withSongUrl = (songUrl: string) => ({
	...validFootprint,
	weeklyHighlight: { ...validFootprint.weeklyHighlight, songUrl },
});

const unavailableSlice = <T extends (typeof validFootprint)['today']>(
	slice: T,
) => ({
	...slice,
	durationMs: null,
	recordCount: null,
	uniqueTrackCount: null,
	topArtist: null,
	topTrack: null,
	buckets: slice.buckets.map((bucket) => ({
		...bucket,
		durationMs: null,
		recordCount: null,
	})),
});

const withUnavailableRecent = (state: 'partial' | 'ready' = 'partial') => ({
	...validFootprint,
	state,
	coverage: {
		...validFootprint.coverage,
		recentAvailable: false,
		recordCount: null,
		oldestPlayedAt: null,
		truncated: false,
	},
	today: unavailableSlice(validFootprint.today),
	week: { durationMs: null, mondayDurationMs: null, recordCount: null },
	reports: {
		week: unavailableSlice(validFootprint.reports.week),
		month: unavailableSlice(validFootprint.reports.month),
		year: unavailableSlice(validFootprint.reports.year),
	},
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('normalizeMusicFootprint', () => {
	it('accepts a complete footprint and preserves literal report buckets', () => {
		expect(normalizeMusicFootprint(validFootprint)).toEqual(validFootprint);
	});

	it('preserves null values for unavailable exact statistics', () => {
		const partialFootprint = {
			...withUnavailableRecent(),
			lifetime: {
				listenCount: null,
				estimatedDurationMs: null,
				sampleDurationMs: null,
				basis: null,
			},
			weeklyHighlight: null,
		};

		expect(normalizeMusicFootprint(partialFootprint)).toEqual(partialFootprint);
	});

	it.each([
		99, 101,
	])('fails closed when the coverage limit is %i instead of the 100-record contract', (limit) => {
		const payload = {
			...validFootprint,
			coverage: { ...validFootprint.coverage, limit },
		};

		expect(normalizeMusicFootprint(payload)).toEqual(unavailableMusicFootprint);
	});

	it('fails closed when coverage record count exceeds its limit', () => {
		const payload = {
			...validFootprint,
			coverage: { ...validFootprint.coverage, recordCount: 101 },
		};

		expect(normalizeMusicFootprint(payload)).toEqual(unavailableMusicFootprint);
	});

	it('fails closed when ready state claims recent history is unavailable', () => {
		expect(normalizeMusicFootprint(withUnavailableRecent('ready'))).toEqual(
			unavailableMusicFootprint,
		);
	});

	it('fails closed when unavailable recent history carries numeric exact values', () => {
		const payload = {
			...withUnavailableRecent(),
			today: {
				...unavailableSlice(validFootprint.today),
				durationMs: 0,
				buckets: unavailableSlice(validFootprint.today).buckets.map(
					(bucket, index) => ({
						...bucket,
						durationMs: index === 0 ? 0 : null,
					}),
				),
			},
		};

		expect(normalizeMusicFootprint(payload)).toEqual(unavailableMusicFootprint);
	});

	it('fails closed when week duration disagrees with the weekly report', () => {
		const payload = {
			...validFootprint,
			week: { ...validFootprint.week, durationMs: 1 },
		};

		expect(normalizeMusicFootprint(payload)).toEqual(unavailableMusicFootprint);
	});

	it.each([
		['missing estimate basis', { ...validFootprint.lifetime, basis: null }],
		['missing listen count', { ...validFootprint.lifetime, listenCount: null }],
		[
			'incorrect estimated duration',
			{ ...validFootprint.lifetime, estimatedDurationMs: 6_000_001 },
		],
		[
			'orphaned unavailable basis',
			{
				listenCount: 100,
				estimatedDurationMs: null,
				sampleDurationMs: null,
				basis: 'weekly-median',
			},
		],
	] as const)('fails closed for a lifetime estimate with %s', (_case, lifetime) => {
		expect(normalizeMusicFootprint({ ...validFootprint, lifetime })).toEqual(
			unavailableMusicFootprint,
		);
	});

	it('accepts a known listen count with a coherently unavailable estimate', () => {
		const payload = {
			...validFootprint,
			lifetime: {
				listenCount: 100,
				estimatedDurationMs: null,
				sampleDurationMs: null,
				basis: null,
			},
		};

		expect(normalizeMusicFootprint(payload)).toEqual(payload);
	});

	it('accepts a weekly highlight with one decimal NetEase song ID', () => {
		const footprint = withSongUrl('https://music.163.com/song?id=00123');

		expect(normalizeMusicFootprint(footprint)).toEqual(footprint);
	});

	it.each([
		['an empty song ID', 'https://music.163.com/song?id='],
		['an alphabetic song ID', 'https://music.163.com/song?id=track'],
		['duplicate song IDs', 'https://music.163.com/song?id=123&id=456'],
	])('fails closed for %s', (_case, songUrl) => {
		expect(normalizeMusicFootprint(withSongUrl(songUrl))).toEqual(
			unavailableMusicFootprint,
		);
	});

	it.each([
		['negative duration', withTodayDuration(-1)],
		['invalid state', { ...validFootprint, state: 'fake' }],
		['unsafe highlight artwork', withArtwork('https://example.com/cover.jpg')],
		[
			'non-finite generated timestamp',
			{ ...validFootprint, generatedAt: Number.POSITIVE_INFINITY },
		],
		[
			'out-of-range generated timestamp',
			{ ...validFootprint, generatedAt: 1e20 },
		],
		[
			'wrong today bucket count',
			{
				...validFootprint,
				today: {
					...validFootprint.today,
					buckets: validFootprint.today.buckets.slice(0, 11),
				},
			},
		],
		[
			'wrong weekly bucket count',
			{
				...validFootprint,
				reports: {
					...validFootprint.reports,
					week: {
						...validFootprint.reports.week,
						buckets: validFootprint.reports.week.buckets.slice(0, 6),
					},
				},
			},
		],
		[
			'wrong monthly bucket count',
			{
				...validFootprint,
				reports: {
					...validFootprint.reports,
					month: {
						...validFootprint.reports.month,
						buckets: validFootprint.reports.month.buckets.slice(0, 4),
					},
				},
			},
		],
		[
			'wrong yearly bucket count',
			{
				...validFootprint,
				reports: {
					...validFootprint.reports,
					year: {
						...validFootprint.reports.year,
						buckets: validFootprint.reports.year.buckets.slice(0, 11),
					},
				},
			},
		],
	])('fails closed for %s', (_case, payload) => {
		expect(normalizeMusicFootprint(payload)).toEqual(unavailableMusicFootprint);
	});
});

describe('fetchMusicFootprint', () => {
	it.each([
		[
			'a non-OK response',
			() => Promise.resolve(new Response(null, { status: 500 })),
		],
		['a thrown fetch', () => Promise.reject(new Error('network failed'))],
		[
			'a thrown JSON parse',
			() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.reject(new Error('invalid JSON')),
				}),
		],
	])('returns unavailable for %s', async (_case, fetchResult) => {
		vi.stubGlobal('fetch', vi.fn(fetchResult));

		expect(await fetchMusicFootprint('/api/hobby/netease/footprint')).toEqual(
			unavailableMusicFootprint,
		);
	});
});

describe('useMusicFootprint', () => {
	it('uses the footprint endpoint and a five-minute refresh', () => {
		useMusicFootprint();

		expect(useSWRMock).toHaveBeenCalledWith(
			'/api/hobby/netease/footprint',
			fetchMusicFootprint,
			expect.objectContaining({ refreshInterval: 300_000 }),
		);
	});
});
