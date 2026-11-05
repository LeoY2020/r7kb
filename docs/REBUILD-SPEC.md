# 班级知识库 · 改版规范（REBUILD-SPEC）

> 本文件是多人协作的共享契约。任何成员在写代码前先读这里；接口、目录、样式 token 以本文件为准。
> 不要修改本文件以外的成员文件；不要新增 npm 依赖（本项目离线运行，Next 14 + React 18 + motion + tailwind 已够用）。

## 一、目标变更

1. **深色模式**：跟随系统 + 手动切换，持久化到 localStorage（键名 `class-kb-theme`，值 `light`/`dark`），无闪烁。
2. **内容拆分目录**：原来的 `data/knowledge.ts` 拆成 `content/` 下按模块分目录的 Markdown（Obsidian 风格，frontmatter 元数据）+ 构建期加载器。
3. **新增「知识库」选项卡**：`/knowledge/`，内容是一个 Obsidian 目录 `content/knowledge/`，存放「智能电子书」；目录父子关系即层级（父目录级别更高）；支持 Obsidian `[[双链]]`（自动转 URL）与 `#标签`；`_config/` 下放章节关联配置文件，**不显示在网页中**。
4. **错题本前端可编辑**：localStorage 持久化；知识库中 `<problem>` / `<question>` 块可一键复制/加入错题本；支持自定义添加、导入/导出 JSON。
5. **删除 Dock 栏**：只保留顶部导航。

## 二、设计 Token（深色模式）

- 主题通过 `<html data-theme="light|dark">` 切换；Tailwind 颜色全部走 CSS 变量（见 `tailwind.config.js` + `app/globals.css`）。
- 可用的 Tailwind 颜色 token（**只准用这些**，禁止 `bg-white`、`bg-black/...`、`text-[#...]` 等写死浅色）：
  `page` `surface` `elevated` `ink` `ink-muted` `ink-faint` `accent` `accent-hover` `accent-soft` `accent-deep` `mint` `iris` `rose` `line`
- 常用类：`bg-page` `bg-surface` `bg-elevated` `text-ink` `text-ink-muted` `text-ink-faint` `border-line` `bg-accent-soft` `text-accent`；透明叠加用 `bg-surface/70`、`bg-ink/[0.04]` 这类 token 写法。
- 组件内联颜色（给 React Bits / Micro 传色值）请传 CSS 变量字符串：`var(--accent)`、`var(--surface)`、`var(--page)`、`var(--ink-muted)`、`var(--line)` 等。
- 已有卡片类：`.card` `.card-quiet` `.card-hover` `.glass` `.pill` `.btn-primary` `.btn-secondary` `.btn-quiet` `.eyebrow` `.lede`；优先复用。

## 三、内容目录（需求 2）

```
class-kb/content/
├── graph/
│   ├── subjects/*.md          # 学科
│   └── concepts/**/*.md       # 概念；目录层级 = 层级（基础/进阶/拓展 或 任意目录，frontmatter level 优先）
├── quiz/**/*.md               # 题目；目录任意（建议 学科/考试）
├── library/**/*.md            # 资料条目
├── faq/**/*.md                # 问答
└── knowledge/                 # 知识库（Obsidian vault，见第五节）
```

- 所有 `_README.md` 与 `_` / `.` 开头的文件/目录不参与加载（用于说明与配置）。
- Markdown 由 `lib/frontmatter.ts` 解析，格式为 YAML 子集：`key: value`、行内数组 `[a, b]`、块数组（`- item`），支持引号、布尔、数字。
- 加载器 `lib/content.ts` 只允许在服务端组件 / 构建期使用（`node:fs`）；客户端组件只能通过 props 拿数据。
- 类型统一放在 `lib/types.ts`（`data/knowledge.ts` 已废弃）。

### frontmatter 字段

学科 `content/graph/subjects/*.md`：
```yaml
---
id: math            # 可选，缺省用文件名
name: 数学           # 可选，缺省用文件名
color: '#0071e3'    # 可选
---
```

概念 `content/graph/concepts/**/*.md`：
```yaml
---
id: linear-function      # 可选，缺省用相对路径
label: 一次函数           # 可选，缺省用文件名
subject: math            # 必填（学科 id）
summary: 形如 y = kx + b 的函数。   # 可选，缺省取正文首段
prerequisites: [coordinate-system]  # 可选
level: 1                 # 1/2/3，缺省由目录名（基础/进阶/拓展）推断，再缺省 1
tags: [函数]
---
正文可写解释，仅取首段作 summary（若无 summary）。
```

