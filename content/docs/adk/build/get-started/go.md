---
title: "Go 快速开始"
description: "使用 Go 和 Agent Development Kit（ADK）在几分钟内创建并运行第一个 Agent。"
icon: "article"
weight: 30
toc: true
---

本指南向您展示如何使用 Go 的 Agent Development Kit 启动和运行。在开始之前，请确保已安装以下内容：

*   Go 1.26.10 或更高版本
*   ADK Go v2.0.0 或更高版本

{{% alert context="success" %}}
**ADK Go 2.0 的新功能**

ADK Go 2.0 引入了基于图的工作流 Agent、并行和循环执行原语，以及人机交互工具确认。有关新功能的完整列表和迁移指南，请参见 [ADK 2.0 发布页面（官方英文）](https://adk.dev/2.0/)。
{{% /alert %}}

## 创建 Agent 项目 {#create-an-agent-project}

使用以下文件和目录结构创建 Agent 项目：

```none
my_agent/
    agent.go    # main agent code
    .env        # API keys or project IDs
```

<details>
<summary>使用命令行创建此项目结构</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Windows" %}}

```console
mkdir my_agent\
type nul > my_agent\agent.go
type nul > my_agent\env.bat
```

{{% /tab %}}
{{% tab tabName="MacOS / Linux" %}}

```bash
mkdir -p my_agent/ && \
    touch my_agent/agent.go && \
    touch my_agent/.env
```

{{% /tab %}}
{{< /tabs >}}
</details>

### 定义 Agent 代码 {#define-the-agent-code}

创建一个使用内置 [Google 搜索工具（官方英文）](https://adk.dev/integrations/google-search/) 的基本 Agent 代码。将以下代码添加到您项目目录中的 `my_agent/agent.go` 文件中：

```go title="my_agent/agent.go"
package main

import (
	"context"
	"log"
	"os"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/cmd/launcher"
	"google.golang.org/adk/v2/cmd/launcher/full"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/geminitool"
	"google.golang.org/genai"
)

func main() {
	ctx := context.Background()

	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{
		APIKey: os.Getenv("GOOGLE_API_KEY"),
	})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	timeAgent, err := llmagent.New(llmagent.Config{
		Name:        "hello_time_agent",
		Model:       model,
		Description: "Tells the current time in a specified city.",
		Instruction: "You are a helpful assistant that tells the current time in a city.",
		Tools: []tool.Tool{
			geminitool.GoogleSearch{},
		},
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	config := &launcher.Config{
		AgentLoader: agent.NewSingleLoader(timeAgent),
	}

	l := full.NewLauncher()
	if err = l.Execute(ctx, config, os.Args[1:]); err != nil {
		log.Fatalf("Run failed: %v\n\n%s", err, l.CommandLineSyntax())
	}
}
```

### 配置项目和依赖项 {#configure-project-and-dependencies}

初始化你的模块，将 ADK Go 2.0 添加为固定依赖项，然后让 `go mod
tidy` 根据你的 Agent 代码文件中的 `import` 语句解析其余的包：

```console
go mod init my-agent/main
go get google.golang.org/adk/v2
go mod tidy
```

### 设置您的 API 密钥 {#set-your-api-key}

该项目使用 Gemini API，这需要一个 API 密钥。如果您还没有 Gemini API 密钥，请在 Google AI Studio 的 [API Keys](https://aistudio.google.com/app/apikey) 页面](#) 创建一个密钥。

在终端窗口中，将您的 API 密钥写入项目的 `.env` 或 `env.bat` 文件中，以设置环境变量：

{{< tabs tabTotal="3" >}}
{{% tab tabName="MacOS / Linux" %}}

```bash title="Update: my_agent/.env"
echo 'export GOOGLE_API_KEY="YOUR_API_KEY"' > .env
```

{{% /tab %}}
{{% tab tabName="Windows PowerShell" %}}

```console title="Update: my_agent/env.bat"
echo 'set GOOGLE_API_KEY="YOUR_API_KEY"' > env.bat
```

{{% /tab %}}
{{% tab tabName="Windows Command Prompt" %}}

```console title="Update: my_agent/env.bat"
echo set GOOGLE_API_KEY="YOUR_API_KEY" > env.bat
```

{{% /tab %}}
{{< /tabs >}}
<details>
<summary>使用其他带有 ADK 的AI模型</summary>

ADK 支持使用许多生成式AI模型。有关在 ADKAgent 中配置其他模型的更多信息，请参见[模型与认证](/docs/adk/build/models-for-agents/)。

</details>

## 运行你的 Agent {#run-your-agent}

您可以使用定义的交互式命令行界面或 ADK Go 命令行工具提供的 ADK 网页用户界面来运行您的 ADKAgent。两种选项都允许您测试和与您的 Agent 互动。

### 使用命令行界面运行 {#run-with-command-line-interface}

使用以下 Go 命令运行您的 Agent：

```console title="Run from: my_agent/ directory"
# Remember to load keys and settings: source .env OR env.bat
go run agent.go
```

![adk-run.png](/images/adk/adk-run.png)

### 使用网页界面运行 {#run-with-web-interface}

使用以下 Go 命令通过 ADK 网页界面运行您的 Agent：

```console title="Run from: my_agent/ directory"
# Remember to load keys and settings: source .env OR env.bat
go run agent.go web api webui
```

此命令启动一个带有聊天界面的Web服务器，用于您的 Agent。您可以在`http://localhost:8080`访问Web界面。在左上角选择您的 Agent 并输入请求。

![adk-web-dev-ui-chat.png](/images/adk/adk-web-dev-ui-chat.png)

{{% alert context="warning" %}}
**注意：ADK Web仅用于开发**

ADK Web ***不适用于生产环境部署***。您应该仅将 ADK Web用于开发和调试目的。
{{% /alert %}}

## 下一步：构建您的 Agent {#next-build-your-agent}

现在您已经安装了 ADK 并且第一个 Agent 正在运行，尝试使用我们的构建指南来构建您自己的 Agent：

*   [构建您的 Agent](/docs/adk/build/build-your-agent/)
*   [构建基于图的工作流程](/docs/adk/build/graph-workflows/)
*   [ADK Go 工作流 Agent](/docs/adk/build/multi-agent-workflows/template-workflows/)

---

原文：[Go Quickstart for ADK](https://adk.dev/get-started/go/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/go.md)
