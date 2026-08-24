import { fetchNeteaseWeeklyRanking } from 'app/components/netease/fetch-weekly-ranking';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const ranking = await fetchNeteaseWeeklyRanking();

	return NextResponse.json(ranking, {
		headers: {
			'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
		},
	});
}
