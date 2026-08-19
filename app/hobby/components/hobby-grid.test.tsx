import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HobbyGrid from './hobby-grid';

describe('HobbyGrid content', () => {
	it('renders all five category headings', () => {
		render(<HobbyGrid />);

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
		}
	});
});
