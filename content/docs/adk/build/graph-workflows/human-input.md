---
title: "人工输入"
description: "能够请求人工输入以进行数据输入、决策验证或操作许可是许多由 Agent 驱动的工作流的重要组成部分。ADK 中的基于图的工作流可以包含循环中的人工 (HITL) 节点"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

能够请求人工输入以用于数据输入、决策验证或操作许可，是许多 Agent 驱动工作流的重要部分。ADK 中的基于图的工作流可以包含专门为获取人工输入而构建的人工参与（HITL）节点，作为工作流的一部分。这些节点运行时不需要AI（AI）模型，这可以使输入过程更加可预测和可靠。

## 入门 {#get-started}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

您可以使用***RequestInput***类以及用户的文本提示，在图中实现人工输入节点。以下代码示例展示了如何向工作流图中添加人工输入节点：

```python
from google.adk.events import RequestInput
from google.adk import Workflow

def step1(): # Human input step
  yield RequestInput(message="Enter a number:")

def step2(node_input):
  return node_input * 2

root_agent = Workflow(
    name="root_agent",
    edges=[('START', step1, step2)],
)
```

在这个代码示例中，`step1` 会暂停 Agent 的执行，直到系统接收到用户的输入。一旦系统接收到用户输入，该输入会传递到下一个节点。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go 中，人类输入节点会发出带有 `workflow.NewRequestInputEvent` 的请求，并返回 `workflow.ErrNodeInterrupted`。
`step1` 节点会暂停工作流程，直到用户回复。该节点不会再次运行。回复成为其输出，并传递到下一个节点。

```go
// newGraphHITLHandoffWorkflow 演示了人工干预（HITL）交接模式，它
// 与 Python 示例匹配。step1Node 发出 RequestInput 事件并暂停
// 工作流程。RerunOnResume 未设置，因此 step1Node 不会再次运行
// 在简历上。人的回复成为 step1Node 的输出并流向
// 将 step2Node 作为其输入。
func newGraphHITLHandoffWorkflow() (agent.Agent, error) {
	step1Node := workflow.NewEmittingFunctionNode[any, string]("step1",
		func(ctx agent.Context, _ any, emit func(*session.Event) error) (string, error) {
			// 将 InterruptID 留空会自动生成一个新的 UUID。
			if err := emit(workflow.NewRequestInputEvent(ctx, session.RequestInput{
				Message: "Enter a number:",
			})); err != nil {
				return "", err
			}
			return "", workflow.ErrNodeInterrupted
		},
		workflow.NodeConfig{},
	)

	// step2Node 接受任何类型，因为可以解析为 JSON 的回复，例如 "42"
	// 以解码形式到达（此处为 float64）。
	step2Node := workflow.NewFunctionNode("step2",
		func(_ agent.Context, input any) (string, error) {
			return fmt.Sprintf("You entered: %v", input), nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "root_agent",
		Description: "Pauses for a number from the user, then hands it to step2.",
		Edges:       workflow.Chain(workflow.Start, step1Node, step2Node),
	})
}
```

