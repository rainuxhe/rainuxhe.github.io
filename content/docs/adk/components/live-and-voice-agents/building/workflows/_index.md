---
title: "工作流"
description: "实时 Agent 像任何其他 ADKAgent 一样组合到相同的图形工作流中。节点和边的定义、路由以及状态在图形工作流中有所涵盖，而更广泛的多 Agent 情况则在工作流中涉及。在...之下会发生什么变化"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v2.0.0。

实时 Agent 与其他任何 ADK Agent 一样组成相同的图工作流。节点和边的定义、路由和状态在 [Graph workflows](/docs/adk/build/graph-workflows/) 中有所涵盖，更广泛的多 Agent 视图在 [Workflows](/docs/adk/build/multi-agent-workflows/) 中讲解。在实时连接下变化的是执行模型。

在 `run_live()` 下，一整个 Agent 管道在 *一个打开的连接和一个事件循环内* 运行，因此调用者听到的是单一的连续对话。当控制权从一个 Agent 移动到下一个 Agent 时，他们仍然持续对话，从未听到交接。

这也会影响你的代码。对于请求/响应 Agent，每次 Agent 转换都是你控制的新调用；而在这里，对整个工作流而言，只有一个循环和一个队列，无论跨越多少 Agent。

## 在图中运行 Agent {#run-agents-in-a-graph}

图 [`Workflow`](/docs/adk/build/graph-workflows/) 是在 ADK 2.0 中对实时 Agent 进行排序的方式。你将 Agent 定义为节点并用边连接它们，Runner 在单一实时会话中遍历该图：

```python
from google.adk.agents.llm_agent import Agent
from google.adk.workflow import START, Workflow

LIVE_MODEL = 'gemini-live-2.5-flash-native-audio'

greeter = Agent(
    model=LIVE_MODEL,
    name='greeter',
    mode='task',  # required for the node to use the live connection
    instruction='Greet the caller and confirm you are speaking with John Doe. '
    'Ask one question per turn. Complete your task once the name is confirmed.',
)

verifier = Agent(
    model=LIVE_MODEL,
    name='verifier',
    mode='task',
    instruction='Verify the caller by date of birth, then complete your task.',
)

root_agent = Workflow(
    name='intake',
    edges=[
        (START, greeter),
        (greeter, verifier),
    ],
)
```

将此与 `adk web` 一起使用并启动实时会话，或将其传递给 `Runner.run_live()`。Runner 检测到 `Workflow` 根，并通过实时连接驱动它；你在所有节点上只消耗一个事件流。请参阅可运行的 [`workflow` sample](https://github.com/google/adk-python/tree/main/contributing/samples/live/workflow)，了解带有类型化交接和实时评估集的三阶段语音输入流程。

**每个发言的 Agent 都需要 `mode='task'` 或 `mode='chat'`。** 作为工作流中的一个节点，若 `LlmAgent` 没有 `mode`，则回退到 `single_turn`，该节点在实时连接外运行，并完全忽略音频队列，因此呼叫者不会从它那里听到任何声音。请在每个发言节点上明确设置模式。

每个节点在该节点的整个持续时间内打开自己的 Live API 会话，工作流的 `LiveRequestQueue` 在节点间顺序共享。单个队列无法同时为两个实时节点提供数据，因此请保持实时节点在一条路径上，而不是分叉。

## 读取一个事件流 {#read-one-event-stream}

该流在节点转换间是连续的。使用一个循环和一个队列来消耗它，并读取 `event.author` 以确定哪位 Agent 正在发言。

```python
queue = LiveRequestQueue()

async for event in runner.run_live(
    user_id='user_123',
    session_id='session_456',
    live_request_queue=queue,
):
    if event.content and event.content.parts:
        for part in event.content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith('audio/'):
                await play_audio(part.inline_data.data)
            elif part.text:
                await display_text(f'[{event.author}] {part.text}')
```

不要为每个 Agent 打开新的 `run_live()` 循环或新的 `LiveRequestQueue`。一个循环和一个队列服务整个工作流程；用户输入会流向当前活动的节点。

## 会话中途移交 {#hand-off-mid-conversation}

协调 Agent 可以在会话中途使用 `transfer_to_agent` 将对话交给专家。移交发生在同一个 `run_live()` 循环内：ADK 关闭协调员的实时连接，为专家打开一个新的连接，用户继续对话。

```text
User: "I need help with billing"
Event: author="coordinator", function_call: transfer_to_agent(agent_name="billing")
Event: author="billing", text="I can help with your billing question..."
```

传输会为目标 Agent 启动一个新的实时 API 会话，因此协调器的会话恢复处理不会继承。要在协调器自己的团队中保持传输，请在子 Agent 上设置 `disallow_transfer_to_peers`；不允许的同级传输会引发 `ValueError`。

## 旧版工作流 Agent {#legacy-workflow-agents}

新代码使用图 `Workflow`。`SequentialAgent`、`LoopAgent` 和 `ParallelAgent` **已弃用，建议使用 `Workflow`**，并将在未来版本中移除。`LoopAgent` 和 `ParallelAgent` 在 `run_live()` 下会触发 `NotImplementedError`，并会导致实时会话崩溃，因此请确保在任何实时路径中都不要启用它们。

`SequentialAgent` 仍然可以在实时模式下运行。运行时，ADK 会向每个直接的 `LlmAgent` 子 Agent 添加一个 `task_completed` 工具，并附加一条指令，告诉模型在任务完成时调用它。调用 `task_completed` 会结束该子 Agent 的实时连接，并推进到序列中的下一个 Agent。

```python
# ADK 在实时运行时将此注入到每个 LlmAgent 子 Agent 中。
def task_completed():
    """Signals that the agent has completed the user's task."""
    return 'Task completion signaled.'
```

事件流看起来像任何实时工作流：每个 Agent 的一系列事件，然后是 `task_completed` 函数响应，接着下一个 Agent 开始：

```text
Event: author="researcher", function_call: task_completed()
Event: author="writer", text="Based on the research..."
```

`task_completed` 和 `transfer_to_agent` 因不同原因结束 Agent 的回合：

| 功能 | 模式 | 效果 |
|------|------|------|
| `task_completed` | 固定顺序 | 结束当前 Agent；下一位顺序中的 Agent 开始 |
| `transfer_to_agent` | 动态路由 | 关闭当前实时会话；为目标 Agent 打开新会话 |

---

原文：[Graph workflows for live agents](https://adk.dev/live/workflows/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/workflows.md)
