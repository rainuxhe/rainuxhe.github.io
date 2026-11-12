---
title: "应用管理"
description: "***App*** 类是整个 Agent 开发工具包（ADK）Agent 工作流的顶级容器。它旨在管理由***root agent*** 分组的一组 Agent 的生命周期、配置和状态。"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v1.14.0。

***App*** 类是整个 Agent Development Kit (ADK) Agent 工作流的顶级容器。它旨在管理由 ***根 Agent*** 分组的一组 Agent 的生命周期、配置和状态。**App** 类将 Agent 工作流的整体操作基础设施的关注点与各个 Agent 面向任务的推理分离开来。

在 ADK 工作流中定义 ***App*** 对象是可选的，并且会改变组织 Agent 代码和运行 Agent 的方式。从实际角度来看，您使用 ***App*** 类为 Agent 工作流配置以下功能：

*   [**上下文缓存**](/docs/adk/components/agent-context/model-context-caching/)
*   [**上下文压缩**](/docs/adk/components/agent-context/context-compression/)
*   [**Agent 恢复**](/docs/adk/run/agent-runtime/resume-agents/)
*   [**插件**](/docs/adk/components/app-management/plugins/)

本指南说明如何使用 App 类来配置和管理您的 ADK Agent 工作流。

## App 类的目的 {#purpose-of-app-class}

***App*** 类解决了构建复杂 Agent 系统时出现的几个架构问题：

*   **集中配置：** 提供一个集中位置来管理共享资源，如 API 密钥和数据库客户端，避免了需要将配置传递给每个 Agent。
*   **生命周期管理：** ***App*** 类包括 ***启动时*** 和 ***关闭时*** 钩子，可以可靠地管理跨多次调用需要存在的持久资源，如数据库连接池或内存缓存。
*   **状态范围：** 它为应用级状态定义了明确的边界，并带有 `app:*` 前缀，使开发者清楚地了解该状态的作用域和生命周期。
*   **部署单元：** ***App*** 概念建立了正式的 *可部署单元*，简化了 Agent 应用程序的版本控制、测试和服务。

## 定义 App 对象 {#define-an-app-object}

***App*** 类用作 Agent 工作流的主要容器，包含项目的根 Agent。***根 Agent*** 是主控制器 Agent 和任何附加子 Agent 的容器。

### 使用根 Agent 定义 app {#define-app-with-root-agent}

通过创建 ***Agent*** 类的实例为工作流创建一个 ***根 Agent***。然后定义一个 ***App*** 对象，并使用 ***根 Agent*** 对象以及可选功能进行配置，如下面的示例代码所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python title="agent.py"
from google.adk.agents.llm_agent import Agent
from google.adk.apps import App

root_agent = Agent(
    model='gemini-flash-latest',
    name='greeter_agent',
    description='An agent that provides a friendly greeting.',
    instruction='Reply with Hello, World!',
)

app = App(
    name="agents",
    root_agent=root_agent,
    # 可选包括应用级功能：
    # 插件、context_cache_config、events_compaction_config，
    # resumability_config
)
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="success" %}}
**推荐：使用 `app` 作为变量名**

在您的 Agent 项目代码中，将您的 ***App*** 对象设置为变量名 `app`，以便与 ADK 命令行接口运行工具兼容。
{{% /alert %}}

### 运行您的 App Agent {#run-your-app-agent}

您可以使用 ***Runner*** 类，通过 `app` 参数运行您的 Agent 工作流，如下面的代码示例所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python title="main.py"
import asyncio
from dotenv import load_dotenv
from google.adk.runners import InMemoryRunner
from agent import app # import code from agent.py

load_dotenv() # load API keys and settings
# 使用导入的应用程序对象设置 Runner
runner = InMemoryRunner(app=app)

async def main():
    try:  # run_debug() requires ADK Python 1.18 or higher:
        response = await runner.run_debug("Hello there!")

    except Exception as e:
        print(f"An error occurred during agent execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**`Runner.run_debug()` 的版本要求**

`Runner.run_debug()` 命令需要 ADK Python v1.18.0 或更高版本。
您也可以使用 `Runner.run()`，它需要更多的设置代码。有关更多详细信息，请参阅 [Agent Runtime](/docs/adk/run/agent-runtime/) 指南。
{{% /alert %}}
{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

使用以下命令运行您的 App Agent 并使用 `main.py` 代码：

```console
python3 main.py
```

{{% /tab %}}
{{< /tabs >}}

## 下一步 {#next-steps}

有关更完整的示例代码实现，请参阅
[Hello World App](https://github.com/google/adk-python/tree/main/contributing/samples/core/app)
代码示例。

---

原文：[App workflow management class](https://adk.dev/apps/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/apps/index.md)
