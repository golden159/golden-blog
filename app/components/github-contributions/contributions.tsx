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
	const layoutClassName = 'flex min-w-0 flex-col gap-3 md:flex-row md:gap-2';
	const calendarColumnClassName = 'order-2 min-w-0 flex-1 md:order-none';
	const yearColumnClassName = 'order-1 md:order-none';

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
				<div className={layoutClassName}>
					<Days />
					<div className={calendarColumnClassName}>
						<GithubCalendarSkeleton />
					</div>
					<div className={yearColumnClassName}>
						<YearSelect selectedYear={year} onYearChange={setYear} />
					</div>
				</div>
				<GithubStatsSkeleton />
			</div>
		);
	}

	return (
		<Fragment>
			<div className={layoutClassName}>
				<Days />
				<div className={calendarColumnClassName}>
					<Calendar contributions={contributions} />
				</div>
				<div className={yearColumnClassName}>
					<YearSelect selectedYear={year} onYearChange={setYear} />
				</div>
			</div>
			<GithubStats contributions={contributions} year={year} />
		</Fragment>
	);
}
