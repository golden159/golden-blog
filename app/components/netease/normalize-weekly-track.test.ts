import { describe, expect, it } from 'vitest';
import { normalizeWeeklyTrack } from './normalize-weekly-track';

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
});
