import Image from 'next/image';
import { foodContent } from '../content';

export default function FoodDetails() {
	return (
		<div className='grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center'>
			<Image
				src='/static/hobby/food-placeholder.svg'
				width={960}
				height={540}
				alt='等待补充的美食照片占位图'
				className='aspect-video w-full rounded-xl object-cover'
			/>
			<div>
				<p className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
					{foodContent.label}
				</p>
				<p className='mt-3 leading-7 text-gray-600 dark:text-gray-300'>
					{foodContent.description}
				</p>
			</div>
		</div>
	);
}
