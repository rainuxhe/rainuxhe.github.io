---
title: "深层叶子页面"
description: "检查图片、HTML、提示块、Mermaid 与深层侧栏。"
icon: "article"
weight: 40
toc: true
---

## 图片

![Bookstack 图标](/images/logos/mark.svg "Markdown 图片标题测试")

## 原生 HTML

<details>
  <summary>展开原生 HTML 内容</summary>

  这段内容位于 `<details>` 元素中，用于检查 Goldmark 的 unsafe HTML 渲染。

  - 支持列表
  - 支持 **Markdown 与 HTML 混排**
</details>

## Mermaid

```mermaid
flowchart LR
    A[Markdown] --> B[Goldmark]
    B --> C[HTML]
    C --> D[Bookstack]
```

## 主题提示块

{{< alert context="info" text="这是一个 info 提示块，用于检查短代码渲染。" />}}

{{< alert context="warning" text="这是一个 warning 提示块，正文支持 **Markdown** 和 `行内代码`。" />}}

## 深层的脚注与链接

当前页面位于 `/docs/markdown-test/structured/deep/level-three/leaf/`，可以返回[基础文本页](/docs/markdown-test/basic/text/)继续检查。[^deep]

[^deep]: 如果本脚注显示正常，说明深层页面的 Markdown 解析与普通页面一致。
