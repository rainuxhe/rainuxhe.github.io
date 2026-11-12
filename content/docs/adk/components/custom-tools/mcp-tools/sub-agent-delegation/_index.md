---
title: "子 Agent 委托"
description: "您已经了解了如何使用**直接 MCP 工具集成**将您的 Agent 连接到外部资源，以及如何通过**Agent 开放的 MCP 服务器**向外部客户提供您的 Agent 服务。然而，随着您的 ADK 多个 a"
icon: "article"
weight: 40
toc: true
---

您已经了解了如何使用 **直接 MCP 工具集成** 将您的 Agent 连接到外部资源，以及如何通过 **Agent 开放的 MCP 服务器** 向外部客户提供您的 Agent 服务。然而，随着您的 ADK 多 Agent 功能的增长，您可能需要一种方法来隔离复杂的多步推理，而不会过载单个模型的上下文窗口。

## 开始使用 {#get-started}

```python
import os
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

# 步骤 1：初始化您的 MCP 连接
mcp_connection = StdioConnectionParams(
    server_params=StdioServerParameters(
        command='npx',
        args=['-y', '@modelcontextprotocol/server-postgres', 'postgres://user:pass@localhost:5432/db'],
    )
)

# 步骤 2：创建子子 Agent 并附加 McpToolset
database_sub_agent = LlmAgent(
    name="database_sub_agent",
    model="gemini-flash-latest",
    description="Delegates tasks to a database specialist...",
    instruction="You are a SQL expert...",
    tools=[McpToolset(connection_params=mcp_connection, tool_filter=['query_db', 'list_tables'])]
)
database_tool = AgentTool(agent=database_sub_agent)

# 步骤 3：向您的主根 Agent 提供 AgentTool
root_agent = LlmAgent(
    name="primary_orchestrator",
    model="gemini-pro-latest",
    instruction="You are the main assistant. You have access to specialized agents. Delegate data retrieval tasks to your database tool.",
    tools=[database_tool]
)
```

## 架构角色与工具适应 {#architectural-role-and-tool-adaptation}
在 ADK 框架中，`AgentTool` 会对 `LlmAgent` 进行封装，使其暴露为原生
工具到父编排器。子 Agent 通过`McpToolset`消耗工具，
该系统通过`list_tools`连接到底层 MCP 服务器，转换
将外部 MCP 工具定义为兼容 ADK 的`BaseTool`实例，
所有执行调用（`call_tool`）异步 Agent。

## 工具范围界定与认知过滤（`tool_filter`） {#tool-scoping-and-cognitive-filtering-toolfilter}
当将`McpToolset`分配给专门的子 Agent 时，你可以限制
使用`tool_filter`参数提供给该 Agent 的具体工具：
* **认知焦点：** 仅暴露与子 Agent 相关的具体动作
  授权，如“read_file”、“list_directory”。
* **安全性与沙箱：** 防止意外访问危险工具
  由 MCP 服务器暴露，将执行表面与不可预测性隔离开来
  输入。

## 连接运输模式 {#connection-transport-modes}
子 Agent 的`McpToolset`必须配置为两个主 Agent 之一
根据部署架构的不同连接模式：
* **本地子进程（`StdioConnectionParams`）:** 生成本地可执行文件或
  例如，通过`npx`或`python`进行标准输入/输出通信。
  最适合自给自足的单容器环境。
* **远程网络（`StreamableHTTPConnectionParams` / `SseConnectionParams`）:**
  通过 HTTP/SSE 连接，头部如 `X-Goog-Api-Key` 或 `Authorization`。
  最适合可扩展、多租户或独立管理的 MCP 后端。

## 定义与生命周期规则 {#definition-and-lifecycle-rules}
* **生产环境的同步实例化：** 部署多 Agent 时
  设置、云运行、GKE、Agent 引擎、子 Agent 及其`McpToolset`
  必须在 `agent.py` 中同步实例化，而非在异步中实现
  工厂功能。
* **会话持久化与恢复：** `McpToolset`支持序列化
  通过`__getstate__`和`__setstate__`。而会话状态则在
  生命周期事件、MCP 套接字/stdio 连接会动态重新初始化
  当 Agent 进程恢复时。
* **清理管理：** 在自定义运行时，外部`adk web`运行，
  通过`await toolset.close()`或`await runner.close()`的显式拆解确保
  后台服务器子进程和网络连接净地终止。

---

原文：[Manage MCP with Sub-Agents](https://adk.dev/tools-custom/mcp-tools/agent-managed/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/mcp-tools/agent-managed.md)
