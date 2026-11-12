---
title: "事件循环"
description: "ADK 运行时是在用户交互期间为您的 Agent 应用提供支持的底层引擎。它是一个系统，将您定义的 Agent、工具和回调结合起来，并在响应用户操作时协调它们的执行"
icon: "article"
weight: 80
toc: true
---

支持版本：Python v0.1.0， Go v0.1.0。

ADK 运行时是驱动你 Agent 应用在用户交互中的底层引擎。它是接收你定义的 Agent、工具和回调，并根据用户输入协调其执行的系统，管理信息流、状态变化以及与外部服务（如大型语言模型或存储）的交互。

可以把运行时看作你 Agent 应用的**“引擎”**。你定义各个部分（Agent、工具），运行时负责它们如何连接和运行以满足用户的请求。

## 核心理念：事件循环 {#core-idea-the-event-loop}

ADK 运行时的核心是运行在一个**事件循环**上。这个循环促进了`Runner`组件与你定义的“执行逻辑”（包括你的 Agent、它们的调用、回调和工具）之间的来回通信。

![intro_components.png](/images/adk/event-loop.png)

简单来说：

1. `Runner`收到用户查询，并要求主`Agent`开始处理。
2. `Agent`（及其相关逻辑）运行直到有可报告内容（如响应、工具请求或状态变化）——然后它会**生成**或*发射**`Event`。
3. 该`Runner`接收该`Event`，处理相关操作（如通过`Services`保存状态变化），并将事件转发（例如，向用户界面发送）。
4. `Agent`的逻辑**会从暂停处**恢复**，仅在`Runner`处理完事件后*，然后可能看到跑者所犯更改的影响。
5. 此循环重复，直到 Agent 对当前用户查询没有更多事件可输出。

这种事件驱动的循环是 ADK 执行 Agent 代码的基本模式。

## 心跳：事件循环——内部运作 {#the-heartbeat-the-event-loop---inner-workings}

事件循环是定义`Runner`与自定义代码（Agent、工具、回调，设计文档中统称为“执行逻辑”或“逻辑组件”）交互的核心操作模式。它明确了职责划分：

{{% alert context="default" %}}
具体的方法名称和参数名称可能因SDK语言而略有差异（例如，Python 中的`agent.run_async(...)`，Go 中的`agent.Run(...)`，Java和TypeScript中的`agent.runAsync(...)`）。详情请参阅语言特定的 API 文档。
{{% /alert %}}
### 跑者的角色（编曲者） {#runners-role-orchestrator}

`Runner`作为单一用户调用的中央协调者。其在循环中的职责包括：1. **初始化：** 接收最终用户的查询 (`new_message`)，并通常通过 `SessionService` 将其附加到会话历史记录中。
2. **启动：** 通过调用主 Agent 的执行方法（例如 `agent_to_run.run_async(...)`）开始事件生成过程。
3. **接收与处理：** 等待 Agent 逻辑对 `yield` 或 `emit` 执行 `Event`。收到事件后，Runner **会立即处理** 它。这包括：
      * 使用配置好的 `Services`（`SessionService`、`ArtifactService`、`MemoryService`）提交 `event.actions` 中指示的更改（如 `state_delta`、`artifact_delta`）。
      * 执行其他内部账务记录。
4. **向上游传递：** 将处理后的事件转发到后续环节（例如调用的应用程序或 UI 用于渲染）。
5. **迭代：** 向 Agent 逻辑发出信号，表示已完成对已生成事件的处理，允许它恢复并生成*下一个*事件。

