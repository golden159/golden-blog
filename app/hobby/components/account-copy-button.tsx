'use client';

import { useEffect, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'failed';

type AccountCopyButtonProps = {
	label: string;
	value: string;
};

export default function AccountCopyButton({
	label,
	value,
}: AccountCopyButtonProps) {
	const [status, setStatus] = useState<CopyStatus>('idle');

	useEffect(() => {
		if (status === 'idle') {
			return;
		}

		const timeout = window.setTimeout(() => setStatus('idle'), 2000);
		return () => window.clearTimeout(timeout);
	}, [status]);

	const copy = async () => {
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error('Clipboard unavailable');
			}
			await navigator.clipboard.writeText(value);
			setStatus('copied');
		} catch {
			setStatus('failed');
		}
	};

	return (
		<div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700'>
			<div className='min-w-0'>
				<p className='text-sm font-semibold'>{label}</p>
				<p className='mt-1 break-all text-sm text-gray-600 dark:text-gray-300'>
					{value}
				</p>
			</div>
			<button
				type='button'
				onClick={copy}
				aria-label={`复制 ${label}`}
				className='text-xs font-semibold text-primary-600 underline decoration-primary-400 underline-offset-4 outline-none hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-400 dark:focus-visible:ring-offset-black'
			>
				复制
			</button>
			{/* biome-ignore lint/a11y/useSemanticElements: status is required for live announcements */}
			<span role='status' aria-live='polite' className='col-span-2 text-xs'>
				{status === 'copied' && '已复制'}
				{status === 'failed' && '复制失败，请手动选择账号'}
			</span>
		</div>
	);
}
