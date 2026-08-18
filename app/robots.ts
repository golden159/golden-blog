import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
		},
		sitemap: `https://golden-xzs-blog.vercel.app/sitemap.xml`,
		host: `https://golden-xzs-blog.vercel.app`,
	};
}
