---
title: "Python"
description: "本快速入门涵盖了任何开发者最常用的起点：**“我有一个 Agent。我如何将其公开，以便其他 Agent 可以通过 A2A 使用我的 Agent？”**。这是构建复杂多 Agent 系统的关键。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python。

本快速入门涵盖了任何开发人员最常用的起点：**“我有一个 Agent。我如何将其暴露，以便其他 Agent 可以通过 A2A 使用我的 Agent？”**。这对于构建复杂的多 Agent 系统至关重要，因为不同的 Agent 需要协作和交互。

{{% alert context="info" %}}
**A2A Python SDK 版本兼容性**

ADK 的 A2A 集成适用于 A2A SDK 的两个主要版本（`a2a-sdk` 0.3.x 和 1.x.x）。安装的 A2A SDK 版本会被自动检测，因此无需修改您的 ADK 应用程序代码。

虽然 `a2a-sdk` 0.3.x 在兼容模式下受到支持，但新的集成应以 1.x.x 为目标。如果您的代码直接引用 `a2a-sdk` 类型（例如，自定义执行器或手动构建的 `AgentCard` 实例），请参阅 [A2A SDK v1.0 迁移指南](https://github.com/a2aproject/a2a-python/tree/main/docs/migrations/v1_0) 在迁移到 1.x.x 时。
{{% /alert %}}
## 概览 {#overview}

此示例演示了如何轻松地将 ADK Agent 暴露出来，以便其他 Agent 可以使用 A2A 协议来消费。

通过 A2A 暴露 ADK Agent 的主要方法有两种。

* **使用 `to_a2a(root_agent)` 函数**：如果您只想将现有 Agent 转换为适用于 A2A，并能够通过服务器使用 `uvicorn` 暴露，而不是 `adk deploy api_server`，则使用此函数。这意味着在将 Agent 投入生产时，您可以更严格地控制要通过 `uvicorn` 暴露的内容。此外，`to_a2a()` 函数会基于您的 Agent 代码自动生成 Agent 卡。
* **通过创建您自己的 Agent 卡 (`agent.json`) 并使用 `adk api_server --a2a` 进行托管**：这种方法主要有两个好处。首先，`adk api_server --a2a` 与 `adk web` 配合使用，使得使用、调试和测试 Agent 变得简单。其次，通过 `adk api_server`，您可以指定一个包含多个独立 Agent 的父文件夹。那些拥有 Agent 卡 (`agent.json`) 的 Agent，将自动可通过同一服务器被其他 Agent 使用 A2A。但是，您需要自己创建 Agent 卡。要创建 Agent 卡，您可以参考 [A2A Python 教程](https://a2a-protocol.org/latest/tutorials/python/1-introduction/)。

本快速入门将重点放在 `to_a2a()` 上，因为这是暴露 Agent 最简单的方法，并且会在后台自动生成 Agent 卡。如果您想使用 `adk api_server` 方法，可以在 [A2A 快速入门（消费）文档](/docs/adk/components/a2a-protocol/a2a-quickstart-consuming/python/) 中看到其用法。

```text
Before:
                                                ┌────────────────────┐
                                                │ Hello World Agent  │
                                                │  (Python Object)   │
                                                | without agent card │
                                                └────────────────────┘

                                                          │
                                                          │ to_a2a()
                                                          ▼

After:
┌────────────────┐                             ┌───────────────────────────────┐
│   Root Agent   │       A2A Protocol          │ A2A-Exposed Hello World Agent │
│(RemoteA2aAgent)│────────────────────────────▶│      (localhost: 8001)         │
│(localhost:8000)│                             └───────────────────────────────┘
└────────────────┘
```

该示例包括：

- **远程 Hello World Agent**（`remote_a2a/hello_world/agent.py`）：这是您希望公开的 Agent，以便其他 Agent 可以通过 A2A 使用它。它是一个处理掷骰子和质数检查的 Agent。通过 `to_a2a()` 函数使其公开，并使用 `uvicorn` 提供服务。
- **根 Agent**（`agent.py`）：一个简单的 Agent，只是调用远程 Hello World Agent。

## 使用 `to_a2a(root_agent)` 函数公开远程 Agent {#exposing-the-remote-agent-with-the-toa2arootagent-function}

您可以通过简单地使用 `to_a2a()` 函数对现有的 ADK 构建的 Agent 进行封装，使其兼容 A2A。例如，如果您有如下在 `root_agent` 中定义的 Agent：

```python
# 在此输入您的 Agent 代码
root_agent = Agent(
    model='gemini-flash-latest',
    name='hello_world_agent',

    <...your agent code...>
)
```

然后你可以通过使用 `to_a2a(root_agent)` 来使其与 A2A 兼容：

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a

# 使你的 Agent 与 A2A 兼容
a2a_app = to_a2a(root_agent, port=8001)
```

`to_a2a()` 函数甚至会在后台内存中自动生成一个 Agent 卡，通过从 ADK agent](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/utils/agent_card_builder.py) 提取技能、能力和元数据，从而在使用 `uvicorn` 提供 Agent 端点时，使众所周知的 Agent 卡可用。

你也可以通过使用 `agent_card` 参数提供你自己的 Agent 卡。该值可以是一个 `AgentCard` 对象或 Agent 卡 JSON 文件的路径。

**使用 `AgentCard` 对象的示例：**

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from a2a.types import AgentCard

# 定义 A2A Agent 卡
my_agent_card = AgentCard(
    name="file_agent",
    url="http://example.com",
    description="Test agent from file",
    version="1.0.0",
    capabilities={},
    skills=[],
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
    supports_authenticated_extended_card=False,
)
a2a_app = to_a2a(root_agent, port=8001, agent_card=my_agent_card)
```

**含有 JSON 文件路径的示例：**

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a

# 从文件加载 A2A Agent 卡
a2a_app = to_a2a(root_agent, port=8001, agent_card="/path/to/your/agent-card.json")
```

### 内部机制：to_a2a() 方法 {#under-the-hood-toa2a-method}

当你调用 `to_a2a()` 时，ADK 会自动处理多个设置步骤以暴露你的 Agent：

* **A2aAgentExecutor 设置：** 一个 `A2aAgentExecutor` 充当 A2A 协议与你的 ADK Agent 之间的桥梁。如果你没有提供自定义的 `Runner`，它会自动创建一个默认的，基于内存服务（用于 Artifact、会话、内存和凭据）。
* **状态管理：** 创建一个 `InMemoryTaskStore` 来跟踪 A2A 任务，并创建一个 `InMemoryPushNotificationConfigStore` 来处理推送通知。
* **请求处理：** 创建一个 `DefaultRequestHandler`，将传入的 A2A HTTP 请求路由到 `A2aAgentExecutor` 和状态存储。
* **Starlette 应用 & Agent 卡：** 创建一个 Starlette 应用程序。在启动阶段，它会加载你提供的 Agent 卡，或者使用 `AgentCardBuilder` 根据你的 Agent 配置自动生成一个。然后挂载所有必要的 A2A API 路由。

#### 参数 {#parameters}
* **`agent`（必需）：** 你希望通过 A2A 协议暴露的主要 ADK Agent 实例。
* **`host`（可选）：** 用于在生成的 Agent 卡中构建 A2A RPC URL 的主机。默认值为 `"localhost"`。
* **`protocol`（可选）：** 同一 URL 中使用的协议。默认值为 `"http"`。
* **`port`（可选）：** 同一 URL 中使用的端口。默认值为 `8000`。`to_a2a()` 本身不会绑定端口，因此必须与实际服务的端口匹配（参见下面的 `uvicorn --port` 标志），否则广告卡将指向不可访问的地址。
* **`push_config_store`（可选）：** 用于管理 A2A 推送通知的自定义存储实现。如果未提供，系统默认使用内存存储（`InMemoryPushNotificationConfigStore`）。
* **`agent_card`（可选）：** `AgentCard` 对象或 JSON 文件路径。如果省略，ADK 会自动根据你的 Agent 代码生成 Agent 卡。
* **`runner`（可选）：** 预构建的 `Runner`。如果省略，将创建一个基于内存服务的默认 Runner。
* **`lifespan`（可选）：** 用于 Starlette 生命周期事件的异步上下文管理器，用于运行启动和关闭逻辑。参见 [管理应用程序生命周期 ](#manage-the-application-lifecycle)。

### 管理应用程序生命周期 {#manage-the-application-lifecycle}

使用 `lifespan` 参数调用 `to_a2a` 函数来管理应用程序的生命周期。传递一个异步上下文管理器以执行设置和清理任务，例如在启动时初始化数据库连接，在关闭时关闭它。

上下文管理器接收 `Starlette` 应用实例。使用 `app.state` 存储应用程序需要全局访问的资源。

```python
from contextlib import asynccontextmanager
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from starlette.applications import Starlette

@asynccontextmanager
async def lifespan(app: Starlette):
  # 在应用程序启动时初始化资源
  app.state.db = await init_db()

  yield

  # 在应用程序关闭时清理资源
  await app.state.db.close()

a2a_app = to_a2a(agent, lifespan=lifespan)
```

### 获取示例代码 { #getting-the-sample-code } {#getting-the-sample-code--getting-the-sample-code}

首先，确保你已安装必要的依赖项：

```bash
pip install google-adk[a2a]
```

你可以克隆并导航到 [**a2a_root** sample](https://github.com/google/adk-python/tree/main/contributing/samples/a2a/a2a_root) 这里：

```bash
git clone https://github.com/google/adk-python.git
```

如你所见，文件夹结构如下：

```text
a2a_root/
├── remote_a2a/
│   └── hello_world/
│       ├── __init__.py
│       └── agent.py    # Remote Hello World Agent
├── README.md
└── agent.py            # Root agent
```

#### 根 Agent (`a2a_root/agent.py`) {#root-agent-a2arootagentpy}

- **`root_agent`**：连接到远程 A2A 服务的 `RemoteA2aAgent`
- **Agent 卡 URL**：指向远程服务器上知名的 Agent 卡端点

#### 远程 Hello World Agent (`a2a_root/remote_a2a/hello_world/agent.py`) {#remote-hello-world-agent-a2arootremotea2ahelloworldagentpy}

- **`roll_die(sides: int)`**：用于状态管理的掷骰子功能工具
- **`check_prime(nums: list[int])`**：用于质数检查的异步函数
- **`root_agent`**：具有完整指令的主要 Agent
- **`a2a_app`**：使用 `to_a2a()` 工具创建的 A2A 应用程序

### 启动远程 A2A Agent 服务器 { #start-the-remote-a2a-agent-server } {#start-the-remote-a2a-agent-server--start-the-remote-a2a-agent-server}

现在你可以启动远程 Agent 服务器，该服务器将在 hello_world Agent 内托管 `a2a_app`：

```bash
# Ensure current working directory is adk-python/
# Start the remote agent using uvicorn
uvicorn contributing.samples.a2a.a2a_root.remote_a2a.hello_world.agent:a2a_app --host localhost --port 8001
```

<details>
<summary>为什么使用8001端口？</summary>

在本快速入门中，当在本地测试时，您的 Agent 将使用localhost，因此用于暴露 Agent（远程主 Agent）的 A2A 服务器的`port`必须与使用该 Agent 的消费 Agent 端口不同。您将与消费 Agent 交互的默认端口为`adk web`，因此 A2A 服务器使用单独的端口`8001`创建。

</details>
执行后，您应该会看到类似如下内容：

```shell
INFO:     Started server process [10615]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8001 (Press CTRL+C to quit)
```

### 检查你的远程 Agent 是否正在运行 { #check-that-your-remote-agent-is-running } {#check-that-your-remote-agent-is-running--check-that-your-remote-agent-is-running}

你可以通过访问之前作为 `to_a2a()` 函数在 `a2a_root/remote_a2a/hello_world/agent.py` 中自动生成的 Agent 卡片来检查你的 Agent 是否已启动并运行：

[http://localhost:8001/.well-known/agent-card.json](http://localhost:8001/.well-known/agent-card.json)

你应该能看到 Agent 卡片的内容，看起来应如下：

```json
{"capabilities":{},"defaultInputModes":["text/plain"],"defaultOutputModes":["text/plain"],"description":"hello world agent that can roll a dice of 8 sides and check prime numbers.","name":"hello_world_agent","protocolVersion":"0.2.6","skills":[{"description":"hello world agent that can roll a dice of 8 sides and check prime numbers. \n      I roll dice and answer questions about the outcome of the dice rolls.\n      I can roll dice of different sizes.\n      I can use multiple tools in parallel by calling functions in parallel(in one request and in one round).\n      It is ok to discuss previous dice roles, and comment on the dice rolls.\n      When I are asked to roll a die, I must call the roll_die tool with the number of sides. Be sure to pass in an integer. Do not pass in a string.\n      I should never roll a die on my own.\n      When checking prime numbers, call the check_prime tool with a list of integers. Be sure to pass in a list of integers. I should never pass in a string.\n      I should not check prime numbers before calling the tool.\n      When I are asked to roll a die and check prime numbers, I should always make the following two function calls:\n      1. I should first call the roll_die tool to get a roll. Wait for the function response before calling the check_prime tool.\n      2. After I get the function response from roll_die tool, I should call the check_prime tool with the roll_die result.\n        2.1 If user asks I to check primes based on previous rolls, make sure I include the previous rolls in the list.\n      3. When I respond, I must include the roll_die result from step 1.\n      I should always perform the previous 3 steps when asking for a roll and checking prime numbers.\n      I should not rely on the previous history on prime results.\n    ","id":"hello_world_agent","name":"model","tags":["llm"]},{"description":"Roll a die and return the rolled result.\n\nArgs:\n  sides: The integer number of sides the die has.\n  tool_context: the tool context\nReturns:\n  An integer of the result of rolling the die.","id":"hello_world_agent-roll_die","name":"roll_die","tags":["llm","tools"]},{"description":"Check if a given list of numbers are prime.\n\nArgs:\n  nums: The list of numbers to check.\n\nReturns:\n  A str indicating which number is prime.","id":"hello_world_agent-check_prime","name":"check_prime","tags":["llm","tools"]}],"supportsAuthenticatedExtendedCard":false,"url":"http://localhost:8001","version":"0.0.1"}
```

### 运行主（消费）Agent { #run-the-main-consuming-agent } {#run-the-main-consuming-agent--run-the-main-consuming-agent}

现在您的远程 Agent 正在运行，您可以启动开发 UI 并选择 “a2a_root” 作为您的 Agent。

```bash
# In a separate terminal, run the adk web server
adk web contributing/samples/a2a/
```

要打开 adk 网络服务器，请访问：[http://localhost:8000](http://localhost:8000)。

## 示例交互 {#example-interactions}

一旦两个服务都运行，你可以与根 Agent 进行交互，以查看它如何通过 A2A 调用远程 Agent：

**简单掷骰子：**
此交互使用本地 Agent——掷骰子 Agent：

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

## 高级配置：自定义转换器和拦截器 {#advanced-configuration-custom-converters-and-interceptors}

在希望比 `to_a2a()` 提供的功能更精细控制的场景中，您可以实例化并将 [`A2aAgentExecutorConfig`](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/executor/config.py) 直接传递给 `A2aAgentExecutor`。这使您能够覆盖默认的数据转换器并注入执行中间件。

### 转换器 {#converters}

转换器负责在 A2A 协议负载与 ADK 原生 `Event` 或 `Part` 对象之间进行双向翻译。您可以为以下钩子提供自定义映射函数：

*   **`a2a_part_converter`**：将 A2A 消息部分转换为 ADK `Part` 对象。
*   **`gen_ai_part_converter`**：将原生 ADK `Part` 对象转换为 A2A 消息部分。
*   **`request_converter`**：将传入的 A2A 请求转换为 ADK `RunRequest`。
*   **`event_converter`**：*(旧)* 将 ADK 事件转换为 A2A 事件，由旧的执行器实现使用。
*   **`adk_event_converter`**：*(新)* 将 ADK 事件转换为 A2A 事件，由新的、更新的执行器实现使用。

### 执行拦截器 {#execute-interceptors}

您可以注入一组 `execute_interceptors`，以向 `A2aAgentExecutor` 负载处理添加中间件逻辑：

*   **`before_agent`**：在 Agent 开始处理请求之前执行。允许您检查或修改传入的 `RequestContext`。
*   **`after_event`**：在 ADK 事件被转换为 A2A 事件之后执行。允许您在事件入队之前修改传出的事件，或返回 `None` 来完全过滤和丢弃事件。
*   **`after_agent`**：在 Agent 完成并准备最终事件之后执行。可用于在终端状态事件（例如 `completed` 或 `failed`）发送之前进行检查或修改。

### 管理应用生命周期 {#manage-the-application-lifecycle}

使用 `lifespan` 参数在 `to_a2a` 函数中管理应用程序的生命周期。传递异步上下文管理器以执行设置和清理任务，例如在启动时初始化数据库连接并在关闭时关闭。

上下文管理器将接收 `Starlette` 应用实例。使用 `app.state` 存储应用程序需要全局访问的资源。

```python
from contextlib import asynccontextmanager
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from starlette.applications import Starlette

@asynccontextmanager
async def lifespan(app: Starlette):
  # 在应用程序启动时初始化资源
  app.state.db = await init_db()

  yield

  # 在应用程序关闭时清理资源
  await app.state.db.close()

a2a_app = to_a2a(agent, lifespan=lifespan)
```

## Agent 执行器 V2 {#agent-executor-v2}

当客户端发送所需的 [A2A 扩展](/docs/adk/components/a2a-protocol/a2a-extension/) 时，新版本的 [Agent 执行器](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/executor/a2a_agent_executor_impl.py) 通常会被启用。

然而，你也可以绕过该扩展，通过在实例化 `A2aAgentExecutor` 时设置 `force_new_version=True` 标志来强制服务器使用新的执行器版本。这允许你在不需要修改现有客户端以发送扩展的情况下使用新的执行器逻辑。

```python
from google.adk.a2a.executor.a2a_agent_executor import A2aAgentExecutor

executor = A2aAgentExecutor(
            ...,
            force_new_version=True
        )
```

## 下一步 {#next-steps}

现在您已经创建了一个通过 A2A 服务器公开远程 Agent 的 Agent，下一步是学习如何从另一个 Agent 使用它。

- [**A2A 快速入门（使用）**](/docs/adk/components/a2a-protocol/a2a-quickstart-consuming/python/)：了解您的 Agent 如何使用 A2A 协议与其他 Agent 交互。

---

原文：[Quickstart: Exposing a remote agent via A2A](https://adk.dev/a2a/quickstart-exposing/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/quickstart-exposing.md)
