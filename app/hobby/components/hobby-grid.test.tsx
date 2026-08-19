import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HobbyGrid from './hobby-grid';

const trigger = (name: string) =>
	screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('HobbyGrid', () => {
	it('renders five closed categories initially', () => {
		render(<HobbyGrid />);

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
			expect(trigger(title)).toHaveAttribute('aria-expanded', 'false');
		}
	});

	it('keeps only one category open at a time', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('region', { name: /Games/ })).toBeInTheDocument();

		fireEvent.click(trigger('Anime'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
		expect(trigger('Anime')).toHaveAttribute('aria-expanded', 'true');
		expect(
			screen
				.getAllByRole('button')
				.filter((button) => button.getAttribute('aria-expanded') === 'true'),
		).toHaveLength(1);
	});

	it('closes a category when its open trigger is selected again', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		fireEvent.click(trigger('Games'));

		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
	});

	it('matches trigger and panel identifiers', () => {
		render(<HobbyGrid />);
		const gamesTrigger = trigger('Games');

		fireEvent.click(gamesTrigger);
		const panel = screen.getByRole('region', { name: /Games/ });

		expect(gamesTrigger).toHaveAttribute('aria-controls', panel.id);
		expect(panel).toHaveAttribute('aria-labelledby', gamesTrigger.id);
	});
});
