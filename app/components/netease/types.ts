export type RecentTrack = {
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	playedAt: number | null;
	durationMs?: number;
};

export type NeteaseActivityResponse = {
	state: 'recent' | 'older' | 'weekly' | 'empty' | 'unavailable';
	track: RecentTrack | null;
};

export const NETEASE_WEEKLY_RANKING_LIMIT = 10;

export type WeeklyRankingTrack = {
	rank: number;
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	durationMs: number | null;
	playCount: number | null;
	score: number | null;
};

export type NeteaseWeeklyRanking = {
	state: 'ready' | 'empty' | 'unavailable';
	generatedAt: number;
	tracks: WeeklyRankingTrack[];
};

export type NeteaseOverview = {
	activity: NeteaseActivityResponse;
	weeklyRanking: NeteaseWeeklyRanking;
};

export const unavailableActivity = (): NeteaseActivityResponse => ({
	state: 'unavailable',
	track: null,
});
