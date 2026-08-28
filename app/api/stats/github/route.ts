import {
	GITHUB_USERNAME,
	getContributions,
} from 'app/components/github-contributions/github';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
	const yearParameter = new URL(request.url).searchParams.get('year');
	const year = Number(yearParameter);
	const currentYear = new Date().getFullYear();
	const isValidYear =
		yearParameter !== null &&
		/^\d{4}$/.test(yearParameter) &&
		Number.isInteger(year) &&
		year >= currentYear - 4 &&
		year <= currentYear;

	if (!isValidYear) {
		return Response.json(
			{ error: 'Invalid year' },
			{ status: 400, headers: noStoreHeaders },
		);
	}

	try {
		const contributions = await getContributions(GITHUB_USERNAME, year);
		return Response.json(contributions, {
			headers: {
				'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
			},
		});
	} catch {
		return Response.json(
			{ error: 'GitHub statistics are unavailable' },
			{ status: 503, headers: noStoreHeaders },
		);
	}
}
