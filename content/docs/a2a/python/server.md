---
title: "Python 服务端"
description: "用 a2a-sdk 和 FastAPI 构建一个可发现、可流式返回的文本回显 Agent。"
icon: "dns"
weight: 91
toc: true
---

## 创建项目

示例要求 Python 3.10 或更高版本，并使用 `uv` 管理依赖：

```shell
uv init a2a-echo-agent
cd a2a-echo-agent
uv add "a2a-sdk[fastapi]==1.3.0" "uvicorn>=0.30" httpx
```

这里固定 `a2a-sdk` 版本，使示例与 v1.0.0 协议字段保持一致。升级 SDK 时要重新检查 Agent Card、枚举值和路由 API。

## 实现 Agent Executor

新建 `agent_executor.py`。业务逻辑只做确定性的文本回显，重点展示协议接线；接入真实 Agent 时，替换 `execute()` 中生成 `result` 的部分即可。

```python
from a2a.helpers import get_message_text, new_task_from_user_message, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater


class EchoAgentExecutor(AgentExecutor):
    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        task = context.current_task or new_task_from_user_message(context.message)
        await event_queue.enqueue_event(task)

        updater = TaskUpdater(
            event_queue=event_queue,
            task_id=task.id,
            context_id=task.context_id,
        )
        processing = updater.new_agent_message(
            [new_text_part("正在处理请求...", media_type="text/plain")]
        )
        await updater.start_work(processing)

        request_text = get_message_text(context.message) or "（空消息）"
        result = f"A2A 回显：{request_text}"
        await updater.add_artifact(
            parts=[new_text_part(result, media_type="text/plain")],
            name="reply",
            last_chunk=True,
        )
        await updater.complete()

    async def cancel(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        if context.current_task is None:
            return

        updater = TaskUpdater(
            event_queue=event_queue,
            task_id=context.current_task.id,
            context_id=context.current_task.context_id,
        )
        await updater.cancel()
```

`execute()` 的职责是把 Agent 工作转换成协议事件。示例先创建 Task，再发送 `WORKING` 状态、交付 Artifact，最后标记 `COMPLETED`。`DefaultRequestHandler` 会把这些事件转换为普通响应或 SSE 流。

`cancel()` 是抽象接口的一部分。这里的回显任务结束得很快，通常不会遇到取消；接入真实长任务时，应在其中停止后台工作并发布 `CANCELED` 状态。

## 定义 Agent Card 并启动 FastAPI

新建 `main.py`：

```python
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentInterface,
    AgentSkill,
)
from fastapi import FastAPI

from agent_executor import EchoAgentExecutor


BASE_URL = "http://127.0.0.1:9999"

skill = AgentSkill(
    id="text_echo",
    name="文本回显",
    description="接收一段文本，并以 Artifact 返回处理结果。",
    tags=["a2a", "demo", "echo"],
    examples=["你好，A2A"],
    input_modes=["text/plain"],
    output_modes=["text/plain"],
)

agent_card = AgentCard(
    name="A2A Echo Agent",
    description="用于演示 A2A 协议接线的文本回显 Agent。",
    version="0.1.0",
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
    capabilities=AgentCapabilities(streaming=True),
    supported_interfaces=[
        AgentInterface(
            protocol_binding="JSONRPC",
            url=BASE_URL,
            protocol_version="1.0",
        )
    ],
    skills=[skill],
)

request_handler = DefaultRequestHandler(
    agent_executor=EchoAgentExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=agent_card,
)

routes = [
    *create_agent_card_routes(agent_card),
    *create_jsonrpc_routes(request_handler, "/"),
]
app = FastAPI(title="A2A Echo Agent", routes=routes)
```

运行服务：

```shell
uv run uvicorn main:app --host 127.0.0.1 --port 9999
```

服务启动后提供两个关键端点：

- `GET /.well-known/agent-card.json`：公开 Agent Card。
- `POST /`：JSON-RPC 消息入口。

`BASE_URL` 必须与客户端实际访问的地址一致；部署到反向代理后，应替换为公开 HTTPS 地址。`InMemoryTaskStore` 只适合本地示例，进程重启后任务和 Artifact 会丢失。

{{< alert context="warning" text="FastAPI 路由工厂只负责 A2A 协议入口。生产环境还需要在反向代理或应用层加入 TLS、鉴权、请求限额、日志和持久化任务存储。" />}}
