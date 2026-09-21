'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import type { BundledLanguage, ThemedToken } from 'shiki';
import { TinaMarkdown, type TinaMarkdownContent } from 'tinacms/dist/rich-text';

type NestedContent =
	| TinaMarkdownContent
	| TinaMarkdownContent[]
	| null
	| undefined;

const linkClassName =
	'text-gray-900 dark:text-gray-100 no-underline cursor-pointer bg-no-repeat bg-linear-to-r from-primary-500 to-primary-500 [background-position:0_100%] [background-size:100%_0.2em] hover:[background-size:100%_100%] hover:text-white focus:[background-size:100%_100%] motion-safe:transition-[background-size,color] motion-safe:duration-300 dark:from-primary-500 dark:to-primary-500';

export function TinaLink({
	url,
	children,
}: {
	url: string;
	children: ReactNode;
}) {
	if (url.startsWith('/')) {
		return (
			<Link href={url} className={linkClassName}>
				{children}
			</Link>
		);
	}

	return (
		<a
			href={url}
			target='_blank'
			rel='noopener noreferrer'
			className={linkClassName}
		>
			{children}
		</a>
	);
}

export function TinaCodeBlock(props?: { lang?: string; value: string }) {
	const lang = props?.lang;
	const value = props?.value ?? '';
	const [lines, setLines] = useState<ThemedToken[][]>();

	useEffect(() => {
		let on = true;
		import('shiki')
			.then(({ codeToTokens }) =>
				codeToTokens(value, {
					lang: (lang || 'text') as BundledLanguage,
					theme: 'dracula',
				}),
			)
			.then((out) => {
				if (on) setLines(out.tokens);
			})
			.catch(() => {});
		return () => {
			on = false;
		};
	}, [lang, value]);

	return (
		<pre className='bg-gray-800 p-4 rounded-md overflow-x-auto text-sm'>
			<code>
				{(lines ?? [[{ content: value, offset: 0, color: '#50fa7b' }]]).map(
					(line, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static highlight output
						<span key={i}>
							{line.map((token, j) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static highlight output
								<span key={j} style={{ color: token.color }}>
									{token.content}
								</span>
							))}
							{'\n'}
						</span>
					),
				)}
			</code>
		</pre>
	);
}

function NestedMarkdown({ content }: { content: NestedContent }) {
	return (
		<TinaMarkdown
			content={content}
			components={
				{
					...tinaMdxComponents,
					a: TinaLink,
					code_block: TinaCodeBlock,
				} as never
			}
		/>
	);
}

type CalloutProps = {
	title?: string;
	kind?: 'info' | 'tip' | 'warning' | 'danger';
	children?: NestedContent;
};

export function Callout({ title, kind = 'info', children }: CalloutProps) {
	const styles = {
		info: 'border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/30',
		tip: 'border-emerald-400/60 bg-emerald-50/70 dark:bg-emerald-950/30',
		warning: 'border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/30',
		danger: 'border-red-400/60 bg-red-50/70 dark:bg-red-950/30',
	};

	return (
		<aside className={`my-6 rounded-lg border-l-4 px-5 py-4 ${styles[kind]}`}>
			{title ? (
				<strong className='mb-2 block text-gray-900 dark:text-gray-100'>
					{title}
				</strong>
			) : null}
			<div className='text-gray-800 dark:text-gray-200 [&>p:first-child]:pt-0 [&>p:last-child]:pb-0'>
				<NestedMarkdown content={children} />
			</div>
		</aside>
	);
}

export function Steps({ children }: { children?: NestedContent }) {
	return (
		<div className='my-6 space-y-6 border-l-2 border-primary-500/40 pl-6'>
			<NestedMarkdown content={children} />
		</div>
	);
}

export function Step({
	title,
	children,
}: {
	title?: string;
	children?: NestedContent;
}) {
	return (
		<section className='relative'>
			<span className='absolute -left-[2.05rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white'>
				✓
			</span>
			{title ? (
				<h3 className='pb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
					{title}
				</h3>
			) : null}
			<NestedMarkdown content={children} />
		</section>
	);
}

export function LinkCard({
	title,
	description,
	url,
	newTab,
}: {
	title?: string;
	description?: string;
	url?: string;
	newTab?: boolean;
}) {
	const content = (
		<span className='block rounded-lg border border-gray-200 p-4 transition hover:border-primary-500 hover:bg-primary-50/50 dark:border-gray-700 dark:hover:bg-primary-950/20'>
			<strong className='block text-gray-900 dark:text-gray-100'>
				{title || url}
			</strong>
			{description ? (
				<span className='mt-1 block text-sm text-gray-600 dark:text-gray-400'>
					{description}
				</span>
			) : null}
		</span>
	);

	if (!url) return content;
	if (newTab || !url.startsWith('/')) {
		return (
			<a href={url} target='_blank' rel='noopener noreferrer'>
				{content}
			</a>
		);
	}
	return <Link href={url}>{content}</Link>;
}

export function Badge({
	text,
	tone = 'primary',
}: {
	text?: string;
	tone?: 'primary' | 'neutral' | 'success' | 'warning';
}) {
	const styles = {
		primary: 'bg-primary-500/15 text-primary-700 dark:text-primary-300',
		neutral: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
		success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
		warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
	};

	return (
		<span
			className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[tone]}`}
		>
			{text}
		</span>
	);
}

export const tinaMdxComponents = {
	Callout,
	Steps,
	Step,
	LinkCard,
	Badge,
};
