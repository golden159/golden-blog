import 'server-only';
import { buildNeteaseApiUrl, parseNeteaseApiBaseUrl } from './netease-api-url';
import { normalizeWeeklyRanking } from './normalize-weekly-track';
import type { NeteaseWeeklyRanking } from './types';

type NeteaseWeeklyEnv = Partial<
	Record<'NETEASE_API_BASE_URL' | 'NETEASE_USER_ID' | 'NODE_ENV', string>
>;

export type NeteaseWeeklyFailure = {
	reason:
		| 'invalid-configuration'
		| 'upstream-status'
		| 'invalid-json'
		| 'invalid-payload'
		| 'timeout'
		| 'request-failed';
	status?: number;
};

type FetchNeteaseWeeklyRankingOptions = {
	env?: NeteaseWeeklyEnv;
	fetchImpl?: typeof fetch;
	now?: number;
	onFailure?: (failure: NeteaseWeeklyFailure) => void;
};

const WEEKLY_REQUEST_TIMEOUT_MS = 8000;

const reportFailure = (failure: NeteaseWeeklyFailure) => {
	console.warn('[netease-weekly]', failure);
};

const safelyReportFailure = (
	onFailure: (failure: NeteaseWeeklyFailure) => void,
	failure: NeteaseWeeklyFailure,
) => {
	try {
		onFailure(failure);
	} catch {
		// Diagnostics must never turn a fail-closed response into a route failure.
	}
};

const isTimeoutError = (error: unknown): boolean =>
	error instanceof Error &&
	(error.name === 'TimeoutError' || error.name === 'AbortError');

const requestFailureReason = (
	error: unknown,
): NeteaseWeeklyFailure['reason'] =>
	isTimeoutError(error) ? 'timeout' : 'request-failed';

const unavailableRanking = (now: number): NeteaseWeeklyRanking =>
	normalizeWeeklyRanking(null, now);

export async function fetchNeteaseWeeklyRanking({
	env = process.env as NeteaseWeeklyEnv,
	fetchImpl = fetch,
	now = Date.now(),
	onFailure = reportFailure,
}: FetchNeteaseWeeklyRankingOptions = {}): Promise<NeteaseWeeklyRanking> {
	const base = parseNeteaseApiBaseUrl(env.NETEASE_API_BASE_URL, env.NODE_ENV);
	const userId = env.NETEASE_USER_ID;
	if (!base || !userId || !/^[1-9]\d*$/.test(userId)) {
		safelyReportFailure(onFailure, { reason: 'invalid-configuration' });
		return unavailableRanking(now);
	}

	let response: Response;
	try {
		const url = buildNeteaseApiUrl(base, '/user/record');
		url.searchParams.set('uid', userId);
		url.searchParams.set('type', '1');
		response = await fetchImpl(url.toString(), {
			method: 'GET',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(WEEKLY_REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		safelyReportFailure(onFailure, { reason: requestFailureReason(error) });
		return unavailableRanking(now);
	}

	if (!response.ok) {
		safelyReportFailure(onFailure, {
			reason: 'upstream-status',
			status: response.status,
		});
		return unavailableRanking(now);
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch (error) {
		safelyReportFailure(onFailure, {
			reason:
				error instanceof SyntaxError
					? 'invalid-json'
					: requestFailureReason(error),
		});
		return unavailableRanking(now);
	}

	const ranking = normalizeWeeklyRanking(payload, now);
	if (ranking.state === 'unavailable') {
		safelyReportFailure(onFailure, { reason: 'invalid-payload' });
	}
	return ranking;
}