需要在回复后再次运行的节点设为`RerunOnResume` 和
而是`workflow.ResumeOrRequestInput`。更多信息请参见
[动态工作流程中的人类输入](/docs/adk/build/graph-workflows/dynamic-workflows/#human-input)。
{{% /tab %}}
{{< /tabs >}}

## 配置选项 {#configuration-options}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

人工输入节点可以使用以下 ***RequestInput*** 类
配置选项：

- **`message`：** 提供给用户的文本，用于解释人类输入
    请求。
- **`payload`：** 作为人工输入部分的结构化数据
    请求。
- **`response_schema`：** 人类响应必须遵循的数据结构。
{{% /tab %}}
{{% tab tabName="Go" %}}

`session.RequestInput` 携带以下字段，直接映射为
Python 的`RequestInput`参数：

- **`InterruptID`**（`string`）：该暂停点的唯一标识符。
    使用稳定前缀加上UUID，以避免工作流运行间的碰撞。
    相当于 Python 中的隐式中断 ID。
- **`Message`**（`string`）：向用户显示的人类可读提示。
    相当于 Python 的 `message` 参数。
- **`Payload`**（`any`）：与
    提示词，以便客户端能够提供额外的上下文。等价于
    Python 的 `payload` 参数。
- **`ResponseSchema`**（`*jsonschema.Schema`）：可选的JSON模式
    回复必须符合。相当于 Python 的 `response_schema`
    参数。

`workflow.NodeConfig.RerunOnResume`领域控制简历上的内容：

- **`&true`**：节点主体从顶部重新运行;`ResumeOrRequestInput`
    在第二次传递时返回人类的回复。对于
    用 `ResumeOrRequestInput`。
- **`&false`** 或 **`nil`**（叶子默认）：回复路由到
    Node 的后继节点作为输入，绕过被中断的节点。
{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**注：响应模式输入限制**

响应模式不会将人工回复重新格式化以适应指定内容
结构。回复必须已经是那个格式。为了更好的用户
体验，在客户端界面收集结构化数据，或者放置
Agent 节点在暂停后将回复转换为所需格式。
{{% /alert %}}

## 人类输入示例 {#human-input-examples}

以下代码示例展示了更详细的人为输入请求。

### 请求输入并发送消息和有效载荷 {#request-input-with-a-message-and-payload}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}以下代码示例展示了如何构造 ***RequestInput*** 对象
在工作流节点中，包括***有效载荷***和***响应模式***。在
本例中，`ActivitiesList`期望由 Agent 人完成
节点组成活动列表，`get_user_feedback()`节点
请求用户反馈。

```python
class ActivitiesList(BaseModel):
   """Itinerary should be a list of dictionaries for each activity. Each
   activity has a name and a description"""
   itinerary: List[Dict[str, str]]

class UserFeedback(BaseModel):
   """Expected response structure from the user."""
   user_response: str

async def get_user_feedback(node_input: ActivitiesList):
   """
   Retrieves the user's thoughts on the agents initial itinerary in order to
   either expand on, change the list, or exit the loop
   """
   message = (
       f"""
       Here is your recommended base itinerary:\n{node_input}\n\n
       Which of these items appeal to you (if any)?
       """
   )

   yield RequestInput(
       message=message,
       payload=node_input,
        response_schema=UserFeedback,
   )
```

{{% /tab %}}
{{% tab tabName="Go" %}}

以下代码示例展示了一个三节点图：一个构建节点生成结构化行程，一个HITL节点将其作为`Payload`连同提示发送，最后一个节点根据用户反馈采取行动。`Payload`字段允许客户端在用户回应之前呈现完整行程：

```go
// ItineraryItem 表示旅行计划中的单个活动。
type ItineraryItem struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// newItineraryReviewWorkflow 演示了一个图形 HITL 节点，该节点发送一个
// 将结构化的有效负载与输入提示一同提供，以便客户端可以呈现
// 为用户提供的额外上下文。这类似于 Python 的：
//
//	async def 获取用户反馈(node_input: 活动列表):
//	    yield 请求输入(
//	        消息=“哪些物品吸引你？”
//	        payload=node_input,
//	        response_schema=用户反馈,
//	    )
func newItineraryReviewWorkflow() (agent.Agent, error) {
	rerun := true

	// buildItineraryNode：生成行程并将其传递给 HITL
	// 通过 event.Output 将节点作为其类型化的输出。
	buildItineraryNode := workflow.NewFunctionNode("build_itinerary",
		func(_ agent.Context, _ any) ([]ItineraryItem, error) {
			return []ItineraryItem{
				{Name: "Eiffel Tower", Description: "Iconic iron lattice tower."},
				{Name: "Louvre Museum", Description: "World's largest art museum."},
				{Name: "Seine River Cruise", Description: "Scenic boat tour of Paris."},
			}, nil
		},
		workflow.NodeConfig{},
	)

	// reviewNode：将行程作为有效负载与提示一起发送，因此
	// 客户端可以显示它。恢复时，会返回人类的选择。
	reviewNode := workflow.NewEmittingFunctionNode[[]ItineraryItem, string]("get_user_feedback",
		func(ctx agent.Context, itinerary []ItineraryItem, emit func(*session.Event) error) (string, error) {
			reply, err := workflow.ResumeOrRequestInput(ctx, emit, session.RequestInput{
				InterruptID: "itinerary_review",
				Message:     fmt.Sprintf("Here is your recommended itinerary (%d activities). Which items appeal to you?", len(itinerary)),
				Payload:     itinerary, // structured payload rendered by the client
			})
			if err != nil {
				// 第一次执行时 ErrNodeInterrupted — 工作流程在此暂停。
				return "", err
			}
			feedback, _ := reply.(string)
			return feedback, nil
		},
		workflow.NodeConfig{RerunOnResume: &rerun},
	)

	// finalNode：接收用户的反馈并生成确认。
	finalNode := workflow.NewFunctionNode("finalize",
		func(_ agent.Context, feedback string) (string, error) {
			return fmt.Sprintf("Itinerary finalised with your feedback: %q", feedback), nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "concierge_workflow",
		Description: "Builds an itinerary, asks the user for feedback, then finalises.",
		Edges:       workflow.Chain(workflow.Start, buildItineraryNode, reviewNode, finalNode),
	})
}
```

{{% /tab %}}
{{< /tabs >}}

## 工具确认：LLM Agent 中的审批提示 {#tool-confirmation-approval-prompts-in-llm-agents}

工具确认是一个独立的、位于 LLM Agent 级别的用于是/否审批提示的机制。与图形 HITL 节点不同，工具确认在 `llmagent` 工具功能内工作，而不是作为独立的图形节点。当你希望 LLM Agent 在执行特定工具调用之前暂停并询问审批时，它非常有用。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

将工具包裹在 ***FunctionTool*** 中，并设置 `require_confirmation=True` 以便在工具运行前进行静态的是/否审批，或者在工具内部调用 `tool_context.request_confirmation()` 以显示自定义提示信息。ADK 仅在 `require_confirmation=True` 路径上为你拒绝调用，因此一个要求自身确认的工具必须同时检查：`tool_context.tool_confirmation` 以请求一次，然后 `tool_confirmation.confirmed` 处理拒绝：

```python
from google.adk.agents import Agent
from google.adk.tools import FunctionTool, ToolContext

def book_flight(flight_id: str) -> str:
   """Books the selected flight."""
   ...

def refund(amount: float, tool_context: ToolContext) -> str:
   """Refunds an order."""
   if not tool_context.tool_confirmation:
       tool_context.request_confirmation(
           hint=f"Approve a refund of {amount}?"
       )
       return "Waiting for approval."
   elif not tool_context.tool_confirmation.confirmed:
       return "Refund rejected by user."
   ...

root_agent = Agent(
   name="concierge",
   model="gemini-flash-latest",
   tools=[FunctionTool(book_flight, require_confirmation=True), refund],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 `functiontool.Config` 中设置 `RequireConfirmation: true`，以在工具执行之前进行静态的是/否批准，或者从工具内部调用 `ctx.RequestConfirmation` 以显示自定义提示信息：

```go
// DoubleNumberArgs 保存 doubleNumber 工具的输入。
type DoubleNumberArgs struct {
	Number int `json:"number" jsonschema:"The number to double."`
}

// DoubleNumberResults 保存 doubleNumber 工具的输出。
type DoubleNumberResults struct {
	Result int `json:"result"`
}

// doubleNumber 是一个可以将给定数字加倍的工具。
// 因为 RequireConfirmation 为真，框架会自动暂停
// 执行并在之前向客户端发出“adk_request_confirmation”事件
// 运行该工具。客户端必须回复一个确认的 FunctionResponse
// 或者否认该行为。
func doubleNumber(_ agent.Context, args DoubleNumberArgs) (DoubleNumberResults, error) {
	return DoubleNumberResults{Result: args.Number * 2}, nil
}

// newSimpleHITLAgent 创建一个带有始终需要工具的 LLM Agent
// 在执行之前的用户确认（工具-确认模式）。
func newSimpleHITLAgent(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %w", err)
	}

	doubleNumberTool, err := functiontool.New(
		functiontool.Config{
			Name:                "double_number",
			Description:         "Doubles the given number. Requires user approval before running.",
			RequireConfirmation: true,
		},
		doubleNumber,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create tool: %w", err)
	}

	return llmagent.New(llmagent.Config{
		Name:        "double_number_agent",
		Model:       model,
		Instruction: "You are a helpful assistant. When asked to double a number, use the double_number tool.",
		Tools:       []tool.Tool{doubleNumberTool},
	})
}
```

对于具有手动重新输入处理的自定义提示：

```go
// BookFlightArgs 保存了 bookFlight 工具的输入。
type BookFlightArgs struct {
	Origin      string `json:"origin"      jsonschema:"Departure airport code."`
	Destination string `json:"destination" jsonschema:"Arrival airport code."`
	Date        string `json:"date"        jsonschema:"Travel date in YYYY-MM-DD format."`
}

// BookFlightResults 保存了 bookFlight 工具的结果。
type BookFlightResults struct {
	Status        string `json:"status"`
	ConfirmNumber string `json:"confirm_number,omitempty"`
}

// bookFlight 是一个在完成之前暂停以等待人工批准的工具
// 预订（带有自定义提示消息的工具确认模式）。
func bookFlight(ctx agent.Context, args BookFlightArgs) (BookFlightResults, error) {
	if confirmation := ctx.ToolConfirmation(); confirmation != nil {
		if !confirmation.Confirmed {
			return BookFlightResults{Status: "Booking cancelled by user."}, nil
		}
		return BookFlightResults{
			Status:        "Booking confirmed.",
			ConfirmNumber: "FLT-20251031",
		}, nil
	}

	hint := fmt.Sprintf(
		"The agent wants to book a flight from %s to %s on %s. Do you approve?",
		args.Origin, args.Destination, args.Date,
	)
	if err := ctx.RequestConfirmation(hint, nil); err != nil {
		return BookFlightResults{}, fmt.Errorf("failed to request confirmation: %w", err)
	}
	return BookFlightResults{Status: "Awaiting user approval."}, nil
}

// newHITLWithHintAgent 创建了一个 LLM Agent，其 bookFlight 工具是手动的
// 请求带有描述性提示的确认（工具-确认模式）。
func newHITLWithHintAgent(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %w", err)
	}

	bookFlightTool, err := functiontool.New(
		functiontool.Config{
			Name:        "book_flight",
			Description: "Books a flight between two airports on a given date.",
		},
		bookFlight,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create tool: %w", err)
	}

	return llmagent.New(llmagent.Config{
		Name:        "flight_booking_agent",
		Model:       model,
		Instruction: "You are a flight booking assistant. Help the user book flights.",
		Tools:       []tool.Tool{bookFlightTool},
	})
}
```

{{% /tab %}}
{{< /tabs >}}
有关完整的工具确认工作流程，包括动态确认以及客户端如何回复，请参见
[获取 ADK 工具的操作确认](/docs/adk/components/custom-tools/function-tools/action-confirmations/)。

---

原文：[Human input for agent workflows](https://adk.dev/graphs/human-input/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/human-input.md)
