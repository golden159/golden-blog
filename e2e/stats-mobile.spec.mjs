import { createRequire } from 'node:module';

const runnerRequire = createRequire(process.argv[1]);
const { expect, test } = runnerRequire('playwright/test');

const baseUrl = process.env.STATS_BASE_URL ?? 'http://127.0.0.1:3000';

test.use({
	viewport: { width: 390, height: 844 },
	launchOptions: { channel: 'chrome' },
});

async function mockContributions(page) {
	const firstDay = new Date(Date.UTC(new Date().getFullYear(), 0, 1));
	const weeks = Array.from({ length: 40 }, (_, weekIndex) => ({
		firstDay: new Date(firstDay.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 10),
		contributionDays: Array.from({ length: 7 }, (_, dayIndex) => ({
			color: '#9be9a8',
			date: new Date(
				firstDay.getTime() + (weekIndex * 7 + dayIndex) * 24 * 60 * 60 * 1000,
			)
				.toISOString()
				.slice(0, 10),
			contributionCount: 1,
		})),
	}));

	await page.route('**/api/stats/github?year=*', (route) =>
		route.fulfill({
			json: {
				colors: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
				totalContributions: 280,
				weeks,
				months: [
					{
						firstDay: `${new Date().getFullYear()}-01-01`,
						name: 'Jan',
						totalWeeks: 10,
					},
					{
						firstDay: `${new Date().getFullYear()}-03-12`,
						name: 'Mar',
						totalWeeks: 10,
					},
					{
						firstDay: `${new Date().getFullYear()}-05-21`,
						name: 'May',
						totalWeeks: 10,
					},
					{
						firstDay: `${new Date().getFullYear()}-07-30`,
						name: 'Jul',
						totalWeeks: 10,
					},
				],
			},
		}),
	);
}

test('mobile contribution calendar makes its first and last weeks reachable', async ({
	page,
}) => {
	await mockContributions(page);
	await page.goto(`${baseUrl}/stats`, { waitUntil: 'networkidle' });

	const scroller = page.getByRole('region', {
		name: 'GitHub contribution calendar',
	});
	await expect(scroller).toBeVisible();

	const layout = await scroller.evaluate((element) => {
		const months = element.querySelector('ul');
		const grid = element.querySelector('[role="presentation"]');
		const cells = grid ? [...grid.querySelectorAll('span')] : [];
		const firstCell = cells[0];
		const lastCell = cells.at(-1);

		const initialScrollLeft = element.scrollLeft;
		element.scrollLeft = 0;
		const startBounds = element.getBoundingClientRect();
		const firstBounds = firstCell?.getBoundingClientRect();
		const firstWeekVisible = Boolean(
			firstBounds &&
				firstBounds.left >= startBounds.left &&
				firstBounds.right <= startBounds.right,
		);

		element.scrollLeft = element.scrollWidth;
		const endBounds = element.getBoundingClientRect();
		const lastBounds = lastCell?.getBoundingClientRect();
		const lastWeekVisible = Boolean(
			lastBounds &&
				lastBounds.left >= endBounds.left &&
				lastBounds.right <= endBounds.right,
		);

		return {
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
			initialScrollLeft,
			overflowX: getComputedStyle(element).overflowX,
			monthsAndGridShareScroller: Boolean(months && grid),
			firstWeekVisible,
			lastWeekVisible,
		};
	});

	expect(layout.overflowX).toBe('auto');
	expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
	expect(layout.initialScrollLeft).toBe(
		layout.scrollWidth - layout.clientWidth,
	);
	expect(layout.monthsAndGridShareScroller).toBe(true);
	expect(layout.firstWeekVisible).toBe(true);
	expect(layout.lastWeekVisible).toBe(true);
});

test('mobile year choices use a horizontal row above the calendar', async ({
	page,
}) => {
	await mockContributions(page);
	await page.goto(`${baseUrl}/stats`, { waitUntil: 'networkidle' });

	const currentYear = new Date().getFullYear();
	const currentYearBounds = await page
		.getByRole('button', { name: String(currentYear), exact: true })
		.boundingBox();
	const previousYearBounds = await page
		.getByRole('button', { name: String(currentYear - 1), exact: true })
		.boundingBox();

	expect(currentYearBounds).not.toBeNull();
	expect(previousYearBounds).not.toBeNull();
	expect(previousYearBounds?.y).toBe(currentYearBounds?.y);
});
