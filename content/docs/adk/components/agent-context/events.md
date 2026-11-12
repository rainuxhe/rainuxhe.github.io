---
title: "事件"
description: "事件是 Agent Development Kit（ADK）中信息流的基本单位。它们代表 Agent 交互生命周期中的每一个重要事件，从最初的用户输入到最终的响应"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

事件是 Agent Development Kit（ADK）中信息流的基本单元。它们代表了 Agent 在交互生命周期中每一个重要的事件，从最初的用户输入到最终响应及其中的所有步骤。理解事件至关重要，因为它们是组件进行通信、管理状态和控制流程的主要方式。

## 什么是事件以及它们的重要性 {#what-events-are-and-why-they-matter}

在 ADK 中，`Event` 是记录 Agent 执行中特定点的记录。它捕获用户消息、Agent 回复、使用工具（函数调用）的请求、工具结果、状态变化、控制信号和错误。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}
技术上，它是 `google.adk.events.Event` 类的一个实例，该类在基本的 `LlmResponse` 结构基础上增加了关键的 ADK 特定元数据和 `actions` 负载。

```python
# 事件的概念结构（Python）
# 来自 google.adk.events 导入 Event, EventActions
# 来自 google.genai 导入 types

# 类 Event(LlmResponse)：# 简化视图
#     # --- LlmResponse 字段 ---
#     content: Optional[types.Content]
#     partial: Optional[bool]
#     # ... 其他响应字段 ...

#     # --- ADK 特定的附加字段 ---
#     author: str          # 'user' 或 Agent 名称
#     invocation_id: str   # 整个交互运行的 ID
#     id: str              # 该特定事件的唯一 ID
#     timestamp: float     # 创建时间
#     actions: EventActions # 对副作用和控制非常重要
#     branch: Optional[str] # 层级路径
#     # ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}
在 Go 中，这是一个类型为 `google.golang.org/adk/v2/session.Event` 的结构体。

```go
// 事件的概念结构（Go - 查看 session/session.go）
// 基于 session.Event 结构的简化视图
type Event struct {
    // --- 来自嵌入的 model.LLMResponse 的字段 ---
    model.LLMResponse

    // --- ADK 特定的添加 ---
    Author       string         // 'user' or agent name
    InvocationID string         // ID for the whole interaction run
    ID           string         // Unique ID for this specific event
    Timestamp    time.Time      // Creation time
    Actions      EventActions   // Important for side-effects & control
    Branch       string         // Hierarchy path
    // ... 其他字段
}

