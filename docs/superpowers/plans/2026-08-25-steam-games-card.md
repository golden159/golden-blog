# Steam Games Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 在现有 /hobby 的 Games 卡片中接入 Steam Web API，展示当前游戏、最近游戏和游玩时长，并在 Steam 数据不可用时保留静态 Games 内容和主页入口。

**Architecture:** 服务端只从 STEAM_WEB_API_KEY 读取密钥，用原生 fetch 并行读取 GetPlayerSummaries 与 GetRecentlyPlayedGames，将未知上游 JSON 清洗成稳定、无密钥的公共响应，再由 /api/hobby/steam 暴露。客户端独立校验本站响应并用 SWR 每分钟刷新；收起态显示 Steam 头像与当前/最近游戏，展开态显示资料、当前游戏、最近五款游戏与时长，现有游戏分类和非 Steam 账号继续保留。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, SWR 2, Tailwind CSS 4, Vitest, Testing Library, Steam Web API。

## Global Constraints

- 保留 Games 名称、静态游戏分类、小黑盒账号、Battle.net 账号和 Steam 主页入口。
- 展示当前游戏、最近公开游戏、近两周时长和累计时长；不展示最后在线时间。
- 只有 summary 同时返回合法 gameid 与 gameextrainfo 时才显示“正在玩”；不能把 online 当成 playing。
- 最近游戏最多 5 款，保持 Steam API 顺序；当前游戏从最近列表去重，不增加黑名单。
- STEAM_WEB_API_KEY 只允许服务端读取，绝不进入客户端 bundle、公开 JSON、日志或快照。
- 只用 HTTPS Steam 官方图片：头像限 steamstatic.com，游戏图标用合法 appid 和 img_icon_url 构造 media.steampowered.com 地址；失败时使用本地占位图。
- Steam 缺少配置、超时、非 2xx、资料隐藏或响应非法时安全降级，不能使 /hobby 或构建失败。
- 上游请求 5 秒超时；本站 API 缓存头为 public, s-maxage=60, stale-while-revalidate=300；SWR 每 60 秒刷新。
- 动态内容在 320px 手机、普通手机、平板和桌面均不得横向溢出；长标题截断，时长在窄屏独占一行。
- 不新增 Steam SDK，不抓取 Steam HTML，不复制参考仓库代码。

---

### Task 1: 建立公共契约和上游 normalizer

**Files:**
- Create: app/components/steam/types.ts
- Create: app/components/steam/normalize.ts
- Create: app/components/steam/normalize.test.ts

**Interfaces:**
- Produces SteamProfile、SteamGame、SteamCurrentGame、SteamActivityResponse、unavailableSteamActivity() 和 normalizeSteamActivity()。
- 公共响应固定为：

~~~ts
export type SteamActivityResponse = {
  state: 'ready' | 'empty' | 'unavailable';
  generatedAt: number;
  profile: SteamProfile | null;
  currentGame: SteamCurrentGame | null;
  recentGames: SteamGame[];
};
~~~

- SteamProfile 只含 steamId、personaName、profileUrl、avatarUrl。
- SteamCurrentGame 只含 appId、name、iconUrl。
- SteamGame 含 appId、name、iconUrl、playtime2WeeksMinutes、playtimeForeverMinutes；两种时长均为 number | null，单位分钟。

- [ ] **Step 1: 写失败的 fixture 测试**

创建合法 summary/recent fixtures，覆盖头像、gameid/gameextrainfo、playtime_2weeks、playtime_forever 和 img_icon_url。断言第一项精确归一化为：

~~~ts
expect(result.recentGames[0]).toEqual({
  appId: 1446780,
  name: 'MONSTER HUNTER RISE',
  iconUrl:
    'https://media.steampowered.com/steamcommunity/public/images/apps/1446780/560dd364b52075b783424961a43c01f9b69fde15.jpg',
  playtime2WeeksMinutes: 2328,
  playtimeForeverMinutes: 2880,
});
~~~

