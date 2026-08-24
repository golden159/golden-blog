import { describe, expect, it } from 'vitest';
import { normalizeListeningFootprint } from './normalize-listening-footprint';

const now = Date.UTC(2026, 7, 26, 4); // 2026-08-26 12:00 UTC+8

const recentFixture = {
	code: 200,
	data: {
		total: 4,
		list: [
			{
				playTime: Date.UTC(2026, 7, 26, 3),
				data: {
					id: 1,
					name: 'Today Track',
					ar: [{ name: 'Today Artist' }],
					al: { name: 'Today Album' },
					dt: 200_000,
				},
			},
			{
				playTime: Date.UTC(2026, 7, 24, 4),
				data: {
					id: 2,
					name: 'Monday Track',
					ar: [{ name: 'Monday Artist' }],
					al: { name: 'Monday Album' },
					dt: 180_000,
				},
			},
			{
				playTime: Date.UTC(2026, 7, 1, 4),
				data: {
					id: 3,
					name: 'Month Track',
					ar: [{ name: 'Month Artist' }],
					al: { name: 'Month Album' },
					dt: 220_000,
				},
			},
			{
				playTime: Date.UTC(2026, 0, 15, 4),
				data: {
					id: 4,
					name: 'Year Track',
					ar: [{ name: 'Year Artist' }],
					al: { name: 'Year Album' },
					dt: 250_000,
				},
			},
		],
	},
};

const weeklyFixture = {
	weekData: [
		{
			song: {
				id: 5,
				name: 'Weekly Highlight',
				ar: [{ name: 'Weekly Artist' }],
				al: {
					name: 'Weekly Album',
					picUrl: 'http://p1.music.126.net/weekly-cover.jpg',
				},
				dt: 210_000,
			},
		},
		{
			song: {
				id: 6,
				name: 'Weekly Sample',
				ar: [{ name: 'Sample Artist' }],
				al: { name: 'Sample Album' },
				dt: 250_000,
			},
		},
	],
};

