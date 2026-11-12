---
title: "A2A 扩展"
description: "ADK 提供了一个 Agent2Agent (A2A) 支持的扩展，以改进消息和数据处理，这是更新的 A2aAgentExecutor 类的一部分。更新版本包括对核心 Agent 的架构更改的更新"
icon: "hub"
weight: 40
toc: true
---

支持版本：Python v1.27.0。

ADK 提供了一个用于 Agent2Agent（A2A）支持的扩展，以改进消息和数据处理，这作为更新的 [A2aAgentExecutor](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/executor/a2a_agent_executor_impl.py) 类的一部分。更新版本包括对核心 Agent 执行逻辑的架构更改更新以及对 A2A 的扩展，以改进数据处理，同时也提供与现有 A2A Agent 的向后兼容性。

激活 A2A 扩展选项会指示服务器使用更新后的 Agent 执行器实现。虽然此更新提供了一些一般性的优势，但它主要解决了在 A2A 和 ADK 都以流式模式运行时，在传统 A2A-ADK 实现中发现的关键限制。新实现解决了以下问题：

- **消息重复：** 防止用户消息在任务历史中重复。
- **输出错误分类：** 阻止远程 Agent ADK 输出被错误地转换为事件思考。
- **子 Agent 数据丢失：** 确保远程 Agent 的 ADK 输出可靠保存，消除在远程 Agent 的子 Agent 树中嵌套多个 Agent 时的数据丢失。

## 客户端扩展激活 {#client-side-extension-activation}

客户端通过传输定义的 [A2A 扩展 ](https://a2a-protocol.org/latest/topics/extensions/) 激活机制来指示其希望使用此扩展。
对于 JSON-RPC 和 HTTP 传输，通过 X-A2A-Extensions HTTP 头部指示。
对于 gRPC，通过 X-A2A-Extensions 元数据值指示。

要激活此扩展，客户端可以使用 `use_legacy=False` 实例化 `RemoteA2aAgent`。这将在发送的请求的请求扩展中添加 `https://google.github.io/adk-docs/a2a/a2a-extension/`。激活此扩展意味着服务器将使用新的 Agent 执行器实现。

```python
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent

remote_agent = RemoteA2aAgent(
    name="remote_agent",
    agent_card="http://localhost:8000/a2a/remote_agent/.well-known/agent-card.json",
    use_legacy=False,
)
```

`A2aAgentExecutor` 默认使用新的实现，如果在请求中检测到 a2a 扩展。
要选择不使用新的 Agent 执行器实现，客户端可以简单地不发送此扩展（用 `use_legacy=True` 实例化 `RemoteA2aAgent`），或者服务器的 `A2aAgentExecutor` 可以用 `use_legacy=True` 实例化。

## 工作原理 {#how-it-works}

在接收到请求后，[A2aAgentExecutor](https://github.com/google/adk-python/blob/main/src/google/adk/a2a/executor/a2a_agent_executor.py) 会检测该扩展。它会理解客户端请求使用新的 Agent 执行器逻辑，并相应地将请求路由到新实现。为了确认请求已被处理，它随后会包含在发送回客户端的响应元数据中的“已激活扩展”列表里，以及在 A2A 事件的元数据中。

## Agent 卡定义 {#agent-card-definition}

Agent 会在其 AgentCard 中的 AgentCapabilities.extensions 列表中声明此扩展能力。

示例 AgentExtension 块:

```json
{
  "uri": "https://google.github.io/adk-docs/a2a/a2a-extension/",
  "description": "Ability to use the new agent executor implementation",
  "required": false
}
```

---

原文：[A2A extension for improved reliability](https://adk.dev/a2a/a2a-extension/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/a2a-extension.md)
