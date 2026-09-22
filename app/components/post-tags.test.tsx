import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PostTags from './post-tags';

describe('PostTags', () => {
	it('links each tag to its tag page', () => {
		render(<PostTags tags={['Robotics', 'C++']} />);

		expect(screen.getByRole('link', { name: 'Robotics' })).toHaveAttribute(
			'href',
			'/tags/Robotics',
		);
		expect(screen.getByRole('link', { name: 'C++' })).toHaveAttribute(
			'href',
			'/tags/C%2B%2B',
		);
	});
});
