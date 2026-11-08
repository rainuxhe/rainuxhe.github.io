---
title: "快速开始"
description: "安装 Hugo、Go 和 Dart Sass，下载模块并启动本地预览。"
icon: "rocket_launch"
weight: 10
toc: true
---

## 环境要求

- Hugo Extended `0.169.0` 或更新版本
- Go `1.21` 或更新版本
- Dart Sass `1.63.0` 或更新版本

主题使用 Hugo Modules 引入 Bootstrap，并通过 Dart Sass 编译 SCSS，因此只安装 Hugo Extended 还不够。

### 安装 Hugo Extended

可以从 [Hugo Releases](https://github.com/gohugoio/hugo/releases) 下载对应平台的 Extended 版本，然后检查：

```shell
hugo version
```

输出中应包含 `extended`。

### 安装 Go

Go 用于下载和管理 Hugo Modules：

```shell
go version
```

### 安装 Dart Sass

确认 `sass` 可执行文件位于 `PATH`：

```shell
sass --version
```

如果没有安装，可使用系统包管理器、官方 Dart Sass 发布包或兼容的包管理方式安装。

## 获取项目

```shell
git clone git@github.com:rainuxhe/rainuxhe.github.io.git
cd rainuxhe.github.io
```

## 下载 Hugo Modules

首次运行或依赖锁文件变化后执行：

```shell
hugo mod download
```

## 启动预览

```shell
hugo serve -D
```

默认访问地址：

```text
http://localhost:1313/
```

`-D` 表示同时渲染草稿页面，只应在本地开发时使用。

## 生产构建

```shell
hugo --cleanDestinationDir --gc --minify
```

构建结果位于：

```text
public/
```

## 目录概览

```text
.
├── content/
│   └── docs/
│       ├── fastapi/
│       ├── postgresql/
│       └── bookstack/
├── static/
├── themes/
│   └── bookstack/
├── go.mod
└── hugo.yml
```

内容放在 `content/docs/<文档 ID>/`，主题放在 `themes/bookstack/`，站点级配置统一写在 `hugo.yml`。
