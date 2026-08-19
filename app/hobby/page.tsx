import type { Metadata } from 'next';
import Header from '../components/header';
import HobbyGrid from './components/hobby-grid';

export const metadata: Metadata = {
	title: 'Hobby',
	description: 'Golden 的游戏、动漫、音乐、美食与旅行兴趣。',
};

export default function HobbyPage() {
	return (
		<>
			<Header title='Hobby' />
			<p className='mb-4 text-lg leading-7 text-gray-500 dark:text-gray-400'>
				工作和学习之外，这里收集了一些让我持续保持好奇与快乐的事。
			</p>
			<HobbyGrid />
		</>
	);
}
