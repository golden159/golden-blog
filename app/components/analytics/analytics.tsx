import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Fragment } from 'react';

export default function Analytics() {
	return (
		<Fragment>
			<VercelAnalytics />
			<SpeedInsights />
		</Fragment>
	);
}
