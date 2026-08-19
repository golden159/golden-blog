export type HobbyId = 'games' | 'anime' | 'music' | 'food' | 'travel';

export type HobbyCategory = {
	id: HobbyId;
	index: string;
	title: string;
	summary: string;
	compactSpan: string;
};

export type GameGroup = {
	label: 'Competitive' | 'Hunting' | 'Co-op Nights';
	games: string[];
};

export type GameAccount =
	| {
			kind: 'link';
			platform: 'Steam';
			value: string;
			url: string;
	  }
	| {
			kind: 'copy';
			platform: '小黑盒' | 'Battle.net';
			value: string;
	  };
