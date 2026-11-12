---
title: "开始"
description: "本快速入门涵盖了任何开发者最常用的起点：**“我有一个 Agent。我如何将其公开，以便其他 Agent 可以通过 A2A 使用我的 Agent？”**。这是构建复杂多 Agent 系统的关键。"
icon: "article"
weight: 20
toc: true
---

支持版本：Go。

本快速入门涵盖了任何开发者最常见的起点：**“我有一个 Agent。我如何将它暴露出来，以便其他 Agent 可以通过 A2A 使用我的 Agent？”**。这对于构建不同 Agent 需要协作和交互的复杂多 Agent 系统至关重要。

## 概览 {#overview}

此示例演示了如何轻松地暴露一个 ADK Agent，以便可以通过 A2A 协议被另一个 Agent 使用。

在 Go 中，可以使用 A2A 启动器来暴露一个 Agent，它会为你动态生成 Agent 卡片。

```text
┌─────────────────┐                             ┌───────────────────────────────┐
│   Root Agent    │       A2A Protocol          │ A2A-Exposed Check Prime Agent │
│                 │────────────────────────────▶│      (localhost: 8001)        │
└─────────────────┘                             └───────────────────────────────┘
```

该示例包括：

- **远程质数 Agent** (`remote_a2a/check_prime_agent/main.go`)：这是您希望暴露的 Agent，以便其他 Agent 可以通过 A2A 使用它。它是一个处理质数检查的 Agent。它通过 A2A 启动器被暴露。
- **根 Agent** (`main.go`)：一个简单的 Agent，仅调用远程质数 Agent。

## 使用 A2A 启动器暴露远程 Agent {#exposing-the-remote-agent-with-the-a2a-launcher}

您可以使用 A2A 启动器，将现有的使用 Go ADK 构建的 Agent 变为 A2A 兼容。

### 1. 获取示例代码 {#getting-the-sample-code}

首先，确保您已安装 Go 并且环境已设置好。

您可以克隆并导航到 [**`a2a_basic`** 示例](https://github.com/google/adk-docs/tree/main/examples/go/a2a_basic) 这里：

```bash
cd examples/go/a2a_basic
```

如你所见，文件夹结构如下：

```text
a2a_basic/
├── remote_a2a/
│   └── check_prime_agent/
│       └── main.go    # Remote Prime Agent
├── go.mod
├── go.sum
└── main.go            # Root agent
```

#### 根 Agent (`a2a_basic/main.go`) {#root-agent-a2abasicmaingo}

- **`newRootAgent`**：连接到远程 A2A 服务的本地 Agent。

#### 远程主要 Agent (`a2a_basic/remote_a2a/check_prime_agent/main.go`) {#remote-prime-agent-a2abasicremotea2acheckprimeagentmaingo}

- **`checkPrimeTool`**：用于检查质数的函数。
- **`main`**：创建 Agent 并启动 A2A 服务器的主函数。

### 2. 启动远程 A2A Agent 服务器 {#start-the-remote-a2a-agent-server}

现在您可以启动远程 Agent 服务器，它将托管 `check_prime_agent`：

```bash
# Start the remote agent
go run remote_a2a/check_prime_agent/main.go
```

一旦执行，你应该会看到类似如下的内容：

```shell
2025/11/06 11:00:19 Starting A2A prime checker server on port 8001
2025/11/06 11:00:19 Starting the web server: &{port:8001}
2025/11/06 11:00:19
2025/11/06 11:00:19 Web servers starts on http://localhost:8001
2025/11/06 11:00:19        a2a:  you can access A2A using jsonrpc protocol: http://localhost:8001
```

### 3. 检查您的远程 Agent 是否正在运行 {#check-that-your-remote-agent-is-running}

您可以通过访问由 A2A 启动器自动生成的 Agent 卡来检查您的 Agent 是否已启动并运行：

[http://localhost:8001/.well-known/agent-card.json](http://localhost:8001/.well-known/agent-card.json)

您应该能看到 Agent 卡的内容。

### 4. 运行主（消费）Agent {#run-the-main-consuming-agent}

现在您的远程 Agent 正在运行，您可以运行主 Agent。

```bash
# In a separate terminal, run the main agent
go run main.go
```

#### 工作原理 {#how-it-works}

远程 Agent 通过 `main` 函数中的 A2A 启动器进行暴露。启动器负责启动服务器并生成 Agent 卡。

```go title="remote_a2a/check_prime_agent/main.go"
func main() {
	ctx := context.Background()
	primeTool, err := functiontool.New(functiontool.Config{
		Name:        "prime_checking",
		Description: "Check if numbers in a list are prime using efficient mathematical algorithms",
	}, checkPrimeTool)
	if err != nil {
		log.Fatalf("Failed to create prime_checking tool: %v", err)
	}

	model, err := gemini.NewModel(ctx, "gemini-2.0-flash", &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	primeAgent, err := llmagent.New(llmagent.Config{
		Name:        "check_prime_agent",
		Description: "check prime agent that can check whether numbers are prime.",
		Instruction: `
			You check whether numbers are prime.
			When checking prime numbers, call the check_prime tool with a list of integers. Be sure to pass in a list of integers. You should never pass in a string.
			You should not rely on the previous history on prime results.
    `,
		Model: model,
		Tools: []tool.Tool{primeTool},
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// 创建启动器。a2a.NewLauncher() 将动态生成 Agent 卡。
	port := 8001
	webLauncher := web.NewLauncher(a2a.NewLauncher())
	_, err = webLauncher.Parse([]string{
		"--port", strconv.Itoa(port),
		"a2a", "--a2a_agent_url", "http://localhost:" + strconv.Itoa(port),
	})
	if err != nil {
		log.Fatalf("launcher.Parse() error = %v", err)
	}

	// 创建 ADK 配置
	config := &launcher.Config{
		AgentLoader:    agent.NewSingleLoader(primeAgent),
		SessionService: session.InMemoryService(),
	}

	log.Printf("Starting A2A prime checker server on port %d\n", port)
	// 运行启动器
	if err := webLauncher.Run(context.Background(), config); err != nil {
		log.Fatalf("webLauncher.Run() error = %v", err)
	}
}
```

## 示例互动 {#example-interactions}

一旦两个服务都在运行，您可以与根 Agent 互动，看看它如何通过 A2A 调用远程 Agent：

**质数检查：**

此互动使用通过 A2A 的远程 Agent，即质数 Agent：

```text
User: roll a die and check if it's a prime
Bot: Okay, I will first roll a die and then check if the result is a prime number.

Bot calls tool: transfer_to_agent with args: map[agent_name:roll_agent]
Bot calls tool: roll_die with args: map[sides:6]
Bot calls tool: transfer_to_agent with args: map[agent_name:prime_agent]
Bot calls tool: prime_checking with args: map[nums:[3]]
Bot: 3 is a prime number.
...
```

## 下一步 {#next-steps}

现在您已经创建了一个通过 A2A 服务器公开远程 Agent 的 Agent，下一步是学习如何从另一个 Agent 使用它。

- [**A2A 快速入门（使用）**](/docs/adk/components/a2a-protocol/a2a-quickstart-consuming/go/)：了解您的 Agent 如何使用 A2A 协议与其他 Agent 交互。

---

原文：[Quickstart: Exposing a remote agent via A2A](https://adk.dev/a2a/quickstart-exposing-go/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/quickstart-exposing-go.md)
