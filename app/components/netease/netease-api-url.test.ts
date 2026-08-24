// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildNeteaseApiUrl, parseNeteaseApiBaseUrl } from './netease-api-url';

describe('Netease API URLs', () => {
	it('preserves an API base path prefix', () => {
		const base = parseNeteaseApiBaseUrl(
			'https://example.com/netease-api',
			'production',
		);

		expect(buildNeteaseApiUrl(base as URL, '/user/detail').toString()).toBe(
			'https://example.com/netease-api/user/detail',
		);
	});

	it.each([
		['a malformed URL', 'not a URL', 'production'],
		['credentials', 'https://user:pass@example.com', 'production'],
		['a query string', 'https://example.com/api?key=value', 'production'],
		['a hash', 'https://example.com/api#fragment', 'production'],
		['an empty query delimiter', 'https://example.com/api?', 'production'],
		['an empty hash delimiter', 'https://example.com/api#', 'production'],
		['production loopback HTTP', 'http://localhost:3000', 'production'],
		[
			'development non-loopback HTTP',
			'http://netease.internal.example',
			'development',
		],
	])('rejects %s', (_case, rawBaseUrl, nodeEnv) => {
		expect(parseNeteaseApiBaseUrl(rawBaseUrl, nodeEnv)).toBeNull();
	});

	it.each([
		'http://localhost:3000/netease-api',
		'http://127.0.0.1:3000/netease-api',
		'http://[::1]:3000/netease-api',
	])('allows development loopback HTTP at %s', (rawBaseUrl) => {
		const base = parseNeteaseApiBaseUrl(rawBaseUrl, 'development');

		expect(base?.toString()).toBe(`${rawBaseUrl}/`);
	});
});
