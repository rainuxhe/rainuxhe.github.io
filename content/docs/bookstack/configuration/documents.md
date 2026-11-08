---
title: "多文档配置"
description: "通过 params.documents 注册文档并生成切换器。"
icon: "library_books"
weight: 50
toc: true
---

## 注册文档

每套文档在 `hugo.yml` 的 `params.documents` 中登记：

```yaml
params:
  documents:
    - id: "bookstack"
      title: "BookStack"
      path: "/docs/bookstack/"
      description: "BookStack 使用手册"
      icon: "menu_book"
      weight: 30
```

| 字段 | 含义 |
|---|---|
| `id` | 文档唯一 ID |
| `title` | 下拉器和首页显示名称 |
| `path` | 文档根页面路径 |
| `description` | 卡片与切换器说明 |
| `icon` | Material Icons 图标 |
| `weight` | 文档排序 |

## 新增一套文档

1. 创建 `content/docs/example/_index.md`。
2. 设置一致的 `docId` 和级联参数。
3. 在 `params.documents` 中新增一项。
4. 运行 Hugo；构建期会检查路径和 ID 是否有效。

```yaml
---
title: "Example"
params:
  docId: "example"
cascade:
  params:
    docId: "example"
---
```

文档 ID、文档路径都必须唯一。切换器始终跳转到目标文档根页面。

## 搜索

搜索索引会自动包含所有设置了 `docId` 的普通内容页。结果中的文档标签来自 `params.documents` 的 `title`。
