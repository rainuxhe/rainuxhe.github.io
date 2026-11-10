---
title: "站点配置"
description: "hugo.yml 和 hugo.toml 中的常用配置项。"
icon: "tune"
weight: 30
toc: true
---

## 基础配置

{{< tabs tabTotal="2">}}

{{% tab tabName="hugo.yml" %}}

```yaml
baseURL: "https://gh.heruos.top/"
locale: "zh-CN"
defaultContentLanguage: "zh"
title: "Bookstack"
theme: ["bookstack"]
```

{{% /tab %}}

{{% tab tabName="hugo.toml" %}}

```toml
baseURL = "https://gh.heruos.top/"
locale = "zh-CN"
defaultContentLanguage = "zh"
title = "Bookstack"
theme = ["bookstack"]
```

{{% /tab %}}

{{< /tabs >}}

Hugo 0.158 以后应使用 `locale`，不要继续使用已弃用的 `languageCode`。

## Hugo Modules

```yaml
module:
  hugoVersion:
    extended: true
    min: "0.169.0"
  imports:
    - path: "github.com/gohugoio/hugo-mod-bootstrap-scss/v5"
```

`hugoVersion` 用于阻止旧版本 Hugo 构建主题，`imports` 引入 Bootstrap SCSS。

## Markdown 与代码高亮

```yaml
markup:
  defaultMarkdownHandler: "goldmark"
  tableOfContents:
    startLevel: 1
    endLevel: 3
  highlight:
    noClasses: true
    lineNos: true
    lineNumbersInTable: false
  goldmark:
    renderer:
      unsafe: true
    parser:
      attribute:
        block: true
```

主要含义：

| 配置 | 作用 |
|---|---|
| `noClasses` | Chroma 使用内联样式输出颜色 |
| `lineNos` | 全局启用代码行号 |
| `lineNumbersInTable` | `false` 使用行内行号 |
| `unsafe` | 允许 Markdown 输出原始 HTML |
| `attribute.block` | 允许块级 Markdown 属性 |

如果启用 `noClasses: false`，必须提供完整的 Chroma token CSS。

## 输出格式

```yaml
outputs:
  home: ["HTML", "JSON"]
```

首页同时生成 `/index.json`，供 FlexSearch 按需加载搜索索引。

## 分类与标签

分类和标签使用 Hugo taxonomy，并通过 `permalinks` 控制聚合页与 term 页地址：

```yaml
taxonomies:
  category: categories
  tag: tags

permalinks:
  taxonomy:
    categories: /categories/
    tags: /tags/
  term:
    categories: /categories/:slug/
    tags: /tags/:slug/
```

聚合页的标题、图标和说明可以独立配置：

```yaml
params:
  taxonomies:
    categories:
      title: "分类"
      eyebrow: "Categories"
      description: "按分类浏览站点中的全部文档。"
      icon: "category"
    tags:
      title: "标签"
      eyebrow: "Tags"
      description: "按主题标签浏览站点中的全部文档。"
      icon: "sell"
```

修改聚合页地址时，需要同时调整 `permalinks.taxonomy` 和 `permalinks.term` 中的路径。

## 顶栏页面菜单

顶栏右侧的单页下拉器由 `params.page_menu` 控制：

```yaml
params:
  page_menu:
    label: "更多页面"
    icon: "apps"
    items:
      - name: "标签"
        url: "/tags/"
        icon: "sell"
      - name: "分类"
        url: "/categories/"
        icon: "category"
```

条目保持 YAML 中的顺序。`icon` 使用 Material Icons 名称；未配置 `page_menu` 或 `items` 为空时，主题不会渲染下拉器。

## 文档主题参数

```yaml
params:
  docs:
    title: "Bookstack"
    pathName: "docs"
    darkMode: true
    breadcrumbs: true
    toc: true
    tocMobile: true
    editPage: true
    repoURL: "https://github.com/rainuxhe/rainuxhe.github.io"
    repoBranch: "main"
```

完整参数和主题行为可在 `hugo.yml` 的 `params.docs` 下调整。

## 搜索参数

```yaml
params:
  flexsearch:
    enabled: true
    tokenize: "full"
    minQueryChar: 1
    maxResult: 8
```

`tokenize: full` 更适合中英文混合内容，但索引内存开销也会增加。
