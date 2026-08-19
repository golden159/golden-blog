import { describe, expect, it } from 'vitest';
import { staticRoutes } from './sitemap';

describe('staticRoutes', () => {
	it('includes the hobby route', () => {
		expect(staticRoutes).toContain('hobby');
	});
});
