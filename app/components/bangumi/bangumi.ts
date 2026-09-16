import 'server-only';
import { animeProfile } from 'app/hobby/content';
import {
	normalizeBangumiCollections,
	normalizeBangumiProfile,
} from './normalize';
import type { BangumiAnimeResponse } from './types';
import { unavailableBangumiAnime } from './types';

type BangumiEnv = Partial<Record<'BANGUMI_API_BASE_URL', string>>;

type FetchBangumiOptions = {
	env?: BangumiEnv;
	username?: string;
	fetchImpl?: typeof fetch;
};

const DEFAULT_API_BASE_URL = 'https://api.bgm.tv';
const COLLECTION_PAGE_LIMIT = 50;
const ACTIVITY_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_BATCH_SIZE = 8;
const MAX_TIMELINE_PAGES = 64;
const TIMELINE_BASE_URLS = ['https://bgm.tv/', 'https://bangumi.tv/'] as const;
const USER_AGENT =
	'golden-xzs-blog/1.0 (+https://github.com/golden159/golden-blog)';

type TimelineEvent = {
	id: number;
	date: string;
};

const normalizeTimelinePage = (html: string): TimelineEvent[] | null => {
	if (!html.trim()) return [];

	const events: TimelineEvent[] = [];
	for (const group of html.matchAll(
		/<h4 class="Header">(\d{4})-(\d{1,2})-(\d{1,2})<\/h4>\s*<ul>([\s\S]*?)<\/ul>/g,
	)) {
		const [, year, month, day, list] = group;
		const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
		if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
			return null;
		}
		for (const item of list.matchAll(/<li id="tml_(\d+)"/g)) {
			const id = Number(item[1]);
			if (!Number.isSafeInteger(id) || id <= 0) return null;
			events.push({ id, date });
		}
	}

	return events.length > 0 ? events : null;
};

const apiBaseUrl = (raw: string): URL | null => {
	try {
		const url = new URL(raw);
		if (
			url.protocol !== 'https:' ||
			url.hostname !== 'api.bgm.tv' ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			return null;
		}

		url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
		return url;
	} catch {
		return null;
	}
};

export async function fetchBangumiAnime(
	options: FetchBangumiOptions = {},
): Promise<BangumiAnimeResponse> {
	const { fetchImpl = fetch } = options;
	const env = options.env ?? (process.env as BangumiEnv);
	const username = options.username ?? animeProfile.apiUsername;
	const baseUrl = apiBaseUrl(env.BANGUMI_API_BASE_URL || DEFAULT_API_BASE_URL);

	if (!username || !/^[\w-]+$/.test(username) || !baseUrl) {
		return unavailableBangumiAnime();
	}

	const encodedUsername = encodeURIComponent(username);
	const profileUrl = new URL(`v0/users/${encodedUsername}`, baseUrl);
	const collectionsUrl = (offset: number) => {
		const url = new URL(`v0/users/${encodedUsername}/collections`, baseUrl);
		url.searchParams.set('subject_type', '2');
		url.searchParams.set('limit', String(COLLECTION_PAGE_LIMIT));
		url.searchParams.set('offset', String(offset));
		return url;
	};
	const timelineUrl = (page: number, baseUrl: string) => {
		const url = new URL(`user/${encodedUsername}/timeline`, baseUrl);
		url.searchParams.set('type', 'all');
		url.searchParams.set('page', String(page));
		url.searchParams.set('ajax', '1');
		return url;
	};

	const requestInit = (
		accept = 'application/json',
		timeout = 5000,
	): RequestInit => ({
		method: 'GET',
		headers: {
			Accept: accept,
			'User-Agent': USER_AGENT,
		},
		cache: 'no-store',
		redirect: 'error',
		signal: AbortSignal.timeout(timeout),
	});

	try {
		const profilePromise = (async () => {
			try {
				const response = await fetchImpl(profileUrl.toString(), requestInit());
				if (!response.ok) return null;
				return normalizeBangumiProfile(await response.json());
			} catch {
				return null;
			}
		})();
		const collectionsPromise = (async () => {
			try {
				const response = await fetchImpl(
					collectionsUrl(0).toString(),
					requestInit(),
				);
				if (!response.ok) return null;
				return normalizeBangumiCollections(await response.json());
			} catch {
				return null;
			}
		})();
		const activityPromise = (async () => {
			const today = new Date();
			const todayUtc = Date.UTC(
				today.getUTCFullYear(),
				today.getUTCMonth(),
				today.getUTCDate(),
			);
			const firstDate = new Date(todayUtc - (ACTIVITY_DAYS - 1) * DAY_MS)
				.toISOString()
				.slice(0, 10);
			const lastDate = new Date(todayUtc).toISOString().slice(0, 10);
			const events = new Map<number, string>();
			let reachedBoundary = false;
			const fetchTimelinePage = async (
				pageNumber: number,
			): Promise<TimelineEvent[] | null> => {
				let lastFailure = 'invalid response';
				for (const baseUrl of TIMELINE_BASE_URLS) {
					for (let attempt = 0; attempt < 2; attempt += 1) {
						try {
							const response = await fetchImpl(
								timelineUrl(pageNumber, baseUrl).toString(),
								requestInit('text/html', 10_000),
							);
							if (!response.ok) {
								lastFailure = `HTTP ${response.status}`;
								continue;
							}
							const page = normalizeTimelinePage(await response.text());
							if (page) return page;
							lastFailure = 'unrecognized response';
						} catch (error) {
							lastFailure =
								error instanceof Error ? error.message : 'unknown error';
						}
					}
				}
				console.warn(
					`Bangumi timeline page ${pageNumber} failed after retry`,
					lastFailure,
				);
				return null;
			};

			for (
				let firstPage = 1;
				firstPage <= MAX_TIMELINE_PAGES;
				firstPage += TIMELINE_BATCH_SIZE
			) {
				const pages = await Promise.all(
					Array.from({ length: TIMELINE_BATCH_SIZE }, (_, index) =>
						fetchTimelinePage(firstPage + index),
					),
				);
				if (pages.some((page) => page === null)) return null;

				for (const page of pages as TimelineEvent[][]) {
					if (page.length === 0) reachedBoundary = true;
					for (const event of page) {
						if (event.date < firstDate) reachedBoundary = true;
						if (event.date >= firstDate && event.date <= lastDate) {
							events.set(event.id, event.date);
						}
					}
				}
				if (reachedBoundary) break;
			}

			if (!reachedBoundary) return null;
			const counts = new Map<string, number>();
			for (const date of events.values()) {
				counts.set(date, (counts.get(date) ?? 0) + 1);
			}
			return [...counts]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([date, count]) => ({ date, count }));
		})();
		const [profile, collections, activity] = await Promise.all([
			profilePromise,
			collectionsPromise,
			activityPromise,
		]);
		if (!profile || !collections) return unavailableBangumiAnime(profile);

		return {
			state: collections.entries.length > 0 ? 'ready' : 'empty',
			profile,
			...collections,
			activity: activity ?? [],
		};
	} catch {
		return unavailableBangumiAnime();
	}
}
