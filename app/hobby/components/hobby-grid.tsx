'use client';

import type { BangumiAnimeResponse } from 'app/components/bangumi/types';
import type {
	NeteaseActivityResponse,
	NeteaseWeeklyRanking,
} from 'app/components/netease/types';
import type { SteamActivityResponse } from 'app/components/steam/types';
import { useState } from 'react';
import { hobbyCategories } from '../content';
import type { HobbyId } from '../types';
import { useAnimeActivity } from './anime-activity';
import AnimeDetails from './anime-details';
import AnimeProfileFooter from './anime-profile-footer';
import FoodDetails from './food-details';
import GameDetails from './game-details';
import HobbyCard from './hobby-card';
import MusicDetails from './music-details';
import { useMusicOverview } from './music-overview-data';
import MusicProfileFooter from './music-profile-footer';
import { useSteamActivity } from './steam-activity';
import SteamProfileFooter from './steam-profile-footer';
import TravelDetails from './travel-details';

function renderDetails(
	id: HobbyId,
	summary: string,
	steamActivity?: SteamActivityResponse,
	animeActivity?: BangumiAnimeResponse,
	musicActivity?: NeteaseActivityResponse,
	musicWeeklyRanking?: NeteaseWeeklyRanking,
) {
	if (id === 'games') {
		return <GameDetails steamActivity={steamActivity} />;
	}
	if (id === 'anime') {
		return <AnimeDetails activity={animeActivity} />;
	}
	if (id === 'music') {
		return (
			<MusicDetails
				activity={musicActivity}
				weeklyRanking={musicWeeklyRanking}
				fetchWhenMissing={false}
			/>
		);
	}
	if (id === 'food') {
		return <FoodDetails />;
	}
	if (id === 'travel') {
		return <TravelDetails />;
	}
	return (
		<p className='leading-7 text-gray-600 dark:text-gray-300'>{summary}</p>
	);
}

function activityForMusicPreview(
	activity?: NeteaseActivityResponse,
	weeklyRanking?: NeteaseWeeklyRanking,
): NeteaseActivityResponse | undefined {
	if (activity?.track) return activity;
	const weeklyTrack =
		weeklyRanking?.state === 'ready' ? weeklyRanking.tracks[0] : undefined;
	if (!weeklyTrack) return activity;

	return {
		state: 'weekly',
		track: {
			title: weeklyTrack.title,
			artists: weeklyTrack.artists,
			album: weeklyTrack.album,
			albumArtUrl: weeklyTrack.albumArtUrl,
			songUrl: weeklyTrack.songUrl,
			playedAt: null,
			...(weeklyTrack.durationMs !== null
				? { durationMs: weeklyTrack.durationMs }
				: {}),
		},
	};
}

export default function HobbyGrid() {
	const [activeCategory, setActiveCategory] = useState<HobbyId | null>(null);
	const { data: musicOverview } = useMusicOverview();
	const { data: animeActivity } = useAnimeActivity();
	const { data: steamActivity } = useSteamActivity();
	const musicActivity = musicOverview?.activity;
	const musicWeeklyRanking = musicOverview?.weeklyRanking;
	const musicPreviewActivity = activityForMusicPreview(
		musicActivity,
		musicWeeklyRanking,
	);

	return (
		<section
			aria-label='兴趣分类'
			className='grid grid-cols-1 gap-4 md:grid-cols-12'
		>
			{hobbyCategories.map((category) => {
				const isOpen = activeCategory === category.id;

				return (
					<HobbyCard
						key={category.id}
						category={category}
						isOpen={isOpen}
						musicActivity={
							category.id === 'music' ? musicPreviewActivity : undefined
						}
						animeActivity={category.id === 'anime' ? animeActivity : undefined}
						steamActivity={category.id === 'games' ? steamActivity : undefined}
						topFooter={
							category.id === 'games' ? (
								<SteamProfileFooter />
							) : category.id === 'anime' ? (
								<AnimeProfileFooter />
							) : category.id === 'music' ? (
								<MusicProfileFooter />
							) : undefined
						}
						onToggle={() =>
							setActiveCategory((current) =>
								current === category.id ? null : category.id,
							)
						}
					>
						{renderDetails(
							category.id,
							category.summary,
							steamActivity,
							animeActivity,
							musicActivity,
							musicWeeklyRanking,
						)}
					</HobbyCard>
				);
			})}
		</section>
	);
}
