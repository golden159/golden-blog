'use client';

import classNames from 'classnames';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { HobbyCategory } from '../types';
import CategoryVisual from './category-visual';

type HobbyCardProps = {
	category: HobbyCategory;
	isOpen: boolean;
	onToggle: () => void;
	children: ReactNode;
};

export default function HobbyCard({
	category,
	isOpen,
	onToggle,
	children,
}: HobbyCardProps) {
	const prefersReducedMotion = useReducedMotion();
	const triggerId = `hobby-${category.id}-trigger`;
	const panelId = `hobby-${category.id}-panel`;
	const duration = prefersReducedMotion ? 0.15 : 0.3;

	return (
		<motion.article
			layout={!prefersReducedMotion}
			transition={{ duration, ease: 'easeOut' }}
			className={classNames(
				'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950',
				isOpen ? 'md:col-span-12' : category.compactSpan,
			)}
		>
			<button
				id={triggerId}
				type='button'
				aria-label={`${category.title} 分类`}
				aria-controls={panelId}
				aria-expanded={isOpen}
				onClick={onToggle}
				className='flex w-full items-start justify-between gap-6 p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset md:p-8'
			>
				<span className='min-w-0'>
					<span className='text-xs font-semibold tracking-[0.2em] text-primary-500'>
						{category.index}
					</span>
					{/* biome-ignore lint/a11y/useSemanticElements: the heading is nested in the button trigger */}
					<span
						role='heading'
						aria-level={2}
						className='mt-2 block text-2xl font-semibold md:text-3xl'
					>
						{category.title}
					</span>
					<span className='mt-3 block text-sm leading-6 text-gray-600 dark:text-gray-300 md:text-base'>
						{category.summary}
					</span>
					<CategoryVisual id={category.id} />
				</span>
				<motion.span
					aria-hidden='true'
					animate={{ rotate: isOpen ? 45 : 0 }}
					transition={{ duration }}
					className='mt-1 text-2xl text-primary-500'
				>
					+
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						id={panelId}
						role='region'
						aria-labelledby={triggerId}
						initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
						transition={{ duration }}
						className='border-t border-gray-200 px-6 py-6 dark:border-gray-700 md:px-8 md:py-8'
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
}
