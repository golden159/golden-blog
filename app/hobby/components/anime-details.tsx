'use client';

import type {
	BangumiAnimeEntry,
	BangumiAnimeResponse,
	BangumiProfile,
} from 'app/components/bangumi/types';
import Image from 'next/image';
import { useState } from 'react';
import { normalizeAnimeActivity, useAnimeActivity } from './anime-activity';

type AnimeDetailsProps = {
	activity?: BangumiAnimeResponse;
};

function ProfileAvatar({ profile }: { profile: BangumiProfile }) {
	const [failed, setFailed] = useState(false);

	if (!profile.avatarUrl || failed) {
		return (
			<div
				aria-hidden='true'
				className='grid size-14 shrink-0 place-items-center rounded-xl bg-primary-100 text-lg font-semibold text-primary-700 sm:size-16 sm:rounded-2xl sm:text-xl dark:bg-primary-400/15 dark:text-primary-200'
			>
				{profile.nickname.slice(0, 1).toUpperCase()}
			</div>
		);
	}

	return (
		<Image
			src={profile.avatarUrl}
			width={64}
			height={64}
			alt={`${profile.nickname} 的 Bangumi 头像`}
			onError={() => setFailed(true)}
			className='size-14 shrink-0 rounded-xl object-cover sm:size-16 sm:rounded-2xl'
		/>
	);
}

function AnimePoster({ entry }: { entry: BangumiAnimeEntry }) {
	const [failed, setFailed] = useState(false);

	if (!entry.imageUrl || failed) {
		return (
			<div
				aria-hidden='true'
				className='grid h-24 w-[4.5rem] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-100 to-gray-100 px-2 text-center text-[11px] font-semibold text-primary-700 dark:from-primary-400/15 dark:to-white/[0.06] dark:text-primary-200'
			>
				Bangumi
			</div>
		);
	}

	return (
		<Image
			src={entry.imageUrl}
			width={72}
			height={96}
			alt={`《${entry.title}》封面`}
			onError={() => setFailed(true)}
			className='h-24 w-[4.5rem] shrink-0 rounded-xl object-cover'
		/>
	);
}

const scoreText = (score: number): string =>
	Number.isInteger(score) ? String(score) : score.toFixed(1);

function ProfileSummary({
	profile,
	total,
}: {
	profile: BangumiProfile;
	total: number;
}) {
	return (
		<div className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4'>
			<ProfileAvatar key={profile.avatarUrl} profile={profile} />
			<div className='min-w-0 flex-1'>
				<h3 className='truncate text-xl font-semibold'>{profile.nickname}</h3>
				<p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
					@{profile.username}
				</p>
				{profile.sign && (
					<p className='mt-2 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300'>
						{profile.sign}
					</p>
				)}
			</div>
			<dl className='col-span-2 border-l-2 border-primary-300 pl-3 sm:col-span-1 sm:min-w-28 sm:pl-4 dark:border-primary-400/50'>
				<div>
					<dd className='text-2xl font-semibold text-primary-700 dark:text-primary-200'>
						{total}
					</dd>
					<dt className='text-xs text-primary-600 dark:text-primary-300'>
						动画收藏
					</dt>
				</div>
			</dl>
		</div>
	);
}

function AnimeCollection({ entries }: { entries: BangumiAnimeEntry[] }) {
	return (
		<section className='mt-6' aria-labelledby='bangumi-anime-heading'>
			<div className='flex items-end justify-between gap-4'>
				<div>
					<p className='text-[11px] font-semibold tracking-[0.18em] text-primary-600 uppercase dark:text-primary-400'>
						Collection
					</p>
					<h3 id='bangumi-anime-heading' className='mt-1 text-lg font-semibold'>
						Bangumi 动画片单
					</h3>
				</div>
				<p className='text-xs text-gray-500 dark:text-gray-400'>最近整理</p>
			</div>

			<ul className='mt-2 divide-y divide-gray-200 dark:divide-gray-700'>
				{entries.map((entry) => (
					<li key={entry.id}>
						<a
							href={`https://bgm.tv/subject/${entry.id}`}
							target='_blank'
							rel='noopener noreferrer'
							aria-label={`在 Bangumi 打开《${entry.title}》（新窗口）`}
							className='group flex min-h-28 gap-3 py-4 outline-none transition-colors hover:bg-primary-50/40 focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-primary-400/[0.06]'
						>
							<AnimePoster key={entry.imageUrl} entry={entry} />
							<div className='min-w-0 flex-1 py-0.5'>
								<div className='flex items-start justify-between gap-2'>
									<p className='line-clamp-2 text-sm font-semibold leading-5 group-hover:text-primary-600 dark:group-hover:text-primary-300'>
										{entry.title}
									</p>
									<span className='shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-400/15 dark:text-primary-200'>
										{entry.status}
									</span>
								</div>
								{entry.originalTitle && (
									<p className='mt-1 truncate text-xs text-gray-500 dark:text-gray-400'>
										{entry.originalTitle}
									</p>
								)}
								<div className='mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400'>
									{entry.personalScore !== null && (
										<span>我的评分 {scoreText(entry.personalScore)}</span>
									)}
									{entry.communityScore !== null && (
										<span>Bangumi {scoreText(entry.communityScore)}</span>
									)}
									{entry.totalEpisodes > 0 && (
										<span>
											{entry.watchedEpisodes} / {entry.totalEpisodes} 话
										</span>
									)}
								</div>
							</div>
						</a>
					</li>
				))}
			</ul>
		</section>
	);
}

export default function AnimeDetails({ activity }: AnimeDetailsProps) {
	const { data: fetchedActivity } = useAnimeActivity(activity === undefined);
	const isLoading = activity === undefined && fetchedActivity === undefined;
	const data = isLoading
		? null
		: normalizeAnimeActivity(activity ?? fetchedActivity);

	return (
		<div className='min-w-0'>
			<div>
				{isLoading && (
					<p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
						正在连接 Bangumi…
					</p>
				)}

				{data?.profile && (
					<ProfileSummary profile={data.profile} total={data.total} />
				)}

				{data?.state === 'ready' && <AnimeCollection entries={data.entries} />}

				{data?.state === 'empty' && (
					<p className='mt-6 border-l-2 border-gray-300 py-2 pl-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400'>
						还没有公开的动画收藏。
					</p>
				)}

				{data?.state === 'unavailable' && (
					<p className='py-6 text-sm leading-6 text-gray-600 dark:text-gray-300'>
						Bangumi 数据暂时不可用，仍可前往主页查看完整收藏。
					</p>
				)}
			</div>
		</div>
	);
}
