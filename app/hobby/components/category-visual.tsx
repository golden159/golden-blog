import type { BangumiAnimeResponse } from 'app/components/bangumi/types';
import type { NeteaseActivityResponse } from 'app/components/netease/types';
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

const albumArtPlaceholder = '/static/hobby/music-placeholder.svg';

type CategoryVisualProps = {
	id: HobbyId;
	animeActivity?: BangumiAnimeResponse;
	musicActivity?: NeteaseActivityResponse;
};

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
}: CategoryVisualProps) {
	if (id === 'games') {
		return (
			<span aria-hidden='true' className='mt-5 flex gap-2'>
				<span className='rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold dark:bg-gray-800'>
					CO-OP
				</span>
				<span className='rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white'>
					GG
				</span>
			</span>
		);
	}

	if (id === 'anime') {
		return <AnimePreview animeActivity={animeActivity} />;
	}

	if (id === 'music') {
		return <MusicPreview musicActivity={musicActivity} />;
	}

	if (id === 'food') {
		return (
			<span aria-hidden='true' className='mt-5 block text-3xl'>
				◯
			</span>
		);
	}

	return (
		<span
			aria-hidden='true'
			className='mt-5 text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400'
		>
			HGH · FS · SZX · ZSN
		</span>
	);
}
