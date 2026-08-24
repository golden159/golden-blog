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
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ state: 'empty', track: null }), {
					status: 200,
				}),
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
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: 'https://p1.music.126.net/cover.jpg',
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
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

	it('shows the weekly favorite cover and title in the closed Music card', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'weekly',
						track: {
							title: 'アイドル',
							artists: ['YOASOBI'],
							album: 'アイドル',
							albumArtUrl: 'https://p1.music.126.net/weekly-cover.jpg',
							songUrl: 'https://music.163.com/song?id=54321',
							playedAt: null,
						},
					}),
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
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: 'https://p1.music.126.net/cover.jpg',
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
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

	it('shares the parent activity request while loading the weekly ranking separately', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ state: 'empty', track: null }), {
				status: 200,
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		fireEvent.click(trigger('Music'));
		await waitFor(() =>
			expect(screen.getByTestId('music-state')).toHaveTextContent(
				'暂无最近记录',
			),
		);
		expect(
			fetchMock.mock.calls.filter(([url]) => url === '/api/hobby/netease'),
		).toHaveLength(1);
		expect(
			fetchMock.mock.calls.filter(
				([url]) => url === '/api/hobby/netease/weekly',
			),
		).toHaveLength(1);
	});

	it('deduplicates the parent activity request when Music opens in flight', async () => {
		let resolveActivity: ((response: Response) => void) | undefined;
		const pendingActivity = new Promise<Response>((resolve) => {
			resolveActivity = resolve;
		});
		const fetchMock = vi.fn((input: RequestInfo | URL) =>
			String(input) === '/api/hobby/netease'
				? pendingActivity
				: Promise.resolve(
						new Response(
							JSON.stringify({
								state: 'unavailable',
								generatedAt: 1_800_000_000_000,
								tracks: [],
							}),
							{ status: 200 },
						),
					),
		);
		vi.stubGlobal('fetch', fetchMock);

		renderGrid();
		fireEvent.click(trigger('Music'));

		await waitFor(() => {
			expect(
				fetchMock.mock.calls.filter(([url]) => url === '/api/hobby/netease'),
			).toHaveLength(1);
		});
		resolveActivity?.(
			new Response(JSON.stringify({ state: 'empty', track: null }), {
				status: 200,
			}),
		);
		await waitFor(() =>
			expect(screen.getByTestId('music-state')).toHaveTextContent(
				'暂无最近记录',
			),
		);
	});
});
