import { render, screen, within } from '@testing-library/react';
import type { NeteaseWeeklyRanking } from 'app/components/netease/types';
import { describe, expect, it } from 'vitest';
import ListeningWeeklyRanking from './listening-weekly-ranking';

const ranking: NeteaseWeeklyRanking = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	tracks: [
		{
			rank: 1,
			title: '夜に駆ける',
			artists: ['YOASOBI'],
			album: 'THE BOOK',
			albumArtUrl: 'https://p1.music.126.net/cover-1.jpg',
			songUrl: 'https://music.163.com/song?id=1',
			durationMs: 215_000,
			playCount: 8,
			score: 100,
		},
		{
			rank: 2,
			title: '群青',
			artists: ['YOASOBI', '幾田りら'],
			album: '群青',
			albumArtUrl: null,
			songUrl: 'https://music.163.com/song?id=2',
			durationMs: 240_000,
			playCount: 0,
			score: 92,
		},
	],
};

describe('ListeningWeeklyRanking', () => {
	it('adapts the donor song-row pattern into an ordered weekly ranking', () => {
		render(<ListeningWeeklyRanking ranking={ranking} />);

		expect(
			screen.getByRole('heading', { name: '听歌周榜', level: 3 }),
		).toBeInTheDocument();
		expect(screen.getByText('WEEKLY TOP 10')).toBeInTheDocument();
		const list = screen.getByRole('list', { name: '网易云听歌周榜' });
		const rows = within(list).getAllByRole('listitem');
		expect(rows).toHaveLength(2);
		expect(within(rows[0]).getByText('第 1 名')).toHaveClass('sr-only');
		expect(within(rows[0]).getByText('01')).toHaveAttribute(
			'aria-hidden',
			'true',
		);
		expect(within(rows[1]).getByText('第 2 名')).toHaveClass('sr-only');
		expect(within(rows[1]).getByText('02')).toHaveAttribute(
			'aria-hidden',
			'true',
		);

		const firstLink = within(rows[0]).getByRole('link');
		expect(firstLink).toHaveAccessibleName(/第 1 名/);
		expect(firstLink).toHaveAccessibleName(/YOASOBI/);
		expect(firstLink).toHaveAccessibleName(/周榜指数 100/);
		expect(firstLink).toHaveAccessibleName(/播放 8 次/);
		expect(firstLink).toHaveAccessibleName(/新窗口/);
		expect(firstLink).toHaveAttribute(
			'href',
			'https://music.163.com/song?id=1',
		);
		expect(firstLink).toHaveAttribute('target', '_blank');
		expect(
			within(rows[0]).getByRole('img', { name: '夜に駆ける 的专辑封面' }),
		).toHaveAttribute('width', '48');
		expect(within(rows[0]).getByText('YOASOBI · THE BOOK')).toBeInTheDocument();
		expect(within(rows[0]).getByText('3:35')).toBeInTheDocument();
		expect(within(rows[0]).getByText('周榜指数 100')).toBeInTheDocument();
		expect(within(rows[0]).getByText('播放 8 次')).toBeInTheDocument();
		expect(within(rows[1]).queryByText('播放 0 次')).not.toBeInTheDocument();
		expect(
			within(rows[1]).getByRole('img', {
				name: '群青 的专辑封面占位图',
			}),
		).toBeInTheDocument();
	});

	it('updates a cover when SWR returns a new artwork URL for the same song', () => {
		const { rerender } = render(<ListeningWeeklyRanking ranking={ranking} />);
		const originalCover = screen.getByRole('img', {
			name: '夜に駆ける 的专辑封面',
		});
		expect(
			decodeURIComponent(originalCover.getAttribute('src') ?? ''),
		).toContain('https://p1.music.126.net/cover-1.jpg');

		rerender(
			<ListeningWeeklyRanking
				ranking={{
					...ranking,
					tracks: [
						{
							...ranking.tracks[0],
							albumArtUrl: 'https://p2.music.126.net/new-cover.jpg',
						},
						...ranking.tracks.slice(1),
					],
				}}
			/>,
		);

		expect(
			decodeURIComponent(
				screen
					.getByRole('img', { name: '夜に駆ける 的专辑封面' })
					.getAttribute('src') ?? '',
			),
		).toContain('https://p2.music.126.net/new-cover.jpg');
	});

	it('does not render removed duration and period-report modules', () => {
		render(<ListeningWeeklyRanking ranking={ranking} />);

		expect(screen.queryByText('今日聆听')).not.toBeInTheDocument();
		expect(screen.queryByText('总聆听时长')).not.toBeInTheDocument();
		expect(screen.queryByText('本周 / 周一')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('heading', { name: '周/月/年聆听报告' }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole('tab', { name: '月' })).not.toBeInTheDocument();
		expect(screen.queryByRole('tab', { name: '年' })).not.toBeInTheDocument();
	});

	it('renders an honest empty state', () => {
		render(
			<ListeningWeeklyRanking
				ranking={{ ...ranking, state: 'empty', tracks: [] }}
			/>,
		);

		expect(
			screen.getByText('本周暂时没有可展示的听歌记录。'),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('list', { name: '网易云听歌周榜' }),
		).not.toBeInTheDocument();
	});

	it('renders an honest unavailable state', () => {
		render(
			<ListeningWeeklyRanking
				ranking={{ ...ranking, state: 'unavailable', tracks: [] }}
			/>,
		);

		expect(
			screen.getByText('周榜暂时无法读取，最近歌曲卡片仍会独立更新。'),
		).toBeInTheDocument();
	});

	it('uses an accessible loading state before data arrives', () => {
		render(<ListeningWeeklyRanking />);

		const loading = screen.getByRole('status', { name: '正在加载听歌周榜' });
		expect(loading).toHaveAttribute('aria-busy', 'true');
	});
});
