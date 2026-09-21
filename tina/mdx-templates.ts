import type { RichTextTemplate } from '@tinacms/schema-tools';

/**
 * Components inspired by the MDX surfaces in Fumadocs and Nextra.
 *
 * `children` is intentional here: Tina uses that field to represent the
 * nested content between an MDX component's opening and closing tags.
 */
export const mdxTemplates: RichTextTemplate[] = [
	{
		name: 'Callout',
		label: 'Callout',
		fields: [
			{
				name: 'title',
				label: 'Title',
				type: 'string',
			},
			{
				name: 'kind',
				label: 'Kind',
				type: 'string',
				options: ['info', 'tip', 'warning', 'danger'],
			},
			{
				name: 'children',
				label: 'Content',
				type: 'rich-text',
			},
		],
	},
	{
		name: 'Steps',
		label: 'Steps',
		fields: [
			{
				name: 'children',
				label: 'Steps',
				type: 'rich-text',
			},
		],
	},
	{
		name: 'Step',
		label: 'Step',
		fields: [
			{
				name: 'title',
				label: 'Title',
				type: 'string',
			},
			{
				name: 'children',
				label: 'Content',
				type: 'rich-text',
			},
		],
	},
	{
		name: 'LinkCard',
		label: 'Link Card',
		fields: [
			{
				name: 'title',
				label: 'Title',
				type: 'string',
			},
			{
				name: 'description',
				label: 'Description',
				type: 'string',
				ui: { component: 'textarea' },
			},
			{
				name: 'url',
				label: 'URL',
				type: 'string',
			},
			{
				name: 'newTab',
				label: 'Open in new tab',
				type: 'boolean',
			},
		],
	},
	{
		name: 'Badge',
		label: 'Badge',
		inline: true,
		fields: [
			{
				name: 'text',
				label: 'Text',
				type: 'string',
			},
			{
				name: 'tone',
				label: 'Tone',
				type: 'string',
				options: ['primary', 'neutral', 'success', 'warning'],
			},
		],
	},
];
