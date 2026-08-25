import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountCopyButton from './account-copy-button';

const setClipboard = (writeText: ReturnType<typeof vi.fn>) => {
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText },
	});
};

describe('AccountCopyButton', () => {
	beforeEach(() => {
		setClipboard(vi.fn().mockResolvedValue(undefined));
	});

	it('copies the public identifier and announces success', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		setClipboard(writeText);
		render(<AccountCopyButton label='Battle.net' value='小朱诺诺的#5394' />);

		fireEvent.click(screen.getByRole('button', { name: '复制 Battle.net' }));

		await waitFor(() =>
			expect(writeText).toHaveBeenCalledWith('小朱诺诺的#5394'),
		);
		expect(screen.getByRole('status')).toHaveTextContent('已复制');
		expect(screen.getByRole('button', { name: '复制 Battle.net' })).toHaveClass(
			'text-primary-600',
			'dark:text-primary-400',
		);
	});

	it('renders the account as a flat row instead of a nested card', () => {
		render(<AccountCopyButton label='Battle.net' value='小朱诺诺的#5394' />);

		const row = screen.getByRole('button', {
			name: '复制 Battle.net',
		}).parentElement;
		expect(row).not.toHaveClass('rounded-xl', 'border');
	});

	it('keeps the value visible and announces copy failure', async () => {
		setClipboard(vi.fn().mockRejectedValue(new Error('denied')));
		render(<AccountCopyButton label='小黑盒' value='29362113' />);

		fireEvent.click(screen.getByRole('button', { name: '复制 小黑盒' }));

		await waitFor(() =>
			expect(screen.getByRole('status')).toHaveTextContent(
				'复制失败，请手动选择账号',
			),
		);
		expect(screen.getByText('29362113')).toBeInTheDocument();
	});
});
