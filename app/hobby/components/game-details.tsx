import { gameAccounts, gameGroups } from '../content';
import AccountCopyButton from './account-copy-button';

export default function GameDetails() {
	return (
		<div className='space-y-8'>
			<div className='grid gap-4 md:grid-cols-3'>
				{gameGroups.map((group) => (
					<section key={group.label}>
						<h3 className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
							{group.label}
						</h3>
						<ul className='mt-3 flex flex-wrap gap-2'>
							{group.games.map((game) => (
								<li
									key={game}
									className='rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800'
								>
									{game}
								</li>
							))}
						</ul>
					</section>
				))}
			</div>

			<section>
				<h3 className='text-lg font-semibold'>Game Accounts</h3>
				<div className='mt-4 grid gap-3 md:grid-cols-3'>
					{gameAccounts.map((account) =>
						account.kind === 'link' ? (
							<a
								key={account.platform}
								href={account.url}
								target='_blank'
								rel='noopener noreferrer'
								className='rounded-xl border border-gray-200 p-4 outline-none hover:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700'
							>
								<span className='font-semibold'>{account.platform}</span>
								<span className='mt-1 block break-all text-sm text-gray-600 dark:text-gray-300'>
									{account.value} ↗
								</span>
							</a>
						) : (
							<AccountCopyButton
								key={account.platform}
								label={account.platform}
								value={account.value}
							/>
						),
					)}
				</div>
			</section>
		</div>
	);
}
