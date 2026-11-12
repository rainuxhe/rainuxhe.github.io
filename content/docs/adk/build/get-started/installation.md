---
title: "安装"
description: "安装 Agent Development Kit（ADK）并准备 Python 或 Go 开发环境。"
icon: "article"
weight: 70
toc: true
---

隐藏:
  - 目录
本页面提供了针对 ADK 的详细安装和配置说明，适用于支持的所有语言。想要获取引导式介绍，请从[您的语言快速入门](/docs/adk/build/get-started/)开始。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

**创建并激活虚拟环境**

我们建议使用[venv](https://docs.python.org/3/library/venv.html)创建一个虚拟 Python 环境：

```shell
python3 -m venv .venv
```

现在，你可以使用适合你的操作系统和环境的命令来激活虚拟环境：

```
# Mac / Linux
source .venv/bin/activate

# Windows CMD:
.venv\Scripts\activate.bat

# Windows PowerShell:
.venv\Scripts\Activate.ps1
```

**安装 ADK**

```bash
pip install google-adk
```

(可选) 验证您的安装：

```bash
pip show google-adk
```

{{% /tab %}}
{{% tab tabName="Go" %}}

**先决条件:** ADK Go v2.7.0 及更高版本需要 Go 1.26.10 或更高版本。

**创建一个新的 Go 模块**

如果您正在开始一个新项目，可以创建一个新的 Go 模块：

```shell
go mod init example.com/my-agent
```

**安装 ADK Go v2.0.0**

要将 ADK Go v2.0.0 添加到您的项目中，请运行以下命令：

```shell
go get google.golang.org/adk/v2
```

这将把 ADK Go v2.0.0 添加为您的 `go.mod` 文件的依赖项。

（可选）通过检查您的 `go.mod` 文件中的 `google.golang.org/adk/v2` 条目来验证您的安装。

<details>
<summary>仍在使用 ADK Go v1.x？</summary>

如果您尚未准备好升级到 v2.0.0，您可以继续使用 v1.x 发行版本：

```shell
go get google.golang.org/adk@v1
```

请参阅 [ADK 2.0 发布页面（官方英文）](https://adk.dev/2.0/) 获取升级指南，包括 ADK Go 1.x 项目的重大更改和迁移步骤。

</details>
{{% /tab %}}
{{< /tabs >}}

---

原文：[Advanced setup](https://adk.dev/get-started/installation/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/installation.md)
