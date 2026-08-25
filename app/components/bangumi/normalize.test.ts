import { describe, expect, it } from 'vitest';
import {
	normalizeBangumiCollections,
	normalizeBangumiProfile,
} from './normalize';

const profilePayload = {
	id: 1022640,
	username: '1022640',
	nickname: 'Golden',
	sign: '动画和生活都要认真记录。',
	user_group: 10,
	avatar: {
		large: 'https://lain.bgm.tv/pic/user/l/000/00/01.jpg',
		medium: 'https://lain.bgm.tv/pic/user/m/000/00/01.jpg',
		small: 'https://lain.bgm.tv/pic/user/s/000/00/01.jpg',
	},
};

const collection = (id: number, overrides: Record<string, unknown> = {}) => ({
	subject_id: id,
	subject_type: 2,
	rate: 9,
	type: 3,
	comment: '',
	tags: [],
	ep_status: 6,
	vol_status: 0,
	updated_at: '2026-08-24T10:00:00+08:00',
	private: false,
	subject: {
		id,
		type: 2,
		name: `Anime ${id}`,
		name_cn: `动画 ${id}`,
		short_summary: '',
		date: '2026-07-01',
		images: {
			large: `https://lain.bgm.tv/pic/cover/l/${id}.jpg`,
			common: `https://lain.bgm.tv/pic/cover/c/${id}.jpg`,
			medium: `https://lain.bgm.tv/pic/cover/m/${id}.jpg`,
			small: `https://lain.bgm.tv/pic/cover/s/${id}.jpg`,
			grid: `https://lain.bgm.tv/pic/cover/g/${id}.jpg`,
		},
		volumes: 0,
		eps: 12,
		collection_total: 12000,
		score: 8.2,
		rank: 120,
		tags: [],
	},
	...overrides,
});

describe('normalizeBangumiProfile', () => {
	it('keeps a documented public profile and trusted avatar', () => {
		expect(normalizeBangumiProfile(profilePayload)).toEqual({
			username: '1022640',
			nickname: 'Golden',
			sign: '动画和生活都要认真记录。',
			avatarUrl: 'https://lain.bgm.tv/pic/user/l/000/00/01.jpg',
		});
	});

	it('falls back to the username and removes untrusted optional values', () => {
		expect(
			normalizeBangumiProfile({
				...profilePayload,
				nickname: '   ',
				sign: '',
				avatar: { large: 'https://example.com/avatar.jpg' },
			}),
		).toEqual({
			username: '1022640',
			nickname: '1022640',
			sign: null,
			avatarUrl: null,
		});
	});

	it('rejects a profile without a documented username', () => {
		expect(
			normalizeBangumiProfile({ ...profilePayload, username: '' }),
		).toBeNull();
	});
});

describe('normalizeBangumiCollections', () => {
	it('maps statuses, scores, episode progress and newest entries first', () => {
		const result = normalizeBangumiCollections({
			total: 27,
			limit: 6,
			offset: 0,
			data: [
				collection(1, {
					type: 2,
					rate: 0,
					ep_status: 12,
					updated_at: '2026-08-20T10:00:00+08:00',
				}),
				collection(2, {
					type: 3,
					rate: 9,
					ep_status: 6,
					updated_at: '2026-08-24T10:00:00+08:00',
				}),
			],
		});

		expect(result).toEqual({
			total: 27,
			entries: [
				{
					id: 2,
					title: '动画 2',
					originalTitle: 'Anime 2',
					imageUrl: 'https://lain.bgm.tv/pic/cover/c/2.jpg',
					status: '在看',
					personalScore: 9,
					communityScore: 8.2,
					watchedEpisodes: 6,
					totalEpisodes: 12,
				},
				{
					id: 1,
					title: '动画 1',
					originalTitle: 'Anime 1',
					imageUrl: 'https://lain.bgm.tv/pic/cover/c/1.jpg',
					status: '看过',
					personalScore: null,
					communityScore: 8.2,
					watchedEpisodes: 12,
					totalEpisodes: 12,
				},
			],
		});
	});

	it('supports all documented collection statuses', () => {
		const result = normalizeBangumiCollections({
			total: 5,
			data: [1, 2, 3, 4, 5].map((type, index) =>
				collection(index + 1, { type }),
			),
		});

		expect(result?.entries.map((entry) => entry.status)).toEqual([
			'想看',
			'看过',
			'在看',
			'搁置',
			'抛弃',
		]);
	});

	it('keeps at most six valid entries and strips an untrusted cover URL', () => {
		const payload = {
			total: 8,
			data: Array.from({ length: 8 }, (_, index) =>
				collection(index + 1, {
					updated_at: `2026-08-${String(index + 1).padStart(2, '0')}T10:00:00+08:00`,
				}),
			),
		};
		payload.data[7].subject = {
			...payload.data[7].subject,
			images: {
				large: 'javascript:alert(1)',
				common: 'javascript:alert(1)',
				medium: 'javascript:alert(1)',
				small: 'javascript:alert(1)',
				grid: 'javascript:alert(1)',
			},
		};

		const result = normalizeBangumiCollections(payload);

		expect(result?.entries).toHaveLength(6);
		expect(result?.entries[0]).toMatchObject({ id: 8, imageUrl: null });
	});

	it('returns an exact empty page and rejects malformed pagination', () => {
		expect(
			normalizeBangumiCollections({ total: 0, limit: 6, offset: 0, data: [] }),
		).toEqual({ total: 0, entries: [] });
		expect(normalizeBangumiCollections({ total: -1, data: [] })).toBeNull();
		expect(
			normalizeBangumiCollections({ total: 1, data: 'invalid' }),
		).toBeNull();
	});
});
