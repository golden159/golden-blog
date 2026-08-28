import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Next image host policy', () => {
	it('does not proxy retired Umami analytics endpoints', async () => {
		expect(nextConfig.rewrites).toBeUndefined();
	});

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

	it('allows only the Steam image hosts accepted by the client normalizer', () => {
		expect(nextConfig.images?.remotePatterns).toEqual(
			expect.arrayContaining([
				{
					protocol: 'https',
					hostname: 'steamstatic.com',
					pathname: '/**',
				},
				{
					protocol: 'https',
					hostname: '**.steamstatic.com',
					pathname: '/**',
				},
				{
					protocol: 'https',
					hostname: 'media.steampowered.com',
					pathname: '/**',
				},
			]),
		);
	});
});
