---
title: "核心概念"
description: "理解 A2A 中的参与者、Agent Card、Task、Message、Part、Artifact 及交互机制。"
icon: "account_tree"
weight: 30
toc: true
---

A2A 使用一组核心概念来定义 Agent 之间的交互方式。理解这些基础组件，有助于开发和集成符合 A2A 的系统。

![展示 User、A2A Client（Client Agent）和 A2A Server（Remote Agent）的 A2A 参与者关系图](/images/a2a/a2a-actors.png "A2A 参与者")

## A2A 交互中的核心参与者

- **User**：最终用户，可以是人工操作员或自动化服务。User 发起请求，或定义需要由一个或多个 AI Agent 协助实现的目标。
- **A2A Client（Client Agent）**：代表 User 行动的应用程序、服务或另一个 AI Agent。客户端使用 A2A 协议发起通信。
- **A2A Server（Remote Agent）**：暴露实现 A2A 协议 HTTP 端点的 AI Agent 或 Agent 系统。它接收客户端请求、处理 Task，并返回结果或状态更新。对客户端而言，远端 Agent 是一个*不透明*（黑盒）系统：其内部运作、记忆和工具始终不可见。

## 基础通信元素

下表描述了 A2A 中的基础通信元素：

| 元素 | 描述 | 主要用途 |
| :--- | :--- | :--- |
| Agent Card | 描述 Agent 身份、能力、端点、技能和鉴权要求的 JSON 元数据文档。 | 让客户端发现 Agent，并了解如何安全、有效地与其交互。 |
| Task | 由 Agent 发起、具有唯一 ID 和明确生命周期的有状态工作单元。 | 便于跟踪长时间运行的操作，并支持多轮交互和协作。 |
| Message | 客户端与 Agent 之间的一轮通信，包含内容和角色（“user”或“agent”）。 | 传达指令、上下文、问题、回答或状态更新，这些内容不一定构成正式 Artifact。 |
| Part | Message 和 Artifact 中使用的基础内容容器。Part 可以承载文本内容、文件引用（URL 或内联字节）或结构化数据之一。 | 让 Agent 可以在 Message 和 Artifact 中灵活交换多种内容类型。 |
| Artifact | Agent 在 Task 期间生成的具体输出，例如文档、图像或结构化数据。 | 交付 Agent 工作的具体结果，确保输出具有结构且可检索。 |

## 交互机制

A2A 协议支持多种交互模式。每种模式适合不同的响应性和持久性需求。无论任务复杂度或持续时间如何，Agent 都可以通过这些机制可靠地交换信息：

- **请求/响应（轮询）**：客户端发送请求，服务端作出响应。对于长时间运行的任务，客户端会定期轮询服务端以获取更新。
- **使用 Server-Sent Events（SSE）的流式传输**：客户端通过一个保持打开的 HTTP 连接建立流，并实时接收服务端返回的增量结果或状态更新。
- **推送通知**：当 Task 发生重要更新时，服务端调用客户端提供的 Webhook。这适合运行时间极长的 Task 或已经断开连接的客户端。

有关流式传输和推送通知的更多信息，请参阅[流式与异步操作](./streaming-and-async/)。

## Agent Card

Agent Card 是一份 JSON 文档，相当于一张数字名片。它提供初始发现和交互配置所需的关键元数据。客户端解析 Agent Card 后，可以判断某个 Agent 是否适合当前任务、如何构造请求，以及如何安全通信。Agent Card 列出 Agent 身份、服务端点（URL）、A2A 能力、鉴权要求和技能。

## Message 与 Part

Message 表示客户端与 Agent 之间的一轮通信。它包含角色（“user”或“agent”）和唯一的 `messageId`，并包含一个或多个 Part 对象；Part 是承载实际内容的细粒度容器。这一设计让 A2A 可以独立于具体模态。

`Part` 对象是通过 `oneof` 字段结构承载不同内容类型的灵活容器。一个 Part 必须且只能包含下列内容字段之一：

- `text`：包含纯文本内容的字符串。
- `raw`：包含内联二进制文件数据的字节数组。
- `url`：引用外部文件内容的 URI 字符串。
- `data`：供机器读取的结构化 JSON 值，例如对象或数组。

此外，每个 `Part` 还可以包含：

- `mediaType`：内容的 MIME 类型，例如 `"text/plain"`、`"image/png"` 或 `"application/json"`。
- `filename`：文件或内容的可选名称。
- `metadata`：用于附加上下文的键值映射。

## Artifact

Artifact 是远端 Agent 在 Task 期间生成的具体输出或实际结果。与一般 Message 不同，Artifact 是真正的交付物。Artifact 具有唯一的 `artifactId`、人类可读的名称和一个或多个 Part 对象。Artifact 与 Task 生命周期紧密关联，可以增量流式发送给客户端。

## Agent 响应：Task 还是 Message

Agent 的响应可以是新的 `Task`，适用于需要执行长时间运行操作的情况；也可以是 `Message`，适用于能够立即响应的情况。

更多细节请参阅 [Task 的生命周期](./life-of-a-task/)。

## 其他重要概念

- **上下文（`contextId`）**：由服务端生成的标识符。它用于关联相关 `Task` 对象，并在多次交互之间延续上下文。
- **传输和格式**：A2A 通信通过 HTTP(S) 进行，所有请求和响应使用 JSON-RPC 2.0 作为载荷格式。
- **鉴权和授权**：A2A 依赖标准 Web 安全实践。鉴权要求在 Agent Card 中声明，凭据（例如 OAuth Token、API Key）通常通过 HTTP 头传递，与 A2A 协议消息本身分离。更多信息请参阅[企业级特性](./enterprise-ready/)。
- **Agent 发现**：客户端查找 Agent Card，以了解可用的 A2A 服务端及其能力的过程。更多信息请参阅 [Agent 发现](./agent-discovery/)。
- **扩展**：A2A 允许 Agent 在 AgentCard 中声明自定义协议扩展。更多信息请参阅[扩展概述](https://a2a-protocol.org/latest/topics/extensions/)。

---

原文：[Core Concepts and Components in A2A](https://a2a-protocol.org/latest/topics/key-concepts/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/key-concepts.md)
