import type { ReactNode } from 'react';
import PageContainer from '../components/layouts/page-container';

export default function HobbyLayout({ children }: { children: ReactNode }) {
	return <PageContainer>{children}</PageContainer>;
}
