import { afterEach, describe, expect, it, vi } from 'vitest';

const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));

vi.mock('swr', () => ({ default: useSWRMock }));

import {
	fetchMusicOverview,
	normalizeMusicOverview,
	unavailableMusicOverview,
	useMusicOverview,
} from './music-overview-data';

const validOverview = {
	activity: {
		state: 'recent',
		track: {
			title: 'Recent Track',
			artists: ['Artist'],
			album: 'Album',
			albumArtUrl: null,
			songUrl: 'https://music.163.com/song?id=1',
			playedAt: 1_800_000_000_000,
		},
	},
	weeklyRanking: {
		state: 'ready',
		generatedAt: 1_800_000_000_000,
		tracks: [
			{
				rank: 1,
				title: 'Weekly Track',
				artists: ['Artist'],
				album: 'Album',
				albumArtUrl: null,
				songUrl: 'https://music.163.com/song?id=2',
				durationMs: 180_000,
				playCount: 4,
				score: 100,
			},
		],
	},
} as const;

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	window.sessionStorage.clear();
});

describe('normalizeMusicOverview', () => {
	it('preserves coherent recent activity and weekly ranking data', () => {
		expect(normalizeMusicOverview(validOverview)).toEqual(validOverview);
	});

	it('fails each malformed branch closed without hiding valid weekly data', () => {
		expect(
			normalizeMusicOverview({
				...validOverview,
				activity: { state: 'recent', track: { title: 'broken' } },
			}),
		).toEqual({
			activity: unavailableMusicOverview.activity,
			weeklyRanking: validOverview.weeklyRanking,
		});
	});
});

describe('fetchMusicOverview', () => {
	it('normalizes one overview response without browser caching', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(validOverview), { status: 200 }),
			);
		vi.stubGlobal('fetch', fetchMock);

		expect(await fetchMusicOverview('/api/hobby/netease/overview')).toEqual(
			validOverview,
		);
		expect(fetchMock).toHaveBeenCalledWith('/api/hobby/netease/overview', {
			cache: 'no-store',
		});
	});

	it('returns the unavailable overview for a failed response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
		);

		expect(await fetchMusicOverview('/api/hobby/netease/overview')).toEqual(
			unavailableMusicOverview,
		);
	});

	it('keeps the last validated weekly ranking when the next weekly request is unavailable', async () => {
		const currentActivity = { state: 'empty', track: null } as const;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(validOverview), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						activity: currentActivity,
						weeklyRanking: {
							state: 'unavailable',
							generatedAt: 1_800_000_060_000,
							tracks: [],
						},
					}),
					{ status: 200 },
				),
			);
		vi.stubGlobal('fetch', fetchMock);

		await fetchMusicOverview('/api/hobby/netease/overview');
		expect(await fetchMusicOverview('/api/hobby/netease/overview')).toEqual({
			activity: currentActivity,
			weeklyRanking: validOverview.weeklyRanking,
		});
	});

	it('ignores a malformed retained weekly ranking', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(validOverview), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify(unavailableMusicOverview), { status: 200 }),
			);
		vi.stubGlobal('fetch', fetchMock);

		await fetchMusicOverview('/api/hobby/netease/overview');
		expect(window.sessionStorage).toHaveLength(1);
		const storageKey = window.sessionStorage.key(0);
		expect(storageKey).not.toBeNull();
		window.sessionStorage.setItem(
			storageKey as string,
			JSON.stringify({ state: 'ready', generatedAt: 0, tracks: [{}] }),
		);

		expect(await fetchMusicOverview('/api/hobby/netease/overview')).toEqual(
			unavailableMusicOverview,
		);
	});

	it('lets a valid empty ranking replace an older ready ranking', async () => {
		const emptyRanking = {
			state: 'empty',
			generatedAt: 1_800_000_060_000,
			tracks: [],
		} as const;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(validOverview), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						activity: { state: 'empty', track: null },
						weeklyRanking: emptyRanking,
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify(unavailableMusicOverview), { status: 200 }),
			);
		vi.stubGlobal('fetch', fetchMock);

		await fetchMusicOverview('/api/hobby/netease/overview');
		await fetchMusicOverview('/api/hobby/netease/overview');

		expect(await fetchMusicOverview('/api/hobby/netease/overview')).toEqual({
			activity: unavailableMusicOverview.activity,
			weeklyRanking: emptyRanking,
		});
	});
});

describe('useMusicOverview', () => {
	it('uses one overview endpoint with the recent-activity refresh window', () => {
		useMusicOverview();

		expect(useSWRMock).toHaveBeenCalledWith(
			'/api/hobby/netease/overview',
			fetchMusicOverview,
			expect.objectContaining({
				refreshInterval: 60_000,
				refreshWhenHidden: false,
				shouldRetryOnError: false,
				revalidateOnFocus: true,
			}),
		);
	});
});
