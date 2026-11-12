---
title: "Agent 运行时"
description: "ADK 提供了几种在开发过程中运行和测试您的 Agent 的方法。请选择最适合您开发工作流程的方法。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

ADK 提供了多种方法来在开发过程中运行和测试您的 Agent。请选择最适合您开发工作流程的方法。

## 运行 Agent 的方法 {#ways-to-run-agents}

## 开发用户界面 {#technical-reference}

使用 `adk web` 启动基于浏览器的界面，与您的 Agent 进行交互。

[使用网页版界面](/docs/adk/run/agent-runtime/web-interface/)

## 命令行

使用 `adk run` 直接在终端中与您的 Agent 交互。

[使用命令行](/docs/adk/run/agent-runtime/command-line/)

## API 服务器

使用 `adk api_server` 通过 RESTful API 公开您的 Agent。

[使用 API 服务器](/docs/adk/run/agent-runtime/api-server/)

## 环境 Agent

构建能够处理事件、监控系统并作出响应的自主 Agent。

[使用环境 Agent](/docs/adk/run/agent-runtime/ambient-agents/)

## 技术参考

有关运行时配置和行为的更深入信息，请参阅以下页面：

- **[事件循环](/docs/adk/run/agent-runtime/event-loop/)**：了解驱动 ADK 的核心事件循环，包括 yield/暂停/恢复循环。
- **[恢复 Agent](/docs/adk/run/agent-runtime/resume-agents/)**：学习如何从之前的状态恢复 Agent 执行。
- **[取消 Agent 运行](/docs/adk/run/agent-runtime/cancel-agent-runs/)**：使用 AbortSignal (TypeScript) 优雅地取消正在运行的 Agent 调用。
- **[运行时配置](/docs/adk/run/agent-runtime/runtime-config/)**：使用 RunConfig 配置运行时行为。

---

原文：[Agent Runtime](https://adk.dev/runtime/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/index.md)
