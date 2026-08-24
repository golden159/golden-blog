import 'server-only';
import { buildNeteaseApiUrl, parseNeteaseApiBaseUrl } from './netease-api-url';
import { normalizeWeeklyRanking } from './normalize-weekly-track';
import type { NeteaseWeeklyRanking } from './types';

type NeteaseWeeklyEnv = Partial<
	Record<'NETEASE_API_BASE_URL' | 'NETEASE_USER_ID' | 'NODE_ENV', string>
>;

type FetchNeteaseWeeklyRankingOptions = {
	env?: NeteaseWeeklyEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

export async function fetchNeteaseWeeklyRanking({
	env = process.env as NeteaseWeeklyEnv,
	fetchImpl = fetch,
	now = Date.now(),
}: FetchNeteaseWeeklyRankingOptions = {}): Promise<NeteaseWeeklyRanking> {
	const base = parseNeteaseApiBaseUrl(env.NETEASE_API_BASE_URL, env.NODE_ENV);
	const userId = env.NETEASE_USER_ID;
	if (!base || !userId || !/^[1-9]\d*$/.test(userId)) {
		return normalizeWeeklyRanking(null, now);
	}

	try {
		const url = buildNeteaseApiUrl(base, '/user/record');
		url.searchParams.set('uid', userId);
		url.searchParams.set('type', '1');
		const response = await fetchImpl(url.toString(), {
			method: 'GET',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) return normalizeWeeklyRanking(null, now);

		return normalizeWeeklyRanking(await response.json(), now);
	} catch {
		return normalizeWeeklyRanking(null, now);
	}
}
