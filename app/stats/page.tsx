import GithubContributions from '../components/github-contributions/github-contributions';
import Header from '../components/header';

export const metadata = {
	title: 'Stats',
	description: 'My Stats - Golden',
};

export default function StatsPage() {
	return (
		<div>
			<Header title='Stats' />
			<div className='space-y-2 md:space-y-5 mb-5'>
				<p className='text-lg leading-7 text-gray-500 dark:text-gray-400'>
					这里展示我在 GitHub 上的提交活动与连续贡献记录。
				</p>
			</div>

			<section className='space-y-3'>
				<GithubContributions />
			</section>
		</div>
	);
}
