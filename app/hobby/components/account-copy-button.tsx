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
		<div className='rounded-xl border border-gray-200 p-4 dark:border-gray-700'>
			<p className='text-sm font-semibold'>{label}</p>
			<p className='mt-1 break-all text-sm text-gray-600 dark:text-gray-300'>
				{value}
			</p>
			<button
				type='button'
				onClick={copy}
				aria-label={`复制 ${label}`}
				className='mt-3 rounded-full border border-primary-500 px-3 py-1 text-xs text-primary-500 outline-none hover:bg-primary-500 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black'
			>
				复制
			</button>
			{/* biome-ignore lint/a11y/useSemanticElements: status is required for live announcements */}
			<span role='status' aria-live='polite' className='ml-3 text-xs'>
				{status === 'copied' && 'Copied'}
				{status === 'failed' && 'Copy failed'}
			</span>
		</div>
	);
}
