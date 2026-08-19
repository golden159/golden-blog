import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicDetails from './music-details';

const ChangedTrackButton = () => {
	const { mutate } = useSWRConfig();

	return (
		<button
			type='button'
			onClick={() =>
				mutate(
					'/api/hobby/netease',
					{
						state: 'recent',
						track: {
							title: '祝福',
							artists: ['YOASOBI'],
							album: 'はじめての - EP',
							albumArtUrl: 'https://p2.music.126.net/new-cover.jpg',
							songUrl: 'https://music.163.com/song?id=24680',
							playedAt: null,
						},
					},
					false,
				)
			}
		>
			更新歌曲
		</button>
	);
};

const renderMusic = (withTrackUpdater = false) =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MusicDetails />
			{withTrackUpdater && <ChangedTrackButton />}
		</SWRConfig>,
	);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('MusicDetails', () => {
	it('renders normalized recent activity and the profile link', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: null,
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
					{ status: 200 },
				),
			),
		);

		renderMusic();

		await waitFor(() =>
			expect(screen.getByText('夜に駆ける')).toBeInTheDocument(),
		);
		expect(screen.getByText('Recently active · 最近活跃')).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
		expect(screen.getByText(/记录时间：/)).toBeInTheDocument();
		expect(
			screen.getByRole('link', {
				name: '在网易云音乐打开《夜に駆ける》（新窗口）',
			}),
		).toHaveAttribute('href', 'https://music.163.com/song?id=12345');
		expect(screen.getByText('网易云 User ID：3719820729')).toBeInTheDocument();
		const profileLink = screen.getByRole('link', { name: /网易云主页/ });
		expect(profileLink).toHaveAttribute(
			'href',
			'https://y.music.163.com/m/user?id=3719820729',
		);
		expect(profileLink).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
	});

	it.each([
		['empty', 'No recent track · 暂无最近记录'],
		['unavailable', 'Unavailable · 暂时无法获取'],
	] as const)('keeps genres, account ID, and the profile link when activity is %s', async (state, label) => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ state, track: null }), {
					status: 200,
				}),
			),
		);

		renderMusic();

		await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
		for (const genre of ['日语', 'ACG', '流行', '说唱', '粤语', '民谣']) {
			expect(screen.getByText(genre)).toBeInTheDocument();
		}
		expect(screen.getByText('网易云 User ID：3719820729')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /网易云主页/ }),
		).toBeInTheDocument();
	});

	it('falls back to local album art after a remote image error', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'older',
						track: {
							title: '群青',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: 'https://p1.music.126.net/remote-cover.jpg',
							songUrl: 'https://music.163.com/song?id=67890',
							playedAt: null,
						},
					}),
					{ status: 200 },
				),
			),
		);

		renderMusic(true);

		const remoteImage = await screen.findByRole('img', {
			name: '群青 的专辑封面',
		});
		expect(decodeURIComponent(remoteImage.getAttribute('src') ?? '')).toContain(
			'https://p1.music.126.net/remote-cover.jpg',
		);

		fireEvent.error(remoteImage);

		const fallbackImage = await screen.findByRole('img', {
			name: '群青 的专辑封面占位图',
		});
		expect(
			decodeURIComponent(fallbackImage.getAttribute('src') ?? ''),
		).toContain('/static/hobby/music-placeholder.svg');

		fireEvent.click(screen.getByRole('button', { name: '更新歌曲' }));

		const changedTrackImage = await screen.findByRole('img', {
			name: '祝福 的专辑封面',
		});
		expect(
			decodeURIComponent(changedTrackImage.getAttribute('src') ?? ''),
		).toContain('https://p2.music.126.net/new-cover.jpg');
	});
});
