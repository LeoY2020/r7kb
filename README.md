# 班级知识库 · Class Knowledge Base

一个给班级用的知识库站点：**学习图谱、题库与错题本、资料库、常见问题** 四个入口。

> 当前内容全部为占位。页面里的空状态、筛选器、微交互都是真实可操作的，
> 你只需要往 `data/` 里填数据，页面就会自己长出来。

---

## 技术栈

| 层 | 选择 |
| --- | --- |
| 框架 | Next.js 14（App Router）+ TypeScript |
| 样式 | Tailwind CSS 3 + 自定义设计 token（Apple 风浅色：`page #f5f5f7` / `surface #fff` / `ink #1d1d1f` / `accent #0071e3`） |
| 动效 | `motion`（Framer Motion 12），React Bits 组件统一使用这个依赖 |
| 组件 | React Bits（Particles / SpotlightCard / RotatingText …）+ React Bits Micro（RubberSegment / SquishSwitch / SpringCheck …） |
| 输出 | `output: 'export'` 静态导出：默认 `npm run build` 生成 `out/`；部署时用 `NEXT_DIST_DIR=.next-deploy`，产物在同名目录 |

> 说明：`docx-to-web-publisher` 那种 Next.js 内容目录模式需要服务器能力，本项目选择**静态导出**，
> 所以既能用 Next.js 的目录结构，也能白嫖 GitHub Pages / Vercel / Netlify 的免费静态托管。

---

## 快速开始

```bash
cd class-kb
npm install
npm run dev
```

打开 <http://localhost:3000>。

构建静态站点：

```bash
npm run build                        # 默认产物在 out/
$env:NEXT_DIST_DIR='.next-deploy'; npm run build   # 部署构建，产物在 .next-deploy/
npx serve out                        # 本地预览静态产物（或任意静态服务器）
```

---

## 目录结构

```
class-kb/
├── app/                     # 页面（App Router）
│   ├── page.tsx             # 首页：Hero、四个入口、上手步骤、Micro 交互预览
│   ├── graph/page.tsx       # 学习图谱
│   ├── quiz/page.tsx        # 题库与错题本
│   ├── library/page.tsx     # 资料库
│   ├── faq/page.tsx         # 常见问题
│   ├── not-found.tsx        # 404
│   ├── layout.tsx           # 全局导航 / 页脚 / 背景
│   └── globals.css          # Tailwind 入口 + 设计 token
├── components/
│   ├── reactbits/           # React Bits 官方组件（原样落地）
│   ├── reactbits-micro/     # React Bits Micro 官方组件（原样落地）
│   ├── home/                # Hero、MicroShowcase
│   ├── graph/               # GraphCanvas（纯 SVG 图谱）、GraphExplorer
│   ├── quiz/                # QuestionCard、QuizBrowser
│   ├── library/             # LibraryBrowser
│   └── site/                # 导航、页脚、空状态、图标、滚动揭示等
├── data/
│   ├── site.ts              # 班级信息、导航、首页文案
│   └── knowledge.ts         # 学科 / 概念 / 题目 / 资料 / FAQ（当前全空，含示例注释）
├── public/resources/        # 课件、讲义原件放这里
└── tailwind.config.js
```

---

## 怎么填内容

只需要改两个文件，**不用碰任何组件**：

### 1. 班级信息 —— `data/site.ts`

```ts
export const site: SiteConfig = {
  name: '班级知识库',
  school: '某某中学',
  grade: '高二',
  className: '3 班',
  slogan: '把散落的知识点，整理成一张可以走的地图。',
  term: '2026 春季学期',
  maintainer: '学习委员',
};
```

### 2. 知识内容 —— `data/knowledge.ts`

文件里每个数组都有注释掉的示例，取消注释照着改即可：

- `subjects`：学科（id + 名称 + 颜色）
- `concepts`：图谱节点，`prerequisites` 填前置概念 id，图谱会自动画箭头（必须无环）
- `questions`：题目，`mastered: false` 的会自动进错题本
- `resources`：资料条目，`href` 指向 `public/resources/` 里的文件
- `faqs`：问答，支持分类

### 3. 文件 —— `public/resources/`

课件、PDF、讲义放这里，命名建议「学期-学科-单元」，具体见 `public/resources/README.md`。

---

## 部署与推送

站点走「源码仓库 → 构建产物仓库 → Netlify」的链路：

| 仓库 / 分支 | 用途 | 线上地址 |
| --- | --- | --- |
| `LeoY2020/r7kb`（main） | 源码 | — |
| `LeoY2020/r7kb-web`（main） | 构建产物（正式） | <https://r7kb.netlify.app> |
| `LeoY2020/r7kb-web`（test） | 构建产物（测试） | <https://r7kb-test.netlify.app> |

