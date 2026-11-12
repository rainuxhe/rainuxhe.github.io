---
title: "延迟调度"
description: "Agent 工作负载有不同的延迟需求。交互式助手必须立即回答，但摘要任务、大规模评估运行或文档处理流水线可以等待容量。延迟调度"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v2.10.0。

Agent 工作负载有不同的延迟需求。交互式助手必须立即响应，但摘要任务、大规模评估运行或文档处理管道可以等待容量。延迟调度允许 ADK Agent 将这些工作负载的模型调用排队，在非高峰容量下运行，享受[折扣率](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)，而不是竞争交互式容量。

您可以在每次运行时请求延迟调度，使用 `service_tier` 的 `RunConfig` 设置。该设置是运行配置的一部分，而不是模型或 Agent 的一部分，因此同一个 Agent 定义可以同时服务交互式请求和批量工作负载。

{{% alert context="default" %}}
**预览：延迟容量需要允许列表访问**

此 Google Cloud 功能是预览功能，在延迟容量上运行请求需要您的 Google Cloud 项目在允许列表中。更多信息，请参见 [自主 Agent 调度](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/efficiency/autonomous-scheduling)。
{{% /alert %}}
## 开始使用 {#get-started}

延迟调度需要配置为 Google Cloud for Gemini [交互 API ](/docs/adk/build/models-for-agents/gemini/#interactions-api) 的 Gemini 模型。在模型上设置 `use_interactions_api=True`，然后在运行 Agent 时传递 `RunConfig(service_tier=ServiceTier.DEFERRED)`，如以下示例所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import asyncio

from google.adk.agents import LlmAgent
from google.adk.agents import RunConfig
from google.adk.apps import App
from google.adk.models import ServiceTier
from google.adk.models.google_llm import Gemini
from google.adk.runners import InMemoryRunner
from google.genai import types

root_agent = LlmAgent(
    name='batch_agent',
    model=Gemini(
        model='gemini-flash-latest',
        use_interactions_api=True,  # Required for deferred scheduling
    ),
    instruction='Process input documents and produce summaries.',
)

app = App(name='batch_app', root_agent=root_agent)
runner = InMemoryRunner(app=app)

async def main() -> None:
  session = await runner.session_service.create_session(
      app_name=app.name,
      user_id='user_123',
      session_id='session_456',
  )

  # 请求在此运行中的每个模型调用使用非高峰时段容量。
  run_config = RunConfig(service_tier=ServiceTier.DEFERRED)

  async for event in runner.run_async(
      user_id='user_123',
      session_id=session.id,
      new_message=types.Content(
          role='user',
          parts=[types.Part.from_text(
              text='Summarize quarterly performance metrics.'
          )],
      ),
      run_config=run_config,
  ):
    if event.content and event.content.parts:
      for part in event.content.parts:
        if part.text:
          print(part.text)

asyncio.run(main())
```

{{% /tab %}}
{{< /tabs >}}
Runner 提交模型调用，等待排队的工作完成，然后生成响应事件。您的代码对事件的处理方式与标准运行完全相同。

{{% alert context="warning" %}}
**运行似乎在等待时挂起**

当请求在队列中等待时，`run_async()` 方法不会生成任何事件。等待时间取决于后端负载，ADK 不会设置上限。在 Web UI 或终端中，应用程序在此延迟期间看起来无响应。显示进度指示器，或设置[客户端截止时间](#set-a-client-side-deadline)。
{{% /alert %}}
要确认该层已生效，请在应用程序日志中检查以下消息：

| 日志消息 | 级别 | 含义 |
| :--- | :--- | :--- |
| `Using service_tier from run_config: deferred` | `DEBUG` | ADK 将该层应用于请求。 |
| `Interaction <id> is queued; waiting for the result.` | `INFO` | 后端已将工作加入队列。 |
| `Interaction <id> reached status completed.` | `INFO` | 结果已准备好。 |
| `run_config.service_tier=... has no effect for agent <name>` | `WARNING` | ADK 已移除该层。请参见[Troubleshooting](#troubleshooting)。|

## 延迟调度的工作原理 {#how-deferred-scheduling-works}

标准模型请求是同步的。ADK 发送请求，模型在同一连接上返回响应。当通过设置 `ServiceTier.DEFERRED` 启用延迟调度时，ADK 会将请求标记为后台执行，后端将其排入队列，并立即返回交互 ID，而不返回结果。

ADK 然后等待结果，通过指数退避检查排队的工作，并吸收暂时的读取失败，直到达到最终状态。它将该结果转换为正常响应事件并生成它。如果连续 5 次读取失败，ADK 会抛出最后一次读取的错误。此循环为内部操作：不会显示交互 ID，您也无需编写任何检索代码。它会在队列等待之上增加几秒的轮询延迟，因此不应将延迟调度用于短时、对延迟敏感的调用。

等待的以下属性会影响您对 Agent 的设计：

*   **ADK 不设置客户端截止时间。** 交互的后端完成超时是等待的唯一上限。要提前停止，请参见[设置客户端截止时间](#set-a-client-side-deadline)。
*   **每个模型轮次单独排队。** 在调用工具的 Agent 中，每个轮次会创建自己的交互，因此总延迟是每轮队列等待时间的总和，而不是单次运行等待。

## 配置选项 {#configuration-options}

`service_tier` 的 `RunConfig` 设置选择运行中每次模型调用的容量池：

| 选项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `service_tier` | `Optional[ServiceTier \| str]` | `None` | 本次运行模型调用的服务层。 |
`ServiceTier` 枚举定义了以下等级：

* `ServiceTier.DEFERRED`：将调用排队以在非高峰容量下运行。当容量受限时，调用会等待而不会失败。没有其他等级会改变 ADK 执行请求的方式，并且它不能与流媒体结合使用。
* `ServiceTier.FLEX`：以较低成本提供尽力而为的容量，但不保证延迟。
* `ServiceTier.STANDARD`：默认等级。
* `ServiceTier.PRIORITY`：为延迟敏感的调用保留容量。

如果不设置 `service_tier`，则该字段将完全从请求中省略，这相当于 `ServiceTier.STANDARD`。`ServiceTier` 枚举是 `str` 的子类，因此您可以传递像 `'deferred'` 这样的普通字符串来代替枚举成员。字符串形式也允许您使用后端支持的待 ADK 定义常量之前的等级。

## 高级用法 {#advanced-usage}

以下部分描述了如何通过客户端截止时间为延迟运行限制等待时间，以及如何在通过 HTTP 为 Agent 服务时请求延迟调度。

### 设置客户端截止时间 {#set-a-client-side-deadline}

延迟请求等待非高峰容量，其持续时间取决于后端负载。为了限制总耗时，可以将运行包装在 `asyncio.timeout()` 中，该方法需要 Python 3.11 或更高版本：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import asyncio
import logging

from google.adk.agents import RunConfig
from google.adk.models import ServiceTier
from google.genai import types

logger = logging.getLogger(__name__)

# 接着“入门示例”，重用 runner 和 session。
message = types.Content(
    role='user',
    parts=[types.Part.from_text(text='Generate a quarterly summary.')],
)
run_config = RunConfig(service_tier=ServiceTier.DEFERRED)

async def run_with_deadline(runner, session) -> None:
  try:
    async with asyncio.timeout(300):
      async for event in runner.run_async(
          user_id='user_123',
          session_id=session.id,
          new_message=message,
          run_config=run_config,
      ):
        if event.content and event.content.parts:
          for part in event.content.parts:
            if part.text:
              print(part.text)
  except TimeoutError:
    logger.error('Deferred run exceeded the 300 second client deadline.')
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="danger" %}}
**客户截止日期不会取消请求**

超时会停止 ADK 轮询结果，但不会停止后端。排队的请求会执行完成并消耗计费的使用量，而且之后无法检索其输出。将超时的回合视为作废，不要使用客户端截止日期来限制使用。
{{% /alert %}}
### 通过 HTTP 延迟请求调度 {#request-deferred-scheduling-over-http}

您通过 `adk api_server` 提供服务的 Agent 接受 `service_tier`，该请求位于 `/run` 和 `/run_sse` 端点的请求正文中:

```json
{
  "app_name": "batch_app",
  "user_id": "user_123",
  "session_id": "session_456",
  "new_message": {
    "role": "user",
    "parts": [{"text": "Summarize batch results."}]
  },
  "service_tier": "deferred"
}
```

对于 `/run_sse` 请求，您还必须设置 `"streaming": false`。将 `"service_tier": "deferred"` 与 `"streaming": true` 组合会返回 HTTP 422。
HTTP 请求在整个队列等待期间保持连接开启，这使得托管平台的请求超时成为延迟运行的实际限制：

*   **提高 Agent 和入口超时。** 负载均衡器和入口控制器默认会关闭长时间运行的后端连接。检查平台的限制，例如 [Cloud Run 请求超时](https://cloud.google.com/run/docs/configuring/request-timeout)，并将其提高到覆盖预期队列等待时间。**
*   **客户端断开不会取消执行，只会取消检索。** 当连接关闭时，服务器会取消其轮询任务。队列中的请求仍会运行，并仍会消耗计费使用量，同时您会丢失其输出。

对于可能等待很长时间的延迟工作负载，请部署到 [Google Cloud Agent 平台上的 Agent Runtime](/docs/adk/run/deployment/agent-runtime/)。Agent Runtime 在受管容器中运行调用，而不会为其保持 HTTP 连接。

## 限制 {#limitations}

延迟调度适用以下限制：

*   **允许列表访问：** 延迟容量需要您的 Google Cloud 项目的允许列表。
*   **仅限 Gemini 和 Interactions API：** 延迟调度仅适用于设置了 `use_interactions_api=True` 的 `Gemini` 模型。任何其他模型，包括自定义 `BaseLlm` 子类，都将忽略该层。
*   **不兼容流式传输：** 构建 `RunConfig(service_tier=ServiceTier.DEFERRED, streaming_mode=StreamingMode.SSE)` 会引发 `pydantic.ValidationError`。
*   **`ManagedAgent` 类忽略层：** 它运行自己的交互循环，从不读取 `service_tier`。
*   **无法在重启后继续：** ADK 不会持久化进行中的交互 ID，也不提供将运行重新附加到排队交互的方法。如果客户端进程停止，ADK 会放弃挂起的工作，下次运行会创建新交互。

## 故障排除 {#troubleshooting}

以下部分描述了使用延迟调度时的一些常见问题，以及如何解决它们。

### ADK 忽略层但运行仍成功 {#adk-ignores-the-tier-and-the-run-still-succeeds}

如果 Agent 的模型不是带有 `use_interactions_api=True` 的 `Gemini` 实例，ADK 会丢弃该层，每次运行记录一次警告，并在标准容量上执行调用。运行成功，因此日志是唯一的信号：

```text
run_config.service_tier=... has no effect for agent <name>: its model does not
use the interactions API, which is the only path with a serving tier. Set
use_interactions_api=True on the model to apply the tier.
```

该警告是故意的。在多 Agent 运行中，只有某些 Agent 可能在交互 API 上，因此不可用的层会发出警告而不是抛出错误。搜索您的日志以查找 `has no effect for agent` 以找到需要 `use_interactions_api=True` 的模型。

### OpenAI `service_tier` 字段 {#openai-servicetier-field}

`OpenAIResponsesLlm` 类也有一个 `service_tier` 字段。这是一个不相关的设置：它是在模型上设置的，而不是在运行上设置的，并且 `RunConfig.service_tier` 不会使用它。设置其中一个对另一个没有影响。

## 附加资源 {#additional-resources}

* [Gemini Interactions API ](/docs/adk/build/models-for-agents/gemini/#interactions-api)
* [运行时配置 ](/docs/adk/run/agent-runtime/runtime-config/)
* [交互 API 代码示例 ](https://github.com/google/adk-python/tree/main/contributing/samples/models/interactions_api)

---

原文：[Deferred scheduling with Gemini models](https://adk.dev/agents/models/google-gemini/deferred-schedule/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/google-gemini/deferred-schedule.md)
