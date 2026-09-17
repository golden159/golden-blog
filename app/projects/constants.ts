import type { Project } from './types';

export const projects: Project[] = [
	{
		title: '大深径比微孔参数光学无损测量系统',
		src: 'optical-micro-hole.png',
		color: '#dbeafe',
		url: '#',
		role: '系统方案设计与核心算法开发',
	},
	{
		title: 'BetaPPM 去雾推理资源自适应系统',
		src: 'betappm-dehazing.png',
		color: '#ddd6fe',
		url: '#',
		role: '核心模型与推理调度设计',
	},
	{
		title: '基于语音对话系统的零售机器人项目',
		src: 'retail-robot-project.svg',
		color: '#fce7f3',
		url: '/projects/retail-robot-project',
		role: 'ASR、LLM、TTS 与机器人系统集成',
	},
];
