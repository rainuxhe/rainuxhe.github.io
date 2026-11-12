---
title: "模板工作流"
description: "本节介绍*模板工作流*，也称为*工作流 Agent*，它们是控制一个或多个子 Agent 执行流程的专用 Agent。模板工作流 Agent 是专用组件，d"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

本节介绍*模板工作流*，也称为*工作流 Agent*，它们是用于控制一个或多个子 Agent 执行流程的专用 Agent。模板工作流 Agent 是专门设计用于编排子 Agent 执行流程的组件。它们的主要作用是管理其他 Agent 的运行方式和时间，定义流程的控制流。

{{% alert context="warning" %}}
**已弃用：请使用基于图的工作流**

在 ADK Python、TypeScript、Go 和 Kotlin 中，模板工作流已被更灵活的工作流结构取代，包括[基于图的工作流](/docs/adk/build/graph-workflows/)和[动态工作流](/docs/adk/build/graph-workflows/dynamic-workflows/)。这些工作流架构提供了更多的控制、灵活性，并能够随着时间演进您的 Agent 工作流。
{{% /alert %}}

![ADK 中的模板 Agent 工作流](/images/adk/template_workflows.svg)

**图 1.** ADK 中模板工作流的执行模式

模板工作流 Agent 基于预定义逻辑运行。它们根据类型（如顺序、并行或循环）确定执行顺序，而无需咨询 AI 模型来协助编排。这种方法产生了确定性和可预测的执行模式。模板工作流包括以下任务执行结构，每种结构实现不同的任务完成模式：

## 顺序 Agent 工作流

按顺序依次执行子 Agent。

[了解更多](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/)

## 循环 Agent 工作流

重复执行其子 Agent，直到满足特定的终止条件。

[了解更多](/docs/adk/build/multi-agent-workflows/template-workflows/loop-workflow/)

## 并行 Agent 工作流

并行执行多个子 Agent。

[了解更多](/docs/adk/build/multi-agent-workflows/template-workflows/parallel-workflow/)

---

原文：[Template agent workflows](https://adk.dev/agents/workflow-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/workflow-agents/index.md)
