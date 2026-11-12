---
title: "A2A 介绍"
description: "当你构建更复杂的自治系统时，你会发现单个 Agent 通常是不够的。你会希望创建能够协作解决问题的专门化 Agent。**Agent 到 Agent（A2A）协议**是"
icon: "hub"
weight: 10
toc: true
---

当你构建更复杂的自主系统时，你会发现单个 Agent 通常不够用。你会希望创建可以协作解决问题的专门 Agent。 [**Agent2Agent (A2A) 协议**](https://a2a-protocol.org) 是允许这些 Agent 相互通信的标准。

## 何时使用 A2A 与本地子 Agent {#when-to-use-a2a-vs-local-sub-agents}

- **本地子 Agent：** 这些 Agent 在与你的主 Agent 相同的应用进程中运行。它们就像内部模块或库，用于将你的代码组织成逻辑上可重用的组件。主 Agent 与其本地子 Agent 之间的通信非常快，因为它直接在内存中发生，没有网络开销。

- **远程 Agent（A2A）：** 这些是作为独立服务运行的独立 Agent，通过网络进行通信。A2A 定义了这种通信的标准协议。

在以下情况下考虑使用 **A2A**：

- 你需要通讯的 Agent 是**独立的、独立运行的服务**（例如，一个专门的金融建模 Agent）。
- Agent 由**不同团队或组织**维护。
- 你需要连接用**不同编程语言或 Agent 框架**编写的 Agent。
- 你希望在系统组件之间执行**强制的、正式的契约**（A2A 协议）。

### 使用 A2A 的具体示例 {#when-to-use-a2a-concrete-examples}

- **与第三方服务集成：** 你的主 Agent 需要从外部金融数据提供商获取实时股票价格。该提供商通过兼容 A2A 的 Agent 提供其数据。
- **微服务架构：** 你有一个被分解为更小、独立服务的大系统（例如，订单处理 Agent、库存管理 Agent、运输 Agent）。A2A 是这些服务跨网络边界通信的理想选择。
- **跨语言通信：** 你的核心业务逻辑在 Python Agent 中，但是你有一个遗留系统或用 Java 编写的专门组件，希望将其作为 Agent 集成。A2A 提供了标准化的通信层。
- **正式的 API 执行：** 你正在构建一个平台，不同团队贡献 Agent，你需要严格的契约来规范这些 Agent 如何交互，以确保兼容性和稳定性。

### 不要使用 A2A 的情况具体示例（建议使用本地子 Agent）- **内部代码组织：** 你正在拆解一个复杂任务 {#when-not-to-use-a2a-concrete-examples-prefer-local-sub-agents}
  将单个 Agent 分割成更小、易于管理的函数或模块（例如，
  `DataValidator`子 Agent，负责在处理前清理输入数据）。这些是
  为了性能和简便性，最好作为本地子 Agent 来处理。
- **性能关键的内部操作：** 子 Agent 负责
  高频、低延迟的操作，与主电源紧密耦合
  Agent 的执行（例如，处理数据的`RealTimeAnalytics`子 Agent
  同一应用内的流）。
- **共享内存/上下文：** 当子 Agent 需要直接访问主 Agent 时
  为提高效率，Agent 的内部状态或共享内存，A2A 的网络
  开销和串行化/反序列化会适得其反。
- **简单辅助函数：** 用于小型、可复用但不
  需要独立部署或复杂状态管理，这是一个简单的功能
  或同一 Agent 内的类别比单独的 A2AAgent 更为合适。

## ADK 中的 A2A 工作流程：简化视图 {#the-a2a-workflow-in-adk-a-simplified-view}

Agent Development Kit（ADK）简化了构建和连接的过程
使用 A2A 协议的特工。以下是其具体流程的简单解析
作品：

1. **使 Agent 可访问（暴露）:** 你从已有的 ADK 开始
    你希望其他 Agent 能够互动的 Agent。ADK
    提供了一种简单的方法来“暴露”该 Agent，使其成为
    **A2AServer**。该服务器作为公共接口，允许其他 Agent
    通过网络向你的 Agent 发送请求。可以把它想象成在
    你的 Agent 的网络服务器。

2. **连接到可访问 Agent（消耗）:** 在独立 Agent 中
    （这可能在同一台机器上运行，也可能在同一台机器上），你会用
    一个特殊的 ADK 分量称为`RemoteA2aAgent`。这`RemoteA2aAgent`作用
    作为一个懂得如何与**A2AServer**沟通的客户
    之前暴露。它处理网络通信的所有复杂性，
    认证和数据格式化在幕后。

从你作为开发者的角度来看，一旦你建立了这个连接，
与远程 Agent 的交互感觉就像在操作本地工具一样
或函数。ADK 抽象了网络层，使分布式 Agent 成为
系统和本地系统一样容易操作。

## A2A 支持的功能 {#supported-capabilities-in-a2a}

ADK 的 A2A 集成为复杂的 Agent 提供了三项核心能力
系统：- **推理：** 在消息传递时保留模型的推理/思维痕迹
  Agent 人之间通过 A2A。
- **长期运行工具：** 跟踪运行时间超过标准的工具调用
  响应，这样长期运行的操作不会超时。
- **Artifact：** 在 Agent 之间传递文件 Artifact（如生成文件）
  超过 A2A。

## 可视化 A2A 工作流程 {#visualizing-the-a2a-workflow}

为了进一步澄清 A2A 的工作流程，我们来看一下 的“前后对比”
既暴露又消耗了药剂，然后是合成系统。

### 揭露一名特工 {#exposing-an-agent}

**曝光前：**
你的 Agent 代码作为独立组件运行，但在这种情况下，你想要
让其他远程 Agent 能够与你的 Agent 互动。

```text
+-------------------+
| Your Agent Code   |
|   (Standalone)    |
+-------------------+
```

**暴露后：**
您的 Agent 代码已与 `A2AServer`（一个 ADK 组件）集成，使其可通过网络被其他远程 Agent 访问。

```text
+-----------------+
|   A2A Server    |
| (ADK Component) |<--------+
+-----------------+         |
        |                   |
        v                   |
+-------------------+       |
| Your Agent Code   |       |
| (Now Accessible)  |       |
+-------------------+       |
                            |
                            | (Network Communication)
                            v
+-----------------------------+
|       Remote Agent(s)       |
|    (Can now communicate)    |
+-----------------------------+
```

### 使用 Agent {#consuming-an-agent}

**使用前：**
您的 Agent（在本上下文中称为“根 Agent”）是您正在开发的需要与远程 Agent 交互的应用程序。在使用之前，它缺乏直接执行这种操作的机制。

```text
+----------------------+         +-------------------------------------------------------------+
|      Root Agent      |         |                        Remote Agent                         |
| (Your existing code) |         | (External Service that you want your Root Agent to talk to) |
+----------------------+         +-------------------------------------------------------------+
```

**食用后：**
您的根 Agent 使用 `RemoteA2aAgent`（一个 ADK 组件，作为远程 Agent 的客户端 Agent）与远程 Agent 建立通信。

```text
+----------------------+         +-----------------------------------+
|      Root Agent      |         |         RemoteA2aAgent            |
| (Your existing code) |<------->|         (ADK Client Proxy)        |
+----------------------+         |                                   |
                                 |  +-----------------------------+  |
                                 |  |         Remote Agent        |  |
                                 |  |      (External Service)     |  |
                                 |  +-----------------------------+  |
                                 +-----------------------------------+
      (Now talks to remote agent via RemoteA2aAgent)
```

### 最终系统（综合视图） {#final-system-combined-view}

该图显示了消费部分和提供部分如何连接以形成完整的 A2A 系统。

```text
Consuming Side:
+----------------------+         +-----------------------------------+
|      Root Agent      |         |         RemoteA2aAgent            |
| (Your existing code) |<------->|         (ADK Client Proxy)        |
+----------------------+         |                                   |
                                 |  +-----------------------------+  |
                                 |  |         Remote Agent        |  |
                                 |  |      (External Service)     |  |
                                 |  +-----------------------------+  |
                                 +-----------------------------------+
                                                 |
                                                 | (Network Communication)
                                                 v
Exposing Side:
                                               +-----------------+
                                               |   A2A Server    |
                                               | (ADK Component) |
                                               +-----------------+
                                                       |
                                                       v
                                               +-------------------+
                                               | Your Agent Code   |
                                               | (Exposed Service) |
                                               +-------------------+
```

## 具体用例：客户服务和产品目录 Agent {#concrete-use-case-customer-service-and-product-catalog-agents}

让我们考虑一个实际案例：一个**客户服务 Agent**需要从一个独立的**产品目录 Agent**中检索产品信息。

### A2A 之前 {#before-a2a}

最初，你的客户服务 Agent 可能没有直接的、标准化的方式来查询产品目录 Agent，特别是当它是一个独立服务或由不同团队管理时。

```text
+-------------------------+         +--------------------------+
| Customer Service Agent  |         |  Product Catalog Agent   |
| (Needs Product Info)    |         | (Contains Product Data)  |
+-------------------------+         +--------------------------+
      (No direct, standardized communication)
```

### 使用 A2A 后 {#after-a2a}

通过使用 A2A 协议，产品目录 Agent 可以将其功能作为 A2A 服务公开。然后，您的客户服务 Agent 可以使用 ADK 的 `RemoteA2aAgent` 轻松地使用此服务。

```text
+-------------------------+         +-----------------------------------+
| Customer Service Agent  |         |         RemoteA2aAgent            |
| (Your Root Agent)       |<------->|         (ADK Client Proxy)        |
+-------------------------+         |                                   |
                                    |  +-----------------------------+  |
                                    |  |     Product Catalog Agent   |  |
                                    |  |      (External Service)     |  |
                                    |  +-----------------------------+  |
                                    +-----------------------------------+
                                                 |
                                                 | (Network Communication)
                                                 v
                                               +-----------------+
                                               |   A2A Server    |
                                               | (ADK Component) |
                                               +-----------------+
                                                       |
                                                       v
                                               +------------------------+
                                               | Product Catalog Agent  |
                                               | (Exposed Service)      |
                                               +------------------------+
```

在这个设置中，首先，需要通过 A2A 服务器暴露产品目录 Agent。然后，客户服务 Agent 可以简单地像调用工具一样调用 `RemoteA2aAgent` 上的方法，而 ADK 会处理与产品目录 Agent 的所有底层通信。这允许关注点的清晰分离，并便于专用 Agent 的轻松集成。

## 下一步 {#next-steps}

既然你已经了解了 A2A 的“为什么”，让我们深入了解“如何”。

- **继续下一篇指南：**
  快速入门：暴露你的 Agent，[Python](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/python/) 中，[Go](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/go/) 中，[Java（官方英文）](https://adk.dev/a2a/quickstart-exposing-java/) 中

---

原文：[Introduction to A2A](https://adk.dev/a2a/intro/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/intro.md)
