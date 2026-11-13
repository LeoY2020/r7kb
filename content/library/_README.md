# 资料库内容（JSON）

条目登记在 `items.json` 里，**文件本体放 `public/resources/`**。所有资料共用一张表，加一份就加一个对象。

```json
{
  "resources": [
    {
      "id": "unit-1-review",
      "title": "第一单元复习提纲",
      "subject": "math",
      "type": "pdf",
      "href": "/resources/unit-1-review.pdf",
      "size": "1.2 MB",
      "updatedAt": "2026-03-01",
      "description": "覆盖一次函数与方程。",
      "tags": ["复习"]
    }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 资料标题 |
| `href` | 是 | 以 `/resources/` 开头对应 `public/resources/` 下的文件；也允许外部链接 |
| `type` | 是 | 只能是 `pdf` / `slide` / `doc` / `video` / `link` |
| `id` | 否 | 不写会从 `href` 的文件名推断；重复会报错 |
| `subject` | 否 | 学科 id，用于筛选 |
| `size` | 否 | 展示用的大小，如 `2.4 MB` |
| `updatedAt` | 否 | 日期，如 `2026-03-01` |
| `description` | 否 | 一句话说明 |
| `tags` | 否 | 标签数组 |

注意事项：

- `type` 写错（例如 `txt`）会让构建报错，不再像以前那样静默显示成「链接」。
- 条目的顺序就是页面上的默认顺序，想置顶就挪到数组前面。
- 本文件以下划线开头，不会被加载。