// model.LLMResponse 包含 Content 字段
type LLMResponse struct {
    Content *genai.Content
    // ... 其他字段
}
```

{{% /tab %}}
{{< /tabs >}}
事件对于 ADK 的运行至关重要，原因如下：

1.  **通信：** 它们作为用户界面、`Runner`、Agent、LLM 和工具之间的标准消息格式。所有内容都以 `Event` 形式传递。

2.  **状态与 Artifact 变更的信号传递：** 事件承载状态修改的指令并跟踪 Artifact 更新。`SessionService` 使用这些信号以确保持久性。在 Python 中，通过 `event.actions.state_delta` 和 `event.actions.artifact_delta` 来传递变化信号。

3.  **控制流：** 特定字段如 `event.actions.transfer_to_agent` 或 `event.actions.escalate` 作为信号引导框架，决定下一个运行的 Agent 或循环是否应终止。

4.  **历史记录与可观测性：** 在 `session.events` 中记录的事件序列提供了完整的交互时间顺序历史，对于调试、审计以及逐步理解 Agent 行为非常宝贵。

本质上，从用户查询到 Agent 最终答案的整个过程，都是通过 `Event` 对象的生成、解释和处理来协调的。

## 理解和使用事件 {#understanding-and-using-events}

作为开发者，您主要会与 `Runner` 产生的事件流进行交互。以下是如何理解和提取其中信息的方法：

{{% alert context="default" %}}
基础元素的具体参数或方法名称可能因 SDK 语言略有差异，例如 Python 中的 `event.content` 属性和 Java 中的 `event.content().get().parts()`。详情请参考语言特定的 API 文档。
{{% /alert %}}

### 识别事件来源和类型 {#identifying-event-origin-and-type}

通过检查以下内容可以快速确定事件的含义：*   **谁发送的？(`event.author`)**
    *   `'user'`：表示直接来自最终用户的输入。
    *   `'AgentName'`：表示来自特定 Agent 的输出或操作（例如，`'WeatherAgent'`，`'SummarizerAgent'`）。
*   **主要内容是什么？(`event.content` 和 `event.content.parts`)**
    *   **文本：** 表示会话消息。对于 Python，检查 `event.content.parts[0].text` 是否存在。对于 Java，检查 `event.content()` 是否存在，其 `parts()` 是否存在且不为空，并且第一部分的 `text()` 是否存在。
    *   **工具调用请求：** 检查 `event.get_function_calls()`。如果不为空，LLM 正在请求执行一个或多个工具。列表中的每一项都有 `.name` 和 `.args`。
    *   **工具结果：** 检查 `event.get_function_responses()`。如果不为空，该事件携带工具执行的结果。每一项都有 `.name` 和 `.response`（工具返回的字典）。*注意：* 对于历史记录结构，`content` 中的 `role` 通常是 `'user'`，但事件 `author` 通常是请求调用工具的 Agent。

*   **这是流式输出吗？(`event.partial`)**
    表示这是否是来自 LLM 的未完成文本块。
    *   `True`：后续会有更多文本。
    *   `False` 或 `None`/`Optional.empty()`：这部分内容已完成（尽管如果 `turn_complete` 也为 false，则整个回合可能尚未完成）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 伪代码：基本事件识别（Python）
# async for event in runner.run_async(...):
#     print(f"事件来自: {event.author}")
#
#     if event.content and event.content.parts:
#         if event.get_function_calls():
#             print("  类型: 工具调用请求")
#         elif event.get_function_responses():
#             print("  类型: 工具结果")
#         elif event.content.parts[0].text:
#             if event.partial:
#                 print("  类型: 流式文本片段")
#             else:
#                 print("  类型: 完整文本消息")
#         else:
#             print("  类型: 其他内容（例如代码结果）")
#     elif event.actions and (event.actions.state_delta or event.actions.artifact_delta):
#         print("  类型: 状态/Artifact 更新")
#     else:
#         print("  类型: 控制信号或其他")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
  // 伪代码：基本事件识别（Go）
import (
  "fmt"
  "google.golang.org/adk/v2/session"
  "google.golang.org/genai"
)

func hasFunctionCalls(content *genai.Content) bool {
  if content == nil {
    return false
  }
  for _, part := range content.Parts {
    if part.FunctionCall != nil {
      return true
    }
  }
  return false
}

func hasFunctionResponses(content *genai.Content) bool {
  if content == nil {
    return false
  }
  for _, part := range content.Parts {
    if part.FunctionResponse != nil {
      return true
    }
  }
  return false
}

func processEvents(events <-chan *session.Event) {
  for event := range events {
    fmt.Printf("Event from: %s\n", event.Author)

    if event.LLMResponse != nil && event.LLMResponse.Content != nil {
      if hasFunctionCalls(event.LLMResponse.Content) {
        fmt.Println("  Type: Tool Call Request")
      } else if hasFunctionResponses(event.LLMResponse.Content) {
        fmt.Println("  Type: Tool Result")
      } else if len(event.LLMResponse.Content.Parts) > 0 {
        if event.LLMResponse.Content.Parts[0].Text != "" {
          if event.LLMResponse.Partial {
            fmt.Println("  Type: Streaming Text Chunk")
          } else {
            fmt.Println("  Type: Complete Text Message")
          }
        } else {
          fmt.Println("  Type: Other Content (e.g., code result)")
        }
      }
    } else if len(event.Actions.StateDelta) > 0 {
      fmt.Println("  Type: State Update")
    } else {
      fmt.Println("  Type: Control Signal or Other")
    }
  }
}
```

{{% /tab %}}
{{< /tabs >}}

### 提取关键信息 {#extracting-key-information}

一旦你知道事件类型，请访问相关数据：

