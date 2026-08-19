import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HobbyGrid from './hobby-grid';

const reducedMotionMedia = (query: string): MediaQueryList =>
	({
		matches: query.startsWith('(prefers-reduced-motion'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}) as MediaQueryList;

describe('HobbyCard reduced motion', () => {
	it('rotates the indicator instantly under reduced motion', () => {
		vi.spyOn(window, 'matchMedia').mockImplementation(reducedMotionMedia);
		render(<HobbyGrid />);

		const indicator = screen.getByTestId('hobby-games-indicator');
		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion)');
		expect(indicator).toHaveStyle({ transitionDuration: '0ms' });

		fireEvent.click(screen.getByRole('button', { name: 'Games' }));
		expect(indicator).toHaveStyle({ transform: 'rotate(45deg)' });
		expect(indicator).toHaveStyle({ transitionDuration: '0ms' });
	});
});
