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
