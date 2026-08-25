import { fetchBangumiAnime } from 'app/components/bangumi/bangumi';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const anime = await fetchBangumiAnime();

	return NextResponse.json(anime, {
		headers: {
			'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
		},
	});
}