补充以下用例：

- currentGame 与 recentGames 按 appId 去重。
- 请求 6 款最近游戏，输出至多 5 款非当前游戏。
- 无 current game 但 recent 非空为 ready。
- 无 current game 且 recent 成功返回空数组为 empty。
- recent 响应失败但 summary 合法时为 unavailable，并保留 profile 和明确的 currentGame。
- summary 缺失、Steam ID 不匹配、非法 appId、负时长、非 HTTPS/非 Steamstatic 头像、非十六进制 icon hash 不抛异常。
- 单个 recent game 非法时跳过；原始 total_count 非零但所有游戏都非法时返回 unavailable，不能伪装 empty。

- [ ] **Step 2: 运行测试确认失败**

~~~bash
npx vitest run app/components/steam/normalize.test.ts
~~~

预期：模块不存在，测试 FAIL。

- [ ] **Step 3: 实现类型和 normalizer**

在 types.ts 定义 STEAM_RECENT_GAMES_LIMIT = 5 和上述类型。unavailableSteamActivity 接受可选 profile/currentGame，使 recent 请求失败时仍能保留 summary 中已验证的信息。

在 normalize.ts 使用 unknown → Record<string, unknown> 的边界检查；只接受安全正整数 appId、有限非负分钟和非空名称。图片规则精确实现为：