题目 `content/quiz/**/*.md`：
```yaml
---
id: q-001
subject: math
stem: 已知一次函数……        # 可选，缺省取正文
options: ['A. …', 'B. …']
answer: (1.5, 0)
explanation: 令 y = 0……
difficulty: 1              # 1/2/3
concept: linear-function
mastered: false
source: 10 月月考 第 12 题
tags: [函数]
---
```

资料 `content/library/**/*.md`：
```yaml
---
id: r-001
title: 第一单元复习提纲
subject: math
type: pdf                  # pdf|slide|doc|video|link
href: /resources/unit-1-review.pdf
size: 1.2 MB
updatedAt: 2026-03-01
description: ……
tags: [复习]
---
```

FAQ `content/faq/**/*.md`：
```yaml
---
id: faq-001
category: 方法
question: 错题本怎么用？      # 可选，缺省取文件名
---
回答正文（Markdown 纯文本）。
```

## 四、知识库（需求 3）

### 目录结构（`content/knowledge/` 本身是一个 Obsidian vault）

```
content/knowledge/
├── _config/                        # 不显示在网页中
│   ├── vault.json                  # vault 标题/描述
│   ├── chapter-order.json          # 章节顺序与父子
│   ├── chapter-links.json          # 章节关联（前置/后续/相关）
│   └── tag-map.json                # 标签定义与所属章节
├── index.md                        # vault 首页（根笔记）
└── 智能电子书/
    ├── index.md                    # 卷首页
    └── 01-认识智能电子书/
        ├── index.md                # 章首页
        ├── 1.1-什么是智能电子书.md
        └── 1.2-五级智能电子书.md
```

- 目录层级即父子关系：父目录代表更高层级/更宽主题，子目录/子笔记级别更低。侧栏树按此渲染。
- 每个 `.md` 必须有 frontmatter `slug`（ASCII，全局唯一，用于 URL：`/knowledge/<slug>/`）；`title` 缺省用文件名。
- 根 `index.md` 的 slug 固定为 `itb-index`（可自定义，但需与 `chapter-order.json` 一致）。
- `_config` 下配置**不渲染为页面、不出现在侧栏**，但会被加载并用于「章节关联」面板。

笔记 frontmatter：
```yaml
---
slug: what-is-intelligent-textbook
title: 什么是智能电子书
description: 一句话导语
tags: [基础, 电子书]
order: 1
chapter: 01-认识智能电子书
updated: 2026-10-01
---
```

### `_config` 文件格式（JSON）

`vault.json`：
```json
{ "title": "智能电子书知识库", "description": "…", "author": "…", "source": "ibook-skills-main" }
```

`chapter-order.json`（父目录/章节层级；`parent` 为父章节 slug，根为 `null`）：
```json
{ "root": "itb-index", "chapters": [
  { "slug": "ch-01", "title": "认识智能电子书", "order": 1, "parent": "itb-index" }
] }
```

`chapter-links.json`（章节关联；slug → 关系数组）：
```json
{ "links": {
  "ch-01": { "prerequisites": [], "next": ["ch-02"], "related": ["ch-05"] }
} }
```

`tag-map.json`：
```json
{ "tags": { "学习图谱": { "color": "#0071e3", "chapters": ["ch-02"] } } }
```

### Markdown 渲染

- 不引入新依赖，手写轻量渲染（`lib/markdown.ts`）：标题（h2–h6，带 id）、段落、粗体/斜体/行内代码、链接、图片、有序/无序列表、引用、分隔线、围栏代码块、表格、任务列表。
- **Obsidian 双链**：`[[目标]]`、`[[目标|别名]]`、`[[目标#标题|别名]]` → 解析到笔记 slug 后输出 `<a href="/knowledge/<slug>/">`；无法解析时输出带 `data-broken` 的 span。解析依据：slug / title / 文件名（去掉 `数字.` 前缀）。章节关联不变（关联面板仍按 slug 展示）。
- **`#标签`**：正文中的 `#标签` → 可点击 chip，链接到 `/knowledge/tags/?tag=<标签>`；章节关联不变。
- **题目块**：`<problem>…</problem>` 与 `<question>…</question>` 整块交给 `<ProblemBlock raw={...} source={...} />`（客户端组件）渲染，可复制/加入错题本。题目块内部约定：`答案：`、`解析：` 起头的行分别作为答案与解析，其余为题干。
- 渲染结果按块返回：`{ type: 'html', html }` 或 `{ type: 'problem', raw }`，由页面分别 `dangerouslySetInnerHTML` 或交给组件。

### 页面

