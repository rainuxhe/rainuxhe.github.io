---
title: "配置"
description: "`RunConfig` 是你塑造实时会话的地方：Agent 的声音如何，如何转录语音，何时决定回合结束，保留多少历史记录，以及运行时的限制。你将它传递给 `Runner.run_live()`"
icon: "article"
weight: 60
toc: true
---

支持版本：Python v0.1.0。

`RunConfig` 是你定义实时会话的地方：Agent 的声音如何、它如何转录语音、何时决定一个回合结束、它保留多少历史记录以及它运行时的限制。你将其传递给 [`Runner.run_live()`（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.runners.Runner.run_live)，并且它仅适用于该会话。使用同一个 Agent 的两个用户可以运行完全不同的配置。

`RunConfig` 不特定于实时；[运行时配置](/docs/adk/run/agent-runtime/runtime-config/) 文档记录了适用于 `run_async()` 的完整类及字段。以下是针对本地音频模型在 `run_live()` 下重要的子集。对于使用 [级联架构](/docs/adk/components/live-and-voice-agents/architectures/cascade/#configure-a-cascaded-agent) 的 Agent，请在语音提供器上配置语音和回合检测。

## RunConfig 参数快捷参考 {#runconfig-parameter-quick-reference}

此表提供了对实时 Agent 最重要的 `RunConfig` 参数的快速参考：|参数 |类型 |目的 |参考 |
|-----------|------|---------|-----------|
|**response_modalities** |列表[模态] |输出格式。活体 Agent 必须使用`AUDIO` — 活体模型不接受`TEXT` |[详情](#response-modes) |
|**streaming_mode** |流式模式 |`run_async()`路径上的分块或单次投递;`run_live()`无法读取 |[详情](#streamingmode-bidi-or-sse) |
|**session_resumption** |会话恢复配置 |启用自动重新连接 |[详情](/docs/adk/components/live-and-voice-agents/building/sessions/#session-resumption) |
|**context_window_compression** |上下文窗口压缩配置 |无限会话时长 |[详情](/docs/adk/components/live-and-voice-agents/building/sessions/#context-window-compression) |
|**history_config** |历史配置 |控制之前对话历史如何重放到实时服务器 |[详情](#history_config) |
|**max_llm_calls** |整数 |限制每会话总 LLM 调用次数 |[详情](#max_llm_calls) |
|**save_live_blob** |布尔 |持久化音频/视频流 |[详情](#save_live_blob) |
|**custom_metadata** |dict[str，任意] |将元数据附加到调用事件 |[详情](#custom_metadata) |
|**speech_config** |语音配置 |语音与语言配置 |[语音与语言](#voice-and-language) |
|**input_audio_transcription** |音频转录配置 |转录用户语音 |[音频转录](#audio-transcription) |
|**output_audio_transcription** |音频转录配置 |转录模型语音 |[音频转录](#audio-transcription) |
|**realtime_input_config** |实时输入配置 |VAD配置 |[语音活动检测](#voice-activity-detection-vad) |
|**explicit_vad_signal** |布尔 |从模型中发出语音活动事件 |[详情](#other-live-related-fields) |
|**主动性** |主动配置 |启用主动音频（型号特定） |[主动与情感对话](#proactivity-and-affective-dialog) |
|**enable_affective_dialog** |布尔 |情感适应（模型特定） |[主动与情感对话](#proactivity-and-affective-dialog) |
|**translation_config** |翻译配置 |实时语音转语音翻译（仅限翻译模型） |[详情](#other-live-related-fields) |
|**avatar_config** |化身配置 |将 Agent 渲染为动画化化身 |[详情](#other-live-related-fields) |

有关配置选项的更多细节，请参见 Python API 参考中的 [`RunConfig`（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.agents.RunConfig)。

**导入路径：**

上表中引用的所有配置类型类别均从以下`google.genai.types`导入：

```python
from google.genai import types
from google.adk.agents.run_config import RunConfig, StreamingMode

# 配置类型通过 types 模块访问
run_config = RunConfig(
    session_resumption=types.SessionResumptionConfig(),
    context_window_compression=types.ContextWindowCompressionConfig(...),
    speech_config=types.SpeechConfig(...),
    # 等等。
)
```

`RunConfig`类本身和`StreamingMode`枚举是从`google.adk.agents.run_config`导入的。

## 响应模式 {#response-modes}

`response_modalities`设置控制输出格式，会话恰好得到一个输出格式。**实时
Agent 值总是`["AUDIO"]`**，因为每个
[Live model](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) ADK 不支持其他模态。
当你未设置时，ADK 会帮你填补，所以大多数实际应用根本不会碰到。
字段。字段类型为`list[Modality]`，也接受所使用的普通字符串。
在这些例子中。

{{% alert context="warning" %}}
**从`response_modalities=["TEXT"]`迁徙**

早期的 ADK 采样和半级联模型支持纯文本实时会话。不行
更长的作品：`run_live()` with `["TEXT"]` 在当前 Live 模型中失败，且
只制作音频。

**要从真人 Agent 那里获取短信，请阅读
[`event.output_transcription`](#audio-transcription)**：转录已启用
ADK 默认情况下，删除`response_modalities`行通常是全部解决办法。

`["TEXT"]`在`run_async()`路径上依然正确，路径运行在标准双子座上
模型。参见[Bidi流媒体或SSE](#streamingmode-bidi-or-sse)。
{{% /alert %}}
响应模式只影响模型输出——**你随时可以发送文本、语音或视频
输入**（如果模型支持该输入模态），无论如何。

## Bidi-streaming 或 SSE { #streamingmode-bidi-or-sse } {#bidi-streaming-or-sse--streamingmode-bidi-or-sse}

ADK 可以通过两个不同的端点访问Gemini，**你调用的`Runner`方法是
选择哪一个**：

- **`runner.run_live()`**：ADK 将WebSocket打开到**Live API**（双向）
  通过`live.connect()`）流式端点）。这就是本指南其余内容的内容，以及
  它是实时音频和视频的必需条件
- **`runner.run_async()`**：ADK 使用HTTP到**标准Gemini API**（该
  通过 `generate_content_async()` 进行一元/流式端点）。Set
  `RunConfig.streaming_mode = StreamingMode.SSE`要逐块回传回去

这两套模型几乎没有重叠。像`gemini-flash-latest`这样的标准双子座模型确实有重叠
不保持双向连接，且模型在
[支持的型号](/docs/adk/components/live-and-voice-agents/supported-models/#live-models)设计用于`run_live()`驾驶，
所以选择模型是选择`Runner`方法的一部分。

{{% alert context="warning" %}}
**Python：`StreamingMode.BIDI` 不会将 ADK 切换到 Live API**在 **Python** 中，`RunConfig.streaming_mode` 只在`run_async()`代码路径上读取，
它在单个完整响应（`StreamingMode.NONE`，默认情况下）之间选择
以及分块传递（`StreamingMode.SSE`）。`run_live()`路径永远不会读取它，因此
设置`streaming_mode=StreamingMode.BIDI`无效，且无声失败。**呼叫
`run_live()`才是实现双向流式传输的关键。** ADK 自家的 Python，`StreamingMode`
docstring 也说明了这一点：BIDI“不用于标准执行路径”，且
双向行为“使用完全不同的代码路径，不依赖于
`streaming_mode`。”

**Java 不同。** ADK Java 的流程确实读取 `StreamingMode.BIDI`，Java 快速启动
在传递给`runLive()`的`RunConfig`上明确设置。遵循每个语言的
快速启动而不是直接移植设定。
{{% /alert %}}

```python
# 实时 API：不需要 streaming_mode，调用 run_live() 就会选择它
run_config = RunConfig(response_modalities=["AUDIO"])
async for event in runner.run_live(..., run_config=run_config):
    ...
```

此选项仅影响 ADK 与 Gemini 的通信方式。面向客户的架构是独立的：您可以在任一路径上构建 WebSocket 服务器、REST API 或 SSE 端点。

[运行时配置 ](/docs/adk/run/agent-runtime/runtime-config/#enable-streaming) 覆盖 `run_async()` 和 SSE 路径：`streaming_mode` 值、渐进式 SSE 流以及特定语言的配置。

## 杂项控制 {#miscellaneous-controls}

ADK 提供额外的 RunConfig 选项来控制会话行为、管理成本，以及为调试和合规目的保存音频数据。

```python
run_config = RunConfig(
    # 每次调用限制总的 LLM 调用次数
    max_llm_calls=500,  # Default: 500 (prevents runaway loops)
                        # 0 或负数 = 不限（谨慎使用）

    # 保存音频/视频文件用于调试/合规
    save_live_blob=True,  # Default: False

    # 为事件附加自定义元数据
    custom_metadata={"user_tier": "premium", "session_type": "support"},  # Default: None
)
```

### max_llm_calls {#maxllmcalls}

`max_llm_calls` 限制每个调用上下文中的 LLM 调用次数，并在 [Runtime configuration](/docs/adk/run/agent-runtime/runtime-config/#configure-runtime-limits-and-debugging) 中完整记录。

**它不适用于 `run_live()`。** 该参数仅保护 `run_async()` 路径，因此实时会话不会自动受到成本上限的限制。请自行预算：限制会话持续时间，计算回合次数，监控模型事件中的 `usage_metadata` ([Metadata](/docs/adk/components/live-and-voice-agents/building/events/#metadata))，并在循环前设置断路器。

### save_live_blob {#saveliveblob}

`save_live_blob=True` 将会话的音频持久化到 [session service](/docs/adk/components/agent-context/conversational-context/) 作为参考，及 [artifact service](/docs/adk/components/artifacts/) 作为文件。尽管名称如此，**今天仅持久化音频，不包括视频。**

启用它可用于调试语音行为，或在受监管环境中进行审计。否则请关闭：16 kHz PCM 输入每分钟每会话约 **1.92 MB**，写入两个服务，在语音工作负载下增长很快。如果在生产中需要使用，请仅对部分会话进行取样，而非全部，并在 artifact 服务上设置保留策略 — ADK 不会为你自动过期这些数据。

{{% alert context="warning" %}}
**`save_live_audio` 已弃用**

ADK 会自动将 `save_live_audio=True` 迁移到 `save_live_blob=True` 并发出警告，但 shim 将在未来版本中被移除。请更新至 `save_live_blob`。
{{% /alert %}}

### history_config {#historyconfig}

当 ADK 为已有对话历史的会话打开一个 **新的** Live API 连接时，它会将该历史重放给服务器。历史包括模型自己过去的回合，因此必须告知服务器不要重复回答。ADK 会为你处理此问题：在连接前，它会在有历史需要发送且无会话恢复句柄时设置 `live_connect_config.history_config.initial_history_in_client_content = True`。

```python
from google.genai import types

# ADK 会自动设置此项；只有在需要相反行为时才覆盖。
run_config = RunConfig(
    history_config=types.HistoryConfig(
        initial_history_in_client_content=True,
    ),
)
```

**这在实际操作中的意义：**

- **通常你不需要做任何事情。** 只有在你没有设置值时，ADK 才会填充该值，因此在 `RunConfig` 上显式设置的 `history_config` 总是优先。
- **重新连接时完全跳过历史记录。** 当 ADK 使用会话恢复句柄重新连接时，服务器已经持有该会话的状态，因此 ADK 不会发送历史记录，也不会修改 `history_config`。
- **出现问题的症状**：在播种历史记录时设置 `initial_history_in_client_content=False`，会使模型对*重放*的回合作出响应，从而在连接开始时产生大量重复答案。

### custom_metadata {#custommetadata}

`custom_metadata` 会将任意可 JSON 序列化的字典附加到调用中的每个 `Event` 上，并且在实时会话中表现与其他地方相同——参见[运行时配置](/docs/adk/run/agent-runtime/runtime-config/#configure-runtime-limits-and-debugging)。

```python
run_config = RunConfig(
    response_modalities=["AUDIO"],
    custom_metadata={"user_tier": "premium", "session_type": "support"},
)
```

实时特定的后果是作用范围：一次 `run_live()` 调用就是一次调用，因此元数据会在整个流会话的每个事件上打上标记，而不仅仅是单次交互。使用 `event.custom_metadata` 可以读取它。

{{% alert context="warning" %}}
**不要在 `custom_metadata` 中放置敏感数据**

携带此元数据的每个事件都会被持久化到会话服务中。请将个人身份信息(PII)、凭证和其他敏感值排除在外，如果无法避免，请进行加密。
{{% /alert %}}
### 其他与实时相关的字段 {#other-live-related-fields}

`RunConfig` 包含一些仅在 `run_live()` 路径上生效的字段。ADK 会直接将它们传递给实时连接，因此其具体行为由实时 API 定义，而不是由 ADK 定义：

| 字段 | 类型 | 功能 |
|-------|------|--------------|
| `explicit_vad_signal` | `bool` | 让模型发出明确的语音活动信号。ADK 会在 `event.voice_activity` 上展示它们，而不是从内容中推断交互边界 |
| `translation_config` | `types.TranslationConfig` | 启用实时语音到语音翻译。需要 `target_language_code` (BCP-47) 和 `echo_target_language`。**仅翻译模型支持**，如 `gemini-3.5-live-translate-preview` — 不是 [Supported models](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) 中的模型 |
| `avatar_config` | `types.AvatarConfig` | 将 Agent 呈现为动画头像。需 `avatar_name` (预构建头像) 或 `customized_avatar`，以及 `audio_bitrate_bps` / `video_bitrate_bps` |

```python
from google.genai import types

run_config = RunConfig(
    response_modalities=["AUDIO"],
    explicit_vad_signal=True,
)
```

还有一个字段不是针对实时特定的，但在实时会话中经常很有用：

- **`model_input_context`** (`list[types.Content]`)：仅在当前调用中注入到大型语言模型（LLM）请求的临时上下文。`Runner` 不会将其保存在会话中，这使得它成为提供每轮上下文（用户刚打开的文档、他们正在查看的页面）而不污染对话历史的干净方式。

### 组合函数调用（support_cfc） {#compositional-function-calling-supportcfc}

组合函数调用（CFC）是一个 `run_async()` / SSE 功能，而不是实时功能：理论上它仅适用于当前的实时模型，因为没有任何实时模型满足其模型要求。在 SSE 路径中保留 `support_cfc`，并在实时会话中使用标准函数调用（参见 [Tools](/docs/adk/components/live-and-voice-agents/building/tools/)）。至于参数本身，见 [运行时配置](/docs/adk/run/agent-runtime/runtime-config/)。

## 音频转录 {#audio-transcription}

Live API 会为你转录会话双方的语音，因此你可以显示字幕、记录对话，并在不需要单独语音转文本服务的情况下支持无障碍功能。**在 ADK 中，转录默认对输入（用户语音）和输出（模型语音）均开启**。将字段设置为 `None` 可关闭该方向的转录。

```python
from google.genai import types
from google.adk.agents.run_config import RunConfig

# 默认开启。这相当于将两者都设置为 AudioTranscriptionConfig()。
run_config = RunConfig(response_modalities=["AUDIO"])

# 关闭用户输入的转录，保留模型输出的转录。
run_config = RunConfig(
    response_modalities=["AUDIO"],
    input_audio_transcription=None,
)
```

转录以 `types.Transcription` 对象的形式出现在 `event.input_transcription` 和 `event.output_transcription` 上，与 `event.content` 分开。它们以片段的形式流入：`.text` 保存最新的片段，`.finished` 标记本轮的最后一个片段。将片段连接起来以构建完整的转录内容。

```python
async for event in runner.run_live(...):
    if event.input_transcription and event.input_transcription.text:
        update_caption(
            event.input_transcription.text,
            is_user=True,
            is_final=event.input_transcription.finished,
        )
    if event.output_transcription and event.output_transcription.text:
        update_caption(
            event.output_transcription.text,
            is_user=False,
            is_final=event.output_transcription.finished,
        )
```

对于事件结构，请参见 [Transcription events](/docs/adk/components/live-and-voice-agents/building/events/#transcription).

{{% alert context="info" %}}
**多 Agent 会话始终进行转录**

当根 Agent 具有 `sub_agents` 时，`run_live()` 即使你将输入和输出设置为 `None`，也会启用它们的转录。Agent 转移需要文本转录以将对话上下文传递给下一个 Agent，因此无法禁用 ([`runners.py`](https://github.com/google/adk-python/blob/main/src/google/adk/runners.py))。
{{% /alert %}}
## 语音和语言 {#voice-and-language}

设置 `speech_config` 来选择模型的语音和语言。你可以在两个地方设置：

- **在 Agent 上**，通过传递带有 `speech_config` 的 `Gemini` 实例。使用此方法可为多 Agent 工作流中的每个 Agent 分配其自己的语音。
- **在会话上**，通过设置 `RunConfig.speech_config`。使用此方法可以在整个会话中使用一个语音。

当两者都设置时，**以 Agent 级语音为准**。如果两者都未设置，Live API 会选择默认语音。

```python
from google.genai import types
from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini
from google.adk.agents.run_config import RunConfig

# Agent 级别语音（优先于 RunConfig）。
agent = Agent(
    model=Gemini(
        model="gemini-live-2.5-flash-native-audio",
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
            ),
            language_code="en-US",
        ),
    ),
    instruction="You are a helpful assistant.",
)

# 会话级默认语音，由没有自己语音的任何 Agent 使用。
run_config = RunConfig(
    response_modalities=["AUDIO"],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
        ),
    ),
)
```

`voice_name` 选择一个预建语音。[实时模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) 支持八种语音（Puck、Charon、Kore、Fenrir、Aoede、Leda、Orus、Zephyr）以及扩展的 [文本转语音语音列表](https://cloud.google.com/text-to-speech/docs/voices)。有关当前列表和每个后端的可用性，请参阅 [Gemini 实时 API 语音文档](https://ai.google.dev/gemini-api/docs/live-api/capabilities#change-voice-and-language)。不支持的语音在连接时会返回错误。

`language_code`（例如 `en-US`、`ja-JP`）设置语言和口音。实时模型通常会从对话中推断语言，可能会忽略该设置。

## 语音活动检测 (VAD) {#voice-activity-detection-vad}

VAD 检测用户开始和停止说话的时间，以便模型可以自然地轮流，包括处理打断。**在所有 [实时模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) 上默认开启**，大多数应用程序无需配置。

当您的应用程序自行决定轮次边界时，请禁用自动 VAD：例如按键说话、客户端 VAD 或任何用户界面中用户表示说话结束的情况。禁用后，您必须使用 [`send_activity_start()` / `send_activity_end()`](/docs/adk/components/live-and-voice-agents/building/sessions/#liverequestqueue) 发送手动 `ActivityStart`/`ActivityEnd` 信号，并且您的客户端必须将自己的轮次信号转换为服务器上的这些调用。

```python
from google.genai import types
from google.adk.agents.run_config import RunConfig

run_config = RunConfig(
    response_modalities=["AUDIO"],
    realtime_input_config=types.RealtimeInputConfig(
        automatic_activity_detection=types.AutomaticActivityDetection(disabled=True)
    ),
)
```

一个运行自己 VAD 的客户端将这些信号发送到你的服务器，服务器用 `send_activity_start()` / `send_activity_end()` 转发它们。请参阅 [连接客户端](/docs/adk/components/live-and-voice-agents/production/build-a-custom-server/#connect-a-client)。

## 主动性和情感对话 {#proactivity-and-affective-dialog}

一些实时模型提供两个对话功能，默认情况下都是关闭的：

- **主动音频**（`proactivity`）允许模型决定何时回应，主动提供建议，或忽略无关输入。
- **情感对话**（`enable_affective_dialog`）允许模型检测用户语气中的情绪并调整其回应。

```python
from google.genai import types
from google.adk.agents.run_config import RunConfig

run_config = RunConfig(
    response_modalities=["AUDIO"],
    proactivity=types.ProactivityConfig(proactive_audio=True),
    enable_affective_dialog=True,
)
```

这两种行为都是概率性的，会使响应变得不那么可预测，因此在正式或高精度环境下以及调试时应关闭它们。

这两个设置依赖于模型：Gemini 2.5 Flash Live 支持它们，但 Gemini 3.1 Flash Live 和 Gemini 3.8 Live 模型不支持。ADK 不会将这些设置发送给 Gemini 3.x Live 模型，因此保持设置无效。请参见 [每个模型的功能支持](/docs/adk/components/live-and-voice-agents/supported-models/#per-model-feature-support)。

---

原文：[Configuration for live agents](https://adk.dev/live/configuration/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/configuration.md)
