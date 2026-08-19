import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HobbyGrid from './hobby-grid';

const trigger = (name: string) => screen.getByRole('button', { name });

describe('HobbyGrid', () => {
	it('renders five closed categories initially', () => {
		render(<HobbyGrid />);

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			const heading = screen.getByRole('heading', { name: title, level: 2 });
			expect(heading.tagName).toBe('H2');
			expect(trigger(title)).toHaveAttribute('aria-expanded', 'false');
		}
		expect(screen.getByTestId('hobby-games-indicator')).toHaveStyle({
			transitionDuration: '300ms',
		});
	});

	it('uses native accordion headings that contain title-only buttons', () => {
		render(<HobbyGrid />);

		const heading = screen.getByRole('heading', { name: 'Games', level: 2 });
		const gamesTrigger = within(heading).getByRole('button', { name: 'Games' });

		expect(heading).toContainElement(gamesTrigger);
		expect(gamesTrigger).not.toHaveAttribute('aria-label');
		expect(gamesTrigger).not.toHaveTextContent('01');
		expect(gamesTrigger).not.toHaveTextContent(
			'竞技、狩猎，以及和朋友一起制造混乱的联机夜晚。',
		);
		expect(screen.getByText('01')).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
	});

	it('keeps category visuals within phrasing-content markup', () => {
		render(<HobbyGrid />);

		for (const button of screen.getAllByRole('button')) {
			expect(button.querySelector('div, p')).toBeNull();
		}
	});

	it('keeps only one category open at a time', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('hobby-games-indicator')).toHaveStyle({
			transform: 'rotate(45deg)',
			transitionDuration: '300ms',
		});
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

	it('hides an exiting panel and makes its descendants inert immediately', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		expect(screen.getByRole('link', { name: /Steam/ })).toBeInTheDocument();

		fireEvent.click(trigger('Anime'));

		const exitingPanel = document.getElementById('hobby-games-panel');
		expect(exitingPanel).toBeInTheDocument();
		expect(exitingPanel).toHaveAttribute('aria-hidden', 'true');
		expect(exitingPanel).toHaveAttribute('inert');
		expect(
			within(exitingPanel as HTMLElement).queryByRole('link'),
		).not.toBeInTheDocument();
		expect(
			within(exitingPanel as HTMLElement).queryByRole('button'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('region', { name: /Games/ }),
		).not.toBeInTheDocument();
		expect(screen.getByRole('region', { name: /Anime/ })).toBeInTheDocument();
	});

	it('closes a category when its open trigger is selected again', () => {
		render(<HobbyGrid />);

		fireEvent.click(trigger('Games'));
		fireEvent.click(trigger('Games'));

		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
	});

	it('shows the Games account section only after Games opens', () => {
		render(<HobbyGrid />);
		expect(screen.queryByText('Game Accounts')).not.toBeInTheDocument();

		fireEvent.click(trigger('Games'));

		expect(screen.getByText('Game Accounts')).toBeInTheDocument();
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
