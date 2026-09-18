'use client';

import { type ComponentProps, useEffect, useState } from 'react';
import type { BundledLanguage, ThemedToken } from 'shiki';
import { useTina } from 'tinacms/dist/react';
import { TinaMarkdown, type TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { components } from './mdx';

function CodeBlock(props?: { lang?: string; value: string }) {
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

export function TinaPost(props: {
	dataKey: 'thoughts' | 'projects' | 'uses';
	query: string;
	variables: object;
	data: object;
}) {
	const { data } = useTina(props);
	const body = (data as Record<string, { body?: TinaMarkdownContent }>)[
		props.dataKey
	]?.body;

	return (
		<TinaMarkdown
			content={body}
			components={
				{
					...components,
					code_block: CodeBlock,
				} as unknown as ComponentProps<typeof TinaMarkdown>['components']
			}
		/>
	);
}
