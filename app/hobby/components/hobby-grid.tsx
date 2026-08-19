'use client';

import { useState } from 'react';
import { hobbyCategories } from '../content';
import type { HobbyId } from '../types';
import AnimeDetails from './anime-details';
import FoodDetails from './food-details';
import GameDetails from './game-details';
import HobbyCard from './hobby-card';
import MusicDetails from './music-details';
import TravelDetails from './travel-details';

function renderDetails(id: HobbyId, summary: string) {
	if (id === 'games') {
		return <GameDetails />;
	}
	if (id === 'anime') {
		return <AnimeDetails />;
	}
	if (id === 'music') {
		return <MusicDetails />;
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

export default function HobbyGrid() {
	const [activeCategory, setActiveCategory] = useState<HobbyId | null>(null);

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
						onToggle={() =>
							setActiveCategory((current) =>
								current === category.id ? null : category.id,
							)
						}
					>
						{renderDetails(category.id, category.summary)}
					</HobbyCard>
				);
			})}
		</section>
	);
}