*   **文本内容：**
    在访问文本之前，请始终检查内容和部分是否存在。在 Python 中它是 `text = event.content.parts[0].text`。

*   **函数调用详情：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    calls = event.get_function_calls()
    if calls:
        for call in calls:
            tool_name = call.name
            arguments = call.args # This is usually a dictionary
            print(f"  Tool: {tool_name}, Args: {arguments}")
            # 应用程序可能会根据此调度执行
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
        "fmt"
        "google.golang.org/adk/v2/session"
        "google.golang.org/genai"
    )

    func handleFunctionCalls(event *session.Event) {
        if event.LLMResponse == nil || event.LLMResponse.Content == nil {
            return
        }
        calls := event.Content.FunctionCalls()
        if len(calls) > 0 {
            for _, call := range calls {
                toolName := call.Name
                arguments := call.Args
                fmt.Printf("  Tool: %s, Args: %v\n", toolName, arguments)
                // 应用程序可能会根据此调度执行
            }
        }
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **功能响应详情：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    responses = event.get_function_responses()
    if responses:
        for response in responses:
            tool_name = response.name
            result_dict = response.response # The dictionary returned by the tool
            print(f"  Tool Result: {tool_name} -> {result_dict}")
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
        "fmt"
        "google.golang.org/adk/v2/session"
        "google.golang.org/genai"
    )

    func handleFunctionResponses(event *session.Event) {
        if event.LLMResponse == nil || event.LLMResponse.Content == nil {
            return
        }
        responses := event.Content.FunctionResponses()
        if len(responses) > 0 {
            for _, response := range responses {
                toolName := response.Name
                result := response.Response
                fmt.Printf("  Tool Result: %s -> %v\n", toolName, result)
            }
        }
    }
    ```

{{% /tab %}}
{{< /tabs >}}
*   **标识符:**
    *   `event.id`: 这个特定事件实例的唯一ID。
    *   `event.invocation_id`: 该事件所属的整个用户请求到最终响应周期的ID。适用于日志记录和跟踪。

### 检测动作和副作用 {#detecting-actions-and-side-effects}

`event.actions` 对象表示已经发生或应该发生的变化。在访问`event.actions`及其字段/方法之前，请务必检查其是否存在。

*   **状态变化:** 提供一个键值对集合，表示在生成此事件的步骤中会话状态中被修改的项。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}
    `delta = event.actions.state_delta`（`{key: value}` 对的字典）。

    ```python
    if event.actions and event.actions.state_delta:
        print(f"  State changes: {event.actions.state_delta}")
        # 如有必要，更新本地用户界面或应用程序状态
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}
    `delta := event.Actions.StateDelta`（一个 `map[string]any`）

    ```go
    import (
        "fmt"
        "google.golang.org/adk/v2/session"
    )

    func handleStateChanges(event *session.Event) {
        if len(event.Actions.StateDelta) > 0 {
            fmt.Printf("  State changes: %v\n", event.Actions.StateDelta)
            // 如有必要，更新本地用户界面或应用程序状态
        }
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **Artifact 保存:** 为您提供一个集合，指示哪些 Artifact 已保存及其新版本号（或相关的`Part`信息）。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}
    `artifact_changes = event.actions.artifact_delta`（`{filename: version}`的字典）。

    ```python
    if event.actions and event.actions.artifact_delta:
        print(f"  Artifacts saved: {event.actions.artifact_delta}")
        # UI 可能会刷新 Artifact 列表
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}
    `artifactChanges := event.Actions.ArtifactDelta`（一个 `map[string]int64`）

    ```go
    import (
        "fmt"
        "google.golang.org/adk/v2/artifact"
        "google.golang.org/adk/v2/session"
    )

    func handleArtifactChanges(event *session.Event) {
        if len(event.Actions.ArtifactDelta) > 0 {
            fmt.Printf("  Artifacts saved: %v\n", event.Actions.ArtifactDelta)
            // UI 可能会刷新 Artifact 列表
            // 遍历 event.Actions.ArtifactDelta 以获取文件名和 artifact.Artifact 的详细信息
            for filename, version := range event.Actions.ArtifactDelta {
                fmt.Printf("    Filename: %s, Version: %d\n", filename, version)
            }
        }
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **控制流信号:** 检查布尔标志或字符串值：

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}
    *   `event.actions.transfer_to_agent` (字符串): 控制应传递给指定的 Agent。
    *   `event.actions.escalate` (布尔值): 循环应终止。
    *   `event.actions.skip_summarization` (布尔值): 工具结果不应由 LLM 总结。

    ```python
    if event.actions:
        if event.actions.transfer_to_agent:
            print(f"  Signal: Transfer to {event.actions.transfer_to_agent}")
        if event.actions.escalate:
            print("  Signal: Escalate (terminate loop)")
        if event.actions.skip_summarization:
            print("  Signal: Skip summarization for tool result")
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}
    *   `event.Actions.TransferToAgent`（字符串）：控制应传递给指定的 Agent。
    *   `event.Actions.Escalate`（布尔值）：循环应终止。
    *   `event.Actions.SkipSummarization`（布尔值）：工具结果不应由大语言模型总结。

    ```go
    import (
        "fmt"
        "google.golang.org/adk/v2/session"
    )

    func handleControlFlow(event *session.Event) {
        if event.Actions.TransferToAgent != "" {
            fmt.Printf("  Signal: Transfer to %s\n", event.Actions.TransferToAgent)
        }
        if event.Actions.Escalate {
            fmt.Println("  Signal: Escalate (terminate loop)")
        }
        if event.Actions.SkipSummarization {
            fmt.Println("  Signal: Skip summarization for tool result")
        }
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}

### 确定事件是否为“最终”响应 {#determining-if-an-event-is-a-final-response}

使用内置辅助方法 `event.is_final_response()` 来识别适合显示为 Agent 单轮完整输出的事件。

*   **目的：** 从最终面向用户的消息中过滤掉中间步骤，如工具调用和部分流式文本。
*   **什么时候 `True`？**
    1.  `skip_summarization` 操作是 `True`。在 Python 中，仅此标志即可，且事件无需携带 `function_response` 工具结果。
    2.  事件的 `long_running_tool_ids` 非空，表示调用了标记为 `is_long_running=True` 的工具。在 Python 中，仅此列表即可，且事件无需携带 `function_call` 本身。在 Java 中，检查 `longRunningToolIds` 列表是否为空：
        *   `event.longRunningToolIds().isPresent() && !event.longRunningToolIds().get().isEmpty()` 是 `true`。
    3.  或者，**同时满足**以下所有条件：
        *   没有函数调用（`get_function_calls()` 为空）。
        *   没有函数响应（`get_function_responses()` 为空）。
        *   不是部分流式块（`partial` 不是 `True`）。
        *   结尾没有可能需要进一步处理/显示的代码执行结果。
*   **用法：** 在应用程序逻辑中筛选事件流。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 伪代码：在应用程序中处理最终响应（Python）
    # full_response_text = ""
    # async for event in runner.run_async(...):
    #     # 如有需要，累积流式文本...
    #     if event.partial and event.content and event.content.parts and event.content.parts[0].text:
    #         full_response_text  = event.content.parts[0].text
    #
    #     # 检查是否为最终可显示事件
    #     if event.is_final_response():
    #         print("\n--- 检测到最终输出 ---")
    #         if event.content and event.content.parts and event.content.parts[0].text:
    #              # 如果是流的最后一部分，使用累积文本
    #              final_text = full_response_text   (event.content.parts[0].text if not event.partial else "")
    #              print(f"显示给用户: {final_text.strip()}")
    #              full_response_text = "" # 重置累积器
    #         elif event.actions and event.actions.skip_summarization and event.get_function_responses():
    #              # 如有需要，处理显示原始工具结果
    #              response_data = event.get_function_responses()[0].response
    #              print(f"显示原始工具结果: {response_data}")
    #         elif hasattr(event, 'long_running_tool_ids') and event.long_running_tool_ids:
    #              print("显示消息: 工具正在后台运行...")
    #         else:
    #              # 如适用，处理其他类型的最终响应
    #              print("显示: 最终非文本响应或信号。")
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    // 伪代码：在应用中处理最终响应（Go）
    import (
        "fmt"
        "strings"
        "google.golang.org/adk/v2/session"
        "google.golang.org/genai"
    )

    // isFinalResponse检查事件是否适合显示的最终响应。
    func isFinalResponse(event *session.Event) bool {
        if event.LLMResponse != nil {
            // 条件一：工具结果跳过摘要。
            if event.LLMResponse.Content != nil && len(event.LLMResponse.Content.FunctionResponses()) > 0 && event.Actions.SkipSummarization {
                return true
            }
            // 条件二：长期使用工具。
            if len(event.LongRunningToolIDs) > 0 {
                return true
            }
            // 条件3：完整消息，不包含工具调用或回应。
            if (event.LLMResponse.Content == nil ||
                (len(event.LLMResponse.Content.FunctionCalls()) == 0 && len(event.LLMResponse.Content.FunctionResponses()) == 0)) &&
                !event.LLMResponse.Partial {
                return true
            }
        }
        return false
    }

    func handleFinalResponses() {
        var fullResponseText strings.Builder
        // 对于事件 ：= Range Runner。Run（...）{ // 示例循环
        // 	如果需要，可以积累流式文本......
        // 	if事件。LLMResponse！= 无事件和事件。LLMResponse。部分事件&&事件。LLMResponse.内容！= 无事件 {
        // 		如果 len（事件。LLMResponse.Content.Parts） > 0 & 事件。LLMResponse.Content.Parts[0]。文本 ！= “” {
        // 			完整响应文本。WriteString（事件。LLMResponse.内容。部分[0]。文本）
        // 		}
        // 	}
        //
        // 	检查是否是一个最终的、可展示的事件
        // 	如果isFinalResponse（event） {
        // 		fmt。println（“\n--- 检测到最终输出 ---”）
        // 		如果事件。LLMResponse ！= 无 & 事件。LLMResponse。内容 ！= 无 {
        // 			如果 len（事件。LLMResponse.Content.Parts） > 0 & 事件。LLMResponse.Content.Parts[0]。文本 ！= “” {
        // 				如果是直播的最后部分，使用累积的文字
        // 				finalText ：= fullResponseText.String（）
        // 				如果！事件。LLMResponse。部分{
        // 					finalText = 事件。LLMResponse.内容。部分[0]。文本
        // 				}
        // 				fmt。Printf（“显示给用户：%s\n”，字符串。TrimSpace（finalText））
        // 				fullResponseText.Reset（） // 重置累加器
        // 			}
        // 		} 否则 if 事件。Actions.SkipSummarization & 事件。LLMResponse.Content ！= nil && len（event.LLMResponse.Content.FunctionResponses（）> 0 {
        // 			如果需要，可以显示原始工具结果
        // 			响应数据 ：= 事件。LLMResponse.Content.FunctionResponses（）[0]。响应
        // 			fmt。Printf（“显示原始工具结果：%v\n”，responseData）
        // 		} 否则 如果 len（event.LongRunningToolIDs） > 0 {
        // 			fmt.Println（“显示消息：工具正在后台运行......”）
        // 		} 否则 {
        // 			如果适用，处理其他类型的最终回复
        // 			fmt。Println（“显示：最终非文本回应或信号。”）
        // 		}
        // 	}
        // }
    }
    ```

