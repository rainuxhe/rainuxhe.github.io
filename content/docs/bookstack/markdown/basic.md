---
title: "标准语法"
description: "标题、段落、强调、链接、图片、列表、引用和脚注。"
icon: "format_align_left"
weight: 70
toc: true
---

## 标题与段落

正文从二级标题开始，一级标题由页面模板根据 front matter 自动生成。

这是一个普通段落，包含 **粗体**、*斜体*、***粗斜体***、~~删除线~~ 和 `行内代码`。

### 链接

- [站内链接](/docs/bookstack/)
- [外部链接](https://gohugo.io/)

### 图片

![BookStack](/images/logos/mark.svg "BookStack")

## 列表

- 无序列表
  - 第二层
    - 第三层
- 另一个项目

1. 有序列表
2. 第二项
3. 第三项

## 引用

> 普通引用内容。
>
> > 嵌套引用内容。

## 代码

```python
from pathlib import Path

print(Path("content/docs").exists())
```

## 脚注

这里有一个脚注引用。[^sample]

[^sample]: 脚注会集中显示在页面底部。

---

分隔线用于划分较大的内容区域。
