---
title: "可观测性"
description: "Agent 的可观测性能够通过分析其外部遥测和结构化日志来测量系统的内部状态，包括推理痕迹、工具调用和潜在模型输出。在构建 Agent 时，"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

Agent 的可观测性允许通过分析其外部遥测和结构化日志来测量系统的内部状态，包括推理轨迹、工具调用和潜在模型输出。在构建 Agent 时，您可能需要这些功能来帮助调试和诊断其进程内的行为。对于具有任何显著复杂性的 Agent，仅进行基本的输入和输出监控通常是不够的。

Agent 开发工具包（ADK）通过 [logging](/docs/adk/run/observability/logging/)、[metrics](/docs/adk/run/observability/metrics/) 和 [traces](/docs/adk/run/observability/traces/) 提供内置的可观测性，帮助您监控和调试 Agent。然而，您可能需要考虑更高级的 [observability ADK Integrations（官方英文）](https://adk.dev/integrations/?topic=observability) 以进行监控和分析。

## 快速入门：在 Kotlin 中启用可观测性 {#quick-start-enabling-observability-in-kotlin}

在 Kotlin 中，您可以通过配置 OpenTelemetry 来启用全面的可观测性以获取追踪信息，并使用 `LoggingPlugin` 获取详细的控制台输出。

> 官方此示例仅提供 Kotlin 版本；本套文档只保留 Python 和 Go 示例。

{{% alert context="success" %}}
**ADK 可观测性集成**

有关 ADK 的预构建可观测性库列表，请参见 [Tools and Integrations（官方英文）](https://adk.dev/integrations/?topic=observability)。
{{% /alert %}}

---

原文：[Observability for agents](https://adk.dev/observability/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/observability/index.md)
