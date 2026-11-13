# 题库内容（JSON）

一个学科一个 `.json` 文件，文件名随意（建议用学科 id，如 `math.json`）。文件里一次性放这门学科的所有题，**不要一题一个文件**。

```json
{
  "subject": "math",
  "questions": [
    {
      "id": "q-001",
      "stem": "已知一次函数 y = 2x - 3，求它与 x 轴的交点。",
      "options": ["(1.5, 0)", "(0, -3)", "(3, 0)", "(-1.5, 0)"],
      "answer": "(1.5, 0)",
      "explanation": "令 y = 0，解得 x = 1.5。",
      "difficulty": 1,
      "conceptId": "linear-function",
      "source": "课本例题",
      "mastered": false,
      "tags": ["一次函数"]
    }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `subject`（顶层） | 是 | 学科 id，作为本文件所有题的默认学科 |
| `questions[].id` | 是 | 全局唯一，例如 `q-001` |
| `questions[].stem` | 是 | 题干；多行直接用 `\n`，写公式、代码都不受限制 |
| `questions[].subject` | 否 | 覆盖顶层学科 |
| `questions[].options` | 否 | 选项数组；判断/填空/解答题可省略 |
| `questions[].answer` | 否 | 参考答案 |
| `questions[].explanation` | 否 | 解析 |
| `questions[].difficulty` | 否 | 只能是 `1` / `2` / `3`，默认 1 |
| `questions[].conceptId` | 否 | 关联的概念 id，可从图谱跳到题目 |
| `questions[].mastered` | 否 | 初始掌握状态，默认 `false` |
| `questions[].source` | 否 | 来源，如「10 月月考 第 12 题」 |
| `questions[].tags` | 否 | 标签数组 |

注意事项：

- JSON 不支持注释、不支持尾逗号；字符串里的换行要写成 `\n`。
- 字段写错、id 重复、`difficulty` 越界都会让 `npm run build` 直接报错，并指出是哪个文件的第几题。
- 错题本（`/mistakes`）的数据存在浏览器 localStorage（键 `class-kb-mistakes-v1`），**不会回写这些 JSON**。
- 本文件以下划线开头，不会被加载。
