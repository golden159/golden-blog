import 'server-only';
import { buildNeteaseApiUrl, parseNeteaseApiBaseUrl } from './netease-api-url';
import { normalizeRecentTrack } from './normalize-recent-track';
import { normalizeWeeklyTrack } from './normalize-weekly-track';
import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

type NeteaseEnv = Partial<
	Record<
		| 'NETEASE_API_BASE_URL'
		| 'NETEASE_MUSIC_COOKIE'
		| 'NETEASE_USER_ID'
		| 'NODE_ENV',
		string
	>
>;

type FetchNeteaseOptions = {
	env?: NeteaseEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

const RECENT_REQUEST_TIMEOUT_MS = 5000;
const WEEKLY_REQUEST_TIMEOUT_MS = 8000;

export async function fetchNeteaseActivity({
	env = process.env as NeteaseEnv,
	fetchImpl = fetch,
	now = Date.now(),
}: FetchNeteaseOptions = {}): Promise<NeteaseActivityResponse> {
	const rawBaseUrl = env.NETEASE_API_BASE_URL;
	const cookie = env.NETEASE_MUSIC_COOKIE;
	const userId = env.NETEASE_USER_ID;

	if (!rawBaseUrl || !userId) {
		return unavailableActivity();
	}

	const baseUrl = parseNeteaseApiBaseUrl(rawBaseUrl, env.NODE_ENV);
	if (!baseUrl) {
		return unavailableActivity();
	}

	let recentActivity: NeteaseActivityResponse = unavailableActivity();
	if (cookie) {
		const recentUrl = buildNeteaseApiUrl(baseUrl, '/record/recent/song');
		try {
			const response = await fetchImpl(recentUrl.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					// Keep the credential in the standard header. The upstream's
					// form-cookie parser splits values on every "=" and can truncate it.
					Cookie: cookie,
					'x-apicache-bypass': '1',
				},
				body: new URLSearchParams({
					limit: '1',
					timestamp: String(now),
					uid: userId,
				}),
				cache: 'no-store',
				redirect: 'error',
				signal: AbortSignal.timeout(RECENT_REQUEST_TIMEOUT_MS),
			});

			recentActivity = response.ok
				? normalizeRecentTrack(await response.json(), now)
				: unavailableActivity();
		} catch {
			recentActivity = unavailableActivity();
		}

		if (recentActivity.state === 'recent' || recentActivity.state === 'older') {
			return recentActivity;
		}
	}

	try {
		const weeklyUrl = buildNeteaseApiUrl(baseUrl, '/user/record');
		weeklyUrl.searchParams.set('uid', userId);
		weeklyUrl.searchParams.set('type', '1');
		const response = await fetchImpl(weeklyUrl.toString(), {
			method: 'GET',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(WEEKLY_REQUEST_TIMEOUT_MS),
		});

		if (!response.ok) {
			return recentActivity;
		}

		const weeklyActivity = normalizeWeeklyTrack(await response.json());
		return weeklyActivity.state === 'weekly' ? weeklyActivity : recentActivity;
	} catch {
		return recentActivity;
	}
}
