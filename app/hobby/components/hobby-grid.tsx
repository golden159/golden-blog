import { hobbyCategories } from '../content';

export default function HobbyGrid() {
	return (
		<section
			aria-label='兴趣分类'
			className='grid grid-cols-1 gap-4 md:grid-cols-12'
		>
			{hobbyCategories.map((category) => (
				<article
					key={category.id}
					className={`${category.compactSpan} rounded-2xl border border-gray-200 p-6 dark:border-gray-700`}
				>
					<p className='text-xs text-primary-500'>{category.index}</p>
					<h2 className='mt-2 text-2xl font-semibold'>{category.title}</h2>
					<p className='mt-3 text-gray-600 dark:text-gray-300'>
						{category.summary}
					</p>
				</article>
			))}
		</section>
	);
}
