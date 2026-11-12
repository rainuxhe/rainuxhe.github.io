---
title: "Agent 路由"
description: "Agent 路由是实验性的，将来的版本可能会发生变化。我们欢迎您的反馈！"
icon: "article"
weight: 30
toc: true
---

当前 Python/Go 版本暂不支持此功能。

{{% alert context="default" %}}
**实验性**

Agent 路由仍处于实验阶段，未来版本可能会有所调整。欢迎
你的
[反馈](https://github.com/google/adk-js/issues/new?template=feature_request.md)！
{{% /alert %}}
在为不同任务构建 Agent 时，你可以定义一个路由函数
选择哪一个在运行时处理每个调用。`RoutedAgent` 提供
该能力支持 Agent 在错误情况下的备援、A/B测试、规划模式，
以及按输入复杂度自动路由。如果选定 Agent 在之前失败
产生任意输出后，路由函数再次调用并带有错误上下文，因此
它可以选择一个备选方案。

`RoutedAgent` 不同于 [workflow agents](/docs/adk/build/multi-agent-workflows/template-workflows/) 类似
`SequentialAgent`或`ParallelAgent`，它们协调多个 Agent 在
固定模式，且来自[LLM 驱动]
委托](/docs/adk/build/multi-agent-workflows/template-workflows/custom-template-workflows/#delegation)，其中
LLM 决定交给哪个 Agent。使用`RoutedAgent`，你写一个
显式路由函数，每次调用选择**一个**Agent。对于
模型级路由，参见[Model routing](/docs/adk/build/models-for-agents/model-routing/)。

## 路由的运作方式 {#how-routing-works}

`RoutedAgent`和[`RoutedLlm`](/docs/adk/build/models-for-agents/model-routing/)都由共享的电源驱动
处理选择和故障切换的路由工具。

路由器函数接收可用 Agent 的映射和当前
上下文，返回执行 Agent 的密钥。它可以是同步的，或者
异步：

**`agents`参数**接受以下`Record<string, BaseAgent>`
显式键，或 Agent 数组。如果提供了数组，每个 Agent 的
`name`属性作为其钥匙。

**故障切换行为：**

- 路由器首先被呼叫，无需`errorContext`进行初始
  选择。
- 如果所选 Agent 在产生任何事件之前抛出错误，则
  再次调用路由器，`errorContext`包含`failedKeys` 和
  `lastError`。
- 如果所选 Agent 在产生事件后抛出错误，则错误
  直接传播且不重试，因为部分结果已经
  发射。
- 已尝试过的密钥无法重新选择。如果路由器返回
  之前失败的密钥会导致错误传播。
- 如果路由器返回`undefined`，路由停止并抛出最后一个错误。

## 基本用法 {#basic-usage}

创建多个 Agent，定义一个返回密钥的路由器函数，然后进行封装
它们在`RoutedAgent`中。以下示例在两个 Agent 之间路由
在一个可于调用间变化的外部配置值上：

在下一次召唤前将`config.selectedAgent`改为`'agent_b'`
转接到另一个 Agent。

## 失误的后盾当 Agent 失败时，路由器会再次使用 `errorContext` 被调用，以便它可以选择一个备用。仅在 Agent 在产生任何事件之前失败时，故障切换才适用（参见 [如何工作路由](#how-routing-works)）。以下示例检查 `errorContext.failedKeys` 以避免重新选择失败的 Agent： {#fallback-on-error}

## 规划模式 {#planning-mode}

路由器可以读取任何外部状态，以在具有不同指令、模型和工具的 Agent 之间进行选择。这使您能够实现规划模式，在该模式下，Agent 会动态切换行为。例如，一个基本 Agent 可能拥有读取和写入工具，而规划 Agent 仅限于只读访问，并使用更强大的模型进行分析。

以下示例显示了不同的 `RoutedAgent` 配置。有关完整的 Runner 设置，请参见 [基本用法](#basic-usage)。

在调用之前设置 `planningMode = true`，以路由到具有其受限工具集和不同指令的规划 Agent。

## 按复杂度自动路由 {#auto-routing-by-complexity}

路由器函数可以调用轻量级分类器模型，对输入进行分类并相应地路由到不同的 Agent。因为路由器可以是异步的，所以您可以在选择 Agent 之前在其中进行 LLM 调用。

以下示例显示了不同的 `RoutedAgent` 配置。有关完整的 Runner 设置，请参见 [基本用法](#basic-usage)。

---

原文：[Route between agents](https://adk.dev/agents/routing/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/routing.md)
