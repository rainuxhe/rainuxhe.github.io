---
title: "工具"
description: "工具在实时 Agent 中的工作方式与它们在 ADK 中的其他地方一样：你将函数传递给 Agent，模型会调用它们。你编写工具的方式在实时连接下不会改变，因此工具定义、ToolContext、c"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0。

工具在实时 Agent 中工作的方式与它们在 ADK 的其他地方的工作方式类似：你将函数传递给 Agent，模型调用它们。在实时连接下，你编写工具的方式不会改变，因此工具定义、ToolContext、回调和认证都遵循 [Custom Tools](/docs/adk/components/custom-tools/)。

实时连接在此基础上增加了两项功能。ADK 会在 `run_live()` 循环中为你执行工具调用，因此你无需编写原始实时 API 所需的函数调用逻辑。实时 Agent 还可以使用*流式工具*：这些函数持续运行并将中间结果推送回 Agent，使 Agent 可以响应股价变化或视频帧中出现的人，而无需用户再次询问。

## 自动工具执行 {#automatic-tool-execution}

在你的 Agent 上定义工具，ADK 会在 `run_live()` 循环中为你调用它们：它会检测模型的函数调用，运行工具（可并行执行，并支持你的前/后回调），格式化响应，并将调用及其响应作为事件输出。你只需编写函数，而无需编写调用逻辑。

```python
import os
from google.adk.agents import Agent
from google.adk.tools import google_search

agent = Agent(
    name="google_search_agent",
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio"),
    tools=[google_search],
    instruction="You are a helpful assistant that can search the web.",
)
```

你通过事件流观察工具活动；你从不直接操作它：

```python
async for event in runner.run_live(...):
    if event.get_function_calls():
        print(f"Model calling: {event.get_function_calls()[0].name}")
    if event.get_function_responses():
        print(f"Tool result: {event.get_function_responses()[0].response}")
```

## 保持 Agent 的响应性 {#keeping-the-agent-responsive}

在聊天窗口中，一个缓慢的工具是可以接受的，因为用户会看到转动的加载图标。而在实时语音对话中则不行：如果 Agent 调用了一个十秒的 API 后保持沉默，用户会以为通话断了。你需要一个在运行时不会阻塞对话的工具。ADK 提供了两种方法来实现这一点，同时也支持快速情境下的普通阻塞：

