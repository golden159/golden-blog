import { fetchNeteaseOverview } from 'app/components/netease/fetch-overview';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const overview = await fetchNeteaseOverview();
	const hasUnavailableData =
		overview.activity.state === 'unavailable' ||
		overview.weeklyRanking.state === 'unavailable';

	return NextResponse.json(overview, {
		headers: {
			'Cache-Control': hasUnavailableData
				? 'no-store, max-age=0'
				: 'public, s-maxage=30, stale-while-revalidate=60',
		},
	});
}
