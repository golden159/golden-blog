import { defineConfig } from 'tinacms';

// Your hosting provider likely exposes this as an environment variable
const branch =
	process.env.GITHUB_BRANCH ||
	process.env.VERCEL_GIT_COMMIT_REF ||
	process.env.HEAD ||
	'main';

export default defineConfig({
	branch,

	// Get this from tina.io
	clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
	// Get this from tina.io
	token: process.env.TINA_TOKEN,

	build: {
		outputFolder: 'admin',
		publicFolder: 'public',
	},
	// Uncomment to allow cross-origin requests from non-localhost origins
	// during local development (e.g. GitHub Codespaces, Gitpod, Docker).
	// Use 'private' to allow all private-network IPs (WSL2, Docker, etc.)
	// server: {
	//   allowedOrigins: ['https://your-codespace.github.dev'],
	// },
	media: {
		tina: {
			mediaRoot: '',
			publicFolder: 'public',
		},
	},
	// See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/r/content-modelling-collections/
	schema: {
		collections: [
			{
				name: 'thoughts',
				label: 'Thoughts',
				path: 'app/thoughts/posts',
				format: 'mdx',
				fields: [
					{
						type: 'string',
						name: 'title',
						label: 'Title',
						isTitle: true,
						required: true,
					},
					{
						type: 'string',
						name: 'publishedAt',
						label: 'Published At',
						required: true,
						ui: { dateFormat: 'YYYY-MM-DD' },
					},
					{
						type: 'string',
						name: 'summary',
						label: 'Summary',
						ui: { component: 'textarea' },
					},
					{
						type: 'string',
						name: 'tags',
						label: 'Tags',
						list: true,
					},
					{
						type: 'string',
						name: 'image',
						label: 'Image',
					},
					{
						type: 'boolean',
						name: 'draft',
						label: 'Draft',
					},
					{
						type: 'rich-text',
						name: 'body',
						label: 'Body',
						isBody: true,
					},
				],
				ui: {
					router: ({ document }) => `/thoughts/${document._sys.filename}`,
				},
			},
			{
				name: 'projects',
				label: 'Projects',
				path: 'app/projects/posts',
				format: 'mdx',
				fields: [
					{
						type: 'string',
						name: 'title',
						label: 'Title',
						isTitle: true,
						required: true,
					},
					{
						type: 'string',
						name: 'date',
						label: 'Date',
						required: true,
						ui: { dateFormat: 'YYYY-MM-DD' },
					},
					{
						type: 'string',
						name: 'description',
						label: 'Description',
						ui: { component: 'textarea' },
					},
					{
						type: 'string',
						name: 'tags',
						label: 'Tags',
						list: true,
					},
					{
						type: 'boolean',
						name: 'draft',
						label: 'Draft',
					},
					{
						type: 'rich-text',
						name: 'body',
						label: 'Body',
						isBody: true,
					},
				],
				ui: {
					router: ({ document }) => `/projects/${document._sys.filename}`,
				},
			},
		],
	},
});
