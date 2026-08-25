import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Next image host policy', () => {
	it('allows both NetEase image hosts accepted by the normalizer', () => {
		expect(nextConfig.images?.remotePatterns).toEqual(
			expect.arrayContaining([
				{
					protocol: 'https',
					hostname: 'music.126.net',
					pathname: '/**',
				},
				{
					protocol: 'https',
					hostname: '**.music.126.net',
					pathname: '/**',
				},
			]),
		);
	});

	it('allows the Bangumi image hosts accepted by the normalizer', () => {
		expect(nextConfig.images?.remotePatterns).toEqual(
			expect.arrayContaining([
				{
					protocol: 'https',
					hostname: '**.bgm.tv',
					pathname: '/**',
				},
				{
					protocol: 'https',
					hostname: '**.bangumi.tv',
					pathname: '/**',
				},
			]),
		);
	});
});
