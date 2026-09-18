import { Fragment } from 'react';
import { client } from '../../tina/__generated__/client';
import Header from '../components/header';
import { TinaPost } from '../components/tina-post';
import UsesTitle from './uses-title';

export const metadata = {
	title: 'Uses',
	description: 'What I use',
};

export default async function Page() {
	const tina = await client.queries.uses({ relativePath: 'content.mdx' });

	return (
		<Fragment>
			<Header title='Uses' />
			<UsesTitle />
			<TinaPost dataKey='uses' {...tina} />
		</Fragment>
	);
}
