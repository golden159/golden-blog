import { fetchSteamLibrary } from 'app/components/steam/steam';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const library = await fetchSteamLibrary();

	return NextResponse.json(library, {
		headers: {
			'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
		},
	});
}
