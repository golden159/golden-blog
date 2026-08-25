import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HobbyGrid from './hobby-grid';

const trigger = (name: string) => screen.getByRole('button', { name });
const emptyOverview = {
	activity: { state: 'empty', track: null },
	weeklyRanking: {
		state: 'empty',
		generatedAt: 1_800_000_000_000,
		tracks: [],
	},
};
const emptyBangumi = {
	state: 'empty',
	profile: null,
	total: 0,
	entries: [],
};
const renderGrid = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<HobbyGrid />
		</SWRConfig>,
	);

describe('HobbyGrid', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async (input: RequestInfo | URL) =>
					new Response(
						JSON.stringify(
							String(input) === '/api/hobby/netease/overview'
								? emptyOverview
								: emptyBangumi,
						),
						{ status: 200 },
					),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders five closed categories initially', () => {
		renderGrid();

		for (const title of ['Games', 'Anime', 'Music', 'Food', 'Travel']) {
			const heading = screen.getByRole('heading', { name: title, level: 2 });
			expect(heading.tagName).toBe('H2');
			expect(trigger(title)).toHaveAttribute('aria-expanded', 'false');
		}
		expect(screen.getByTestId('hobby-games-indicator')).toHaveStyle({
			transitionDuration: '300ms',
		});
	});

	it('uses native accordion headings that contain title-only buttons', () => {
		renderGrid();

		const heading = screen.getByRole('heading', { name: 'Games', level: 2 });
		const gamesTrigger = within(heading).getByRole('button', { name: 'Games' });

		expect(heading).toContainElement(gamesTrigger);
		expect(gamesTrigger).not.toHaveAttribute('aria-label');
		expect(gamesTrigger).not.toHaveTextContent('01');
		expect(gamesTrigger).not.toHaveTextContent(
			'竞技、狩猎，以及和朋友一起制造混乱的联机夜晚。',
		);
		expect(screen.getByText('01')).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
	});

	it('keeps category visuals within phrasing-content markup', () => {
		renderGrid();

		for (const button of screen.getAllByRole('button')) {
			expect(button.querySelector('div, p')).toBeNull();
		}
	});

	it('keeps only one category open at a time', () => {
		renderGrid();

		fireEvent.click(trigger('Games'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('hobby-games-indicator')).toHaveStyle({
			transform: 'rotate(45deg)',
			transitionDuration: '300ms',
		});
		expect(screen.getByRole('region', { name: /Games/ })).toBeInTheDocument();

		fireEvent.click(trigger('Anime'));
		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
		expect(trigger('Anime')).toHaveAttribute('aria-expanded', 'true');
		expect(
			screen
				.getAllByRole('button')
				.filter((button) => button.getAttribute('aria-expanded') === 'true'),
		).toHaveLength(1);
	});

	it('hides an exiting panel and makes its descendants inert immediately', () => {
		renderGrid();

		fireEvent.click(trigger('Games'));
		expect(screen.getByRole('link', { name: /Steam/ })).toBeInTheDocument();

		fireEvent.click(trigger('Anime'));

		const exitingPanel = document.getElementById('hobby-games-panel');
		expect(exitingPanel).toBeInTheDocument();
		expect(exitingPanel).toHaveAttribute('aria-hidden', 'true');
		expect(exitingPanel).toHaveAttribute('inert');
		expect(
			within(exitingPanel as HTMLElement).queryByRole('link'),
		).not.toBeInTheDocument();
		expect(
			within(exitingPanel as HTMLElement).queryByRole('button'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('region', { name: /Games/ }),
		).not.toBeInTheDocument();
		expect(screen.getByRole('region', { name: /Anime/ })).toBeInTheDocument();
	});

	it('closes a category when its open trigger is selected again', () => {
		renderGrid();

		fireEvent.click(trigger('Games'));
		fireEvent.click(trigger('Games'));

		expect(trigger('Games')).toHaveAttribute('aria-expanded', 'false');
	});

	it('shows the Games account section only after Games opens', () => {
		renderGrid();
		expect(screen.queryByText('Game Accounts')).not.toBeInTheDocument();

		fireEvent.click(trigger('Games'));

		expect(screen.getByText('Game Accounts')).toBeInTheDocument();
	});

	it('places the Steam ID and profile link in the Games summary', () => {
		renderGrid();

		const profileLink = screen.getByRole('link', { name: /打开 Steam 主页/ });
		const gamesTrigger = trigger('Games');
		expect(profileLink).toHaveAttribute(
			'href',
			'https://steamcommunity.com/profiles/76561198985102331/',
		);
		expect(profileLink.parentElement).toHaveTextContent(
			'Steam ID：76561198985102331',
		);
		expect(profileLink.parentElement).toHaveClass('justify-end', 'text-right');
		expect(
			gamesTrigger.compareDocumentPosition(profileLink) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			screen.queryByRole('region', { name: 'Games' }),
		).not.toBeInTheDocument();

		fireEvent.click(gamesTrigger);
		expect(
			screen
				.getAllByRole('link')
				.filter(
					(link) =>
						link.getAttribute('href') ===
						'https://steamcommunity.com/profiles/76561198985102331/',
				),
		).toHaveLength(1);
	});

	it('places the Music profile at the bottom-right of the top summary', () => {
		renderGrid();

		const profileLink = screen.getByRole('link', { name: /网易云主页/ });
		const musicTrigger = trigger('Music');
		expect(profileLink).toHaveAttribute(
			'href',
			'https://y.music.163.com/m/user?id=3719820729',
		);
		expect(profileLink.parentElement).toHaveClass('justify-end', 'text-right');
		expect(
			musicTrigger.compareDocumentPosition(profileLink) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			screen.queryByRole('region', { name: 'Music' }),
		).not.toBeInTheDocument();

		fireEvent.click(musicTrigger);
		const musicPanel = screen.getByRole('region', { name: 'Music' });
		expect(
			profileLink.compareDocumentPosition(musicPanel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(screen.getAllByRole('link', { name: /网易云主页/ })).toHaveLength(1);
	});

	it('shares a baseline for profile footers across the first row', () => {
		renderGrid();

		for (const [id, footer] of [
			['games', 'steam'],
			['anime', 'anime'],
			['music', 'music'],
		] as const) {
			expect(screen.getByTestId(`hobby-${id}-summary`)).toHaveClass(
				'flex',
				'h-full',
				'flex-col',
			);
			expect(screen.getByTestId(`${footer}-profile-footer`)).toHaveClass(
				'mt-auto',
			);
		}
	});

	it('shows profile footers without gray top dividers', () => {
		renderGrid();

		for (const footerName of ['steam', 'anime', 'music']) {
			const footer = screen.getByTestId(`${footerName}-profile-footer`);
			expect(footer).toHaveClass('mt-auto', 'justify-end', 'text-right');
			expect(footer).not.toHaveClass('border-t');
			expect(footer).not.toHaveClass('border-gray-200/80');
			expect(footer).not.toHaveClass('dark:border-gray-700');
		}
	});

	it('keeps decorative compact visuals out of narrow summaries', () => {
		renderGrid();

		expect(screen.getByTestId('games-preview')).toHaveClass(
			'hidden',
			'sm:flex',
		);
		expect(screen.getByTestId('food-preview')).toHaveClass(
			'hidden',
			'sm:block',
		);
		expect(screen.getByTestId('travel-preview')).toHaveClass(
			'hidden',
			'sm:block',
		);
	});

	it('does not stretch an expanded summary to the full panel height', () => {
		renderGrid();

		fireEvent.click(trigger('Music'));

		expect(screen.getByTestId('hobby-music-summary')).not.toHaveClass('h-full');
	});

	it('shows the Bangumi avatar and profile link while Anime is closed', async () => {
		const avatarUrl = 'https://lain.bgm.tv/pic/user/l/golden.jpg';
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (String(input) === '/api/hobby/bangumi') {
				return new Response(
					JSON.stringify({
						state: 'empty',
						profile: {
							username: 'golden_xzs',
							nickname: 'Golden',
							sign: null,
							avatarUrl,
						},
						total: 0,
						entries: [],
					}),
					{ status: 200 },
				);
			}

			return new Response(JSON.stringify({ state: 'empty', track: null }), {
				status: 200,
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();

		const avatar = await screen.findByTestId('anime-preview-avatar');
		expect(avatar).toHaveAttribute('alt', 'Golden 的 Bangumi 头像');
		expect(decodeURIComponent(avatar.getAttribute('src') ?? '')).toContain(
			avatarUrl,
		);
		expect(
			screen.getByRole('link', { name: /打开 Bangumi 主页/ }),
		).toHaveAttribute('href', 'https://bangumi.tv/user/1022640');
		expect(
			screen.queryByRole('region', { name: 'Anime' }),
		).not.toBeInTheDocument();
	});

	it('keeps a single Bangumi profile link when Anime opens', () => {
		renderGrid();

		const profileLink = screen.getByRole('link', {
			name: /打开 Bangumi 主页/,
		});
		fireEvent.click(trigger('Anime'));
		const animePanel = screen.getByRole('region', { name: 'Anime' });

		expect(
			profileLink.compareDocumentPosition(animePanel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			screen
				.getAllByRole('link')
				.filter(
					(link) =>
						link.getAttribute('href') === 'https://bangumi.tv/user/1022640',
				),
		).toHaveLength(1);
	});

	it('matches trigger and panel identifiers', () => {
		renderGrid();
		const gamesTrigger = trigger('Games');

		fireEvent.click(gamesTrigger);
		const panel = screen.getByRole('region', { name: /Games/ });

		expect(gamesTrigger).toHaveAttribute('aria-controls', panel.id);
		expect(panel).toHaveAttribute('aria-labelledby', gamesTrigger.id);
	});

	it('shows the latest album art and freshness in the closed Music card', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async (input: RequestInfo | URL) =>
					new Response(
						JSON.stringify(
							String(input) === '/api/hobby/netease/overview'
								? {
										...emptyOverview,
										activity: {
											state: 'recent',
											track: {
												title: '夜に駆ける',
												artists: ['YOASOBI'],
												album: 'THE BOOK',
												albumArtUrl: 'https://p1.music.126.net/cover.jpg',
												songUrl: 'https://music.163.com/song?id=12345',
												playedAt: 1_800_000_000_000,
											},
										},
									}
								: emptyBangumi,
						),
						{ status: 200 },
					),
			),
		);

		renderGrid();

		const preview = await screen.findByTestId('music-preview-art');
		await waitFor(() =>
			expect(preview).toHaveAttribute('data-track-title', '夜に駆ける'),
		);
		await waitFor(() =>
			expect(decodeURIComponent(preview.getAttribute('src') ?? '')).toContain(
				'https://p1.music.126.net/cover.jpg',
			),
		);
		expect(preview).toHaveAttribute('alt', '夜に駆ける 的专辑封面');
		await waitFor(() =>
			expect(screen.getByTestId('music-preview-status')).toHaveTextContent(
				'最近活跃',
			),
		);
	});

	it('loads weekly data on page mount for the closed Music cover', async () => {
		const weeklyRanking = {
			state: 'ready',
			generatedAt: 1_800_000_000_000,
			tracks: [
				{
					rank: 1,
					title: '周榜歌曲',
					artists: ['Artist'],
					album: 'Album',
					albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
					songUrl: 'https://music.163.com/song?id=42',
					durationMs: 180_000,
					playCount: 3,
					score: 100,
				},
			],
		};
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			return new Response(
				JSON.stringify(
					url === '/api/hobby/netease/overview'
						? {
								activity: { state: 'unavailable', track: null },
								weeklyRanking,
							}
						: emptyBangumi,
				),
				{ status: 200 },
			);
		});
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();

		const preview = await screen.findByTestId('music-preview-art');
		await waitFor(() =>
			expect(preview).toHaveAttribute('data-track-title', '周榜歌曲'),
		);
		await waitFor(() =>
			expect(decodeURIComponent(preview.getAttribute('src') ?? '')).toContain(
				'https://p1.music.126.net/weekly-cover.jpg',
			),
		);
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/overview',
			),
		).toHaveLength(1);
		expect(
			screen.queryByRole('region', { name: 'Music' }),
		).not.toBeInTheDocument();

		fireEvent.click(trigger('Music'));
		await screen.findByRole('list', { name: '网易云听歌周榜' });
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/overview',
			),
		).toHaveLength(1);
	});

	it('shows the weekly favorite cover and title in the closed Music card', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async (input: RequestInfo | URL) =>
					new Response(
						JSON.stringify(
							String(input) === '/api/hobby/netease/overview'
								? {
										...emptyOverview,
										activity: {
											state: 'weekly',
											track: {
												title: 'アイドル',
												artists: ['YOASOBI'],
												album: 'アイドル',
												albumArtUrl:
													'https://p1.music.126.net/weekly-cover.jpg',
												songUrl: 'https://music.163.com/song?id=54321',
												playedAt: null,
											},
										},
									}
								: emptyBangumi,
						),
						{ status: 200 },
					),
			),
		);

		renderGrid();

		const preview = await screen.findByTestId('music-preview-art');
		await waitFor(() =>
			expect(preview).toHaveAttribute('data-track-title', 'アイドル'),
		);
		expect(preview).toHaveAttribute('alt', 'アイドル 的专辑封面');
		await waitFor(() =>
			expect(decodeURIComponent(preview.getAttribute('src') ?? '')).toContain(
				'https://p1.music.126.net/weekly-cover.jpg',
			),
		);
		expect(screen.getByTestId('music-preview-status')).toHaveTextContent(
			'本周常听',
		);
	});

	it('uses an honest fallback label when the recent list is empty', async () => {
		renderGrid();

		await waitFor(() =>
			expect(screen.getByTestId('music-preview-status')).toHaveTextContent(
				'暂无记录',
			),
		);
		expect(screen.getByText('暂无最近歌曲')).toBeInTheDocument();
	});

	it('falls back to the local preview art when the remote image fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async (input: RequestInfo | URL) =>
					new Response(
						JSON.stringify(
							String(input) === '/api/hobby/netease/overview'
								? {
										...emptyOverview,
										activity: {
											state: 'recent',
											track: {
												title: '夜に駆ける',
												artists: ['YOASOBI'],
												album: 'THE BOOK',
												albumArtUrl: 'https://p1.music.126.net/cover.jpg',
												songUrl: 'https://music.163.com/song?id=12345',
												playedAt: 1_800_000_000_000,
											},
										},
									}
								: emptyBangumi,
						),
						{ status: 200 },
					),
			),
		);

		renderGrid();
		const preview = await screen.findByTestId('music-preview-art');
		await waitFor(() =>
			expect(preview).toHaveAttribute('data-track-title', '夜に駆ける'),
		);
		fireEvent.error(preview);
		await waitFor(() =>
			expect(decodeURIComponent(preview.getAttribute('src') ?? '')).toContain(
				'/static/hobby/music-placeholder.svg',
			),
		);
	});

	it('loads activity and weekly ranking before Music opens', async () => {
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL) =>
				new Response(
					JSON.stringify(
						String(input) === '/api/hobby/netease/overview'
							? emptyOverview
							: emptyBangumi,
					),
					{ status: 200 },
				),
		);
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/overview',
			),
		).toHaveLength(1);
		expect(
			fetchMock.mock.calls.filter(([url]) => url === '/api/hobby/netease'),
		).toHaveLength(0);
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/weekly',
			),
		).toHaveLength(0);
		fireEvent.click(trigger('Music'));
		await waitFor(() =>
			expect(screen.getByTestId('music-state')).toHaveTextContent(
				'暂无最近记录',
			),
		);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('uses one overview request when Music opens before music data resolves', async () => {
		let resolveOverview: ((response: Response) => void) | undefined;
		const pendingOverview = new Promise<Response>((resolve) => {
			resolveOverview = resolve;
		});
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			if (url === '/api/hobby/netease/overview') return pendingOverview;
			return Promise.resolve(
				new Response(
					JSON.stringify({
						state: 'empty',
						profile: null,
						total: 0,
						entries: [],
					}),
					{ status: 200 },
				),
			);
		});
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();
		fireEvent.click(trigger('Music'));

		await waitFor(() => {
			expect(
				fetchMock.mock.calls.filter(
					([url]) => url === '/api/hobby/netease/overview',
				),
			).toHaveLength(1);
		});
		expect(
			fetchMock.mock.calls.filter(([url]) => url === '/api/hobby/netease'),
		).toHaveLength(0);
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/weekly',
			),
		).toHaveLength(0);

		resolveOverview?.(
			new Response(
				JSON.stringify({
					activity: { state: 'empty', track: null },
					weeklyRanking: {
						state: 'empty',
						generatedAt: 1_800_000_000_000,
						tracks: [],
					},
				}),
				{ status: 200 },
			),
		);
		await waitFor(() =>
			expect(screen.getByTestId('music-state')).toHaveTextContent(
				'暂无最近记录',
			),
		);
	});
});
