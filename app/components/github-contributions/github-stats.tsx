import { format } from 'date-fns';
import AnimatedNumber from '../animated-number';
import StatItem from '../stat-item';
import {
	getBestDay,
	getContributionStreak,
	getDaysFromContribution,
} from './metrics';
import type { ContributionCalendar } from './types';

interface Props {
	contributions: ContributionCalendar;
	year: number;
}

export default function GithubStats({ contributions, year }: Props) {
	const { weeks, totalContributions } = contributions;

	const bestDay = getBestDay(weeks);
	const daysFromContribution = getDaysFromContribution(weeks);
	const streak = getContributionStreak(
		contributions.weeks.flatMap((week) => week.contributionDays),
	);
	const averageContribution = totalContributions / daysFromContribution;

	return (
		<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
			<StatItem title={`${year} contributions`}>
				<AnimatedNumber number={totalContributions} />
				<span> contributions</span>
			</StatItem>
			<StatItem title='Longest Streak'>
				<AnimatedNumber number={streak.longestStreak} />
				<span> days</span>
			</StatItem>
			<StatItem title='Best day'>
				<span>{format(bestDay.day, 'PP')} — </span>
				<AnimatedNumber number={bestDay.count} />
				<span> contributions</span>
			</StatItem>
			<StatItem title='Average'>
				<AnimatedNumber number={averageContribution} />
				<span> contributions / day</span>
			</StatItem>
		</div>
	);
}
