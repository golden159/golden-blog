import { travelCities } from '../content';

export default function TravelDetails() {
	return (
		<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
			{travelCities.map((city, index) => (
				<article
					key={city}
					className='relative min-h-40 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900'
				>
					<div
						aria-hidden='true'
						className='absolute inset-x-0 bottom-0 flex h-20 items-end gap-1 px-4 opacity-50'
					>
						{[36, 64, 48, 76, 44].map((height) => (
							<span
								key={height}
								className='flex-1 rounded-t bg-primary-500'
								style={{ height: `${Math.max(20, height - index * 4)}%` }}
							/>
						))}
					</div>
					<p className='text-xs text-primary-600 dark:text-primary-400'>
						{String(index + 1).padStart(2, '0')}
					</p>
					<h3 className='mt-2 text-xl font-semibold'>{city}</h3>
				</article>
			))}
		</div>
	);
}
