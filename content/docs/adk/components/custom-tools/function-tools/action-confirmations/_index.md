---
title: "操作确认"
description: "某些 Agent 工作流程在进行决策、验证、安全或一般监督时需要确认。在这些情况下，您希望在继续工作流程之前获得来自人工或监督系统的响应"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v1.14.0， Go v0.3.0。

一些 Agent 工作流程需要确认才能做出决策、验证，
安全，或者一般监督。在这种情况下，你需要得到回复
在进入工作流程之前，先使用人工或监督系统。*工具
Agent Development Kit（ADK）中的确认*功能允许 ADK 工具
暂停执行并与用户或其他系统互动以确认或
以便在继续前收集结构化数据。你可以使用 Tool Confirmation 和
以下方式是 ADK 工具：

- **[布尔确认](#boolean-confirmation)：** 你可以
    配置一个带有确认标志或提供者的工具。这个
    选项会暂停工具，以显示是或否确认回复。
- **[高级确认](#advanced-confirmation)：** 适用于需要的场景
    结构化数据响应，你可以用文本配置工具
    提示说明确认和预期回复。

{{% alert context="default" %}}
**TypeScript、Go 和 Kotlin 的实验性**

工具确认功能在 ADK TypeScript、ADK Go 中是实验性的，
以及 ADK Kotlin。关于所有语言，请参见
[已知局限](#known-limitations)。
{{% /alert %}}
你可以配置请求如何传达给用户，系统也能
还要使用通过 ADK 发送的[远程响应](#remote-response)
服务器的REST API。在 ADK 网页用户使用确认功能时
界面，Agent 工作流会向用户显示一个对话框以请求
输入，如图1所示：

![工具确认默认用户界面截图](/images/adk/confirmation-ui.png)

**图1。** 确认响应请求对话框示例，使用
高级工具响应实现。

以下章节将介绍如何使用此功能进行确认
场景。完整代码示例请参见
[human_tool_confirmation](https://github.com/google/adk-python/blob/fc90ce968f114f84b14829f8117797a4c256d710/contributing/samples/human_tool_confirmation/agent.py)
举个例子。还有其他方法可以将人工输入融入你的经纪人
工作流程，详情请参见
[人类参与的](/docs/adk/build/multi-agent-workflows/workflow-patterns/#human-in-the-loop)
特工模式。

## 布尔确认 {#boolean-确认}

当你的工具只需要用户简单的`yes`或`no`时，你可以
附加确认步骤。在 Python、Go 和 Java 中，你可以通过以下方式启用此功能。
将工具包裹为`FunctionTool`类并设置
`require_confirmation`参数（或等价的）`True`。在Kotlin中，你设
`requireConfirmation = true`工具函数的`@Tool`注释。在
TypeScript，你要在`execute`函数中手动实现这个逻辑
使用`ToolContext`。

以下示例展示了如何启用布尔确认：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
root_agent = Agent(
    # ...
    tools = [
        # 将 require_confirmation 设置为 True 以要求用户确认
        # 用于工具调用。
        FunctionTool(reimburse, require_confirmation=True),
    ],
    # ...
)

# 这种实现方法需要最少的代码，但仅限于简单的情况
# 来自用户或确认系统的批准。有关此的完整示例
# 方法，参见以下代码示例以获得更详细的例子：
# https://github.com/google/adk-python/blob/main/contributing/samples/hitl/human_tool_confirmation/agent.py
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
reimburseTool, _ := functiontool.New(functiontool.Config{
    Name:        "reimburse",
    Description: "Reimburse an amount",
    // 将 RequireConfirmation 设置为 true 以要求用户确认
    // 用于工具调用。
    RequireConfirmation: true,
}, func(ctx agent.Context, args ReimburseArgs) (ReimburseResult, error) {
    // 实际实现
    return ReimburseResult{Status: "ok"}, nil
})

rootAgent, _ := llmagent.New(llmagent.Config{
    // ...
    Tools: []tool.Tool{reimburseTool},
})
```

{{% /tab %}}
{{< /tabs >}}
### 需要确认功能 {#require-confirmation-function}

您可以通过使用一个根据工具输入返回布尔值的函数来修改确认要求的行为。在 TypeScript 中，这可以通过在 `execute` 函数中添加条件逻辑来处理。在 Kotlin 中，`@Tool` 注解的标志是编译时常量，因此条件逻辑放在工具函数内。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
async def confirmation_threshold(
    amount: int, tool_context: ToolContext
) -> bool:
  """Returns true if the amount is greater than 1000."""
  return amount > 1000

root_agent = Agent(
    # ...
    tools = [
        # 传递阈值函数以动态要求确认
        FunctionTool(reimburse, require_confirmation=confirmation_threshold),
    ],
    # ...
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
reimburseTool, _ := functiontool.New(functiontool.Config{
    Name:        "reimburse",
    Description: "Reimburse an amount",
    // RequireConfirmationProvider 允许动态确定
    // 是否需要用户确认。
    RequireConfirmationProvider: func(args ReimburseArgs) bool {
        return args.Amount > 1000
    },
}, func(ctx agent.Context, args ReimburseArgs) (ReimburseResult, error) {
    // 实际实现
    return ReimburseResult{Status: "ok"}, nil
})
```

{{% /tab %}}
{{< /tabs >}}
## 高级确认 {#advanced-confirmation}

当工具确认需要用户提供更多细节或更复杂的响应时，请使用 tool_confirmation 实现。此方法扩展了 `ToolContext` 对象，以向用户添加请求的文字描述，并允许更复杂的响应数据。在以这种方式实现工具确认时，您可以暂停工具的执行，请求特定信息，然后使用提供的数据恢复工具。

此确认流程包含一个请求阶段，系统组装并发送用户输入请求，以及一个响应阶段，系统接收并处理返回的数据。

### 确认定义 {#confirmation-definition}

创建具有高级确认的工具时，使用 `Tool Context Request Confirmation` 方法，配合 `hint` 和 `payload` 参数：

-   `hint`: 描述性信息，解释所需用户操作。
-   `payload`: 您期望返回的数据结构。该数据必须可以序列化为 JSON 格式的字符串。

有关此方法的完整示例，请参见 [human_tool_confirmation](https://github.com/google/adk-python/blob/fc90ce968f114f84b14829f8117797a4c256d710/contributing/samples/human_tool_confirmation/agent.py) 代码示例]。请记住，在获取确认的过程中，Agent 工作流工具的执行会暂停。确认收到后，您可以访问 `tool_confirmation.payload` 对象中的确认响应，然后继续执行工作流。

以下代码展示了处理员工请假请求工具的示例实现：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
def request_time_off(days: int, tool_context: ToolContext):
    """Request day off for the employee."""
    # ...
    tool_confirmation = tool_context.tool_confirmation
    if not tool_confirmation:
        tool_context.request_confirmation(
            hint=(
                'Please approve or reject the tool call request_time_off() by'
                ' responding with a FunctionResponse with an expected'
                ' ToolConfirmation payload.'
            ),
            payload={
                'approved_days': 0,
            },
        )
        # 返回中间状态，表示工具正在等待
        # 的确认响应：
        return {'status': 'Manager approval is required.'}

    approved_days = tool_confirmation.payload['approved_days']
    approved_days = min(approved_days, days)
    if approved_days == 0:
        return {'status': 'The time off request is rejected.', 'approved_days': 0}
    return {
        'status': 'ok',
        'approved_days': approved_days,
    }
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func requestTimeOff(ctx agent.Context, args RequestTimeOffArgs) (map[string]any, error) {
    confirmation := ctx.ToolConfirmation()
    if confirmation == nil {
        ctx.RequestConfirmation(
            "Please approve or reject the tool call requestTimeOff() by "+
            "responding with a FunctionResponse with an expected "+
            "ToolConfirmation payload.",
            map[string]any{"approved_days": 0},
        )
        return map[string]any{"status": "Manager approval is required."}, nil
    }

    payload := confirmation.Payload.(map[string]any)
    // 在 Go 中，JSON 的 map[string]any 中的值默认是 float64
    approvedDays := int(payload["approved_days"].(float64))
    approvedDays = min(approvedDays, args.Days)

    if approvedDays == 0 {
        return map[string]any{"status": "The time off request is rejected.", "approved_days": 0}, nil
    }

    return map[string]any{
        "status": "ok",
        "approved_days": approvedDays,
    }, nil
}
```

{{% /tab %}}
{{< /tabs >}}
## 使用 REST API 进行远程确认 {#remote-response}

如果没有用于人工确认 Agent 工作流的活动用户界面，您可以通过命令行界面处理确认，或通过电子邮件或聊天应用程序等其他渠道路由确认。要确认工具调用，用户或调用应用程序需要发送一个带有工具确认数据的 `FunctionResponse` 事件。

您可以将请求发送到 ADK API 服务器的 `/run` 或 `/run_sse` 端点，或者直接发送到 ADK Runner。以下示例使用 `curl` 命令将确认发送到 `/run_sse` 端点：

```bash
 curl -X POST http://localhost:8000/run_sse \
 -H "Content-Type: application/json" \
 -d '{
    "app_name": "human_tool_confirmation",
    "user_id": "user",
    "session_id": "7828f575-2402-489f-8079-74ea95b6a300",
    "new_message": {
        "parts": [
            {
                "function_response": {
                    "id": "adk-13b84a8c-c95c-4d66-b006-d72b30447e35",
                    "name": "adk_request_confirmation",
                    "response": {
                        "confirmed": true,
                        "payload": {
                            "approved_days": 5
                        }
                    }
                }
            }
        ],
        "role": "user"
    }
}'
```

基于 REST 的确认响应必须满足以下要求：

- `id` 中的 `function_response` 应与 `adk_request_confirmation` `FunctionCall` 事件中的 `function_call_id` 匹配。
- `name` 应为 `adk_request_confirmation`。
- `response` 对象包含 `confirmed` 状态以及任何额外的 `payload` 数据。

{{% alert context="info" %}}
**注意：带恢复功能的确认**

如果您的 ADK Agent 工作流配置了 [Resume](/docs/adk/run/agent-runtime/resume-agents/) 功能，您还必须在确认响应中包含调用 ID (`invocation_id`) 参数。您提供的调用 ID 必须与生成确认请求的调用相同，否则系统将使用确认响应启动新的调用。如果您的 Agent 使用恢复功能，考虑在确认请求中包含调用 ID 作为参数，以便在响应中包含它。有关使用恢复功能的更多详细信息，请参见 [Resume stopped agents](/docs/adk/run/agent-runtime/resume-agents/)。
{{% /alert %}}
## 已知限制 {#known-limitations}

工具确认功能具有以下限制：

- [DatabaseSessionService（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.sessions.DatabaseSessionService) 不支持此功能。
- [VertexAiSessionService（官方英文）](https://adk.dev/api-reference/python/google-adk.html/#google.adk.sessions.VertexAiSessionService) 不支持此功能。

## 下一步 {#next-steps}

有关构建用于 Agent 工作流的 ADK 工具的更多信息，请参见 [Function tools](/docs/adk/components/custom-tools/function-tools/overview/)。

---

原文：[Get action confirmation for ADK Tools](https://adk.dev/tools-custom/confirmation/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/confirmation.md)
