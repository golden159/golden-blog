import 'server-only';
import type { NeteaseListeningFootprint } from './footprint-types';
import { buildNeteaseApiUrl, parseNeteaseApiBaseUrl } from './netease-api-url';
import { normalizeListeningFootprint } from './normalize-listening-footprint';

type NeteaseEnv = Partial<
	Record<
		| 'NETEASE_API_BASE_URL'
		| 'NETEASE_MUSIC_COOKIE'
		| 'NETEASE_USER_ID'
		| 'NODE_ENV',
		string
	>
>;

type FetchNeteaseListeningFootprintOptions = {
	env?: NeteaseEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

type FetchPayloadOptions = {
	base: URL;
	endpoint: string;
	fetchImpl: typeof fetch;
	method: 'GET' | 'POST';
	searchParams?: Record<string, string>;
	body?: URLSearchParams;
	headers?: HeadersInit;
};

const fetchPayload = async ({
	base,
	endpoint,
	fetchImpl,
	method,
	searchParams,
	body,
	headers,
}: FetchPayloadOptions): Promise<unknown | null> => {
	try {
		const url = buildNeteaseApiUrl(base, endpoint);
		for (const [key, value] of Object.entries(searchParams ?? {})) {
			url.searchParams.set(key, value);
		}
		const response = await fetchImpl(url.toString(), {
			method,
			headers,
			body,
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(5000),
		});
		return response.ok ? await response.json() : null;
	} catch {
		return null;
	}
};

export async function fetchNeteaseListeningFootprint({
	env = process.env as NeteaseEnv,
	fetchImpl = fetch,
	now = Date.now(),
}: FetchNeteaseListeningFootprintOptions = {}): Promise<NeteaseListeningFootprint> {
	const base = parseNeteaseApiBaseUrl(env.NETEASE_API_BASE_URL, env.NODE_ENV);
	const cookie = env.NETEASE_MUSIC_COOKIE;
	const userId = env.NETEASE_USER_ID;

	if (!base || !userId) {
		return normalizeListeningFootprint({
			recentPayload: null,
			weeklyPayload: null,
			detailPayload: null,
			now,
			recentLimit: 100,
		});
	}

	const [recentPayload, weeklyPayload, detailPayload] = await Promise.all([
		cookie
			? fetchPayload({
					base,
					endpoint: '/record/recent/song',
					fetchImpl,
					method: 'POST',
					body: new URLSearchParams({
						limit: '100',
						timestamp: String(now),
						uid: userId,
					}),
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Cookie: cookie,
						'x-apicache-bypass': '1',
					},
				})
			: Promise.resolve(null),
		fetchPayload({
			base,
			endpoint: '/user/record',
			fetchImpl,
			method: 'GET',
			searchParams: { uid: userId, type: '1' },
		}),
		fetchPayload({
			base,
			endpoint: '/user/detail',
			fetchImpl,
			method: 'GET',
			searchParams: { uid: userId },
		}),
	]);

	return normalizeListeningFootprint({
		recentPayload,
		weeklyPayload,
		detailPayload,
		now,
		recentLimit: 100,
	});
}
