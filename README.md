# golden-blog

许泽升（Golden）的个人博客，记录 AI Agent、深度学习、计算机视觉与低层视觉方向的学习与实践。

- **框架**: [Next.js](https://nextjs.org/)
- **部署**: [Vercel](https://vercel.com)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **内容**: [MDX](https://mdxjs.com/)

## 本地运行

### 安装依赖

```bash
bun install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

`/stats` 页面依赖以下第三方接口，未配置时页面会优雅降级（不显示对应板块）：

- `NEXT_PUBLIC_GITHUB_TOKEN` — GitHub 贡献日历
- `WAKATIME_SECRET_KEY` — WakaTime 编程时长
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` — Spotify 最近播放

`/hobby` 的“最近在听”功能使用单独部署的 NeteaseCloudMusicApi 服务。未配置时 Music 卡片仍会展示音乐偏好和网易云主页入口：

- `NETEASE_API_BASE_URL` — 自建 NeteaseCloudMusicApi 服务地址
- `NETEASE_MUSIC_COOKIE` — 仅服务端保存的网易云 Cookie，禁止提交到仓库
- `NETEASE_USER_ID` — 网易云用户 ID，当前为 `3719820729`

`/hobby` 的 Anime 卡片使用 Bangumi 官方公开 v0 API 读取用户资料和公开动画收藏，不需要 Bangumi access token。接口不可用时会保留 Bangumi 主页入口并显示降级提示。实现时参考了这些公开仓库：

- [`bangumi/api`](https://github.com/bangumi/api) — 官方 API 文档与 OpenAPI 入口
- [`bangumi/server`](https://github.com/bangumi/server) — 官方 API 服务端与 v0 响应模型
- [`bangumi/frontend`](https://github.com/bangumi/frontend) — 官方前端（BSD-3-Clause）的条目展示与界面组织思路

当前主页只复用公开数据契约与容错思路，没有复制第三方项目代码；服务端会清洗 Bangumi 图片地址、限制展示条目数量，并通过 `/api/hobby/bangumi` 统一转发。

`/hobby` 的 Games 卡片使用 Steam Web API 读取当前游戏、最近公开游戏和游玩时长。Steam ID 固定来自 `app/hobby/content.ts`，API Key 只配置在本地或 Vercel 的服务端环境：

- `STEAM_WEB_API_KEY` — 仅服务端使用的 Steam Web API Key，禁止提交到仓库

页面不会展示最后在线时间；接口不可用或游戏详情未公开时，仍会保留静态 Games 内容和 Steam 主页入口。实现以 [Valve Steam Web API](https://partner.steamgames.com/doc/webapi) 为权威契约，并参考这些开源仓库：

- [`xPaw/SteamWebAPIDocumentation`](https://github.com/xPaw/SteamWebAPIDocumentation)（MIT）— 接口、参数和响应字段索引
- [`yuyinws/steam-card`](https://github.com/yuyinws/steam-card)（MIT）— 资料、当前状态、最近游戏和缓存的信息层级
- [`FN-FAL113/github-readme-steam-card`](https://github.com/FN-FAL113/github-readme-steam-card)（GPL-3.0）— 当前游戏优先级和 Serverless 容错经验

本站只借鉴公开契约、容错和信息组织方式，不复制第三方代码；GPL 项目仅作为视觉和缓存经验参考。服务端会限制返回数量、清洗图片和链接，并通过 `/api/hobby/steam` 返回不含 API Key 的公共响应。

### 启动开发服务器

```bash
bun run dev
```

## 授权与来源

本项目基于 [dlarroder/dalelarroder](https://github.com/dlarroder/dalelarroder)（MIT 许可）二次开发。

原项目版权归原作者 Dale Larroder 所有；个性化内容与新增素材的权利归各自作者所有。
