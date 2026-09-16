import { fetchBangumiAnime } from 'app/components/bangumi/bangumi';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	const anime = await fetchBangumiAnime();
	const cacheControl =
		anime.state === 'unavailable' || anime.activityState === 'unavailable'
			? 'no-store'
			: 'public, s-maxage=300, stale-while-revalidate=900';

	return NextResponse.json(anime, {
		headers: {
			'Cache-Control': cacheControl,
		},
	});
}
