import 'server-only';
import { normalizeRecentTrack } from './normalize-recent-track';
import type { NeteaseActivityResponse } from './types';
import { unavailableActivity } from './types';

type NeteaseEnv = Partial<
	Record<
		'NETEASE_API_BASE_URL' | 'NETEASE_MUSIC_COOKIE' | 'NETEASE_USER_ID',
		string
	>
>;

type FetchNeteaseOptions = {
	env?: NeteaseEnv;
	fetchImpl?: typeof fetch;
	now?: number;
};

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
		if (!['http:', 'https:'].includes(upstreamUrl.protocol)) {
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
