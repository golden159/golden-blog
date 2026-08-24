'use client';

import type { NeteaseActivityResponse } from 'app/components/netease/types';
import useSWR from 'swr';

export const unavailableMusicActivity: NeteaseActivityResponse = {
	state: 'unavailable',
	track: null,
};

export const musicStateLabels: Record<
	NeteaseActivityResponse['state'],
	string
> = {
	recent: '最近活跃',
	older: '最近听过',
	empty: '暂无记录',
	unavailable: '暂时不可用',
};

export const fetchMusicActivity = async (
	url: string,
): Promise<NeteaseActivityResponse> => {
	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			return unavailableMusicActivity;
		}

		const value = (await response.json()) as NeteaseActivityResponse;
		return value && typeof value.state === 'string'
			? value
			: unavailableMusicActivity;
	} catch {
		return unavailableMusicActivity;
	}
};

export function useMusicActivity() {
	return useSWR<NeteaseActivityResponse>(
		'/api/hobby/netease',
		fetchMusicActivity,
		{
			refreshInterval: 60_000,
			refreshWhenHidden: false,
			shouldRetryOnError: false,
			revalidateOnFocus: true,
		},
	);
}
