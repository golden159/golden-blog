import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from './header';

vi.mock('../fonts', () => ({
	merryWeather: { className: 'merriweather' },
	mukta: { className: 'mukta' },
}));

describe('Header', () => {
	it('gives the Home link a visible theme-safe focus indicator', () => {
		render(<Header title='Hobby' />);

		const homeLink = screen.getByRole('link', { name: /Home Hobby/ });
		expect(homeLink).toHaveAttribute('href', '/');
		expect(homeLink).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
			'focus-visible:ring-2',
			'focus-visible:ring-primary-500',
			'focus-visible:ring-offset-2',
			'dark:focus-visible:ring-offset-black',
		);
		expect(homeLink).not.toHaveClass('outline-0');
	});
});
