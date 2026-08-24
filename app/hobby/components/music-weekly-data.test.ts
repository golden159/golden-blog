import { afterEach, describe, expect, it, vi } from 'vitest';

const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));

vi.mock('swr', () => ({ default: useSWRMock }));

import {
	fetchMusicWeeklyRanking,
	normalizeMusicWeeklyRanking,
	unavailableMusicWeeklyRanking,
	useMusicWeeklyRanking,
} from './music-weekly-data';

const weeklyTrack = (rank: number) => ({
	rank,
	title: `Track ${rank}`,
	artists: [`Artist ${rank}`],
	album: `Album ${rank}`,
	albumArtUrl: `https://p${rank}.music.126.net/cover-${rank}.jpg`,
	songUrl: `https://music.163.com/song?id=${rank}`,
	durationMs: 180_000 + rank,
	playCount: rank === 2 ? 0 : rank + 3,
	score: 101 - rank,
});

const validRanking = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	tracks: Array.from({ length: 10 }, (_, index) => weeklyTrack(index + 1)),
} as const;

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('normalizeMusicWeeklyRanking', () => {
	it('accepts a complete top-ten ranking without changing public fields', () => {
		expect(normalizeMusicWeeklyRanking(validRanking)).toEqual(validRanking);
	});

	it.each([
		{
			state: 'empty',
			generatedAt: 1_800_000_000_000,
			tracks: [],
		},
		{
			state: 'unavailable',
			generatedAt: 1_800_000_000_000,
			tracks: [],
		},
	] as const)('preserves a coherent $state response', (ranking) => {
		expect(normalizeMusicWeeklyRanking(ranking)).toEqual(ranking);
	});

	it.each([
		['an invalid state', { ...validRanking, state: 'partial' }],
		['ready with no tracks', { ...validRanking, tracks: [] }],
		[
			'an empty state with tracks',
			{ ...validRanking, state: 'empty', tracks: [weeklyTrack(1)] },
		],
		[
			'more than ten tracks',
			{
				...validRanking,
				tracks: Array.from({ length: 11 }, (_, index) =>
					weeklyTrack(index + 1),
				),
			},
		],
		[
			'a non-sequential rank',
			{
				...validRanking,
				tracks: [weeklyTrack(1), { ...weeklyTrack(2), rank: 3 }],
			},
		],
		[
			'unsafe artwork',
			{
				...validRanking,
				tracks: [
					{ ...weeklyTrack(1), albumArtUrl: 'https://example.com/cover.jpg' },
				],
			},
		],
		[
			'an unsafe song link',
			{
				...validRanking,
				tracks: [
					{
						...weeklyTrack(1),
						songUrl: 'https://music.163.com/song?id=1&redirect=evil',
					},
				],
			},
		],
		[
			'a credentialed song link',
			{
				...validRanking,
				tracks: [
					{
						...weeklyTrack(1),
						songUrl: 'https://attacker@music.163.com/song?id=1',
					},
				],
			},
		],
		[
			'a negative duration',
			{
				...validRanking,
				tracks: [{ ...weeklyTrack(1), durationMs: -1 }],
			},
		],
		[
			'a negative play count',
			{
				...validRanking,
				tracks: [{ ...weeklyTrack(1), playCount: -1 }],
			},
		],
		[
			'a non-finite score',
			{
				...validRanking,
				tracks: [{ ...weeklyTrack(1), score: Number.POSITIVE_INFINITY }],
			},
		],
		['an invalid generated timestamp', { ...validRanking, generatedAt: 1e20 }],
	] as const)('fails closed for %s', (_label, value) => {
		expect(normalizeMusicWeeklyRanking(value)).toEqual(
			unavailableMusicWeeklyRanking,
		);
	});

	it('accepts null artwork and unavailable numeric metrics', () => {
		const ranking = {
			...validRanking,
			tracks: [
				{
					...weeklyTrack(1),
					albumArtUrl: null,
					durationMs: null,
					playCount: null,
					score: null,
				},
			],
		};

		expect(normalizeMusicWeeklyRanking(ranking)).toEqual(ranking);
	});
});

describe('fetchMusicWeeklyRanking', () => {
	it('normalizes a successful response without browser caching', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(validRanking), {
				status: 200,
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		expect(await fetchMusicWeeklyRanking('/api/hobby/netease/weekly')).toEqual(
			validRanking,
		);
		expect(fetchMock).toHaveBeenCalledWith('/api/hobby/netease/weekly', {
			cache: 'no-store',
		});
	});

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
	] as const)('returns unavailable for %s', async (_label, fetchResult) => {
		vi.stubGlobal('fetch', vi.fn(fetchResult));

		expect(await fetchMusicWeeklyRanking('/api/hobby/netease/weekly')).toEqual(
			unavailableMusicWeeklyRanking,
		);
	});
});

describe('useMusicWeeklyRanking', () => {
	it('uses the weekly endpoint and a five-minute refresh', () => {
		useMusicWeeklyRanking();

		expect(useSWRMock).toHaveBeenCalledWith(
			'/api/hobby/netease/weekly',
			fetchMusicWeeklyRanking,
			expect.objectContaining({
				refreshInterval: 300_000,
				refreshWhenHidden: false,
				shouldRetryOnError: false,
				revalidateOnFocus: true,
			}),
		);
	});

	it('can be disabled when ranking data is injected', () => {
		useMusicWeeklyRanking(false);

		expect(useSWRMock).toHaveBeenCalledWith(
			null,
			fetchMusicWeeklyRanking,
			expect.any(Object),
		);
	});
});
