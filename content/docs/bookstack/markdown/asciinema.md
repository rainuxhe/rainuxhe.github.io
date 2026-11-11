---
title: "终端录像"
description: "使用 Asciinema Player 在文档中播放 .cast 终端录像。"
icon: "terminal"
weight: 87
toc: true
---

`asciinema` 短代码会在页面中嵌入终端录像播放器。录像中的终端文本仍然是可选择、可复制的文本，适合演示命令行操作和实际输出。

播放器随主题本地打包，不依赖 CDN；只有包含此短代码的页面才会加载播放器资源。

## 最短用法

`file` 是唯一必填参数：

```markdown
{{</* asciinema file="casts/demo.cast" title="BookStack 终端录像演示" */>}}
```

渲染结果：

{{< asciinema file="casts/demo.cast" title="BookStack 终端录像演示" >}}

示例录像位于 `static/casts/demo.cast`。`file` 可以写成 `casts/demo.cast`，也可以作为第一个位置参数：

```markdown
{{</* asciinema "casts/demo.cast" */>}}
```

文件查找顺序如下：

1. 先查找站点或主题的 `assets/`。
2. 找不到时，按站点根路径查找 `static/`。
3. 完整的 `http://` 或 `https://` 地址会直接交给播放器，但正式文档建议提交本地录像，避免依赖外部站点。

省略 `title` 时，窗口标题显示 `file` 的值。

## 主题

`theme` 默认是 `auto`，会跟随站点明暗模式，并在切换主题时重新挂载播放器。

```markdown
{{</* asciinema file="casts/demo.cast" theme="dracula" */>}}
```

支持的值：

| 类型 | 值 |
|---|---|
| 自动 | `auto` |
| BookStack | `bookstack-light`、`bookstack-dark` |
| Asciinema 内置 | `asciinema`、`dracula`、`gruvbox-dark`、`monokai`、`nord`、`seti`、`solarized-dark`、`solarized-light`、`tango` |

固定主题不会跟随站点明暗模式。

## 尺寸与适配

默认使用 `fit="width"`，按容器宽度缩放。终端的列数和行数来自 `.cast` 文件头部。

| 值 | 行为 |
|---|---|
| `width` | 适配容器宽度，默认 |
| `height` | 适配容器高度 |
| `both` | 同时适配宽和高 |
| `none` | 不缩放，宽终端可能溢出 |

可以使用 `cols`、`rows` 修正录像头部中错误的终端尺寸。比录像更小的尺寸会裁掉终端内容，因此不要用它们控制页面布局。

```markdown
{{</* asciinema file="casts/demo.cast" rows="24" */>}}
```

## 播放控制

`speed` 设置初始倍速，`startAt` 设置起播时间，`poster` 设置播放前的静帧：

```markdown
{{</* asciinema file="casts/demo.cast"
  speed="2"
  startAt="3"
  poster="npt:0:05" */>}}
```

| 参数 | 默认值 | 作用 |
|---|---|---|
| `speed` | `1` | 播放倍速，必须大于 0 |
| `startAt` | `0` | 起播时间，单位为秒 |
| `idleTimeLimit` | 使用录像头部 | 将静止间隔压缩到最多 N 秒 |
| `poster` | 无 | 播放前显示的时间点，如 `npt:1:30` |
| `autoplay` | 关闭 | 页面打开后自动播放，不建议使用 |
| `loop` | 关闭 | 播放结束后重新开始 |
| `preload` | 关闭 | 页面加载时预取录像 |

布尔参数只有值为 `true` 时才启用。

## 章节标记

`markers` 使用逗号分隔的 `时间:标签` 列表，时间单位为秒：

```markdown
{{</* asciinema file="casts/demo.cast"
  markers="5:查看帮助,10:构建站点"
  pauseOnMarkers="true" */>}}
```

标记会显示在播放进度条上；启用 `pauseOnMarkers` 后，播放会在标记处暂停。

## 完整参数

| 参数 | 类型 | 默认值 |
|---|---|---|
| `file` | 路径 | 必填 |
| `title` | 文本 | `file` |
| `theme` | 枚举 | `auto` |
| `fit` | 枚举 | `width` |
| `cols` / `rows` | 正整数 | 录像头部 |
| `speed` | 正数 | `1` |
| `startAt` | 秒数 | `0` |
| `idleTimeLimit` | 秒数 | 录像头部 |
| `poster` | `npt:` 时间 | 无 |
| `autoplay` | `true` | 关闭 |
| `loop` | `true` | 关闭 |
| `preload` | `true` | 关闭 |
| `markers` | `时间:标签,...` | 无 |
| `pauseOnMarkers` | `true` | 关闭 |

无效主题或尺寸会回退到默认值；无效数字会被忽略或使用安全默认值。Hugo 构建时会输出对应警告。

## 录制与发布

使用 [asciinema CLI](https://docs.asciinema.org/manual/cli/) 录制：

```shell
asciinema rec --idle-time-limit=2 --cols=100 --rows=28 demo.cast
asciinema play demo.cast
```

- 终端宽度尽量控制在 100 列以内，并在录制前执行 `clear`。
- `.cast` 是纯文本，所有输入和输出都能被搜索；提交前确认其中没有密码、令牌或其他敏感信息。
- 录像无法被站点搜索索引覆盖。关键命令和结果仍应写在普通 Markdown 或代码块中。
- 禁用 JavaScript 或打印页面时，播放器会退化为录像文件的下载链接。
