import 'server-only';
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

const isLoopbackHostname = (hostname: string): boolean => {
	const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (normalized === 'localhost' || normalized === '::1') {
		return true;
	}

	const octets = normalized.split('.');
	return (
		octets.length === 4 &&
		octets[0] === '127' &&
		octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
	);
};

const canSendSecretTo = (url: URL, nodeEnv: string | undefined): boolean =>
	url.protocol === 'https:' ||
	(url.protocol === 'http:' &&
		nodeEnv !== 'production' &&
		isLoopbackHostname(url.hostname));

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

	let baseUrl: URL;
	try {
		baseUrl = new URL(rawBaseUrl);
	} catch {
		return unavailableActivity();
	}

	if (!canSendSecretTo(baseUrl, env.NODE_ENV)) {
		return unavailableActivity();
	}

	let recentActivity: NeteaseActivityResponse = unavailableActivity();
	if (cookie) {
		const recentUrl = new URL('/record/recent/song', baseUrl);
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
				signal: AbortSignal.timeout(5000),
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
		const weeklyUrl = new URL('/user/record', baseUrl);
		weeklyUrl.searchParams.set('uid', userId);
		weeklyUrl.searchParams.set('type', '1');
		const response = await fetchImpl(weeklyUrl.toString(), {
			method: 'GET',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(5000),
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