*概念性 Runner 循环：*

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# Runner 主循环逻辑的简化视图
async def run_async(new_query, ...) -> AsyncGenerator[Event, None]:
    # 1. 将 new_query 附加到会话事件历史中（通过 SessionService）
    await session_service.append_event(session, Event(author='user', content=new_query))

    # 2. 通过调用 Agent 启动事件循环
    agent_event_generator = agent_to_run.run_async(context)

    async for event in agent_event_generator:
        # 3. 处理生成的事件并提交更改
        await session_service.append_event(session, event) # Commits state/artifact deltas etc.
        # memory_service.update_memory(...) # 如适用
        # artifact_service 可能已经在 Agent 运行期间通过上下文被调用

        # 4. 为上游处理（例如 UI 渲染）生成事件
        yield event
        # Runner 在生成事件后隐式地发出 Agent 生成器可以继续的信号
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// Go 中 Runner 主循环逻辑的简化概念视图
func (r *Runner) RunConceptual(ctx context.Context, session *session.Session, newQuery *genai.Content) iter.Seq2[*Event, error] {
    return func(yield func(*Event, error) bool) {
        // 1. 将 new_query 附加到会话事件历史中（通过 SessionService）
        // ...
        userEvent := session.NewEvent(ctx, ctx.InvocationID()) // Simplified for conceptual view
        userEvent.Author = "user"
        userEvent.LLMResponse = model.LLMResponse{Content: newQuery}

        if _, err := r.sessionService.Append(ctx, &session.AppendRequest{Event: userEvent}); err != nil {
            yield(nil, err)
            return
        }

        // 2. 通过调用 agent 启动事件流
        // 假设 agent.Run 也返回 iter.Seq2[*Event, error]
        agentEventsAndErrs := r.agent.Run(ctx, &agent.RunRequest{Session: session, Input: newQuery})

        for event, err := range agentEventsAndErrs {
            if err != nil {
                if !yield(event, err) { // Yield event even if there's an error, then stop
                    return
                }
                return // Agent finished with an error
            }

            // 3. 处理生成的事件并提交更改
            // 仅将非部分事件提交到会话服务（如实际代码所示）
            if !event.LLMResponse.Partial {
                if _, err := r.sessionService.Append(ctx, &session.AppendRequest{Event: event}); err != nil {
                    yield(nil, err)
                    return
                }
            }
            // memory_service.update_memory(...) // 如果适用
            // artifact_service 可能已经在 Agent 运行期间通过上下文被调用

            // 4. 将事件交给上游处理
            if !yield(event, nil) {
                return // Upstream consumer stopped
            }
        }
        // Agent 成功完成
    }
}
```

{{% /tab %}}
{{< /tabs >}}
### 执行逻辑的角色（Agent、工具、回调） {#execution-logics-role-agent-tool-callback}

在 Agent、工具和回调中的代码负责实际的计算和决策。它与循环的交互包括：

1. **执行（Execute）：** 根据当前的 `InvocationContext` 运行其逻辑，包括执行恢复时的会话状态。
2. **让步（Yield）：** 当逻辑需要进行通信（发送消息、调用工具、报告状态变化）时，会构建一个包含相关内容和操作的 `Event`，然后将该事件 `yield` 回传给 `Runner`。
3. **暂停（Pause）：** 关键是，在 `yield` 语句（或 RxJava 中的 `return`）之后，Agent 逻辑的执行**会立即暂停**。它将等待 `Runner` 完成第 3 步（处理和提交）。
4. **恢复（Resume）：** *仅在* `Runner` 处理完让步事件之后，Agent 逻辑才会从 `yield` 紧跟其后的语句继续执行。
5. **查看更新状态（See Updated State）：** 恢复后，Agent 逻辑现在可以可靠地访问会话状态（`ctx.session.state`），该状态反映了 `Runner` 从*先前让步*事件提交的更改。

*概念性执行逻辑：*

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# Agent.run_async、回调或工具内部逻辑的简化视图

# ... 根据当前状态运行的先前代码 ...

# 1. 确定需要更改或输出，构建事件
# 示例：更新状态
update_data = {'field_1': 'value_2'}
event_with_state_change = Event(
    author=self.name,
    actions=EventActions(state_delta=update_data),
    content=types.Content(parts=[types.Part(text="State updated.")])
    # ... 其他事件字段 ...
)

# 2. 将事件交给 Runner 处理并提交
yield event_with_state_change
# <<<<<<<<<<<< 执行在此暂停 >>>>>>>>>>>>

# <<<<<<<<<<<< Runner 处理并提交事件 >>>>>>>>>>>>

# 3. 仅在 Runner 完成上述事件处理后恢复执行。
# 现在，由 Runner 提交的状态已可靠反映。
# 后续代码可以安全地假设从 yield 的事件中发生了更改。
val = ctx.session.state['field_1']
# 这里 `val` 保证为 "value_2"（假设 Runner 成功提交）
print(f"Resumed execution. Value of field_1 is now: {val}")

# ... 后续代码继续 ...
# 可能稍后再 yield 另一个事件...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// Agent.Run、回调或工具内部逻辑的简化视图

// ... 根据当前状态运行的先前代码 ...

// 1. 确定需要更改或输出，构建事件
// 示例：更新状态
updateData := map[string]interface{}{"field_1": "value_2"}
eventWithStateChange := &Event{
    Author: self.Name(),
    Actions: &EventActions{StateDelta: updateData},
    Content: genai.NewContentFromText("State updated.", "model"),
    // ... 其他事件字段 ...
}

// 2. 将事件交给 Runner 处理并提交
// 在 Go 中，这是通过将事件发送到通道来完成的。
eventsChan <- eventWithStateChange
// <<<<<<<<<<<< 此处执行暂停（概念上） >>>>>>>>>>>>
// 通道另一端的 Runner 将接收并处理事件。
// Agent 的 goroutine 可能会继续，但逻辑流程等待下一个输入或步骤。

// <<<<<<<<<<<< Runner 处理并提交事件 >>>>>>>>>>>>

// 3. 仅在 Runner 完成上述事件处理后恢复执行。
// 在实际的 Go 实现中，这可能通过 Agent 接收
// 新的 RunRequest 或指示下一步的上下文来处理。更新的状态
// 将作为新请求会话对象的一部分。
// 在这个概念示例中，我们只检查状态。
val := ctx.State.Get("field_1")
// 这里 `val` 被保证为"value_2"，因为 Runner 会在再次调用 Agent 之前
// 更新会话状态。
fmt.Printf("Resumed execution. Value of field_1 is now: %v\n", val)

// ... 后续代码继续 ...
// 也许稍后会向通道发送另一个事件...
```

