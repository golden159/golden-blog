import type {
	SteamActivityResponse,
	SteamLibraryResponse,
} from 'app/components/steam/types';
import { gameAccounts } from '../content';
import AccountCopyButton from './account-copy-button';
import SteamDetails from './steam-details';
import SteamLibraryBubbles from './steam-library-bubbles';

type GameDetailsProps = {
	steamActivity?: SteamActivityResponse;
	steamLibrary?: SteamLibraryResponse;
};

export default function GameDetails({
	steamActivity,
	steamLibrary,
}: GameDetailsProps) {
	const expandedAccounts = gameAccounts.filter(
		(account) => account.platform !== 'Steam',
	);

	return (
		<div className='space-y-7'>
			<SteamDetails activity={steamActivity} fetchWhenMissing={false} />
			<SteamLibraryBubbles library={steamLibrary} />

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
