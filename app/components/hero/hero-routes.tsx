import Link from 'next/link';

const routes = ['/projects', '/thoughts', '/uses', '/stats', '/hobby'] as const;

export default function HeroRoutes() {
	return (
		<div className='flex flex-wrap space-x-3 space-y-1' data-skip-splash-cursor>
			{routes.map((route) => (
				<Link key={route} href={route}>
					{route}
				</Link>
			))}
		</div>
	);
}
