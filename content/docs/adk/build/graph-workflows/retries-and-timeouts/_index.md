---
title: "重试和超时"
description: "基于图的工作流中的节点通常会调用偶尔失败或响应缓慢的服务，例如模型 API、远程工具和数据库。Agent Development Kit (ADK) 允许你为"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

基于图的工作流中的节点经常调用可能间歇性失败或响应缓慢的服务，例如模型 API、远程工具和数据库。Agent 开发工具包（ADK）允许你为每个节点附加重试策略和超时设置，因此节点可以从暂时的失败中恢复，而不会导致整个工作流失败，并且停滞的节点在设置时间后也会失败，而不是阻塞工作流。使用重试和超时功能可以：

-   重试发生连接错误的工具调用，在每次尝试之间等待更久，以便远程服务有时间恢复。
-   停止在 30 秒内没有响应的模型调用，并再次尝试。
-   仅重试可能在第二次尝试中成功的错误，对所有其他错误立即失败。

具有重试策略的节点在失败时会再次运行，直到尝试成功或节点达到最大尝试次数。只有在此之后，失败才会传递到工作流的其余部分。没有重试策略的节点不会被重试。

{{% alert context="default" %}}
**TypeScript、Java 和 Kotlin 实验性功能**

在 ADK TypeScript、ADK Java 和 ADK Kotlin 中，节点重试和超时依赖的工作流 API 属于实验性发布。这些 API 可能存在限制，不建议在这些语言的生产环境中使用。
{{% /alert %}}
## 快速开始 {#get-started}

以下示例构建了一个两节点的工作流。第一个节点调用一个不可靠的预测服务，其配置允许总共尝试三次，在第一次重试前等待一秒，只重试服务错误和超时，并将每次尝试限制为 10 秒。第二个节点报告结果。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
import random

from google.adk import Context
from google.adk import Event
from google.adk import Workflow
from google.adk.workflow import NodeTimeoutError
from google.adk.workflow import RetryConfig
from google.adk.workflow import node

class ServiceUnavailableError(Exception):
  """Stands in for a transient failure from a remote service."""

@node(
    retry_config=RetryConfig(
        max_attempts=3,  # 1 original attempt + 2 retries
        initial_delay=1.0,  # seconds before the first retry
        exceptions=[ServiceUnavailableError, NodeTimeoutError],
    ),
    timeout=10.0,  # seconds allowed for each attempt
)
async def fetch_forecast(ctx: Context):
  """Simulates an unreliable call to a forecast service."""
  yield Event(message=f"Fetching forecast, attempt {ctx.attempt_count}")
  if random.random() < 0.5:
    raise ServiceUnavailableError("Forecast service unavailable")
  yield "sunny"

def report_forecast(node_input: str):
  return Event(message=f"The forecast is {node_input}.")

