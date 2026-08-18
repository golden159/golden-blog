import classNames from 'classnames';
import Link from 'next/link';
import { merryWeather } from '../../fonts';
import { AtSignIcon } from '../layouts/icons/at-sign-icon';
import { GithubIcon } from '../layouts/icons/github-icon';
import { XIcon } from '../layouts/icons/x-icon';
import SplashCursor from '../splash-cursor';

export default function Hero() {
	return (
		<main className='relative min-h-svh w-screen overflow-hidden'>
			<SplashCursor
				containerClassName='min-h-svh w-screen'
				usePrimaryColors={true}
			>
				<div
					className={classNames('relative min-h-svh', merryWeather.className)}
				>
					<div className='absolute top-[20%] md:top-[40%] max-w-5xl flex-col space-y-4 justify-center px-8 md:px-24 lg:ml-14'>
						<h1 className='text-2xl font-medium md:mr-4 md:text-4xl'>
							Welcome to my{' '}
							<span className='font-bold'>personal portfolio — </span> or, as I
							like to call it, my{' '}
							<span className='italic border-b border-b-primary-500'>
								playground
							</span>{' '}
							on the web.
						</h1>
						<section className='relative z-10'>
							<p className='text-base text-justify'>
								我是许泽升（Golden）——深圳大学光电信息科学与工程本科生，专注
								AI Agent、深度学习、计算机视觉与低层视觉。我将光学系统、数学模型与深度学习结合，把复杂问题拆解为可测量、可验证并具备工程价值的解决方案。
							</p>
						</section>
						<section className='relative z-10 flex space-x-4 items-center text-sm'>
							<div>
								<p>More about me: </p>
								<div className='flex -ml-2'>
									<Link
										href='https://github.com/golden159'
										target='_blank'
										rel='noreferrer'
										aria-label='github'
										data-skip-splash-cursor
									>
										<GithubIcon className='h-9 w-9' />
									</Link>
									<Link
										href='https://x.com/oldenG562897'
										target='_blank'
										rel='noreferrer'
										aria-label='twitter'
										data-skip-splash-cursor
									>
										<XIcon className='h-9 w-9' />
									</Link>
									<Link
										href='mailto:1623206759@qq.com'
										aria-label='email'
										rel='noreferrer'
										data-skip-splash-cursor
									>
										<AtSignIcon className='h-9 w-9' />
									</Link>
								</div>
							</div>
							<div className='h-14 border-l border-gray-300' />
							<div
								className='flex flex-wrap space-x-3 space-y-1'
								data-skip-splash-cursor
							>
								<Link href='/projects'>/projects</Link>
								<Link href='/thoughts'>/thoughts</Link>
								<Link href='/uses'>/uses</Link>
								<Link href='/stats'>/stats</Link>
							</div>
						</section>
					</div>
				</div>
			</SplashCursor>
		</main>
	);
}
