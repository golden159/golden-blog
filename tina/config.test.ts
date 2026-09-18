import { describe, expect, it, vi } from 'vitest';

// defineConfig only validates + returns the config; stub it so importing the
// real tinacms package (and its CJS deps) doesn't break the vitest runtime.
vi.mock('tinacms', () => ({
	defineConfig: <T>(config: T) => config,
}));

import config from './config';

type Field = { name: string; type: string; list?: boolean; isBody?: boolean };
type Collection = {
	name: string;
	path: string;
	format?: string;
	fields: Field[];
};

const collections = (config.schema?.collections ?? []) as Collection[];

function findCollection(name: string) {
	return collections.find((collection) => collection.name === name);
}

function fieldNames(collection: Collection | undefined) {
	return collection?.fields.map((field) => field.name) ?? [];
}

describe('Tina config', () => {
	it('drops the demo content/posts collection', () => {
		expect(collections.some((c) => c.path === 'content/posts')).toBe(false);
	});

	it('manages thoughts as mdx in app/thoughts/posts', () => {
		const thoughts = findCollection('thoughts');
		expect(thoughts?.path).toBe('app/thoughts/posts');
		expect(thoughts?.format).toBe('mdx');
		expect(fieldNames(thoughts)).toEqual(
			expect.arrayContaining([
				'title',
				'publishedAt',
				'summary',
				'tags',
				'draft',
				'body',
			]),
		);
	});

	it('manages projects as mdx in app/projects/posts', () => {
		const projects = findCollection('projects');
		expect(projects?.path).toBe('app/projects/posts');
		expect(projects?.format).toBe('mdx');
		expect(fieldNames(projects)).toEqual(
			expect.arrayContaining([
				'title',
				'date',
				'description',
				'tags',
				'draft',
				'body',
			]),
		);
	});

	it('marks the rich-text body field on both collections', () => {
		for (const name of ['thoughts', 'projects']) {
			const body = findCollection(name)?.fields.find(
				(field) => field.name === 'body',
			);
			expect(body?.type).toBe('rich-text');
			expect(body?.isBody).toBe(true);
		}
	});

	it('models tags as a list on both collections', () => {
		for (const name of ['thoughts', 'projects']) {
			const tags = findCollection(name)?.fields.find(
				(field) => field.name === 'tags',
			);
			expect(tags?.list).toBe(true);
		}
	});
});
