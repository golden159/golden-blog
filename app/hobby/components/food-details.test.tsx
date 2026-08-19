import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FoodDetails from './food-details';

describe('FoodDetails', () => {
	it('shows an explicit placeholder without invented restaurants', () => {
		render(<FoodDetails />);

		expect(screen.getByText('Coming soon')).toBeInTheDocument();
		expect(screen.getByAltText('等待补充的美食照片占位图')).toBeInTheDocument();
	});
});