{{% /tab %}}
{{< /tabs >}}
`Runner` 与您的执行逻辑之间，通过 `Event` 对象调解的合作式 yield/暂停/恢复循环，构成了 ADK 运行时的核心。

## 运行时的关键组件 {#key-components-of-the-runtime}

在 ADK 运行时内部，有多个组件协同工作以执行 Agent 调用。理解它们的角色有助于澄清事件循环的运作方式：

1. ### `Runner`

      * **角色：** 单个用户查询（`run_async`）的主要入口点和协调者。
      * **功能：** 管理整体事件循环，接收执行逻辑产生的事件，协调服务以处理并提交事件动作（状态/Artifact 更改），并将处理后的事件上行转发（例如，发送至用户界面）。它本质上基于产生的事件推动逐轮对话。（定义于 `google.adk.runners`）。

2. ### 执行逻辑组件

      * **角色：** 包含您的自定义代码和核心 Agent 功能的部分。
      * **组件：**
        * `Agent` (`BaseAgent`, `LlmAgent` 等)：处理信息并决定动作的主要逻辑单元。它们实现了 yield 事件的 `_run_async_impl` 方法。
        * `Tools` (`BaseTool`, `FunctionTool`, `AgentTool` 等)：供 Agent 使用的外部函数或功能（通常是 `LlmAgent`），用于与外部世界交互或执行特定任务。它们执行并返回结果，然后被封装为事件。
        * `Callbacks` (函数)：附加于 Agent 的用户自定义函数（如 `before_agent_callback`, `after_model_callback`），挂钩执行流程中的特定点，可能修改行为或状态，其效果会记录在事件中。
      * **功能：** 执行实际的思考、计算或外部交互。它们通过 **yield `Event` 对象** 来传达结果或需求，并暂停直至 Runner 处理。

3. ### `Event`

      * **角色：** 在 `Runner` 与执行逻辑之间传递的消息。
      * **功能：** 表示一个原子事件（用户输入、Agent 文本、工具调用/结果、状态更改请求、控制信号）。它携带事件内容及预期的副作用（`actions`，如 `state_delta`）。

4. ### `Services`* **角色：** 后端组件，负责管理持久或共享资源。主要由`Runner`在事件处理时使用。
      * **组件：**
        * `SessionService`（`BaseSessionService`、`InMemorySessionService`等）：管理`Session`对象，包括保存/加载、对会话状态应用`state_delta`以及将事件附加到`event history`。
        * `ArtifactService`（`BaseArtifactService`、`InMemoryArtifactService`、`GcsArtifactService`等）：管理二进制 Artifact 数据的存储和检索。虽然`save_artifact`在执行逻辑中通过上下文调用，但事件中的`artifact_delta`确认了运行者/会话服务的操作。
        * `MemoryService`（`BaseMemoryService`等）：（可选）为用户管理跨会话的长期语义记忆。
      * **功能：** 提供持久化层。`Runner`与其交互，确保`event.actions`发出的变更在执行逻辑恢复前可靠地存储。

