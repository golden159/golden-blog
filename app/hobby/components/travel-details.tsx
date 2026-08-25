import { travelCities } from '../content';

export default function TravelDetails() {
	return (
		<div className='grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4'>
			{travelCities.map((city, index) => (
				<div
					key={city}
					className='border-l-2 border-primary-300 py-1 pl-4 dark:border-primary-500/60'
				>
					<p className='text-xs text-primary-600 dark:text-primary-400'>
						{String(index + 1).padStart(2, '0')}
					</p>
					<h3 className='mt-2 text-xl font-semibold'>{city}</h3>
				</div>
			))}
		</div>
	);
}
