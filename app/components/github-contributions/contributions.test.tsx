import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Contributions from './contributions';

const calendar = {
	colors: ['#ebedf0', '#9be9a8'],
	totalContributions: 2,
	weeks: [
		{
			firstDay: '2026-08-23',
			contributionDays: [
				{ color: '#9be9a8', date: '2026-08-24', contributionCount: 2 },
			],
		},
	],
	months: [{ firstDay: '2026-08-01', name: 'Aug', totalWeeks: 1 }],
};

describe('Contributions', () => {
	const renderWithFreshCache = () =>
		render(
			<SWRConfig value={{ provider: () => new Map() }}>
				<Contributions />
			</SWRConfig>,
		);

	beforeEach(() => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(calendar), { status: 200 }),
		);
	});

	it('renders the calendar returned by the public GitHub endpoint', async () => {
		renderWithFreshCache();

		expect(await screen.findByText('Aug')).toBeInTheDocument();
		expect(
			screen.getByText(`${new Date().getFullYear()} contributions`),
		).toBeInTheDocument();
		expect(globalThis.fetch).toHaveBeenCalledWith(
			`/api/stats/github?year=${new Date().getFullYear()}`,
		);
	});

	it('renders an explicit unavailable state when the endpoint fails', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValueOnce(
			new Response(
				JSON.stringify({ error: 'GitHub statistics are unavailable' }),
				{
					status: 503,
				},
			),
		);

		renderWithFreshCache();

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'GitHub 数据暂时不可用，请稍后再试。',
		);
	});
});
