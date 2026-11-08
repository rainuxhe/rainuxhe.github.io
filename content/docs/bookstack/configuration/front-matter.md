---
title: "Front Matter"
description: "页面标题、描述、图标、草稿状态和 KaTeX 等单页配置。"
icon: "data_object"
weight: 40
toc: true
---

## 常用字段

```yaml
---
title: "页面标题"
description: "页面摘要"
icon: "article"
weight: 10
draft: false
toc: true
---
```

| 字段 | 作用 |
|---|---|
| `title` | 页面标题 |
| `description` | 标题下摘要和搜索索引描述 |
| `icon` | Material Icons 图标名称 |
| `weight` | 同级页面排序 |
| `draft` | 是否需要 `hugo serve -D` 才构建 |
| `toc` | 是否显示本页目录 |
| `katex` | 是否加载 KaTeX |
| `url` | 覆盖 Hugo 默认生成的 URL |

## 文档归属

文档根 `_index.md` 必须设置 `docId`，并级联到子页面：

```yaml
params:
  docId: "bookstack"
cascade:
  params:
    docId: "bookstack"
```

这样侧栏、面包屑、前后页和搜索结果才会限制在当前文档中。

## 数学公式

只有设置以下字段的页面才会加载 KaTeX：

```yaml
katex: true
```

```markdown
行内公式：$E=mc^2$

独立公式：

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$
```

## 覆盖 URL

页面默认 URL 由内容目录决定。例如：

```text
content/posts/about.md
```

默认生成 `/posts/about/`。可以手动覆盖：

```yaml
url: "/about/"
```

修改后要同步调整菜单链接。