{{% /tab %}}
    {{< /tabs >}}
通过仔细分析事件的这些方面，你可以构建出能够恰当地响应 ADK 系统中丰富信息的稳健应用程序。

## 事件如何流动：生成与处理 {#how-events-flow-generation-and-processing}

事件在不同点被创建，并由框架系统地处理。理解这一流程有助于澄清动作和历史如何管理。

* **生成源：**
    * **用户输入：** `Runner`通常将初始用户消息或对话中输入包裹到`author='user'`的 `Event`中。
    * **Agent 逻辑：** Agent（`BaseAgent`、`LlmAgent`）显式`yield Event(...)`对象（设置`author=self.name`）以通信响应或信号动作。
    * **LLM 响应：** ADK 模型集成层将原始 LLM 输出（文本、函数调用、错误）转换为由调用 Agent 编写的`Event`对象。
    * **工具结果：** 工具执行后，框架生成包含该`function_response`的`Event`。`author`通常是请求该工具的 Agent，而`content`内的`role`则设置为`'user'`，用于获取 LLM 历史。

* **处理流程：**
    1. **yield/return：** 事件由源生成并生成（Python）或返回/发出（Java）。
    2. **执行 Agent 人的主`Runner`接收事件。
    3. **SessionService 处理：** 该`Runner`将事件发送到配置`SessionService`。这是一个关键步骤：
        * **应用Delta：** 服务将`event.actions.state_delta`合并为`session.state`并根据`event.actions.artifact_delta`更新内部记录。（注：实际的文件*保存*通常在调用`context.save_artifact`时更早发生。）
        * **事件元数据：** 在 Python 中，`Event`对象从构建之那一刻起就已经携带一个`id`和一个 `timestamp`，因此服务不会分配它们，而是记录接收事件的过程。
        * **持续存在历史：** 将处理中的事件附加到`session.events`列表。
    4. **外部收益：** 该`Runner`向调用应用程序（例如调用`runner.run_async`的代码）返回/发出（Java）处理后的事件。

