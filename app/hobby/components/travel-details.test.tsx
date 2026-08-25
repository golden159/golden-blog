import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TravelDetails from './travel-details';

describe('TravelDetails', () => {
	it('renders only the four approved cities', () => {
		render(<TravelDetails />);

		for (const city of ['杭州', '佛山', '深圳', '中山']) {
			expect(screen.getByRole('heading', { name: city })).toBeInTheDocument();
		}
		expect(screen.queryAllByRole('article')).toHaveLength(0);
		expect(screen.getByText('01')).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
	});
});
