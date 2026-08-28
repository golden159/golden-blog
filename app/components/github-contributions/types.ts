export interface ContributionCalendar {
	colors: string[];
	totalContributions: number;
	weeks: {
		contributionDays: {
			color: string;
			date: string;
			contributionCount: number;
		}[];
		firstDay: string;
	}[];
	months: { firstDay: string; name: string; totalWeeks: number }[];
}
