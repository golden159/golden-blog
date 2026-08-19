import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameDetails from './game-details';

describe('GameDetails', () => {
	it('renders the approved games and account destinations', () => {
		render(<GameDetails />);

		for (const game of [
			'守望先锋',
			'怪物猎人',
			'R.E.P.O.',
			'PEAK',
			'胡闹厨房',
			'链在一起',
			'机械狂欢',
		]) {
			expect(screen.getByText(game)).toBeInTheDocument();
		}

		expect(screen.getByRole('heading', { name: 'Competitive' })).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
		expect(screen.getByRole('link', { name: /Steam/ })).toHaveAttribute(
			'href',
			'https://steamcommunity.com/profiles/76561198985102331/',
		);
	});
});
