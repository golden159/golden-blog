import { fetchNeteaseListeningFootprint } from 'app/components/netease/fetch-listening-footprint';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const footprint = await fetchNeteaseListeningFootprint();

	return NextResponse.json(footprint, {
		headers: {
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
		},
	});
}
