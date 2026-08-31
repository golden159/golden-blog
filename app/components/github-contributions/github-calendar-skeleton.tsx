import Skeleton from '../skeleton';

export default function GithubCalendarSkeleton() {
	return (
		<div className='flex h-[152px] w-full flex-col justify-between'>
			<Skeleton className='h-4 w-full' />
			<Skeleton className='h-[102px] w-full' />
			<Skeleton className='h-4 w-36' />
		</div>
	);
}
