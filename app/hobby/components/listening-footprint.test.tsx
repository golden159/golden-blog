import { fireEvent, render, screen, within } from '@testing-library/react';
import type { NeteaseListeningFootprint } from 'app/components/netease/footprint-types';
import { describe, expect, it } from 'vitest';
import ListeningFootprint from './listening-footprint';
import { unavailableMusicFootprint } from './music-footprint-data';

const validFootprint: NeteaseListeningFootprint = {
	state: 'ready',
	generatedAt: 1_800_000_000_000,
	timezone: 'Asia/Shanghai',
	coverage: {
		recentAvailable: true,
		recordCount: 100,
		oldestPlayedAt: 1_700_000_000_000,
		limit: 100,
		truncated: true,
	},
	today: {
		durationMs: 7_200_000,
		recordCount: 18,
		uniqueTrackCount: 14,
		topArtist: '宇多田ヒカル',
		topTrack: 'One Last Kiss',
		buckets: Array.from({ length: 12 }, (_, index) => ({
			label: `${String(index * 2).padStart(2, '0')}:00`,
			durationMs: index * 240_000,
			recordCount: index,
		})),
	},
	week: {
		durationMs: 43_200_000,
		mondayDurationMs: 10_800_000,
		recordCount: 96,
	},
	reports: {
		week: {
			durationMs: 43_200_000,
			recordCount: 96,
			uniqueTrackCount: 61,
			topArtist: '周报告歌手',
			topTrack: '周报告歌曲',
			buckets: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(
				(label, index) => ({
					label,
					durationMs: (index + 1) * 600_000,
					recordCount: index + 2,
				}),
			),
		},
		month: {
			durationMs: 122_400_000,
			recordCount: 288,
			uniqueTrackCount: 177,
			topArtist: '月报告歌手',
			topTrack: '月报告歌曲',
			buckets: [
				'8/1–8/7',
				'8/8–8/14',
				'8/15–8/21',
				'8/22–8/28',
				'8/29–8/31',
			].map((label, index) => ({
				label,
				durationMs: (index + 1) * 3_600_000,
				recordCount: (index + 1) * 10,
			})),
		},
		year: {
			durationMs: 1_209_600_000,
			recordCount: 2_024,
			uniqueTrackCount: 931,
			topArtist: '年报告歌手',
			topTrack: '年报告歌曲',
			buckets: Array.from({ length: 12 }, (_, index) => ({
				label: `${index + 1}月`,
				durationMs: (index + 1) * 7_200_000,
				recordCount: (index + 1) * 20,
			})),
		},
	},
	lifetime: {
		listenCount: 12_345,
		estimatedDurationMs: 95_400_000,
		sampleDurationMs: 15_600_000,
		basis: 'recent-median',
	},
	weeklyHighlight: {
		title: '本周代表歌曲',
		artists: ['代表歌手'],
		album: '代表专辑',
		albumArtUrl: null,
		songUrl: 'https://music.163.com/song?id=12345',
		durationMs: 240_000,
	},
};

