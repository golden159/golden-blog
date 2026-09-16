import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BackNavigation from '../../components/layouts/back-navigation';
import { CustomMDX } from '../../components/mdx';
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
	const { metadata, content } = getProject((await params).slug);

	return (
		<>
			<section>
				<BackNavigation />
				<div className='flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500 dark:text-gray-400'>
					<time dateTime={metadata.publishedAt}>
						{formatDate(metadata.publishedAt)}
					</time>
					{metadata.tags?.map((tag) => (
						<span
							className='rounded-full border border-primary-500/40 px-2 py-0.5 text-primary-600 dark:text-primary-300'
							key={tag}
						>
							{tag}
						</span>
					))}
				</div>
			</section>
			<article className='md:max-w-5xl'>
				<CustomMDX source={content} />
			</article>
		</>
	);
}
