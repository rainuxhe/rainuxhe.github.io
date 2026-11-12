---
title: "Python"
description: "本快速入门涵盖了任何开发者最常用的起点：**“有一个远程 Agent，我如何让我的 ADK Agent 通过 A2A 使用它？”**。这对于构建不同的复杂多 Agent 系统至关重要。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python。

本快速入门涵盖了任何开发者最常见的起点：**“有一个远程 Agent，我如何让我的 ADK Agent 通过 A2A 使用它？”**。这对于构建需要不同 Agent 协作和交互的复杂多 Agent 系统至关重要。

{{% alert context="info" %}}
**A2A Python SDK 版本兼容性**

ADK 的 A2A 集成兼容 A2A SDK 的两个主要版本（`a2a-sdk` 0.3.x 和 1.x.x）。已安装的 A2A SDK 版本会自动检测，因此无需更改您的 ADK 应用代码。

虽然 `a2a-sdk` 0.3.x 在兼容模式下受支持，但新的集成应以 1.x.x 为目标。如果您的代码直接引用 `a2a-sdk` 类型（例如，自定义执行器或手动构建的 `AgentCard` 实例），请参阅 [A2A SDK v1.0 迁移指南](https://github.com/a2aproject/a2a-python/tree/main/docs/migrations/v1_0) 在迁移到 1.x.x 时。
{{% /alert %}}

## 概述 {#overview}

此示例演示了在 Agent Development Kit（ADK）中 **Agent2Agent (A2A)** 架构，展示了多个 Agent 如何协作处理复杂任务。该示例实现了一个可以掷骰子并检查数字是否为质数的 Agent。

```text
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Root Agent    │───▶│   Roll Agent     │    │   Remote Prime     │
│  (Local)        │    │   (Local)        │    │   Agent            │
│                 │    │                  │    │  (localhost:8001)  │
│                 │───▶│                  │◀───│                    │
└─────────────────┘    └──────────────────┘    └────────────────────┘
```

A2A 基本示例包括：

- **根 Agent** (`root_agent`)：主要的协调者，负责将任务委派给专业的子 Agent
- **掷骰 Agent** (`roll_agent`)：本地子 Agent，负责处理掷骰操作
- **质数 Agent** (`prime_agent`)：远程 A2A Agent，用于检查数字是否为质数，该 Agent 运行在独立的 A2A 服务器上

## 使用 ADK 服务器公开您的 Agent {#exposing-your-agent-with-the-adk-server}

ADK 内置了一个 CLI 命令 `adk api_server --a2a`，可通过 A2A 协议公开您的 Agent。

在 `a2a_basic` 示例中，您首先需要通过 A2A 服务器公开 `check_prime_agent`，以便本地根 Agent 可以使用它。

### 1. 获取示例代码 { #getting-the-sample-code } {#1-getting-the-sample-code--getting-the-sample-code}

首先，确保您已安装必要的依赖项：

```bash
pip install google-adk[a2a]
```

你可以克隆并导航到[**`a2a_basic`** sample](https://github.com/google/adk-python/tree/main/contributing/samples/a2a/a2a_basic) 在这里：

```bash
git clone https://github.com/google/adk-python.git
```

如你所见，文件夹结构如下：

```text
a2a_basic/
├── remote_a2a/
│   └── check_prime_agent/
│       ├── __init__.py
│       ├── agent.json
│       └── agent.py
├── README.md
├── __init__.py
└── agent.py # local root agent
```

#### 主 Agent (`a2a_basic/agent.py`) {#main-agent-a2abasicagentpy}

- **`roll_die(sides: int)`**: 掷骰功能工具
- **`roll_agent`**: 本地掷骰专用 Agent
- **`prime_agent`**: 远程 A2A Agent 配置
- **`root_agent`**: 具有委派逻辑的主协调器

#### 远程质数 Agent (`a2a_basic/remote_a2a/check_prime_agent/`) {#remote-prime-agent-a2abasicremotea2acheckprimeagent}

- **`agent.py`**: 质数检查服务的实现
- **`agent.json`**: A2A Agent 的 Agent 卡
- **`check_prime(nums: list[int])`**: 质数检查算法

### 2. 启动远程质数 Agent 服务器 { #start-the-remote-prime-agent-server } {#2-start-the-remote-prime-agent-server--start-the-remote-prime-agent-server}

为了展示你的 ADK Agent 如何通过 A2A 调用远程 Agent，你首先需要启动远程 Agent 服务器，该服务器将托管质数 Agent（在 `check_prime_agent` 下）。

```bash
# Start the remote a2a server that serves the check_prime_agent on port 8001
adk api_server --a2a --port 8001 contributing/samples/a2a/a2a_basic/remote_a2a
```

<details>
<summary>为调试添加日志记录与`--log_level debug`</summary>

要启用调试级别的日志记录，您可以在您的`adk api_server`中添加`--log_level debug`，如下所示：

```bash
adk api_server --a2a --port 8001 contributing/samples/a2a/a2a_basic/remote_a2a --log_level debug
```

这将为您在测试 Agent 时提供更丰富的日志以供检查。

</details>
<details>
<summary> 为什么使用端口 8001？</summary>

在此快速入门中，当本地测试时，您的 Agent 将使用 localhost，因此为公开 Agent（远程、主要 Agent）创建的 A2A 服务器的 `port` 必须与使用 Agent 的端口不同。您将与使用 Agent 交互的默认 `adk web` 端口是 `8000`，这就是为什么 A2A 服务器使用单独端口 `8001` 创建的原因。

</details>
执行后，您应该会看到类似如下内容：

``` shell
INFO:     Started server process [56558]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
```

### 3. 注意远程 Agent { #look-out-for-the-required-agent-card-agent-json-of-the-remote-agent } 所需的 Agent 卡 (`agent.json`) {#3-look-out-for-the-required-agent-card-agentjson-of-the-remote-agent--look-out-for-the-required-agent-card-agent-json-of-the-remote-agent}

A2A 协议要求每个 Agent 都必须有描述其功能的 Agent 卡。

如果其他人已经创建了你希望在你的 Agent 中使用的远程 A2A Agent，那么你应该确认他们是否有 Agent 卡 (`agent.json`)。`adk api_server --a2a` 命令通过 A2A 仅公开包含名为 `agent.json` 文件的 Agent 文件夹。

在示例中，`check_prime_agent` 已经提供了 Agent 卡：

```json title="a2a_basic/remote_a2a/check_prime_agent/agent.json"

{
  "capabilities": {},
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["application/json"],
  "description": "An agent specialized in checking whether numbers are prime. It can efficiently determine the primality of individual numbers or lists of numbers.",
  "name": "check_prime_agent",
  "skills": [
    {
      "id": "prime_checking",
      "name": "Prime Number Checking",
      "description": "Check if numbers in a list are prime using efficient mathematical algorithms",
      "tags": ["mathematical", "computation", "prime", "numbers"]
    }
  ],
  "url": "http://localhost:8001/a2a/check_prime_agent",
  "version": "1.0.0"
}
```

<details>
<summary>有关 ADK 中 Agent 卡的更多信息</summary>

在 ADK 中，您可以使用`to_a2a(root_agent)`包装器，它会自动为您生成 Agent 卡。如果您有兴趣了解如何公开现有 Agent 以便他人可以使用，请查看[A2A 快速入门（公开）](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/python/)教程。

</details>

### 4. 运行主（使用）Agent { #run-the-main-consuming-agent } {#4-run-the-main-consuming-agent--run-the-main-consuming-agent}

  ```bash
  # In a separate terminal, run the adk web server
  adk web contributing/samples/a2a/
  ```

#### 工作原理 {#how-it-works}

主 Agent 使用 `RemoteA2aAgent` 类来调用远程 Agent（在我们的示例中为 `prime_agent`）。如下面所示，`RemoteA2aAgent` 需要 `name` 和一个 `agent_card`，该 `agent_card` 可以是一个 `AgentCard` 对象、一个 URL（如下面示例所示）或本地 Agent 卡文件的路径；`description` 字段是可选的，默认值为空字符串。

```python title="a2a_basic/agent.py"
<...code truncated...>

from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent

prime_agent = RemoteA2aAgent(
    name="prime_agent",
    description="Agent that handles checking if numbers are prime.",
    agent_card=(
        f"http://localhost:8001/a2a/check_prime_agent{AGENT_CARD_WELL_KNOWN_PATH}"
    ),
)

<...code truncated>
```

{{% alert context="info" %}}
**使用新的 A2A 集成**

`use_legacy` 参数默认为 `True`，因此上面的示例使用的是传统路径。设置 `use_legacy=False` 以使用新的 ADK-A2A 集成，该集成会将 [A2A extension](/docs/adk/components/a2a-protocol/a2a-extension/) 发送到远程 Agent。
{{% /alert %}}
然后，你可以在你的 Agent 中简单地使用 `RemoteA2aAgent`。在这种情况下，`prime_agent` 被用作下面 `root_agent` 中的一个子 Agent：

```python title="a2a_basic/agent.py"
from google.adk.agents.llm_agent import Agent
from google.genai import types

root_agent = Agent(
    model="gemini-flash-latest",
    name="root_agent",
    instruction="""
      <You are a helpful assistant that can roll dice and check if numbers are prime.
      You delegate rolling dice tasks to the roll_agent and prime checking tasks to the prime_agent.
      Follow these steps:
      1. If the user asks to roll a die, delegate to the roll_agent.
      2. If the user asks to check primes, delegate to the prime_agent.
      3. If the user asks to roll a die and then check if the result is prime, call roll_agent first, then pass the result to prime_agent.
      Always clarify the results before proceeding.>
    """,
    global_instruction=(
        "You are DicePrimeBot, ready to roll dice and check prime numbers."
    ),
    sub_agents=[roll_agent, prime_agent],
    tools=[example_tool],
    generate_content_config=types.GenerateContentConfig(
        safety_settings=[
            types.SafetySetting(  # avoid false alarm about rolling dice.
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.OFF,
            ),
        ]
    ),
)
```

### 高级配置：定制转换器与拦截器 {#advanced-configuration-custom-converters-and-interceptors}

内部，`RemoteA2aAgent`在 A2A 协议格式与 ADK 原生`Event`系统之间转换。您可以通过通过 `config` 参数将 [`A2aRemoteAgentConfig`](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/agent/config.py) 对象传递给 `RemoteA2aAgent` 来自定义此行为。

这允许你定义自定义类型映射，注入请求参数，并拦截请求或响应。

#### 转换器 {#converters}

转换器负责将输入的 A2A 响应转换为本地 ADK 对象。你可以为以下钩子提供自己的映射函数：

* **`a2a_message_converter`**：将标准 A2A 消息转换为 ADK 对象`Event`对象。
* **`a2a_task_converter`**：将 A2A 任务转换为 ADK 任务`Event`。
* **`a2a_status_update_converter`**：将 A2A `TaskStatusUpdateEvent` 转换为 `Event` 对象的 ADK。
* **`a2a_artifact_update_converter`**：将 A2A `TaskArtifactUpdateEvent`转换为 ADK 对象`Event`对象。
* **`a2a_part_converter`**：其他转换器内部利用的基础低级钩子，将单个 A2A 消息部分转换为生成式AI `Part`对象。

{{% alert context="info" %}}
这些自定义客户端转换器仅在响应来自[agent executor](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/executor/a2a_agent_executor_impl.py)“的新实现时使用。更多细节请参见[A2A 扩展](/docs/adk/components/a2a-protocol/a2a-extension/)。
{{% /alert %}}

#### 请求拦截机 {#request-interceptors}

你可以注入一份`request_interceptors`列表，为 A2A 请求添加中间件逻辑：

* **`before_request`**：在 Agent 开始处理前执行。你可以修改`A2AMessage`，或者返回 ADK 的 `Event`，立即中止请求并将该事件返回给调用者。
* **`after_request`**：在 Agent 处理请求后执行。你可以修改生成的 ADK 的 `Event`，或者返回`None`以过滤并完全丢弃该事件。

#### 请求参数配置 {#request-parameters-configuration}

通过拦截器，你还可以修改 A2A 请求的`ParametersConfig`以注入：

* **`request_metadata`**：将自定义元数据字典传递到请求头部。
* **`client_call_context`**：为底层传输注入特定的客户端调用上下文。

```python
<...code truncated...>

from google.adk.a2a.agent import A2aRemoteAgentConfig
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent

prime_agent = RemoteA2aAgent(
    name="prime_agent",
    description="Agent that handles checking if numbers are prime.",
    agent_card=(
        f"http://localhost:8001/a2a/check_prime_agent{AGENT_CARD_WELL_KNOWN_PATH}"
    ),
    use_legacy=False,
    config=A2aRemoteAgentConfig(
        a2a_message_converter=my_a2a_message_converter,
        request_interceptors=[my_request_interceptor],
    ),
)

<...code truncated>
```

## 示例交互 {#example-interactions}

一旦你的主 Agent 和远程 Agent 都在运行，你可以与根 Agent 互动，以查看它如何通过 A2A 调用远程 Agent：

**简单掷骰子：**
该交互使用本地 Agent，即掷骰子 Agent：

```text
User: Roll a 6-sided die
Bot: I rolled a 4 for you.
```

**素数检查：**

此交互通过 A2A 使用远程 Agent，即素数 Agent：

```text
User: Is 7 a prime number?
Bot: Yes, 7 is a prime number.
```

**联合操作：**

此交互同时使用本地 Roll Agent 和远程 Prime Agent：

```text
User: Roll a 10-sided die and check if it's prime
Bot: I rolled an 8 for you.
Bot: 8 is not a prime number.
```

## 下一步 {#next-steps}

现在您已经创建了一个通过 A2A 服务器使用远程 Agent 的 Agent，下一步是学习如何从另一个 Agent 连接它。

- [**A2A 快速入门（暴露）**](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/python/)：了解如何暴露您现有的 Agent，以便其他 Agent 可以通过 A2A 协议使用它。

---

原文：[Quickstart: Consuming a remote agent via A2A](https://adk.dev/a2a/quickstart-consuming/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/quickstart-consuming.md)
