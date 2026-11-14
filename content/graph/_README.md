# 学习图谱内容

图谱不再单独维护概念与边，直接由知识库生成：

- **节点**：`content/knowledge/` 里每个章节目录的 `index.md`
- **顺序**：`content/knowledge/_config/chapter-order.json`
- **边**：`content/knowledge/_config/chapter-links.json` 的 `prerequisites` / `next`（实线箭头）与 `related`（虚线）

改章节标题、描述或关联关系时只改上面两处，`/graph` 会在构建时自动重建。

## 学科（可选）

`content/graph/subjects/*.md` 只用于题库与资料页的学科筛选与配色，不参与学习图谱：

```md
---
id: math
name: 数学
color: '#3b82f6'
---
```
