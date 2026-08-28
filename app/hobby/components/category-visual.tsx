import type { BangumiAnimeResponse } from 'app/components/bangumi/types';
import type { NeteaseActivityResponse } from 'app/components/netease/types';
import type { SteamActivityResponse } from 'app/components/steam/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { animeProfile } from '../content';
import type { HobbyId } from '../types';
import {
	normalizeAnimeActivity,
	unavailableAnimeActivity,
} from './anime-activity';
import {
	musicPreviewLabels,
	musicStateLabels,
	normalizeMusicActivity,
	unavailableMusicActivity,
} from './music-activity';
import {
	normalizeSteamActivity,
	unavailableSteamActivity,
} from './steam-activity';

const albumArtPlaceholder = '/static/hobby/music-placeholder.svg';

type CategoryVisualProps = {
	id: HobbyId;
	animeActivity?: BangumiAnimeResponse;
	musicActivity?: NeteaseActivityResponse;
	steamActivity?: SteamActivityResponse;
};

function SteamPreview({
	steamActivity,
}: {
	steamActivity: SteamActivityResponse;
}) {
	const safeActivity = normalizeSteamActivity(steamActivity);
	const profile = safeActivity.profile;
	const game = safeActivity.currentGame ?? safeActivity.recentGames[0] ?? null;
	const requestedSource = profile?.avatarUrl ?? null;
	const [source, setSource] = useState(requestedSource);

	useEffect(() => {
		setSource(requestedSource);
	}, [requestedSource]);

	const status = safeActivity.currentGame
		? '正在玩'
		: safeActivity.recentGames.length > 0
			? '最近玩过'
			: safeActivity.state === 'empty'
				? '暂无公开记录'
				: 'Steam 暂时不可用';

	return (
		<span
			data-testid='games-preview'
			className='mt-5 flex min-w-0 items-center gap-3'
		>
			<span className='relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#172033] text-xs font-semibold text-white'>
				{source ? (
					<Image
						data-testid='steam-preview-avatar'
						src={source}
						width={40}
						height={40}
						sizes='40px'
						alt={`${profile?.personaName ?? 'Steam'} 的 Steam 头像`}
						onError={() => setSource(null)}
						className='size-10 object-cover'
					/>
				) : (
					<span data-testid='steam-preview-avatar-fallback' aria-hidden='true'>
						ST
					</span>
				)}
			</span>
			<span className='min-w-0'>
				<span
					data-testid='steam-preview-status'
					className='block text-xs font-semibold text-primary-600 dark:text-primary-400'
				>
					{status}
				</span>
				<span
					data-testid='steam-preview-game'
					className='mt-0.5 block max-w-[min(16rem,60vw)] truncate text-xs text-gray-500 dark:text-gray-400'
				>
					{game?.name ?? profile?.personaName ?? 'Steam'}
				</span>
			</span>
		</span>
	);
}

function AnimePreview({
	animeActivity,
}: {
	animeActivity: BangumiAnimeResponse;
}) {
	const safeActivity = normalizeAnimeActivity(animeActivity);
	const profile = safeActivity.profile;
	const requestedSource = profile?.avatarUrl ?? null;
	const [source, setSource] = useState(requestedSource);

	useEffect(() => {
		setSource(requestedSource);
	}, [requestedSource]);

	return (
		<span className='mt-5 flex items-center gap-3'>
			<span className='relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-500 font-semibold text-white'>
				{source ? (
					<Image
						data-testid='anime-preview-avatar'
						src={source}
						width={40}
						height={40}
						alt={`${profile?.nickname ?? 'Bangumi'} 的 Bangumi 头像`}
						onError={() => setSource(null)}
						className='size-10 object-cover'
					/>
				) : (
					<span data-testid='anime-preview-avatar-fallback' aria-hidden='true'>
						BG
					</span>
				)}
			</span>
			<span className='text-xs text-gray-500 dark:text-gray-400'>
				{animeProfile.userId}
			</span>
		</span>
	);
}

function MusicPreview({
	musicActivity,
}: {
	musicActivity: NeteaseActivityResponse;
}) {
	const safeActivity = normalizeMusicActivity(musicActivity);
	const track = safeActivity.track;
	const requestedSource = track?.albumArtUrl ?? albumArtPlaceholder;
	const [source, setSource] = useState(requestedSource);

	useEffect(() => {
		setSource(requestedSource);
	}, [requestedSource]);

	return (
		<span className='mt-5 flex min-w-0 items-center gap-3'>
			<span className='relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-800'>
				<Image
					data-testid='music-preview-art'
					data-track-title={track?.title ?? ''}
					src={source}
					alt={track ? `${track.title} 的专辑封面` : ''}
					fill
					sizes='48px'
					onError={() => setSource(albumArtPlaceholder)}
					className='object-cover'
				/>
			</span>
			<span className='min-w-0'>
				<span
					data-testid='music-preview-status'
					className='block text-xs font-semibold text-primary-600 dark:text-primary-400'
				>
					{musicStateLabels[safeActivity.state]}
				</span>
				<span className='mt-0.5 block max-w-[10rem] truncate text-xs text-gray-500 dark:text-gray-400'>
					{track?.title ?? musicPreviewLabels[safeActivity.state]}
				</span>
			</span>
		</span>
	);
}

export default function CategoryVisual({
	id,
	animeActivity = unavailableAnimeActivity,
	musicActivity = unavailableMusicActivity,
	steamActivity = unavailableSteamActivity,
}: CategoryVisualProps) {
	if (id === 'games') return <SteamPreview steamActivity={steamActivity} />;
	if (id === 'anime') return <AnimePreview animeActivity={animeActivity} />;
	return <MusicPreview musicActivity={musicActivity} />;
}
