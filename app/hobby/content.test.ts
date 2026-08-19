import { describe, expect, it } from 'vitest';
import {
	animeProfile,
	gameAccounts,
	hobbyCategories,
	musicProfile,
	travelCities,
} from './content';

describe('hobby content', () => {
	it('keeps the approved category order and desktop proportions', () => {
		expect(hobbyCategories.map(({ id }) => id)).toEqual([
			'games',
			'anime',
			'music',
			'food',
			'travel',
		]);
		expect(hobbyCategories.map(({ compactSpan }) => compactSpan)).toEqual([
			'md:col-span-7',
			'md:col-span-5',
			'md:col-span-4',
			'md:col-span-4',
			'md:col-span-4',
		]);
	});

	it('stores the approved public destinations and identifiers', () => {
		expect(animeProfile.url).toBe('https://bangumi.tv/user/1022640');
		expect(musicProfile.url).toBe(
			'https://y.music.163.com/m/user?id=3719820729',
		);
		expect(gameAccounts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ platform: '小黑盒', value: '29362113' }),
				expect.objectContaining({
					platform: 'Battle.net',
					value: '小朱诺诺的#5394',
				}),
			]),
		);
		expect(travelCities).toEqual(['杭州', '佛山', '深圳', '中山']);
	});
});
