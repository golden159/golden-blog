import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readMDXFile } from '../thoughts/utils';
import { projects } from './constants';

const projectContentPath = path.join(
	process.cwd(),
	'app/projects/posts/retail-robot-project.mdx',
);

describe('Projects', () => {
	it('links the retail robot project to its MDX detail page', () => {
		expect(projects).toContainEqual(
			expect.objectContaining({
				title: '基于语音对话系统的零售机器人项目',
				url: '/projects/retail-robot-project',
			}),
		);
	});

	it('accepts project-style date, description, and tags frontmatter', () => {
		const { metadata, content } = readMDXFile(projectContentPath);

		expect(metadata.publishedAt).toBe('2026-09-16');
		expect(metadata.summary).toBe(
			'从 ASR-LLM-TTS 到机器人通信、图传检测和导航安全',
		);
		expect(metadata.tags).toEqual(['Robotics', 'ASR', 'LLM', 'TTS']);
		expect(content).toContain('# 基于语音对话系统的零售机器人项目');
	});

	it('has a detail route for the project content', () => {
		expect(
			fs.existsSync(path.join(process.cwd(), 'app/projects/[slug]/page.tsx')),
		).toBe(true);
	});
});
