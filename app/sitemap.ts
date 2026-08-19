import { getPosts } from './thoughts/utils';

export const baseUrl = 'https://golden-xzs-blog.vercel.app';
export const staticRoutes = [
	'',
	'thoughts',
	'projects',
	'stats',
	'uses',
	'hobby',
] as const;

export default async function sitemap() {
	const blogs = getPosts().map((post) => ({
		url: `${baseUrl}/thoughts/${post.slug}`,
		lastModified: post.metadata.publishedAt,
	}));

	const routes = staticRoutes.map((route) => ({
		url: route === '' ? `${baseUrl}/` : `${baseUrl}/${route}`,
		lastModified: new Date().toISOString().split('T')[0],
	}));

	return [...routes, ...blogs];
}