| 你的情况 | 使用 | 如何操作 |
|---|---|---|
| 工具在一秒内返回 | **阻塞**（默认） | 普通的 `return` 工具 |
| 长时间等待且没有内容可叙述 | **[非阻塞工具](#non-blocking-tools)** | 在工具上设置 `response_scheduling` 或 `behavior` |
| 长时间等待且值得叙述 | **[流式工具](#streaming-tools)** | 使用来自异步生成器的 `yield` 进度 |

## 非阻塞工具 {#non-blocking-tools}

有些等待没有值得叙述的内容：长时间的分析查询、批量导出、媒体生成任务。用户未请求的进度更新会无益地打断对话。保留你的普通 `return` 一次性工具，并设置 `response_scheduling` 将其移到后台：

```python
from google.adk.tools import FunctionTool
from google.genai import types

async def export_report(region: str) -> dict:
    """Generate and store the quarterly report. Returns when the export finishes."""
    await run_export(region)  # a long, plain return-once operation
    return {"status": "done", "region": region}

report_tool = FunctionTool(export_report)
report_tool.response_scheduling = types.FunctionResponseScheduling.WHEN_IDLE
```

Agent 在工具运行时保持空闲，可以回答用户提出的其他问题，并在结果准备好时将其整合。一个可运行示例随附为
[`non_blocking_tool_agent` sample](https://github.com/google/adk-python/tree/main/contributing/samples/live/non_blocking_tool_agent)。

{{% alert context="info" %}}
**需要 ADK Python 2.4 或更高版本**

`response_scheduling` 功能在 adk-python 2.4 中添加，并且支持按模型区分。请参阅
[支持的模型](/docs/adk/components/live-and-voice-agents/supported-models/#live-models)。
{{% /alert %}}
`response_scheduling` 还控制 *完成的结果何时送达用户*：

| 值 | 行为 | 使用场景 |
|-------|----------|------------|
| `WHEN_IDLE` | 等待自然停顿 | 报告和查询，通常选择 |
| `INTERRUPT` | 立即交付 | 警报、失败、“传输失败” |
| `SILENT` | 进入上下文，只在相关时宣布 | 模型稍后可能使用的背景信息 |

### 明确设置 `behavior` {#setting-behavior-explicitly}

您也可以通过 `behavior` 字段将工具标记为非阻塞。设置后，它优先于 `response_scheduling`：

```python
report_tool = FunctionTool(export_report)
report_tool.behavior = types.Behavior.NON_BLOCKING
```

{{% alert context="info" %}}
**需要 ADK Python 2.10 或更高版本**

`behavior` 字段在 adk-python 2.10 中添加。
{{% /alert %}}

## 流工具 {#streaming-tools}

流工具会持续运行，并将中间结果推送回 Agent，因此 Agent 可以叙述进度或对变化的输入（股票价格、进入视频帧的人）做出反应，而无需用户再次请求。使工具支持流只需一行更改：`async` 函数 `yield`，而不是 `return`。ADK 会自动将任何异步生成器工具视为非阻塞。

```python
import asyncio
from typing import AsyncGenerator

async def query_sales_database(region: str) -> AsyncGenerator[str, None]:
    """Run the quarterly sales report. Call this once; it streams its own updates."""
    yield "Connecting to the warehouse..."
    await asyncio.sleep(4)
    yield "Aggregating by product line..."
    await asyncio.sleep(4)
    yield f"Done. {summarise(region)}"
```

把它像对待其他工具一样传给 `tools=[...]`。模型会将每个 `yield` 当作实时更新处理，因此用户不会面对沉默，而是会听到“让我调出来……仍在汇总……好了：EMEA 做了 481 万美元，同比增长 12.4%。” 这适用于 RAG 流水线、多阶段汇总以及构建和测试运行，只要进度值得告知的地方。

添加 ADK 的保留 `stop_streaming` 工具（一个由 ADK 根据名称拦截的空函数），以便用户可以取消：“没关系，取消。”

### 视频流工具 {#video-streaming-tools}

添加一个 `input_stream: LiveRequestQueue` 参数，ADK 会将用户的实时输入传入该工具专用的队列，让它能够拉取视频帧并作出反应。

任何流工具的要求：

- 它必须是一个 `async` 函数，类型返回 `AsyncGenerator[T, None]`，其中 `T` 是你 `yield` 的类型。
- 对于视频，添加 `input_stream: LiveRequestQueue`；ADK 会填充它。

以下模式会将队列排空，只保留最新帧，丢弃过期帧，并且仅在答案变化时才产生输出，否则 Agent 保持沉默。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import asyncio
import os
from typing import AsyncGenerator

from google.adk.agents import LiveRequestQueue
from google.adk.agents.llm_agent import Agent
from google.adk.tools.function_tool import FunctionTool
from google.genai import Client
from google.genai import types as genai_types

PROMPT = "How many people are in this image? Reply with a number only."

async def monitor_video_stream(
    input_stream: LiveRequestQueue,
) -> AsyncGenerator[str, None]:
  """Report how many people are visible, whenever that number changes."""
  client = Client()
  last_count = None

  while True:
    # 清空队列，只保留最新的帧；较旧的帧已经过时。
    latest = None
    while input_stream._queue.qsize() != 0:
      req = await input_stream.get()
      if req.blob and req.blob.mime_type == "image/jpeg":
        latest = req

    if latest is not None:
      response = client.models.generate_content(
          model="gemini-flash-latest",
          contents=genai_types.Content(
              role="user",
              parts=[
                  genai_types.Part.from_bytes(
                      data=latest.blob.data, mime_type=latest.blob.mime_type
                  ),
                  genai_types.Part.from_text(text=PROMPT),
              ],
          ),
      )
      count = response.candidates[0].content.parts[0].text.strip()
      if count != last_count:
        last_count = count
        yield count

    await asyncio.sleep(0.5)

# ADK 按名称拦截它；内容保持为空。
def stop_streaming(function_name: str):
  """Stop a running streaming tool.

  Args:
    function_name: The name of the streaming function to stop.
  """

root_agent = Agent(
    # 流媒体工具在 run_live() 下运行，因此根 Agent 需要一个 Live 模型。
    # gemini-flash-latest 仅用于工具中的一次性调用。
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio"),
    name="video_monitoring_agent",
    instruction=(
        "You monitor the user's video stream. Call monitor_video_stream once when"
        " asked, then report each update it sends. Never call it again to poll."
    ),
    tools=[monitor_video_stream, FunctionTool(stop_streaming)],
)
```

{{% /tab %}}
{{< /tabs >}}
尝试让 Agent 监控视频流中有多少人，然后走入和走出画面。

## 工具执行环境 {#tool-execution-context}

支持版本：Python v2.0.0。

一个工具接收一个 `ToolContext`，以及一个回调 `CallbackContext`，用于状态、历史记录和 Artifact。这两者在任何 ADK Agent 中工作方式都相同——参见 [Agent context](/docs/adk/components/agent-context/) — 唯一重要的区别是：**底层的 `InvocationContext` 跨越整个 `run_live()` 循环**，在你调用 `run_live()` 时创建，并在每个 Agent 和每次交互中持续存在，直到会话结束。在请求/响应 Agent 中，一次调用就是一次交互；在实时会话中，它就是整个对话。

实时工具中最常出现的两个字段：

| 字段 | 提供内容 |
| :---- | :---- |
| `tool_context.run_config` | 会话的 [配置](/docs/adk/components/live-and-voice-agents/building/configuration/) — 响应模式、转录、限制 |
| `tool_context.state` | 会话状态；直接修改它，ADK 会保存更改 |

---

原文：[Tools for live agents](https://adk.dev/live/tools/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/tools.md)
