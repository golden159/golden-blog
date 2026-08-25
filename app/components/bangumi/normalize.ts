import type {
	BangumiAnimeEntry,
	BangumiCollectionStatus,
	BangumiProfile,
	NormalizedBangumiCollections,
} from './types';

type UnknownRecord = Record<string, unknown>;

const COLLECTION_LIMIT = 6;

const collectionStatuses: Record<number, BangumiCollectionStatus> = {
	1: '想看',
	2: '看过',
	3: '在看',
	4: '搁置',
	5: '抛弃',
};

const asRecord = (value: unknown): UnknownRecord | null =>
	typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const nonNegativeInteger = (value: unknown): number | null =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
		? value
		: null;

const positiveInteger = (value: unknown): number | null => {
	const valueAsInteger = nonNegativeInteger(value);
	return valueAsInteger !== null && valueAsInteger > 0 ? valueAsInteger : null;
};

const score = (value: unknown): number | null =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	value > 0 &&
	value <= 10
		? value
		: null;

const trustedBangumiImage = (value: unknown): string | null => {
	const raw = text(value);
	if (!raw) return null;

	try {
		const url = new URL(raw);
		const hostname = url.hostname.toLowerCase();
		const isBangumiHost =
			hostname === 'bgm.tv' ||
			hostname.endsWith('.bgm.tv') ||
			hostname === 'bangumi.tv' ||
			hostname.endsWith('.bangumi.tv');

		return url.protocol === 'https:' && isBangumiHost ? url.toString() : null;
	} catch {
		return null;
	}
};

export function normalizeBangumiProfile(
	payload: unknown,
): BangumiProfile | null {
	const profile = asRecord(payload);
	const username = text(profile?.username);
	if (!profile || !username) return null;

	const avatar = asRecord(profile.avatar);
	return {
		username,
		nickname: text(profile.nickname) ?? username,
		sign: text(profile.sign),
		avatarUrl:
			trustedBangumiImage(avatar?.large) ?? trustedBangumiImage(avatar?.medium),
	};
}

type EntryWithTimestamp = {
	entry: BangumiAnimeEntry;
	updatedAt: number;
};

const normalizeCollection = (value: unknown): EntryWithTimestamp | null => {
	const collection = asRecord(value);
	const subject = asRecord(collection?.subject);
	const subjectId = positiveInteger(collection?.subject_id);
	const nestedSubjectId = positiveInteger(subject?.id);
	const subjectType = positiveInteger(collection?.subject_type);
	const nestedSubjectType = positiveInteger(subject?.type);
	const collectionType = positiveInteger(collection?.type);
	const status = collectionType
		? collectionStatuses[collectionType]
		: undefined;
	const originalTitle = text(subject?.name);
	const localizedTitle = text(subject?.name_cn);
	const watchedEpisodes = nonNegativeInteger(collection?.ep_status);
	const totalEpisodes = nonNegativeInteger(subject?.eps);

	if (
		!collection ||
		!subject ||
		!subjectId ||
		nestedSubjectId !== subjectId ||
		subjectType !== 2 ||
		nestedSubjectType !== 2 ||
		!status ||
		!originalTitle ||
		watchedEpisodes === null ||
		totalEpisodes === null
	) {
		return null;
	}

	const images = asRecord(subject.images);
	const updatedAtText = text(collection.updated_at);
	const parsedUpdatedAt = updatedAtText
		? Date.parse(updatedAtText)
		: Number.NaN;

	return {
		updatedAt: Number.isFinite(parsedUpdatedAt)
			? parsedUpdatedAt
			: Number.NEGATIVE_INFINITY,
		entry: {
			id: subjectId,
			title: localizedTitle ?? originalTitle,
			originalTitle:
				localizedTitle && localizedTitle !== originalTitle
					? originalTitle
					: null,
			imageUrl:
				trustedBangumiImage(images?.common) ??
				trustedBangumiImage(images?.large),
			status,
			personalScore: score(collection.rate),
			communityScore: score(subject.score),
			watchedEpisodes,
			totalEpisodes,
		},
	};
};

export function normalizeBangumiCollections(
	payload: unknown,
): NormalizedBangumiCollections | null {
	const page = asRecord(payload);
	const total = nonNegativeInteger(page?.total);
	const data = page?.data;

	if (!page || total === null || !Array.isArray(data) || total < data.length) {
		return null;
	}

	const entries = data
		.map(normalizeCollection)
		.filter((value): value is EntryWithTimestamp => value !== null)
		.sort((left, right) => right.updatedAt - left.updatedAt)
		.slice(0, COLLECTION_LIMIT)
		.map(({ entry }) => entry);

	if (total > 0 && entries.length === 0) return null;

	return { total, entries };
}
