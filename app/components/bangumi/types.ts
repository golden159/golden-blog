export type BangumiCollectionStatus =
	| '想看'
	| '看过'
	| '在看'
	| '搁置'
	| '抛弃';

export type BangumiProfile = {
	username: string;
	nickname: string;
	sign: string | null;
	avatarUrl: string | null;
};

export type BangumiAnimeEntry = {
	id: number;
	title: string;
	originalTitle: string | null;
	imageUrl: string | null;
	status: BangumiCollectionStatus;
	personalScore: number | null;
	communityScore: number | null;
	watchedEpisodes: number;
	totalEpisodes: number;
};

export type BangumiAnimeResponse = {
	state: 'ready' | 'empty' | 'unavailable';
	profile: BangumiProfile | null;
	total: number;
	entries: BangumiAnimeEntry[];
};

export type NormalizedBangumiCollections = Pick<
	BangumiAnimeResponse,
	'total' | 'entries'
>;

export const unavailableBangumiAnime = (
	profile: BangumiProfile | null = null,
): BangumiAnimeResponse => ({
	state: 'unavailable',
	profile,
	total: 0,
	entries: [],
});
