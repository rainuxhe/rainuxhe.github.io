---
title: "对话上下文"
description: "有意义的多轮对话要求 Agent 理解上下文。就像人类一样，他们需要回忆对话历史：已经说过和做过的内容，以保持连贯性并避免重复。Agent"
icon: "article"
weight: 10
toc: true
---

支持版本：Python, Go。

有意义的多轮对话需要 Agent 理解上下文。就像人类一样，它们需要回忆对话历史：已经说过和做过的事情，以保持连续性并避免重复。Agent Development Kit（Agent Development Kit，ADK）提供了通过`Session`、`State`和`Memory`来管理这些上下文的结构化方法。

## 核心概念 {#core-concepts}

将与 Agent 的不同对话实例视为不同的**对话线程**，可能会利用**长期知识**。

1.  **`Session`**：当前对话线程

    *   表示用户与您的 Agent 系统之间的*单次正在进行的交互*。
    *   包含该 Agent 在*特定交互中*采取的消息和操作的时间顺序（参见`Events`）。
    *   `Session`还可以保存仅在*此对话中*相关的临时数据（`State`）。

2.  **`State`（`session.state`）**：当前对话中的数据

    *   存储在特定`Session`中的数据。
    *   用于管理仅与*当前活跃*对话线程相关的信息（例如本次聊天中的购物车物品、在本次会话中提到的用户偏好）。

3.  **`Memory`**：可搜索的跨会话信息

    *   表示可能跨*多次过去会话*或包含外部数据源的信息存储。
    *   它充当一个知识库，供 Agent*搜索*以回忆超出当前对话的背景信息或上下文。

## 上下文管理：服务 {#managing-context-services}

ADK 提供服务来管理这些概念：

1.  **`SessionService`**：管理不同的对话线程（`Session`对象）

    *   处理生命周期：创建、检索、更新（追加`Events`，修改`State`）以及删除单个`Session`。

2.  **`MemoryService`**：管理长期知识存储（`Memory`）

    *   处理信息摄取（通常来源于已完成的`Session`）进入长期存储。
    *   提供基于查询搜索此存储知识的方法。**实现**：ADK 为 `SessionService` 和 `MemoryService` 提供了不同的实现，使您能够选择最适合您应用程序需求的存储后端。值得注意的是，这两个服务都提供了**内存实现**；这些实现专为**本地测试和快速开发**设计。需要记住的是，**使用这些内存选项存储的所有数据（会话、状态或长期知识）在应用程序重启时都会丢失**。为了实现超出本地测试的持久性和可扩展性，ADK 还提供了基于云和数据库的服务选项。

**总结**：

*   **`Session` & `State`**：关注**当前交互**——*单次活动会话*的历史和数据。主要由 `SessionService` 管理。
*   **Memory（记忆）**：关注**过去和外部信息**——一个*可检索的档案*，可能跨越多次对话。由 `MemoryService` 管理。

## 接下来？ {#whats-next}

在以下章节中，我们将深入探讨这些组件：

*   **`Session`**：了解其结构和 `Events`。
*   **`State`**：如何有效地读取、写入和管理特定会话的数据。
*   **`SessionService`**：为您的会话选择正确的存储后端。
*   **`MemoryService`**：探索存储和检索更广泛上下文的选项。

理解这些概念对于构建能够进行复杂的、有状态的和上下文感知的对话的智能 Agent 至关重要。

---

原文：[Conversational Context: Session, State, and Memory](https://adk.dev/sessions/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/sessions/index.md)
