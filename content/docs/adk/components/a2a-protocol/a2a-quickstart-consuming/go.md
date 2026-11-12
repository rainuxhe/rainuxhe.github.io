---
title: "开始"
description: "本快速入门涵盖了任何开发者最常用的起点：**“有一个远程 Agent，我如何让我的 ADK Agent 通过 A2A 使用它？”**。这对于构建不同的复杂多 Agent 系统至关重要。"
icon: "article"
weight: 20
toc: true
---

支持版本：Go。

本快速入门涵盖了任何开发者最常见的起点：**“有一个远程 Agent，我如何让我的 ADK Agent 通过 A2A 使用它？”**。这对于构建复杂的多 Agent 系统至关重要，不同的 Agent 需要协作和互动。

## 概览 {#overview}

此示例演示了 Agent Development Kit (ADK) 中的 **Agent2Agent (A2A)** 架构，展示了多个 Agent 如何协同工作以处理复杂任务。该示例实现了一个可以掷骰子并检查数字是否为质数的 Agent。

```text
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Root Agent    │───▶│   Roll Agent     │    │   Remote Prime     │
│  (Local)        │    │   (Local)        │    │   Agent            │
│                 │    │                  │    │  (localhost:8001)  │
│                 │───▶│                  │◀───│                    │
└─────────────────┘    └──────────────────┘    └────────────────────┘
```

A2A 基本示例包括：

- **根 Agent** (`root_agent`)：主要协调者，将任务委派给专门的子 Agent
- **掷骰子 Agent** (`roll_agent`)：本地子 Agent，处理掷骰子操作
- **质数 Agent** (`prime_agent`)：远程 A2A Agent，检查数字是否为质数，该 Agent 在一个独立的 A2A 服务器上运行

## 使用 ADK 服务器公开您的 Agent {#exposing-your-agent-with-the-adk-server}

在 `a2a_basic` 示例中，您首先需要通过 A2A 服务器公开 `check_prime_agent`，以便本地根 Agent 可以使用它。

### 1. 获取示例代码 {#getting-the-sample-code}

首先，确保您已安装 Go 并设置好您的环境。

