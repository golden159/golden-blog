// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBangumiAnime } from './bangumi';

const profilePayload = {
	username: '1022640',
	nickname: 'Golden',
	sign: '',
	avatar: { large: 'https://lain.bgm.tv/pic/user/l/avatar.jpg' },
};

const collectionPayload = {
	total: 1,
	limit: 6,
	offset: 0,
	data: [
		{
			subject_id: 42,
			subject_type: 2,
			rate: 8,
			type: 3,
			ep_status: 4,
			vol_status: 0,
			updated_at: '2026-08-24T10:00:00+08:00',
			private: false,
			subject: {
				id: 42,
				type: 2,
				name: 'Original',
				name_cn: '中文名',
				short_summary: '',
				images: { common: 'https://lain.bgm.tv/pic/cover/c/42.jpg' },
				eps: 12,
				volumes: 0,
				collection_total: 100,
				score: 8.5,
				rank: 1,
				tags: [],
			},
		},
	],
};

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('fetchBangumiAnime', () => {
	it('uses the Bangumi username rather than the numeric web profile id by default', async () => {
		const fetchImpl = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(
					JSON.stringify(
						fetchImpl.mock.calls.length === 1
							? profilePayload
							: collectionPayload,
					),
					{ status: 200 },
				),
		);

		await fetchBangumiAnime({ fetchImpl });

		expect(fetchImpl.mock.calls[0]?.[0]).toBe(
			'https://api.bgm.tv/v0/users/golden_xzs',
		);
		expect(fetchImpl.mock.calls[1]?.[0]).toContain(
			'/v0/users/golden_xzs/collections?',
		);
	});

	it('returns unavailable without making a request for an invalid configured username', async () => {
		const fetchImpl = vi.fn();

		const result = await fetchBangumiAnime({
			username: '',
			fetchImpl,
		});

		expect(result).toEqual({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('fetches the public profile and anime collections with a descriptive user agent', async () => {
		const fetchImpl = vi.fn(
			async (input: RequestInfo | URL, _init?: RequestInit) => {
				const url = String(input);
				if (url.startsWith('https://bgm.tv/')) {
					return new Response('', { status: 200 });
				}
				return new Response(
					JSON.stringify(
						url.endsWith('/collections?subject_type=2&limit=50&offset=0')
							? collectionPayload
							: profilePayload,
					),
					{ status: 200 },
				);
			},
		);

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result).toMatchObject({
			state: 'ready',
			profile: { username: '1022640', nickname: 'Golden' },
			total: 1,
			entries: [{ id: 42, title: '中文名', status: '在看' }],
		});
		const apiCalls = fetchImpl.mock.calls.filter(([input]) =>
			String(input).startsWith('https://api.bgm.tv/'),
		);
		expect(apiCalls).toHaveLength(2);
		for (const [input, init] of apiCalls) {
			expect(String(input)).toMatch(
				/^https:\/\/api\.bgm\.tv\/v0\/users\/1022640(?:\/collections\?subject_type=2&limit=50&offset=0)?$/,
			);
			expect(init).toMatchObject({
				method: 'GET',
				cache: 'no-store',
				redirect: 'error',
				headers: {
					Accept: 'application/json',
					'User-Agent': expect.stringContaining('golden-xzs-blog'),
				},
			});
		}
		for (const [, init] of fetchImpl.mock.calls) {
			expect(init?.headers).toMatchObject({
				'User-Agent': expect.stringContaining('golden-xzs-blog'),
			});
		}
	});

	it('does not mistake collection timestamps for a history of public activity', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		const item = collectionPayload.data[0];
		const collectionAt = (id: number, date: string) => ({
			...item,
			subject_id: id,
			updated_at: `${date}T10:00:00+08:00`,
			subject: { ...item.subject, id, name: `Anime ${id}` },
		});
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			if (url.hostname === 'bgm.tv') {
				return new Response('', { status: 200 });
			}
			if (!url.pathname.endsWith('/collections')) {
				return new Response(JSON.stringify(profilePayload), { status: 200 });
			}

			const offset = url.searchParams.get('offset');
			return new Response(
				JSON.stringify({
					total: 52,
					limit: 50,
					offset: Number(offset),
					data:
						offset === '0'
							? [collectionAt(1, '2026-09-12')]
							: [collectionAt(2, '2026-01-10'), collectionAt(3, '2025-09-16')],
				}),
				{ status: 200 },
			);
		});

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result).toMatchObject({
			state: 'ready',
			total: 52,
			activity: [],
			entries: [{ id: 1 }],
		});
		expect(fetchImpl.mock.calls.map(([input]) => String(input))).not.toContain(
			'https://api.bgm.tv/v0/users/1022640/collections?subject_type=2&limit=50&offset=50',
		);
	});

	it('builds the heatmap from every public timeline activity instead of one timestamp per collection', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		const timelinePages: Record<number, string> = {
			1: `
				<h4 class="Header">2026-9-12</h4>
				<ul>
					<li id="tml_103">收藏了人物</li>
					<li id="tml_102">看过 ep.2</li>
				</ul>
				<h4 class="Header">2026-9-11</h4>
				<ul><li id="tml_101">看过 ep.1</li></ul>
			`,
			2: `
				<template id="likes_reaction_grid_item" type="text/template">
					<a class="item {selected_class}" href="javascript:void(0);"></a>
				</template>
			`,
		};
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			if (url.hostname === 'bgm.tv') {
				const page = Number(url.searchParams.get('page'));
				return new Response(timelinePages[page] ?? '', { status: 200 });
			}
			return new Response(
				JSON.stringify(
					url.pathname.endsWith('/collections')
						? collectionPayload
						: profilePayload,
				),
				{ status: 200 },
			);
		});

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result.activity).toEqual([
			{ date: '2026-09-11', count: 1 },
			{ date: '2026-09-12', count: 2 },
		]);
		expect(result.activityState).toBe('ready');
		expect(
			fetchImpl.mock.calls.some(([input]) =>
				String(input).startsWith(
					'https://bgm.tv/user/1022640/timeline?type=all&page=1&ajax=1',
				),
			),
		).toBe(true);
	});

	it('marks the activity as unavailable when every public timeline host fails', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			if (url.hostname === 'bgm.tv' || url.hostname === 'bangumi.tv') {
				return new Response('temporary outage', { status: 503 });
			}
			return new Response(
				JSON.stringify(
					url.pathname.endsWith('/collections')
						? collectionPayload
						: profilePayload,
				),
				{ status: 200 },
			);
		});

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result).toMatchObject({
			state: 'ready',
			profile: { username: '1022640' },
			activity: [],
			activityState: 'unavailable',
		});
	});

	it('retries a transient public timeline page failure without dropping the calendar', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		let firstPageAttempts = 0;
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			if (url.hostname !== 'bgm.tv') {
				return new Response(
					JSON.stringify(
						url.pathname.endsWith('/collections')
							? collectionPayload
							: profilePayload,
					),
					{ status: 200 },
				);
			}

			const page = Number(url.searchParams.get('page'));
			if (page === 1 && firstPageAttempts++ === 0) {
				return new Response('temporary outage', { status: 503 });
			}
			if (page === 1) {
				return new Response(
					'<h4 class="Header">2026-9-12</h4><ul><li id="tml_101">看过 ep.1</li></ul>',
					{ status: 200 },
				);
			}
			if (page === 2) {
				return new Response(
					'<h4 class="Header">2025-9-16</h4><ul><li id="tml_100">一年以前</li></ul>',
					{ status: 200 },
				);
			}
			return new Response('', { status: 200 });
		});

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result.activity).toEqual([{ date: '2026-09-12', count: 1 }]);
		expect(firstPageAttempts).toBe(2);
	});

	it('falls back to the alternate public timeline host after repeated 503s', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			if (url.hostname === 'bgm.tv') {
				return new Response('temporary outage', { status: 503 });
			}
			if (url.hostname === 'bangumi.tv') {
				const page = Number(url.searchParams.get('page'));
				if (page === 1) {
					return new Response(
						'<h4 class="Header">2026-9-12</h4><ul><li id="tml_101">看过 ep.1</li></ul>',
						{ status: 200 },
					);
				}
				if (page === 2) {
					return new Response(
						'<h4 class="Header">2025-9-16</h4><ul><li id="tml_100">一年以前</li></ul>',
						{ status: 200 },
					);
				}
				return new Response('', { status: 200 });
			}
			return new Response(
				JSON.stringify(
					url.pathname.endsWith('/collections')
						? collectionPayload
						: profilePayload,
				),
				{ status: 200 },
			);
		});

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result.activity).toEqual([{ date: '2026-09-12', count: 1 }]);
		expect(
			fetchImpl.mock.calls.some(([input]) =>
				String(input).startsWith(
					'https://bangumi.tv/user/1022640/timeline?type=all&page=1&ajax=1',
				),
			),
		).toBe(true);
	});

	it('returns unavailable for an upstream failure or malformed payload', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('error', { status: 503 }));

		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl,
			}),
		).toEqual({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
		});

		const malformedFetch = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(profilePayload), { status: 200 }),
			);
		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl: malformedFetch,
			}),
		).toEqual({
			state: 'unavailable',
			profile: {
				username: '1022640',
				nickname: 'Golden',
				sign: null,
				avatarUrl: 'https://lain.bgm.tv/pic/user/l/avatar.jpg',
			},
			total: 0,
			entries: [],
			activity: [],
		});

		const throwingFetch = vi.fn().mockRejectedValue(new Error('timeout'));
		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl: throwingFetch,
			}),
		).toEqual({
			state: 'unavailable',
			profile: null,
			total: 0,
			entries: [],
			activity: [],
		});
	});

	it('keeps a valid profile when only the collections request fails', async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			if (String(input).includes('/collections?')) {
				return new Response('error', { status: 503 });
			}

			return new Response(JSON.stringify(profilePayload), { status: 200 });
		});

		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl,
			}),
		).toEqual({
			state: 'unavailable',
			profile: {
				username: '1022640',
				nickname: 'Golden',
				sign: null,
				avatarUrl: 'https://lain.bgm.tv/pic/user/l/avatar.jpg',
			},
			total: 0,
			entries: [],
			activity: [],
		});
	});

	it('keeps a valid profile when the collections request throws', async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			if (String(input).includes('/collections?')) {
				throw new Error('timeout');
			}

			return new Response(JSON.stringify(profilePayload), { status: 200 });
		});

		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl,
			}),
		).toEqual({
			state: 'unavailable',
			profile: {
				username: '1022640',
				nickname: 'Golden',
				sign: null,
				avatarUrl: 'https://lain.bgm.tv/pic/user/l/avatar.jpg',
			},
			total: 0,
			entries: [],
			activity: [],
		});
	});

	it('reads the profile body before a delayed collections failure settles', async () => {
		let collectionsSettled = false;
		const profileResponse = {
			ok: true,
			json: vi.fn(async () => {
				if (collectionsSettled) throw new Error('profile body aborted');
				return profilePayload;
			}),
		} as unknown as Response;
		const collectionsFailure = new Promise<Response>((_resolve, reject) => {
			setTimeout(() => {
				collectionsSettled = true;
				reject(new Error('collections timeout'));
			}, 0);
		});
		const fetchImpl = vi.fn((input: RequestInfo | URL) =>
			String(input).includes('/collections?')
				? collectionsFailure
				: Promise.resolve(profileResponse),
		);

		expect(
			await fetchBangumiAnime({
				username: '1022640',
				fetchImpl,
			}),
		).toMatchObject({
			state: 'unavailable',
			profile: {
				username: '1022640',
				nickname: 'Golden',
				avatarUrl: 'https://lain.bgm.tv/pic/user/l/avatar.jpg',
			},
		});
		expect(profileResponse.json).toHaveBeenCalledTimes(1);
	});

	it('returns an empty state for a valid profile with no anime collections', async () => {
		const fetchImpl = vi.fn(
			async (input: RequestInfo | URL) =>
				new Response(
					JSON.stringify(
						String(input).endsWith(
							'/collections?subject_type=2&limit=50&offset=0',
						)
							? { total: 0, limit: 6, offset: 0, data: [] }
							: profilePayload,
					),
					{ status: 200 },
				),
		);

		const result = await fetchBangumiAnime({
			username: '1022640',
			fetchImpl,
		});

		expect(result).toMatchObject({
			state: 'empty',
			profile: { username: '1022640' },
			total: 0,
			entries: [],
		});
	});
});
