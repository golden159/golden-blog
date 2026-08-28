import type { GameAccount, HobbyCategory } from './types';

export const hobbyCategories: HobbyCategory[] = [
	{
		id: 'games',
		index: '01',
		title: 'Games',
		summary: '竞技、狩猎，以及和朋友一起制造混乱的联机夜晚。',
		compactSpan: 'md:col-span-12 lg:col-span-4',
	},
	{
		id: 'anime',
		index: '02',
		title: 'Anime',
		summary: '我的动画收藏、观看记录与评分都整理在 Bangumi。',
		compactSpan: 'md:col-span-6 lg:col-span-4',
	},
	{
		id: 'music',
		index: '03',
		title: 'Music',
		summary: '从日语与 ACG，到流行、说唱、粤语和民谣。',
		compactSpan: 'md:col-span-6 lg:col-span-4',
	},
];

export const steamProfile = {
	userId: '76561198985102331',
	url: 'https://steamcommunity.com/profiles/76561198985102331/',
} as const;

export const gameAccounts: GameAccount[] = [
	{
		kind: 'link',
		platform: 'Steam',
		value: steamProfile.userId,
		url: steamProfile.url,
	},
	{ kind: 'copy', platform: '小黑盒', value: '29362113' },
	{ kind: 'copy', platform: 'Battle.net', value: '小朱诺诺的#5394' },
];

export const animeProfile = {
	userId: '1022640',
	apiUsername: 'golden_xzs',
	url: 'https://bangumi.tv/user/1022640',
} as const;

export const musicProfile = {
	userId: '3719820729',
	url: 'https://y.music.163.com/m/user?id=3719820729',
} as const;

export const musicGenres = ['日语', 'ACG', '流行', '说唱', '粤语', '民谣'];
