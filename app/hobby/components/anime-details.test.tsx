import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnimeDetails from './anime-details';

describe('AnimeDetails', () => {
	it('links to the approved Bangumi profile', () => {
		render(<AnimeDetails />);

		expect(screen.getByText('1022640')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /查看我的 Bangumi/ }),
		).toHaveAttribute('href', 'https://bangumi.tv/user/1022640');
	});
});