5. ### `Session`

      * **角色：** 存储用户与应用之间*一次特定对话*的状态和历史的数据容器。
      * **功能：** 存储当前`state`字典、所有过去`events`列表（`event history`）及相关 Artifact 的引用。这是交互的主要记录，由`SessionService`管理。

6. ### `Invocation`

      * **角色：** 一个概念术语，表示从`Runner`收到查询的那一刻起，直到 Agent 逻辑完成该查询事件，响应*单*用户查询时发生的所有事情。
      * **功能：** 调用可能涉及多次 Agent 运行（如果使用 Agent 传输或`AgentTool`）、多个 LLM 调用、工具执行和回调执行，所有这些都通过`InvocationContext`内的单一`invocation_id`绑定在一起。以`temp:`为前缀的状态变量严格限定为单次调用，之后丢弃。

这些玩家通过事件循环持续互动，处理用户请求。

## 工作原理：简化祈祷 {#how-it-works-a-simplified-invocation}

让我们来描绘一个简化的流程，针对一个典型的用户查询，涉及 LLMAgent 调用工具：

![intro_components.png](/images/adk/invocation-flow.png)

### 逐步解析1. **用户输入：** 用户发送查询（例如，“法国首都是哪里？”）。 {#step-by-step-breakdown}
2. **运行开始：** `Runner.run_async`开始。它与`SessionService`交互以加载相关`Session`，并将用户查询作为会话历史的第一个`Event`。准备一个`InvocationContext`（`ctx`）。
3. **Agent 执行：** `Runner`调用指定的根 Agent（例如`LlmAgent`）上的`agent.run_async(ctx)`。
4. **LLM 调用（示例）:** `Agent_Llm`判断需要信息，可能通过调用工具。它准备请求`LLM`。假设 LLM 决定调用`MyTool`。
5. **Yield FunctionCall Event：** `Agent_Llm` 接收 LLM 的 `FunctionCall`响应，将其包裹在`Event(author='Agent_Llm', content=Content(parts=[Part(function_call=...)]))`中，并`yields`或`emits`该事件。
6. **特工暂停：** `Agent_Llm`的处决在`yield`后立即暂停。
7. **运行进程：** `Runner`接收 FunctionCall 事件。它将其传递给`SessionService`以记录历史。`Runner`随后将事件上游传给`User`（或应用程序）。
8. **Agent 恢复：** `Runner`表示事件已处理，并`Agent_Llm`继续执行。
9. **工具执行：** `Agent_Llm`的内部流程现在开始执行请求的`MyTool`。它调用`tool.run_async(...)`。
10. **工具返回结果：** `MyTool`执行并返回其结果（例如，`{'result': 'Paris'}`）。
11. **Yield FunctionResponse Event：** Agent（`Agent_Llm`）将工具结果包裹成包含`FunctionResponse`部分（例如`Event(author='Agent_Llm', content=Content(role='user', parts=[Part(function_response=...)]))`）的`Event`。如果工具修改状态（`state_delta`）或保存伪影（`artifact_delta`），该事件也可能包含`actions`。Agent `yield` 执行该事件。
12. **特工停顿：** `Agent_Llm`又停顿了一下。
13. **运行进程：** `Runner` 接收 FunctionResponse 事件。它将其传递给 `SessionService`，后者应用任意 `state_delta`/`artifact_delta`并将事件添加到历史中。`Runner` 产生上游事件。
14. **Agent 恢复：** `Agent_Llm`恢复，现在已知工具结果和任何状态变化已提交。
15. **最终 LLM 调用（示例）:** `Agent_Llm`将工具结果返回`LLM`生成自然语言响应。
16. **产出最终文本事件：** `Agent_Llm`从`LLM`接收最终文本，将其包裹在`Event(author='Agent_Llm', content=Content(parts=[Part(text=...)]))`中，然后由`yield`进行处理。
17. **特工停顿：** `Agent_Llm`停顿。
18. **运行者进程：** `Runner` 在前夜收到最终文本NT，将其交给`SessionService`以备历史，并上游交给`User`。这很可能被标记为`is_final_response()`。
19. **Agent 人续写并结束：** `Agent_Llm`继续。完成此召唤任务后，`run_async`生成器完成。
20. **跑者完成：** `Runner`看到 Agent 人的发生器耗尽，完成了为此召唤的循环。
这种 yield/暂停/处理/恢复 循环确保状态更改能够被一致地应用，并且执行逻辑在产生事件后总是基于最新提交的状态运行。

## 重要的运行时行为 {#important-runtime-behaviors}

