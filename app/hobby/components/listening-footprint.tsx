'use client';

import type {
	ListeningBucket,
	ListeningSlice,
	NeteaseListeningFootprint,
} from 'app/components/netease/footprint-types';
import { useState } from 'react';

type ReportPeriod = 'week' | 'month' | 'year';

type ListeningFootprintProps = {
	footprint?: NeteaseListeningFootprint;
};

const reportMeta: Record<
	ReportPeriod,
	{ tab: string; title: string; accent: string }
> = {
	week: {
		tab: '周',
		title: '本周报告',
		accent: 'from-primary-500 to-fuchsia-300',
	},
	month: {
		tab: '月',
		title: '本月报告',
		accent: 'from-violet-500 to-primary-400',
	},
	year: { tab: '年', title: '本年报告', accent: 'from-cyan-400 to-violet-500' },
};

const numberFormatter = new Intl.NumberFormat('zh-CN');

const formatDuration = (durationMs: number | null): string => {
	if (durationMs === null) return '—';
	if (durationMs === 0) return '0 分钟';

	const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes} 分钟`;
	return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
};

const formatCount = (count: number | null, suffix = '次'): string =>
	count === null ? '—' : `${numberFormatter.format(count)} ${suffix}`;

const bucketAriaLabel = (bucket: ListeningBucket): string =>
	`${bucket.label}：${formatDuration(bucket.durationMs)}，${formatCount(bucket.recordCount, '条记录')}`;

const getBarHeight = (value: number | null, maximum: number): string => {
	if (value === null || maximum === 0) return '8%';
	return `${Math.max(8, Math.round((value / maximum) * 100))}%`;
};

function LoadingFootprint() {
	return (
		<output
			aria-label='正在加载听歌足迹'
			aria-busy='true'
			className='mt-6 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-5 text-white md:p-7'
		>
			<span className='sr-only'>正在加载听歌足迹</span>
			<span aria-hidden='true' className='block motion-safe:animate-pulse'>
				<span className='block h-3 w-24 rounded-full bg-white/15' />
				<span className='mt-4 block h-8 w-48 rounded-xl bg-white/10' />
				<span className='mt-6 grid gap-3 sm:grid-cols-2'>
					<span className='block h-52 rounded-2xl bg-white/8' />
					<span className='block h-52 rounded-2xl bg-white/8' />
				</span>
			</span>
		</output>
	);
}

function CoverageNote({ footprint }: { footprint: NeteaseListeningFootprint }) {
	const { coverage, state } = footprint;
	const limitLabel = `最近 ${coverage.limit} 条记录`;
	let detail: string;

	if (!coverage.recentAvailable || coverage.recordCount === null) {
		detail = `${limitLabel}暂时无法读取。`;
	} else if (coverage.truncated) {
		detail = `${limitLabel}已取满 ${coverage.recordCount} 条；统计受接口上限限制。`;
	} else {
		detail = `${limitLabel}接口返回 ${coverage.recordCount} 条；当前统计覆盖这些可用记录。`;
	}

	const stateCopy =
		state === 'unavailable'
			? '听歌记录暂不可用，未取得的精确值以 — 显示。'
			: state === 'partial'
				? '部分数据可用，未取得的精确值以 — 显示。'
				: '数据已同步；统计范围仍受网易云接口覆盖限制。';

	return (
		<div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-neutral-300'>
			<p className='font-semibold text-white'>{stateCopy}</p>
			<p className='mt-1'>{detail}</p>
		</div>
	);
}

function TodayCard({ footprint }: { footprint: NeteaseListeningFootprint }) {
	const maximum = Math.max(
		0,
		...footprint.today.buckets.map((bucket) => bucket.durationMs ?? 0),
	);
	const timelineLabel = `今日 12 个时段：${footprint.today.buckets
		.map(bucketAriaLabel)
		.join('；')}`;

	return (
		<article
			aria-label='今日聆听统计'
			className='relative min-h-80 overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-5 sm:p-6 lg:col-span-7'
		>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-primary-500/20 blur-3xl'
			/>
			<div className='relative flex items-start justify-between gap-4'>
				<div>
					<p className='text-xs font-bold tracking-[0.24em] text-primary-300'>
						TODAY SIGNAL
					</p>
					<h3 className='mt-2 text-xl font-semibold'>今日聆听</h3>
				</div>
				<p className='text-right text-xs leading-5 text-neutral-400'>
					{formatCount(footprint.today.recordCount, '条记录')}
					<br />
					{formatCount(footprint.today.uniqueTrackCount, '首不同歌曲')}
				</p>
			</div>
			<p className='relative mt-5 text-4xl font-black tracking-tight text-white tabular-nums sm:text-5xl'>
				{formatDuration(footprint.today.durationMs)}
			</p>

			<div
				role='img'
				aria-label={timelineLabel}
				className='relative mt-7 grid h-28 grid-cols-12 items-end gap-1.5 border-b border-white/15 sm:gap-2'
			>
				{footprint.today.buckets.map((bucket, index) => (
					<div
						key={`${bucket.label}-${index}`}
						className='flex h-full min-w-0 items-end'
					>
						<div
							aria-hidden='true'
							title={bucketAriaLabel(bucket)}
							className='w-full rounded-t-sm bg-linear-to-t from-primary-600 via-fuchsia-400 to-cyan-300 opacity-90 motion-safe:transition-[height] motion-safe:duration-500'
							style={{ height: getBarHeight(bucket.durationMs, maximum) }}
						/>
					</div>
				))}
			</div>
			<div
				aria-hidden='true'
				className='relative mt-2 grid grid-cols-12 gap-1 text-center text-[9px] text-neutral-500 sm:gap-2 sm:text-[10px]'
			>
				{footprint.today.buckets.map((bucket, index) => (
					<span key={`${bucket.label}-${index}`} className='truncate'>
						{bucket.label.replace(':00', '')}
					</span>
				))}
			</div>
		</article>
	);
}

function LifetimeCard({ footprint }: { footprint: NeteaseListeningFootprint }) {
	const { lifetime } = footprint;
	const basisCopy =
		lifetime.basis === 'recent-median'
			? `依据最近可用记录的单曲时长中位数 ${formatDuration(lifetime.sampleDurationMs)}，乘以累计听歌次数估算。`
			: lifetime.basis === 'weekly-median'
				? `近期记录不可用，依据本周歌曲的单曲时长中位数 ${formatDuration(lifetime.sampleDurationMs)}，乘以累计听歌次数估算。`
				: '缺少可用的单曲时长样本，暂时无法估算。';

	return (
		<article
			aria-label='总聆听时长统计'
			className='relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-5 sm:p-6 lg:col-span-5'
		>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute -right-14 -bottom-16 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl'
			/>
			<div className='relative flex items-center justify-between gap-3'>
				<h3 className='text-xl font-semibold'>总聆听时长</h3>
				<span className='rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-xs font-bold tracking-widest text-violet-200'>
					估算
				</span>
			</div>
			<div className='relative mt-5 grid place-items-center'>
				<div
					aria-hidden='true'
					className='h-48 w-48 rounded-full bg-[conic-gradient(from_215deg,#de1d8d,#8b5cf6,#22d3ee,#27272a_78%)] p-2 shadow-[0_0_48px_rgba(139,92,246,0.18)]'
				>
					<div className='h-full w-full rounded-full border border-white/10 bg-neutral-950' />
				</div>
				<div className='absolute max-w-40 text-center'>
					<p className='text-2xl font-black leading-tight tracking-tight tabular-nums'>
						{formatDuration(lifetime.estimatedDurationMs)}
					</p>
					<p className='mt-2 text-xs text-neutral-400'>
						累计 {formatCount(lifetime.listenCount)}
					</p>
				</div>
			</div>
			<p className='relative mt-5 text-xs leading-5 text-neutral-400'>
				{basisCopy}
			</p>
		</article>
	);
}

function WeekComparison({
	footprint,
}: {
	footprint: NeteaseListeningFootprint;
}) {
	const values = [footprint.week.durationMs, footprint.week.mondayDurationMs];
	const maximum = Math.max(0, ...values.map((value) => value ?? 0));
	const rows = [
		{
			label: '本周',
			value: footprint.week.durationMs,
			color: 'bg-primary-400',
		},
		{
			label: '周一',
			value: footprint.week.mondayDurationMs,
			color: 'bg-cyan-300',
		},
	];

	return (
		<article className='rounded-3xl border border-white/10 bg-white/6 p-5 sm:p-6 lg:col-span-5'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-xs font-bold tracking-[0.24em] text-cyan-300'>
						WEEK PULSE
					</p>
					<h3 className='mt-2 text-xl font-semibold'>本周 / 周一</h3>
				</div>
				<p className='text-xs text-neutral-400'>
					{formatCount(footprint.week.recordCount, '条记录')}
				</p>
			</div>
			<fieldset className='mt-8 space-y-6'>
				<legend className='sr-only'>本周与周一聆听时长对比</legend>
				{rows.map((row) => (
					<div key={row.label}>
						<div className='mb-2 flex items-baseline justify-between gap-4'>
							<span className='text-sm font-semibold text-neutral-200'>
								{row.label}
							</span>
							<span className='text-lg font-black tabular-nums'>
								{formatDuration(row.value)}
							</span>
						</div>
						<div className='h-3 overflow-hidden rounded-full border border-white/10 bg-neutral-900'>
							<div
								aria-hidden='true'
								className={`h-full rounded-full ${row.color} motion-safe:transition-[width] motion-safe:duration-500`}
								style={{ width: getBarHeight(row.value, maximum) }}
							/>
						</div>
					</div>
				))}
			</fieldset>
			<div className='mt-7 border-t border-white/10 pt-4'>
				{footprint.weeklyHighlight ? (
					<>
						<p className='text-[11px] font-bold tracking-[0.2em] text-neutral-500'>
							本周代表曲目
						</p>
						<a
							href={footprint.weeklyHighlight.songUrl}
							target='_blank'
							rel='noopener noreferrer'
							className='mt-2 block rounded-sm font-semibold text-white outline-none hover:text-primary-300 focus-visible:ring-2 focus-visible:ring-primary-400'
						>
							{footprint.weeklyHighlight.title} ·{' '}
							{footprint.weeklyHighlight.artists.join(', ')} ↗
						</a>
					</>
				) : (
					<p className='text-sm leading-6 text-neutral-400'>
						本周代表曲目暂不可用；时长与次数仍按当前可用数据展示。
					</p>
				)}
			</div>
		</article>
	);
}

function ReportChart({
	slice,
	accent,
}: {
	slice: ListeningSlice;
	accent: string;
}) {
	const maximum = Math.max(
		0,
		...slice.buckets.map((bucket) => bucket.durationMs ?? 0),
	);

	return (
		<ul
			aria-label='所选报告时段分布'
			className='grid h-48 items-end gap-2'
			style={{
				gridTemplateColumns: `repeat(${slice.buckets.length}, minmax(0, 1fr))`,
			}}
		>
			{slice.buckets.map((bucket, index) => (
				<li
					key={`${bucket.label}-${index}`}
					className='flex h-full min-w-0 flex-col justify-end text-center'
				>
					<span className='sr-only'>{bucketAriaLabel(bucket)}</span>
					<div className='flex min-h-0 flex-1 items-end justify-center'>
						<div
							aria-hidden='true'
							className={`w-full max-w-10 rounded-t-md bg-linear-to-t ${accent} opacity-90 motion-safe:transition-[height] motion-safe:duration-500`}
							style={{ height: getBarHeight(bucket.durationMs, maximum) }}
						/>
					</div>
					<span className='mt-2 truncate text-[10px] text-neutral-400 sm:text-xs'>
						{bucket.label}
					</span>
				</li>
			))}
		</ul>
	);
}

function ReportPanel({ footprint }: { footprint: NeteaseListeningFootprint }) {
	const [period, setPeriod] = useState<ReportPeriod>('week');
	const meta = reportMeta[period];
	const report = footprint.reports[period];

	const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const periods = Object.keys(reportMeta) as ReportPeriod[];
		const currentIndex = periods.indexOf(period);
		let nextIndex: number | null = null;
		if (event.key === 'ArrowRight')
			nextIndex = (currentIndex + 1) % periods.length;
		if (event.key === 'ArrowLeft')
			nextIndex = (currentIndex - 1 + periods.length) % periods.length;
		if (event.key === 'Home') nextIndex = 0;
		if (event.key === 'End') nextIndex = periods.length - 1;
		if (nextIndex === null) return;
		event.preventDefault();
		const nextPeriod = periods[nextIndex];
		setPeriod(nextPeriod);
		document.getElementById(`listening-report-tab-${nextPeriod}`)?.focus();
	};

	return (
		<article className='rounded-3xl border border-white/10 bg-white/6 p-5 sm:p-6 lg:col-span-7'>
			<div className='flex flex-wrap items-center justify-between gap-4'>
				<div>
					<p className='text-xs font-bold tracking-[0.24em] text-violet-300'>
						LISTENING REPORT
					</p>
					<h3 className='mt-2 text-xl font-semibold'>周/月/年聆听报告</h3>
				</div>
				<div
					role='tablist'
					aria-label='选择聆听报告周期'
					className='flex rounded-full border border-white/10 bg-neutral-950/80 p-1'
				>
					{(Object.keys(reportMeta) as ReportPeriod[]).map((candidate) => {
						const selected = candidate === period;
						return (
							<button
								key={candidate}
								id={`listening-report-tab-${candidate}`}
								type='button'
								role='tab'
								aria-selected={selected}
								aria-controls={`listening-report-panel-${candidate}`}
								tabIndex={selected ? 0 : -1}
								onClick={() => setPeriod(candidate)}
								onKeyDown={handleTabKey}
								className={`rounded-full px-4 py-2 text-sm font-bold outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${selected ? 'bg-white text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
							>
								{reportMeta[candidate].tab}
							</button>
						);
					})}
				</div>
			</div>

			<div
				id={`listening-report-panel-${period}`}
				role='tabpanel'
				aria-labelledby={`listening-report-tab-${period}`}
				className='mt-7'
			>
				<div className='flex flex-wrap items-baseline justify-between gap-3'>
					<p className='text-2xl font-black'>{meta.title}</p>
					<p className='text-2xl font-black tabular-nums text-white'>
						{formatDuration(report.durationMs)}
					</p>
				</div>
				<div className='mt-6 overflow-x-auto pb-1'>
					<div className={report.buckets.length > 7 ? 'min-w-xl' : 'min-w-0'}>
						<ReportChart slice={report} accent={meta.accent} />
					</div>
				</div>
				<dl className='mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-4'>
					<div>
						<dt className='text-xs text-neutral-500'>播放记录</dt>
						<dd className='mt-1 font-bold tabular-nums'>
							{formatCount(report.recordCount, '条')}
						</dd>
					</div>
					<div>
						<dt className='text-xs text-neutral-500'>不同歌曲</dt>
						<dd className='mt-1 font-bold tabular-nums'>
							{formatCount(report.uniqueTrackCount, '首')}
						</dd>
					</div>
					<div>
						<dt className='text-xs text-neutral-500'>最常听歌手</dt>
						<dd className='mt-1 truncate font-bold'>
							{report.topArtist ?? '—'}
						</dd>
					</div>
					<div>
						<dt className='text-xs text-neutral-500'>最常听歌曲</dt>
						<dd className='mt-1 truncate font-bold'>
							{report.topTrack ?? '—'}
						</dd>
					</div>
				</dl>
			</div>
		</article>
	);
}