root_agent = Workflow(
    name="forecast_workflow",
    edges=[("START", fetch_forecast, report_forecast)],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在传递给节点构造函数的 `workflow.NodeConfig` 中设置 `RetryConfig` 和 `Timeout`。 从 `workflow.DefaultRetryConfig()` 开始，只更改你需要的字段。

```go
// errServiceUnavailable 代表来自远程服务的暂时性故障。
var errServiceUnavailable = errors.New("forecast service unavailable")

func newForecastWorkflow() (agent.Agent, error) {
	// fetchForecast 模拟一个缓慢、不可靠的服务调用。它会监听
	// ctx.Done() 以便节点的超时可以停止它。
	fetchForecast := func(ctx agent.Context, _ any) (string, error) {
		select {
		case <-time.After(200 * time.Millisecond):
		case <-ctx.Done():
			return "", ctx.Err()
		}
		if rand.Float64() < 0.5 {
			return "", errServiceUnavailable
		}
		return "sunny", nil
	}

	// 从默认策略开始，只覆盖你需要的部分。
	retry := workflow.DefaultRetryConfig()
	retry.MaxAttempts = 3 // 1 original attempt + 2 retries
	retry.InitialDelay = time.Second
	// 只重试暂时性故障：服务错误和节点自身的
	// 超时，它会表现为 context.DeadlineExceeded。
	retry.ShouldRetry = func(err error) bool {
		return errors.Is(err, errServiceUnavailable) ||
			errors.Is(err, context.DeadlineExceeded)
	}

	fetchNode := workflow.NewFunctionNode("fetch_forecast", fetchForecast,
		workflow.NodeConfig{
			RetryConfig: retry,
			Timeout:     10 * time.Second, // limit for each attempt
		},
	)

	reportNode := workflow.NewFunctionNode("report_forecast",
		func(_ agent.Context, forecast string) (string, error) {
			return "The forecast is " + forecast + ".", nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:  "forecast_workflow",
		Edges: workflow.Chain(workflow.Start, fetchNode, reportNode),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
当 `fetch_forecast` 因服务错误失败或超时，ADK Agent 会等待，然后使用相同的输入再次运行该节点。下一个节点 `report_forecast` 仅在尝试成功后才运行。如果所有三次尝试都失败，节点将以最后一次尝试的错误失败，并且工作流也将因此失败。除 Go 语言外，节点上下文提供尝试计数，从 1 开始，因此您的代码可以判断正在运行的是第几次尝试。

## 配置重试 {#configure-retries}

重试策略控制三件事：节点运行次数、ADK 在尝试之间的等待时间以及哪些错误会触发重试。

-   **尝试次数：** 最大尝试次数包括最初的尝试，因此值为 3 允许 2 次重试。值为 0 或 1 会禁用重试。
-   **延迟：** 第一次重试之前的等待为初始延迟。ADK 会将每次后续等待乘以回退因子，因此默认的 1 秒和 2.0 给出在抖动前的基础等待时间分别为 1、2、4 和 8 秒。最大延迟限制每次等待时间的上限。
-   **抖动：** 系统会在每次等待中加上或减去最多为延迟乘以抖动因子的随机量，这样同时失败的多个节点不会在同一时间重试。例如在测试中，将抖动设置为 0 可以得到固定延迟。

以下决策对重试对工作流的效果影响最大：

-   **仅重试瞬时错误。** 默认情况下，重试策略几乎会重试所有错误。由于输入错误或程序漏洞导致的错误每次尝试都会以相同方式失败，因此重试只会延迟失败。列出可以在后续尝试中成功的错误类型，例如连接错误、速率限制错误和超时。有关每种语言如何匹配错误的详细信息，请参见 [Configuration options](#configuration-options)。
-   **将策略设置在可能失败的节点上。** 在 Python、Java 和 Kotlin 中，您也可以将重试策略附加到嵌套工作流中，嵌套工作流内的任何节点失败都会重试该嵌套工作流。在调用不可靠服务的单个节点上设置策略可减少工作量并给您更多控制权。
-   **确保重试的工作可以安全重复。** 重试会再次运行整个节点。如果节点在失败之前向外部系统写入数据，则写入可能发生多次。设计这些操作时要确保重复操作不会产生额外影响，或者将副作用移到在不可靠调用成功后运行的单独节点中。

## 设置节点超时 {#set-node-timeouts}
超时限制了节点单次尝试的运行时间。该限制适用于每次尝试，而不是各次重试的总时间，并且尝试之间的等待时间不计入其中。当一次尝试超过其超时时间时，ADK 会停止该尝试并将其视为失败：

- 在 Python、TypeScript、Java 和 Kotlin 中，尝试会以节点超时错误失败，如下表所示。
- 在 Go 中，节点的上下文达到其截止时间，尝试以 `context.DeadlineExceeded` 失败。

当节点有涵盖超时错误的重试策略时，ADK 会像处理其他失败一样重试超时的尝试。如果在策略中列出特定错误类型，请包括超时错误，例如 [Get started](#get-started) 示例所示。未设置重试策略的超时第一次触发时会使节点失败。

| 语言 | 超时设置 | 超时错误 | 在重试策略中列出的名称 |
| :--- | :--- | :--- | :--- |
| Python | `timeout`（秒） | `NodeTimeoutError` | `NodeTimeoutError` |
| TypeScript | `timeout`（秒） | `NodeTimeoutError` | `NodeTimeoutError` |
| Go | `NodeConfig.Timeout` 作为 `time.Duration` | `context.DeadlineExceeded` | 在 `ShouldRetry` 中与 `errors.Is` 匹配 |
| Java | `NodeConfig.timeout` 作为 `Duration` | `NodeTimeoutException` | `NodeTimeoutException` |
| Kotlin | `NodeConfig.timeout` 作为 `Duration` | `NodeTimeoutError` | `NodeTimeoutError` |

停止尝试依赖于取消操作，取消操作如何到达你的代码取决于使用的语言：

- **Go：** 节点的 `agent.Context` 包含截止时间。将其传递给节点发出的调用，或检查 `ctx.Done()`，以便截止时间到达时节点返回。
- **TypeScript：** 当超时时间到达时，ADK 会停止读取节点的事件。若要取消节点已开始的工作（例如 HTTP 请求），请将 `ctx.abortSignal` 传递给该工作。
- **Kotlin：** ADK 在协程中运行尝试，当超时时触发时取消该协程。未到达挂起点的代码会继续运行，直到到达挂起点。

## 配置选项 {#configuration-options}

每种语言的重试策略选项相同。在 Python 和 TypeScript 中持续时间以秒为单位，在 Go、Java 和 Kotlin 中使用该语言的持续时间类型。| 选项 | 默认值 | 描述 |
| :--- | :--- | :--- |
| 最大尝试次数 | `5` | 包括第一次尝试在内的总尝试次数。值为 0 或 1 时禁用重试。 |
| 初始延迟 | 1 秒 | 第一次重试前的等待时间。 |
| 最大延迟 | 60 秒 | 尝试之间等待的上限时间。 |
| 回退因子 | `2.0` | 每次尝试后应用于等待时间的乘数。 |
| 抖动 | `1.0` | 应用于每次等待的随机波动，作为等待时间的一个分数。`0` 给出固定等待。 |
| 要重试的错误 | 所有错误 | 启动重试的错误。参见以下列表。 |

每种语言以自己的方式选择要重试的错误：

-   **Python：** `exceptions` 设置接受异常类或类名。列出的类也匹配其子类。
-   **TypeScript：** `exceptions` 设置接受错误类或类名。当错误的类名或其 `name` 属性在列表中时，则匹配。ADK 不检查类层次结构。
-   **Go：** `ShouldRetry` 设置为一个函数，该函数接收错误并返回 `true` 来重试该错误。默认情况下，每个错误都会重试，除了 `workflow.ErrInputValidation`。
-   **Java：** `exceptions` 设置接受简单类名，完全匹配。`exceptionClasses` 设置接受类，也匹配其子类。ADK 永远不会重试 `WorkflowConfigurationException`。
-   **Kotlin：** `exceptions` 设置接受简单类名，完全匹配。ADK 永远不会重试 `WorkflowConfigurationException`。

{{% alert context="warning" %}}
**Go：未设置字段为零值，而非默认值**

在 Go 中，`RetryConfig` 以结构体字面量构建时，对于未设置的每个字段使用零值，而不是默认值。例如，`&workflow.RetryConfig{MaxAttempts: 3}` 在尝试之间不延迟立即重试。请从 `workflow.DefaultRetryConfig()` 开始并覆盖字段。此外，Go 在应用 `MaxDelay` 后再应用抖动，因此一次等待时间可能比 `MaxDelay` 长，最长可达抖动分数。
{{% /alert %}}
## 限制 {#limitations}

-   **尝试次数不会被保存。** ADK 在内存中保持当前节点运行的尝试次数。如果工作流暂停，例如等待 [人工输入](/docs/adk/build/graph-workflows/human-input/)，或应用程序重启，那么在工作流恢复后重新运行的节点将从尝试 1 开始，并且所有尝试次数均可用。

## 后续步骤 {#next-steps}

-   [为 agent 工作流构建图形路线](/docs/adk/build/graph-workflows/graph-routes/)：用序列、分支和并行路径连接节点。
-   [agent 工作流的数据处理](/docs/adk/build/graph-workflows/data-handling/)：在节点之间传递数据。
-   [agent 工作流的人工输入](/docs/adk/build/graph-workflows/human-input/)：暂停工作流以请求人员输入。

---

原文：[Handle node failures with retries and timeouts](https://adk.dev/graphs/retry/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/retry.md)
