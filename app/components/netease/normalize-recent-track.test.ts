import { describe, expect, it } from 'vitest';
import { normalizeRecentTrack } from './normalize-recent-track';

const NOW = 1_800_000_000_000;
const payload = (playTime: number) => ({
	code: 200,
	data: {
		total: 1,
		list: [
			{
				playTime,
				data: {
					id: 12345,
					name: '夜に駆ける',
					ar: [{ name: 'YOASOBI' }],
					al: {
						name: 'THE BOOK',
						picUrl: 'http://p1.music.126.net/example.jpg',
					},
				},
			},
		],
	},
});

describe('normalizeRecentTrack', () => {
	it('marks a play within fifteen minutes as recent', () => {
		expect(normalizeRecentTrack(payload(NOW - 10 * 60_000), NOW)).toEqual({
			state: 'recent',
			track: {
				title: '夜に駆ける',
				artists: ['YOASOBI'],
				album: 'THE BOOK',
				albumArtUrl: 'https://p1.music.126.net/example.jpg',
				songUrl: 'https://music.163.com/song?id=12345',
				playedAt: NOW - 10 * 60_000,
			},
		});
	});

	it('marks an older valid play as older', () => {
		expect(normalizeRecentTrack(payload(NOW - 16 * 60_000), NOW).state).toBe(
			'older',
		);
	});

	it('returns unavailable for an out-of-range playback timestamp', () => {
		expect(normalizeRecentTrack(payload(1e20), NOW)).toEqual({
			state: 'unavailable',
			track: null,
		});
	});

	it('keeps the song duration for a richer Music card', () => {
		const result = normalizeRecentTrack(
			{
				...payload(NOW),
				data: {
					...payload(NOW).data,
					list: [
						{
							...payload(NOW).data.list[0],
							data: {
								...payload(NOW).data.list[0].data,
								dt: 215_000,
							},
						},
					],
				},
			},
			NOW,
		);

		expect(result.track?.durationMs).toBe(215_000);
	});

	it('returns empty for a valid empty list', () => {
		expect(
			normalizeRecentTrack({ code: 200, data: { total: 0, list: [] } }, NOW),
		).toEqual({ state: 'empty', track: null });
	});

	it('returns unavailable for malformed data', () => {
		expect(normalizeRecentTrack({ data: { list: [{}] } }, NOW)).toEqual({
			state: 'unavailable',
			track: null,
		});
	});

	it('accepts album art from the approved apex NetEase host', () => {
		const result = normalizeRecentTrack(
			{
				...payload(NOW),
				data: {
					...payload(NOW).data,
					list: [
						{
							...payload(NOW).data.list[0],
							data: {
								...payload(NOW).data.list[0].data,
								al: {
									name: 'THE BOOK',
									picUrl: 'https://music.126.net/apex-cover.jpg',
								},
							},
						},
					],
				},
			},
			NOW,
		);

		expect(result.track?.albumArtUrl).toBe(
			'https://music.126.net/apex-cover.jpg',
		);
	});

	it('rejects album art outside the approved NetEase host', () => {
		const result = normalizeRecentTrack(
			{
				...payload(NOW),
				data: {
					total: 1,
					list: [
						{
							...payload(NOW).data.list[0],
							data: {
								...payload(NOW).data.list[0].data,
								al: {
									name: 'THE BOOK',
									picUrl: 'https://music.126.net.evil.example/cover.jpg',
								},
							},
						},
					],
				},
			},
			NOW,
		);

		expect(result.track?.albumArtUrl).toBeNull();
	});
});