describe('normalizeListeningFootprint', () => {
	it('aggregates today, Monday, week, month, and year from recent records', () => {
		const result = normalizeListeningFootprint({
			recentPayload: recentFixture,
			weeklyPayload: weeklyFixture,
			detailPayload: { code: 200, listenSongs: 17_620 },
			now,
			recentLimit: 100,
		});

		expect(result.today).toMatchObject({ durationMs: 200_000, recordCount: 1 });
		expect(result.week.mondayDurationMs).toBe(180_000);
		expect(result.reports.week.durationMs).toBe(380_000);
		expect(result.reports.month.recordCount).toBe(3);
		expect(result.reports.year.recordCount).toBe(4);
		expect(result.lifetime).toMatchObject({
			basis: 'recent-median',
			sampleDurationMs: 210_000,
			estimatedDurationMs: 3_700_200_000,
		});
	});

	it('marks period history unavailable but keeps an estimated lifetime from public data', () => {
		const result = normalizeListeningFootprint({
			recentPayload: null,
			weeklyPayload: weeklyFixture,
			detailPayload: { code: 200, listenSongs: 17_620 },
			now,
			recentLimit: 100,
		});

		expect(result.state).toBe('partial');
		expect(result.today.durationMs).toBeNull();
		expect(result.lifetime).toMatchObject({
			listenCount: 17_620,
			basis: 'weekly-median',
		});
	});

	it('represents valid empty recent history with zero-valued period slices', () => {
		const result = normalizeListeningFootprint({
			recentPayload: { code: 200, data: { total: 0, list: [] } },
			weeklyPayload: null,
			detailPayload: { code: 200, listenSongs: 0 },
			now,
			recentLimit: 100,
		});

		expect(result.coverage).toMatchObject({
			recentAvailable: true,
			recordCount: 0,
			oldestPlayedAt: null,
			truncated: false,
		});
		expect(result.today.durationMs).toBe(0);
		expect(result.reports.month.recordCount).toBe(0);
	});

	it('skips malformed individual recent records without leaking their raw fields', () => {
		const result = normalizeListeningFootprint({
			recentPayload: {
				data: {
					list: [
						...recentFixture.data.list.slice(0, 1),
						{
							playTime: 'not-a-time',
							data: { id: 7, name: 'Bad Time', dt: 50 },
						},
						{ playTime: now, data: { id: 8, name: 'Bad Duration', dt: -1 } },
					],
				},
			},
			weeklyPayload: null,
			detailPayload: null,
			now,
			recentLimit: 100,
		});

		expect(result.coverage.recordCount).toBe(1);
		expect(result.today).toMatchObject({ durationMs: 200_000, recordCount: 1 });
		expect(JSON.stringify(result)).not.toContain('Bad Time');
		expect(JSON.stringify(result)).not.toContain('Bad Duration');
	});

	it('marks a nonempty recent response unavailable when every record is malformed', () => {
		const result = normalizeListeningFootprint({
			recentPayload: {
				code: 200,
				data: {
					total: 2,
					list: [
						{
							playTime: 'not-a-time',
							data: { id: 7, name: 'Bad Time', dt: 50 },
						},
						{ playTime: now, data: { id: 8, name: 'Bad Duration', dt: -1 } },
					],
				},
			},
			weeklyPayload: weeklyFixture,
			detailPayload: { code: 200, listenSongs: 10 },
			now,
			recentLimit: 100,
		});

		expect(result).toMatchObject({
			state: 'partial',
			coverage: {
				recentAvailable: false,
				recordCount: null,
				oldestPlayedAt: null,
			},
			today: { durationMs: null, recordCount: null },
			week: { durationMs: null, mondayDurationMs: null, recordCount: null },
			lifetime: { basis: 'weekly-median' },
		});
		expect(
			result.today.buckets.every((bucket) => bucket.durationMs === null),
		).toBe(true);
		expect(
			result.reports.year.buckets.every(
				(bucket) => bucket.recordCount === null,
			),
		).toBe(true);
	});

	it('uses trusted artwork for the weekly highlight', () => {
		const result = normalizeListeningFootprint({
			recentPayload: null,
			weeklyPayload: weeklyFixture,
			detailPayload: null,
			now,
			recentLimit: 100,
		});

		expect(result.weeklyHighlight).toMatchObject({
			title: 'Weekly Highlight',
			albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
			songUrl: 'https://music.163.com/song?id=5',
		});
	});

	it('breaks top-artist ties using the latest valid record', () => {
		const result = normalizeListeningFootprint({
			recentPayload: recentFixture,
			weeklyPayload: null,
			detailPayload: null,
			now,
			recentLimit: 100,
		});

		expect(result.reports.year.topArtist).toBe('Today Artist');
		expect(result.reports.year.topTrack).toBe('Today Track');
	});

	it('counts top tracks by song ID instead of merging equal display titles', () => {
		const makeRecord = (id: number, name: string, playTime: number) => ({
			playTime,
			data: { id, name, ar: [{ name: 'Artist' }], dt: 1_000 },
		});
		const result = normalizeListeningFootprint({
			recentPayload: {
				data: {
					list: [
						makeRecord(101, '同名歌曲', now),
						makeRecord(202, '同名歌曲', now - 1),
						makeRecord(303, '真正最常听', now - 2),
						makeRecord(303, '真正最常听', now - 3),
					],
				},
			},
			weeklyPayload: null,
			detailPayload: null,
			now,
			recentLimit: 100,
		});

		expect(result.today.uniqueTrackCount).toBe(3);
		expect(result.today.topTrack).toBe('真正最常听');
	});

	it('accepts only canonical decimal song IDs and skips bad weekly candidates', () => {
		const result = normalizeListeningFootprint({
			recentPayload: {
				data: {
					list: [
						{
							playTime: now,
							data: { id: -1, name: 'Negative ID', ar: [], dt: 1_000 },
						},
						{
							playTime: now,
							data: { id: '12.5', name: 'Decimal ID', ar: [], dt: 1_000 },
						},
						{
							playTime: now,
							data: { id: '00123', name: 'Canonical ID', ar: [], dt: 1_000 },
						},
					],
				},
			},
			weeklyPayload: {
				weekData: [
					{ song: { id: 'track', name: 'Text ID', ar: [], al: {}, dt: 9_000 } },
					{
						song: {
							id: 3.14,
							name: 'Number Decimal',
							ar: [],
							al: {},
							dt: 8_000,
						},
					},
					{
						song: {
							id: '00456',
							name: 'Valid Candidate',
							ar: [{ name: 'Valid Artist' }],
							al: { name: 'Valid Album' },
							dt: 7_000,
						},
					},
				],
			},
			detailPayload: { code: 200, listenSongs: 2 },
			now,
			recentLimit: 100,
		});

		expect(result.coverage.recordCount).toBe(1);
		expect(result.today.topTrack).toBe('Canonical ID');
		expect(result.weeklyHighlight).toMatchObject({
			title: 'Valid Candidate',
			songUrl: 'https://music.163.com/song?id=00456',
		});
		expect(result.lifetime).toMatchObject({
			basis: 'recent-median',
			sampleDurationMs: 1_000,
		});
	});

	it('emits literal bucket counts for every time range', () => {
		const result = normalizeListeningFootprint({
			recentPayload: recentFixture,
			weeklyPayload: null,
			detailPayload: null,
			now,
			recentLimit: 100,
		});

		expect(result.today.buckets).toHaveLength(12);
		expect(result.reports.week.buckets).toHaveLength(7);
		expect(result.reports.month.buckets).toHaveLength(5);
		expect(result.reports.year.buckets).toHaveLength(12);
		expect(result.today.buckets.map((bucket) => bucket.label)).toEqual([
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
		]);
	});

	it('caps recent source records before aggregates and lifetime sampling', () => {
		const recordsWithinTheLimit = Array.from({ length: 100 }, (_, index) => ({
			playTime: now,
			data: {
				id: index + 100,
				name: `Within limit ${index}`,
				ar: [{ name: 'Limit Artist' }],
				al: { name: 'Limit Album' },
				dt: index < 50 ? 1_000 : 3_000,
			},
		}));
		const result = normalizeListeningFootprint({
			recentPayload: {
				data: {
					list: [
						...recordsWithinTheLimit,
						{
							playTime: now,
							data: {
								id: 999,
								name: 'Overflow record',
								ar: [{ name: 'Overflow Artist' }],
								al: { name: 'Overflow Album' },
								dt: 1_000_000,
							},
						},
					],
				},
			},
			weeklyPayload: null,
			detailPayload: { code: 200, listenSongs: 10 },
			now,
			recentLimit: 250,
		});

		expect(result.coverage).toMatchObject({
			limit: 100,
			recordCount: 100,
			truncated: true,
		});
		expect(result.today).toMatchObject({
			durationMs: 200_000,
			recordCount: 100,
		});
		expect(result.lifetime).toMatchObject({
			sampleDurationMs: 2_000,
			estimatedDurationMs: 20_000,
		});
	});

	it('uses the requested capped recent limit consistently in coverage and aggregation', () => {
		const result = normalizeListeningFootprint({
			recentPayload: {
				data: {
					list: Array.from({ length: 51 }, (_, index) => ({
						playTime: now,
						data: {
							id: index + 1_000,
							name: `Limited ${index}`,
							ar: [{ name: 'Limit Artist' }],
							al: { name: 'Limit Album' },
							dt: index < 50 ? 1_000 : 1_000_000,
						},
					})),
				},
			},
			weeklyPayload: null,
			detailPayload: { code: 200, listenSongs: 10 },
			now,
			recentLimit: 50,
		});

		expect(result.coverage).toMatchObject({
			limit: 50,
			recordCount: 50,
			truncated: true,
		});
		expect(result.today.durationMs).toBe(50_000);
		expect(result.lifetime.sampleDurationMs).toBe(1_000);
	});

	it('treats explicit failed response codes as unavailable for each source', () => {
		const recentFailed = normalizeListeningFootprint({
			recentPayload: { code: 500, data: { list: [] } },
			weeklyPayload: weeklyFixture,
			detailPayload: { code: 200, listenSongs: 17_620 },
			now,
			recentLimit: 100,
		});
		const weeklyFailed = normalizeListeningFootprint({
			recentPayload: recentFixture,
			weeklyPayload: { code: 500, weekData: weeklyFixture.weekData },
			detailPayload: { code: 200, listenSongs: 17_620 },
			now,
			recentLimit: 100,
		});
		const detailFailed = normalizeListeningFootprint({
			recentPayload: recentFixture,
			weeklyPayload: weeklyFixture,
			detailPayload: { code: 500, listenSongs: 17_620 },
			now,
			recentLimit: 100,
		});

		expect(recentFailed).toMatchObject({
			state: 'partial',
			coverage: { recentAvailable: false, recordCount: null },
			today: { durationMs: null },
		});
		expect(weeklyFailed).toMatchObject({
			state: 'partial',
			weeklyHighlight: null,
		});
		expect(detailFailed).toMatchObject({
			state: 'partial',
			lifetime: { listenCount: null, estimatedDurationMs: null },
		});
	});

	it('returns an unavailable result when every payload is malformed or absent', () => {
		const result = normalizeListeningFootprint({
			recentPayload: { data: { list: 'nope' } },
			weeklyPayload: { weekData: 'nope' },
			detailPayload: { listenSongs: 'nope' },
			now,
			recentLimit: 100,
		});

		expect(result.state).toBe('unavailable');
		expect(result.today.durationMs).toBeNull();
		expect(result.lifetime).toEqual({
			listenCount: null,
			estimatedDurationMs: null,
			sampleDurationMs: null,
			basis: null,
		});
	});
});
