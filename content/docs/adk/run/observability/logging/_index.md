---
title: "日志记录"
description: "Agent Development Kit（ADK）提供灵活且强大的日志记录功能，以有效监控 Agent 行为并调试问题。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

Agent 开发工具包（ADK）提供灵活且强大的日志功能，以有效监控 Agent 行为并调试问题。

## 日志理念 {#logging-philosophy}

ADK 的日志方法旨在提供详细的诊断信息，同时默认情况下不会显得冗长。它设计为可由应用开发者配置，使您可以根据具体需求定制日志输出，无论是在开发环境还是生产环境中。

- **标准库集成：** ADK 使用宿主语言的标准日志功能（例如，Python 的 `logging` 模块，Go 的 `log` 包）。
- **结构化 GenAI 日志：** ADK 使用 OpenTelemetry 记录结构化事件，用于 GenAI 请求和响应，从而支持云环境中的高级监控和调试。
- **用户配置：** 虽然 ADK 提供了默认设置并与其 CLI 工具集成，但最终由应用开发者负责配置日志以适应其特定环境。

## 日志模式 {#logging-schema}

ADK 通过标准库功能和通过 OpenTelemetry 的结构化 GenAI 事件发出日志。

### 结构化 GenAI 日志 {#structured-genai-logs}

