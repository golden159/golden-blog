import 'server-only';
import { animeProfile } from 'app/hobby/content';
import {
	normalizeBangumiCollections,
	normalizeBangumiProfile,
} from './normalize';
import type { BangumiAnimeResponse } from './types';
import { unavailableBangumiAnime } from './types';

type BangumiEnv = Partial<Record<'BANGUMI_API_BASE_URL', string>>;

type FetchBangumiOptions = {
	env?: BangumiEnv;
	username?: string;
	fetchImpl?: typeof fetch;
};

const DEFAULT_API_BASE_URL = 'https://api.bgm.tv';
const USER_AGENT =
	'golden-xzs-blog/1.0 (+https://github.com/golden159/golden-blog)';

const apiBaseUrl = (raw: string): URL | null => {
	try {
		const url = new URL(raw);
		if (
			url.protocol !== 'https:' ||
			url.hostname !== 'api.bgm.tv' ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			return null;
		}

		url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
		return url;
	} catch {
		return null;
	}
};

export async function fetchBangumiAnime(
	options: FetchBangumiOptions = {},
): Promise<BangumiAnimeResponse> {
	const { fetchImpl = fetch } = options;
	const env = options.env ?? (process.env as BangumiEnv);
	const username = options.username ?? animeProfile.apiUsername;
	const baseUrl = apiBaseUrl(env.BANGUMI_API_BASE_URL || DEFAULT_API_BASE_URL);

	if (!username || !/^[\w-]+$/.test(username) || !baseUrl) {
		return unavailableBangumiAnime();
	}

	const encodedUsername = encodeURIComponent(username);
	const profileUrl = new URL(`v0/users/${encodedUsername}`, baseUrl);
	const collectionsUrl = new URL(
		`v0/users/${encodedUsername}/collections`,
		baseUrl,
	);
	collectionsUrl.searchParams.set('subject_type', '2');
	collectionsUrl.searchParams.set('limit', '6');
	collectionsUrl.searchParams.set('offset', '0');

	const requestInit = (): RequestInit => ({
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'User-Agent': USER_AGENT,
		},
		cache: 'no-store',
		redirect: 'error',
		signal: AbortSignal.timeout(5000),
	});

	try {
		const profilePromise = (async () => {
			try {
				const response = await fetchImpl(profileUrl.toString(), requestInit());
				if (!response.ok) return null;
				return normalizeBangumiProfile(await response.json());
			} catch {
				return null;
			}
		})();
		const collectionsPromise = (async () => {
			try {
				const response = await fetchImpl(
					collectionsUrl.toString(),
					requestInit(),
				);
				if (!response.ok) return null;
				return normalizeBangumiCollections(await response.json());
			} catch {
				return null;
			}
		})();
		const [profile, collections] = await Promise.all([
			profilePromise,
			collectionsPromise,
		]);
		if (!profile || !collections) return unavailableBangumiAnime(profile);

		return {
			state: collections.entries.length > 0 ? 'ready' : 'empty',
			profile,
			...collections,
		};
	} catch {
		return unavailableBangumiAnime();
	}
}
