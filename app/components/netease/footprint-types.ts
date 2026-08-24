export type ListeningBucket = {
	label: string;
	durationMs: number | null;
	recordCount: number | null;
};

export type ListeningSlice = {
	durationMs: number | null;
	recordCount: number | null;
	uniqueTrackCount: number | null;
	topArtist: string | null;
	topTrack: string | null;
	buckets: ListeningBucket[];
};

export type FootprintTrack = {
	title: string;
	artists: string[];
	album: string;
	albumArtUrl: string | null;
	songUrl: string;
	durationMs: number | null;
};

export type NeteaseListeningFootprint = {
	state: 'ready' | 'partial' | 'unavailable';
	generatedAt: number;
	timezone: 'Asia/Shanghai';
	coverage: {
		recentAvailable: boolean;
		recordCount: number | null;
		oldestPlayedAt: number | null;
		limit: number;
		truncated: boolean;
	};
	today: ListeningSlice;
	week: {
		durationMs: number | null;
		mondayDurationMs: number | null;
		recordCount: number | null;
	};
	reports: Record<'week' | 'month' | 'year', ListeningSlice>;
	lifetime: {
		listenCount: number | null;
		estimatedDurationMs: number | null;
		sampleDurationMs: number | null;
		basis: 'recent-median' | 'weekly-median' | null;
	};
	weeklyHighlight: FootprintTrack | null;
};
