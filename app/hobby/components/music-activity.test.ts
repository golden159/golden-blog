import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMusicActivity, unavailableMusicActivity } from './music-activity';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchMusicActivity', () => {
	it('falls back when the public response contains a malformed track', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: { title: 'Track', artists: null },
					}),
					{ status: 200 },
				),
			),
		);

		expect(await fetchMusicActivity('/api/hobby/netease')).toEqual(
			unavailableMusicActivity,
		);
	});

	it('keeps a normalized recent track', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: 'https://p1.music.126.net/cover.jpg',
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
					{ status: 200 },
				),
			),
		);

		const result = await fetchMusicActivity('/api/hobby/netease');
		expect(result.state).toBe('recent');
		expect(result.track?.title).toBe('夜に駆ける');
	});

	it('keeps a valid weekly favorite with no playback timestamp', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'weekly',
						track: {
							title: 'アイドル',
							artists: ['YOASOBI'],
							album: 'アイドル',
							albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
							songUrl: 'https://music.163.com/song?id=54321',
							playedAt: null,
						},
					}),
					{ status: 200 },
				),
			),
		);

		const result = await fetchMusicActivity('/api/hobby/netease');
		expect(result.state).toBe('weekly');
		expect(result.track).toMatchObject({
			title: 'アイドル',
			playedAt: null,
		});
	});

	it('removes a playback timestamp from an inconsistent weekly favorite', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'weekly',
						track: {
							title: 'アイドル',
							artists: ['YOASOBI'],
							album: 'アイドル',
							albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
							songUrl: 'https://music.163.com/song?id=54321',
							playedAt: 1_800_000_000_000,
						},
					}),
					{ status: 200 },
				),
			),
		);

		const result = await fetchMusicActivity('/api/hobby/netease');
		expect(result).toMatchObject({
			state: 'weekly',
			track: { title: 'アイドル', playedAt: null },
		});
	});

	it('rejects untrusted image and song URLs in a public response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: 'Track',
							artists: ['Artist'],
							album: 'Album',
							albumArtUrl: 'https://evil.example/cover.jpg',
							songUrl: 'javascript:alert(1)',
							playedAt: null,
						},
					}),
					{ status: 200 },
				),
			),
		);

		expect(await fetchMusicActivity('/api/hobby/netease')).toEqual(
			unavailableMusicActivity,
		);
	});

	it('rejects a track paired with an empty state', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'empty',
						track: {
							title: 'Track',
							artists: ['Artist'],
							album: 'Album',
							albumArtUrl: null,
							songUrl: 'https://music.163.com/song?id=1',
							playedAt: null,
						},
					}),
					{ status: 200 },
				),
			),
		);

		expect(await fetchMusicActivity('/api/hobby/netease')).toEqual(
			unavailableMusicActivity,
		);
	});

	it('rejects an out-of-range playback timestamp', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'older',
						track: {
							title: 'Track',
							artists: ['Artist'],
							album: 'Album',
							albumArtUrl: null,
							songUrl: 'https://music.163.com/song?id=1',
							playedAt: 1e20,
						},
					}),
					{ status: 200 },
				),
			),
		);

		expect(await fetchMusicActivity('/api/hobby/netease')).toEqual(
			unavailableMusicActivity,
		);
	});
});
