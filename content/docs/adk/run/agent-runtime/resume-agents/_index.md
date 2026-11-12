---
title: "恢复 Agent"
description: "ADK Agent 的执行可能会受到各种因素的中断，包括网络连接中断、断电或所需的外部系统离线。ADK 的恢复功能允许 Agent 工作流程继续执行"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v1.16.0。

ADK Agent 的执行可能会因各种因素中断，包括网络连接中断、电源故障或所需的外部系统下线。ADK 的恢复功能允许 Agent 工作流从中断处继续执行，避免重新启动整个工作流。在 ADK Python 1.16 及更高版本中，您可以配置 ADK 工作流为可恢复的，从而跟踪工作流的执行，并在意外中断后允许您恢复执行。

本指南说明了如何将 ADK Agent 工作流配置为可恢复。如果您使用自定义 Agent，可以将其更新为可恢复。更多信息，请参见[向自定义 Agent 添加恢复](#custom-agents)。

## 添加可恢复配置 {#add-resumable-configuration}

通过将可恢复性配置应用到 ADK 工作流的 App 对象，为 Agent 工作流启用恢复功能，如以下代码示例所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
app = App(
    name='my_resumable_agent',
    root_agent=root_agent,
    # 将可恢复性配置设置为启用可恢复性。
    resumability_config=ResumabilityConfig(
        is_resumable=True,
    ),
)
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="warning" %}}
**注意：长时间运行的功能、确认、身份验证**

