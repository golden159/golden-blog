import fs from 'node:fs';
import path from 'node:path';
import { readMDXFile } from '../thoughts/utils';

export type TagSource = 'Projects' | 'Thoughts';

export type TaggedPost = {
	source: TagSource;
	slug: string;
	href: string;
	title: string;
	summary: string;
	publishedAt: string;
	tags: string[];
};

export type TagSummary = {
	name: string;
	sources: TagSource[];
	count: number;
};

const collections: {
	source: TagSource;
	directory: string;
	basePath: string;
}[] = [
	{
		source: 'Projects',
		directory: path.join(process.cwd(), 'app/projects/posts'),
		basePath: '/projects',
	},
	{
		source: 'Thoughts',
		directory: path.join(process.cwd(), 'app/thoughts/posts'),
		basePath: '/thoughts',
	},
];

export function getTaggedPosts(): TaggedPost[] {
	return collections
		.flatMap(({ source, directory, basePath }) =>
			fs
				.readdirSync(directory)
				.filter((file) => path.extname(file) === '.mdx')
				.map((file) => {
					const { metadata } = readMDXFile(path.join(directory, file));
					const slug = path.basename(file, '.mdx');
					return {
						source,
						slug,
						href: `${basePath}/${slug}`,
						title: metadata.title,
						summary: metadata.summary,
						publishedAt: metadata.publishedAt,
						tags: metadata.tags ?? [],
						draft: metadata.draft,
					};
				})
				.filter((post) => !post.draft && post.tags.length > 0),
		)
		.map(({ draft: _draft, ...post }) => post)
		.sort(
			(a, b) =>
				new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
		);
}

export function getTagIndex(): TagSummary[] {
	const index = new Map<string, TagSummary>();

	for (const post of getTaggedPosts()) {
		for (const tag of new Set(post.tags)) {
			const key = tag.trim().toLocaleLowerCase();
			if (!key) continue;

			const current = index.get(key) ?? {
				name: tag.trim(),
				sources: [],
				count: 0,
			};
			if (!current.sources.includes(post.source)) {
				current.sources.push(post.source);
			}
			current.count += 1;
			index.set(key, current);
		}
	}

	return [...index.values()].sort((a, b) => a.name.localeCompare(b.name));
}
