# 资料存放目录

把这个页面的文件放进来，例如：

```
public/resources/
├── 数学/
│   ├── unit-1-review.pdf
│   └── unit-1-slides.pdf
└── 语文/
    └── reading-list.pdf
```

然后在 `data/knowledge.ts` 的 `resources` 数组里登记：

```ts
{
  id: 'r-001',
  title: '第一单元复习提纲',
  subjectId: 'math',
  type: 'pdf',
  href: '/resources/数学/unit-1-review.pdf',
  size: '1.2 MB',
  updatedAt: '2026-03-01',
}
```

注意：`href` 以 `/resources/` 开头（在 `public/` 之下，不需要写 `public`）。
如果部署到子路径（GitHub Pages 等），记得在 `href` 前面加上 `NEXT_PUBLIC_BASE_PATH`。
