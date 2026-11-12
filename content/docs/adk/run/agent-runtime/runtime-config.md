---
title: "运行时配置"
description: "`RunConfig` 控制 Agent 在运行时的行为，包括流模式、语音设置、LLM 调用限制和实时 Agent 选项。将 `RunConfig` 传递给 `runner.run_async()` 或 `runner.run_live()` 以覆盖默认设置"
icon: "article"
weight: 70
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

`RunConfig` 控制 Agent 在运行时的行为，包括流模式、语音设置、LLM 调用限制和实时 Agent 选项。将 `RunConfig` 传递给 `runner.run_async()` 或 `runner.run_live()` 以覆盖默认行为。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.run_config import RunConfig, StreamingMode

config = RunConfig(
    streaming_mode=StreamingMode.SSE,
    max_llm_calls=200,
)

async for event in runner.run_async(
    ...,
    run_config=config,
):
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import "google.golang.org/adk/v2/agent"

config := agent.RunConfig{
    StreamingMode: agent.StreamingModeSSE,
}
```

{{% /tab %}}
{{< /tabs >}}

## 管理会话和上下文 {#manage-sessions-and-context}

支持版本：Python。

对于长时间运行的会话，您可以控制加载多少历史记录，以及是否压缩上下文窗口：

- `get_session_config`：限制加载会话时获取的事件。使用 `num_recent_events` 或 `after_timestamp` 避免每次调用时加载完整事件历史记录。这些筛选器限制了加载的视图，而不会删除存储的事件。新事件会追加到存储的历史记录中，同时保留被排除在加载视图之外的旧事件。
- `context_window_compression`：启用 LLM 输入的上下文窗口压缩，当会话接近模型上下文限制时非常有用。
- `include_thoughts_from_other_agents`：控制是否将来自其他 Agent 的思考部分包含在 LLM 上下文中。默认情况下禁用。
- `model_input_context`：仅为此次调用添加到 LLM 请求中的 `types.Content` 列表。Runner 不会将其持久化到会话中，因此您可以在不更改对话历史的情况下提供每轮上下文。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.run_config import RunConfig
from google.adk.sessions.base_session_service import GetSessionConfig

config = RunConfig(
    get_session_config=GetSessionConfig(num_recent_events=50),
)
```

{{% /tab %}}
{{< /tabs >}}

## 文本响应选项 { #enable-streaming } {#text-response-options--enable-streaming}

您可以控制 Agent 在文本模式下的响应方式，是逐字生成，还是一次性完整响应，如下所述的 ***流式模式*** 参数：

- **`StreamingMode.NONE`**（默认）：Runner 每轮返回一次完整响应。适用于命令行工具、批处理和同步工作流。
- **`StreamingMode.SSE`**：服务器发送事件流。Runner 在 LLM 生成时返回部分事件，可实现打字机样式的用户界面和实时聊天显示。

***流式模式*** 参数还有另一设置，可实现数据双向流，包括语音输入和输出。此功能需要比简单 Agent 更多的配置。有关此功能的更多信息，请参见 [实时和语音 Agent](/docs/adk/components/live-and-voice-agents/)。

设置 `support_cfc=True` 并配合 `StreamingMode.SSE` 使用，可启用组合函数调用（CFC），允许模型动态组合并执行函数调用。CFC 在底层使用实时 API。

{{% alert context="default" %}}
**实验性**

CFC 支持为实验性，其 API 或行为可能在未来版本中更改。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.run_config import RunConfig, StreamingMode

