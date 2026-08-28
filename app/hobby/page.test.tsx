import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/header', () => ({ default: () => null }));
vi.mock('./components/hobby-grid', () => ({ default: () => null }));

import { metadata } from './page';

describe('Hobby page metadata', () => {
	it('describes only the three retained interests', () => {
		expect(metadata.description).toBe('Golden 的游戏、动漫与音乐兴趣。');
	});
});