这种流程确保状态变化和历史记录与每个事件的通信内容保持一致。

## 常见事件示例（示意模式） {#common-event-examples-illustrative-patterns}

以下是你可能在直播中看到的典型事件的简明示例：

* **用户输入：**

    ```json
    {
      "author": "user",
      "invocation_id": "e-xyz...",
      "content": {"parts": [{"text": "Book a flight to London for next Tuesday"}]}
      // actions usually empty
    }
    ```

*   **Agent 最终文本回复：** (`is_final_response() == True`)

    ```json
    {
      "author": "TravelAgent",
      "invocation_id": "e-xyz...",
      "content": {"parts": [{"text": "Okay, I can help with that. Could you confirm the departure city?"}]},
      "partial": false,
      "turn_complete": true
      // actions might have state delta, etc.
    }
    ```

*   **Agent 流式文本响应：** (`is_final_response() == False`)

    ```json
    {
      "author": "SummaryAgent",
      "invocation_id": "e-abc...",
      "content": {"parts": [{"text": "The document discusses three main points:"}]},
      "partial": true,
      "turn_complete": false
    }
    // ... more partial=True events follow ...
    ```

*   **工具调用请求（由大语言模型发起）：** (`is_final_response() == False`)

    ```json
    {
      "author": "TravelAgent",
      "invocation_id": "e-xyz...",
      "content": {"parts": [{"function_call": {"name": "find_airports", "args": {"city": "London"}}}]}
      // actions usually empty
    }
    ```

