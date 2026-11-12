---
title: "构建自定义服务器"
description: "`adk web` 工具运行一个用于开发的实时 Agent。它附带一个浏览器客户端，可以捕捉麦克风和摄像头，播放模型音频，并生成转录内容，因此您可以无需编写代码就与 Agent 对话。"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0。

`adk web` 工具运行一个用于开发目的的实时 Agent。它附带一个浏览器客户端，可以捕捉麦克风和摄像头，播放模型音频，并渲染转录文本，这样您就可以与 Agent 进行对话，而无需自己编写任何代码。部署到生产环境意味着需要替换它：运行您自己的服务器，将客户端桥接到 `run_live()`，并在启动时初始化 Runner 和会话服务，以及为每个连接的用户分配一个 `LiveRequestQueue`。

以下是该桥接的完整 FastAPI 实现，以及客户端与其通信所需知道的信息。它假设您已经阅读了 [Sessions](/docs/adk/components/live-and-voice-agents/building/sessions/)，该文档涵盖了本示例所实现的生命周期。

## FastAPI 应用示例 {#fastapi-application-example}

此 FastAPI 应用实现了该桥接。它运行两个并发任务：一个上游任务，将 WebSocket 消息转发到 `LiveRequestQueue`，另一个下游任务，将 `run_live()` 事件转发回去。

```python
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.adk.runners import Runner
from google.adk.agents.run_config import RunConfig
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.sessions import InMemorySessionService
from google.genai import types
from google_search_agent.agent import agent

# 应用程序设置（启动时一次）
APP_NAME = "live-agent"

app = FastAPI()

# 定义您的会话服务
session_service = InMemorySessionService()

# 定义您的 Runner
runner = Runner(
    app_name=APP_NAME,
    agent=agent,
    session_service=session_service
)

@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str) -> None:
    await websocket.accept()

    # 每会话设置：RunConfig，会话，队列。
    response_modalities = ["AUDIO"]
    run_config = RunConfig(
        response_modalities=response_modalities,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig()
    )

    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        try:
            while True:
                # 从 WebSocket 接收短信
                data: str = await websocket.receive_text()

                # 发送到 LiveRequestQueue
                content = types.Content(parts=[types.Part(text=data)])
                live_request_queue.send_content(content)
        except WebSocketDisconnect:
            # 客户端断开连接 - 发送信号关闭队列
            pass

    async def downstream_task() -> None:
        """Receives Events from run_live() and sends to WebSocket."""
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config
        ):
            # 将事件作为 JSON 发送到 WebSocket
            await websocket.send_text(
                event.model_dump_json(exclude_none=True, by_alias=True)
            )

    # 同时运行两个任务
    try:
        await asyncio.gather(
            upstream_task(),
            downstream_task(),
            return_exceptions=True
        )
    finally:
        live_request_queue.close()  # Always close, even on error.
```

{{% alert context="info" %}}
**需要异步上下文**

所有 ADK 双向流应用程序**必须在异步上下文中运行**。此要求来自多个组件：

- **`run_live()`**：ADK 的流方法是异步生成器，没有同步包装器（不同于 `run()`）
- **会话操作**：`get_session()` 和 `create_session()` 是异步方法
- **WebSocket 操作**：FastAPI 的 `websocket.accept()`、`receive_text()` 和 `send_text()` 都是异步的
- **并发任务**：上游/下游模式需要 `asyncio.gather()` 以实现并发执行

所有代码示例都假设在异步上下文中（在 `async def` 或协程内）。它们展示核心逻辑，不包括样板包装函数。
{{% /alert %}}
## 为什么有两个任务 {#why-two-tasks}

桥接是两个循环同时运行，而这正是它实现双向的原因：

- **上游** 从 WebSocket 读取并推入 `LiveRequestQueue`，这样用户可以随时发送输入，包括在 Agent 输出中途时。
- **下游** 从 `run_live()` 读取事件并写入 WebSocket，流式传输响应、转录和工具活动。

如果顺序运行，你会失去中断能力：服务器在读取 Agent 输出时会被阻塞，而用户正尝试发送语音。`asyncio.gather()` 保证两个方向同时活跃。

