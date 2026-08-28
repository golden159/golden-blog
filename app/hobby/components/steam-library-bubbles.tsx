'use client';

import type {
	SteamLibraryGame,
	SteamLibraryResponse,
} from 'app/components/steam/types';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import {
	normalizeSteamLibrary,
	unavailableSteamLibrary,
	useSteamLibrary,
} from './steam-library-data';

const VISIBLE_GAME_LIMIT = 36;
const BUBBLE_CLOUD_LIMIT = 36;

type SteamLibraryBubblesProps = {
	library?: SteamLibraryResponse;
	fetchWhenMissing?: boolean;
};

type BubbleTier = 'sm' | 'md' | 'lg' | 'xl';
type BubbleLayer = 'center' | 'inner' | 'outer';

type BubblePosition = {
	x: number;
	y: number;
	layer: Exclude<BubbleLayer, 'center'>;
};

type BubblePositionStyle = CSSProperties & {
	'--steam-bubble-x': string;
	'--steam-bubble-y': string;
};

const INNER_RING_LIMIT = 10;

const bubblePosition = (index: number, total: number): BubblePosition => {
	const layer = index < INNER_RING_LIMIT ? 'inner' : 'outer';
	const ringIndex = layer === 'inner' ? index : index - INNER_RING_LIMIT;
	const ringCount =
		layer === 'inner'
			? Math.min(total, INNER_RING_LIMIT)
			: total - INNER_RING_LIMIT;
	const angleOffset = layer === 'outer' ? Math.PI / ringCount : 0;
	const angle =
		-Math.PI / 2 + angleOffset + (ringIndex * 2 * Math.PI) / ringCount;
	const radiusX = layer === 'inner' ? 26 : 38;
	const radiusY = layer === 'inner' ? 29 : 42;

	return {
		x: Number((50 + Math.cos(angle) * radiusX).toFixed(3)),
		y: Number((50 + Math.sin(angle) * radiusY).toFixed(3)),
		layer,
	};
};

const bubbleTier = (minutes: number): BubbleTier => {
	if (minutes >= 1000) return 'xl';
	if (minutes >= 300) return 'lg';
	if (minutes >= 60) return 'md';
	return 'sm';
};

const bubbleTierClasses: Record<BubbleTier, string> = {
	sm: 'px-2.5 py-1.5 text-[11px] leading-4',
	md: 'px-3 py-2 text-xs leading-4',
	lg: 'px-4 py-2.5 text-sm leading-5',
	xl: 'px-5 py-3 text-base leading-6',
};

const bubbleColors = [
	'bg-primary-500/10 border-primary-500/20 hover:bg-primary-500/20 dark:bg-primary-300/10 dark:border-primary-300/20 dark:hover:bg-primary-300/20',
	'bg-fuchsia-500/10 border-fuchsia-500/20 hover:bg-fuchsia-500/20 dark:bg-fuchsia-300/10 dark:border-fuchsia-300/20 dark:hover:bg-fuchsia-300/20',
	'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 dark:bg-rose-300/10 dark:border-rose-300/20 dark:hover:bg-rose-300/20',
	'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20 dark:bg-violet-300/10 dark:border-violet-300/20 dark:hover:bg-violet-300/20',
];

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

function LibraryBubble({
	game,
	index,
	layer,
}: {
	game: SteamLibraryGame;
	index: number;
	layer: BubbleLayer;
}) {
	const tier = bubbleTier(game.playtimeForeverMinutes);
	const playtime = formatPlaytime(game.playtimeForeverMinutes);

	return (
		<a
			data-testid={`steam-library-game-${game.appId}`}
			data-size-tier={tier}
			data-bubble-layer={layer}
			href={storeUrl(game.appId)}
			target='_blank'
			rel='noopener noreferrer'
			title={`${game.name} · 累计 ${playtime}`}
			className={classNames(
				'steam-bubble-motion inline-flex max-w-full items-center rounded-full border font-medium text-gray-700 outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-200',
				layer === 'center' && 'steam-bubble-center-motion steam-bubble-center',
				bubbleTierClasses[tier],
				bubbleColors[index % bubbleColors.length],
			)}
			style={{
				animationDelay: `${-((index % 9) * 0.8)}s`,
				...(layer === 'center'
					? {}
					: { animationDuration: `${6 + (index % 5)}s` }),
			}}
		>
			<span className='max-w-full truncate'>{game.name}</span>
		</a>
	);
}

