'use client';

import type {
	NeteaseWeeklyRanking,
	WeeklyRankingTrack,
} from 'app/components/netease/types';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';

const albumArtPlaceholder = '/static/hobby/music-placeholder.svg';

type ListeningWeeklyRankingProps = {
	ranking?: NeteaseWeeklyRanking;
};

const formatDuration = (durationMs: number | null): string | null => {
	if (durationMs === null) return null;
	const totalSeconds = Math.floor(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

function WeeklyCover({ track }: { track: WeeklyRankingTrack }) {
	const [source, setSource] = useState(
		track.albumArtUrl ?? albumArtPlaceholder,
	);
	const isPlaceholder = source === albumArtPlaceholder;

	return (
		<Image
			src={source}
			width={48}
			height={48}
			alt={`${track.title} 的专辑封面${isPlaceholder ? '占位图' : ''}`}
			onError={() => setSource(albumArtPlaceholder)}
			className='h-12 w-12 shrink-0 rounded-lg object-cover shadow-md ring-1 ring-black/5 dark:ring-white/10'
		/>
	);
}

function RankingShell({
	children,
	stateLabel,
}: {
	children: ReactNode;
	stateLabel?: string;
}) {
	return (
		<section
			aria-labelledby='listening-weekly-ranking-title'
			className='mt-6 min-w-0 border-t border-gray-200 pt-6 dark:border-gray-700'
		>
			<header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
				<div className='min-w-0'>
					<p className='text-xs font-black tracking-[0.28em] text-primary-600 dark:text-primary-300'>
						WEEKLY TOP 10
					</p>
					<h3
						id='listening-weekly-ranking-title'
						className='mt-2 bg-linear-to-r from-primary-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl dark:from-primary-300 dark:via-fuchsia-300 dark:to-cyan-300'
					>
						听歌周榜
					</h3>
					<p className='mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-neutral-300'>
						如果要把这一周装进一个时间胶囊，我想会把这些歌一起放进去。等以后再次听见它们，也许还能想起当时的天气、心情，以及那个阶段的自己。
					</p>
				</div>
				{stateLabel && (
					<span className='w-fit rounded-full border border-primary-300/70 bg-primary-50/90 px-3 py-1.5 text-xs font-bold text-primary-700 dark:border-primary-300/25 dark:bg-primary-400/10 dark:text-primary-200'>
						{stateLabel}
					</span>
				)}
			</header>
			{children}
		</section>
	);
}

function RankingRow({ track }: { track: WeeklyRankingTrack }) {
	const duration = formatDuration(track.durationMs);
	const visualRank = String(track.rank).padStart(2, '0');

	return (
		<li className='min-w-0'>
			<a
				href={track.songUrl}
				target='_blank'
				rel='noopener noreferrer'
				referrerPolicy='no-referrer'
				className='group grid min-w-0 grid-cols-[2rem_3rem_minmax(0,1fr)] items-center gap-3 py-3 outline-none transition-colors hover:bg-primary-50/45 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-white/[0.05] sm:grid-cols-[2.5rem_3rem_minmax(0,1fr)_auto]'
			>
				<span className='font-mono text-lg font-black tabular-nums text-primary-500 dark:text-primary-300'>
					<span className='sr-only'>第 {track.rank} 名</span>
					<span aria-hidden='true'>{visualRank}</span>
				</span>
				<WeeklyCover
					key={track.albumArtUrl ?? albumArtPlaceholder}
					track={track}
				/>
				<span className='min-w-0'>
					<span className='block truncate text-base font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300'>
						{track.title}
					</span>
					<span className='mt-1 block truncate text-xs text-gray-500 dark:text-neutral-400 sm:text-sm'>
						{track.artists.join(', ')} · {track.album}
					</span>
				</span>
				<span className='col-span-2 col-start-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-neutral-300 sm:col-span-1 sm:col-start-4 sm:ml-4 sm:justify-end'>
					{duration && (
						<span className='font-mono font-semibold tabular-nums'>
							{duration}
						</span>
					)}
					{track.score !== null && (
						<span className='font-semibold text-cyan-800 dark:text-cyan-200'>
							周榜指数 {track.score}
						</span>
					)}
					{track.playCount !== null && track.playCount > 0 && (
						<span className='font-semibold text-fuchsia-800 dark:text-fuchsia-200'>
							播放 {track.playCount} 次
						</span>
					)}
				</span>
				<span className='sr-only'>（在网易云音乐中打开，新窗口）</span>
			</a>
		</li>
	);
}

export default function ListeningWeeklyRanking({
	ranking,
}: ListeningWeeklyRankingProps) {
	if (!ranking) {
		return (
			<output
				aria-busy='true'
				aria-label='正在加载听歌周榜'
				className='mt-6 block min-w-0 border-t border-gray-200 pt-6 dark:border-gray-700'
			>
				<span className='sr-only'>正在加载听歌周榜</span>
				<span aria-hidden='true' className='block motion-safe:animate-pulse'>
					<span className='block h-3 w-28 rounded-full bg-primary-200 dark:bg-white/15' />
					<span className='mt-4 block h-9 w-44 rounded-xl bg-gray-200 dark:bg-white/10' />
					<span className='mt-7 block h-20 rounded-2xl bg-gray-100 dark:bg-white/[0.06]' />
					<span className='mt-2 block h-20 rounded-2xl bg-fuchsia-50 dark:bg-white/[0.04]' />
				</span>
			</output>
		);
	}

	if (ranking.state !== 'ready') {
		const isEmpty = ranking.state === 'empty';
		return (
			<RankingShell stateLabel={isEmpty ? '本周暂无记录' : '周榜暂不可用'}>
				<output className='mt-6 block border-l-2 border-gray-300 py-2 pl-4 text-sm leading-6 text-gray-600 dark:border-gray-700 dark:text-neutral-300'>
					{isEmpty
						? '本周暂时没有可展示的听歌记录。'
						: '周榜暂时无法读取，最近歌曲卡片仍会独立更新。'}
				</output>
			</RankingShell>
		);
	}

	return (
		<RankingShell>
			<ol
				aria-label='网易云听歌周榜'
				className='mt-4 min-w-0 list-none divide-y divide-gray-200 dark:divide-gray-700'
			>
				{ranking.tracks.map((track) => (
					<RankingRow key={track.songUrl} track={track} />
				))}
			</ol>
		</RankingShell>
	);
}
