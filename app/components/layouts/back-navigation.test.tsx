import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BackNavigation from './back-navigation';

const router = vi.hoisted(() => ({
	back: vi.fn(),
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => router,
}));

vi.mock('../../fonts', () => ({
	mukta: { className: 'mukta' },
}));

describe('BackNavigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the fallback route when a page has no previous site history', () => {
		render(<BackNavigation fallbackHref='/projects' />);

		fireEvent.click(screen.getByRole('button', { name: 'Back' }));

		expect(router.push).toHaveBeenCalledWith('/projects');
		expect(router.back).not.toHaveBeenCalled();
	});
});
