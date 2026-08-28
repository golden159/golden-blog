import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../fonts', () => ({
	merryWeather: { className: 'merriweather' },
	mukta: { className: 'mukta' },
}));

import StatsPage from './page';

describe('StatsPage', () => {
	it('presents GitHub as the only statistics source', () => {
		render(<StatsPage />);

		expect(
			screen.getByText('这里展示我在 GitHub 上的提交活动与连续贡献记录。'),
		).toBeInTheDocument();
		expect(screen.getByText('Contributions Stats')).toBeInTheDocument();
		expect(screen.queryByText(/WakaTime/i)).toBeNull();
		expect(screen.queryByText(/Spotify/i)).toBeNull();
		expect(screen.queryByText('Not Playing')).toBeNull();
	});
});
