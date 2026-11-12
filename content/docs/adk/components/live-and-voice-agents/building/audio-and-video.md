---
title: "音频和视频"
description: "音频和视频使现场 Agent 感觉像是实时的，并且它们是具体格式重要的地方。Live API 对音频期望特定的 PCM 采样率，而图像和视频帧采用不同的发送方法。"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v0.1.0。

音频和视频使实时 Agent 感觉更为“活生生”，而这些内容的具体格式非常重要。Live API 对音频的 PCM 采样率有特定要求，图像和视频帧的发送方法也不同于文本。

**ADK 不会为您转换媒体。** 获取正确的采样率、编码和 MIME 类型是您的责任，如果格式错误，可能会产生静音、噪声或连接错误，而不是有用的消息。以下内容就是该约定。

对于支持这些模态的模型，请参见 [Supported models](/docs/adk/components/live-and-voice-agents/supported-models/)。有关语音、转录和交互检测，请参见 [Configuration](/docs/adk/components/live-and-voice-agents/building/configuration/)。对于已经实现了所有这些功能的客户端，请在 `adk web` 中运行您的 Agent；如果要自己编写，请参见 [Build a custom server](/docs/adk/components/live-and-voice-agents/production/build-a-custom-server/#connect-a-client)。

## 音频输入 {#audio-input}

通过 [`send_realtime()`](/docs/adk/components/live-and-voice-agents/building/sessions/#liverequestqueue) 以原始字节发送麦克风音频。这些字节必须已经是 Live API 所期望的格式——ADK 会直接传递它们：

| 属性 | 值 |
|----------|-------|
| 编码 | 16 位 PCM，带符号，小端 |
| 采样率 | 16,000 Hz (16 kHz) |
| 通道 | 单声道 |
| MIME 类型 | `audio/pcm;rate=16000` |

```python
from google.genai import types

live_request_queue.send_realtime(
    types.Blob(mime_type="audio/pcm;rate=16000", data=audio_data)
)
```

以小块音频流进行低延迟传输。`LiveRequestQueue` 会立即转发每个音频块而不进行合并，因此你发送的块大小就是模型接收的粒度：

- **超低延迟**（实时对话）：每块 10-20 毫秒。
- **平衡**（推荐）：每块 50-100 毫秒。在 16 kHz 下，100 毫秒是 `16000 × 0.1 × 2 = 3200` 字节。
- **降低开销**：每块 100-200 毫秒。

在会话中使用一致的块大小，并且在发送下一块之前不要等待模型响应——模型连续处理音频，而不是逐轮处理。如果启用 [语音活动检测](/docs/adk/components/live-and-voice-agents/building/configuration/#voice-activity-detection-vad)（默认），则连续流式传输并让 API 检测语音；仅在禁用 VAD 时发送 [活动信号](/docs/adk/components/live-and-voice-agents/building/sessions/#liverequestqueue)。

## 音频输出 {#audio-output}

使用 `response_modalities=["AUDIO"]`（实时默认），模型将音频作为 `inline_data` 部分通过事件流返回：

| 属性 | 值 |
|----------|-------|
| 编码 | 16 位 PCM，有符号，小端 |
| 采样率 | 24,000 Hz（24 kHz）——注意这与 16 kHz 输入率不同 |
| 通道 | 单声道 |
| MIME 类型 | `audio/pcm;rate=24000` |

```python
async for event in runner.run_live(...):
    if event.content and event.content.parts:
        for part in event.content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("audio/pcm"):
                await play_audio(part.inline_data.data)  # raw 24 kHz PCM bytes
```

字节到达时已准备好播放；你这边无需进行解码。Live API 会通过网络以 base64 传输音频，但 `google.genai` 会为你解码，因此 `part.inline_data.data` 已经是 `bytes`。关于哪些事件携带音频以及它们如何与转录交错，请参见 [Events](/docs/adk/components/live-and-voice-agents/building/events/#audio)。如需将音频持久化到 artifact 服务，请设置 [`save_live_blob=True`](/docs/adk/components/live-and-voice-agents/building/configuration/#save_live_blob)。

## 图像和视频 {#images-and-video}

图像和视频通过与你发送音频相同的方法 [`send_realtime()`](/docs/adk/components/live-and-voice-agents/building/sessions/#liverequestqueue)，以单独的 JPEG 帧发送。没有视频编码器：视频流就是一系列静态帧，每帧单独作为一个数据块发送。

| 属性 | 值 |
|------|----|
| 格式 | JPEG (`image/jpeg`) |
| 帧率 | ~每秒 1 帧（推荐最大值） |
| 分辨率 | 768×768 像素（推荐） |

```python
from google.genai import types

live_request_queue.send_realtime(
    types.Blob(mime_type="image/jpeg", data=jpeg_bytes)
)
```

在大约 1 FPS 的情况下，模型可以看到用户正在用摄像机指向或讨论的内容，但无法识别任何依赖于动作的内容。动作识别、体育分析和运动跟踪需要这种方法无法提供的时间分辨率。

在 [购物助手演示](https://youtu.be/LwHPYyw7u6U?si=lG9gl9aSIuu-F4ME&t=40) 中，应用程序会发送用户上传的图像以及 `send_realtime()`；Agent 识别上下文并在电子商务目录中搜索匹配的商品。

<div class="video-grid">
  <div class="video-item">
    <div class="video-container">
<iframe width="560" height="315" src="https://www.youtube.com/embed/LwHPYyw7u6U?si=lG9gl9aSIuu-F4ME&amp;start=40" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
  </div>
</div>

要将实时视频流输入工具，以便 Agent 可以对到达的帧进行反应，请参见 [流式工具](/docs/adk/components/live-and-voice-agents/building/tools/#streaming-tools)。

---

原文：[Audio and video for live agents](https://adk.dev/live/audio-video/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/audio-video.md)
