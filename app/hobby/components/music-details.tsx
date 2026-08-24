'use client';

import type {
	NeteaseActivityResponse,
	NeteaseWeeklyRanking,
} from 'app/components/netease/types';
import Image from 'next/image';
import { useState } from 'react';
import { musicGenres, musicProfile } from '../content';
import ListeningWeeklyRanking from './listening-weekly-ranking';
import {
	normalizeMusicActivity,
	unavailableMusicActivity,
	useMusicActivity,
} from './music-activity';
import { useMusicWeeklyRanking } from './music-weekly-data';

const albumArtPlaceholder = '/static/hobby/music-placeholder.svg';

const labels: Record<NeteaseActivityResponse['state'], string> = {
	recent: 'Recently active · 最近活跃',
	older: 'Last listened · 最近听过',
	weekly: 'Weekly favorite · 本周常听',
	empty: 'No recent track · 暂无最近记录',
	unavailable: 'Unavailable · 暂时无法获取',
};

const stateDescriptions: Record<NeteaseActivityResponse['state'], string> = {
	recent: '15 分钟内有播放记录；这是最近听过，不代表当前正在播放。',
	older: '有最近播放记录，但时间已经超过 15 分钟。',
	weekly: '本周听歌汇总，不表示当前或最近播放。',
	empty: '播放一首歌后，最近记录会在同步后自动更新。',
	unavailable: '暂时无法读取网易云记录，请检查 Cookie 或稍后再试。',
};

