import { gameAccounts, gameGroups } from '../content';
import AccountCopyButton from './account-copy-button';

export default function GameDetails() {
	const expandedAccounts = gameAccounts.filter(
		(account) => account.platform !== 'Steam',
	);

	return (
		<div className='space-y-7'>
			<div className='grid gap-x-8 gap-y-5 md:grid-cols-3'>
				{gameGroups.map((group) => (
					<section key={group.label}>
						<h3 className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
							{group.label}
						</h3>
						<ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1'>
							{group.games.map((game) => (
								<li
									key={game}
									className='text-sm text-gray-600 dark:text-gray-300'
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
				<div className='mt-2 grid gap-x-8 md:grid-cols-2'>
					{expandedAccounts.map((account) => (
						<AccountCopyButton
							key={account.platform}
							label={account.platform}
							value={account.value}
						/>
					))}
				</div>
			</section>
		</div>
	);
}
