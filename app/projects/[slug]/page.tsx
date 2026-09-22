import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { client } from '../../../tina/__generated__/client';
import BackNavigation from '../../components/layouts/back-navigation';
import PostTags from '../../components/post-tags';
import { TinaPost } from '../../components/tina-post';
import { formatDate, readMDXFile } from '../../thoughts/utils';

const projectsDirectory = path.join(process.cwd(), 'app/projects/posts');

function isValidSlug(slug: string) {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function getProject(slug: string) {
	if (!isValidSlug(slug)) {
		notFound();
	}

	const filePath = path.join(projectsDirectory, `${slug}.mdx`);
	if (!fs.existsSync(filePath)) {
		notFound();
	}

	const project = readMDXFile(filePath);
	if (project.metadata.draft) {
		notFound();
	}

	return project;
}

export function generateStaticParams() {
	return fs
		.readdirSync(projectsDirectory)
		.filter((file) => path.extname(file) === '.mdx')
		.map((file) => path.basename(file, '.mdx'))
		.filter(
			(slug) =>
				!readMDXFile(path.join(projectsDirectory, `${slug}.mdx`)).metadata
					.draft,
		)
		.map((slug) => ({ slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { metadata } = getProject((await params).slug);

	return {
		title: metadata.title,
		description: metadata.summary,
		openGraph: {
			title: metadata.title,
			description: metadata.summary,
			type: 'article',
			publishedTime: metadata.publishedAt,
		},
	};
}

export default async function ProjectPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const slug = (await params).slug;
	const { metadata } = getProject(slug);
	const tina = await client.queries.projects({ relativePath: `${slug}.mdx` });

	return (
		<>
			<section>
				<BackNavigation fallbackHref='/projects' />
				<div className='flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500 dark:text-gray-400'>
					<time dateTime={metadata.publishedAt}>
						{formatDate(metadata.publishedAt)}
					</time>
					<PostTags tags={metadata.tags} />
				</div>
			</section>
			<article className='md:max-w-5xl'>
				<TinaPost dataKey='projects' {...tina} />
			</article>
		</>
	);
}
