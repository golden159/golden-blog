'use client';

import { motion, useReducedMotion } from 'motion/react';

interface Props {
	selectedYear: number;
	onYearChange: (year: number) => void;
}

export default function YearSelect({ selectedYear, onYearChange }: Props) {
	const thisYear = new Date().getFullYear();
	const prefersReducedMotion = useReducedMotion();

	const yearOptions = Array.from({ length: 5 }, (_, i) => thisYear - i);

	return (
		<div className='flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-x-0'>
			{yearOptions.map((year) => (
				<button
					type='button'
					onClick={() => {
						onYearChange(year);
					}}
					key={year}
					className='relative cursor-pointer border-b-2 border-transparent'
				>
					{year}
					{selectedYear === year && (
						<motion.div
							layoutId='year-select-indicator'
							className='absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary-500'
							transition={
								prefersReducedMotion
									? { duration: 0 }
									: { type: 'spring', stiffness: 500, damping: 40 }
							}
						/>
					)}
				</button>
			))}
		</div>
	);
}