您可以克隆并导航到 [**`a2a_basic`** sample](https://github.com/google/adk-docs/tree/main/examples/go/a2a_basic) 这里：

```bash
cd examples/go/a2a_basic
```

如你所见，文件夹结构如下：

```text
a2a_basic/
├── remote_a2a/
│   └── check_prime_agent/
│       └── main.go
├── go.mod
├── go.sum
└── main.go # local root agent
```

#### 主 Agent (`a2a_basic/main.go`) {#main-agent-a2abasicmaingo}

- **`rollDieTool`**: 掷骰子功能工具
- **`newRollAgent`**: 本地骰子掷点专用 Agent
- **`newPrimeAgent`**: 远程 A2A Agent 配置
- **`newRootAgent`**: 带有委派逻辑的主协调者

#### 远程质数 Agent (`a2a_basic/remote_a2a/check_prime_agent/main.go`) {#remote-prime-agent-a2abasicremotea2acheckprimeagentmaingo}

- **`checkPrimeTool`**: 质数检查算法
- **`main`**: 质数检查服务和 A2A 服务器的实现

### 2. 启动远程质数 Agent 服务器 {#start-the-remote-prime-agent-server}

为了演示你的 ADK Agent 如何通过 A2A 使用远程 Agent，你首先需要启动一个远程 Agent 服务器，该服务器将承载质数 Agent（在 `check_prime_agent` 下）。

```bash
# Start the remote a2a server that serves the check_prime_agent on port 8001
go run remote_a2a/check_prime_agent/main.go
```

一旦执行，你应该会看到类似如下的内容：

``` shell
2025/11/06 11:00:19 Starting A2A prime checker server on port 8001
2025/11/06 11:00:19 Starting the web server: &{port:8001}
2025/11/06 11:00:19
2025/11/06 11:00:19 Web servers starts on http://localhost:8001
2025/11/06 11:00:19        a2a:  you can access A2A using jsonrpc protocol: http://localhost:8001
```

### 3. 注意远程 Agent 所需的 Agent 卡 {#look-out-for-the-required-agent-card-of-the-remote-agent}

A2A 协议要求每个 Agent 必须拥有一张描述其功能的 Agent 卡。

在 Go ADK 中，当你使用 A2A 启动器公开一个 Agent 时，Agent 卡会动态生成。你可以访问 `http://localhost:8001/.well-known/agent-card.json` 来查看生成的 Agent 卡。

### 4. 运行主（消费）Agent {#run-the-main-consuming-agent}

  ```bash
  # In a separate terminal, run the main agent
  go run main.go
  ```

#### 工作原理 {#how-it-works}

主 Agent 使用 `remoteagent.NewA2A` 来自 `google.golang.org/adk/v2/agent/remoteagent/v2` 包以使用远程 Agent（在我们的示例中为 `prime_agent`）。如下面所示，它设置了 `Name`、一个可选的 `Description`，以及 `AgentCardProvider`。`NewA2A` 需要一个静态的 `AgentCard` 或一个 `AgentCardProvider`，而 `remoteagent.NewAgentCardProvider` 可以从 URL 或本地文件路径创建提供者。较旧的 `google.golang.org/adk/v2/agent/remoteagent` 包（没有 `/v2` 后缀）已被弃用。

```go title="a2a_basic/main.go"
func newPrimeAgent() (agent.Agent, error) {
	remoteAgent, err := remoteagent.NewA2A(remoteagent.A2AConfig{
		Name:              "prime_agent",
		Description:       "Agent that handles checking if numbers are prime.",
		AgentCardProvider: remoteagent.NewAgentCardProvider("http://localhost:8001"),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create remote prime agent: %w", err)
	}
	return remoteAgent, nil
}
```

然后，你可以在你的根 Agent 中直接使用远程 Agent。在这种情况下，`primeAgent` 被用作下面 `root_agent` 中的一个子 Agent：

```go title="a2a_basic/main.go"
func newRootAgent(ctx context.Context, rollAgent, primeAgent agent.Agent) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-2.0-flash", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}
	return llmagent.New(llmagent.Config{
		Name:  "root_agent",
		Model: model,
		Instruction: `
      You are a helpful assistant that can roll dice and check if numbers are prime.
      You delegate rolling dice tasks to the roll_agent and prime checking tasks to the prime_agent.
      Follow these steps:
      1. If the user asks to roll a die, delegate to the roll_agent.
      2. If the user asks to check primes, delegate to the prime_agent.
      3. If the user asks to roll a die and then check if the result is prime, call roll_agent first, then pass the result to prime_agent.
      Always clarify the results before proceeding.
    `,
		SubAgents: []agent.Agent{rollAgent, primeAgent},
		Tools:     []tool.Tool{},
	})
}
```

## 示例互动 {#example-interactions}

一旦你的主 Agent 和远程 Agent 都在运行，你就可以与根 Agent 互动，以查看它如何通过 A2A 调用远程 Agent：

**简单掷骰子：**
此互动使用本地 Agent，即掷骰子 Agent：

```text
User: Roll a 6-sided die
Bot calls tool: transfer_to_agent with args: map[agent_name:roll_agent]
Bot calls tool: roll_die with args: map[sides:6]
Bot: I rolled a 6-sided die and the result is 6.
```

**素数检查：**

此交互通过 A2A 使用远程 Agent，即素数 Agent：

```text
User: Is 7 a prime number?
Bot calls tool: transfer_to_agent with args: map[agent_name:prime_agent]
Bot calls tool: prime_checking with args: map[nums:[7]]
Bot: Yes, 7 is a prime number.
```

**联合操作：**

此交互同时使用本地 Roll Agent 和远程 Prime Agent：

```text
User: roll a die and check if it's a prime
Bot: Okay, I will first roll a die and then check if the result is a prime number.

Bot calls tool: transfer_to_agent with args: map[agent_name:roll_agent]
Bot calls tool: roll_die with args: map[sides:6]
Bot calls tool: transfer_to_agent with args: map[agent_name:prime_agent]
Bot calls tool: prime_checking with args: map[nums:[3]]
Bot: 3 is a prime number.
```

## 下一步 {#next-steps}

现在您已经创建了一个通过 A2A 服务器使用远程 Agent 的 Agent，下一步是了解如何公开您自己的 Agent。

- [**A2A 快速入门（公开）**](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/go/)：学习如何公开您现有的 Agent，以便其他 Agent 可以通过 A2A 协议使用它。

---

原文：[Quickstart: Consuming a remote agent via A2A](https://adk.dev/a2a/quickstart-consuming-go/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/quickstart-consuming-go.md)
