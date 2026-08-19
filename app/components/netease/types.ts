export type RecentTrack = {
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	playedAt: number | null;
};

export type NeteaseActivityResponse = {
	state: 'recent' | 'older' | 'empty' | 'unavailable';
	track: RecentTrack | null;
};

export const unavailableActivity = (): NeteaseActivityResponse => ({
	state: 'unavailable',
	track: null,
});
