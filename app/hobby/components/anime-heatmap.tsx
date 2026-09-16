'use client';

import type { BangumiActivityDay } from 'app/components/bangumi/types';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

const DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const colors = [
	'bg-gray-200 dark:bg-gray-800',
	'bg-pink-200 dark:bg-pink-950',
	'bg-pink-400 dark:bg-pink-700',
	'bg-pink-500 dark:bg-pink-500',
	'bg-pink-700 dark:bg-pink-300',
];

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const levelFor = (count: number): number => Math.min(count, 4);

export default function AnimeHeatmap({
	activity,
}: {
	activity: BangumiActivityDay[];
}) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const counts = new Map(activity.map(({ date, count }) => [date, count]));
	const today = new Date();
	const todayUtc = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	const firstDayUtc = todayUtc - (DAYS - 1) * DAY_MS;
	const days = Array.from({ length: DAYS }, (_, index) => {
		const date = dateKey(new Date(firstDayUtc + index * DAY_MS));
		return { date, count: counts.get(date) ?? 0 };
	});
	const leadingDays = new Date(firstDayUtc).getUTCDay();
	const cells: Array<(typeof days)[number] | { placeholder: string }> = [
		...Array.from({ length: leadingDays }, (_, index) => ({
			placeholder: `before-${index + 1}`,
		})),
		...days,
	];
	while (cells.length % 7 !== 0) {
		cells.push({ placeholder: `after-${cells.length % 7}` });
	}
	const monthLabels = Array.from(
		{ length: cells.length / 7 },
		(_, weekIndex) => {
			const week = cells.slice(weekIndex * 7, weekIndex * 7 + 7);
			const labelDay =
				weekIndex === 0
					? week.find((day) => 'date' in day)
					: week.find((day) => 'date' in day && day.date.endsWith('-01'));
			return labelDay && 'date' in labelDay
				? `${Number(labelDay.date.slice(5, 7))}月`
				: '';
		},
	);
	const total = days.reduce((sum, day) => sum + day.count, 0);

	useEffect(() => {
		const scrollContainer = scrollContainerRef.current;
		if (scrollContainer)
			scrollContainer.scrollLeft = scrollContainer.scrollWidth;
	}, []);

	return (
		<section className='mt-6' aria-labelledby='bangumi-activity-heading'>
			<div className='flex flex-wrap items-end justify-between gap-2'>
				<div>
					<p className='text-[11px] font-semibold tracking-[0.18em] text-primary-600 uppercase dark:text-primary-400'>
						Activity
					</p>
					<h3
						id='bangumi-activity-heading'
						className='mt-1 text-lg font-semibold'
					>
						Bangumi 活跃日历
					</h3>
				</div>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					近一年 · {total} 次活动
				</p>
			</div>

			<section
				ref={scrollContainerRef}
				aria-label='Bangumi 公开活动日历'
				className='mt-3 overflow-x-auto overscroll-x-contain pb-1'
			>
				<div className='w-max min-w-full'>
					<div
						aria-hidden='true'
						className='mb-1 flex gap-1 text-[10px] text-gray-500 dark:text-gray-400'
					>
						{monthLabels.map((label, index) => (
							<span key={`${index}-${label}`} className='w-3 shrink-0'>
								{label}
							</span>
						))}
					</div>
					<div
						role='img'
						aria-label={`近一年有 ${total} 次 Bangumi 活动`}
						className='grid w-max grid-flow-col grid-rows-7 gap-1'
					>
						{cells.map((day) => {
							if ('placeholder' in day) {
								return <span key={day.placeholder} className='size-3' />;
							}
							const level = levelFor(day.count);
							const randomizedDelay = Math.random() * 7 * 0.2;
							return (
								<motion.span
									key={day.date}
									initial='initial'
									animate='animate'
									variants={{
										initial: { opacity: 0, translateY: -20 },
										animate: {
											opacity: 1,
											translateY: 0,
											transition: { delay: randomizedDelay },
										},
									}}
									aria-hidden='true'
									title={`${day.date}：${day.count} 次活动`}
									data-level={level}
									className={`size-3 rounded-xs ${colors[level]}`}
								/>
							);
						})}
					</div>
				</div>
			</section>

			<div className='mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400'>
				<p>基于最近 365 天的公开时间胶囊活动</p>
				<div className='flex items-center gap-1' aria-hidden='true'>
					<span className='mr-1'>少</span>
					{colors.map((color) => (
						<span key={color} className={`size-2.5 rounded-xs ${color}`} />
					))}
					<span className='ml-1'>多</span>
				</div>
			</div>
		</section>
	);
}
