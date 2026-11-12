---
title: "指标"
description: "Agent Development Kit（ADK）提供内置、供应商中立的指标收集，帮助您了解 Agent 的性能、成本和使用模式。虽然日志提供了发生了*什么*的详细叙述"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v1.32.0。

Agent Development Kit（ADK）提供内置的、与供应商无关的指标收集功能，帮助您了解 Agent 的性能、成本和使用模式。虽然日志提供了发生了什么的详细叙述，但指标则为您提供聚合的、定量的数据，以回答事情发生的频率和速度。

## 指标理念 {#metrics-philosophy}

ADK 对指标的处理方式旨在轻量化、标准化，并且完全与您选择的监控后端无关。

*   **OpenTelemetry 语义约定：**ADK 实现了 OpenTelemetry (OTel) 的 [GenAI](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-metrics.md) 语义约定]。这确保了指标以标准且可预测的属性和指标名称进行记录。
*   **OTLP 传输格式：**ADK 使用标准 OTLP 格式发送数据，确保您的指标可以无缝集成到任何兼容 OTel 的后端（如 Prometheus、Datadog、SigNoz、Google Cloud Monitoring）。
*   **关注成本和性能：**与在大量数据上执行分析时的日志或跟踪相比，指标的成本更低、性能更高。ADK 跟踪 LLM 应用最关键的信号：令牌消耗、请求延迟和工具执行可靠性。
*   **供应商中立的导出：**ADK 不会将您锁定在特定的指标管道中。您可以实例化标准的 OTel 计量器提供者，并将数据导出到您的基础设施所需的任何地方。

## 指标架构 {#metrics-schema}

启用指标后，ADK 会根据 OpenTelemetry GenAI 语义约定自动为 Agent 的生命周期、工作流步骤和工具执行进行检测。以下是发出的核心指标：| 指标名称 | 类型 | 描述 | 关键属性（维度） |
| :--- | :--- | :--- | :--- |
| **`gen_ai.invoke_agent.duration`** | 直方图（秒） | Agent 处理提示并返回响应的总时间。 | `gen_ai.agent.name`, `error.type` |
| **`gen_ai.invoke_workflow.duration`** | 直方图（秒） | 运行工作流所需的时间。 | `gen_ai.operation.name`, `gen_ai.workflow.name`, `gen_ai.workflow.nested`（仅限嵌套工作流）, `error.type` |
| **`gen_ai.execute_tool.duration`** | 直方图（秒） | Agent 调用的单个工具的执行延迟。可用于发现缓慢的外部 API。 | `gen_ai.agent.name`, `gen_ai.tool.name`, `gen_ai.tool.type`, `error.type` |
| **`gen_ai.invoke_agent.inference_calls`** | 直方图（计数） | 一次 Agent 调用中进行的推理（模型）调用次数。 | `gen_ai.agent.name` |
| **`gen_ai.invoke_agent.tool_calls`** | 直方图（计数） | 一次 Agent 调用中进行的工具调用次数。 | `gen_ai.agent.name` |
| **`gen_ai.client.operation.duration`** | 直方图（秒） | 单次模型 `generate_content` 调用的延迟。 | `gen_ai.agent.name`, `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `error.type` |
| **`gen_ai.client.token.usage`** | 直方图（令牌） | 每次模型调用的令牌消耗，由 `gen_ai.token.type` 拆分为输入和输出。 | `gen_ai.agent.name`, `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.token.type` |

### 实验性指标 {#experimental-metrics}

ADK 在 `adk.experimental.*` 命名空间下发出额外的遥测数据，涵盖 span 属性以及以下指标。它们尚未成为 OpenTelemetry 语义规范的一部分，因此名称、属性和含义在各版本之间仍可能更改。可以自由探索，并预计在名称确定之前，基于这些数据构建的长期内容可能需要重新调整。

以下指标汇总了整个 Agent 调用或整个工作流的令牌消耗和调用次数，其粒度高于 `gen_ai.client.*` 测量的单次模型调用，因此你可以直接查询一次对话的成本，而无需自己求和模型调用。

它们默认是关闭的。要启用这些指标，请设置环境变量：

```bash
export ADK_EXPERIMENTAL_TELEMETRY=true
```

您也可以选择按请求进行，这优先于环境变量：

```python
from google.adk.agents.run_config import RunConfig
from google.adk.telemetry import TelemetryConfig

