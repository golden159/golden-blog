import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, LinkCard, tinaMdxComponents } from './tina-mdx';

describe('Tina MDX components', () => {
	it('exports every component registered in the Tina schema', () => {
		expect(Object.keys(tinaMdxComponents)).toEqual(
			expect.arrayContaining(['Callout', 'Steps', 'Step', 'LinkCard', 'Badge']),
		);
	});

	it('renders a badge and an internal link card', () => {
		const { rerender } = render(<Badge text='Next.js' tone='success' />);
		expect(screen.getByText('Next.js')).toBeInTheDocument();

		rerender(
			<LinkCard
				title='Project'
				description='Read the project details'
				url='/projects/project'
			/>,
		);
		expect(screen.getByRole('link', { name: /Project/ })).toHaveAttribute(
			'href',
			'/projects/project',
		);
	});
});
