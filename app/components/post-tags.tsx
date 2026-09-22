import Link from 'next/link';

export default function PostTags({ tags }: { tags?: string[] }) {
	if (!tags?.length) {
		return null;
	}

	return (
		<div className='flex flex-wrap gap-2'>
			{tags.map((tag) => (
				<Link
					href={`/tags/${encodeURIComponent(tag)}`}
					key={tag}
					className='rounded-full border border-primary-500/40 px-2 py-0.5 text-primary-600 hover:bg-primary-500/10 dark:text-primary-300'
				>
					{tag}
				</Link>
			))}
		</div>
	);
}
