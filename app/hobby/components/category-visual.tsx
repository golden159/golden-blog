import type { HobbyId } from '../types';

export default function CategoryVisual({ id }: { id: HobbyId }) {
	if (id === 'games') {
		return (
			<div aria-hidden='true' className='mt-5 flex gap-2'>
				<span className='rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold dark:bg-gray-800'>
					CO-OP
				</span>
				<span className='rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white'>
					GG
				</span>
			</div>
		);
	}

	if (id === 'anime') {
		return (
			<div aria-hidden='true' className='mt-5 flex items-center gap-3'>
				<span className='grid h-10 w-10 place-items-center rounded-full bg-primary-500 font-semibold text-white'>
					BG
				</span>
				<span className='text-xs text-gray-500 dark:text-gray-400'>
					1022640
				</span>
			</div>
		);
	}

	if (id === 'music') {
		return (
			<div aria-hidden='true' className='mt-5 flex h-10 items-end gap-1'>
				{[45, 80, 60, 95, 55].map((height) => (
					<span
						key={height}
						className='w-1.5 rounded-full bg-primary-500'
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
		);
	}

	if (id === 'food') {
		return (
			<p aria-hidden='true' className='mt-5 text-3xl'>
				◯
			</p>
		);
	}

	return (
		<p
			aria-hidden='true'
			className='mt-5 text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400'
		>
			HGH · FS · SZX · ZSN
		</p>
	);
}