config = RunConfig(
    streaming_mode=StreamingMode.SSE,
    support_cfc=True,
    max_llm_calls=150,
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import "google.golang.org/adk/v2/agent"

config := agent.RunConfig{
    StreamingMode: agent.StreamingModeSSE,
}
```

{{% /tab %}}
{{< /tabs >}}

## 配置音频和语音 {#configure-audio-and-speech}

支持版本：Python。

对于支持语音的 Agent，配置语音合成、音频转录和
响应方式。

{{% alert context="success" %}}
**实时 Agent**

本节涵盖跨语言共享的音频字段。有关完整的实时
(`run_live()`) 配置参考 — 转录流、语音选择、语音活动检测，以及主动/情感对话 — 请参见
[实时 Agent 配置](/docs/adk/components/live-and-voice-agents/building/configuration/)。
{{% /alert %}}
- `speech_config`：设置语音输出的声音和语言（例如，使用 `en-US` 的 “Kore” 声音）。
- `response_modalities`：控制输出格式。一个会话只接受一种模式 — 对于语音 Agent 使用 `["AUDIO"]`，对于仅文本 Agent 使用 `["TEXT"]`。
  若要同时获取语音和文本，请设置 `["AUDIO"]`，并从输出音频转录中读取文本。
- `output_audio_transcription` / `input_audio_transcription`：启用对模型音频输出和用户音频输入的转录。
  在 Python 中，两者默认设置为 `AudioTranscriptionConfig()`。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai import types

config = RunConfig(
    speech_config=types.SpeechConfig(
        language_code="en-US",
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Kore"
            )
        ),
    ),
    response_modalities=["AUDIO"],
    streaming_mode=StreamingMode.SSE,
    max_llm_calls=1000,
)
```

{{% /tab %}}
{{< /tabs >}}

## 配置实时 Agent {#configure-live-agents}

支持版本：Python。

ADK Agent 可以支持 [实时和语音 Agent](/docs/adk/components/live-and-voice-agents/) 来创建交互式 Agent 体验。你可以使用 `runner.run_live()` 方法配置支持此功能的 Agent。
实时 Agent (`run_live()`) 会话添加了一组实时参数，包括 `realtime_input_config`、`session_resumption`、`save_live_blob`、`tool_thread_pool_config`、`proactivity`、`enable_affective_dialog` 等。
更多信息，请参见实时 Agent 文档：

- **[实时 Agent 配置](/docs/adk/components/live-and-voice-agents/building/configuration/)**: `RunConfig` 的实时 Agent 参考。
- **[会话](/docs/adk/components/live-and-voice-agents/building/sessions/#session-resumption)**: 恢复和重新连接会话。
- **[配置：主动性和情感对话](/docs/adk/components/live-and-voice-agents/building/configuration/#proactivity-and-affective-dialog)**: 原生音频会话功能及支持这些功能的模型。

`tool_thread_pool_config` 设置是一个例外：它是运行时问题，而不是实时 API 的问题，因此保留在这里。它在后台线程池中运行工具执行，以便事件循环继续响应用户中断。
并非所有参数在每种语言中都可用。请参阅 [API 参考](#api-reference) 获取特定语言的详细信息。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.run_config import RunConfig, ToolThreadPoolConfig

config = RunConfig(
    save_live_blob=True,
    tool_thread_pool_config=ToolThreadPoolConfig(max_workers=8),
)
```

{{% alert context="info" %}}
**线程池与全局解释器锁（GIL）**

线程池有助于处理阻塞的 I/O 和释放 GIL 的 C 扩展（例如 `time.sleep()`、网络调用、numpy）。它们**不能**帮助纯 Python 的 CPU 密集型代码，因为 GIL 会阻止 Python 字节码的真正并行执行。
{{% /alert %}}
{{% /tab %}}
{{< /tabs >}}

## 配置运行时限制和调试 {#configure-runtime-limits-and-debugging}

使用这些参数来控制运行时保护和调试：

- `max_llm_calls`：限制每次运行的 LLM 调用总数（默认值：500）。
  设置为 0 或负数表示无限调用，但不推荐在生产环境中使用。传递你所用语言的最大整数会产生错误：Python 中为 `sys.maxsize`，Kotlin 中为 `Int.MAX_VALUE`。
- `save_input_blobs_as_artifacts`：当 `True` 时，将输入数据（例如上传的文件）保存为运行产物以便调试和审计。在 Python 中已被弃用，建议使用 `SaveFilesAsArtifactsPlugin`。在 Go 中，将 `agent.RunConfig` 的 `SaveInputBlobsAsArtifacts` 字段设置为 `true`。Runner 需要有产物服务设置才能生效。
- `custom_metadata`：`dict[str, Any]` 的任意元数据，附加到调用中，有助于追踪或记录日志。
- `service_tier`：选择运行模型调用的服务容量。仅适用于 ADK Python，并且仅适用于使用 Interactions API 的 Gemini 模型。`ServiceTier.DEFERRED` 将每次模型调用排队在非高峰容量上运行，不能与 `StreamingMode.SSE` 结合使用。参见 [Deferred scheduling](/docs/adk/build/models-for-agents/gemini/deferred-scheduling/)。

## API 参考 {#api-reference}

有关完整的字段、类型和默认值列表，请参阅你所用语言的 API 参考：

- [Python API 参考（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.agents.RunConfig)
- [TypeScript API 参考（官方英文）](https://adk.dev/api-reference/typescript/interfaces/RunConfig.html/)
- [Go API 参考](https://pkg.go.dev/google.golang.org/adk/v2/agent#RunConfig)
- [Java API 参考（官方英文）](https://adk.dev/api-reference/java/com/google/adk/agents/RunConfig.html/)
- [Kotlin API 参考（官方英文）](https://adk.dev/api-reference/kotlin/google-adk-kotlin-core/com.google.adk.kt.agents/-run-config/index.html/)

---

原文：[Runtime Configuration](https://adk.dev/runtime/runconfig/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/runconfig.md)
