import { animeProfile } from '../content';

export default function AnimeDetails() {
	return (
		<div className='grid gap-6 md:grid-cols-[1fr_auto] md:items-end'>
			<div>
				<p className='max-w-2xl leading-7 text-gray-600 dark:text-gray-300'>
					动画收藏、评分和观看进度都放在 Bangumi；这里保留一个直接入口。
				</p>
				<p className='mt-4 text-sm'>
					Bangumi User ID：<strong>{animeProfile.userId}</strong>
				</p>
			</div>
			<a
				href={animeProfile.url}
				target='_blank'
				rel='noopener noreferrer'
				className='rounded-full bg-primary-500 px-5 py-2 text-center text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black'
			>
				查看我的 Bangumi ↗
			</a>
		</div>
	);
}