*   **提供给语言模型的工具结果：**（`is_final_response()` 依赖于 `skip_summarization`）

    ```json
    {
      "author": "TravelAgent", // Author is agent that requested the call
      "invocation_id": "e-xyz...",
      "content": {
        "role": "user", // Role for LLM history
        "parts": [{"function_response": {"name": "find_airports", "response": {"result": ["LHR", "LGW", "STN"]}}}]
      }
      // actions might have skip_summarization=True
    }
    ```

*   **仅状态/Artifact 更新：** (`is_final_response() == True`)

    ```json
    {
      "author": "InternalUpdater",
      "invocation_id": "e-def...",
      "content": null,
      "actions": {
        "state_delta": {"user_status": "verified"},
        "artifact_delta": {"verification_doc.pdf": 2}
      }
    }
    ```

*   **Agent 转移信号：** (`is_final_response() == False`)

    ```json
    {
      "author": "OrchestratorAgent",
      "invocation_id": "e-789...",
      "content": {"parts": [{"function_call": {"name": "transfer_to_agent", "args": {"agent_name": "BillingAgent"}}}]},
      "actions": {"transfer_to_agent": "BillingAgent"} // Added by framework
    }
    ```

*   **循环升级信号：** (`is_final_response() == True`)

    ```json
    {
      "author": "CheckerAgent",
      "invocation_id": "e-loop...",
      "content": {"parts": [{"text": "Maximum retries reached."}]}, // Optional content
      "actions": {"escalate": true}
    }
    ```

## 更多背景和事件详情 {#additional-context-and-event-details}

除了核心概念外，以下是关于某些用例中重要的背景和事件的具体细节：