export default function ListeningFootprint({
	footprint,
}: ListeningFootprintProps) {
	if (!footprint) return <LoadingFootprint />;

	return (
		<section
			aria-labelledby='listening-footprint-title'
			className='relative mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-4 text-white shadow-2xl shadow-primary-950/20 sm:p-5 md:p-7'
		>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(222,29,141,0.16),transparent_31%),radial-gradient(circle_at_88%_20%,rgba(34,211,238,0.12),transparent_27%),radial-gradient(circle_at_64%_80%,rgba(139,92,246,0.14),transparent_33%)]'
			/>
			<div className='relative'>
				<div className='mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)] md:items-end'>
					<div>
						<p className='text-xs font-bold tracking-[0.3em] text-primary-300'>
							LISTENING FOOTPRINT
						</p>
						<h2
							id='listening-footprint-title'
							className='mt-2 text-3xl font-black tracking-tight sm:text-4xl'
						>
							听歌足迹
						</h2>
						<p className='mt-2 max-w-xl text-sm leading-6 text-neutral-400'>
							把最近记录的节奏摊开来看；精确值、估算值和接口边界分别标注。
						</p>
					</div>
					<CoverageNote footprint={footprint} />
				</div>

				<div className='grid gap-4 lg:grid-cols-12'>
					<TodayCard footprint={footprint} />
					<LifetimeCard footprint={footprint} />
					<WeekComparison footprint={footprint} />
					<ReportPanel footprint={footprint} />
				</div>
				<p className='mt-5 text-right text-[11px] tracking-wide text-neutral-600'>
					时区：Asia/Shanghai · 足迹数据每 5 分钟重新验证
				</p>
			</div>
		</section>
	);
}
