import 'server-only';
import { fetchNeteaseWeeklyRanking } from './fetch-weekly-ranking';
import { fetchNeteaseActivity } from './netease';
import type { NeteaseOverview } from './types';

type NeteaseOverviewEnv = Partial<
	Record<
		| 'NETEASE_API_BASE_URL'
		| 'NETEASE_MUSIC_COOKIE'
		| 'NETEASE_USER_ID'
		| 'NODE_ENV',
		string
	>
>;

type FetchNeteaseOverviewOptions = {
	env?: NeteaseOverviewEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

const requestMethod = (input: RequestInfo | URL, init?: RequestInit): string =>
	(
		init?.method ?? (input instanceof Request ? input.method : 'GET')
	).toUpperCase();

const requestUrl = (input: RequestInfo | URL): string =>
	input instanceof Request ? input.url : String(input);

const dedupeGetRequests = (fetchImpl: typeof fetch): typeof fetch => {
	const requests = new Map<string, Promise<Response>>();

	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		if (requestMethod(input, init) !== 'GET') {
			return fetchImpl(input, init);
		}

		const key = requestUrl(input);
		let request = requests.get(key);
		if (!request) {
			request = fetchImpl(input, init);
			requests.set(key, request);
		}

		return (await request).clone();
	}) as typeof fetch;
};

export async function fetchNeteaseOverview({
	env = process.env as NeteaseOverviewEnv,
	fetchImpl = fetch,
	now = Date.now(),
}: FetchNeteaseOverviewOptions = {}): Promise<NeteaseOverview> {
	const sharedFetch = dedupeGetRequests(fetchImpl);
	const [activity, weeklyRanking] = await Promise.all([
		fetchNeteaseActivity({ env, fetchImpl: sharedFetch, now }),
		fetchNeteaseWeeklyRanking({ env, fetchImpl: sharedFetch, now }),
	]);

	return {
		activity,
		weeklyRanking,
	};
}
