import Link from 'next/link';
import { getTagIndex } from '../tags/content';

export default function TagsMenu() {
	const tags = getTagIndex();

	return (
		<details className='relative shrink-0'>
			<summary className='cursor-pointer list-none rounded-sm border border-primary-500/40 px-3 py-1 text-sm text-primary-600 marker:hidden hover:bg-primary-500/10 dark:text-primary-300 [&::-webkit-details-marker]:hidden'>
				Tags
			</summary>
			<div className='absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-black'>
				<Link
					href='/tags'
					className='mb-1 block rounded px-2 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800'
				>
					All tags
				</Link>
				{tags.map((tag) => (
					<Link
						href={`/tags/${encodeURIComponent(tag.name)}`}
						key={tag.name}
						aria-label={`${tag.name} ${tag.count} ${tag.sources.join(' ')}`}
						className='flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'
					>
						<span className='truncate font-semibold'>{tag.name}</span>
						<span className='flex shrink-0 items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400'>
							<span className='font-semibold text-gray-700 dark:text-gray-300'>
								{tag.count}
							</span>
							{tag.sources.map((source) => (
								<span key={source}>{source}</span>
							))}
						</span>
					</Link>
				))}
			</div>
		</details>
	);
}