通过 OpenTelemetry 发出的结构化 GenAI 日志遵循 [GenAI](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-events.md) 的语义规范](#)。

默认情况下，为了安全起见，日志中省略提示内容。您可以通过环境变量或编程配置启用提示日志。请参阅 [捕获提示内容](#capture-prompt-content-in-adk-web)(#) 了解 `adk web` 的设置，以及 [通过代码捕获提示内容](#capture-prompt-content)(#) 查看代码中设置方法。

### 日志等级（Python） {#log-levels-python}

下表描述了使用标准记录器时 Python 在不同等级下记录的内容：| 等级 | 描述 | 记录的信息类型  |
| :--- | :--- | :--- |
| **`DEBUG`** | **调试关键级别。** 提供最详细的细粒度诊断信息。 | <ul><li>**完整的 LLM 提示：** 发送给语言模型的完整请求，包括系统指令、历史记录和工具。</li><li>服务的详细 API 响应。</li><li>内部状态转换和变量值。</li></ul> |
| **`INFO`** | 关于 Agent 生命周期的一般信息。 | <ul><li>Agent 初始化和启动。</li><li>会话创建和删除事件。</li><li>工具执行，包括其名称和参数。</li></ul> |
| **`WARNING`** | 表示潜在问题或已弃用功能的使用。Agent 继续运行，但可能需要注意。 | <ul><li>使用已弃用的方法或参数。</li><li>系统恢复的非关键错误。</li></ul> |
| **`ERROR`** | 阻止某操作完成的严重错误。 | <ul><li>外部服务（如 LLM，会话服务）的 API 调用失败。</li><li>Agent 执行期间未处理的异常。</li><li>配置错误。</li></ul> |

{{% alert context="info" %}}
建议在生产环境中使用`INFO` 或 `WARNING`。
仅在主动排查问题时启用`DEBUG`，因为`DEBUG`日志
可能非常详细，并可能包含敏感信息。
{{% /alert %}}
## ADK Web中的日志记录 {#logging-in-adk-web}

在使用 ADK 的`adk web`、`adk api_server`、`adk deploy
cloud_run`和`adk deploy gke`命令运行 Agent 时，可以控制日志的详细程度或输出位置。

### ADK Web中的日志级别 {#logging-level-in-adk-web}

要以`DEBUG`级别记录启动Web服务器，请运行：

```bash
adk web --log_level DEBUG path/to/your/agents_dir
```

`--log_level` 选项可用的日志级别为：`DEBUG`、`INFO`（默认）、`WARNING`、`ERROR`、`CRITICAL`。

### 在 ADK Web 中捕获提示内容 {#capture-prompt-content-in-adk-web}

默认情况下，为了安全起见，日志中会省略提示内容。您可以使用环境变量启用提示日志功能：

```bash
export OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
```

该变量的可用值为：`NO_CONTENT`、`EVENT_ONLY`、`SPAN_ONLY` 和 `SPAN_AND_EVENT`。布尔值 `true` 或 `1` 表示 `EVENT_ONLY`，它记录在发出的日志事件中的内容；任何超出这四个值的情况将回退到 `NO_CONTENT`。要在推理跨度上记录内容，`SPAN_ONLY` 和 `SPAN_AND_EVENT` 还需要 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`。

{{% alert context="warning" %}}
`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` 设置会记录用户提示和 Agent 响应的完整内容。这对于调试非常有用，但可能会捕获敏感数据或个人身份信息。在生产环境中，请将其设置为 false 或确保您有适当的数据处理政策。
{{% /alert %}}
### ADK Web 中的 OTLP 导出 {#otlp-export-in-adk-web}

要将日志导出到支持 OTLP 的后端，请设置标准的 OTel 环境变量：

```bash
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="http://your-collector:4318/v1/logs"
adk web path/to/your/agents_dir
```

{{% alert context="info" %}}
如果您希望将指标和追踪发送到与日志相同的端点，也可以设置通用的 `OTEL_EXPORTER_OTLP_ENDPOINT` 环境变量。
{{% /alert %}}
### 在 ADK Web 中设置 GCP 导出 {#gcp-export-setup-in-adk-web}

您可以使用 `--otel_to_cloud` 标志启用 GCP 导出：

```bash
adk web --otel_to_cloud path/to/your/agents_dir
```

## 编程设置 {#programmatic-setup}

编程设置从你的代码中配置底层日志框架和 OpenTelemetry 导出器，用于系统级诊断和生产环境可观测性。ADK 使用以下日志功能：

- **Python：** ADK 使用标准 `logging` 模块和 OpenTelemetry 来处理结构化的 GenAI 日志。
- **Go：** ADK 使用 `google.golang.org/adk/v2/telemetry` 包进行 OpenTelemetry 配置，使用标准 `log` 包处理一般事件，默认写入 `stderr`。
- **Kotlin：** ADK 使用标准 JVM 日志功能，默认使用 Flogger，并使用 OpenTelemetry 处理结构化的 GenAI 日志。

### 日志级别 {#logging-level}

您可以使用标准日志控制来设置 ADK Agent 的日志级别，如下所示：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

要启用详细日志，包括 `DEBUG` 级别的消息，请将以下内容添加到脚本顶部：

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

一般事件（例如服务器启动或 HTTP 请求）使用标准的 Go `log` 包进行日志记录，并默认写入 `stderr`。
{{% /tab %}}
{{< /tabs >}}
### 捕获提示内容 {#capture-prompt-content}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

你可以通过设置环境变量以编程方式启用完整的提示日志记录：

```python
import os

os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"
```

要将内容捕获限定在单次运行而不是整个过程，请设置 `RunConfig.telemetry`，而不是环境变量：

```python
from google.adk.agents.run_config import RunConfig
from google.adk.telemetry import ContentCapturingMode, TelemetryConfig

run_config = RunConfig(
    telemetry=TelemetryConfig(
        capture_message_content=ContentCapturingMode.SPAN_AND_EVENT,
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

您可以在初始化遥测时通过导出 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` 来启用完整的提示日志记录：

```go
package main

import (
	"context"
	"os"

	"google.golang.org/adk/v2/telemetry"
)

func main() {
	ctx := context.Background()

	// 通过 OpenTelemetry 环境变量启用 GenAI 消息内容捕获
	os.Setenv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true")

	tp, err := telemetry.New(ctx)
	if err != nil {
		// 处理错误
	}
	defer tp.Shutdown(ctx)
	tp.SetGlobalOtelProviders()
}
```

{{% /tab %}}
{{< /tabs >}}
### OTLP 导出 {#otlp-export}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

要以编程方式将日志导出到 OpenTelemetry Collector（或兼容 OTLP 的后端）:

```python
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

os.environ["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"] = "http://your-collector:4318/v1/logs"
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers()
```

{{% /tab %}}
{{% tab tabName="Go" %}}

要将日志导出到兼容 OTLP 的后端，请配置标准的 OpenTelemetry 环境变量，例如 `OTEL_EXPORTER_OTLP_ENDPOINT` 或 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`。ADK 遥测包在初始化时会自动使用这些设置。
{{% /tab %}}
{{< /tabs >}}
### GCP 导出设置 {#gcp-export-setup}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

要以编程方式将日志导出到 Google Cloud Logging，请使用 OpenTelemetry Google Cloud 导出器。以下是 Python 示例：

```python
from google.adk.telemetry.google_cloud import get_gcp_exporters
from google.adk.telemetry.setup import maybe_set_otel_providers
import os

gcp_exporters = get_gcp_exporters(
  enable_cloud_logging = True,
)
os.environ["OTEL_SERVICE_NAME"] = "your-adk-agent"
os.environ["OTEL_RESOURCE_ATTRIBUTES"] = "key1=value1,key2=value2"
maybe_set_otel_providers([gcp_exporters])
```

{{% /tab %}}
{{% tab tabName="Go" %}}

要将日志导出到 Google Cloud Logging，请使用 `WithOtelToCloud` 选项：

```go
package main

import (
	"context"
	"google.golang.org/adk/v2/telemetry"
)

func main() {
	ctx := context.Background()
	tp, err := telemetry.New(ctx,
		telemetry.WithOtelToCloud(true),
	)
	if err != nil {
		// 处理错误
	}
	defer tp.Shutdown(ctx)
	tp.SetGlobalOtelProviders()
}
```

如果使用 Go 启动器，您也可以通过 CLI 标志启用 GCP 导出：

```bash
go run main.go web -otel_to_cloud api
```

{{% /tab %}}
{{< /tabs >}}
## 使用插件记录活动 {#activity-logging-with-plugins}

ADK 提供内置插件来捕获 Agent 活动，包括用户消息、模型请求和响应、工具调用，以及（使用 `DebugLoggingPlugin`）会话状态。这些插件不需要更改您的 Agent 逻辑。

### 使用 `LoggingPlugin` 进行控制台日志记录 {#console-logging-with-loggingplugin}

要在执行期间将结构化活动日志打印到控制台，请将 `LoggingPlugin` 附加到您的 `App`：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.apps import App
from google.adk.plugins import LoggingPlugin

app = App(
    name="my_app",
    root_agent=root_agent,
    plugins=[LoggingPlugin()],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"log"
	"os"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/cmd/launcher"
	"google.golang.org/adk/v2/cmd/launcher/full"
	"google.golang.org/adk/v2/plugin"
	"google.golang.org/adk/v2/plugin/loggingplugin"
	"google.golang.org/adk/v2/runner"
)

func main() {
	ctx := context.Background()
	logPlugin := loggingplugin.MustNew("logging_plugin")

	config := &launcher.Config{
		AgentLoader: agent.NewSingleLoader(rootAgent),
		PluginConfig: runner.PluginConfig{
			Plugins: []*plugin.Plugin{logPlugin},
		},
	}

	l := full.NewLauncher()
	if err := l.Execute(ctx, config, os.Args[1:]); err != nil {
		log.Fatalf("run failed: %v", err)
	}
}
```

{{% /tab %}}
{{< /tabs >}}
### 使用 `DebugLoggingPlugin` 完整调试捕获到文件 {#full-debug-capture-to-a-file-with-debugloggingplugin}

支持版本：Python v1.23.0。

要以人类可读的 YAML 形式记录完整交互数据并附加到 `adk_debug.yaml`，而不是截断的控制台输出，请使用 `DebugLoggingPlugin`：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.apps import App
from google.adk.plugins import DebugLoggingPlugin

app = App(
    name="my_app",
    root_agent=root_agent,
    plugins=[
        DebugLoggingPlugin(
            output_path="adk_debug.yaml",
            include_session_state=True,
            include_system_instruction=True,
        ),
    ],
)
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="warning" %}}
输出文件包含原始提示、工具参数和会话状态。
尽管 ADK 会自动在 Python 中编辑凭据和 `temp:` 范围的状态键，但仍应将输出文件视为敏感信息。
{{% /alert %}}
## 理解日志输出 {#understanding-log-output}

### Python 日志示例条目 {#sample-python-log-entry}

```text
2025-07-08 11:22:33,456 - DEBUG - google_adk.google.adk.models.google_llm - LLM Request: contents { ... }
```

| 日志段                           | 格式说明符       | 含义                                         |
| ------------------------------- | ---------------- | -------------------------------------------- |
| `2025-07-08 11:22:33,456`       | `%(asctime)s`    | 时间戳                                      |
| `DEBUG`                         | `%(levelname)s`  | 严重性级别                                  |
| `google_adk.google.adk.models.google_llm`  | `%(name)s`       | 记录器名称（生成日志的模块）                 |
| `LLM Request: contents { ... }` | `%(message)s`    | 实际的日志消息                               |

通过查看记录器名称，您可以立即确定日志的来源，并了解其在 Agent 架构中的上下文。ADK 记录器命名为 `google_adk.`，后跟模块的全限定名称，因此每个 ADK 记录器都是 `google_adk` 记录器的子记录器。使用 `logging.getLogger("google_adk")` 将它们作为一个组进行配置。

### 调试示例 {#debugging-example}

启用 `DEBUG` 日志记录后（参见上文 [Logging level](#logging-level)），运行您的 Agent 并查找来自 `google_adk.google.adk.models.google_llm` 记录器的消息。输出显示完整的 LLM 请求和响应：

```text
2025-07-10 15:26:13,778 - DEBUG - google_adk.google.adk.models.google_llm -
LLM Request:
-----------------------------------------------------------
System Instruction:
      You roll dice and answer questions about the outcome of the dice rolls.
      ...
-----------------------------------------------------------
Contents:
{"parts":[{"text":"Roll a 6 sided dice"}],"role":"user"}
{"parts":[{"function_call":{"args":{"sides":6},"name":"roll_die"}}],"role":"model"}
{"parts":[{"function_response":{"name":"roll_die","response":{"result":2}}}],"role":"user"}
-----------------------------------------------------------
Functions:
roll_die: {'sides': {'type': <Type.INTEGER: 'INTEGER'>}}
check_prime: {'nums': {'items': {'type': <Type.INTEGER: 'INTEGER'>}, 'type': <Type.ARRAY: 'ARRAY'>}}
-----------------------------------------------------------
2025-07-10 15:26:14,309 - INFO - google_adk.google.adk.models.google_llm -
LLM Response:
-----------------------------------------------------------
Text:
I have rolled a 6 sided die, and the result is 2.
...
```

从此输出中，您可以验证：

- 系统指令是否正确？
- 对话历史（`user` 和 `model` 回合）是否准确？
- 是否为模型提供了正确的工具？
- 模型是否正确调用了这些工具？
- 模型响应需要多长时间？

---

原文：[Agent activity logging](https://adk.dev/observability/logging/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/observability/logging.md)
