'use client';

import type { ComponentProps } from 'react';
import { useTina } from 'tinacms/dist/react';
import { TinaMarkdown, type TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { components } from './mdx';
import { TinaCodeBlock, TinaLink, tinaMdxComponents } from './tina-mdx';

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
					...tinaMdxComponents,
					a: TinaLink,
					code_block: TinaCodeBlock,
				} as unknown as ComponentProps<typeof TinaMarkdown>['components']
			}
		/>
	);
}
