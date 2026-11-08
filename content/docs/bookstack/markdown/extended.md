---
title: "扩展语法"
description: "表格、任务列表、原始 HTML、块属性和 Alert 短代码。"
icon: "extension"
weight: 80
toc: true
---

## 表格

| 功能 | 状态 | 说明 |
|---|---:|---|
| 搜索 | 完成 | JSON 按需加载 |
| 行号 | 完成 | 支持复制纯代码 |
| KaTeX | 完成 | 页面级启用 |

## 任务列表

- [x] Hugo Extended
- [x] Dart Sass
- [ ] 补充正式内容

## 原始 HTML

<details>
  <summary>展开更多内容</summary>

  允许使用 `<details>`、`<kbd>`、`<mark>` 等 HTML 元素。
</details>

键盘标记：<kbd>Ctrl</kbd> + <kbd>C</kbd>。

高亮：<mark>这是高亮文本</mark>

## 块级属性

开启 `markup.goldmark.parser.attribute.block` 后，可以给块级元素添加属性：

```markdown
## 带自定义 ID 的标题 {#custom-title .custom-class}
```

## Alert 短代码

{{< alert context="info" text="这是 info 提示块，支持 **Markdown** 和 `行内代码`。" />}}

{{< alert context="warning" text="这是 warning 提示块，适合标记风险和注意事项。" />}}
