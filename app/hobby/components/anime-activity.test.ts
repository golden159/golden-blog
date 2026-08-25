import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	fetchAnimeActivity,
	normalizeAnimeActivity,
	unavailableAnimeActivity,
} from './anime-activity';

const readyActivity = {
	state: 'ready',
	profile: {
		username: '1022640',
		nickname: 'Golden',
		sign: '保持好奇。',
		avatarUrl: 'https://lain.bgm.tv/pic/user/l/avatar.jpg',
	},
	total: 12,
	entries: [
		{
			id: 42,
			title: '葬送的芙莉莲',
			originalTitle: '葬送のフリーレン',
			imageUrl: 'https://lain.bgm.tv/pic/cover/c/42.jpg',
			status: '看过',
			personalScore: 9,
			communityScore: 8.8,
			watchedEpisodes: 28,
			totalEpisodes: 28,
		},
	],
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('normalizeAnimeActivity', () => {
	it('keeps a complete ready response from the local API', () => {
		expect(normalizeAnimeActivity(readyActivity)).toEqual(readyActivity);
	});

	it('rejects unsafe URLs and inconsistent states', () => {
		expect(
			normalizeAnimeActivity({
				...readyActivity,
				entries: [
					{
						...readyActivity.entries[0],
						imageUrl: 'https://example.com/cover.jpg',
					},
				],
			}),
		).toEqual(unavailableAnimeActivity);
		expect(
			normalizeAnimeActivity({
				...readyActivity,
				state: 'empty',
			}),
		).toEqual(unavailableAnimeActivity);
	});

	it('keeps the explicit empty and unavailable responses', () => {
		expect(
			normalizeAnimeActivity({
				state: 'empty',
				profile: readyActivity.profile,
				total: 0,
				entries: [],
			}),
		).toMatchObject({ state: 'empty', total: 0, entries: [] });
		expect(normalizeAnimeActivity(unavailableAnimeActivity)).toEqual(
			unavailableAnimeActivity,
		);
	});

	it('keeps a trusted profile in an unavailable response', () => {
		expect(
			normalizeAnimeActivity({
				state: 'unavailable',
				profile: readyActivity.profile,
				total: 0,
				entries: [],
			}),
		).toEqual({
			state: 'unavailable',
			profile: readyActivity.profile,
			total: 0,
			entries: [],
		});
	});
});

describe('fetchAnimeActivity', () => {
	it('normalizes a successful local response', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify(readyActivity), { status: 200 }),
				),
		);

		expect(await fetchAnimeActivity('/api/hobby/bangumi')).toEqual(
			readyActivity,
		);
	});

	it('falls back on non-OK, malformed, or thrown responses', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('error', { status: 503 })),
		);
		expect(await fetchAnimeActivity('/api/hobby/bangumi')).toEqual(
			unavailableAnimeActivity,
		);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
		);
		expect(await fetchAnimeActivity('/api/hobby/bangumi')).toEqual(
			unavailableAnimeActivity,
		);

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		expect(await fetchAnimeActivity('/api/hobby/bangumi')).toEqual(
			unavailableAnimeActivity,
		);
	});
});
