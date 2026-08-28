import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactStrictMode: true,
	pageExtensions: ['ts', 'tsx'],
	transpilePackages: ['next-mdx-remote'],
	images: {
		remotePatterns: [
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
			{
				protocol: 'https',
				hostname: 'bgm.tv',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '**.bgm.tv',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'bangumi.tv',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '**.bangumi.tv',
				pathname: '/**',
			},
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
		],
	},
	reactCompiler: true,
	turbopack: {
		root: path.join(__dirname, '..'),
	},
	experimental: {
		turbopackFileSystemCacheForDev: true,
	},
};

export default nextConfig;
