'use client';

import type {
	NeteaseOverview,
	NeteaseWeeklyRanking,
} from 'app/components/netease/types';
import useSWR from 'swr';
import {
	normalizeMusicActivity,
	unavailableMusicActivity,
} from './music-activity';
import {
	normalizeMusicWeeklyRanking,
	unavailableMusicWeeklyRanking,
} from './music-weekly-data';

type UnknownRecord = Record<string, unknown>;

const LAST_SUCCESSFUL_WEEKLY_STORAGE_KEY =
	'hobby:netease:last-successful-weekly';

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

export const unavailableMusicOverview: NeteaseOverview = {
	activity: unavailableMusicActivity,
	weeklyRanking: unavailableMusicWeeklyRanking,
};

export const normalizeMusicOverview = (value: unknown): NeteaseOverview => {
	const root = asRecord(value);
	if (!root) return unavailableMusicOverview;

	return {
		activity: normalizeMusicActivity(root.activity),
		weeklyRanking: normalizeMusicWeeklyRanking(root.weeklyRanking),
	};
};

const readLastSuccessfulWeekly = (): NeteaseWeeklyRanking | null => {
	if (typeof window === 'undefined') return null;

	try {
		const stored = window.sessionStorage.getItem(
			LAST_SUCCESSFUL_WEEKLY_STORAGE_KEY,
		);
		if (!stored) return null;

		const ranking = normalizeMusicWeeklyRanking(JSON.parse(stored));
		return ranking.state === 'unavailable' ? null : ranking;
	} catch {
		return null;
	}
};

const rememberSuccessfulWeekly = (ranking: NeteaseWeeklyRanking) => {
	if (typeof window === 'undefined' || ranking.state === 'unavailable') return;

	try {
		window.sessionStorage.setItem(
			LAST_SUCCESSFUL_WEEKLY_STORAGE_KEY,
			JSON.stringify(ranking),
		);
	} catch {
		// Storage can be blocked; the live response remains usable without it.
	}
};

const retainLastSuccessfulWeekly = (
	overview: NeteaseOverview,
): NeteaseOverview => {
	if (overview.weeklyRanking.state !== 'unavailable') {
		rememberSuccessfulWeekly(overview.weeklyRanking);
		return overview;
	}

	const storedRanking = readLastSuccessfulWeekly();
	return storedRanking
		? { ...overview, weeklyRanking: storedRanking }
		: overview;
};

export const fetchMusicOverview = async (
	url: string,
): Promise<NeteaseOverview> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			return retainLastSuccessfulWeekly(unavailableMusicOverview);
		}
		return retainLastSuccessfulWeekly(
			normalizeMusicOverview(await response.json()),
		);
	} catch {
		return retainLastSuccessfulWeekly(unavailableMusicOverview);
	}
};

export function useMusicOverview() {
	return useSWR<NeteaseOverview>(
		'/api/hobby/netease/overview',
		fetchMusicOverview,
		{
			refreshInterval: 60_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
