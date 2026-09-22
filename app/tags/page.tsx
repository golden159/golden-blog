import Link from 'next/link';
import Header from '../components/header';
import PageContainer from '../components/layouts/page-container';
import { getTagIndex } from './content';

export const metadata = {
	title: 'Tags',
	description: 'Browse projects and thoughts by tag.',
};

export default function TagsPage() {
	const tags = getTagIndex();

	return (
		<PageContainer>
			<Header title='Tags' />
			<p className='text-lg leading-7 text-gray-500 dark:text-gray-400'>
				Browse tags across Projects and Thoughts.
			</p>
			<div className='grid gap-3 sm:grid-cols-2'>
				{tags.map((tag) => (
					<Link
						href={`/tags/${encodeURIComponent(tag.name)}`}
						key={tag.name}
						className='rounded-md border border-gray-200 p-4 transition-colors hover:border-primary-500 dark:border-gray-700'
					>
						<div className='flex items-center justify-between gap-3'>
							<span className='font-medium'>{tag.name}</span>
							<span className='text-sm text-gray-500 dark:text-gray-400'>
								{tag.count}
							</span>
						</div>
						<p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
							来源：{tag.sources.join(' + ')}
						</p>
					</Link>
				))}
			</div>
		</PageContainer>
	);
}
