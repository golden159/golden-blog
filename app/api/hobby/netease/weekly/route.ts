import { fetchNeteaseWeeklyRanking } from 'app/components/netease/fetch-weekly-ranking';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const ranking = await fetchNeteaseWeeklyRanking();
	const cacheControl =
		ranking.state === 'unavailable'
			? 'no-store, max-age=0'
			: 'public, s-maxage=300, stale-while-revalidate=600';

	return NextResponse.json(ranking, {
		headers: {
			'Cache-Control': cacheControl,
		},
	});
}