理解 ADK 运行时如何处理状态、流式处理和异步操作的一些关键方面，对于构建可预测且高效的 Agent 至关重要。

### 状态更新与提交时机 {#state-updates--commitment-timing}

* **规则：** 当你的代码（在 Agent、工具或回调中）修改会话状态（例如 `context.state['my_key'] = 'new_value'`）时，此更改最初会在当前的 `InvocationContext` 中本地记录。只有在 `Event` 中包含相应 `state_delta` 的 `actions` 被你的代码 `yield`，并随后由 `Runner` 处理后，这一更改才**保证被持久化**（由 `SessionService` 保存）。

* **含义：** 从 `yield` 恢复后运行的代码可以可靠地假设，在*yielded event*中指示的状态更改已经被提交。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# 内部 Agent 逻辑（概念）

# 1. 修改状态
ctx.session.state['status'] = 'processing'
event1 = Event(..., actions=EventActions(state_delta={'status': 'processing'}))

# 2. 生成带有增量的事件
yield event1
# --- 暂停 --- Runner 处理 event1，SessionService 提交 'status' = 'processing' ---

# 3. 恢复执行
# 现在可以安全地依赖已提交的状态
current_status = ctx.session.state['status'] # Guaranteed to be 'processing'
print(f"Status after resuming: {current_status}")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
  // 内部 Agent 逻辑（概念）

func (a *Agent) RunConceptual(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
  // 整个逻辑被封装在一个函数中，该函数将作为迭代器返回。
  return func(yield func(*session.Event, error) bool) {
      // ... 先前的代码根据输入 `ctx` 的当前状态运行 ...
      // 例如，val := ctx.State().Get("field_1") 在这里可能返回 "value_1"。

      // 1. 确定需要更改或输出，构建事件
      updateData := map[string]interface{}{"field_1": "value_2"}
      eventWithStateChange := session.NewEvent(ctx, ctx.InvocationID())
      eventWithStateChange.Author = a.Name()
      eventWithStateChange.Actions = &session.EventActions{StateDelta: updateData}
      // ... 其他事件字段 ...

      // 2. 将事件交给 Runner 进行处理并提交。
      // 该 Agent 的执行在此调用之后立即继续。
      if !yield(eventWithStateChange, nil) {
          // 如果 yield 返回 false，这意味着消费者（Runner）
          // 已经停止监听了，所以我们应该停止产生事件。
          return
      }

      // <<<<<<<<<<<< Runner 处理并提交事件 >>>>>>>>>>>>
      // 这发生在 Agent 之外，在 Agent 的迭代器已经之后
      // 产生了这一事件。

      // 3. Agent 无法立即看到它刚刚产生的状态变化。
      // 在单次 `Run` 调用中，状态是不可变的。
      val := ctx.State().Get("field_1")
      // `val` 在这里仍然是 "value_1"（或者它开始时的值）。
      // 更新的状态（"value_2"）将只在 `ctx` 中可用
      // 在随后的回合中*下一次* `Run` 调用时。

      // ... 后续代码继续执行，可能产生更多事件 ...
      finalEvent := session.NewEvent(ctx, ctx.InvocationID())
      finalEvent.Author = a.Name()
      // ...
      yield(finalEvent, nil)
  }
}
```

{{% /tab %}}
{{< /tabs >}}
### 会话状态的“脏读” {#dirty-reads-of-session-state}

* **定义：** 当提交发生在 *yield 之后* 时，在同一次调用中 **稍后运行的代码**，但在状态改变事件实际被 yield 并处理之前，**通常可以看到本地的、未提交的更改**。这有时被称为“脏读”。
* **示例：**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# 在 before_agent_callback 中的代码
callback_context.state['field_1'] = 'value_1'
# 状态被本地设置为 'value_1'，但尚未被 Runner 提交

# ... agent 运行中 ...

# 在同一次调用中稍后由一个工具运行的代码
# 可读的（脏读），但 'value_1' 尚不保证持久化。
val = tool_context.state['field_1'] # 'val' will likely be 'value_1' here
print(f"Dirty read value in tool: {val}")

# 假设携带 state_delta={'field_1': 'value_1'} 的事件
# 在此工具运行后被生成，并由 Runner 处理。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// 在 before_agent_callback 中的代码
// 回调会直接修改上下文的会话状态。
// 此更改仅限于当前调用上下文。
ctx.State.Set("field_1", "value_1")
// 状态被本地设置为 'value_1'，但尚未被 Runner 提交

// ... agent 运行中 ...

// 在同一次调用中稍后由一个工具运行的代码
// 可读的（脏读），但 'value_1' 尚不保证持久化。
val := ctx.State.Get("field_1") // 'val' will likely be 'value_1' here
fmt.Printf("Dirty read value in tool: %v\n", val)

// 假设携带 state_delta={'field_1': 'value_1'} 的事件
// 在此工具运行后被生成，并由 Runner 处理。
```

