import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NeteaseListeningFootprint } from 'app/components/netease/footprint-types';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicDetails from './music-details';

const injectedFootprint: NeteaseListeningFootprint = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	timezone: 'Asia/Shanghai',
	coverage: {
		recentAvailable: true,
		recordCount: 1,
		oldestPlayedAt: 1_800_000_000_000,
		limit: 100,
		truncated: false,
	},
	today: {
		durationMs: 60_000,
		recordCount: 1,
		uniqueTrackCount: 1,
		topArtist: 'Artist',
		topTrack: 'Track',
		buckets: Array.from({ length: 12 }, (_, index) => ({
			label: `${index * 2}:00`,
			durationMs: index === 0 ? 60_000 : 0,
			recordCount: index === 0 ? 1 : 0,
		})),
	},
	week: { durationMs: 60_000, mondayDurationMs: 60_000, recordCount: 1 },
	reports: {
		week: {
			durationMs: 60_000,
			recordCount: 1,
			uniqueTrackCount: 1,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 7 }, (_, index) => ({
				label: `Day ${index + 1}`,
				durationMs: index === 0 ? 60_000 : 0,
				recordCount: index === 0 ? 1 : 0,
			})),
		},
		month: {
			durationMs: 60_000,
			recordCount: 1,
			uniqueTrackCount: 1,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 5 }, (_, index) => ({
				label: `Range ${index + 1}`,
				durationMs: index === 0 ? 60_000 : 0,
				recordCount: index === 0 ? 1 : 0,
			})),
		},
		year: {
			durationMs: 60_000,
			recordCount: 1,
			uniqueTrackCount: 1,
			topArtist: 'Artist',
			topTrack: 'Track',
			buckets: Array.from({ length: 12 }, (_, index) => ({
				label: `Month ${index + 1}`,
				durationMs: index === 0 ? 60_000 : 0,
				recordCount: index === 0 ? 1 : 0,
			})),
		},
	},
	lifetime: {
		listenCount: 1,
		estimatedDurationMs: 60_000,
		sampleDurationMs: 60_000,
		basis: 'recent-median',
	},
	weeklyHighlight: null,
};

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
	it('renders an injected footprint below the current-track hero without fetching', () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MusicDetails
					activity={{ state: 'empty', track: null }}
					footprint={injectedFootprint}
				/>
			</SWRConfig>,
		);

		const heroState = screen.getByTestId('music-state');
		const footprintHeading = screen.getByRole('heading', { name: '听歌足迹' });
		expect(
			heroState.compareDocumentPosition(footprintHeading) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(footprintHeading.closest('section')).toHaveClass('mt-6');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('loads the footprint separately without duplicating the recent-activity request', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			return new Response(
				JSON.stringify(
					url === '/api/hobby/netease/footprint'
						? injectedFootprint
						: { state: 'empty', track: null },
				),
				{ status: 200 },
			);
		});
		vi.stubGlobal('fetch', fetchMock);

		renderMusic();

		await screen.findByRole('heading', { name: '听歌足迹' });
		await waitFor(() => {
			expect(
				fetchMock.mock.calls.filter(([url]) => url === '/api/hobby/netease'),
			).toHaveLength(1);
			expect(
				fetchMock.mock.calls.filter(
					([url]) => url === '/api/hobby/netease/footprint',
				),
			).toHaveLength(1);
		});
	});

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
		expect(screen.getByText(/不代表当前正在播放/)).toBeInTheDocument();
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

	it('renders a weekly favorite as an aggregate without a record time', () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MusicDetails
					activity={{
						state: 'weekly',
						track: {
							title: 'アイドル',
							artists: ['YOASOBI'],
							album: 'アイドル',
							albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
							songUrl: 'https://music.163.com/song?id=54321',
							playedAt: null,
						},
					}}
				/>
			</SWRConfig>,
		);

		expect(screen.getByText('Weekly favorite · 本周常听')).toBeInTheDocument();
		expect(screen.getByText('本周听歌汇总')).toBeInTheDocument();
		expect(
			screen.getByText('本周听歌汇总，不表示当前或最近播放。'),
		).toBeInTheDocument();
		expect(screen.queryByText(/记录时间：/)).not.toBeInTheDocument();
	});

	it('hides an inconsistent weekly playback timestamp', () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MusicDetails
					activity={{
						state: 'weekly',
						track: {
							title: 'アイドル',
							artists: ['YOASOBI'],
							album: 'アイドル',
							albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
							songUrl: 'https://music.163.com/song?id=54321',
							playedAt: 1_800_000_000_000,
						},
					}}
				/>
			</SWRConfig>,
		);

		expect(screen.queryByText(/记录时间：/)).not.toBeInTheDocument();
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

	it('does not throw for an invalid playback timestamp', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ state: 'unavailable', track: null }), {
					status: 200,
				}),
			),
		);

		expect(() =>
			render(
				<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
					<MusicDetails
						activity={{
							state: 'older',
							track: {
								title: 'Track',
								artists: ['Artist'],
								album: 'Album',
								albumArtUrl: null,
								songUrl: 'https://music.163.com/song?id=1',
								playedAt: 1e20,
							},
						}}
					/>
				</SWRConfig>,
			),
		).not.toThrow();
	});
});
