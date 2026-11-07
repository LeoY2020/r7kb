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
| 输出 | `output: 'export'` 静态导出，`npm run build` 生成 `out/`，可直接丢到任意静态托管 |

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
npm run build      # 产物在 out/
npx serve out      # 本地预览静态产物（或任意静态服务器）
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

## 部署

### 静态托管（推荐）

```bash
npm run build
# 把 out/ 整个目录上传到任意静态托管
```

### 子路径部署（GitHub Pages 等）

```bash
NEXT_PUBLIC_BASE_PATH=/class-kb npm run build
```

`next.config.mjs` 会读取这个变量设置 `basePath` / `assetPrefix`。

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
