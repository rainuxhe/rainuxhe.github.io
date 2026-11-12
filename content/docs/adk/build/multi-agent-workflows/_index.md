---
title: "多 Agent 工作流"
description: "随着 Agent 应用程序的复杂性增加，将其构建为单一的、整体的 Agent 可能会变得难以开发、评估和维护。Agent Development Kit（ADK）支持构建复杂的 Agent 应用"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

随着 Agent 应用程序的复杂性增加，将其构建为单一的整体 Agent 在开发、评估和维护上可能会变得困难。Agent Development Kit（ADK）支持通过将多个 Agent 和可执行节点组合成*Agent 工作流*来构建复杂的 Agent 应用程序。使用多个元素来构建 Agent 可以在您的 Agent 应用程序日益复杂和高级时提供许多好处：

* **可预测性：** 使用模板逻辑或基于图的执行机制创建更可控的任务执行流程。
* **可靠性：** 确保任务始终以所需的顺序或模式执行。
* **结构性：** 通过组合 Agent 元素、分离任务职责以及限制特定任务的数据上下文，更可管理地构建复杂流程。

工作流可以使用多种结构和架构构建，如下图所示：

![ADK 中的工作流类型](/images/adk/workflows_overview.svg)

**图1.** ADK 工作流可以具有灵活的执行路径，或遵循特定的模板化执行模式。

以下是使用 ADK 为您的 Agent 应用程序构建工作流的多种方法的快速指南：

*   [**基于图的工作流：**](/docs/adk/build/graph-workflows/) (ADK 2.0及更高版本)
    这种工作流类型允许您将AI驱动的 Agent 和确定性执行节点组合成灵活的执行图，其中可以包含决策分支。

*   [**动态工作流：**](/docs/adk/build/graph-workflows/dynamic-workflows/) (ADK 2.0及更高版本)
    这种工作流类型允许您使用完整的程序化代码逻辑组合AI驱动的 Agent 和确定性执行节点。

*   [**协作工作流：**](/docs/adk/build/multi-agent-workflows/collaborative-workflows/) (ADK 2.0及更高版本)
    这种工作流类型允许单个 Agent 在动态协调者角色下，通过一组指定的子 Agent 完成任务。

*   [**模板工作流：**](/docs/adk/build/multi-agent-workflows/template-workflows/)
    这些预构建工作流继承自***BaseAgent***，提供固定的执行逻辑结构，包括序列、循环和并行执行。

请点击上述链接以获取有关每种 ADK 工作流架构的更多信息。

{{% alert context="default" %}}
**实验性功能：Agent 路由**

Agent 路由是一项实验性功能，允许您在运行时使用路由器函数在多个 Agent 之间进行选择，用于回退、A/B测试和自动路由。欲了解更多信息，请参见[Agent 路由](/docs/adk/build/multi-agent-workflows/agent-routing/)。
{{% /alert %}}

---

原文：[Workflows: multi-agent, multi-node applications](https://adk.dev/workflows/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/workflows/index.md)
