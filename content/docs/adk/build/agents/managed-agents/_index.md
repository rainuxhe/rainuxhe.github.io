---
title: "托管 Agent"
description: "托管 Agent 让您可以在 ADK 流程中使用 Google 的第一方开箱即用 Agent，这些 Agent 由托管 Agent API 支持。托管 Agent 可通过 Gemini API 和 Agent 平台使用。`ManagedAg"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v2.4.0。

托管 Agent 允许您在 ADK 流程中使用 Google 的第一方开箱即用 Agent，这些 Agent 由托管 Agent API 支持。托管 Agent 可以通过 [Gemini API ](https://ai.google.dev/gemini-api/docs/agents) 和 [Agent Platform ](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/managed-agents) 获得。`ManagedAgent` 类连接到在专用服务器端执行环境中运行的托管 Agent（例如 Antigravity Agent），因此您可以获得强大的内置功能，而无需管理沙箱或编写客户端函数声明。

`ManagedAgent` 实现了与其他 ADK Agent 相同的 `BaseAgent` 合约，因此您可以单独使用它或直接将其放入 ADK 流程中。当您希望使用带有专用内置工具的稳健服务器托管 Agent，而不是自己构建和操作该环境时，它非常适合。

## 什么是托管 Agent？ {#what-are-managed-agents}

*托管 Agent* 是一种 Agent，其推理、工具和执行环境由 Google 通过托管 Agent API 托管和操作，而不是由您自己的 ADK 进程运行。`ManagedAgent` 不再发出标准 `generate_content` 调用，而是创建服务器端 *交互* 并将结果流回 ADK 流程中。托管 Agent 提供以下内置优势：

- **第一方开箱即用 Agent：** 通过引用其 `agent_id` 连接到现成 Agent（例如 Antigravity Agent）。
- **内置服务器端执行：** 如网页搜索和代码执行等功能在服务器上的托管沙箱中运行，无需配置或保护本地沙箱。
- **无需客户端函数声明：** 服务器端工具在托管 Agent 上配置，因此无需在本地声明或执行它们。
- **可作为内联工具组合：** 设置 `mode='single_turn'` 并将托管 Agent 添加到父 `LlmAgent` 的 `sub_agents`。ADK 会自动将其公开为内联单轮工具，这也是替代将其封装到 `AgentTool` 中的推荐方法。

## 何时使用托管 Agent vs. 自行构建 {#when-to-use-managed-agents-vs-building-your-own}

托管 Agent 和 ADK Agent 解决不同的问题。选择它们主要是在开箱即用的功能与细粒度控制之间权衡。

- **托管 Agent** 为您提供开箱即用的强大 Agent，但灵活性有限。工具集是预定义的并在服务器端运行，Agent 仅在托管环境中运行，不支持客户端执行工具，但支持服务器端远程 MCP 服务器。
- **ADK Agent**（例如 [`LlmAgent` ](/docs/adk/build/agents/simple-agents/)）则允许您对模型、指令、工具（包括自定义函数工具和 MCP 工具）以及执行位置进行细粒度控制。

## 前提条件`ManagedAgent` 支持两个后端。请完成您计划使用的后端的前置要求：获取凭证和一个 `agent_id`。 {#prerequisites}

### Gemini API 后端 {#gemini-api-backend}

- **认证：** 获取一个 Gemini API 密钥，并将其设置为 `GEMINI_API_KEY` 环境变量。
- **Agent ID：** 您需要一个 `agent_id` 来连接。您可以：
    - 按照 [Gemini API Agent 文档](https://ai.google.dev/gemini-api/docs/agents) 创建一个新的 Agent。
    - 使用开箱即用的 Agent ID，例如 `antigravity-preview-05-2026`，以下示例中使用了它。

### Agent 平台后端 {#agent-platform-backend}

- **认证：** Agent 平台需要 Google Cloud 凭证。按照 [Agent 平台设置说明](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/managed-agents/create-manage#before-you-begin) 对本地环境进行认证（例如使用 `gcloud auth
  application-default login`）。
- **位置：** 托管 Agent API 仅在 `global` 位置提供。`ManagedAgent` 在 Agent 平台后端强制连接到 `global`。
- **Agent ID：** 与 Gemini API 一样，您需要一个 `agent_id`。可以使用 [创建和管理 Agent 指南](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/managed-agents/create-manage) 创建，也可以使用您项目可用的开箱即用 Agent ID。

## 开始使用 {#get-started}

以下示例创建两个托管 Agent：一个使用网页搜索回答问题，另一个通过在服务器端运行代码解决计算问题。两者都在托管环境中运行其工具 (`environment={'type': 'remote'}`)。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import os
from google.adk.agents import ManagedAgent
from google.adk.tools import google_search
from google.genai import types

# 确保你拥有 MANAGED_AGENT_ID 和正确的环境配置
_AGENT_ID = os.environ.get('MANAGED_AGENT_ID', 'antigravity-preview-05-2026')

managed_search_agent = ManagedAgent(
    name='managed_search_agent',
    description='Answers questions that need fresh, grounded information from the web.',
    agent_id=_AGENT_ID,
    environment={'type': 'remote'},
    tools=[google_search],
)

# 一个使用原始类型的托管代码执行 Agent 工具。
managed_code_execution_agent = ManagedAgent(
    name='managed_code_execution_agent',
    description='Solves computational questions by running code server-side.',
    agent_id=_AGENT_ID,
    environment={'type': 'remote'},
    tools=[types.Tool(code_execution=types.ToolCodeExecution())],
)
```

{{% /tab %}}
{{< /tabs >}}
## 它是如何运作的 {#how-it-works}

当你调用`ManagedAgent`时，ADK 会将你的请求发送给托管 Agent
通过[相互作用]
API](https://ai.google.dev/gemini-api/docs/interactions-overview)与溪流
部分和最终结果会实时回归你的 ADK 流程。该
推理、工具和执行都运行在谷歌的托管环境中
比你的 ADK 过程更重要。

{{% alert context="info" %}}
**`ManagedAgent`如何映射到托管 AgentAPI**

ADK `ManagedAgent`不会创建或注册新的托管 Agent
resource。它连接到后端已经存在的一个 Agent（该 Agent
由`agent_id`命名），并应用其配置（如`tools`和
`environment`）作为每次交互在运行时被覆盖。在托管 Agent 中
API 术语，ADK 完全在 *数据层*（交互 API）上工作，且
离开*控制平面*（Agent 的 API，负责创建和管理 Agent
资源）未被动用。关于这两个位面的区别，请参见[管理“条目
Agent API 系统
架构](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/managed-agents)。
{{% /alert %}}
### 本地会话与远程状态 {#local-session-vs-remote-state}

`ManagedAgent`本地几乎不保留状态。ADK 会话只保留两个
其发出的事件值：`interaction_id`与沙盒
`environment_id`。每轮新回合，Agent 人通过扫描先验恢复两者
然后把它们送回后端，这样对话和它
沙盒继续。

其他所有内容都存在服务器端。托管 AgentAPI 拥有沙箱
环境和完整的交互历史，以及那个远程交互，而不是
本地会议，是继续对话的真相来源。
响应文本既出现在本地 ADK 事件中，也出现在远程交互中
历史，但 ADK 只存储它恢复和重用远程设备的ID。
状态;它从不重新发送之前的回合。

## 局限性 {#limitations}

- **位置固定（仅 Agent 平台）:** 对于 Agent 平台后端，
  托管 AgentAPI 目前仅从`global`位置提供。
  区域端点会引发错误。
- **仅限服务器端工具：** 客户端执行的工具（Python 函数，
  可调用）和原始`types.Tool` MCP 配置（`types.Tool.mcp_servers`）则不
  支持并提出`NotImplementedError`。服务器端远程 MCP 服务器
  支持：声明为`google.adk.tools.RemoteMcpServer`规格
  `tools`。
- **仅流式流：** Agent 使用流式交互（`stream=True`）。
  后台轮询执行和严格非流式连接则不适用
  但得到了充分支持。
- **后端差异：** 目前的Gemini API 和 Agent 平台后端
  表现出略有不同的行为模式。与具体的
  你打算用的后端。

## 下一步- **示例：** [托管 Agent Basic](https://github.com/google/adk-python/tree/main/contributing/samples/managed_agent/basic)， [托管 Agent 代码执行](https://github.com/google/adk-python/tree/main/contributing/samples/managed_agent/code_execution)， [托管 Agent 远程 MCP](https://github.com/google/adk-python/tree/main/contributing/samples/managed_agent/remote_mcp)， [托管 Agent 单次执行](https://github.com/google/adk-python/tree/main/contributing/samples/managed_agent/single_turn)，以及 [托管 Agent 系统指令](https://github.com/google/adk-python/tree/main/contributing/samples/managed_agent/system_instruction)。 {#next-steps}
- **后端文档：** [Gemini API Agent](https://ai.google.dev/gemini-api/docs/agents) 和 [Agent 平台托管 Agent](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/managed-agents)。
- **相关 ADK 主题：** [Agent 模型](/docs/adk/build/models-for-agents/)， [多 Agent 工作流程](/docs/adk/build/multi-agent-workflows/)，以及 [自定义工具](/docs/adk/components/custom-tools/)。

---

原文：[Managed agents](https://adk.dev/agents/managed-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/managed-agents.md)
