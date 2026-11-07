# 班级知识库 · Class Knowledge Base

一个给班级用的知识库站点：**学习图谱、题库与错题本、资料库、常见问题** 四个入口。

> 内容全部放在 `content/`，每种内容一个目录，用 Markdown + frontmatter 维护；
> 页面里的空状态、筛选器、微交互都是真实可操作的，加文件就会长出来。

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
├── content/                 # 站点内容：全部是 Markdown + frontmatter
│   ├── knowledge/           # 知识库 vault：笔记、章节 index.md、_config/*.json
│   ├── graph/               # 学习图谱：subjects/ 与 concepts/
│   ├── quiz/                # 题库（错题本由浏览器本地保存）
│   ├── library/             # 资料条目（文件本体放 public/resources/）
│   └── faq/                 # 常见问题
├── lib/                     # 构建期加载器：vault.ts / content.ts / frontmatter.ts
├── data/site.ts             # 班级信息、导航、首页文案
├── public/resources/        # 课件、讲义原件放这里
└── tailwind.config.js
```

---

## 怎么添加内容

所有内容都在 `content/` 下，用 Markdown 维护，**不需要改组件代码**。新增文件后重新构建，页面就会自动出现。

### 通用规则（先看这里）

1. frontmatter 必须写在文件最开头，用上下两行 `---` 包住。
2. frontmatter 只支持三种写法：
   - 单值：`title: 标题`
   - 内联数组：`tags: [基础, 进阶]`
   - 块级数组：

     ```yaml
     tags:
       - 基础
       - 进阶
     ```

3. 不支持嵌套对象、多行字符串和 HTML。值里可以带冒号；**值里含逗号时必须用引号包住**，否则会被当成数组切分。
4. 以 `_` 或 `.` 开头的文件/目录不参与加载；`_README.md`、`README.md` 只是写给人看的说明。
5. 站点是静态导出，没有运行时读取。改完要 `npm run build`（或运行 `deploy.bat`）才会生效。

### 1. 知识库笔记（`content/knowledge/`）

**一个 `.md` 文件 = 一篇笔记**。目录层级决定左侧导航树；目录里的 `index.md` 代表这个目录本身。

```
content/knowledge/
├── index.md                  # 知识库首页（可选）
├── 智能电子书/
│   ├── index.md              # 第一章（目录节点）
│   ├── 01-认识智能电子书/
│   │   ├── index.md          # 1.1 这一节的目录节点
│   │   └── 1.1-什么是智能电子书.md
│   └── ...
└── _config/                  # 章节配置，只在构建时读取，不显示
```

笔记的 frontmatter：

```md
---
slug: ch-01-1
title: 什么是智能电子书
description: 一句话摘要，会出现在列表和搜索结果里。
tags: [智能电子书, 基础]
order: 1
chapter: 01-认识智能电子书
updated: 2026-10-01
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `slug` | 建议必填 | 唯一，决定地址 `/knowledge/<slug>/` |
| `title` | 是 | 标题、导航显示名、双链匹配名 |
| `description` | 否 | 摘要 |
| `tags` | 否 | 数组，也可在正文写 `#标签` |
| `order` | 否 | 同级排序，越小越靠前；不写按标题排序 |
| `chapter` | 否 | 所属章节，仅作展示 |
| `updated` | 否 | 更新时间，如 `2026-10-01` |

关于 `slug`：不写会自动取文件名去掉序号（`1.1-什么是智能电子书.md` → `什么是智能电子书`），中文会直接进 URL。建议显式写英文或短横线，且**所有笔记的 slug 不能重复**。

正文支持：

- 双链：`[[笔记标题]]`、`[[slug]]`、`[[标题|自定义文字]]`
- 标签：`#智能电子书`
- 题目块，页面里可一键加入错题本：

  ```md
  <question>
  题干……
  答案：……
  解析：……
  </question>
  ```

章节级配置（可选，都在 `content/knowledge/_config/`）：

