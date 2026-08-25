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
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('fetches the public profile and anime collections with a descriptive user agent', async () => {
		const fetchImpl = vi.fn(
			async (input: RequestInfo | URL, _init?: RequestInit) => {
				const url = String(input);
				return new Response(
					JSON.stringify(
						url.endsWith('/collections?subject_type=2&limit=6&offset=0')
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
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		for (const [input, init] of fetchImpl.mock.calls) {
			expect(String(input)).toMatch(
				/^https:\/\/api\.bgm\.tv\/v0\/users\/1022640(?:\/collections\?subject_type=2&limit=6&offset=0)?$/,
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
							'/collections?subject_type=2&limit=6&offset=0',
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