~~~ts
const trustedAvatar = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      (host === 'steamstatic.com' || host.endsWith('.steamstatic.com'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const gameIconUrl = (appId: number, hash: unknown): string | null => {
  if (typeof hash !== 'string' || !/^[a-f0-9]{8,64}$/i.test(hash)) return null;
  return (
    'https://media.steampowered.com/steamcommunity/public/images/apps/' +
    appId +
    '/' +
    hash +
    '.jpg'
  );
};
~~~

profileUrl 不采用上游 profileurl，而使用传入的 app/hobby/content.ts 中 steamProfile.url。currentGame 只从 summary 的 gameid/gameextrainfo 建立，并从 recent 的同 appId 条目复用 icon。先提取 6 款，再排除 current appId，最后 slice(0, 5)。

- [ ] **Step 4: 运行测试并提交**

~~~bash
npx vitest run app/components/steam/normalize.test.ts
git add app/components/steam/types.ts app/components/steam/normalize.ts app/components/steam/normalize.test.ts
git commit -m "feat: add steam activity contract"
~~~

### Task 2: 添加服务端适配器和 Route Handler

**Files:**
- Create: app/components/steam/steam.ts
- Create: app/components/steam/steam.test.ts
- Create: app/api/hobby/steam/route.ts
- Create: app/api/hobby/steam/route.test.ts
- Modify: .env.example
- Modify: README.md

**Interfaces:**
- Consumes steamProfile.userId、steamProfile.url、STEAM_WEB_API_KEY 和 Task 1 normalizer。
- Produces fetchSteamActivity(options?): Promise<SteamActivityResponse> 和 GET /api/hobby/steam。

- [ ] **Step 1: 写失败的 server-only 请求测试**

测试两个并行请求的目标分别包含 GetPlayerSummaries 和 GetRecentlyPlayedGames；两个 URL 均使用配置 Key 和固定 Steam ID，recent count 为 6。断言 RequestInit 具有 GET、Accept: application/json、cache: no-store、redirect: error 和 AbortSignal。

~~~ts
const env = { STEAM_WEB_API_KEY: 'server-secret' };

expect(fetchImpl).toHaveBeenCalledTimes(2);
expect(String(fetchImpl.mock.calls[0][0])).toContain('GetPlayerSummaries');
expect(String(fetchImpl.mock.calls[1][0])).toContain('GetRecentlyPlayedGames');
expect(JSON.stringify(result)).not.toContain('server-secret');
~~~

再测试：

- 缺少/空 Key 时不调用 fetch，直接 unavailable。
- summary 非 2xx 或 JSON 非法时完全 unavailable。
- recent 非 2xx、JSON 非法或超时时保留合法 profile/currentGame，但 state 为 unavailable。
- 两个请求均成功时交给 normalizer，返回无上游 URL、无 Key 的公共数据。
- 函数不调用 console.log/error/warn 输出请求 URL或 payload。

- [ ] **Step 2: 运行测试确认失败**

~~~bash
npx vitest run app/components/steam/steam.test.ts
~~~

- [ ] **Step 3: 实现 Steam server adapter**

steam.ts 首行 import server-only。接口固定为：

~~~ts
type SteamEnv = Partial<Record<'STEAM_WEB_API_KEY', string>>;

type FetchSteamOptions = {
  env?: SteamEnv;
  steamId?: string;
  profileUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};
~~~

URL 固定为：

~~~ts
const summaryUrl = new URL(
  'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
);
summaryUrl.searchParams.set('key', apiKey);
summaryUrl.searchParams.set('steamids', steamId);

const recentUrl = new URL(
  'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/',
);
recentUrl.searchParams.set('key', apiKey);
recentUrl.searchParams.set('steamid', steamId);
recentUrl.searchParams.set('format', 'json');
recentUrl.searchParams.set('count', '6');
~~~

每支请求各自 try/catch，使用同一组安全 RequestInit：

~~~ts
{
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'User-Agent': 'golden-xzs-blog/1.0',
  },
  cache: 'no-store',
  redirect: 'error',
  signal: AbortSignal.timeout(5000),
}
~~~

summary 是建立身份的必需分支；失败则 unavailable。recent 独立失败时向 normalizer 传 null，以保留已经验证的 profile/currentGame。禁止日志记录含 Key 的 URL。

- [ ] **Step 4: 写失败的 Route Handler 测试**

mock fetchSteamActivity，断言 GET 返回同一公共响应，并精确检查：

~~~ts
expect(response.headers.get('cache-control')).toBe(
  'public, s-maxage=60, stale-while-revalidate=300',
);
~~~

- [ ] **Step 5: 实现 Route Handler**

route.ts 设置 dynamic = force-dynamic，不接受浏览器传来的 steamid/key/query，直接调用 fetchSteamActivity() 并用 NextResponse.json 返回缓存头。

- [ ] **Step 6: 文档化配置与来源**

.env.example 增加：

~~~dotenv
# Steam Web API (server-only Hobby Games activity)
STEAM_WEB_API_KEY=
~~~

README 说明：

- Steam ID 继续来自 app/hobby/content.ts。
- Key 只配置在本地/Vercel 服务端。
- 展示当前游戏、最近公开游戏和时长，不展示最后在线时间。
- 接口不可用时保留静态 Games 内容和主页入口。
- 权威来源为 Valve Steam Web API；开源参考为 xPaw/SteamWebAPIDocumentation、yuyinws/steam-card 和 FN-FAL113/github-readme-steam-card。
- 只借鉴公开契约、容错和信息层级；GPL 项目不复制代码。

- [ ] **Step 7: 验证并提交**

~~~bash
npx vitest run app/components/steam/steam.test.ts app/api/hobby/steam/route.test.ts
git add app/components/steam/steam.ts app/components/steam/steam.test.ts \
  app/api/hobby/steam/route.ts app/api/hobby/steam/route.test.ts \
  .env.example README.md
git commit -m "feat: add steam activity api"
~~~

### Task 3: 添加客户端校验、SWR 和展开态 UI

**Files:**
- Create: app/hobby/components/steam-activity.ts
- Create: app/hobby/components/steam-activity.test.ts
- Create: app/hobby/components/steam-details.tsx
- Create: app/hobby/components/steam-details.test.tsx
- Create: public/static/hobby/steam-placeholder.svg
- Modify: app/hobby/components/game-details.tsx
- Modify: app/hobby/components/game-details.test.tsx

**Interfaces:**
- Produces normalizeSteamActivity(value: unknown)、fetchSteamActivity(url)、useSteamActivity(enabled?)。
- Produces SteamDetails({ activity, fetchWhenMissing = true })。
- GameDetails 增加 steamActivity?: SteamActivityResponse。

- [ ] **Step 1: 写失败的客户端边界测试**

用合法 public fixture 测试 ready、empty 和带 profile/currentGame 的 unavailable。拒绝：

- recentGames.length > 5。
- appId 非安全正整数。
- 负时长、NaN、Infinity。
- 非 Steamstatic 头像和非 media.steampowered.com icon。
- profile Steam ID、profile URL 与固定 content 配置不一致。
- currentGame 缺少名称。
- ready 无 profile、empty 却含游戏等矛盾状态。

fetcher 在非 2xx 或网络异常时返回 unavailable；SWR key 固定 /api/hobby/steam。

- [ ] **Step 2: 运行客户端测试确认失败**

~~~bash
npx vitest run app/hobby/components/steam-activity.test.ts
~~~

- [ ] **Step 3: 实现独立客户端 normalizer 和 hook**

客户端不能信任本站 JSON，也不导入 server-only normalizer；逐字段验证与 Task 1 相同的公共契约。SWR 配置为：

~~~ts
useSWR(enabled ? '/api/hobby/steam' : null, fetchSteamActivity, {
  refreshInterval: 60_000,
  refreshWhenHidden: false,
  shouldRetryOnError: false,
  revalidateOnFocus: true,
});
~~~

- [ ] **Step 4: 写失败的 SteamDetails 响应式渲染测试**

使用显式 activity fixture，断言：

~~~ts
expect(screen.getByRole('heading', { name: 'Golden' })).toBeInTheDocument();
expect(screen.getByText('正在玩')).toBeInTheDocument();
expect(screen.getByText('MONSTER HUNTER RISE')).toBeInTheDocument();
expect(screen.getByText('近两周 38 小时 48 分')).toBeInTheDocument();
expect(screen.getByText('累计 48 小时')).toBeInTheDocument();
expect(
  screen.getByRole('link', { name: /打开 MONSTER HUNTER RISE/ }),
).toHaveAttribute('href', 'https://store.steampowered.com/app/1446780/');
~~~

补充：

- currentGame 与 recent 列表不重复。
- empty 显示“暂无公开的最近游戏”。
- unavailable 仍显示可用 profile/currentGame，并说明最近数据暂时不可用。
- 无动态数据仍显示静态游戏分组、小黑盒和 Battle.net。
- avatar/icon onError 切换到本地 SVG。
- 主要 grid/list 节点包含 min-w-0；标题 truncate；时长容器 w-full sm:w-auto；最近项 flex-wrap；没有固定像素内容宽度。
- 展开内容保持与 Anime 一样的扁平布局，不嵌套 rounded-2xl border 卡片面。

- [ ] **Step 5: 运行 UI 测试确认失败**

~~~bash
npx vitest run app/hobby/components/steam-details.test.tsx app/hobby/components/game-details.test.tsx
~~~

- [ ] **Step 6: 实现 SteamDetails 与占位图**

SteamDetails 通过 next/image 渲染头像和 48px 游戏 icon；远程源变化时重置失败状态，失败后使用 /static/hobby/steam-placeholder.svg。

时长格式固定：

- null 不渲染。
- 少于 60 分钟：N 分钟。
- 整小时：H 小时。
- 非整小时：H 小时 M 分钟。

布局固定原则：

~~~tsx
<section className='min-w-0'>
  <div className='grid min-w-0 gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]'>
    {/* avatar, identity, state */}
  </div>
  <ul className='mt-3 divide-y divide-gray-200 dark:divide-gray-700'>
    <li className='flex min-w-0 flex-wrap items-center gap-3 py-4'>
      {/* icon */}
      <span className='min-w-0 flex-1 truncate'>{/* title */}</span>
      <span className='w-full text-left sm:w-auto sm:text-right'>
        {/* playtime */}
      </span>
    </li>
  </ul>
</section>
~~~

商店 URL 只由验证后的数字 appId 构造。动态 unavailable/empty 只显示简短说明，不隐藏静态内容。

- [ ] **Step 7: 组合 GameDetails**

GameDetails 在现有 gameGroups 之前放置 SteamDetails，仍过滤 Steam account，避免展开态重复主页入口；小黑盒/Battle.net 逻辑不变。HobbyGrid 传入数据时设置 fetchWhenMissing=false，避免重复请求。

- [ ] **Step 8: 验证并提交**

~~~bash
npx vitest run \
  app/hobby/components/steam-activity.test.ts \
  app/hobby/components/steam-details.test.tsx \
  app/hobby/components/game-details.test.tsx
git add app/hobby/components/steam-activity.ts app/hobby/components/steam-activity.test.ts \
  app/hobby/components/steam-details.tsx app/hobby/components/steam-details.test.tsx \
  app/hobby/components/game-details.tsx app/hobby/components/game-details.test.tsx \
  public/static/hobby/steam-placeholder.svg
git commit -m "feat: render steam games details"
~~~

### Task 4: 接入收起预览、HobbyGrid 和图片白名单

**Files:**
- Modify: app/hobby/components/category-visual.tsx
- Modify: app/hobby/components/hobby-card.tsx
- Modify: app/hobby/components/hobby-grid.tsx
- Modify: app/hobby/components/hobby-grid.test.tsx
- Modify: app/hobby/components/hobby-card-reduced-motion.test.tsx
- Modify: next.config.ts
- Modify: next.config.test.ts

**Interfaces:**
- CategoryVisual 和 HobbyCardProps 增加 steamActivity?: SteamActivityResponse。
- renderDetails 增加 steamActivity 参数，Games 分支返回 GameDetails。
- HobbyGrid 只调用一次 useSteamActivity()，同一数据供收起态和展开态使用。

- [ ] **Step 1: 写失败的 HobbyGrid 集成测试**

给 fetch stub 增加 /api/hobby/steam 分支。断言 Games 收起态显示：

- 40px Steam 头像。
- currentGame 存在时显示“正在玩”和当前标题。
- 无 current 时显示“最近玩过”和 recentGames[0]。
- empty 显示“暂无公开记录”。
- unavailable 显示“Steam 暂时不可用”。

打开 Games 后断言动态详情出现、Steam 主页链接仍只有一个、只有一个展开 region；既有单开卡、退出 inert、footer 对齐、Reduced Motion 和 trigger 内不出现 div/p 的测试继续通过。

窄屏预览保留信息而不是像旧 CO-OP/GG 装饰一样 hidden；用 min-w-0、truncate 和 max-w 约束长标题，不能遮挡加号或 footer。

- [ ] **Step 2: 写失败的图片 host 测试**

next.config.test.ts 断言 remotePatterns 包含：

~~~ts
{
  protocol: 'https',
  hostname: 'steamstatic.com',
  pathname: '/**',
},
{
  protocol: 'https',
  hostname: '**.steamstatic.com',
  pathname: '/**',
},
{
  protocol: 'https',
  hostname: 'media.steampowered.com',
  pathname: '/**',
},
~~~

- [ ] **Step 3: 运行集成测试确认失败**

~~~bash
npx vitest run \
  app/hobby/components/hobby-grid.test.tsx \
  app/hobby/components/hobby-card-reduced-motion.test.tsx \
  next.config.test.ts
~~~

- [ ] **Step 4: 实现 SteamPreview 和 props 传递**

SteamPreview 先调用客户端 normalizer；优先 currentGame，其次 recentGames[0]。保持 phrasing-content，使用 span 而非 div/p：

~~~tsx
<span className='mt-5 flex min-w-0 items-center gap-3'>
  {/* avatar */}
  <span className='min-w-0'>
    <span className='block text-xs font-semibold'>{status}</span>
    <span className='block max-w-[min(16rem,60vw)] truncate text-xs'>
      {gameName}
    </span>
  </span>
</span>
~~~

HobbyGrid 调用一次 useSteamActivity()；把结果传给 Games 的 HobbyCard、CategoryVisual 和 GameDetails。Anime/Music 请求行为不变。

- [ ] **Step 5: 加入最小图片白名单**

next.config.ts 仅增加上述三个 HTTPS pattern，不放宽到任意 steampowered.com 或外部图片域名。

- [ ] **Step 6: 验证并提交**

~~~bash
npx vitest run \
  app/hobby/components/hobby-grid.test.tsx \
  app/hobby/components/hobby-card-reduced-motion.test.tsx \
  next.config.test.ts
git add app/hobby/components/category-visual.tsx app/hobby/components/hobby-card.tsx \
  app/hobby/components/hobby-grid.tsx app/hobby/components/hobby-grid.test.tsx \
  app/hobby/components/hobby-card-reduced-motion.test.tsx \
  next.config.ts next.config.test.ts
git commit -m "feat: connect steam activity to games card"
~~~

### Task 5: 全量验证和多端验收

**Files:**
- Modify only if verification reveals a regression: files listed in Tasks 1–4.

- [ ] **Step 1: 运行 Steam 相关测试**

~~~bash
npx vitest run \
  app/components/steam/normalize.test.ts \
  app/components/steam/steam.test.ts \
  app/api/hobby/steam/route.test.ts \
  app/hobby/components/steam-activity.test.ts \
  app/hobby/components/steam-details.test.tsx \
  app/hobby/components/game-details.test.tsx \
  app/hobby/components/hobby-grid.test.tsx \
  app/hobby/components/hobby-card-reduced-motion.test.tsx \
  next.config.test.ts
~~~

预期：全部 PASS，输出不包含真实 STEAM_WEB_API_KEY。

- [ ] **Step 2: 运行全量测试与检查**

~~~bash
npm test -- --run --maxWorkers=1
npm run check
npm run build
~~~

预期：Anime、Music 和其他页面不回归；即使执行 build 的 shell 没有 Key，构建也成功。

- [ ] **Step 3: 浏览器多端检查**

运行 npm run dev，在 320×800、390×844、768×1024、1280×900 检查 /hobby：

- Games 收起/展开均无横向滚动。
- 超长游戏名不会推开 + 指示器、图片或 Steam footer。
- 最近列表时长在手机独占下一行，在 sm 以上回到右侧。
- 五款游戏、无图片 fallback、empty/unavailable、深色模式均清晰。
- Reduced Motion 保持即时 indicator 和低运动量。
- 切换到 Anime/Music 后退出 Games panel 立即 inert。

- [ ] **Step 4: 检查敏感信息和改动范围**

~~~bash
rg -n "STEAM_WEB_API_KEY|server-secret|apiKey|key=" app public README.md .env.example
git diff --check
git status --short
~~~

预期：只出现变量名、说明和测试占位值；没有真实 Key、原始 Steam payload 或无关改动。

## Self-Review

- Spec coverage: Games 名称、当前游戏、最近游戏、时长、稳定图片、无黑名单、服务端 Key、多端布局、动态刷新和降级均有对应任务。
- Placeholder scan: 所有步骤都有明确文件、接口、测试命令和实现规则，没有待定工作。
- Type consistency: SteamActivityResponse 在 server normalizer、Route Handler、client normalizer、SteamDetails、CategoryVisual、HobbyCard 和 HobbyGrid 中字段一致。

