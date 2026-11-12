---
title: "支持的型号"
description: "实时 Agent 在 `run_live()` 下运行于两种语音架构之一："
icon: "article"
weight: 50
toc: true
---

支持版本：Python v0.1.0。

实时 Agent 运行在两种[语音架构](/docs/adk/components/live-and-voice-agents/architectures/choose-an-architecture/)之一，位于`run_live()`下：

- **[语音到语音](/docs/adk/components/live-and-voice-agents/architectures/speech-to-speech/)**：单个原生音频实时模型通过双向连接直接处理音频输入和音频输出。
- **[级联](/docs/adk/components/live-and-voice-agents/architectures/cascade/)**：按顺序链式连接语音转文本、任意文本 LLM 和文本转语音。

## 原生音频模型 { #live-models } {#native-audio-models--live-models}

原生音频模型端到端接收音频并输出音频，没有中间的文本转语音阶段。这让它们在单一双向连接上拥有自然的语调。

| 模型 | AI Studio | Agent 平台 |
|-------|-----------|----------------|
| Gemini 2.5 Flash Live | `gemini-2.5-flash-native-audio-preview-12-2025`（预览） | `gemini-live-2.5-flash-native-audio`（正式发布） |
| Gemini 3.1 Flash Live | `gemini-3.1-flash-live-preview`（预览） | 不可用 |
| Gemini 3.8 Live | `gemini-3.8-live`（正式发布） | `gemini-3.8-live`（正式发布） |
| Gemini 3.8 Live Extended Thinking | `gemini-3.8-live-extended-thinking`（正式发布） | 不可用 |

Gemini 2.5 Flash Live 在每个后端上是同一个模型，只是ID不同；功能都是一样的。ADK 的`LlmAgent.DEFAULT_LIVE_MODEL`是`gemini-live-2.5-flash-native-audio`，同时也是本节示例中使用的模型。

