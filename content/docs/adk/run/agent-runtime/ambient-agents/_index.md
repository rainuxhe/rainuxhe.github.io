---
title: "环境 Agent"
description: "在运行 Agent 工作流时，您可能希望在某个事件发生或有新数据可用时激活它，而不是等待人的输入。您可以为 ADK Agent 配置触发器以响应事件"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v1.29.0， Go v1.1.0。

运行 Agent 工作流程时，你可能想根据以下情况激活它。
事件或新数据可用，而不是等待人工输入。
你可以配置带有触发器的 ADKAgent，以响应事件并执行
工作，称为*环境 Agent*。这些 Agent 可以作为后台进程运行
处理数据、监控事件，并异步响应，无需人工
干预。你可以利用环境 Agent 来：

- **对云事件做出反应。** 上传文件时处理
  [云存储](https://cloud.google.com/storage)，响应数据库
  更改，或处理审计日志条目。
- **从队列中处理消息。** 分析收到的支持工单，
  适度内容、分类文档或在物品到达时进行质量保证。
- **按计划运行。** 生成每日报告，定期监控
  检查，或定期处理批处理作业。
- **监控基础设施。** 对连续事件流进行反应
  你的基础设施和行动会自主变化。

## 从环境因子中获得效果 {#getting-results-from-ambient-agents}

因为环境 Agent 运行时没有人工干预，你需要路由它们
输出到通知通道。常见的模式包括：

- **[结构化日志](/docs/adk/run/observability/logging/).** 写入JSON日志
  configure [Cloud Monitoring](https://cloud.google.com/monitoring/support/notification-options)
  通过电子邮件、Slack或PagerDuty通知。
- **[Pub/Sub](https://cloud.google.com/pubsub).** 将结果发布到某个主题
  用于消费下游服务。
- **[应用集成](https://cloud.google.com/application-integration/docs/listen-pub-sub-topic-send-email).**
  将 Agent 输出路由到电子邮件、Jira或其他系统。

## 如何构建环境 Agent {#how-to-build-ambient-agents}

ADK 提供了两种方法：

| |[`/run`](/docs/adk/run/agent-runtime/api-server/) |触发端点 |
|:--- |:--- |:--- |
|**事件源** |任意（发布/订阅、webhooks、cron、自定义服务）|[云发布/Sub](https://cloud.google.com/pubsub)， [Eventarc](https://cloud.google.com/eventarc)（[Standard](https://cloud.google.com/eventarc/standard/docs/overview) 和 [Advanced](https://cloud.google.com/eventarc/advanced/docs/overview)）] |
|**有效载货解析**你来处理 |自动（Base64解码，CloudEvent解析） |
|**会话创建**启用`--auto_create_session` |自动（每事件一次）|
|**会话存储**你的配置[`SessionService`](/docs/adk/components/agent-context/sessions/)|你的配置[`SessionService`](/docs/adk/components/agent-context/sessions/)|
|**并发控制**你来处理 |内置带可配置限制的信号量 |
|**重试逻辑**你来处理 |带抖动的指数退避以处理瞬态错误 |
|**最佳用途** |自定义集成，非GCP源代码 |GCP原生事件驱动工作负载 |

## 使用`/run` {#using-run}

当你需要完全控制时，使用[`/run`](/docs/adk/run/agent-runtime/api-server/)端点
集成或正在使用非GCP事件源。启用
`--auto_create_session`让会话自动创建，然后
连接任何HTTP客户端，在事件发生时调用`/run`。

```bash
adk api_server --auto_create_session path/to/your/agent
```

此模式适用于任何可以发出 HTTP 请求的事件源。

<details>
<summary>示例：处理传入的 Webhook
</summary>

以下 [Cloud Run 函数](https://cloud.google.com/functions/docs/writing/write-event-driven-functions) 接收来自外部服务（例如 GitHub）的 Webhook 并将其转发到您的 Agent：

```python
import json
import uuid

import functions_framework
import requests

AGENT_URL = "https://my-agent-service-xxxxx.run.app"

@functions_framework.http
def handle_webhook(request):
    """Cloud Run function that receives webhooks and forwards to the agent."""
    payload = request.get_json(silent=True) or {}

    requests.post(
        f"{AGENT_URL}/run",
        json={
            "app_name": "my_agent",
            "user_id": payload.get("account", "webhook-caller"),
            "session_id": str(uuid.uuid4()),
            "new_message": {
                "role": "user",
                "parts": [{"text": json.dumps(payload)}],
            },
        },
    )

    return ("ok", 200)
```

</details>
<details>
<summary>示例：使用 curl 发送事件</summary>

```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "my_agent",
    "user_id": "webhook-caller",
    "session_id": "session-123",
    "new_message": {
      "role": "user",
      "parts": [{"text": "{\"order_id\": \"1234\", \"status\": \"new\"}"}]
    }
  }'
```

</details>
## 使用触发端点 {#using-trigger-endpoints}

当您的事件源是 Pub/Sub 或 Eventarc 并且您希望 ADK 处理有效负载解析、会话创建、并发和重试时，请使用触发端点。

### 事件处理方式 {#how-events-are-processed}

Pub/Sub 和 Eventarc 将事件作为 HTTP POST 请求传递给您的 Agent。当触发端点收到事件时，它会：

1. **根据源格式解析请求**（Pub/Sub 推送消息或 CloudEvent）。
2. **解码有效负载。** Base64 编码的消息数据将被解码，如果可能，还会解析为 JSON。
3. **自动创建会话**，使用生成的 UUID。与 `/run` 端点不同，您无需启用 `--auto_create_session` — 触发端点每个事件都会创建一个新会话。
4. **运行您的 Agent**，将解码后的事件作为用户消息。
5. **返回状态码。** `200` 响应表示 Pub/Sub 或 Eventarc 已成功处理事件。`500` 响应表示失败，事件源会根据其重试策略重新发送事件。

### 支持的源 {#supported-sources}

| 源 | 端点 | 描述 |
| :----- | :------- | :---------- |
| **Pub/Sub** | `/apps/{app_name}/trigger/pubsub` | 接收来自 [Pub/Sub 推送订阅 ](https://cloud.google.com/pubsub/docs/push) 的消息。|
| **Eventarc** | `/apps/{app_name}/trigger/eventarc` | 接收由 [Eventarc ](https://cloud.google.com/eventarc) 传递的 [CloudEvents ](https://cloudevents.io/)（[标准 ](https://cloud.google.com/eventarc/standard/docs/overview) 或 [高级 ](https://cloud.google.com/eventarc/advanced/docs/overview)），支持结构化和二进制内容模式。|

### 示例 Agent {#example-agent}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}
以下 Agent 处理来自触发端点的事件。它使用 `parse_event` 工具提取事件数据和属性，然后分析内容。

<details>
<summary>Agent 代码 (`event_processing_agent/agent.py`)</summary>

```python
import json

from google.adk.agents import LlmAgent

def parse_event(raw_event: str) -> dict:
    """Parse and extract structured data from a trigger event.

    Trigger endpoints deliver events as a JSON string with 'data' and
    'attributes' fields. This tool extracts those fields so the agent
    can reason about the event contents.
    """
    try:
        event = json.loads(raw_event)
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse event JSON: {e}"}
    return {
        "data": event.get("data"),
        "attributes": event.get("attributes", {}),
    }

root_agent = LlmAgent(
    model="gemini-flash-latest",
    name="event_processor",
    instruction="""You are an event-processing agent that handles incoming
events from Pub/Sub and Eventarc triggers.

When you receive an event:
1. Use the `parse_event` tool to extract the event data and attributes.
2. Analyze the event contents and determine what action to take.
3. Summarize what you found and what action you would recommend.

Be concise and structured in your responses.""",
    tools=[parse_event],
)
```

</details>
{{% /tab %}}
{{% tab tabName="Go" %}}
以下 Agent 从触发端点处理事件。它提取事件数据和属性，然后分析内容。

<details>
<summary>Agent 代码（`event_processing_agent.go`）</summary>

```go
import (
	"context"
	"log"
	"os"

	"google.golang.org/genai"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/cmd/launcher"
	"google.golang.org/adk/v2/cmd/launcher/full"
	"google.golang.org/adk/v2/model/gemini"
)

func main() {
	ctx := context.Background()

	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{
		APIKey: os.Getenv("GOOGLE_API_KEY"),
	})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	a, err := llmagent.New(llmagent.Config{
		Name:        "event_processor",
		Model:       model,
		Description: "Agent to process the events from Pub/Sub and Eventarc triggers.",
		Instruction: `
		You are an event-processing agent that handles incoming
		events from Pub/Sub and Eventarc triggers.

		When you receive an event:
		1. Analyze the event contents and determine what action to take.
		2. Summarize what you found and what action you would recommend.

		Be concise and structured in your responses.`,
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	config := &launcher.Config{
		AgentLoader: agent.NewSingleLoader(a),
	}

	l := full.NewLauncher()
	if err = l.Execute(ctx, config, os.Args[1:]); err != nil {
		log.Fatalf("Run failed: %v\n\n%s", err, l.CommandLineSyntax())
	}
}
```

</details>
{{% /tab %}}
{{< /tabs >}}
### 启用触发器 {#enable-triggers}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

触发端点默认是禁用的。使用`--trigger_sources`标志启用它们：

```shell
adk api_server --trigger_sources "pubsub,eventarc" path/to/your/agent
```

对于生产部署，您可以在自定义 FastAPI 入口点中以编程方式启用触发器：

<details>
<summary>部署入口点 (`main.py`)</summary>

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import os

import uvicorn
from google.adk.cli.fast_api import get_fast_api_app

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))

app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=False,
    trigger_sources=["pubsub", "eventarc"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
```

{{% /tab %}}
{{< /tabs >}}
</details>
{{% /tab %}}
{{% tab tabName="Go" %}}

触发端点默认是禁用的。通过相应的触发标志启用它们：

```shell
go run agent.go web api pubsub eventarc
```

{{% /tab %}}
{{< /tabs >}}
### 本地尝试 {#try-it-locally}

**1. 启动启用触发器的服务器：**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```bash
adk api_server --trigger_sources "pubsub" event_processing_agent
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```bash
go run event_processing_agent.go web api pubsub
```

对于 Go 服务器，请在以下请求中使用 URL
`http://localhost:8080/api/apps/event_processor/trigger/pubsub`。
{{% /tab %}}
{{< /tabs >}}
**2. 发送测试事件：**

```bash
curl -X POST http://localhost:8000/apps/event_processing_agent/trigger/pubsub \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "eyJvcmRlcl9pZCI6ICIxMjM0IiwgInN0YXR1cyI6ICJuZXcifQ==",
      "attributes": {"source": "orders-service"}
    },
    "subscription": "projects/my-project/subscriptions/orders-sub"
  }'
```

Base64 值解码为 `{"order_id": "1234", "status": "new"}`。

成功的响应：

```json
{"status": "success"}
```

## 触发源 {#trigger-sources}

### 参数映射 {#parameter-mapping}

`/run` 端点要求您提供 `app_name`、`user_id` 和 `session_id`。触发端点会自动派生这些参数：

| 参数 | 来源 |
| :-------- | :----- |
| `app_name` | 从 URL 路径中提取 (`/apps/{app_name}/trigger/...`) |
| `session_id` | 每个事件自动生成的 UUID |
| `user_id` | Pub/Sub: `subscription` 字段。Eventarc: `source` 或 `ce-source` 头。 |

### 消息格式 {#message-format}

所有触发端点在将事件作为用户消息传递给您的 Agent 之前，会将传入事件规范化为一致的 JSON 结构：

```json
{
  "data": "<decoded event payload>",
  "attributes": {"key": "value"}
}
```

- **`data`**：解码后的事件负载。如果原始数据是 JSON，则会解析为结构化对象。否则，会以普通字符串传递。
- **`attributes`**：来自事件源的键值元数据（例如 Pub/Sub 消息属性或 CloudEvents 头，如 `ce-type`、`ce-source`）。

您的 Agent 接收此 JSON 字符串作为输入消息，并可以解析它以提取数据和属性。

### Pub/Sub {#pubsub}

Pub/Sub 触发端点处理来自 [Pub/Sub 推送订阅 ](https://cloud.google.com/pubsub/docs/push) 的消息。当您的应用程序或服务向主题发布消息时使用它，例如：

- 支持门户发布新提交的工单以进行分拣和路由。
- 内容管道发送文档以进行分类或审核。
- 监控服务发布警报以进行自动分析。

#### 请求格式 {#request-format}

Pub/Sub 推送订阅以以下格式发送请求：

```json
{
  "message": {
    "data": "eyJvcmRlcl9pZCI6ICIxMjM0IiwgInN0YXR1cyI6ICJuZXcifQ==",
    "attributes": {"source": "orders-service"},
    "messageId": "123456789",
    "publishTime": "2026-04-08T12:00:00Z"
  },
  "subscription": "projects/my-project/subscriptions/my-sub"
}
```

`data` 字段是 Base64 编码的。触发端点会自动解码该字段。

#### 响应 {#response}

| HTTP 状态 | 含义 |
| :---------- | :------ |
| **200** | 事件处理成功。Pub/Sub 确认消息。 |
| **400** | 请求无效（Base64 编码格式错误）。消息不会重试。 |
| **500** | 处理失败（临时或非临时 Agent 错误）。Pub/Sub 根据其 [重试策略](https://cloud.google.com/pubsub/docs/handling-failures) 重试传递。配置 [死信队列](https://cloud.google.com/pubsub/docs/dead-letter-topics) 捕获反复失败的消息。 |

### Eventarc {#eventarc}

Eventarc 触发端点处理由 Eventarc 传递的 [CloudEvents](https://cloud.google.com/eventarc/docs/cloudevents)，支持 [标准](https://cloud.google.com/eventarc/standard/docs/overview) 和 [高级](https://cloud.google.com/eventarc/advanced/docs/overview) 版本。
可用于响应 Google Cloud 中的事件，例如：

- 上传文件到 [云存储](https://cloud.google.com/storage)（对文档进行分类、摘要或数据提取）。
- 向 [BigQuery](https://cloud.google.com/bigquery) 写入记录（运行异常检测或生成警报）。
- 创建 [审计日志](https://cloud.google.com/logging/docs/audit) 条目（标记政策违规或可疑活动）。

支持两种内容模式：

- **二进制内容模式**（Eventarc 默认模式）：CloudEvents 属性作为 `ce-*` HTTP 头发送，主体包含事件数据（通常是 Pub/Sub 消息包装）。
- **结构化内容模式**：所有 CloudEvents 属性和数据均在 JSON 主体中。

<details>
<summary>使用 curl 测试（结构化模式）</summary>

```bash
curl -X POST http://localhost:8000/apps/my_agent/trigger/eventarc \
  -H "Content-Type: application/json" \
  -d '{
    "specversion": "1.0",
    "type": "google.cloud.storage.object.v1.finalized",
    "source": "//storage.googleapis.com/projects/my-project",
    "id": "event-123",
    "data": {
      "bucket": "my-bucket",
      "name": "uploads/document.pdf"
    }
  }'
```

</details>
<details>
<summary>使用 curl 测试（二进制模式）</summary>

```bash
curl -X POST http://localhost:8000/apps/my_agent/trigger/eventarc \
  -H "Content-Type: application/json" \
  -H "ce-type: google.cloud.storage.object.v1.finalized" \
  -H "ce-source: //storage.googleapis.com/projects/my-project" \
  -H "ce-id: event-456" \
  -H "ce-specversion: 1.0" \
  -d '{
    "message": {
      "data": "eyJidWNrZXQiOiAibXktYnVja2V0IiwgIm5hbWUiOiAiZG9jLnBkZiJ9",
      "attributes": {"eventType": "OBJECT_FINALIZE"}
    },
    "subscription": "projects/my-project/subscriptions/eventarc-sub"
  }'
```

</details>
#### 响应 {#response}

| HTTP 状态 | 含义 |
| :---------- | :------ |
| **200** | 事件处理成功。Eventarc 确认已交付。 |
| **500** | 处理失败。Eventarc 根据其重试策略重试交付。 |

## 配置 {#configuration}

### 并发控制 {#concurrency-control}

触发器端点使用信号量来限制并发 Agent 调用的数量。这可防止您的 Agent 在事件高峰期间超过 LLM 模型配额。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

| 设置 | 默认值 | 环境变量 |
| :------ | :------ | :------------------- |
| 最大并发调用 | 10 | `ADK_TRIGGER_MAX_CONCURRENT` |
{{% /tab %}}
{{% tab tabName="Go" %}}

| 设置 | 默认值 | 标志 |
| :------ | :------ | :------------------- |
| 最大并发调用 | 100 | `--trigger_max_concurrent_runs` |

默认情况下，ADK Go 允许 100 个并发调用，ADK Python 允许 10 个。

{{% alert context="info" %}}
**ADK Go 中的 Pub/Sub 触发器并发**

ADK Go v2.3.0 到 v2.5.0 不将
`--trigger_max_concurrent_runs` 应用于 Pub/Sub 触发器，因此 Pub/Sub 事件在运行时没有并发限制。要限制 Pub/Sub 并发，请使用 ADK Go v2.6.0 或更高版本。
{{% /alert %}}
{{% /tab %}}
{{< /tabs >}}
当达到并发限制时，传入请求将被排队，并在有可用空位时处理。并发控制是每个进程独立的。如果部署多个 Cloud Run 实例，每个实例维护自己的独立信号量。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```bash
# Allow up to 5 concurrent agent invocations
export ADK_TRIGGER_MAX_CONCURRENT=5
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```bash
go run event_processing_agent.go web api eventarc --trigger_max_concurrent_runs=5
```

{{% /tab %}}
{{< /tabs >}}
### 自动重试及退避机制 {#automatic-retry-with-backoff}

触发端点包含内置的重试逻辑，可应对如 `429 RESOURCE_EXHAUSTED` 响应等瞬态错误。当检测到瞬态错误时，请求会按照指数退避并加入抖动后重新发送。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

| 设置 | 默认值 | 环境变量 |
| :------ | :------ | :------------------- |
| 最大重试次数 | 3 | `ADK_TRIGGER_MAX_RETRIES` |
| 基础退避延迟 | 1.0秒 | `ADK_TRIGGER_RETRY_BASE_DELAY` |
| 最大退避延迟 | 30.0秒 | `ADK_TRIGGER_RETRY_MAX_DELAY` |
{{% /tab %}}
{{% tab tabName="Go" %}}

| 设置 | 默认值 | 标志 |
| :------ | :------ | :------------------- |
| 最大重试次数 | 3 | `--trigger_max_retries` |
| 基础退避延迟 | 1.0秒 | `--trigger_base_delay` |
| 最大退避延迟 | 10.0秒 | `--trigger_max_delay` |

默认情况下，ADK Go 将退避延迟上限设置为 10 秒，而 ADK Python 将其上限设置为 30 秒。
{{% /tab %}}
{{< /tabs >}}
如果所有重试都用尽，端点将返回 HTTP 500，提示 Pub/Sub 或 Eventarc 在更高级别上重试投递。非瞬态错误会立即失败且不进行重试。

### 错误处理与灾难恢复 {#error-handling-and-disaster-recovery}

基于触发器的工作负载的灾难恢复由触发服务处理，而非 ADK：

- 如果您的 Agent 崩溃或返回错误，Pub/Sub 或 Eventarc 将不会收到确认，并会自动重新发送消息。
- 超过最大重试次数后，未处理的消息将移至配置的 [死信队列 (DLQ)](https://cloud.google.com/pubsub/docs/dead-letter-topics)。
- 每次重新投递都会创建一个新会话。触发工作负载设计为无状态。

### 超时考虑 {#timeout-considerations}

所有触发端点同步处理，并等待您的 Agent 完成后才返回响应。这是设计使然：保持 HTTP 请求存活可确保托管基础设施在 Agent 仍在工作的情况下不会终止进程。同步响应代码（200 或 500）允许 Pub/Sub 和 Eventarc 正确确认成功或触发重试。

最大处理时间由上游服务决定：

| 服务 | 最大超时 |
| :------ | :---------- |
| Pub/Sub 推送 | 10 分钟（确认截止时间） |
| Eventarc | 10 分钟（[标准](https://cloud.google.com/eventarc/standard/docs/overview) 使用 Pub/Sub 作为传输；[高级](https://cloud.google.com/eventarc/advanced/docs/overview) 通过管道投递]） |

触发端点适用于可在 10 分钟内完成的 Agent。适合处理单个事件、运行验证、对文档分类以及将结果写入下游服务。

{{% alert context="warning" %}}
**长期运行的 Agent**
触发端点不适合需要超过10分钟才能完成的 Agent。对于长时间运行的工作负载，请使用[Pub/Sub pull 订阅](https://cloud.google.com/pubsub/docs/pull)、[Cloud Run 作业](https://cloud.google.com/run/docs/create-jobs)或工作池架构。{{% /alert %}}
### 会话生命周期 {#session-lifecycle}

会话遵循与所有其他 ADK 入口点相同的模式。它们通过您配置的[`SessionService`](/docs/adk/components/agent-context/sessions/)创建。默认情况下，ADK 使用`InMemorySessionService`，这使触发会话是临时的：每个事件创建，在处理后丢弃。

如果您配置了持久的`SessionService`（例如`DatabaseSessionService`），触发会话将自动存储。这对于事件驱动工作负载的审计、调试和事后分析非常有用。

## 部署 {#deploy}

下面的示例使用[Cloud Run](https://cloud.google.com/run)作为部署目标。Cloud Run 目前是部署带有触发端点的环境 Agent 的推荐平台。

{{% alert context="info" %}}
**身份验证和安全**

触发端点是 ADK Web服务器内的标准HTTP路由。身份验证和安全性在部署级别执行，与任何其他 ADK 端点相同。当启用身份验证（推荐）部署时，所有端点都需要有效凭据。GCP服务使用[服务帐号](https://cloud.google.com/iam/docs/service-accounts)身份]进行身份验证。详情请参阅各服务文档。{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用`--trigger_sources`标志，将您的 Agent 部署到启用触发器的Cloud Run：

```bash
adk deploy cloud_run \
  --project=$GOOGLE_CLOUD_PROJECT \
  --region=$GOOGLE_CLOUD_LOCATION \
  --trigger_sources="pubsub,eventarc" \
  path/to/your/agent
```

{{% /tab %}}
{{% tab tabName="Go" %}}

使用 `adkgo` CLI 将你的 Agent 部署到 Cloud Run，并为每个触发器添加一个标志：

```bash
./adkgo deploy cloudrun \
  -p $GOOGLE_CLOUD_PROJECT \
  -r $GOOGLE_CLOUD_LOCATION \
  -s $SERVICE_NAME \
  -e ./main.go \
  --pubsub \
  --eventarc \
  --eventarc_max_concurrent_runs=5
```

ADK Go 在 `/api` 路径前缀下提供触发端点，因此将推送订阅和 Eventarc 触发器指向 `/api/apps/{app_name}/trigger/pubsub` 和 `/api/apps/{app_name}/trigger/eventarc`。
{{% /tab %}}
{{< /tabs >}}
部署后，将适当的 GCP 基础设施连接到 Agent 的触发端点：

- **Pub/Sub**：创建一个 [推送订阅](https://cloud.google.com/pubsub/docs/push) 指向 `/apps/{app_name}/trigger/pubsub`。
- **Eventarc**：创建一个 [Eventarc 标准触发器](https://docs.cloud.google.com/eventarc/standard/docs/event-providers-targets) 或 [Eventarc 高级管道](https://cloud.google.com/eventarc/advanced/docs/overview) 路由到 `/apps/{app_name}/trigger/eventarc`。
- **Cloud Scheduler**：创建一个 [调度作业](https://cloud.google.com/scheduler/docs/creating)，按 cron 计划发布到您的 Pub/Sub 主题。

请参阅 [部署到 Cloud Run](/docs/adk/run/deployment/cloud-run/) 获取完整的部署说明。

## 接下来做什么？ {#whats-next}

- 学习如何 [将您的 Agent 部署到 Cloud Run](/docs/adk/run/deployment/cloud-run/)
- 探索 [API 服务器端点](/docs/adk/run/agent-runtime/api-server/) 以进行交互式 Agent 调用
- 使用 [Pub/Sub 工具集（官方英文）](https://adk.dev/integrations/pubsub/) 赋予您的 Agent 发布和拉取消息的能力

---

原文：[Trigger actions with ambient agents](https://adk.dev/runtime/ambient-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/ambient-agents.md)
