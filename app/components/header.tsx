import classNames from 'classnames';
import Link from 'next/link';
import { merryWeather, mukta } from '../fonts';
import { SquareArrowLeftIcon } from './layouts/icons/square-arrow-left';
import TagsMenu from './tags-menu';

export default function Header({ title }: { title: string }) {
	return (
		<div className='mb-12 flex items-center gap-2'>
			<Link
				href='/'
				className={classNames(
					'flex min-w-0 flex-1 items-center gap-2 rounded-sm text-primary-600 dark:text-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
					mukta.className,
				)}
			>
				<div className='flex items-center'>
					<SquareArrowLeftIcon size={20} className='h-9 w-9' />
					<span className='font-bold'>Home</span>
				</div>
				<div className='mx-1 min-w-4 flex-1 border-b border-primary-500' />
				<span
					className={classNames(
						'text-black dark:text-white text-lg md:text-4xl',
						merryWeather.className,
					)}
				>
					{title}
				</span>
			</Link>
			<TagsMenu />
		</div>
	);
}
