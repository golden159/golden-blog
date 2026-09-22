import type { Metadata } from 'next';
import { client } from '../../../tina/__generated__/client';
import BackNavigation from '../../components/layouts/back-navigation';
import PostTags from '../../components/post-tags';
import { TinaPost } from '../../components/tina-post';
import { formatDate, getPostFromSlug, getPosts } from '../utils';
import PageTitle from './page-title';

export function generateStaticParams() {
	return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const params = await props.params;
	const { metadata } = await getPostFromSlug(params.slug);

	const url = `https://golden-xzs-blog.vercel.app/thoughts/${params.slug}`;
	const ogImage = metadata.image || '/static/og-image.png';

	return {
		title: metadata.title,
		description: metadata.summary,
		openGraph: {
			title: metadata.title,
			description: metadata.summary,
			type: 'article',
			url: url,
			publishedTime: metadata.publishedAt,
			authors: ['许泽升 / Golden'],
			images: [
				{
					url: ogImage,
					width: 1200,
					height: 630,
					alt: metadata.title,
				},
			],
		},
		twitter: {
			card: 'summary_large_image',
			title: metadata.title,
			description: metadata.summary,
			images: [ogImage],
		},
		alternates: {
			canonical: url,
		},
	};
}

export default async function Blog(props: {
	params: Promise<{ slug: string }>;
}) {
	const params = await props.params;

	const { metadata } = await getPostFromSlug(params.slug);
	const tina = await client.queries.thoughts({
		relativePath: `${params.slug}.mdx`,
	});

	return (
		<>
			<section>
				<BackNavigation />
				<PageTitle>{metadata.title}</PageTitle>
				<div className='mt-2 flex items-center justify-between gap-3 text-sm'>
					<p className='text-sm text-neutral-600 dark:text-neutral-400'>
						{formatDate(metadata.publishedAt)}
					</p>
					<PostTags tags={metadata.tags} />
				</div>
			</section>
			<article className='md:max-w-5xl'>
				<TinaPost dataKey='thoughts' {...tina} />
			</article>
		</>
	);
}
