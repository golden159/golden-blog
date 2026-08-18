# golden-blog

许泽升（Golden）的个人博客，记录 AI Agent、深度学习、计算机视觉与低层视觉方向的学习与实践。

- **框架**: [Next.js](https://nextjs.org/)
- **部署**: [Vercel](https://vercel.com)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **内容**: [MDX](https://mdxjs.com/)

## 本地运行

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

`/stats` 页面依赖以下第三方接口，未配置时页面会优雅降级（不显示对应板块）：

- `NEXT_PUBLIC_GITHUB_TOKEN` — GitHub 贡献日历
- `WAKATIME_SECRET_KEY` — WakaTime 编程时长
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` — Spotify 最近播放

### 启动开发服务器

```bash
npm run dev
```

## 授权与来源

本项目基于 [dlarroder/dalelarroder](https://github.com/dlarroder/dalelarroder)（MIT 许可）二次开发。

原项目版权归原作者 Dale Larroder 所有；个性化内容与新增素材的权利归各自作者所有。
