import 'server-only';

import { graphql } from '@octokit/graphql';
import { cache } from 'react';
import type { ContributionCalendar } from './types';

export const GITHUB_USERNAME = 'golden159';

export type GithubGraphqlClient = <TResponse>(parameters: {
	query: string;
	username: string;
	from: string;
	to: string;
}) => Promise<TResponse>;

type GetContributionsOptions = {
	client?: GithubGraphqlClient;
};

export function getGithubGraphql(): GithubGraphqlClient {
	const token = process.env.GITHUB_TOKEN?.trim();

	if (!token) {
		throw new Error('GITHUB_TOKEN is required');
	}

	return graphql.defaults({
		headers: { authorization: `bearer ${token}` },
	}) as GithubGraphqlClient;
}

const query = `
  query ($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          colors
          totalContributions
          weeks {
            contributionDays {
              color
              date
              contributionCount
            }
            firstDay
          }
          months {
            firstDay
            name
            totalWeeks
          }
        }
      }
    }
  }
`;

type GithubResponse = {
	user: {
		contributionsCollection: {
			contributionCalendar: ContributionCalendar;
		};
	};
};

export const getContributions = cache(
	async (
		username: string,
		year: number,
		options: GetContributionsOptions = {},
	): Promise<ContributionCalendar> => {
		const { from, to } = getContributionDateRange(year);
		const client = options.client ?? getGithubGraphql();
		const response = await client<GithubResponse>({
			query,
			username,
			from,
			to,
		});

		return response.user.contributionsCollection.contributionCalendar;
	},
);

export function getContributionDateRange(
	year: number,
	now = new Date(),
): { from: string; to: string } {
	const currentYear = now.getUTCFullYear();

	if (year === currentYear) {
		return {
			from: new Date(Date.UTC(currentYear, 0, 1)).toISOString(),
			to: now.toISOString(),
		};
	}

	return {
		from: new Date(Date.UTC(year, 0, 1)).toISOString(),
		to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString(),
	};
}