`live_request_queue.close()` 必须在每条退出路径上运行，包括异常。未关闭的队列会导致 Live API 没有终止信号，并可能让会话卡在你的[并发会话配额 ](/docs/adk/components/live-and-voice-agents/building/sessions/#concurrent-sessions)中，直到超时，这也是 `try/finally` 的用途。

`gather(..., return_exceptions=True)` 会收集异常而不是抛出，因此如果你需要区分正常断开与故障，需要检查返回值。

### 生产考虑 {#production-considerations}

此示例展示了核心模式。对于生产应用程序，请考虑：- **错误处理（ADK）**：为 ADK 流事件添加适当的错误处理。有关错误事件处理的详细信息，请参阅[错误事件](/docs/adk/components/live-and-voice-agents/building/events/#handling-errors)。
    - 在关闭期间，通过捕获 `asyncio.CancelledError` 来优雅地处理任务取消
    - 使用 `return_exceptions=True` 检查 `asyncio.gather()` 的异常——异常不会自动传播
- **错误处理（Web）**：处理上游/下游任务中的 Web 应用特定错误。例如，对于 FastAPI，你需要：
    - 捕获 `WebSocketDisconnect`（客户端断开连接）、`ConnectionClosedError`（连接丢失）和 `RuntimeError`（发送到已关闭的连接）
    - 在发送前使用 `websocket.client_state` 验证 WebSocket 连接状态，以防连接关闭时发生错误
- **身份验证和授权**：为你的端点实现身份验证和授权
- **速率限制和配额**：添加速率限制和超时控制。有关并发会话和配额管理的指南，请参阅[并发会话](/docs/adk/components/live-and-voice-agents/building/sessions/#concurrent-sessions)。
- **结构化日志**：使用结构化日志进行调试。
- **持久会话服务**：考虑使用持久会话服务（`DatabaseSessionService` 或 `VertexAiSessionService`）。更多详细信息请参阅[ADK 会话服务文档](/docs/adk/components/agent-context/conversational-context/)。

## 连接客户端 {#connect-a-client}

你的服务器暴露了一个 WebSocket；必须有客户端与之通信。在开发期间，这是 `adk web`。在生产中，这是你编写的客户端：浏览器应用、移动应用，或者电话或 WebRTC 桥。无论你构建什么，都遵循相同的协议，因此了解 `adk web` 的具体功能以及其终止点非常重要。

如果你需要 WebRTC 或电话桥，ADK 提供了一个。
[LiveKit Runner（官方英文）](https://adk.dev/integrations/livekit/) 将实时 Agent 提供到 LiveKit 房间，处理媒体捕获、回放、插入和 SIP，因此无需编写自定义服务器。

**`adk web` 为你处理的内容:**

| 功能 | 内置客户端的操作 |
|---|---|
| 麦克风 | 捕获并重新采样为 16 kHz 单声道 PCM，作为 `audio/pcm;rate=16000` 流式传输 |
| 播放 | 播放模型音频为 24 kHz 单声道 PCM，无间隙 |
| 摄像头 | 以约 1 帧/秒发送 JPEG 帧，作为 `image/jpeg` |
| 转录 | 渲染用户和模型的转录，合并部分片段 |
| 插入 | 当事件到达且 `interrupted` 设置时，停止播放 |

**其不处理的内容**，生产客户端可能需要处理：- 不允许屏幕共享，也不允许在没有活动音频通话的情况下播放视频。
- 不允许选择模式；响应始终为 `AUDIO`。
- 没有用于主动性、情感对话、会话恢复、`save_live_blob` 或显式 VAD 信号的用户界面。这些由服务器通过 [`RunConfig`](/docs/adk/components/live-and-voice-agents/building/configuration/) 设置。
- 不支持手动 [VAD](/docs/adk/components/live-and-voice-agents/building/configuration/#voice-activity-detection-vad)；它依赖于服务器端默认开启的自动检测。

`adk web` 和 `adk api_server` 都服务于相同的 `/run_live` WebSocket；`adk api_server` 不会随附浏览器客户端，除非你通过 `--with_ui`。因此，你可以针对 `adk web` 开发，并将自定义客户端指向任意一个。

### 线协议和数据格式 {#wire-protocol-and-data-format}

`/run_live` 端点只处理 **JSON 文本帧**。你的客户端发送序列化的 [`LiveRequest`](/docs/adk/components/live-and-voice-agents/building/sessions/#liverequestqueue) 对象，并接收序列化的 [`Event`](/docs/adk/components/live-and-voice-agents/building/events/) 对象。二进制数据（音频和图像字节）在 JSON 内 base64 编码，而不是以二进制 WebSocket 帧发送。

在客户端，你可以像在 Python 中一样根据相同的事件字段处理，使用 camelCase：

```javascript
websocket.onmessage = (message) => {
    const adkEvent = JSON.parse(message.data);
    if (adkEvent.interrupted) {
        stopAudioPlayback();   // user barged in; drop queued audio
        finishCurrentBubble();
        return;
    }
    if (adkEvent.turnComplete) {
        finishCurrentBubble();
        return;
    }
    for (const part of adkEvent.content?.parts ?? []) {
        if (part.text) appendText(part.text);
        if (part.inlineData) enqueueAudio(part.inlineData.data);
    }
};
```

您的客户端必须生成和使用的媒体格式（采样率、编码、块大小）在 [Audio and video](/docs/adk/components/live-and-voice-agents/building/audio-and-video/) 中。它分支的流式标志（`partial`、`turnComplete`、`interrupted`）以及转录片段的方式在 [Events](/docs/adk/components/live-and-voice-agents/building/events/) 中。

## 序列化事件 {#serializing-events}

ADK 与 Live API 之间的 `/run_live` 端点仅支持 JSON 文本，但 *您的* 服务器与 *您的* 客户端之间的传输由您自己设计，在那里您可以将音频作为二进制帧发送以避免 base64 的开销。

`Event` 是 Pydantic 模型，因此 `model_dump_json()` 将其转换为用于 WebSocket 或 SSE 传输的 JSON 字符串。在客户端使用 `by_alias=True` 以驼峰式字段名，并使用 `exclude_none=True` 删除空字段：

```python
async for event in runner.run_live(...):
    await websocket.send_text(event.model_dump_json(exclude_none=True, by_alias=True))
```

`inline_data` 中的二进制音频在 JSON 中是以 base64 编码的，这会使负载增加约 33%。对于以音频为主的流，请将音频作为二进制帧发送，元数据作为 JSON 发送：

```python
async for event in runner.run_live(...):
    parts = event.content.parts if event.content else []
    audio_parts = [p for p in parts if p.inline_data]
    if audio_parts:
        for part in audio_parts:
            await websocket.send_bytes(part.inline_data.data)
        # 没有音频字节的元数据。
        await websocket.send_text(event.model_dump_json(
            exclude={"content": {"parts": {"__all__": {"inline_data"}}}},
            by_alias=True,
        ))
    else:
        await websocket.send_text(event.model_dump_json(exclude_none=True, by_alias=True))
```

---

原文：[Custom server for live agents](https://adk.dev/live/custom-server/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/custom-server.md)