function BubbleOrbit({
	game,
	index,
	position,
}: {
	game: SteamLibraryGame;
	index: number;
	position: BubblePosition;
}) {
	const style: BubblePositionStyle = {
		'--steam-bubble-x': `${position.x}%`,
		'--steam-bubble-y': `${position.y}%`,
	};

	return (
		<div
			className={classNames(
				'steam-bubble-orbit',
				position.layer === 'inner' && 'steam-bubble-orbit-inner',
			)}
			data-bubble-layer={position.layer}
			style={style}
		>
			<LibraryBubble game={game} index={index} layer={position.layer} />
		</div>
	);
}

export default function SteamLibraryBubbles({
	library,
	fetchWhenMissing = true,
}: SteamLibraryBubblesProps) {
	const [showAll, setShowAll] = useState(false);
	const { data: fetchedLibrary } = useSteamLibrary(
		fetchWhenMissing && library === undefined,
	);
	const isLoading =
		fetchWhenMissing && library === undefined && fetchedLibrary === undefined;
	const data = isLoading
		? null
		: normalizeSteamLibrary(
				library ?? fetchedLibrary ?? unavailableSteamLibrary,
			);

	if (isLoading) {
		return (
			<p
				data-testid='steam-library-loading'
				className='mt-6 text-sm text-gray-500 dark:text-gray-400'
			>
				正在整理 Steam 游戏库…
			</p>
		);
	}

	if (!data || data.state === 'unavailable') {
		return (
			<p
				data-testid='steam-library-unavailable'
				className='mt-6 text-sm text-gray-500 dark:text-gray-400'
			>
				Steam 游戏库暂时不可用。
			</p>
		);
	}

	if (data.state === 'empty') {
		return (
			<p
				data-testid='steam-library-empty'
				className='mt-6 text-sm text-gray-500 dark:text-gray-400'
			>
				暂无公开的 Steam 游戏库。
			</p>
		);
	}

	const orderedGames = [...data.games].sort(
		(a, b) =>
			b.playtimeForeverMinutes - a.playtimeForeverMinutes ||
			a.name.localeCompare(b.name, 'zh-CN'),
	);
	const visibleGames = showAll
		? orderedGames
		: orderedGames.slice(0, VISIBLE_GAME_LIMIT);
	const cloudGames = visibleGames.slice(0, BUBBLE_CLOUD_LIMIT);
	const overflowGames = visibleGames.slice(BUBBLE_CLOUD_LIMIT);
	const [centerGame, ...orbitGames] = cloudGames;

	return (
		<section
			data-testid='steam-library-bubbles'
			aria-labelledby='steam-library-heading'
			className='mt-8 min-w-0'
		>
			<div className='flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-1'>
				<div>
					<p className='text-[11px] font-semibold tracking-[0.18em] text-primary-600 uppercase dark:text-primary-400'>
						Library
					</p>
					<h3 id='steam-library-heading' className='mt-1 text-lg font-semibold'>
						Steam 游戏库
					</h3>
				</div>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					{data.totalCount} 款游戏
				</p>
			</div>

			<div
				data-testid='steam-library-cloud'
				className='steam-bubble-cloud mt-4 min-w-0 flex-wrap'
			>
				{centerGame && (
					<div
						data-testid='steam-library-center'
						className='steam-bubble-center-slot'
					>
						<LibraryBubble game={centerGame} index={0} layer='center' />
					</div>
				)}
				{orbitGames.map((game, index) => (
					<BubbleOrbit
						key={game.appId}
						game={game}
						index={index + 1}
						position={bubblePosition(index, orbitGames.length)}
					/>
				))}
			</div>

			{overflowGames.length > 0 && (
				<div
					data-testid='steam-library-overflow'
					className='steam-bubble-overflow mt-4 min-w-0'
				>
					{overflowGames.map((game, index) => (
						<LibraryBubble
							key={game.appId}
							game={game}
							index={index + BUBBLE_CLOUD_LIMIT}
							layer='outer'
						/>
					))}
				</div>
			)}

			{!showAll && orderedGames.length > VISIBLE_GAME_LIMIT && (
				<button
					type='button'
					onClick={() => setShowAll(true)}
					className='mt-4 text-xs font-semibold text-primary-600 underline decoration-primary-400 underline-offset-4 outline-none hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400'
				>
					显示全部 {data.totalCount} 款游戏
				</button>
			)}
		</section>
	);
}
