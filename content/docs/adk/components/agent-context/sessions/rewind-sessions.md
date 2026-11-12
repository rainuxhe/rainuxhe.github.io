---
title: "重播会话"
description: "ADK 会话重播功能允许您将会话恢复到先前的请求状态，使您能够撤销错误、探索替代路径或从已知良好点重新启动流程。本文件提供了一个"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v1.17.0。

ADK 会话回溯功能允许您将会话恢复到先前的请求状态，从而使您能够撤销错误、探索替代路径，或从已知的良好点重新启动流程。本文档提供了该功能的概述、使用方法及其限制。

## 回溯会话 {#rewind-a-session}

当您回溯会话时，需要指定要撤销的用户请求或***调用***，系统会撤销该请求以及其后的请求。因此，如果您有三个请求（A、B、C），并希望返回请求 A 时的状态，则需要指定 B，这将撤销请求 B 和 C 的更改。您可以通过在***Runner***实例上使用 rewind 方法，并指定用户、会话和调用 ID 来回溯会话，如以下代码片段所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 创建 Runner
runner = InMemoryRunner(
    agent=agent.root_agent,
    app_name=APP_NAME,
)

# 创建会话
session = await runner.session_service.create_session(
    app_name=APP_NAME, user_id=USER_ID
)
# 使用封装函数“call_agent_async()”调用 Agent
await call_agent_async(
    runner, USER_ID, session.id, "set state color to red"
)
# ... 更多 Agent 调用 ...
events_list = await call_agent_async(
    runner, USER_ID, session.id, "update state color to blue"
)

# 获取调用 ID
rewind_invocation_id=events_list[1].invocation_id

# 回退调用（状态颜色：红色）
await runner.rewind_async(
    user_id=USER_ID,
    session_id=session.id,
    rewind_before_invocation_id=rewind_invocation_id,
)
```

{{% /tab %}}
{{< /tabs >}}
当您调用 ***rewind*** 方法时，所有由 ADK 管理的会话级资源将恢复到您指定的带有 ***invocation id*** 的请求前的状态。然而，全局资源，例如应用级或用户级状态和 Artifact，并不会被恢复。有关完整的 Agent 会话回退示例，请参见 [rewind_session](https://github.com/google/adk-python/tree/main/contributing/samples/context_management/rewind_session) 示例代码。有关 Rewind 功能的限制的更多信息，请参见 [Limitations](#limitations)。

## 工作原理 {#how-it-works}

Rewind 功能会创建一个特殊的 ***rewind*** 请求，将会话的状态和 Artifact 恢复到由调用 ID 指定的回退点之前的状态。这种方法意味着所有请求，包括被回退的请求，都会在日志中保留，以便后续调试、分析或审计。在回退之后，系统在为 AI 模型准备下一次请求时，会忽略被回退的请求。这种行为意味着 Agent 使用的 AI 模型实际上会忘记从回退点到下一次请求之间的任何交互。

## 限制 {#limitations}

在将 Rewind 功能与您的 Agent 工作流一起使用时，需要注意以下限制：

*   **全局 Agent 资源：** 应用级和用户级状态及 Artifact 不会被回退功能恢复。只有会话级状态和 Artifact 会被恢复。
*   **外部依赖：** Rewind 功能不管理外部依赖。如果 Agent 中的工具与外部系统交互，则您有责任将这些系统恢复到之前的状态。
*   **原子性：** 状态更新、Artifact 更新和事件持久化不是在单一原子事务中执行的。因此，您应避免在活动会话中进行回退，或在回退过程中并行操作会话 Artifact，以防止不一致情况。

---

原文：[Rewind sessions for agents](https://adk.dev/sessions/session/rewind/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/sessions/session/rewind.md)