const formatPlayedAt = (playedAt: number | null): string | null => {
	if (playedAt === null) {
		return null;
	}

	const date = new Date(playedAt);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat('zh-CN', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
};

const formatDuration = (durationMs: number | null): string | null => {
	if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) {
		return null;
	}

	const totalSeconds = Math.floor(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = String(totalSeconds % 60).padStart(2, '0');
	return `${minutes}:${seconds}`;
};

type Track = NonNullable<NeteaseActivityResponse['track']>;

function AlbumArt({ track }: { track: Track | null }) {
	const requestedSource = track?.albumArtUrl ?? albumArtPlaceholder;
	const [source, setSource] = useState(requestedSource);

	const isPlaceholder = source === albumArtPlaceholder;
	const alt = track
		? `${track.title} 的专辑封面${isPlaceholder ? '占位图' : ''}`
		: '网易云专辑封面占位图';

	return (
		<Image
			src={source}
			width={180}
			height={180}
			alt={alt}
			onError={() => setSource(albumArtPlaceholder)}
			className='aspect-square w-36 rounded-2xl object-cover shadow-lg md:w-44'
		/>
	);
}

type MusicDetailsProps = {
	activity?: NeteaseActivityResponse;
	weeklyRanking?: NeteaseWeeklyRanking;
};

export default function MusicDetails({
	activity,
	weeklyRanking,
}: MusicDetailsProps) {
	const { data: fetchedActivity } = useMusicActivity(activity === undefined);
	const { data: fetchedWeeklyRanking } = useMusicWeeklyRanking(
		weeklyRanking === undefined,
	);
	const data = normalizeMusicActivity(
		activity ?? fetchedActivity ?? unavailableMusicActivity,
	);
	const { track } = data;
	const isWeekly = data.state === 'weekly';
	const playedAt = isWeekly ? null : formatPlayedAt(track?.playedAt ?? null);
	const duration = formatDuration(track?.durationMs ?? null);
	const albumArtKey = `${track?.songUrl ?? 'no-track'}:${track?.albumArtUrl ?? albumArtPlaceholder}`;
	const dynamicTags = track
		? [track.artists[0], track.album].filter(
				(value, index, values): value is string =>
					typeof value === 'string' && values.indexOf(value) === index,
			)
		: [];

	return (
		<div className='relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/70 md:p-6'>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_45%)]'
			/>
			<div className='relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center'>
				<AlbumArt key={albumArtKey} track={track} />
				<div className='min-w-0'>
					<div className='flex flex-wrap items-center gap-2'>
						<p
							data-testid='music-state'
							className='text-sm font-semibold text-primary-600 dark:text-primary-400'
						>
							{labels[data.state]}
						</p>
						<span className='rounded-full border border-gray-200 bg-white/70 px-2.5 py-1 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-400'>
							{isWeekly ? '本周听歌汇总' : '最近播放记录'}
						</span>
					</div>

					{track ? (
						<>
							<a
								href={track.songUrl}
								target='_blank'
								rel='noopener noreferrer'
								aria-label={`在网易云音乐打开《${track.title}》（新窗口）`}
								className='mt-2 block truncate text-2xl font-semibold outline-none hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
							>
								{track.title}
							</a>
							<p className='mt-1 truncate text-sm text-gray-600 dark:text-gray-300'>
								{track.artists.join(', ')} · {track.album}
							</p>
							{isWeekly && (
								<p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
									本周听歌汇总，不表示当前或最近播放。
								</p>
							)}
						</>
					) : (
						<p className='mt-3 text-sm text-gray-600 dark:text-gray-300'>
							{stateDescriptions[data.state]}
						</p>
					)}

					<div className='mt-4 grid gap-3 sm:grid-cols-2'>
						<div className='rounded-xl border border-gray-200/90 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-950/55'>
							<p className='text-[11px] font-semibold tracking-[0.16em] text-gray-500 uppercase dark:text-gray-400'>
								常听风格
							</p>
							<ul aria-label='常听风格' className='mt-2 flex flex-wrap gap-2'>
								{musicGenres.map((genre) => (
									<li
										key={genre}
										className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.07] dark:text-gray-300'
									>
										{genre}
									</li>
								))}
							</ul>
						</div>

						{track && (
							<div className='rounded-xl border border-primary-200/80 bg-primary-50/70 p-3 dark:border-primary-300/20 dark:bg-primary-400/[0.08]'>
								<p className='text-[11px] font-semibold tracking-[0.16em] text-primary-600 uppercase dark:text-primary-300'>
									这首歌
								</p>
								<ul
									aria-label='这首歌的标签'
									className='mt-2 flex flex-wrap gap-2'
								>
									{dynamicTags.map((tag) => (
										<li
											key={tag}
											className='rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200/80 dark:bg-gray-950/60 dark:text-primary-200 dark:ring-primary-300/20'
										>
											{tag}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					{track && (
						<dl className='mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-3'>
							<div>
								<dt className='uppercase tracking-[0.16em]'>歌手</dt>
								<dd className='mt-1 truncate text-sm text-gray-700 dark:text-gray-200'>
									{track.artists.join(', ')}
								</dd>
							</div>
							<div>
								<dt className='uppercase tracking-[0.16em]'>专辑</dt>
								<dd className='mt-1 truncate text-sm text-gray-700 dark:text-gray-200'>
									{track.album}
								</dd>
							</div>
							{duration && (
								<div>
									<dt className='uppercase tracking-[0.16em]'>时长</dt>
									<dd className='mt-1 text-sm text-gray-700 dark:text-gray-200'>
										{duration}
									</dd>
								</div>
							)}
						</dl>
					)}
					{playedAt && (
						<p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
							记录时间：{playedAt}
						</p>
					)}

					<div className='mt-5 flex flex-wrap items-center gap-x-4 gap-y-2'>
						<p className='text-sm text-gray-600 dark:text-gray-300'>
							网易云 User ID：{musicProfile.userId}
						</p>
						<a
							href={musicProfile.url}
							target='_blank'
							rel='noopener noreferrer'
							className='text-sm text-primary-600 underline decoration-primary-500 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400'
						>
							打开网易云主页 ↗
						</a>
					</div>
				</div>
			</div>
			<ListeningWeeklyRanking ranking={weeklyRanking ?? fetchedWeeklyRanking} />
		</div>
	);
}
