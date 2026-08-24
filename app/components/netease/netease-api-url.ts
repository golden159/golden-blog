const isLoopbackHostname = (hostname: string): boolean => {
	const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (normalized === 'localhost' || normalized === '::1') return true;

	const octets = normalized.split('.');
	return (
		octets.length === 4 &&
		octets[0] === '127' &&
		octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
	);
};

export const parseNeteaseApiBaseUrl = (
	raw: string | undefined,
	nodeEnv: string | undefined,
): URL | null => {
	if (!raw || raw.includes('?') || raw.includes('#')) return null;

	try {
		const base = new URL(raw);
		const isAllowedProtocol =
			base.protocol === 'https:' ||
			(base.protocol === 'http:' &&
				nodeEnv !== 'production' &&
				isLoopbackHostname(base.hostname));
		if (
			!isAllowedProtocol ||
			base.username ||
			base.password ||
			base.search ||
			base.hash
		) {
			return null;
		}

		base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
		return base;
	} catch {
		return null;
	}
};

export const buildNeteaseApiUrl = (base: URL, endpoint: string): URL =>
	new URL(endpoint.replace(/^\/+/, ''), base);
