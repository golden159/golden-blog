import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TypingText from './typing-text';

describe('TypingText', () => {
	it('renders the first phrase immediately', () => {
		render(<TypingText words={['playground', 'AI lab']} />);

		expect(screen.getByText('playground')).toBeInTheDocument();
		expect(screen.getByText('/')).toBeInTheDocument();
	});

	it('starts deleting after holding the phrase', async () => {
		vi.useFakeTimers();
		try {
			render(<TypingText words={['playground', 'AI lab']} />);

			await act(async () => vi.advanceTimersByTimeAsync(1400));
			await act(async () => vi.advanceTimersByTimeAsync(45));

			expect(screen.getByText('playgroun')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});
});
