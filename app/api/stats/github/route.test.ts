// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/components/github-contributions/github', () => ({
	GITHUB_USERNAME: 'golden159',
	getContributions: vi.fn(),
}));

import { getContributions } from 'app/components/github-contributions/github';
import { GET } from './route';

const mockedGetContributions = vi.mocked(getContributions);
const currentYear = new Date().getFullYear();

const calendar = {
	colors: ['#ebedf0', '#9be9a8'],
	totalContributions: 2,
	weeks: [
		{
			firstDay: `${currentYear}-08-23`,
			contributionDays: [
				{
					color: '#9be9a8',
					date: `${currentYear}-08-24`,
					contributionCount: 2,
				},
			],
		},
	],
	months: [{ firstDay: `${currentYear}-08-01`, name: 'Aug', totalWeeks: 1 }],
};

function requestFor(year: string | number) {
	return new Request(`https://golden.example/api/stats/github?year=${year}`);
}

describe('GET /api/stats/github', () => {
	beforeEach(() => {
		mockedGetContributions.mockResolvedValue(calendar);
	});

	it('returns a public cacheable contribution calendar', async () => {
		const response = await GET(requestFor(currentYear));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(calendar);
		expect(mockedGetContributions).toHaveBeenCalledWith(
			'golden159',
			currentYear,
		);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=300, stale-while-revalidate=600',
		);
	});

	it('rejects years outside the five-year selector', async () => {
		const response = await GET(requestFor(currentYear - 5));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Invalid year' });
		expect(mockedGetContributions).not.toHaveBeenCalled();
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('returns a secret-free unavailable response when GitHub fails', async () => {
		mockedGetContributions.mockRejectedValue(
			new Error('request contained bearer super-secret-token'),
		);

		const response = await GET(requestFor(currentYear));

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			error: 'GitHub statistics are unavailable',
		});
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});