推送静态产物仓库的 `main` / `test` 后，Netlify 会自动重新部署。

### 1. 配置 token

把 GitHub PAT（需要 `repo` 权限）写入 `class-kb/deploy.token`（单行，无空格）。
该文件和 `.deploy/` 已在 `.gitignore` 中，不会被提交。

### 2. 一键发布（推荐）

双击运行 `deploy.bat`，它会依次：

1. 用 `NEXT_DIST_DIR=.next-deploy` 构建静态站
2. 提交并推送源码仓库 `r7kb`
3. 把产物同步到 `.deploy/r7kb-web`
4. 提交并推送静态站的 `main` 分支

发布完成后到 Netlify 确认部署状态即可。

> 重要：构建产物在 **`.next-deploy/`**，不是 `out/`。
> `next.config.mjs` 中 `distDir` 随 `NEXT_DIST_DIR` 变化，静态导出目录也跟着变。

### 3. 手动发布 / 推 test 分支

脚本只推 `main`。需要同步 `test` 或手动发布时：

```powershell
$env:NEXT_DIST_DIR='.next-deploy'
npm run build

robocopy ".next-deploy" ".deploy\r7kb-web" /MIR /XD ".git"
New-Item -ItemType File -Force ".deploy\r7kb-web\.nojekyll"

git -C ".deploy\r7kb-web" add -A
git -C ".deploy\r7kb-web" commit -m "build: publish static site"
git -C ".deploy\r7kb-web" push origin main
git -C ".deploy\r7kb-web" push origin main:test
```

只改代码、不发布时，正常提交推送源码仓库即可：

```powershell
git add -A
git commit -m "feat: ..."
git push origin main
```

### 4. 常见问题

- **线上还是旧版**：先确认同步源是 `.next-deploy` 而不是 `out/`，再检查 Netlify 是否已完成部署；必要时强刷浏览器（Ctrl+F5）。
- **`Cannot find module './vendor-chunks/...`**：dev 缓存的 `.next` 损坏。结束正在跑的 `next dev` 进程，删除 `.next` 后重新 `npm run dev`。发布构建使用隔离目录 `.next-deploy`，不会影响 dev。
- **推送 443 超时**：多为网络问题，稍后重试；确认 `deploy.token` 未过期。
- **子路径部署**（如 GitHub Pages 项目页）：用 `NEXT_PUBLIC_BASE_PATH=/仓库名 npm run build` 重新构建。

---

## React Bits 组件清单

| 来源 | 组件 | 用在哪 |
| --- | --- | --- |
| React Bits | `Particles` | 首页 Hero 的粒子背景 |
| React Bits | `ShinyText` | Hero 顶部标签、扫光文字 |
| React Bits | `RotatingText` | Hero 副标题轮播「学习图谱 / 错题本 / 资料库 / 常见问题」 |
| React Bits | `CountUp` | 首页内容统计数字 |
| React Bits | `SpotlightCard` | 首页四个入口卡片（跟随光标的光斑） |
| React Bits | `StarBorder` | 首页 CTA 按钮的流光描边 |
| React Bits | `BlurText` | 区块标题的模糊聚焦入场 |
| React Bits | `ClickSpark` | CTA 区块的点击火花 |
| React Bits | `Dock` | 桌面端悬浮快捷导航 |
| React Bits Micro | `RubberSegment` | 资料类型 / 图谱层级 / 题库状态切换 |
| React Bits Micro | `SquishSwitch` | 「显示解析」开关 |
| React Bits Micro | `SpringCheck` | 题目「标记掌握」、清单勾选 |
| React Bits Micro | `PulseHeart` | 资料收藏 / 点赞 |
| React Bits Micro | `WarmTooltip` | 悬停提示 |
| React Bits Micro | `StatusMark` | 404 与状态演示 |
| React Bits Micro | `LatticeLoader` | 处理中状态指示 |

组件的 Props 与源码保持与官方 registry 一致（`https://reactbits.dev/r/<Name>-TS-TW`），
后续升级可以用 `npx shadcn@latest add https://reactbits.dev/r/<Name>-TS-TW` 重新拉取覆盖。

---

## 说明

- 题目「掌握」、资料「收藏」这类状态目前只保存在页面内存里，刷新会重置；需要持久化时再接 `localStorage` 或后端。
- 站点无任何后端依赖，`data/` 里没有内容时所有页面显示空状态，不会报错。
- React Bits / React Bits Micro 组件版权归原作者，按其开源许可使用；本项目仅做落地与组合。