- `/knowledge/`：知识库首页（vault 概览 + 章节关联图/列表 + 最近更新 + 标签云）。
- `/knowledge/[slug]/`：笔记页（面包屑、标题、标签、正文、章节关联、反向链接、上一篇/下一篇）。`generateStaticParams` 返回全部 slug。
- `/knowledge/tags/`：按 `?tag=` 客户端筛选（用 `Suspense` 包 `useSearchParams` 以适配静态导出）。
- 共用 `app/knowledge/layout.tsx`：左侧 vault 目录树（可折叠、可搜索、父级在上），右侧内容。移动端树收起。

## 五、错题本（需求 4）

### 数据（客户端 localStorage）

- 键：`class-kb-mistakes-v1`，值为 `Mistake[]` JSON。
- 类型（写在自己的模块里，例如 `lib/mistakes.ts`；如放 `lib/` 请叫 `mistakes-*.ts` 避免与 Lead 文件冲突）：
```ts
type Mistake = {
  id: string;              // crypto.randomUUID()（带兜底）
  stem: string;
  answer?: string;
  explanation?: string;
  subject?: string;
  source?: string;         // 来源（如章节名 / 题号）
  tags?: string[];
  createdAt: string;       // ISO
  updatedAt?: string;
  mastered?: boolean;
  from?: { slug?: string; title?: string } | null;  // 来自知识库哪个笔记
};
```
- 用 React Context（`MistakesProvider`）同时服务 `/mistakes/` 与知识库题目块；Provider 在页面内局部包裹即可（不要改 `app/layout.tsx`）。
- 导出：下载 `.json`（`Blob` + `URL.createObjectURL`），文件名 `class-kb-mistakes-YYYYMMDD.json`。
- 导入：`<input type="file" accept=".json">` 读取并合并（按 id 去重，缺字段做校验，坏条目跳过并提示数量）；也支持粘贴 JSON。
- 数据变化要跨标签页同步（`storage` 事件）与首屏水合（`useEffect` 读取，避免 SSR mismatch）。

### 页面 `/mistakes/`

- 统计（总计/未掌握/今日新增），学科、来源、标签筛选，搜索。
- 卡片列表：题干、答案/解析折叠、标记掌握、编辑、删除、复制。
- 「添加错题」表单：题干（必填）、答案、解析、学科、来源、标签。
- 导入 / 导出 / 清空（二次确认）按钮。
- 空状态使用 `components/site/EmptyState`。

### `components/knowledge/ProblemBlock.tsx`

```tsx
export function ProblemBlock({ raw, source }: { raw: string; source?: string }) { ... }
export default ProblemBlock;
```
- 展示题干/答案/解析；按钮「复制题目」「加入错题本」；已加入后显示状态。
- 复制用 `navigator.clipboard.writeText`，失败时 `document.execCommand('copy')` 兜底。
- 必须在无 Provider 时也能渲染（按钮提示"已加入"或独立使用 `MistakesProvider` 局部包裹由知识页面负责）。

## 六、导航与首页（Lead 负责）

- 顶部导航顺序：学习图谱 `/graph/`、知识库 `/knowledge/`、题库 `/quiz/`、错题本 `/mistakes/`、资料库 `/library/`、常见问题 `/faq/`。
- 删除 `components/site/FloatingDock.tsx` 与 `components/reactbits/Dock.tsx`，页面底部不再有 Dock。
- 首页模块卡、文案、统计同步更新为 6 个入口。

## 七、协作边界

| 成员 | 只能写 |
| --- | --- |
| Lead | `lib/types.ts`、`lib/frontmatter.ts`、`lib/content.ts`、`app/layout.tsx`、`app/page.tsx`、`app/{graph,quiz,library,faq,not-found}`、`components/site/*`、`components/home/*`、`components/graph/*`、`components/library/*`、`components/quiz/*`、`data/site.ts`、`tailwind.config.js`、`app/globals.css`、`content/{graph,quiz,library,faq}`、README |
| knowledge-vault | `lib/vault.ts`、`lib/markdown.ts`、`app/knowledge/**`、`components/knowledge/**`（ProblemBlock 除外） |
| mistake-book | `lib/mistakes*.ts`、`app/mistakes/**`、`components/mistakes/**`、`components/knowledge/ProblemBlock.tsx` |
| ebook-author | `content/knowledge/**` |

- 不修改别人负责的文件；需要接口变更先发消息给 Lead。
- 不在共享文件里加 import 其他人的组件，除非接口在本规范里已定义。
- 完成后运行 `npx tsc --noEmit`（项目根 `class-kb/`）；不要运行 `npm run build` 抢构建（Lead 统一构建）。
- 不要提交/删除 `out/`、`.next/`、`node_modules/`。