Gemini 3.1 Flash Live 仅在 AI Studio 上可用，并且不支持非阻塞工具。详情请参见[每个模型的功能支持](#per-model-feature-support)及[Gemini 3.1 Flash Live 模型页面](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview)。

Gemini 3.8 Live 在两个后端上都可运行。Gemini 3.8 Live Extended Thinking 添加了后台推理，仅在 AI Studio 上可用，并且需要对您的 Agent 进行更改，具体列在[每个模型的功能支持](#per-model-feature-support)中。要比较这两个模型，请参阅 AI Studio 的 Gemini 3.8 Live 模型页面](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)或 Agent 平台](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-live)，以及Gemini 3.8 Live Extended Thinking 模型页面](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking)。

这些模型仅生成**音频**并自动检测会话语言。它们不支持`TEXT`响应模式，因此如果需要文本与语音同时获取，请使用[音频转录](/docs/adk/components/live-and-voice-agents/building/configuration/#audio-transcription)。语音选择、转录和轮次检测在[配置](/docs/adk/components/live-and-voice-agents/building/configuration/)中有介绍。

### 每个模型的功能支持 {#per-model-feature-support}

根据所运行的模型，某些 ADK 设置表现会有所不同：|功能 |Gemini 2.5 闪电直播 |Gemini 3.1 闪电直播 |Gemini 3.8 直播 |Gemini 3.8 实时扩展思维 |
|---|---|---|---|---|
|[主动与情感对话](/docs/adk/components/live-and-voice-agents/building/configuration/#proactivity-and-affective-dialog) |通过`RunConfig`选择加入 |`RunConfig`设置被忽略 |`RunConfig`设置被忽略 |`RunConfig`设置被忽略 |
|[非阻塞工具](/docs/adk/components/live-and-voice-agents/building/tools/#non-blocking-tools) |支持|不支持|支持|所有工具都必须（见下文） |
|[工具的`response_scheduling`](/docs/adk/components/live-and-voice-agents/building/tools/#non-blocking-tools) |支持的 |不支持 |支持的 |不支持 |
|[模型响应结束](/docs/adk/components/live-and-voice-agents/building/events/#interaction-status) |`turn_complete` |`turn_complete` |`turn_complete` |`interaction_status` 是`IDLE`（见下文）|

从2.5升级到新型号时，要迭代`event.content.parts`
而不是读取`parts[0]`，因为单个服务器事件可以承载多个事件
部分内容。转弯覆盖还可以包括所有检测到的音频活动和视频
帧数，如果你连续流式视频，这会改变代币成本。参见
上游
[迁移笔记](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview#migrating-from-gemini-25-flash-live)。

每个模型的页面 [AI Studio](https://ai.google.dev/gemini-api/docs/models)
以及
[Agent 平台](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models)
文档涵盖模型层级行为，如支持的思维水平。在
ADK，你开始思考特工的
`generate_content_config.thinking_config`。

Gemini 3.8 实时扩展思维需要 ADK Python 2.10 及以上版本，并且需要两个
Agent 人变更：

- **非阻挡工具**：在每个`behavior = types.Behavior.NON_BLOCKING`上设置
  工具，并保持`response_scheduling`未被设置。参见
  [非阻塞工具](/docs/adk/components/live-and-voice-agents/building/tools/#non-blocking-tools)。
- **互动状态**：因为`turn_complete`每个人可以多次到达
  请求，阅读 `event.interaction_status`（`interactionStatus`完毕
  `/run_live`），在模型仍在工作时，这`IN_PROGRESS`
  请求并`IDLE`完成后。参见
  [交互状态](/docs/adk/components/live-and-voice-agents/building/events/#interaction-status)。

## 层叠模型 {#cascaded-models}

在[级联架构](/docs/adk/components/live-and-voice-agents/architectures/cascade/)中，推理阶段接受[Models for agents](/docs/adk/build/models-for-agents/).]中的任何文本模型。对于语音阶段，ADK 支持以下Gemini语音模型：

|舞台 |模型 |
|-------|-------|
|**语音转文字（`GeminiSTT`）**`gemini-3.5-transcribe-live` |
|**文本转语音（`GeminiTTS`）** |`gemini-3.8-flash-lite-tts`，`gemini-3.8-flash-tts` |

`CascadeLive`还内置了针对[ElevenLabs models](https://elevenlabs.io/docs/overview/models)（`ElevenLabsSTT`， `ElevenLabsTTS`）的适配器，并通过[custom transforms](/docs/adk/components/live-and-voice-agents/architectures/cascade/#custom-speech-transforms)支持任何其他语音提供商。

## 选择后端 {#choosing-a-backend}

Gemini 模型通过两个后端之一访问。ADK 与两者通信时使用相同的代码;
你用环境变量切换，可以先开发一个，部署另一个。| | AI Studio | Agent 平台 |
|---|---|---|
| **全名** | Google AI Studio | Gemini 企业 Agent 平台 |
| **适用场景** | 原型设计、开发 | 生产、企业 |
| **认证方式** | API 密钥 (`GOOGLE_API_KEY`) | 云凭证 (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`) |
| **设置** | 仅需 API 密钥 | 云项目设置 |
| **限制** | [会话时长与并发](#platform-limits-and-quotas) | [会话时长与并发](#platform-limits-and-quotas) |

通过环境变量 `GOOGLE_GENAI_USE_ENTERPRISE` 切换（`FALSE` 用于 AI Studio，`TRUE` 用于 Agent 平台）；无需修改代码。请参见 [快速入门](/docs/adk/components/live-and-voice-agents/get-started/python/) 进行设置。

{{% alert context="info" %}}
**Agent 平台：`global` 地区不支持实时 API 模型**

实时 API 模型在 `GOOGLE_CLOUD_LOCATION=global` 不可用。请使用区域端点，例如 `us-central1`、`us-east1` 或 `asia-northeast1`，并在部署前通过 [Agent 平台地点](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations) 核对端点位置。
{{% /alert %}}
## 平台限制与配额 {#platform-limits-and-quotas}

两个后端都限制连接和会话的最长运行时间以及同时运行的会话数量。由于这些数字会变化，因此应将上游文档视为权威，并在生产中依赖限额前进行验证。

| 限制 | AI Studio | Agent 平台 |
|---|---|---|
| 会话时长，仅音频 | 15 分钟 | 15 分钟 |
| 会话时长，音频+视频 | 2 分钟 | 2 分钟 |
| 连接生命周期 | ~10 分钟 | ~10 分钟 |
| 并发会话 | 见 [速率限制](https://ai.google.dev/gemini-api/docs/rate-limits) | 按需付费项目最多 1,000 个；预配置吞吐量无上限 |

Agent 平台另外默认将一个对话会话限制为 10 分钟，与上述音频仅会话限制分开。

启用 [上下文窗口压缩](/docs/adk/components/live-and-voice-agents/building/sessions/#context-window-compression) 可以让会话超出时长限制。在 Agent 平台上，从 [云控制台配额页面](https://console.cloud.google.com/iam-admin/quotas) 下 **“双向生成内容并发请求”** 请求增加并发会话。请根据 [AI Studio](https://ai.google.dev/gemini-api/docs/live-api/capabilities)、[Gemini API 速率限制](https://ai.google.dev/gemini-api/docs/rate-limits) 和 [Agent 平台](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api/start-manage-session) 文档核对当前数字。

## 如何处理模型名称 {#how-to-handle-model-names}

应从环境变量读取模型名称，而不是硬编码。同一模型在 AI Studio 和 Agent 平台上有不同的 ID，因此使用 `.env` 变量可以使一个代码库兼容两个后端，并保护你免受模型废弃影响。

**推荐模式：**

```python
import os
from google.adk.agents import Agent

# 使用环境变量，并在其不可用时回退到合理的默认值
agent = Agent(
    name="my_agent",
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio"),
    tools=[...],
    instruction="..."
)
```

**为什么使用环境变量：**

- **后端特定的ID**：相同的模型在AI Studio和 Agent Platform上名称不同，因此在它们之间切换时需要更改模型ID。使用环境变量可以避免在代码中硬编码
- **模型可用性变化**：模型会定期发布和弃用。一年前编写的实时 Agent 不应在代码中固定到已不存在的模型
- **环境特定配置**：在开发、预发布和生产环境中使用不同的模型

**在`.env`文件中的配置：**

```bash
# AI Studio
DEMO_AGENT_MODEL=gemini-2.5-flash-native-audio-preview-12-2025

# AI Studio or Agent Platform
# DEMO_AGENT_MODEL=gemini-3.8-live

# AI Studio, for multi-step reasoning and slow tools
# DEMO_AGENT_MODEL=gemini-3.8-live-extended-thinking

# Agent Platform
# DEMO_AGENT_MODEL=gemini-live-2.5-flash-native-audio
```

{{% alert context="info" %}}
**环境变量加载顺序**

在使用 `.env` 文件与 `python-dotenv` 时，必须在导入任何读取环境变量的模块之前调用 `load_dotenv()`。否则，`os.getenv()` 会返回 `None` 并回退到默认值，忽略你的 `.env` 配置。

**`main.py` 中的正确顺序：**

```python
from dotenv import load_dotenv
from pathlib import Path

# 在导入 Agent 之前加载 .env 文件
load_dotenv(Path(__file__).parent / ".env")

# 现在可以安全地导入使用环境变量的模块
from google_search_agent.agent import agent
```

**顺序不正确（将无法工作）：**

```python
from dotenv import load_dotenv
from google_search_agent.agent import agent  # Agent reads env var here

# 太晚了！Agent 已经使用默认模型初始化
load_dotenv(Path(__file__).parent / ".env")
```

这是 Python 的导入行为：当你导入一个模块时，其顶层代码会立即执行。如果你的 agent 模块在导入时调用 `os.getenv("DEMO_AGENT_MODEL")`，那么 `.env` 文件必须已经被加载。
{{% /alert %}}
**选择合适的模型:**

1. **选择后端**：原型开发选择 AI Studio，生产环境选择 Agent Platform。这会选择上表中的 ID 列，在 Agent Platform 上则缩小选择范围为 Gemini 2.5 Flash Live 和 Gemini 3.8 Live
2. **检查当前可用性**：参考上面的模型表格和官方文档
3. **配置环境变量**：在你的 `.env` 文件中设置模型名称，并在构建 agent 时从中读取

## 模型兼容性和可用性 {#model-compatibility-and-availability}

有关模型兼容性和可用性的最新信息：

- **AI Studio**：请参阅 [Gemini 模型文档](https://ai.google.dev/gemini-api/docs/models) 和 [Live API 功能指南](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- **Agent Platform**：请参阅 [Live API 概览](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api) 和 [Agent Platform 模型文档](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models)

在部署到生产环境之前，请始终在官方文档中验证模型的可用性和功能支持。

---

原文：[Supported models for live agents](https://adk.dev/live/models/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/models.md)
