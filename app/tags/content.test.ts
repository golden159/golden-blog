import { describe, expect, it } from 'vitest';
import { getTaggedPosts, getTagIndex } from './content';

describe('tag content', () => {
	it('collects tags from project MDX posts and keeps their source', () => {
		const posts = getTaggedPosts();
		const project = posts.find((post) => post.slug === 'retail-robot-project');
		const robotics = getTagIndex().find((tag) => tag.name === 'Robotics');

		expect(project).toEqual(
			expect.objectContaining({
				href: '/projects/retail-robot-project',
				source: 'Projects',
			}),
		);
		expect(robotics).toEqual({
			name: 'Robotics',
			sources: ['Projects'],
			count: 1,
		});
	});
});