1. **`ToolContext.function_call_id`（链接工具操作）:**
    * 当大型语言模型请求工具（FunctionCall）时，该请求有ID。提供给工具函数的`ToolContext`包含该`function_call_id`。
    * **重要性：** 这个 ID 对于将诸如认证等操作与发起该请求的特定工具请求联系起来至关重要，尤其是在同一回合调用多个工具时。框架内部使用该 ID。

2. **状态/文物变更如何记录：**
    * 当你修改状态或使用`CallbackContext`或`ToolContext`保存 Artifact 时，这些更改不会立即写入持久存储。
    * 相反，它们填充`EventActions`对象内的`state_delta`和`artifact_delta`字段。
    * 该`EventActions`对象关联到变更后生成的*下一个事件*（例如 Agent 响应或工具结果事件）。
    * `SessionService.append_event`方法读取来自新事件的这些差异，并将其应用到会话的持久状态和伪造记录上。这确保了变更与事件流的时间顺序关联。

3. **状态范围前缀（`app:`、`user:`、`temp:`）:**
    * 通过`context.state`管理状态时，可以选择使用前缀：
        * `app:my_setting`：建议与整个应用相关的状态（需要持久`SessionService`）。
        * `user:user_preference`：建议跨会话与特定用户相关的状态（需要持久`SessionService`）。
        * `temp:intermediate_result`或无前缀：通常为当前调用的会话特定或临时状态。
    * 底层`SessionService`决定了这些前缀的持久处理方式。

4. **错误事件：**
    * `Event`可以表示错误。检查`event.error_code`和`event.error_message`字段（继承自`LlmResponse`）。
    * 错误可能源自 LLM（如安全过滤器、资源限制），或在工具严重失效时被框架打包。请查看工具`FunctionResponse`内容，以识别典型的工具特定错误。

    ```json
    // Example Error Event (conceptual)
    {
      "author": "LLMAgent",
      "invocation_id": "e-err...",
      "content": null,
      "error_code": "SAFETY_FILTER_TRIGGERED",
      "error_message": "Response blocked due to safety settings.",
      "actions": {}
    }
    ```

这些细节为涉及工具认证、状态持久化范围和事件流中错误处理的高级用例提供了更完整的视图。

## 处理事件的最佳实践 {#best-practices-for-working-with-events}

要在 ADK 应用中有效使用事件：

*   **明确作者身份：** 在构建自定义 Agent 时，确保在历史记录中正确归属 Agent 的操作。对于 LLM/工具事件，框架通常会正确处理作者身份。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}
    在 `BaseAgent` 子类中使用 `yield Event(author=self.name, ...)`。
    {{% /tab %}}
    {{% tab tabName="Go" %}}
    在自定义 Agent 的 `Run` 方法中，框架通常会处理作者身份。如果手动创建事件，请设置 author: `yield(&session.Event{Author: a.name, ...}, nil)`
    {{% /tab %}}
    {{< /tabs >}}
*   **语义内容与操作：** 将 `event.content` 用于核心消息/数据（文本、函数调用/响应）。专门使用 `event.actions` 来标记副作用（状态/Artifact 差异）或控制流程（`transfer`、`escalate`、`skip_summarization`）。
*   **幂等性意识：** 理解 `SessionService` 负责应用 `event.actions` 中标识的状态/Artifact 更改。虽然 ADK 服务旨在保持一致性，但如果您的应用逻辑重新处理事件，请考虑潜在的下游影响。
*   **使用 `is_final_response()`：** 在应用/UI 层依赖此辅助方法来识别完整的面向用户的文本响应。避免手动复制其逻辑。
*   **利用历史记录：** 会话事件列表是您的主要调试工具。检查作者、内容和操作的顺序，以跟踪执行并诊断问题。
*   **使用元数据：** 使用 `invocation_id` 将单次用户交互中的所有事件相关联。使用 `event.id` 引用特定的唯一事件。

将事件视为内容和操作具有明确目的的结构化消息，是在 ADK 中构建、调试和管理复杂 Agent 行为的关键。

---

原文：[Events](https://adk.dev/events/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/events/index.md)
