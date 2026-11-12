---
title: "语音到语音"
description: "在语音到语音的架构中，一个单一的多模态模型处理输入的音频，执行推理和工具调用，并通过持久的 Gemini Live API 连接直接生成语音音频，无需转换"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0。

在语音到语音的架构中，一个单一的多模态模型处理输入音频，执行推理和工具调用，并通过持久的 [Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api) 连接直接生成语音音频，而不在输入和输出之间将语音转换为文本。

有关与链式 STT-LLM-TTS 管道的比较，请参见 [选择语音架构](/docs/adk/components/live-and-voice-agents/architectures/choose-an-architecture/)。

## 配置语音到语音 Agent {#configure-a-speech-to-speech-agent}

将受支持的 [本地音频 Live 模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models) 传递给您的 Agent：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import os
from google.adk.agents import Agent

root_agent = Agent(
    name="voice_assistant",
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio"),
    instruction="You are a helpful voice assistant.",
    tools=[...],
)
```

{{% /tab %}}
{{< /tabs >}}
使用 `adk web` 运行 Agent，或将其传递给 [`Runner.run_live()`](/docs/adk/components/live-and-voice-agents/building/sessions/#the-run_live-loop)。

## 语音到语音的特定功能 {#capabilities-specific-to-speech-to-speech}

以下功能专门适用于本地音频模型：

- **实时视频和图像输入**：将实时摄像头或屏幕帧与音频一起传输，使 Agent 可以看到用户展示的内容。详见 [音频和视频](/docs/adk/components/live-and-voice-agents/building/audio-and-video/#images-and-video)。
- **情感对话和主动音频**：支持的本地音频模型可以根据用户的情感表达调整语音语调，并决定何时发言或保持沉默。详见 [主动性和情感对话](/docs/adk/components/live-and-voice-agents/building/configuration/#proactivity-and-affective-dialog)。
- **有状态的会话恢复和上下文压缩**：由于 Live API 在有状态的 WebSocket 会话中保持对话状态，ADK 支持在连接超时期间自动 [会话恢复](/docs/adk/components/live-and-voice-agents/building/sessions/#session-resumption) 以及对长期会话进行 [上下文窗口压缩](/docs/adk/components/live-and-voice-agents/building/sessions/#context-window-compression)。
- **会话级语音和 VAD 控制**：可以通过 [`RunConfig`](/docs/adk/components/live-and-voice-agents/building/configuration/) 或模型实例在会话级配置语音选择和自动语音活动检测（VAD）。

## 注意事项和限制 {#considerations-and-limitations}

- **固定模型选择**：语音到语音需要支持 Gemini Live API 的模型（[支持的模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models)）。如需在实时语音会话中使用标准 Gemini 文本模型或第三方 LLM，请使用 [级联架构](/docs/adk/components/live-and-voice-agents/architectures/cascade/)。
- **仅音频输出**：本地音频模型只输出音频，不在 `Runner.run_async()` 下运行。当需要获取对话文本时，请查看 [音频转录](/docs/adk/components/live-and-voice-agents/building/configuration/#audio-transcription)。
- **防护措施评估转录及音频**：由于模型直接生成音频而无中间文本阶段，[对话验证回调](/docs/adk/components/live-and-voice-agents/production/guardrails/#conversation-validation) 会屏蔽输入和输出的转录内容，而不是在合成前拦截文本。如果必须在生成音频前过滤或编辑文本，请使用 [Cascade](/docs/adk/components/live-and-voice-agents/architectures/cascade/#custom-speech-transforms)。

---

原文：[Speech-to-speech architecture](https://adk.dev/live/architectures/speech-to-speech/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/architectures/speech-to-speech.md)
