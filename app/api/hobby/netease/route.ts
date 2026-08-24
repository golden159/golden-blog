import { fetchNeteaseActivity } from 'app/components/netease/netease';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const activity = await fetchNeteaseActivity();

	return NextResponse.json(activity, {
		headers: {
			'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
		},
	});
}
