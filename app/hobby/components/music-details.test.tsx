import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicDetails from './music-details';

const renderMusic = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MusicDetails />
		</SWRConfig>,
	);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('MusicDetails', () => {
	it('renders normalized recent activity and the profile link', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						state: 'recent',
						track: {
							title: '夜に駆ける',
							artists: ['YOASOBI'],
							album: 'THE BOOK',
							albumArtUrl: null,
							songUrl: 'https://music.163.com/song?id=12345',
							playedAt: 1_800_000_000_000,
						},
					}),
					{ status: 200 },
				),
			),
		);

		renderMusic();

		await waitFor(() =>
			expect(screen.getByText('夜に駆ける')).toBeInTheDocument(),
		);
		expect(screen.getByText('Recently active · 最近活跃')).toBeInTheDocument();
		expect(screen.getByText(/记录时间：/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /网易云主页/ })).toHaveAttribute(
			'href',
			'https://y.music.163.com/m/user?id=3719820729',
		);
	});

	it('keeps genres and the profile link when activity is unavailable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ state: 'unavailable', track: null }), {
					status: 200,
				}),
			),
		);

		renderMusic();

		await waitFor(() =>
			expect(
				screen.getByText('Unavailable · 暂时无法获取'),
			).toBeInTheDocument(),
		);
		for (const genre of ['日语', 'ACG', '流行', '说唱', '粤语', '民谣']) {
			expect(screen.getByText(genre)).toBeInTheDocument();
		}
	});
});
