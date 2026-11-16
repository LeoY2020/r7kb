# 知识库 Markdown 格式规范

本文件是 `content/knowledge/` 的格式契约。按此规范写的笔记会被构建期加载器读取；题目块会自动并入站内题库（`/quiz`），无需再复制到 `content/quiz/`。

## 1. 文件与目录

- 每篇笔记是一个 `.md` 文件，放在 `content/knowledge/` 下的任意目录。
- 目录里的 `index.md` 代表这个目录本身（章节目录的 `index.md` 就是章节首页）。
- 以 `_` 或 `.` 开头的文件 / 目录不参与加载；`_config/` 只存章节顺序、关联等配置。
- 文件名可带序号（`1.1-什么是智能电子书.md`），正式标题以 frontmatter 的 `title` 为准。

## 2. 文件头（frontmatter）

用 `---` 包起来，必须是文件最开头：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `slug` | 是 | string | 唯一标识，决定网址 `/knowledge/<slug>/` 与题目 id 前缀 |
| `title` | 是 | string | 笔记标题，也是图谱节点名 |
| `description` | 否 | string | 一句话简介，显示在标题下与图谱里 |
| `tags` | 否 | string[] | 标签，支持图谱「标签」开关与标签页 |
| `order` | 否 | number | 同级排序，越小越靠前，缺省 9999 |
| `chapter` | 否 | string | 所属章节名，仅用于展示 |
| `updated` | 否 | string | 更新日期，`YYYY-MM-DD` |

```yaml
---
slug: ch-01-1
title: 什么是智能电子书
description: 从「书即结构」出发，给出智能电子书的三要素定义。
tags: [智能电子书, 基础, 学习图谱]
order: 1
chapter: 01-认识智能电子书
updated: 2026-10-01
---
```

## 3. 正文语法

除下面列出的扩展外，**与 Markdown 一样**：

- 标题、段落、加粗、斜体、删除线、列表、有序列表、表格、引用、分割线、行内代码、代码块、链接、图片：与 Markdown 一样。
- 数学公式：与 Markdown 一样写 `$...$` 或 `$$...$$`。
- 文件内链接：与 Obsidian 一样写 `[[笔记标题]]` 或 `[[笔记标题|显示文字]]`。
- 标签：与 Obsidian 一样写 `#标签`（中文标签直接跟在 `#` 后），标题行里的 `#` 按标题处理。

```md
## 一、骨架：结构化概念

**智能电子书**是一种以结构化概念为骨架的数字教材，详见 [[五级智能电子书|五级模型]]。
```

## 4. 题目块

题目写在 `<question> … </question>` 里。一个块 = 一道题，**每道题都会自动进入题库**。

### 4.1 开始标签属性

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 否 | 题目唯一 id。不写时自动生成 `<笔记 slug>-q<序号>`，如 `ch-01-1-q1` |
| `difficulty` | 否 | 难度 `1` / `2` / `3`，默认 `1` |
| `subject` | 否 | 学科 id，默认 `智能电子书` |

### 4.2 块内标签

| 内容 | 标签 | 说明 |
| --- | --- | --- |
| 选项 | `<section tag="A">…</section>` | 用 `tag` 写选项字母；多个选项按 `tag` 排序 |
| 答案 | `<answer>…</answer>` 或 `<ans>…</ans>` | 必填 |
| 解析 | `<explain>…</explain>` 或 `<exp>…</exp>` | 选填 |
| 知识点 | `<kn>…</kn>` | 可写多个；会作为题目标签，第一个作为主要知识点 |
| 填空空位 | `<sp>…</sp>` 或 `<space>…</space>` | 题干里的空位，显示为 `____`；标签内文字可作为答案兜底 |

### 4.3 题目类型（自动判断）

| 类型 | 判断依据 | 答案写法 |
| --- | --- | --- |
| 单选题 | 只有一个 `<section>` 选项且答案是单字母 | `B` |
| 多选题 | 多个选项 + 多个答案字母 | `A,C` 或 `AC` |
| 判断题 | 没有选项、回答对错 | `对` / `错` |
| 填空题 | 题干含 `<sp>` | 依次写各空答案，如 `content.opf` |
| 解答题 / 简答 | 没有选项、没有空位 | 一段文字 |

### 4.4 示例

单选题：

```md
<question id="ch-01-1-q1" difficulty="1">
EPUB 3 里负责声明「哪份文件是正文」的文件是：

<section tag="A">mimetype</section>
<section tag="B">content.opf</section>
<section tag="C">nav.xhtml</section>
<section tag="D">toc.ncx</section>

<kn>EPUB 3 容器结构</kn>
<answer>B</answer>
<explain>content.opf 是包文档，声明 spine 顺序；mimetype 只标识媒体类型。</explain>
</question>
```

多选题：

```md
<question difficulty="2">
以下哪些属于智能电子书的三要素？

<section tag="A">结构化概念</section>
<section tag="B">可测量学习目标</section>
<section tag="C">固定排版</section>
<section tag="D">可反馈交互</section>

<kn>智能电子书定义</kn>
<ans>ABD</ans>
<exp>固定排版是传统电子书的特征，不是三要素。</exp>
</question>
```

判断题：

```md
<question>
判断：只要每章都有小测验，就已经是智能电子书。

<kn>智能电子书定义</kn>
<answer>错</answer>
<explain>有测验只说明具备交互，缺少概念结构以及测验与概念的绑定。</explain>
</question>
```

填空题：

```md
<question difficulty="2">
EPUB 的包文档叫 <sp>content.opf</sp>，阅读顺序写在它的 <space>spine</space> 元素里。

<kn>EPUB 3 容器结构</kn>
<answer>content.opf / spine</answer>
</question>
```

解答题（可省略 `<answer>` 以外的结构）：

```md
<question>
有人说「我们的书每章都有小测验，所以已经是智能电子书了」。这个说法缺了什么？

<kn>智能电子书定义</kn>
<answer>缺的是概念结构，以及测验与概念的绑定。</answer>
<explain>测验若不能指向具体概念，就只能给出对错，无法诊断读者卡在哪一步。</explain>
</question>
```

## 5. 校验规则

构建（`npm run build`）时会检查，出错会打印笔记路径和题号：

- 题干不能为空；
- 答案不能为空（`<answer>` / `<ans>`，填空题可由 `<sp>` 内容兜底）；
- 题目 `id` 全局唯一，不能与 `content/quiz/*.json` 或其它笔记冲突；
- `<section>` 的 `tag` 建议按 `A`、`B`、`C`… 顺序写，页面按 `tag` 排序展示；
- 选项答案既可以写字母（`B`、`AC`），也可以直接写选项原文，构建时会归一成字母。

### 旧写法兼容

没有 `<answer>` 标签时，会继续读取块内的「答案：」和「解析：」行：

```md
<question>
这个说法缺了什么？
答案：缺的是概念结构。
解析：有测验不等于能诊断。
</question>
```

新写的题目请统一使用标签写法，旧写法只用于兼容历史笔记。
