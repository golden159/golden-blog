import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GithubStats from './github-stats';
import type { ContributionCalendar } from './types';

const calendar: ContributionCalendar = {
	colors: ['#ebedf0', '#9be9a8'],
	totalContributions: 2,
	weeks: [
		{
			firstDay: '2024-08-23',
			contributionDays: [
				{ color: '#9be9a8', date: '2024-08-24', contributionCount: 2 },
			],
		},
	],
	months: [{ firstDay: '2024-08-01', name: 'Aug', totalWeeks: 1 }],
};

describe('GithubStats', () => {
	it('labels totals with the selected historical year', () => {
		render(<GithubStats contributions={calendar} year={2024} />);

		expect(screen.getByText('2024 contributions')).toBeInTheDocument();
		expect(screen.queryByText('This year')).toBeNull();
	});
});
