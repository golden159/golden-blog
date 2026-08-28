'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import Calendar from './calendar';
import Days from './days';
import GithubCalendarSkeleton from './github-calendar-skeleton';
import GithubStats from './github-stats';
import GithubStatsSkeleton from './github-stats-skeleton';
import type { ContributionCalendar } from './types';
import YearSelect from './year-select';

async function fetchContributions(url: string): Promise<ContributionCalendar> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('GitHub statistics are unavailable');
	}

	return response.json();
}

export default function Contributions() {
	const [year, setYear] = useState(new Date().getFullYear());

	const {
		data: contributions,
		error,
		isLoading,
	} = useSWR(`/api/stats/github?year=${year}`, fetchContributions);

	if (error) {
		return (
			<div
				role='alert'
				className='border-b border-gray-200 px-3 py-4 text-gray-500 dark:border-gray-800 dark:text-gray-400'
			>
				GitHub 数据暂时不可用，请稍后再试。
			</div>
		);
	}

	if (!contributions || isLoading) {
		return (
			<div className='flex flex-col space-y-4'>
				<div className='flex space-x-2'>
					<Days />
					<GithubCalendarSkeleton />
					<YearSelect selectedYear={year} onYearChange={setYear} />
				</div>
				<GithubStatsSkeleton />
			</div>
		);
	}

	return (
		<Fragment>
			<div className='flex space-x-2'>
				<Days />
				<Calendar contributions={contributions} />
				<YearSelect selectedYear={year} onYearChange={setYear} />
			</div>
			<GithubStats contributions={contributions} year={year} />
		</Fragment>
	);
}