describe('ListeningFootprint', () => {
	it('renders the four requested footprint modules with honest data labels', () => {
		render(<ListeningFootprint footprint={validFootprint} />);

		expect(
			screen.getByRole('heading', { name: '听歌足迹' }),
		).toBeInTheDocument();
		expect(screen.getByText('今日聆听')).toBeInTheDocument();
		expect(screen.getByText('总聆听时长')).toBeInTheDocument();
		expect(screen.getByText('本周 / 周一')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: '周/月/年聆听报告' }),
		).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: '周' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		expect(screen.getByText('估算')).toBeInTheDocument();
		expect(screen.getByText(/最近 100 条记录/)).toBeInTheDocument();
		expect(
			screen.getByRole('img', { name: /今日 12 个时段/ }),
		).toBeInTheDocument();
	});

	it('switches literal report buckets and summaries between week, month, and year', () => {
		render(<ListeningFootprint footprint={validFootprint} />);

		const weekPanel = screen.getByRole('tabpanel', { name: '周' });
		expect(within(weekPanel).getByText('本周报告')).toBeInTheDocument();
		expect(within(weekPanel).getByText('周一')).toBeInTheDocument();
		expect(within(weekPanel).getByText('周报告歌手')).toBeInTheDocument();
		expect(within(weekPanel).getByText('周报告歌曲')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('tab', { name: '月' }));
		const monthPanel = screen.getByRole('tabpanel', { name: '月' });
		expect(within(monthPanel).getByText('本月报告')).toBeInTheDocument();
		expect(within(monthPanel).getByText('8/29–8/31')).toBeInTheDocument();
		expect(within(monthPanel).getByText('月报告歌手')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: '月' })).toHaveAttribute(
			'aria-selected',
			'true',
		);

		fireEvent.click(screen.getByRole('tab', { name: '年' }));
		const yearPanel = screen.getByRole('tabpanel', { name: '年' });
		expect(within(yearPanel).getByText('本年报告')).toBeInTheDocument();
		expect(within(yearPanel).getByText('12月')).toBeInTheDocument();
		expect(within(yearPanel).getByText('年报告歌手')).toBeInTheDocument();
		expect(within(yearPanel).getByText('年报告歌曲')).toBeInTheDocument();
	});

	it('distinguishes unavailable exact values from honest zero values', () => {
		const footprint: NeteaseListeningFootprint = {
			...validFootprint,
			today: { ...validFootprint.today, durationMs: null },
			week: {
				...validFootprint.week,
				durationMs: 0,
				mondayDurationMs: null,
			},
		};

		render(<ListeningFootprint footprint={footprint} />);

		expect(
			within(screen.getByLabelText('今日聆听统计')).getByText('—'),
		).toBeInTheDocument();
		const comparison = screen.getByRole('group', {
			name: '本周与周一聆听时长对比',
		});
		expect(within(comparison).getByText('0 分钟')).toBeInTheDocument();
		expect(within(comparison).getByText('—')).toBeInTheDocument();
	});

	it('uses truthful geometry for zero, unavailable, and positive chart buckets', () => {
		const geometryFootprint: NeteaseListeningFootprint = {
			...validFootprint,
			today: {
				...validFootprint.today,
				buckets: validFootprint.today.buckets.map((bucket, index) => ({
					...bucket,
					durationMs: index === 1 ? null : index === 2 ? 600_000 : 0,
				})),
			},
			reports: {
				...validFootprint.reports,
				week: {
					...validFootprint.reports.week,
					buckets: validFootprint.reports.week.buckets.map((bucket, index) => ({
						...bucket,
						durationMs: index === 1 ? null : index === 2 ? 600_000 : 0,
					})),
				},
			},
		};

		render(<ListeningFootprint footprint={geometryFootprint} />);

		const todayZero = screen.getByTitle('00:00：0 分钟，0 条记录');
		expect(todayZero).toHaveAttribute('data-geometry', 'quantitative-bar');
		expect(todayZero).toHaveStyle({ height: '0%' });

		const todayUnavailable = screen.getByTitle('02:00：时长不可用，1 条记录');
		expect(todayUnavailable).toHaveAttribute(
			'data-geometry',
			'unavailable-marker',
		);
		expect(todayUnavailable).not.toHaveStyle({ height: '8%' });

		const todayPositive = screen.getByTitle('04:00：10 分钟，2 条记录');
		expect(todayPositive).toHaveAttribute('data-geometry', 'quantitative-bar');
		expect(todayPositive).toHaveStyle({ height: '100%' });

		const weekPanel = screen.getByRole('tabpanel', { name: '周' });
		const reportZero = within(weekPanel).getByTitle('周一：0 分钟，2 条记录');
		expect(reportZero).toHaveStyle({ height: '0%' });
		const reportUnavailable = within(weekPanel).getByTitle(
			'周二：时长不可用，3 条记录',
		);
		expect(reportUnavailable).toHaveAttribute(
			'data-geometry',
			'unavailable-marker',
		);
		const reportPositive = within(weekPanel).getByTitle(
			'周三：10 分钟，4 条记录',
		);
		expect(reportPositive).toHaveStyle({ height: '100%' });
	});

	it('formats durations beyond 24 hours without wrapping them into a clock', () => {
		render(<ListeningFootprint footprint={validFootprint} />);

		expect(
			within(screen.getByLabelText('总聆听时长统计')).getByText(
				'26 小时 30 分钟',
			),
		).toBeInTheDocument();
		expect(screen.queryByText('2 小时 30 分钟')).not.toBeInTheDocument();
	});

	it('explains partial coverage and a missing weekly highlight', () => {
		render(
			<ListeningFootprint
				footprint={{
					...validFootprint,
					state: 'partial',
					coverage: {
						...validFootprint.coverage,
						recordCount: 63,
						truncated: false,
					},
					weeklyHighlight: null,
				}}
			/>,
		);

		expect(screen.getByText(/部分数据可用/)).toBeInTheDocument();
		expect(
			screen.getByText(/最近 100 条记录接口返回 63 条/),
		).toBeInTheDocument();
		expect(screen.getByText(/本周代表曲目暂不可用/)).toBeInTheDocument();
	});

	it('renders the real unavailable fallback without claiming a zero-record limit', () => {
		render(<ListeningFootprint footprint={unavailableMusicFootprint} />);

		expect(screen.getByText(/听歌记录暂不可用/)).toBeInTheDocument();
		expect(
			screen.getByText(/近期记录覆盖范围暂时无法确认/),
		).toBeInTheDocument();
		expect(screen.queryByText(/最近 0 条记录/)).not.toBeInTheDocument();
	});

	it('keeps every tab control target mounted with only the selected panel exposed', () => {
		render(<ListeningFootprint footprint={validFootprint} />);

		const assertRelationships = (selectedName: string) => {
			for (const tab of screen.getAllByRole('tab')) {
				const targetId = tab.getAttribute('aria-controls');
				expect(targetId).toBeTruthy();
				const panel = document.getElementById(targetId ?? '');
				expect(panel).toBeInTheDocument();
				const selected = tab.textContent === selectedName;
				expect(tab).toHaveAttribute('aria-selected', String(selected));
				if (selected) expect(panel).not.toHaveAttribute('hidden');
				else expect(panel).toHaveAttribute('hidden');
			}
		};

		assertRelationships('周');
		fireEvent.click(screen.getByRole('tab', { name: '年' }));
		assertRelationships('年');
		expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
		expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
	});

	it('keeps small coverage and source metadata at readable neutral contrast', () => {
		render(<ListeningFootprint footprint={validFootprint} />);

		const coverage = screen.getByText(/最近 100 条记录已取满/).parentElement;
		expect(coverage).toHaveClass('text-neutral-300');
		const sourceFooter = screen.getByText(/时区：Asia\/Shanghai/);
		expect(sourceFooter).toHaveClass('text-neutral-400');
		expect(sourceFooter).not.toHaveClass(
			'text-neutral-500',
			'text-neutral-600',
		);
	});

	it('uses semantic loading and native, focusable tab controls', () => {
		const { rerender } = render(<ListeningFootprint />);
		const loading = screen.getByRole('status', { name: '正在加载听歌足迹' });
		expect(loading).toHaveAttribute('aria-busy', 'true');

		rerender(<ListeningFootprint footprint={validFootprint} />);
		const tabs = screen.getAllByRole('tab');
		expect(tabs).toHaveLength(3);
		for (const tab of tabs) expect(tab.tagName).toBe('BUTTON');
		tabs[1].focus();
		expect(tabs[1]).toHaveFocus();
		expect(tabs[1]).toHaveClass('focus-visible:ring-2');

		fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
		expect(screen.getByRole('tab', { name: '月' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		expect(screen.getByRole('tab', { name: '月' })).toHaveFocus();
		expect(screen.getByRole('tabpanel', { name: '月' })).toBeInTheDocument();
	});
});
