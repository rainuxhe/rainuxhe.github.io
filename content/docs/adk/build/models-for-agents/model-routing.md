---
title: "模型路由"
description: "模型路由是实验性的，将来的版本可能会发生变化。我们欢迎您的反馈！"
icon: "article"
weight: 60
toc: true
---

当前 Python/Go 版本暂不支持此功能。

{{% alert context="default" %}}
**实验性**

模型路由是实验性的，可能会在未来的版本中发生变化。我们欢迎您的[反馈](https://github.com/google/adk-js/issues/new?template=feature_request.md)!
{{% /alert %}}
默认情况下，`LlmAgent` 使用单个模型。当您需要为每个请求动态选择不同模型时，可以定义一个路由函数来选择使用哪个模型。`RoutedLlm` 提供了此功能，支持在出错时回退模型、模型之间的 A/B 测试，以及按输入复杂性自动路由。如果所选模型在生成任何输出之前失败，则再次调用路由函数并传入错误上下文，以便它可以选择不同的模型。

将 `RoutedLlm` 作为 `LlmAgent` 的 `model` 参数传入。当仅模型在路由之间变化时使用 `RoutedLlm`。如果您还需要切换指令、工具或子 Agent，请改用 [`RoutedAgent`](/docs/adk/build/multi-agent-workflows/agent-routing/)。

## 路由工作原理 {#how-routing-works}

`LlmRouter` 函数接收可用模型的映射和当前 `LlmRequest`，并返回要使用的模型键：

`models` 参数可以接受带有显式键的 `Record<string, BaseLlm>`，或者 `BaseLlm` 实例数组。如果提供数组，则每个模型的名称用作其键。

故障转移遵循与 [`RoutedAgent`](/docs/adk/build/multi-agent-workflows/agent-routing/#how-routing-works) 相同的规则：仅当所选模型在生成任何响应之前失败时才会重新调用路由器。在输出之后，错误将直接传播而不重试。路由器可以返回 `undefined` 以停止重试并传播最后的错误。

**实时连接：** `RoutedLlm.connect()` 在连接时选择模型。一旦建立实时连接，模型不能在中途切换。

## 基本用法 {#basic-usage}

以下示例创建了一个 `RoutedLlm`，它首先尝试主模型，如果主模型失败，则回退到备用模型。路由器检查 `errorContext.failedKeys` 以避免重新选择已失败的模型：

---

原文：[Route between models](https://adk.dev/agents/models/routing/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/routing.md)
