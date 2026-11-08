---
title: "短代码"
description: "Alert、Tabs、Table、KaTeX 和 Markdownify 短代码的参数与示例。"
icon: "integration_instructions"
weight: 85
toc: true
katex: true
---

Hugo 短代码使用双花括号调用。BookStack 提供以下短代码：

## 调用方式

短代码有两种分隔符：

- `{{</* ... */>}}`：内部按原始 HTML 处理。
- `{{%/* ... */%}}`：内部按 Markdown 处理。

短代码可以写成单标签：

```markdown
{{</* alert text="提示内容" /*/>}}
```

也可以成对使用：

```markdown
{{</* alert context="warning" */>}}
这里是一段提示。
{{</* /alert */>}}
```

## Alert

参数：

| 参数 | 必填 | 作用 |
|---|---:|---|
| `context` | 否 | `info`、`warning`、`success`、`danger`、`primary`、`default` |
| `icon` | 否 | 自定义 Material Icons 图标名称 |
| `text` | 否 | 单行提示内容，支持 Markdown |

使用 `text` 参数：

```markdown
{{</* alert context="info" text="这是一个 **info** 提示块。" /*/>}}
```

渲染结果：

{{< alert context="info" text="这是一个 **info** 提示块。" />}}

使用 Inner 内容：

```markdown
{{</* alert context="warning" */>}}
这里可以写多段内容。

- 支持列表
- 支持 `行内代码`
{{</* /alert */>}}
```

渲染结果：

{{< alert context="warning" >}}
这里可以写多段内容。

- 支持列表
- 支持 `行内代码`
{{< /alert >}}

其他颜色：

{{< alert context="success" text="操作成功。" />}}
{{< alert context="danger" text="操作失败，请检查配置。" />}}
{{< alert context="primary" text="主要提示。" />}}
{{< alert context="default" text="普通提示。" />}}

## Tabs

Tabs 由 `tabs` 和 `tab` 两个短代码组成。`tab` 必须放在 `tabs` 内，并使用 `%` 分隔符让内部 Markdown 正常渲染。

````markdown
{{</* tabs tabTotal="2" */>}}

{{%/* tab tabName="YAML" */%}}
```yaml
title: BookStack
```
{{%/* /tab */%}}

{{%/* tab tabName="TOML" */%}}
```toml
title = "BookStack"
```
{{%/* /tab */%}}

{{</* /tabs */>}}
````

参数：

| 短代码 | 参数 | 作用 |
|---|---|---|
| `tabs` | `tabTotal` | 标签页总数 |
| `tabs` | `tabRightAlign` | 需要右对齐的标签序号 |
| `tab` | `tabName` | 标签标题 |

渲染结果：

{{< tabs tabTotal="2" >}}
{{% tab tabName="YAML" %}}
```yaml
title: BookStack
```
{{% /tab %}}
{{% tab tabName="TOML" %}}
```toml
title = "BookStack"
```
{{% /tab %}}
{{< /tabs >}}

## Table

`table` 短代码的第一个位置参数会作为表格 class。

```markdown
{{</* table "table-striped" */>}}
| 名称 | 类型 |
|---|---|
| Hugo | SSG |
| Chroma | Highlighter |
{{</* /table */>}}
```

渲染结果：

{{< table "table-striped" >}}
| 名称 | 类型 |
|---|---|
| Hugo | SSG |
| Chroma | Highlighter |
{{< /table >}}

## KaTeX

普通公式可以直接写在 Markdown 中，但复杂数组、矩阵或大量反斜杠建议使用 `katex` 短代码。

```markdown
{{</* katex */>}}
$$
\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}
$$
{{</* /katex */>}}
```

参数：无。使用 `katex` 短代码的页面仍需在 front matter 中设置：

```yaml
katex: true
```

渲染结果：

{{< katex >}}
$$
\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}
$$
{{< /katex >}}

## Markdownify

`markdownify` 会渲染 Inner 中的 Markdown：

```markdown
{{</* markdownify */>}}
**粗体**、*斜体* 和 [链接](/docs/bookstack/)
{{</* /markdownify */>}}
```

渲染结果：

{{< markdownify >}}
**粗体**、*斜体* 和 [链接](/docs/bookstack/)
{{< /markdownify >}}
