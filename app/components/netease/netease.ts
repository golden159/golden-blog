import 'server-only';
import { normalizeRecentTrack } from './normalize-recent-track';
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
	const baseUrl = env.NETEASE_API_BASE_URL?.replace(/\/+$/, '');
	const cookie = env.NETEASE_MUSIC_COOKIE;
	const userId = env.NETEASE_USER_ID;

	if (!baseUrl || !cookie || !userId) {
		return unavailableActivity();
	}

	try {
		const upstreamUrl = new URL(`${baseUrl}/record/recent/song`);
		if (!canSendSecretTo(upstreamUrl, env.NODE_ENV)) {
			return unavailableActivity();
		}

		const response = await fetchImpl(upstreamUrl.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				cookie,
				limit: '1',
				timestamp: String(now),
				uid: userId,
			}),
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			return unavailableActivity();
		}

		return normalizeRecentTrack(await response.json(), now);
	} catch {
		return unavailableActivity();
	}
}