run_config = RunConfig(
    telemetry=TelemetryConfig(adk_experimental_telemetry_opt_in=True)
)
```

如果两者都未被设置，以下的指标都不会被记录。

这八行`invoke_workflow`还需要一个东西：遥测模式 v2，这是 Vertex AI Agent Engine 的默认设置，其他地方关闭。在其他地方设置`ADK_TELEMETRY_SCHEMA_VERSION_OPT_IN=2`，否则这些行保持空着。`invoke_agent`行不受影响，基于 `Workflow` 引擎的应用会记录任一版本的每个节点数据点。|度量名称 |类型 |描述 |关键属性（尺寸） |
|:--- |:--- |:--- |:--- |
|**`adk.experimental.invoke_agent.input_tokens`** |直方图（令牌） |输入（提示）令牌汇总于一次 Agent 调用，包括服务器端工具结果和缓存的提示令牌。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_agent.output_tokens`** |直方图（令牌） |输出（完成）令牌汇总于一次 Agent 调用，包括推理令牌和用于发送工具调用的令牌。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_agent.total_tokens`** |直方图（令牌） |一次 Agent 调用的输入加输出令牌。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_agent.cache_read.input_tokens`** |直方图（令牌） |从提供者管理的缓存中提供的输入令牌，通过一次 Agent 调用相加。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_agent.reasoning.output_tokens`** |直方图（令牌） |用于推理（思维链/扩展思考）的输出令牌，汇总于一次 Agent 调用。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_agent.tool.input_tokens`** |直方图（令牌） |服务器端工具的输入令牌，模型在一次请求内反馈给自己，如代码执行或搜索接地。客户端功能工具为零。|`gen_ai.agent.name` |
|**`adk.experimental.invoke_workflow.input_tokens`** |直方图（令牌） |上述`input_tokens`，是对所有运行于同一工作流调用中的 Agent 的总和。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.output_tokens`** |直方图（令牌） |上述`output_tokens`，是对所有运行于同一工作流调用中的 Agent 的求和。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.total_tokens`** |直方图（令牌） |上述`total_tokens`，在一个工作流调用中对所有运行的 Agent 相加。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.cache_read.input_tokens`** |直方图（令牌） |上述`cache_read.input_tokens`，汇总了在同一工作流调用中运行的所有 Agent。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.reasoning.output_tokens`** |直方图（令牌） |上述`reasoning.output_tokens`，在一个工作流调用中运行的每个 Agent 相加。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.tool.input_tokens`** |直方图（令牌） |上述`tool.input_tokens`，在所有运行于同一工作流调用中的 Agent 相加。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.inference_calls`** |直方图（计数） |在一个工作流调用中进行的推理（模型）调用次数。|`adk.experimental.root_agent.name`、`gen_ai.workflow.name`、`gen_ai.workflow.nested`（仅嵌套工作流程） |
|**`adk.experimental.invoke_workflow.tool_calls`** |直方图（计数） |工具调用的次数一次工作流程调用。 | `adk.experimental.root_agent.name`, `gen_ai.workflow.name`, `gen_ai.workflow.nested`（仅限嵌套工作流程） |{{% alert context="warning" %}}
嵌套工作流程会记录自己的数据点，其总计也会被折叠到包含它的每个工作流程中，因此跨所有数据点汇总 `invoke_workflow` 指标会导致重复计数。
{{% /alert %}}
`gen_ai.workflow.nested` 属性仅在嵌套工作流程上设置，因此排除它会只保留最外层工作流程，该数据点覆盖整个回合。工作流程指标没有 Agent 维度，因为覆盖整个工作流程的值无法归因于单个 Agent。它们带有两个名称：`gen_ai.workflow.name` 连接到 `gen_ai.invoke_workflow.duration`，而 `adk.experimental.root_agent.name` 标识应用，当一个回合进入子 Agent 时，这两个名称会不一致。

## 指标导出设置 {#metrics-export-setup}

### ADK Web 中的指标导出 {#metrics-export-in-adk-web}

如果你使用 `adk web` 或 `adk api_server` CLI 命令运行 Agent，你可以配置指标导出。

#### OTLP 导出 {#otlp-export}

要将指标导出到兼容 OTLP 的后端，请设置标准的 OTel 环境变量：

```bash
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="http://your-collector:4318/v1/metrics"
adk web path/to/your/agents_dir
```

> **注意:** 如果您希望将跟踪和日志发送到与指标相同的终端，您也可以设置通用的 `OTEL_EXPORTER_OTLP_ENDPOINT` 环境变量。

#### GCP 导出 {#gcp-export}

要启用向 Google Cloud Monitoring 导出指标，请使用 `--otel_to_cloud` 标志：

```bash
adk web --otel_to_cloud path/to/your/agents_dir
```

### 编程方式的指标导出 {#programmatic-metrics-export}

您也可以在应用程序代码中以编程方式配置指标导出。

#### OTLP 导出设置 {#otlp-export-setup}

要以编程方式启用指标并将其导出到 OpenTelemetry Collector（或 OTLP 兼容的后端）：

```python
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

os.environ["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"] = "http://your-collector:4318/v1/metrics"
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers()
```

#### GCP 导出设置 {#gcp-export-setup}

要以编程方式将指标导出到 Google Cloud Monitoring，请使用 OpenTelemetry Google Cloud 导出器。以下是一个 Python 示例：

```python
from google.adk.telemetry.google_cloud import get_gcp_exporters
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

gcp_exporters = get_gcp_exporters(
  enable_cloud_metrics = True,
)
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers([gcp_exporters])
```

### Kotlin 程序化设置 {#kotlin-programmatic-setup}

在 Kotlin 中，ADK 使用标准的 `GlobalOpenTelemetry` 来管理指标。使用 `MeterProvider` 配置 OpenTelemetry SDK 可以启用指标收集。

#### OTLP 导出设置 {#otlp-export-setup}

要启用指标并将其导出到 OpenTelemetry Collector，请使用适当的指标导出器配置 OpenTelemetry SDK：

> 官方此示例仅提供 Kotlin 版本；本套文档只保留 Python 和 Go 示例。

---

原文：[Agent activity metrics](https://adk.dev/observability/metrics/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/observability/metrics.md)
