import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
		},
		sitemap: `https://golden-blog.vercel.app/sitemap.xml`,
		host: `https://golden-blog.vercel.app`,
	};
}
