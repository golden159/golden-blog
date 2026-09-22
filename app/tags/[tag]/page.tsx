import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../components/header';
import PageContainer from '../../components/layouts/page-container';
import { formatDate } from '../../thoughts/utils';
import { getTaggedPosts, getTagIndex } from '../content';

function decodeTag(value: string) {
	try {
		return decodeURIComponent(value).trim();
	} catch {
		return '';
	}
}

function getPostsForTag(tag: string) {
	const normalizedTag = tag.toLocaleLowerCase();
	return getTaggedPosts().filter((post) =>
		post.tags.some((item) => item.toLocaleLowerCase() === normalizedTag),
	);
}

export function generateStaticParams() {
	return getTagIndex().map((tag) => ({ tag: tag.name }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ tag: string }>;
}): Promise<Metadata> {
	const tag = decodeTag((await params).tag);
	return {
		title: `Tag: ${tag}`,
		description: `Posts tagged with ${tag}.`,
	};
}

export default async function TagPage({
	params,
}: {
	params: Promise<{ tag: string }>;
}) {
	const tag = decodeTag((await params).tag);
	const posts = getPostsForTag(tag);
	if (!tag || posts.length === 0) notFound();

	return (
		<PageContainer>
			<Header title={`Tag: ${tag}`} />
			<div className='space-y-4'>
				{posts.map((post) => (
					<Link
						href={post.href}
						key={`${post.source}-${post.slug}`}
						className='block rounded-md border-b border-gray-200 py-5 transition-colors hover:border-primary-500 dark:border-gray-800'
					>
						<div className='flex items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400'>
							<span>来源：{post.source}</span>
							<time dateTime={post.publishedAt}>
								{formatDate(post.publishedAt)}
							</time>
						</div>
						<h2 className='mt-2 text-xl font-medium text-black dark:text-white'>
							{post.title}
						</h2>
						<p className='mt-2 text-gray-500 dark:text-gray-400'>
							{post.summary}
						</p>
					</Link>
				))}
			</div>
		</PageContainer>
	);
}
