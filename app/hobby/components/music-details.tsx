'use client';

import type { NeteaseActivityResponse } from 'app/components/netease/types';
import Image from 'next/image';
import { useState } from 'react';
import useSWR from 'swr';
import { musicGenres, musicProfile } from '../content';

const unavailable: NeteaseActivityResponse = {
	state: 'unavailable',
	track: null,
};

const albumArtPlaceholder = '/static/hobby/music-placeholder.svg';

const labels: Record<NeteaseActivityResponse['state'], string> = {
	recent: 'Recently active · 最近活跃',
	older: 'Last listened · 最近听过',
	empty: 'No recent track · 暂无最近记录',
	unavailable: 'Unavailable · 暂时无法获取',
};

const fetcher = async (url: string): Promise<NeteaseActivityResponse> => {
	try {
		const response = await fetch(url);
		return response.ok ? response.json() : unavailable;
	} catch {
		return unavailable;
	}
};

const formatPlayedAt = (playedAt: number | null): string | null =>
	playedAt === null
		? null
		: new Intl.DateTimeFormat('zh-CN', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}).format(new Date(playedAt));

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
			className='aspect-square w-36 rounded-xl object-cover md:w-44'
		/>
	);
}

export default function MusicDetails() {
	const { data = unavailable } = useSWR('/api/hobby/netease', fetcher, {
		refreshInterval: 60_000,
		refreshWhenHidden: false,
		shouldRetryOnError: false,
	});
	const { track } = data;
	const playedAt = formatPlayedAt(track?.playedAt ?? null);
	const albumArtKey = `${track?.songUrl ?? 'no-track'}:${track?.albumArtUrl ?? albumArtPlaceholder}`;

	return (
		<div className='grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center'>
			<AlbumArt key={albumArtKey} track={track} />
			<div className='min-w-0'>
				<p className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
					{labels[data.state]}
				</p>
				{track && (
					<>
						<a
							href={track.songUrl}
							target='_blank'
							rel='noopener noreferrer'
							aria-label={`在网易云音乐打开《${track.title}》（新窗口）`}
							className='mt-2 block truncate text-xl font-semibold outline-none hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
						>
							{track.title}
						</a>
						<p className='mt-1 truncate text-sm text-gray-600 dark:text-gray-300'>
							{track.artists.join(', ')} · {track.album}
						</p>
						{playedAt && (
							<p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
								记录时间：{playedAt}
							</p>
						)}
					</>
				)}
				<ul className='mt-4 flex flex-wrap gap-2' aria-label='音乐偏好'>
					{musicGenres.map((genre) => (
						<li
							key={genre}
							className='rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800'
						>
							{genre}
						</li>
					))}
				</ul>
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
	);
}
