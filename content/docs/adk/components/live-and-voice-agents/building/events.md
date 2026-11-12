---
title: "事件"
description: "实时 Agent 生成的所有内容都会作为 `Event` 发送到你的应用程序：模型生成时的部分文本、原始音频字节、双方对话的转录、工具调用、令牌计数以及错误。"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v0.1.0。

所有实时 Agent 产生的内容都会作为 `Event` 送达你的应用程序：模型创作的部分文本、原始音频字节、双方对话的转录、工具调用、令牌计数以及错误信息。单个口语回复可能会以数十个事件的形式到达，而正确处理这些事件能够让语音界面感到即时，而非延迟。

`Event` 是 ADK 在各处使用的相同类，文档见 [Events](/docs/adk/components/agent-context/events/)。
实时会话会填写请求/响应 Agent 从未接触的字段——音频数据块、转录、打断标志——并连续传递这些信息，而不是一次性传递。有关产生这些事件的循环，请参见 [Sessions](/docs/adk/components/live-and-voice-agents/building/sessions/)。

## 实时 Agent 事件数据 {#live-agent-event-data}

一个 [`Event`（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.events.Event) 是一个 Pydantic 模型，扩展了 `LlmResponse`。实时会话使用以下字段：

| 字段 | 内容 |
|-------|---------------|
| `content.parts[].text` | 文本部分——在实时会话中，包括思考总结和其他非口语内容 |
| `content.parts[].inline_data` | 用于播放的原始音频字节（临时） |
| `content.parts[].file_data` | 对存储在附件中的音频的引用（当 `save_live_blob=True`） |
| `content.parts[].function_call` / `function_response` | 工具调用及结果（ADK 为你执行这些） |
| `input_transcription` / `output_transcription` | 用户和模型的语音文本 |
| `partial` | `True` 表示增量块，`False` 表示合并结果 |
| `turn_complete` | 当模型完成整个回复时的 `True` |
| `interrupted` | 用户在中途打断时的 `True` |
| `usage_metadata` | 用于成本和配额追踪的令牌计数 |
| `error_code` / `error_message` | 错误诊断 |
| `author` | 事件产生者（见下文） |

### 作者信息 {#authorship}

