import { fetchSteamActivity } from 'app/components/steam/steam';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const activity = await fetchSteamActivity();

	return NextResponse.json(activity, {
		headers: {
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
		},
	});
}
