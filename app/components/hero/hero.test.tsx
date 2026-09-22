import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Hero from './hero';

vi.mock('../splash-cursor', () => ({
	default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../fonts', () => ({
	merryWeather: { className: 'merriweather' },
}));

describe('Hero', () => {
	it('renders the selected English and Chinese rolling phrases', () => {
		render(<Hero />);

		expect(screen.getByText('playground')).toBeInTheDocument();
		expect(screen.getByText('人工智能')).toBeInTheDocument();
		expect(screen.getByRole('heading')).toHaveTextContent(/playground\/$/);
		expect(screen.getByText(/我是许泽升/)).toHaveTextContent(
			/专注于 人工智能\/$/,
		);
		expect(screen.getByText('人工智能')).toHaveClass('italic');
		expect(
			screen.getByRole('heading').querySelector('.border-b-2'),
		).toBeInTheDocument();
		expect(screen.queryByText(/on the web/)).not.toBeInTheDocument();
		expect(
			screen.queryByText(/我将光学系统、数学模型与深度学习结合/),
		).not.toBeInTheDocument();
	});
});
