---
title: "表格与代码"
description: "检查表格对齐、长内容换行和多语言代码块。"
icon: "table"
weight: 30
toc: true
---

## 对齐表格

| 左侧 | 居中 | 右侧 |
| :--- | :---: | ---: |
| `FastAPI` | GET | 200 |
| `PostgreSQL` | SELECT | 1 |
| 较长内容 | 包含 **粗体** | `12.34` |

## Python

```python
from pathlib import Path


def count_markdown_files(root: Path) -> int:
    return sum(1 for _ in root.rglob("*.md"))


print(count_markdown_files(Path("content/docs")))
```

## JavaScript

```javascript
const pages = ["text", "lists", "tables"];

for (const page of pages) {
  console.log(`rendering: ${page}`);
}
```

## SQL

```sql
SELECT id, title, created_at
FROM pages
WHERE published = true
ORDER BY created_at DESC;
```

## Shell

```shell
hugo --gc --minify
hugo server --disableFastRender
```

## 纯文本

```text
┌─────────────┬──────────┐
│ document    │ status   │
├─────────────┼──────────┤
│ FastAPI     │ ready    │
│ PostgreSQL  │ ready    │
└─────────────┴──────────┘
```
