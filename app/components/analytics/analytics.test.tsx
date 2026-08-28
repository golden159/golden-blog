import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics/react', () => ({
	Analytics: () => <div data-testid='vercel-analytics' />,
}));

vi.mock('@vercel/speed-insights/next', () => ({
	SpeedInsights: () => <div data-testid='vercel-speed-insights' />,
}));

import Analytics from './analytics';

describe('Analytics', () => {
	it('uses only the credential-free Vercel analytics integrations', () => {
		const { container } = render(<Analytics />);

		expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
		expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument();
		expect(container.querySelector('script[src="/umami.js"]')).toBeNull();
	});
});
