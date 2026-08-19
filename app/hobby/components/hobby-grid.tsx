'use client';

import { useState } from 'react';
import { hobbyCategories } from '../content';
import type { HobbyId } from '../types';
import HobbyCard from './hobby-card';

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
						<p className='leading-7 text-gray-600 dark:text-gray-300'>
							{category.summary}
						</p>
					</HobbyCard>
				);
			})}
		</section>
	);
}
