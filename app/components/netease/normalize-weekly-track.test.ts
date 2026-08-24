import { describe, expect, it } from 'vitest';
import {
	normalizeWeeklyRanking,
	normalizeWeeklyTrack,
} from './normalize-weekly-track';

const NOW = 1_800_000_000_000;

const weeklyRecord = (id: number) => ({
	playCount: id + 7,
	score: 101 - id,
	song: {
		id,
		name: `Track ${id}`,
		ar: [{ name: `Artist ${id}` }],
		al: {
			name: `Album ${id}`,
			picUrl: `http://p1.music.126.net/cover-${id}.jpg`,
		},
		dt: 180_000 + id,
	},
});

describe('normalizeWeeklyRanking', () => {
	it('returns the first ten valid weekData entries as ranked public tracks', () => {
		const result = normalizeWeeklyRanking(
			{
				code: 200,
				weekData: Array.from({ length: 12 }, (_, index) =>
					weeklyRecord(index + 1),
				),
			},
			NOW,
		);

		expect(result.state).toBe('ready');
		expect(result.generatedAt).toBe(NOW);
		expect(result.tracks).toHaveLength(10);
		expect(result.tracks[0]).toEqual({
			rank: 1,
			title: 'Track 1',
			artists: ['Artist 1'],
			album: 'Album 1',
			albumArtUrl: 'https://p1.music.126.net/cover-1.jpg',
			songUrl: 'https://music.163.com/song?id=1',
			durationMs: 180_001,
			playCount: 8,
			score: 100,
		});
		expect(result.tracks[9]).toMatchObject({
			rank: 10,
			title: 'Track 10',
			playCount: 17,
			score: 91,
		});
	});

	it('skips malformed entries without hiding later valid tracks', () => {
		const result = normalizeWeeklyRanking(
			{
				code: 200,
				weekData: [
					{ song: { id: '7?injected=1', name: 'Unsafe' } },
					{ song: { id: -1, name: 'Negative ID' } },
					weeklyRecord(42),
				],
			},
			NOW,
		);

		expect(result).toMatchObject({
			state: 'ready',
			tracks: [
				{
					rank: 1,
					title: 'Track 42',
					songUrl: 'https://music.163.com/song?id=42',
				},
			],
		});
	});

	it('returns unavailable for an explicit upstream failure', () => {
		expect(normalizeWeeklyRanking({ code: 500, weekData: [] }, NOW)).toEqual({
			state: 'unavailable',
			generatedAt: NOW,
			tracks: [],
		});
	});

	it('returns empty for a valid empty weekData array', () => {
		expect(normalizeWeeklyRanking({ code: 200, weekData: [] }, NOW)).toEqual({
			state: 'empty',
			generatedAt: NOW,
			tracks: [],
		});
	});

	it('drops unsafe artwork while keeping an otherwise valid track', () => {
		const record = weeklyRecord(7);
		const result = normalizeWeeklyRanking(
			{
				code: 200,
				weekData: [
					{
						...record,
						song: {
							...record.song,
							al: {
								...record.song.al,
								picUrl: 'https://music.126.net.evil.example/cover.jpg',
							},
						},
					},
				],
			},
			NOW,
		);

		expect(result.tracks[0]?.albumArtUrl).toBeNull();
	});

	it('keeps only non-negative finite metrics', () => {
		const record = weeklyRecord(8);
		const result = normalizeWeeklyRanking(
			{
				code: 200,
				weekData: [
					{
						...record,
						playCount: -1,
						score: Number.POSITIVE_INFINITY,
					},
				],
			},
			NOW,
		);

		expect(result.tracks[0]).toMatchObject({
			durationMs: 180_008,
			playCount: null,
			score: null,
		});
	});

	it('returns unavailable when a non-empty list has no valid songs', () => {
		expect(
			normalizeWeeklyRanking(
				{ code: 200, weekData: [{ song: { id: 'not-an-id', name: '' } }] },
				NOW,
			),
		).toEqual({ state: 'unavailable', generatedAt: NOW, tracks: [] });
	});
});

describe('normalizeWeeklyTrack', () => {
	it('normalizes the first weekly entry into a public track', () => {
		expect(
			normalizeWeeklyTrack({
				weekData: [
					{
						song: {
							id: 12345,
							name: '夜に駆ける',
							ar: [{ name: 'YOASOBI' }],
							al: {
								name: 'THE BOOK',
								picUrl: 'http://p1.music.126.net/example.jpg',
							},
							dt: 215_000,
						},
					},
				],
			}),
		).toEqual({
			state: 'weekly',
			track: {
				title: '夜に駆ける',
				artists: ['YOASOBI'],
				album: 'THE BOOK',
				albumArtUrl: 'https://p1.music.126.net/example.jpg',
				songUrl: 'https://music.163.com/song?id=12345',
				playedAt: null,
				durationMs: 215_000,
			},
		});
	});

	it('returns empty for a valid empty weekData array', () => {
		expect(normalizeWeeklyTrack({ weekData: [] })).toEqual({
			state: 'empty',
			track: null,
		});
	});

	it('returns unavailable for malformed weekly data', () => {
		expect(normalizeWeeklyTrack({ weekData: [{ song: {} }] })).toEqual({
			state: 'unavailable',
			track: null,
		});
	});

	it('returns unavailable for a negative weekly track duration', () => {
		expect(
			normalizeWeeklyTrack({
				weekData: [
					{
						song: {
							id: 12345,
							name: 'Invalid Duration Track',
							dt: -1,
						},
					},
				],
			}),
		).toEqual({ state: 'unavailable', track: null });
	});
});
