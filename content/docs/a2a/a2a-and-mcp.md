---
title: "A2A 与 MCP"
description: "从横向与纵向分层出发，理解 A2A 和 MCP 的职责边界及互补关系。"
icon: "compare_arrows"
weight: 20
toc: true
---

在 AI Agent 开发中，出现了两类促进互操作性的关键协议。一类将 Agent 连接到工具和资源，另一类支持 Agent 间协作。Agent2Agent（A2A）协议与 [Model Context Protocol](https://modelcontextprotocol.io/)（MCP）分别解决这两个不同但高度互补的需求。

## 横向与纵向分层

可以从连接方向来理解这两种协议。

**MCP 是纵向的。** 它增强单个 Agent 的深度。你可以在一个统一体系内构建 Agent 系统，也就是在单个应用中放置一个或多个 Agent。每增加一个 MCP 连接，Agent 就获得另一个工具、资源或技能。连接越多，Agent 独立完成工作的能力就越强。

**A2A 是横向的。** 它跨越边界连接 Agent。另一个 Agent 可能属于其他团队、其他部门或合作伙伴组织。你的 Agent 会主动联系这些 Agent，以发现它们、进行协商并交换信息。

A2A 的横向能力并不只是向另一个 Agent 询问状态更新。它更接近一个人向另一个人寻求帮助：*“你在做这个项目吗？了解相关情况吗？能否分享已有内容？如果不能，哪个 Agent 可以帮忙？”* Agent 会打破僵局、交换上下文，并根据交流情况继续深入，或者被指引到更合适的地方完成任务。

两者结合使用时，MCP 为每个 Agent 提供深度，A2A 则为整个系统扩展覆盖范围。

## Model Context Protocol

Model Context Protocol（MCP）规定 AI Agent 如何使用单个工具和资源，例如数据库或 API。

该协议提供以下能力：

- 标准化 AI 模型和 Agent 连接、使用工具、API 及其他外部资源的方式。
- 定义一种结构化方式描述工具能力，类似大语言模型中的函数调用。
- 向工具传递输入并接收结构化输出。
- 支持常见用例，例如 LLM 调用外部 API、Agent 查询数据库，或 Agent 连接预定义函数。

## Agent2Agent 协议

Agent2Agent 协议让不同 Agent 通过协作实现共同目标。

该协议提供以下能力：

- 标准化相互独立、通常不透明的 AI Agent 之间以对等身份通信和协作的方式。
- 为 Agent 提供应用层协议，使其可以相互发现、协商交互、管理共享任务，并交换会话上下文和复杂数据。
- 支持常见用例。例如，客服 Agent 可以把问题委派给计费 Agent；旅行 Agent 可以与航班、酒店和活动 Agent 协调。

## 为什么需要两种协议？

构建复杂 AI 系统时，这两种协议都不可或缺。A2A 与 MCP 的区别取决于 Agent 与什么对象交互。

- **工具和资源（MCP 领域）**：
    - **特征**：通常是具有明确定义、结构化输入和输出的基础组件，执行特定功能，并且通常无状态。例如计算器、数据库查询 API 或天气查询服务。
    - **用途**：Agent 使用工具收集信息并执行离散功能。
- **Agent（A2A 领域）**：
    - **特征**：更具自主性的系统。它们会推理、规划并使用多种工具，在较长交互中维护状态，还会进行复杂、通常多轮的对话，以处理新颖或不断变化的任务。
    - **用途**：Agent 与其他 Agent 协作，解决更广泛、更复杂的目标。

## A2A ❤️ MCP：Agent 系统的互补协议

Agent 应用可以使用 A2A 与其他 Agent 通信。在每个 Agent 内部，则使用 MCP 操作自己的工具和资源。

![展示 A2A 与 MCP 如何协同工作的图。User 使用 A2A 与 Agent A 交互，Agent A 使用 A2A 与 Agent B 交互，Agent B 使用 MCP 与 Tool 1 和 Tool 2 交互。](/images/a2a/a2a-mcp.png "A2A 与 MCP 协同工作")

*A2A 将 Agent 彼此连接；MCP 将每个 Agent 连接到自己的工具。*

### 示例场景：汽车修理店

设想一家由自主 AI Agent“机械师”组成的汽车修理店。这些机械师使用专用工具诊断和维修问题，工具包括车辆诊断扫描仪、维修手册和平台升降机。维修过程可能涉及长时间对话、研究以及与零件供应商合作。

- **客户交互——用户通过 A2A 与 Agent 交互。** 客户或其助手 Agent 与“门店经理”Agent 对话。

    例如，客户可能会说：“我的车发出了咔嗒声。”

- **诊断对话——Agent 通过 A2A 与 Agent 交互。** 门店经理 Agent 与相关 Agent 反复交流，完成诊断。

    例如，经理可能会问：“你能发一段异响的视频吗？”或者“我看到有液体泄漏。这种情况持续多久了？”。

- **内部工具使用——Agent 通过 MCP 使用工具。** 门店经理把任务分配给机械师 Agent，机械师需要诊断问题，因此使用 MCP 调用专用工具。

    例如：

    - MCP 调用“车辆诊断扫描仪”工具：
        `scan_vehicle_for_error_codes(vehicle_id='XYZ123')`
    - MCP 调用“维修手册数据库”工具：
        `get_repair_procedure(error_code='P0300', vehicle_make='Toyota',
        vehicle_model='Camry')`
    - MCP 调用“平台升降机”工具：`raise_platform(height_meters=2)`

- **供应商交互——Agent 通过 A2A 与 Agent 交互。** 机械师 Agent 发现需要某个特定零件，于是通过 A2A 与“零件供应商”Agent 对话并订购该零件。

    例如，机械师 Agent 可能会问：“你们有 2018 款 Toyota Camry 的 #12345 号零件库存吗？”

- **订单处理——Agent 通过 A2A 与 Agent 交互。** 零件供应商 Agent 同样是一个符合 A2A 的系统。它会作出回应，并可能因此生成订单。

在这个示例中：

- A2A 负责更高层的对话式、面向任务的交互。它把客户与修理店连接起来，也把修理店的 Agent 与外部供应商 Agent 连接起来。
- MCP 让机械师 Agent 可以使用特定的结构化工具，执行诊断和维修功能。

## 将 A2A Agent 表示为 MCP 资源

A2A 服务端（远端 Agent）可以把部分技能暴露为兼容 MCP 的资源。当这些技能定义明确，并且能够以类似工具的无状态方式调用时，这种方式最合适。另一个 Agent 随后可以通过 MCP 风格的工具描述来“发现”该技能，这些描述可以从 Agent Card 派生。

不过，A2A 的主要优势仍是支持灵活、有状态、协作式的交互，这些交互超出了典型工具调用的范围。A2A 关注 Agent 围绕任务展开*合作*，MCP 更关注 Agent *使用*能力。

将两者结合使用：A2A 处理 Agent 间协作，MCP 处理工具集成。这样便能构建更强大、更灵活、更具互操作性的 AI 系统。

---

原文：[A2A and MCP: Detailed Comparison](https://a2a-protocol.org/latest/topics/a2a-and-mcp/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/a2a-and-mcp.md)
