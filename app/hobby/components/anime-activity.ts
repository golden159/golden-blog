'use client';

import type {
	BangumiAnimeEntry,
	BangumiAnimeResponse,
	BangumiProfile,
} from 'app/components/bangumi/types';
import useSWR from 'swr';

export const unavailableAnimeActivity: BangumiAnimeResponse = {
	state: 'unavailable',
	profile: null,
	total: 0,
	entries: [],
};

type UnknownRecord = Record<string, unknown>;

const statuses = new Set(['想看', '看过', '在看', '搁置', '抛弃']);

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const nonNegativeInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const nullableScore = (value: unknown): value is number | null =>
	value === null ||
	(typeof value === 'number' &&
		Number.isFinite(value) &&
		value > 0 &&
		value <= 10);

const trustedBangumiImage = (value: unknown): value is string | null => {
	if (value === null) return true;
	if (!nonEmptyString(value)) return false;

	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase();
		return (
			url.protocol === 'https:' &&
			(hostname === 'bgm.tv' ||
				hostname.endsWith('.bgm.tv') ||
				hostname === 'bangumi.tv' ||
				hostname.endsWith('.bangumi.tv'))
		);
	} catch {
		return false;
	}
};

const normalizeProfile = (value: unknown): BangumiProfile | null => {
	const profile = asRecord(value);
	if (
		!profile ||
		!nonEmptyString(profile.username) ||
		!nonEmptyString(profile.nickname) ||
		!(profile.sign === null || nonEmptyString(profile.sign)) ||
		!trustedBangumiImage(profile.avatarUrl)
	) {
		return null;
	}

	return {
		username: profile.username,
		nickname: profile.nickname,
		sign: profile.sign,
		avatarUrl: profile.avatarUrl,
	};
};

const normalizeEntry = (value: unknown): BangumiAnimeEntry | null => {
	const entry = asRecord(value);
	if (
		!entry ||
		!nonNegativeInteger(entry.id) ||
		entry.id === 0 ||
		!nonEmptyString(entry.title) ||
		!(entry.originalTitle === null || nonEmptyString(entry.originalTitle)) ||
		!trustedBangumiImage(entry.imageUrl) ||
		!statuses.has(String(entry.status)) ||
		!nullableScore(entry.personalScore) ||
		!nullableScore(entry.communityScore) ||
		!nonNegativeInteger(entry.watchedEpisodes) ||
		!nonNegativeInteger(entry.totalEpisodes)
	) {
		return null;
	}

	return {
		id: entry.id,
		title: entry.title,
		originalTitle: entry.originalTitle,
		imageUrl: entry.imageUrl,
		status: entry.status as BangumiAnimeEntry['status'],
		personalScore: entry.personalScore,
		communityScore: entry.communityScore,
		watchedEpisodes: entry.watchedEpisodes,
		totalEpisodes: entry.totalEpisodes,
	};
};

export const normalizeAnimeActivity = (
	value: unknown,
): BangumiAnimeResponse => {
	const root = asRecord(value);
	if (!root) return unavailableAnimeActivity;
	if (root.state === 'unavailable') {
		const profile = normalizeProfile(root.profile);
		return profile
			? { ...unavailableAnimeActivity, profile }
			: unavailableAnimeActivity;
	}
	if (root.state !== 'ready' && root.state !== 'empty') {
		return unavailableAnimeActivity;
	}

	const profile = normalizeProfile(root.profile);
	const total = root.total;
	const rawEntries = root.entries;
	if (
		!profile ||
		!nonNegativeInteger(total) ||
		!Array.isArray(rawEntries) ||
		rawEntries.length > 6
	) {
		return unavailableAnimeActivity;
	}

	const entries = rawEntries.map(normalizeEntry);
	if (entries.some((entry) => entry === null)) {
		return unavailableAnimeActivity;
	}
	const validEntries = entries as BangumiAnimeEntry[];

	if (
		(root.state === 'ready' &&
			(validEntries.length === 0 || total < validEntries.length)) ||
		(root.state === 'empty' && (validEntries.length !== 0 || total !== 0))
	) {
		return unavailableAnimeActivity;
	}

	return { state: root.state, profile, total, entries: validEntries };
};

export const fetchAnimeActivity = async (
	url: string,
): Promise<BangumiAnimeResponse> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) return unavailableAnimeActivity;
		return normalizeAnimeActivity(await response.json());
	} catch {
		return unavailableAnimeActivity;
	}
};

export function useAnimeActivity(enabled = true) {
	return useSWR<BangumiAnimeResponse>(
		enabled ? '/api/hobby/bangumi' : null,
		fetchAnimeActivity,
		{
			refreshInterval: 5 * 60_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