在实时会话中，`event.author` 即为转录用户语音的 `"user"`，而模型自身的输出使用 **Agent 名称**（而非字面上的 `"model"`）。当响应包含 `input_transcription` 或 `content.role == 'user'` 时，ADK 会设置 `author="user"`；检查转录内容可以确保归属的可靠性，因为输入转录的响应不总是携带 `role == 'user'`（[`base_llm_flow.py`](https://github.com/google/adk-python/blob/main/src/google/adk/flows/llm_flows/base_llm_flow.py)）。

使用 Agent 名称可以让你在多 Agent 会话中按作者进行筛选：

```python
events = [e for e in stream if e.author == "billing_agent"]
```

## 事件类型 {#event-types}

在实时会话期间，Agent 通过几种不同的事件类型提供其连续输出，这些事件类型可以包括部分文本、音频、语音转录、工具调用和令牌使用元数据。以下部分描述这些事件类型。

在实时会话期间，Agent 通过几种不同的事件类型提供其连续输出，这些事件类型可以包括部分文本、音频、语音转录、工具调用和令牌使用元数据。以下部分描述这些事件类型。

### 文本 {#text}

文本会到达 `event.content.parts[].text`。在实时会话中，这被认为是摘要和其他非口语内容——**模型的口语回复会作为 [输出转录](/docs/adk/components/live-and-voice-agents/building/configuration/#audio-transcription) 返回，而不是文本部分**，因为每个 [实时模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) ADK 支持接收音频输入并生成音频输出].

```python
async for event in runner.run_live(...):
    if event.content and event.content.parts:
        for part in event.content.parts:
            if part.text and not event.partial:
                update_display(part.text)
```

{{% alert context="warning" %}}
**对 `parts` 进行迭代，永远不要假设 `parts[0]`**

一个事件可以包含多个部分，而实时模型经常这样处理。`event.content.parts[0].text` 会默默丢弃其余部分，并在第一个部分不是文本（思维摘要、函数调用、音频数据块）时中断。对各部分进行循环，并根据哪个字段被设置来分支。
{{% /alert %}}

### 音频 {#audio}

使用 `response_modalities=["AUDIO"]`（实时默认），模型将音频返回为 `inline_data`：

```python
async for event in runner.run_live(...):
    if event.content and event.content.parts:
        for part in event.content.parts:
            if part.inline_data:  # raw PCM bytes
                await play_audio(part.inline_data.data)
```

`inline_data` 是短暂的，从未持久化。设置 [`save_live_blob=True`](/docs/adk/components/live-and-voice-agents/building/configuration/#save_live_blob) 和 ADK 将音频汇总到 Artifact 服务中的文件中，提供一个 `file_data` 引用，而不是（而非附加）原始字节，以便你以后可以检索音频。有关格式和播放，请参阅 [音频和视频](/docs/adk/components/live-and-voice-agents/building/audio-and-video/)。

### 转录 {#transcription}

当启用转录（默认启用）时，用户和模型的语音会通过 `event.input_transcription` 和 `event.output_transcription` 到达。它们以片段方式流式传输：`.text` 保存最新的片段，`.finished` 标记回合的最后一个片段，并由 `event.partial` 镜像。将片段连接起来以构建完整的转录文本。请参阅 [音频转录](/docs/adk/components/live-and-voice-agents/building/configuration/#audio-transcription)。

```python
async for event in runner.run_live(...):
    if event.input_transcription and event.input_transcription.text:
        show_caption(event.input_transcription.text, is_user=True)
    if event.output_transcription and event.output_transcription.text:
        show_caption(event.output_transcription.text, is_user=False)
```

### 工具调用 {#tool-calls}

模型通过 `part.function_call` 请求工具。ADK 会自动执行已注册的工具，因此你很少需要直接处理这些。请参见 [自动工具执行](/docs/adk/components/live-and-voice-agents/building/tools/#automatic-tool-execution)。

### 元数据 {#metadata}

`event.usage_metadata` 携带令牌计数 (`prompt_token_count`, `candidates_token_count`, `total_token_count`, `cached_content_token_count`) 用于实时成本和配额跟踪。

## 流式标志 {#streaming-flags}

三个标志驱动实时用户界面：`partial`、`turn_complete` 和 `interrupted`。`partial` 标志区分增量块和合并结果：

- `partial=True`：仅自上次事件以来的新文本。
- `partial=False`：此段的完整合并文本。

ADK 会在实时连接中为你累积这些块 ([`GeminiLlmConnection.receive()`](https://github.com/google/adk-python/blob/main/src/google/adk/models/gemini_llm_connection.py))，因此 `partial=False` 事件已经包含之前 `partial=True` 块的总和。如果你不需要实时打字效果，可以忽略部分内容，只对 `partial=False` 进行处理。

每个这些标志都是 `Optional[bool]`，默认值为 `None`，因此应测试该标志是否为真值，而不是将其与 `False` 比较。

```text
Event 1: partial=True,  text="Hello",       turn_complete=None
Event 2: partial=True,  text=" world",      turn_complete=None
Event 3: partial=False, text="Hello world", turn_complete=None
Event 4: partial=None,  content=None,       turn_complete=True
```

`partial=False` 条件在每回合中可能出现多次（例如，每句话一次），而 `turn_complete=True` 则在最后一个部分之后以其自己的事件形式到达一次。

`turn_complete` 和 `interrupted` 告诉你的用户界面进入何种状态：

| turn_complete | interrupted | 你的应用应该 |
|---|---|---|
| True | False | 启用输入，显示“准备就绪” |
| False | True | 停止播放，清除部分内容 |
| True | True | 回合结束；与正常完成相同 |
| False | False | 继续显示流式文本 |

```python
async for event in runner.run_live(...):
    if event.interrupted:
        stop_audio_playback()   # user barged in; drop queued audio
        clear_streaming_text()
    if event.turn_complete:
        enable_microphone()     # ready for the next turn
```

如果不处理 `interrupted`，已经缓冲的音频会继续播放给用户。

### 交互状态 {#interaction-status}

一些模型在每次请求中会发送 `turn_complete` 多次。对于这些模型，`event.interaction_status`（通过 `/run_live` 的 `interactionStatus`）是 `IN_PROGRESS`，直到模型完成，然后 `IDLE`。对于其他模型，则为 `None`，所以退回到 `turn_complete`：

```python
from google.genai import types

async for event in runner.run_live(...):
    if event.turn_complete and event.interaction_status in (
        None,
        types.InteractionStatus.IDLE,
    ):
        enable_microphone()     # the model has finished the request
```

{{% alert context="info" %}}
**需要 ADK Python 2.8 或更高版本**

`interaction_status` 字段已在 adk-python 2.8 中添加。
{{% /alert %}}

## 错误处理 {#handling-errors}

错误会在 `event.error_code` 和 `event.error_message` 上出现。唯一需要做出的决定是模型的响应是否可以继续：`break` 当模型已停止时，`continue` 当故障是暂时性时。

```python
try:
    async for event in runner.run_live(...):
        if event.error_code:
            logger.error("Model error: %s - %s", event.error_code, event.error_message)
            if event.error_code in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "MAX_TOKENS"):
                break       # Model terminated; no more events this turn.
            continue        # Transient; the stream may recover.
        # ... 处理内容 ...
finally:
    live_request_queue.close()  # Runs whether you break or finish.
```

| 错误代码 | 类别 | 操作 |
|---|---|---|
| `SAFETY`, `PROHIBITED_CONTENT`, `BLOCKLIST` | 内容策略 | `break` — 模型终止了响应 |
| `MAX_TOKENS` | 限制 | `break` — 模型完成生成 |
| `UNAVAILABLE`, `DEADLINE_EXCEEDED` | 临时错误 | `continue` — 网络或超时，可能会自行解决 |
| `RESOURCE_EXHAUSTED` | 速率限制 | `continue`，使用指数退避 |
| `CANCELLED` | 客户端 | `break` — 清理 |
| `UNKNOWN` | 系统 | `continue`，带日志记录 |

对于持续时间在一秒以内的临时错误，不要通知用户。对于 `RESOURCE_EXHAUSTED`，进行退避并限制重试次数，以避免无限循环。错误代码来自 Gemini API；请参阅 [FinishReason](https://ai.google.dev/api/python/google/ai/generativelanguage/Candidate/FinishReason) 和 [Agent Platform reference](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference)。

## 向客户端发送事件 {#sending-events-to-a-client}

要将事件流式发送到浏览器或移动客户端，请将其序列化并通过传输发送。`Event` 是一个 Pydantic 模型，因此 `model_dump_json()` 会完成工作；Base64 编码的音频会使 JSON 膨胀约 33%，因此请将音频作为二进制帧发送。序列化模式以及匹配的客户端处理都在 [Custom server](/docs/adk/components/live-and-voice-agents/production/build-a-custom-server/#serializing-events) 中。

---

原文：[Events for live agents](https://adk.dev/live/events/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/events.md)
