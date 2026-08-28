'use client';

import type {
	SteamActivityResponse,
	SteamCurrentGame,
	SteamGame,
} from 'app/components/steam/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
	normalizeSteamActivity,
	unavailableSteamActivity,
	useSteamActivity,
} from './steam-activity';

const steamPlaceholder = '/static/hobby/steam-placeholder.svg';

type SteamDetailsProps = {
	activity?: SteamActivityResponse;
	fetchWhenMissing?: boolean;
};

type SteamArtworkProps = {
	source: string | null;
	alt: string;
	size: number;
	className: string;
};

function SteamArtwork({
	source: requestedSource,
	alt,
	size,
	className,
}: SteamArtworkProps) {
	const [source, setSource] = useState(requestedSource ?? steamPlaceholder);

	useEffect(() => {
		setSource(requestedSource ?? steamPlaceholder);
	}, [requestedSource]);

	const isPlaceholder = source === steamPlaceholder;

	return (
		<Image
			src={source}
			width={size}
			height={size}
			sizes={`${size}px`}
			alt={`${alt}${isPlaceholder ? '占位图' : ''}`}
			onError={() => setSource(steamPlaceholder)}
			className={className}
		/>
	);
}

const formatPlaytime = (minutes: number): string => {
	if (minutes < 60) return `${minutes} 分钟`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes === 0
		? `${hours} 小时`
		: `${hours} 小时 ${remainingMinutes} 分钟`;
};

const storeUrl = (appId: number): string =>
	`https://store.steampowered.com/app/${appId}/`;

function CurrentGame({ game }: { game: SteamCurrentGame }) {
	return (
		<section className='mt-6 min-w-0' aria-labelledby='steam-current-heading'>
			<p className='text-[11px] font-semibold tracking-[0.18em] text-primary-600 uppercase dark:text-primary-400'>
				Live
			</p>
			<h3 id='steam-current-heading' className='mt-1 text-lg font-semibold'>
				正在玩
			</h3>
			<a
				href={storeUrl(game.appId)}
				target='_blank'
				rel='noopener noreferrer'
				aria-label={`在 Steam 商店打开 ${game.name}（新窗口）`}
				className='mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
			>
				<SteamArtwork
					source={game.iconUrl}
					alt={`${game.name} 的 Steam 图标`}
					size={56}
					className='size-14 rounded-xl bg-gray-100 object-cover dark:bg-gray-800'
				/>
				<span className='min-w-0 truncate text-base font-semibold hover:text-primary-600 dark:hover:text-primary-300'>
					{game.name}
				</span>
			</a>
		</section>
	);
}

function RecentGameItem({ game }: { game: SteamGame }) {
	return (
		<li
			data-testid={`steam-recent-game-${game.appId}`}
			className='flex min-w-0 flex-wrap items-center gap-3 py-4'
		>
			<SteamArtwork
				source={game.iconUrl}
				alt={`${game.name} 的 Steam 图标`}
				size={48}
				className='size-12 shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-gray-800'
			/>
			<a
				href={storeUrl(game.appId)}
				target='_blank'
				rel='noopener noreferrer'
				aria-label={`在 Steam 商店打开 ${game.name}（新窗口）`}
				className='min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
			>
				<span className='block truncate text-sm font-semibold hover:text-primary-600 dark:hover:text-primary-300'>
					{game.name}
				</span>
			</a>
			<div
				data-testid={`steam-playtime-${game.appId}`}
				className='w-full text-left text-xs text-gray-500 sm:w-auto sm:text-right dark:text-gray-400'
			>
				{game.playtime2WeeksMinutes !== null && (
					<p>近两周 {formatPlaytime(game.playtime2WeeksMinutes)}</p>
				)}
				{game.playtimeForeverMinutes !== null && (
					<p className='mt-0.5'>
						累计 {formatPlaytime(game.playtimeForeverMinutes)}
					</p>
				)}
			</div>
		</li>
	);
}

export default function SteamDetails({
	activity,
	fetchWhenMissing = true,
}: SteamDetailsProps) {
	const { data: fetchedActivity } = useSteamActivity(
		fetchWhenMissing && activity === undefined,
	);
	const isLoading =
		fetchWhenMissing && activity === undefined && fetchedActivity === undefined;
	const data = isLoading
		? null
		: normalizeSteamActivity(
				activity ?? fetchedActivity ?? unavailableSteamActivity,
			);

	if (isLoading) {
		return (
			<p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
				正在连接 Steam…
			</p>
		);
	}

	if (!data?.profile) {
		return (
			<p className='text-sm leading-6 text-gray-600 dark:text-gray-300'>
				Steam 数据暂时不可用，静态游戏清单仍可正常查看。
			</p>
		);
	}

	return (
		<section className='min-w-0' aria-label='Steam 游戏动态'>
			<div className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4'>
				<SteamArtwork
					source={data.profile.avatarUrl}
					alt={`${data.profile.personaName} 的 Steam 头像`}
					size={64}
					className='size-14 rounded-xl bg-gray-100 object-cover sm:size-16 sm:rounded-2xl dark:bg-gray-800'
				/>
				<div className='min-w-0'>
					<h3 className='truncate text-xl font-semibold'>
						{data.profile.personaName}
					</h3>
					<p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
						Steam
					</p>
				</div>
				<p className='col-span-2 text-xs text-gray-500 sm:col-span-1 sm:text-right dark:text-gray-400'>
					每 60 秒更新
				</p>
			</div>

			{data.currentGame && <CurrentGame game={data.currentGame} />}

			<section className='mt-6 min-w-0' aria-labelledby='steam-recent-heading'>
				<div>
					<p className='text-[11px] font-semibold tracking-[0.18em] text-primary-600 uppercase dark:text-primary-400'>
						History
					</p>
					<h3 id='steam-recent-heading' className='mt-1 text-lg font-semibold'>
						最近玩过
					</h3>
				</div>

				{data.recentGames.length > 0 && (
					<ul className='mt-2 divide-y divide-gray-200 dark:divide-gray-700'>
						{data.recentGames.map((game) => (
							<RecentGameItem key={game.appId} game={game} />
						))}
					</ul>
				)}

				{data.state === 'empty' && (
					<p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
						暂无公开的最近游戏。
					</p>
				)}
				{data.state === 'ready' && data.recentGames.length === 0 && (
					<p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
						暂无其他公开的最近游戏。
					</p>
				)}
				{data.state === 'unavailable' && (
					<p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
						最近游戏数据暂时不可用，稍后会自动重试。
					</p>
				)}
			</section>
		</section>
	);
}