对于使用
[长时间运行的功能](/docs/adk/components/custom-tools/function-tools/overview/#long-run-tool)、
[确认](/docs/adk/components/custom-tools/function-tools/action-confirmations/) 或
[身份验证](/docs/adk/components/custom-tools/authentication/)
需要用户输入的 Agent，添加可恢复确认会改变这些功能的操作方式。有关更多信息，请参阅这些功能的文档。
{{% /alert %}}
{{% alert context="info" %}}
**注意：自定义 Agent**

自定义 Agent 默认不支持恢复。必须更新自定义 Agent 代码以支持恢复功能。有关修改自定义 Agent 以支持增量恢复功能的信息，请参阅
[向自定义 Agent 添加恢复](#custom-agents)。
{{% /alert %}}
## 恢复已停止的工作流 {#resume-a-stopped-workflow}

当 ADK 工作流停止执行时，可以使用包含工作流实例调用 ID 的命令恢复工作流，该 ID 可以在工作流的
[事件](/docs/adk/components/agent-context/events/#understanding-and-using-events)
历史记录中找到。确保 ADK API 服务器正在运行，以防它被中断或关闭电源，然后运行以下命令以恢复工作流，如以下 API 请求示例所示。

```console
# restart the API server if needed:
adk api_server my_resumable_agent/

# resume the agent:
curl -X POST http://localhost:8000/run_sse \
 -H "Content-Type: application/json" \
 -d '{
   "app_name": "my_resumable_agent",
   "user_id": "u_123",
   "session_id": "s_abc",
   "invocation_id": "invocation-123"
 }'
```

您还可以使用 Runner 对象的 Run Async 方法恢复工作流，如下所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
async for event in runner.run_async(user_id='u_123', session_id='s_abc',
    invocation_id='invocation-123'):
  print(event)

# 当 new_message 被设置为一个函数响应时，
# 我们正在尝试恢复一个长时间运行的函数。
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**注意**

目前不支持从 ADK Web 用户界面或使用 ADK 命令行（CLI）工具恢复工作流。
{{% /alert %}}
## 工作原理 {#how-it-works}

Resume（恢复）功能通过记录已完成的 Agent 工作流任务来工作，包括使用 [Events](/docs/adk/components/agent-context/events/) 和 [Event Actions](/docs/adk/components/agent-context/events/#detecting-actions-and-side-effects) 的增量步骤，跟踪可恢复工作流中 Agent 任务的完成情况。如果工作流被中断然后再次启动，系统将通过设置每个 Agent 的完成状态来恢复工作流。如果 Agent 未完成，工作流系统会恢复该 Agent 已完成的事件，并从部分完成的状态重新启动工作流。对于多 Agent 工作流，具体的恢复行为会根据工作流中的多 Agent 类别有所不同，具体描述如下：

- **顺序 Agent**：从其保存的状态中读取 current_sub_agent 以找到序列中下一个要运行的子 Agent。
- **循环 Agent**：使用 current_sub_agent 和 times_looped 值从上次完成的迭代和子 Agent 继续循环。
- **并行 Agent**：确定哪些子 Agent 已经完成，只运行尚未完成的子 Agent。

事件日志包括从成功返回结果的工具中记录的结果。因此，如果 Agent 成功执行了 Function 工具 A 和 B，然后在执行工具 C 时失败，系统会恢复工具 A 和 B 的结果，并通过重新运行工具 C 请求来恢复工作流。

{{% alert context="warning" %}}
**注意：工具执行行为**

恢复工作流时，Resume 功能确保 Agent 中的工具至少运行一次，并且在恢复工作流时可能会运行多次。如果您的 Agent 使用的工具重复运行会产生负面影响，例如购买操作，您应修改工具以检查并防止重复运行。
{{% /alert %}}
{{% alert context="info" %}}
**注意：不支持带 Resume 的工作流修改**

请勿在恢复之前修改已停止的 Agent 工作流。例如，不支持在停止的工作流中添加或移除 Agent 后再恢复该工作流。
{{% /alert %}}
## 为自定义 Agent 添加恢复功能 {#custom-agents}

自定义 Agent 需要特定的实现要求以支持可恢复性。您必须决定并定义自定义 Agent 中的工作流步骤，这些步骤产生的结果可以在交给下一个处理步骤之前保存。以下步骤概述了如何修改自定义 Agent 以支持工作流恢复。
- **创建 CustomAgentState 类**：扩展 BaseAgentState 来创建一个保存你的 Agent 状态的对象。
- **可选：创建 WorkFlowStep 类**：如果你的自定义 Agent 有顺序步骤，考虑创建一个 WorkFlowStep 列表对象，用于定义 Agent 的离散、可保存的步骤。
- **添加初始 Agent 状态**：修改 Agent 的异步运行函数以设置 Agent 的初始状态。
- **添加 Agent 状态检查点**：修改 Agent 的异步运行函数，以在 Agent 完成每个步骤后生成并保存 Agent 状态。
- **添加 Agent 状态结束以跟踪 Agent 状态**：修改 Agent 的异步运行函数，以在 Agent 成功完成整个任务时包含 `end_of_agent=True` 状态。

下面的示例展示了对示例 StoryFlowAgent 类所需的代码修改，见 [Custom Agents](/docs/adk/build/multi-agent-workflows/template-workflows/custom-template-workflows/#storyflow-agent-code-listing) 指南]：

```python
class WorkflowStep(int, Enum):
 INITIAL_STORY_GENERATION = 1
 CRITIC_REVISER_LOOP = 2
 POST_PROCESSING = 3
 CONDITIONAL_REGENERATION = 4

# 扩展 BaseAgentState

class StoryFlowAgentState(BaseAgentState):
  step: WorkflowStep

# 在 StoryFlowAgent 类中，用以下内容替换现有的 run 实现：

@override
async def _run_async_impl(
    self, ctx: InvocationContext
) -> AsyncGenerator[Event, None]:
    """
    Implements the custom orchestration logic for the story workflow.
    Uses the instance attributes assigned by Pydantic (e.g., self.story_generator).
    """
    agent_state = self._load_agent_state(ctx, StoryFlowAgentState)

    if agent_state is None:
      # 记录 Agent 的启动
      agent_state = StoryFlowAgentState(step=WorkflowStep.INITIAL_STORY_GENERATION)
      ctx.set_agent_state(self.name, agent_state=agent_state)
      yield self._create_agent_state_event(ctx)

    next_step = agent_state.step
    logger.info(f"[{self.name}] Starting story generation workflow.")

    # 步骤 1. 初始故事生成
    if next_step <= WorkflowStep.INITIAL_STORY_GENERATION:
      logger.info(f"[{self.name}] Running StoryGenerator...")
      async for event in self.story_generator.run_async(ctx):
          yield event

      # 在继续之前检查故事是否已生成
      if "current_story" not in ctx.session.state or not ctx.session.state[
          "current_story"
      ]:
          return  # Stop processing if initial story failed

    agent_state = StoryFlowAgentState(step=WorkflowStep.CRITIC_REVISER_LOOP)
    ctx.set_agent_state(self.name, agent_state=agent_state)
    yield self._create_agent_state_event(ctx)

    # 步骤 2. 评论-修订循环
    if next_step <= WorkflowStep.CRITIC_REVISER_LOOP:
      logger.info(f"[{self.name}] Running CriticReviserLoop...")
      async for event in self.loop_agent.run_async(ctx):
          logger.info(
              f"[{self.name}] Event from CriticReviserLoop: "
              f"{event.model_dump_json(indent=2, exclude_none=True)}"
          )
          yield event

    agent_state = StoryFlowAgentState(step=WorkflowStep.POST_PROCESSING)
    ctx.set_agent_state(self.name, agent_state=agent_state)
    yield self._create_agent_state_event(ctx)

    # 步骤 3. 顺序后处理（语法和语气检查）
    if next_step <= WorkflowStep.POST_PROCESSING:
      logger.info(f"[{self.name}] Running PostProcessing...")
      async for event in self.sequential_agent.run_async(ctx):
          logger.info(
              f"[{self.name}] Event from PostProcessing: "
              f"{event.model_dump_json(indent=2, exclude_none=True)}"
          )
          yield event

    agent_state = StoryFlowAgentState(step=WorkflowStep.CONDITIONAL_REGENERATION)
    ctx.set_agent_state(self.name, agent_state=agent_state)
    yield self._create_agent_state_event(ctx)

    # 步骤 4. 基于语气的条件逻辑
    if next_step <= WorkflowStep.CONDITIONAL_REGENERATION:
      tone_check_result = ctx.session.state.get("tone_check_result")
      if tone_check_result == "negative":
          logger.info(f"[{self.name}] Tone is negative. Regenerating story...")
          async for event in self.story_generator.run_async(ctx):
              logger.info(
                  f"[{self.name}] Event from StoryGenerator (Regen): "
                  f"{event.model_dump_json(indent=2, exclude_none=True)}"
              )
              yield event
      else:
          logger.info(f"[{self.name}] Tone is not negative. Keeping current story.")

    logger.info(f"[{self.name}] Workflow finished.")
    ctx.set_agent_state(self.name, end_of_agent=True)
    yield self._create_agent_state_event(ctx)
```

---

原文：[Resume stopped agents](https://adk.dev/runtime/resume/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/resume.md)
