import type { GameAccount, GameGroup, HobbyCategory } from './types';

export const hobbyCategories: HobbyCategory[] = [
	{
		id: 'games',
		index: '01',
		title: 'Games',
		summary: '竞技、狩猎，以及和朋友一起制造混乱的联机夜晚。',
		compactSpan: 'md:col-span-7',
	},
	{
		id: 'anime',
		index: '02',
		title: 'Anime',
		summary: '我的动画收藏、观看记录与评分都整理在 Bangumi。',
		compactSpan: 'md:col-span-5',
	},
	{
		id: 'music',
		index: '03',
		title: 'Music',
		summary: '从日语与 ACG，到流行、说唱、粤语和民谣。',
		compactSpan: 'md:col-span-4',
	},
	{
		id: 'food',
		index: '04',
		title: 'Food',
		summary: '用照片和文字保留值得再吃一次的味道。',
		compactSpan: 'md:col-span-4',
	},
	{
		id: 'travel',
		index: '05',
		title: 'Travel',
		summary: '走过杭州、佛山、深圳和中山，也继续寻找下一站。',
		compactSpan: 'md:col-span-4',
	},
];

export const gameGroups: GameGroup[] = [
	{ label: 'Competitive', games: ['守望先锋'] },
	{ label: 'Hunting', games: ['怪物猎人'] },
	{
		label: 'Co-op Nights',
		games: ['R.E.P.O.', 'PEAK', '胡闹厨房', '链在一起', '机械狂欢'],
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

export const foodContent = {
	label: 'Coming soon',
	description: '这里会慢慢收集喜欢的食物、照片，以及它们背后的片段。',
} as const;

export const travelCities = ['杭州', '佛山', '深圳', '中山'];
