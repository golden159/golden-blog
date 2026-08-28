// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlDefaults = vi.hoisted(() => vi.fn());

vi.mock('@octokit/graphql', () => ({
	graphql: { defaults: graphqlDefaults },
}));

import { getContributions } from './github';

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

describe('GitHub contribution server adapter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
		process.env.GITHUB_TOKEN = 'test-token';
		graphqlDefaults.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		delete process.env.GITHUB_TOKEN;
	});

	it('uses the server-only GITHUB_TOKEN to fetch contributions', async () => {
		graphqlDefaults.mockReturnValue(
			vi.fn().mockResolvedValue({
				user: { contributionsCollection: { contributionCalendar: calendar } },
			}),
		);

		const result = await getContributions('golden159', 2026);

		expect(result).toEqual(calendar);
		expect(graphqlDefaults).toHaveBeenCalledWith({
			headers: { authorization: 'bearer test-token' },
		});
	});

	it('uses an injected GraphQL client without requiring a token', async () => {
		delete process.env.GITHUB_TOKEN;
		const client = vi.fn().mockResolvedValue({
			user: { contributionsCollection: { contributionCalendar: calendar } },
		});

		const result = await getContributions('golden159', 2026, { client });

		expect(result).toEqual(calendar);
		expect(client).toHaveBeenCalledWith({
			query: expect.any(String),
			username: 'golden159',
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-08-28T12:00:00.000Z',
		});
		expect(graphqlDefaults).not.toHaveBeenCalled();
	});

	it('uses UTC calendar-year bounds for a completed year', async () => {
		const client = vi.fn().mockResolvedValue({
			user: { contributionsCollection: { contributionCalendar: calendar } },
		});
		graphqlDefaults.mockReturnValue(client);

		await getContributions('golden159', 2024);

		expect(client).toHaveBeenCalledWith({
			query: expect.any(String),
			username: 'golden159',
			from: '2024-01-01T00:00:00.000Z',
			to: '2024-12-31T23:59:59.000Z',
		});
	});

	it('uses January 1 through now for the current-year selection', async () => {
		const client = vi.fn().mockResolvedValue({
			user: { contributionsCollection: { contributionCalendar: calendar } },
		});
		graphqlDefaults.mockReturnValue(client);

		await getContributions('golden159', 2026);

		expect(client).toHaveBeenCalledWith({
			query: expect.any(String),
			username: 'golden159',
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-08-28T12:00:00.000Z',
		});
	});

	it('rejects before an upstream request when GITHUB_TOKEN is missing', async () => {
		delete process.env.GITHUB_TOKEN;
		graphqlDefaults.mockReset();

		await expect(getContributions('golden159', 2026)).rejects.toThrow(
			'GITHUB_TOKEN is required',
		);
		expect(graphqlDefaults).not.toHaveBeenCalled();
	});
});