- `vault.json`：`{ "title": "...", "description": "..." }` 知识库标题与简介
- `chapter-order.json`：`{ "root": "<index slug>", "chapters": [{ "slug": "...", "title": "...", "order": 1, "parent": "..." }] }` 控制章节顺序
- `chapter-links.json`：`{ "links": { "<章节 index 的 slug>": { "prerequisites": ["slug"], "next": ["slug"], "related": ["slug"] } } }` 笔记底部的「先读这些 / 接下来读 / 相关章节」
- `tag-map.json`：`{ "tags": { "标签": { "color": "#3b82f6", "chapters": ["slug"] } } }` 标签颜色

### 2. 学习图谱（`content/graph/`）

分两部分：学科和概念。

**学科** `content/graph/subjects/*.md`：

```md
---
id: math
name: 数学
color: '#3b82f6'
---
```

**概念** `content/graph/concepts/**/*.md`：

```md
---
id: linear-function
label: 一次函数
subject: math
prerequisites: [coordinate-system]
level: 1
summary: 形如 y = kx + b（k ≠ 0）的函数，图像是一条直线。
tags: [函数]
---
```

- `id` 必须唯一；`prerequisites` 填**概念 id**（不是标题），图谱据此画箭头。
- `subject` 填学科的 `id`。
- `level` 只认 1 / 2 / 3；不写时按目录名推断：`基础/入门` → 1、`进阶/提高` → 2、`拓展/高级` → 3。
- 前置依赖不能成环。
- 正文可留空，`summary` 不写会取正文首段。

### 3. 题库（`content/quiz/`）

每道题一个 `.md`，可以按 `数学/`、`期中/` 等子目录分类。

```md
---
id: q-001
subject: math
stem: 已知一次函数 y = 2x - 3，求它与 x 轴的交点。
options: ['(1.5, 0)', '(0, -3)', '(3, 0)', '(-1.5, 0)']
answer: (1.5, 0)
explanation: 令 y = 0，解得 x = 1.5。
difficulty: 1
concept: linear-function
source: 课本例题
mastered: false
---
```

- `options` 必须是数组；**含逗号或括号的选项一定用单引号包住**，否则会被逗号切开。
- `difficulty` 只认 1 / 2 / 3，代表难度。
- `concept` 填概念 `id`，用于题目与概念对应。
- `mastered` 只是初始状态；页面上的「已掌握」勾选只存在内存里，刷新会重置。
- 错题本（`/mistakes`）的数据保存在浏览器 localStorage（键 `class-kb-mistakes-v1`），增删改和导入导出都在本地，**不会回写这些 Markdown**。

### 4. 资料库（`content/library/`）

每份资料一个 `.md` 登记条目，**文件本体放 `public/resources/`**。

```md
---
title: 第一单元复习提纲
subject: math
type: pdf
href: /resources/unit-1-review.pdf
size: 1.2 MB
updatedAt: 2026-03-01
description: 覆盖一次函数与方程。
---
```

- `type` 只认 `pdf` / `slide` / `doc` / `video` / `link`；写别的值（例如 `txt`）会按 `link` 显示。
- `href` 以 `/resources/` 开头，对应 `public/resources/` 下的文件；也允许填外部链接。
- `subject` 填学科 `id`，用于筛选。
- 正文和 `description` 二选一即可。

### 5. 常见问题（`content/faq/`）

每个问题一个 `.md`，可按分类建子目录（`作业/`、`考试/`、`方法/`）。

```md
---
question: 错题本该怎么用才有效？
category: 方法
---
每道错题只记三件事：错因、正确思路、同类题一道。
```

- `question` 是问题，**正文就是答案**，不需要额外的 `answer` 字段。
- `category` 用于页面上的分类标签；不写则不显示标签。
- 子目录只用于文件整理，不会改变分组；分类以 `category` 为准。

### 6. 加完后自检

1. `npm run dev`，打开对应页面确认新条目出现；
2. 知识库笔记直接访问 `/knowledge/<slug>/` 不应 404；
3. 图谱缺箭头，通常是 `prerequisites` 写成了标题而不是概念 `id`；
4. `npm run build` 无报错，再按下面的「部署与推送」发布。

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
