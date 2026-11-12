---
title: "踪迹"
description: "Agent Development Kit（ADK）提供分布式追踪功能，帮助您可视化请求在 Agent 架构中传递的端到端旅程。虽然指标可以告诉您一个过程*花了多长时间*"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v1.17.0，Go v1.0.0。

Agent Development Kit（ADK）提供分布式跟踪功能，帮助您可视化请求在 Agent 架构中端到端的旅程。指标告诉您*过程持续了多长时间*，日志告诉您*发生了什么*，而跟踪将这些事件连接起来，准确显示时间消耗的位置以及 LLM 推理、工具调用和外部 API 之间的层级关系。

## 跟踪理念 {#traces-philosophy}

ADK 的跟踪方法基于标准协议，以确保与您现有的可观测性堆栈无缝集成。

*   **OpenTelemetry 语义约定：** ADK 实现了 OpenTelemetry (OTel) [GenAI](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-agent-spans.md) 的语义约定]。这确保跟踪跨度和属性以标准、可预测的名称记录。
*   **OTLP 传输格式：** ADK 使用标准 OTLP 格式发送数据，确保您的跟踪能够无缝集成到任何 OTel 兼容的后端（例如 Google Cloud Trace、Jaeger、Grafana Tempo、Datadog）。
*   **层级可视化：** 跟踪被组织为“跨度”。一次 Agent 运行是根跨度，其中包含 LLM 操作的子跨度，这些子跨度可能进一步包含工具执行的子跨度。这创建了 Agent 推理循环的清晰“瀑布”视图。
*   **上下文传播：** ADK 自动在进程边界传递跟踪上下文，确保如果您的 Agent 通过工具调用外部微服务，该服务的跨度将与 Agent 的根跟踪相连。

## 跟踪模式 {#traces-schema}

启用跟踪后，ADK 会自动对关键操作进行检测，遵循 OpenTelemetry GenAI Agent 的语义约定。典型的跟踪瀑布包含以下跨度：| Span 名称 | 类型 | 描述 | 关键属性 |
| :--- | :--- | :--- | :--- |
| **[`invoke_agent {agent.name}`](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-agent-spans.md#invoke-agent-client-span)** | 客户端 / 内部 Span | 描述通过远程服务或本地调用 GenAI Agent。表示 Agent 交互的生命周期。| `gen_ai.operation.name`, `gen_ai.agent.name`, `gen_ai.agent.description`, `gen_ai.conversation.id` |
| **[`invoke_workflow {workflow.name}`](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-agent-spans.md#invoke-workflow-span)** | 子 Span | 描述多步骤 Agent 工作流的调用。 | `gen_ai.operation.name`, `gen_ai.workflow.name`, `gen_ai.conversation.id`, `gen_ai.workflow.nested`（仅嵌套工作流） |
| **[`execute_tool {tool.name}`](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-agent-spans.md#execute-tool-span)** | 子 Span | 表示 GenAI 系统请求的特定工具或函数调用的执行。| `gen_ai.operation.name`, `gen_ai.tool.name`, `gen_ai.tool.description`, `gen_ai.tool.type`, `gen_ai.tool.call.id`, `error.type`|
| **[`generate_content {model.name}`](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md)** | 内部 Span | 表示调用底层语言模型（通过 GenAI SDK）生成内容。它跟踪请求参数、响应详情和使用指标。 | `gen_ai.operation.name`, `gen_ai.system`, `gen_ai.request.model`, `gen_ai.agent.name`, `gen_ai.conversation.id`, `gen_ai.response.finish_reasons`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` |

## Traces 导出设置 {#traces-export-setup}

### ADK Web 中的 Traces 导出 {#traces-export-in-adk-web}

如果您使用 `adk web` 或 `adk api_server` CLI 命令运行 Agent，可以配置 traces 导出。

#### OTLP 导出 {#otlp-export}

要将 traces 导出到兼容 OTLP 的后端，请设置标准 OTel 环境变量：

```bash
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://your-collector:4318/v1/traces"
adk web path/to/your/agents_dir
```

> **注意：** 如果您希望将指标和日志发送到与跟踪相同的端点，也可以设置通用的 `OTEL_EXPORTER_OTLP_ENDPOINT` 环境变量。

#### GCP 导出 {#gcp-export}

要启用向 Google Cloud Trace 导出跟踪，请使用 `--otel_to_cloud` 标志：

```bash
adk web --otel_to_cloud path/to/your/agents_dir
```

### 编程方式的追踪导出 {#programmatic-traces-export}

您还可以在应用程序代码中以编程方式配置追踪导出。

#### OTLP 导出设置 {#otlp-export-setup}

要以编程方式启用追踪并将跨度导出到 OpenTelemetry Collector：

```python
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

os.environ["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"] = "http://your-collector:4318/v1/traces"
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers()
```

#### GCP 导出设置 {#gcp-export-setup}

要以编程方式将跟踪导出到 Google Cloud Trace，请使用 OpenTelemetry Google Cloud 导出器。以下是一个 Python 示例：

```python
from google.adk.telemetry.google_cloud import get_gcp_exporters
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

gcp_exporters = get_gcp_exporters(
  enable_cloud_tracing = True,
)
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers([gcp_exporters])
```

### Kotlin 编程设置 {#kotlin-programmatic-setup}

在 Kotlin 中，ADK 会自动使用 `GlobalOpenTelemetry` 实例来导出追踪。你应该在启动 Agent 之前配置你的 OpenTelemetry SDK。

#### OTLP 导出设置 {#otlp-export-setup}

要启用追踪并将跨度导出到 OpenTelemetry Collector，请配置 OpenTelemetry SDK 并全局注册它：

> 官方此示例仅提供 Kotlin 版本；本套文档只保留 Python 和 Go 示例。

---

原文：[Agent activity traces](https://adk.dev/observability/traces/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/observability/traces.md)
