---
title: "数学公式"
description: "使用 KaTeX 渲染行内公式和独立公式。"
icon: "functions"
weight: 100
toc: true
katex: true
---

## 启用 KaTeX

页面 front matter 必须包含：

```yaml
katex: true
```

## 行内公式

质能方程：$E=mc^2$

欧拉恒等式：$e^{i\pi}+1=0$

## 独立公式

{{< katex >}}
$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$
{{< /katex >}}

矩阵示例：

{{< katex >}}
$$
\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
x+2y \\
3x+4y
\end{bmatrix}
$$
{{< /katex >}}
## 语法约定

- 行内公式使用单个美元符号：`$...$`
- 独立公式使用双美元符号：`$$...$$`
- 也可以使用 `\(...\)` 和 `\[...\]`

## 复杂公式

复杂公式如果包含大量反斜杠、`&` 对齐、矩阵或单独一行的 `=`，可能被 Goldmark 当作 Markdown 语法处理，导致转义丢失、TOC 出现额外标题，甚至公式无法解析。

这种情况下应使用 KaTeX 短代码，让内容以原始 TeX 形式输出：

```markdown
{{</* katex >}}
$$
\begin{array} {lcl}
  L(p,w_i) &=& \dfrac{1}{N}\Sigma_{i=1}^N(\underbrace{f_r(x_2
  \rightarrow x_1
  \rightarrow x_0)G(x_1
  \longleftrightarrow x_2)f_r(x_3
  \rightarrow x_2
  \rightarrow x_1)}_{sample\, radiance\, evaluation\, in\, stage2}
  \\\\\\ &=&
  \prod_{i=3}^{k-1}(\underbrace{\dfrac{f_r(x_{i+1}
  \rightarrow x_i
  \rightarrow x_{i-1})G(x_i
  \longleftrightarrow x_{i-1})}{p_a(x_{i-1})}}_{stored\,in\,vertex\, during\,light\, path\, tracing\, in\, stage1})\dfrac{G(x_k
  \longleftrightarrow x_{k-1})L_e(x_k
  \rightarrow x_{k-1})}{p_a(x_{k-1})p_a(x_k)})
\end{array}
$$
{{< /katex */>}}
```

渲染成：

{{< katex >}}
$$
\begin{array} {lcl}
  L(p,w_i) &=& \dfrac{1}{N}\Sigma_{i=1}^N(\underbrace{f_r(x_2
  \rightarrow x_1
  \rightarrow x_0)G(x_1
  \longleftrightarrow x_2)f_r(x_3
  \rightarrow x_2
  \rightarrow x_1)}_{sample\, radiance\, evaluation\, in\, stage2}
  \\\\\\ &=&
  \prod_{i=3}^{k-1}(\underbrace{\dfrac{f_r(x_{i+1}
  \rightarrow x_i
  \rightarrow x_{i-1})G(x_i
  \longleftrightarrow x_{i-1})}{p_a(x_{i-1})}}_{stored\,in\,vertex\, during\,light\, path\, tracing\, in\, stage1})\dfrac{G(x_k
  \longleftrightarrow x_{k-1})L_e(x_k
  \rightarrow x_{k-1})}{p_a(x_{k-1})p_a(x_k)})
\end{array}
$$
{{< /katex >}}