{{% /tab %}}
{{< /tabs >}}
* **含义:**
  * **好处:** 允许在单个复杂步骤中，不同部分的逻辑（例如，在下一个 LLM 回合之前的多个回调或工具调用）使用状态进行协调，而无需等待完整的 yield/commit 循环。
  * **注意:** 在关键逻辑中大量依赖脏读可能有风险。如果调用在携带 `state_delta` 的事件被 yield 并被 `Runner` 处理 *之前* 失败，那么未提交的状态更改将丢失。对于关键的状态转换，确保它们与能够成功处理的事件相关联。

### 流式输出与非流式输出 (`partial=True`) {#streaming-vs-non-streaming-output-partialtrue}

这主要涉及 LLM 响应的处理方式，尤其是在使用流式生成 API 时。

* **流式:** LLM 按令牌或小块生成响应。
  * 框架（通常位于 `BaseLlmFlow` 内）会为单个概念响应 yield 多个 `Event` 对象。这些事件大多数将具有 `partial=True`。
  * `Runner` 在收到带有 `partial=True` 的事件时，通常 **立即将其转发** 到上游（用于 UI 显示），但 **跳过处理其 `actions`**（例如 `state_delta`）。
  * 最终，框架会为该响应 yield 一个最终事件，标记为非部分（`partial=False` 或者通过 `turn_complete=True` 隐式标记）。
  * `Runner` **只处理此最终事件**, 提交任何相关的 `state_delta` 或 `artifact_delta`。
* **非流式:** LLM 一次性生成整个响应。框架 yield 一个标记为非部分的单一事件，由 `Runner` 完全处理。
* **重要性:** 确保状态更改基于 LLM 的 *完整* 响应原子应用且只应用一次，同时仍允许 UI 随着生成逐步显示文本。

## 异步为主 (`run_async`)* **核心设计：** ADK 运行时基本上构建在异步模式和库之上（如 Python 的 `asyncio`、Java 的 `RxJava`，以及 TypeScript 中的原生 `Promise` 和 `AsyncGenerator`），以便高效处理并发操作（如等待 LLM 响应或工具执行）而不阻塞。 {#async-is-primary-runasync}
* **主要入口点：** `Runner.run_async` 是执行 Agent 调用的主要方法。所有核心可运行组件（Agent、特定流程）在内部都使用 `asynchronous` 方法。
* **同步便利（`run`）：** 一个同步的 `Runner.run` 方法主要用于便利（例如在简单脚本或测试环境中）。然而，在内部，`Runner.run` 通常只是调用 `Runner.run_async` 并为您管理异步事件循环的执行。
* **开发者体验：** 我们建议将应用程序（例如使用 ADK 的 Web 服务器）设计为异步，以获得最佳性能。在 Python 中，这意味着使用 `asyncio`；在 Java 中，利用 `RxJava` 的响应式编程模型；在 TypeScript 中，这意味着使用原生 `Promise` 和 `AsyncGenerator` 构建。
* **同步回调/工具：** ADK 框架同时支持工具和回调的异步与同步函数。
    * **阻塞 I/O：** 对于长期运行的同步 I/O 操作，框架并不总是防止阻塞。Python ADK 在 asyncio 事件循环中直接调用同步工具函数，因此在其中进行阻塞的输入或输出会阻塞循环；在实时模式下，您可以设置 `RunConfig.tool_thread_pool_config` 将工具执行放入后台线程池。Java ADK 通常依赖于适当的 RxJava 调度器或阻塞调用的包装器。在 TypeScript 中，框架会直接等待该函数；如果同步函数进行阻塞 I/O，它将阻塞事件循环。开发者应尽可能使用异步 I/O API（返回 Promise）。
    * **CPU 绑定工作：** 纯 CPU 密集型同步任务在所有环境中仍会阻塞其执行线程。

理解这些行为有助于您编写更稳定的 ADK 应用程序，并调试与状态一致性、流式更新和异步执行相关的问题。

---

原文：[Runtime Event Loop](https://adk.dev/runtime/event-loop/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/event-loop.md)
