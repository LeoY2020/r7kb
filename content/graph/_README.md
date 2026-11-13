# 学习图谱内容

分三部分：学科和概念用 Markdown（有正文可写），**先修关系单独写在 `edges.json`**（本质是边，不是正文）。

```
content/graph/
├── subjects/*.md          # 学科：id / name / color
├── concepts/**/*.md       # 概念：id / label / summary / level / tags
└── edges.json             # 先修边：谁是谁的前置
```

## 学科 `subjects/*.md`

```md
---
id: math
name: 数学
color: '#3b82f6'
---
```

## 概念 `concepts/**/*.md`

```md
---
id: linear-function
label: 一次函数
subject: math
level: 1
tags: [函数]
---
形如 y = kx + b（k ≠ 0）的函数，图像是一条直线。
```

- `id` 必须唯一，`edges.json` 用它来连边。
- `subject` 填学科的 `id`。
- `level` 只认 1 / 2 / 3；不写时按目录名推断：`基础/入门` → 1、`进阶/提高` → 2、`拓展/高级` → 3。
- 正文不写时取 frontmatter 的 `summary` 作为一句话定义。
- **不要在这里写 `prerequisites`**：写了会构建报错，统一挪到 `edges.json`。

## 先修边 `edges.json`

`from` 是 `to` 的前置：`from` → `to` 画一条箭头。

```json
{
  "edges": [
    { "from": "coordinate-system", "to": "linear-function" },
    { "from": "linear-function", "to": "quadratic-function", "note": "先掌握一次函数再看抛物线" }
  ]
}
```

- `from` / `to` 必须是已存在的概念 `id`，否则构建报错。
- 同一个 `from -> to` 只能写一次。
- 必须无环：如果绕一圈回到自己，构建会打印出整条环，先把概念拆细。

> 本文件以下划线开头，不会被加载。
