import { musicProfile } from '../content';

export default function MusicProfileFooter() {
	return (
		<div
			data-testid='music-profile-footer'
			className='mt-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-1 pt-3 text-right'
		>
			<p className='text-xs text-gray-500 dark:text-gray-400'>
				网易云 User ID：{musicProfile.userId}
			</p>
			<a
				href={musicProfile.url}
				target='_blank'
				rel='noopener noreferrer'
				className='text-xs text-primary-600 underline decoration-primary-500 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400'
			>
				打开网易云主页 ↗
			</a>
		</div>
	);
}
