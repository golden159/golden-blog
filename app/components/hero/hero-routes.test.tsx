import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroRoutes from './hero-routes';

describe('HeroRoutes', () => {
	it('renders the five internal route links in order', () => {
		render(<HeroRoutes />);

		const links = screen.getAllByRole('link');
		expect(links.map((link) => link.textContent)).toEqual([
			'/projects',
			'/thoughts',
			'/uses',
			'/stats',
			'/hobby',
		]);
		expect(links.at(-1)).toHaveAttribute('href', '/hobby');
	});
});
