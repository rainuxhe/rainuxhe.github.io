---
title: "取消 Agent 运行"
description: "当 Agent 运行时间过长、遇到变化的条件，或不再需要时，您可能希望取消它而不丢失已完成的工作。在 ADK 中取消是非破坏性的：已提交的事件"
icon: "article"
weight: 60
toc: true
---

当前 Python/Go 版本暂不支持此功能。

当一个 Agent 运行时间过长、遇到变化的条件，或不再需要时，您可能希望在不丢失已完成工作的情况下取消它。ADK 中的取消是非破坏性的：已经提交到会话的事件将继续保留。

ADK 支持使用 `AbortController` 和 `AbortSignal` 进行优雅取消。将 `AbortSignal` 传递给 `runner.runAsync()`，可在执行堆栈中的任意位置取消整个调用，包括 Agent 执行、LLM 生成、工具执行和插件回调。

## 开始使用 {#get-started}

创建一个 `AbortController`，将其 `signal` 传递给 `runner.runAsync()`，并在您想要取消执行时调用 `controller.abort()`：

## 取消的传播方式 {#how-cancellation-propagates}

当您中止信号时，取消会向下传播到整个执行堆栈。每个组件在关键生命周期节点检查 `abortSignal.aborted`，并在检测到取消时提前终止：

| 组件 | 中止时发生的情况 |
| :--- | :--- |
| **Runner** | 在会话获取之前、插件回调之后以及事件流循环中停止。 |
| **LlmAgent** | 在执行步骤之间、模型回调之前/之后以及响应流过程中停止。 |
| **LoopAgent** | 在循环迭代之间和子 Agent 执行之间停止。 |
| **ParallelAgent** | 在合并并行子 Agent 运行结果时停止。 |
| **Models (Gemini)** | 该信号通过 `config.abortSignal` 传递给底层 Google GenAI SDK，取消正在进行的 HTTP 请求。 |
| **AgentTool** | 将信号传递给子 AgentRunner，并在会话创建后检查中止。 |
| **MCPTool** | 将信号传递给 MCP 客户端的 `callTool` 方法。 |

`InvocationContext` 还会在信号上注册监听器，一旦触发，自动设置 `endInvocation = true`，通知所有组件进行收尾。

### 取消时的行为 {#behavior-on-cancellation}

当 `AbortSignal` 被触发时，适用如下行为：

- **优雅终止：** `runner.runAsync()` 返回的异步生成器完成（停止产生事件）而不抛出错误。
- **已提交事件保留：** 在中止之前已经产生并被 Runner 处理的事件，仍会保留在会话历史中。
- **无部分事件：** 正在处理但尚未生成的事件将被丢弃。
- **资源清理：** 向 Gemini API 发起的进行中 LLM 请求通过 SDK 的原生 `AbortSignal` 支持被取消，从而释放网络资源。

## 高级示例 {#advanced-examples}

以下示例展示了超出基本 `AbortController` 使用的其他取消模式。

### 带超时的取消使用 `AbortSignal.timeout()` 可以在指定时间后自动取消 Agent 运行。这对于强制执行 Agent 执行的时间限制非常有用。 {#cancellation-with-a-timeout}

使用入门示例中的相同 Agent 和 Runner 设置，从 `const controller` 开始替换所有内容为：

你也可以将超时与程序化取消结合使用 `AbortSignal.any()`。使用相同的设置，从 `const
controller` 开始替换所有内容为：

### 自定义工具中的 AbortSignal {#abortsignal-in-custom-tools}

当你将 `AbortSignal` 传递给 `runner.runAsync()` 时，它在你的自定义工具中 `toolContext.abortSignal` 可用。以下示例展示了在自定义工具中检查中止信号的模式：

---

原文：[Cancel agent runs](https://adk.dev/runtime/cancel/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/cancel.md)
