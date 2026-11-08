---
title: "Python 客户端"
description: "发现 Agent Card，发送消息，处理 Artifact、SSE 事件和多轮上下文。"
icon: "send"
weight: 40
toc: true
---

## 发现并调用 Agent

客户端先读取 Well-Known URI，再根据 Agent Card 让 SDK 选择协议绑定。不要在业务代码里硬编码 JSON-RPC 方法名。

新建 `client.py`：

```python
import asyncio

import httpx

from a2a.client import A2ACardResolver, ClientConfig, create_client
from a2a.helpers import get_artifact_text, new_text_message
from a2a.types import Role, SendMessageRequest


async def main() -> None:
    async with httpx.AsyncClient() as http_client:
        resolver = A2ACardResolver(
            httpx_client=http_client,
            base_url="http://127.0.0.1:9999",
        )
        agent_card = await resolver.get_agent_card()
        print(f"Agent: {agent_card.name}")

        client = await create_client(
            agent_card,
            ClientConfig(streaming=False, httpx_client=http_client),
        )
        try:
            message = new_text_message("你好，A2A", role=Role.ROLE_USER)
            request = SendMessageRequest(message=message)

            async for event in client.send_message(request):
                payload = event.WhichOneof("payload")
                if payload == "task":
                    task = event.task
                    print(f"Task: {task.id}")
                    print(f"Context: {task.context_id}")
                    print(f"State: {task.status.state}")
                    for artifact in task.artifacts:
                        print(f"Artifact {artifact.name}: {get_artifact_text(artifact)}")
                elif payload == "message":
                    print(event.message)
        finally:
            await client.close()


if __name__ == "__main__":
    asyncio.run(main())
```

运行：

```shell
uv run python client.py
```

非流式配置下，迭代器通常只产生一个最终 `Task` 或 `Message`。成功任务的 `status.state` 应为 `TASK_STATE_COMPLETED`，回显内容位于 Task 的 Artifact 中。

## 处理流式事件

服务端 Agent Card 已声明 `capabilities.streaming=True`，客户端把配置改为流式后，同一个 `send_message()` 会持续产生事件：

```python
client = await create_client(
    agent_card,
    ClientConfig(streaming=True, httpx_client=http_client),
)

async for event in client.send_message(request):
    payload = event.WhichOneof("payload")
    match payload:
        case "task":
            print("task", event.task.status.state)
        case "status_update":
            print("status", event.status_update.status.state)
        case "artifact_update":
            print("artifact", get_artifact_text(event.artifact_update.artifact))
        case "message":
            print("message", event.message)
```

示例服务通常依次产生 `task`、`status_update(WORKING)`、`artifact_update` 和 `status_update(COMPLETED)`。Task 到达终止状态或被中间状态打断后，流会关闭。

如果客户端暂时断开，可以在 Task 仍处于活动状态时调用 `SubscribeToTask` 重新订阅。是否补发断线期间的事件由服务端实现决定，因此业务状态仍应以 `GetTask` 的结果为准。

## 多轮交互与后续任务

`contextId` 表示同一个协作目标，`taskId` 表示其中一个具体工作单元。客户端必须区分两种后续行为：

- Task 处于 `INPUT_REQUIRED` 或 `AUTH_REQUIRED` 时，可以发送新消息继续同一个 Task，并带上原来的 `contextId` 和 `taskId`。
- Task 已进入终止状态时，必须用相同 `contextId` 创建新 Task，并通过 `referenceTaskIds` 引用旧 Task。

```python
follow_up = new_text_message(
    "请基于刚才的结果继续处理",
    context_id=task.context_id,
    role=Role.ROLE_USER,
)
follow_up.reference_task_ids.append(task.id)
request = SendMessageRequest(message=follow_up)
```

服务端负责判断引用是否足够明确。信息不足时，应进入 `INPUT_REQUIRED` 并要求客户端澄清，而不是猜测旧 Artifact。

## 错误处理

SDK 会处理协议绑定和传输层细节，但调用方仍应分别处理：

- HTTP 连接失败、超时和 SSE 中断。
- JSON-RPC 或绑定层定义的协议错误。
- Task 的 `FAILED`、`REJECTED` 和 `CANCELED` 终止状态。
- Agent Card 与预期能力不一致，例如不支持流式或所需输入模式。

生产客户端应设置总超时、限制重试次数，并在重试前确认操作是否具有幂等性。
