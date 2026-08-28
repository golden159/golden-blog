import { describe, expect, it } from 'vitest';
import {
	animeProfile,
	gameAccounts,
	hobbyCategories,
	musicProfile,
} from './content';

describe('hobby content', () => {
	it('keeps only the three approved categories in display order', () => {
		expect(hobbyCategories.map(({ id }) => id)).toEqual([
			'games',
			'anime',
			'music',
		]);
	});

	it('uses readable tablet spans and an equal desktop row', () => {
		expect(hobbyCategories.map(({ compactSpan }) => compactSpan)).toEqual([
			'md:col-span-12 lg:col-span-4',
			'md:col-span-6 lg:col-span-4',
			'md:col-span-6 lg:col-span-4',
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
	});
});
