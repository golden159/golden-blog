import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			app: path.resolve(rootDir, 'app'),
			'server-only': path.resolve(rootDir, 'tests/server-only.ts'),
		},
	},
	test: {
		clearMocks: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
	},
});
