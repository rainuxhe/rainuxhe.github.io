---
title: "数据处理"
description: "在 Agent 和基于图的节点之间构建和管理数据对于使用 ADK 构建可靠的流程至关重要。本指南解释了基于图的工作流和协作 Agent 中的数据处理，包括"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v2.0.0， Go v2.0.0。

在 Agent 与基于图的节点之间结构化和管理数据至关重要
用于用 ADK 构建可靠的流程。本指南解释数据处理
在基于图的工作流程和协作 Agent 中，包括信息的
在图节点之间传输和接收。它涵盖了本质
传递数据、内容和状态的参数，并解释了如何实现
功能节点和 Agent 节点使用数据格式的结构化数据传输
模式和特定指令语法。

## 工作流程数据流 {#workflow-data-flow}

在基于图的工作流程中，节点通过以下步骤传递数据
事件。一步将其输出写入命名事件字段，下一步
接收到它作为其类型输入。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 Python 中，数据通过 ***Events*** 在图节点之间交换。密钥
节点数据处理参数如下：

- **`output`**：用于在*节点*之间传递信息的参数。
- **`message`**：作为对用户的响应而设计的数据。
- **`state`**：通过***事件*** 自动在节点间持久化的数据
    整个 ADK 疗程中。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go v2.0.0中，数据传递机制取决于 Agent 样式
你使用：

**工作流程包**（`FunctionNode`、`AgentNode`、`DynamicNode`）：节点
通过`session.Event`字段进行通信，与 Python 非常相似：

- **`Event.Output`**：节点的返回值，由
    当`FunctionNode`返回非`*genai.Content`值时，框架。
    后继节点将此作为其类型化的`input`参数接收。
- **`Event.Routes`**：路由路由节点显式设置为
    选择要遵循哪个条件边——就是 的
    Python 的`Event(route=...)`。
- **`Event.NodeInfo`**：调度器元数据（`path`，`MessageAsOutput`，
    `OutputFor`）。由工作流引擎设置;节点不负责设置此项
    直接。

**预建工作流 Agent**（`sequentialagent`，`parallelagent`，
`loopagent`）：这些 Agent 通过会话状态进行通信：

- **`OutputKey`** 在 `llmagent.Config`：框架写入 Agent 的
    每回合结束后，`state[OutputKey]`的最终文本回复。
- **`ctx.Session().State().Set` / `.Get`**：任意写入或读取
    自定义代码中的状态值。
- **`{key}` in `Instruction`**：框架替代`state["key"]`
    在叫模特之前，先进入提示词。

状态键可能带有控制其生命周期和作用域的前缀：| 前缀常量 | 前缀字符串 | 范围 |
|---|---|---|
| `session.KeyPrefixApp` | `"app:"` | 在应用程序中对所有用户和会话共享 |
| `session.KeyPrefixUser` | `"user:"` | 与用户绑定，在他们的会话中共享 |
| `session.KeyPrefixTemp` | `"temp:"` | 在当前调用结束后丢弃 |
| *(无)* | — | 在会话生命周期内持续存在 |
{{% /tab %}}
{{< /tabs >}}
### 节点输出 {#node-output}

工作流中的每个步骤都会为其后继步骤生成输出。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 ***return*** 或 ***yield*** 语法将数据传递给下一个节点：

```python
from google.adk import Event

def my_function_node(node_input: str):
    output_value = node_input.upper()
    return Event(output=output_value) # "THE RESULT"
```

在输出不需要额外处理的 ***Event*** 数据时，请使用 ***return*** 语法。当发出需要额外处理的数据，或者如果你正在生成多个数据项时，可以使用多个 ***yield*** 命令。每次 ***yield*** 调用都会发出一个单独的 ***Event***，但这些事件中只有一个可以携带 `output`，并且该单个值会被图的下一个节点接收。没有参数的 ***return*** 或 ***yield*** 命令会将 `None` 值传递给下一个节点。
{{% /tab %}}
{{% tab tabName="Go" %}}

**workflow package**：一个 `FunctionNode` 简单地返回一个类型化的 Go 值。框架会自动将返回值包装在 `session.Event` 中并设置 `Event.Output`。下一个节点会将此值作为其类型化的 `input` 参数接收——无需手动构建事件：

```go
// newEventOutputPipeline 演示了
// 工作流包节点的数据传递主要机制：FunctionNode 返回一个类型化的 Go 值，而
// 框架会自动将 event.Output 设置为该值。后续节点
// 会将其作为类型化的 `input` 参数接收。
//
// 这完全镜像了 Python 的模式：
//
//	def 我的函数节点(节点输入: str):
//	    return Event(output=node_input.upper())
//
// 在 Go 中，函数只需返回该值——无需构造 Event。
func newEventOutputPipeline() (agent.Agent, error) {
	upperFn := func(_ agent.Context, input string) (string, error) {
		return strings.ToUpper(input), nil
	}

	suffixFn := func(_ agent.Context, input string) (string, error) {
		return input + " IS AWESOME!", nil
	}

	nodeA := workflow.NewFunctionNode("upper", upperFn, workflow.NodeConfig{})
	nodeB := workflow.NewFunctionNode("suffix", suffixFn, workflow.NodeConfig{})

	// workflow.Chain 将 START → nodeA → nodeB 连接起来。nodeA 的输出
	// 通过 event.Output 作为类型化的输入传递给 nodeB。
	return workflowagent.New(workflowagent.Config{
		Name:        "event_output_pipeline",
		Description: "Demonstrates Event.Output data flow between FunctionNodes.",
		Edges:       workflow.Chain(workflow.Start, nodeA, nodeB),
	})
}
```

**预构建工作流 Agent**：在 `llmagent.Config` 上使用 `OutputKey` 将 Agent 的文本响应保存到会话状态，然后在下游 Agent 的 `Instruction` 模板中使用 `{key}` 引用它：

```go
// newOutputKeyPipeline 演示了预构建的 OutputKey 机制
// 顺序 Agent。当在 llmagent.Config 上设置 OutputKey 时，该框架
// 自动将 Agent 的最终文本响应写入会话状态下
// 那个密钥。下游 Agent 通过在他们的指令中引用 {key} 来读取它。
//
// 此模式适用于 sequentialagent / parallelagent / loopagent。
// 对于工作流包（FunctionNode / AgentNode），请改用 Event.Output。
func newOutputKeyPipeline(ctx context.Context, geminiModel model.LLM) (agent.Agent, error) {
	step1, err := llmagent.New(llmagent.Config{
		Name:        "step_1",
		Model:       geminiModel,
		Description: "Transforms the user's text.",
		Instruction: "Convert the user's message to uppercase. Output only the transformed text.",
		OutputKey:   "upper_result",
	})
	if err != nil {
		return nil, fmt.Errorf("step1: %w", err)
	}

	step2, err := llmagent.New(llmagent.Config{
		Name:        "step_2",
		Model:       geminiModel,
		Description: "Reports the transformed text.",
		Instruction: "The transformed text is: {upper_result}. Report it to the user.",
	})
	if err != nil {
		return nil, fmt.Errorf("step2: %w", err)
	}

	return sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:      "output_key_pipeline",
			SubAgents: []agent.Agent{step1, step2},
		},
	})
}
```

{{% /tab %}}
{{< /tabs >}}
### 节点输出：传递结构化数据 {#node-output-passing-structured-data}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

您可以以可序列化格式传递更长的结构化数据：

```python
def my_function_node_3():
    yield Event(
        output={
            "city_name": "Paris",
            "city_time": "10:10 AM",
        },
    )
```

{{% alert context="warning" %}}
**注意：Event.output 限制**

节点每次执行只允许输出一个 ***Event.output*** 数据负载。此限制意味着，虽然你可以在一个节点中使用多个 ***yield***，但如果有两个或更多包含 ***Event.output*** 的 ***yield*** 命令，将导致运行时错误。
{{% /alert %}}
{{% /tab %}}
{{% tab tabName="Go" %}}

**工作流包**：一个 `FunctionNode` 可以返回任何可 JSON 序列化的 Go 结构体。框架会将其序列化为 `Event.Output`，然后再反序列化为后续节点的类型化 `input` 参数。没有单个负载的限制——每个节点恰好有一个类型化的返回值：

```go
// newStructuredOutputPipeline 显示了如何将结构体从一个 FunctionNode 传递
// 到另一个。该框架将返回值序列化到 event.Output 并
// 将其反序列化回继任者的类型化输入参数。
//
// 这是 Go 的等效写法：
//
//	class CityTime(BaseModel):
//	    time_info: 字符串
//	    城市：字符串
//
//	def 查询时间函数(城市: str):
//	    返回 Event(output=CityTime(time_info="10:10 AM", city=city))
//
//	def 城市报告(节点输入: 城市时间):
//	    return Event(output=f"现在{node_input.city}的时间是{node_input.time_info}。")
type CityTime struct {
	TimeInfo string `json:"time_info"`
	City     string `json:"city"`
}

func newStructuredOutputPipeline(ctx context.Context, geminiModel model.LLM) (agent.Agent, error) {
	lookupTimeFn := func(_ agent.Context, city string) (CityTime, error) {
		// 模拟查看该城市的当前时间。
		return CityTime{TimeInfo: "10:10 AM", City: city}, nil
	}

	cityReportAgent, err := llmagent.New(llmagent.Config{
		Name:        "city_report_agent",
		Model:       geminiModel,
		Description: "Reports the city and current time from the previous node's output.",
		// 当作为 AgentNode 包装时，前驱的 event.Output
		// 作为 Agent 的用户内容传送。{key} 模板
		// 不需要语法 — 结构体字段是内联提供的。
		Instruction: "Report the city time information you received in a friendly sentence.",
	})
	if err != nil {
		return nil, fmt.Errorf("cityReportAgent: %w", err)
	}

	lookupTimeNode := workflow.NewFunctionNode("lookup_time", lookupTimeFn, workflow.NodeConfig{})
	cityReportNode, err := workflow.NewAgentNode(cityReportAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("NewAgentNode: %w", err)
	}

	return workflowagent.New(workflowagent.Config{
		Name:      "city_time_pipeline",
		Edges:     workflow.Chain(workflow.Start, lookupTimeNode, cityReportNode),
		SubAgents: []agent.Agent{cityReportAgent},
	})
}
```

**预构建工作流 Agent**：使用多个 `OutputKey` 值，每个 Agent 一个，以在会话状态中存储各自的字段。下游 Agent 通过他们的 `Instruction` 中的 `{key}` 独立读取每个字段。{{% /tab %}}
{{< /tabs >}}
### 路由输出 {#routing-output}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 ***Event*** 的 `route` 参数来驱动条件边缘分发：

```python
def router(node_input: str):
    return Event(route="BUG")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

**工作流包**：一个发出 `FunctionNode` 构造直接生成 `session.Event`，设置 `Event.Routes` 为期望的路由键，并设置 `Event.Output` 将负载转发给后继。工作流引擎在调度时读取 `Event.Routes` 以选择匹配的边：

```go
// classifyAndRoute 显示了如何在 event.Output 的同时设置 event.Routes
// 一个发射的 FunctionNode。该函数直接构建一个 session.Event，
// 设置 Routes 以选择条件边，并设置 Output 以转发
// 将有效载荷传递到后继节点。
//
// 这反映了 Python 的模式：
//
//	def 路由器(node_input: str):
//	    return Event(route="BUG")
func classifyAndRoute(ctx agent.Context, msg string, emit func(*session.Event) error) (any, error) {
	category := classifyMessage(msg)

	ev := session.NewEvent(ctx, ctx.InvocationID())
	ev.Routes = []string{category} // drives edge dispatch
	ev.Output = msg                // forwarded as typed input to the successor
	if err := emit(ev); err != nil {
		return nil, err
	}
	return nil, nil // nil suppresses the automatic terminal event
}

func classifyMessage(msg string) string {
	switch {
	case strings.Contains(strings.ToLower(msg), "bug"):
		return "BUG"
	case strings.Contains(strings.ToLower(msg), "help"):
		return "CUSTOMER_SUPPORT"
	default:
		return "LOGISTICS"
	}
}

func newRoutingPipeline() (agent.Agent, error) {
	classifyNode := workflow.NewEmittingFunctionNode("classify", classifyAndRoute, workflow.NodeConfig{})

	bugHandler := workflow.NewFunctionNode("bug_handler",
		func(_ agent.Context, msg string) (string, error) {
			return "Handling bug: " + msg, nil
		}, workflow.NodeConfig{})

	supportHandler := workflow.NewFunctionNode("support_handler",
		func(_ agent.Context, msg string) (string, error) {
			return "Handling support: " + msg, nil
		}, workflow.NodeConfig{})

	logisticsHandler := workflow.NewFunctionNode("logistics_handler",
		func(_ agent.Context, msg string) (string, error) {
			return "Handling logistics: " + msg, nil
		}, workflow.NodeConfig{})

	edges := workflow.Concat(
		workflow.Chain(workflow.Start, classifyNode),
		[]workflow.Edge{
			{From: classifyNode, To: bugHandler, Route: workflow.StringRoute("BUG")},
			{From: classifyNode, To: supportHandler, Route: workflow.StringRoute("CUSTOMER_SUPPORT")},
			{From: classifyNode, To: logisticsHandler, Route: workflow.StringRoute("LOGISTICS")},
		},
	)
	return workflowagent.New(workflowagent.Config{
		Name:        "routing_pipeline",
		Description: "Classifies and routes a message using Event.Routes.",
		Edges:       edges,
	})
}
```

{{% /tab %}}
{{< /tabs >}}
### 面向用户的消息 {#user-facing-messages}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 ***Event*** 的 ***message*** 参数向用户发送响应，而不是将数据传递到下一个节点：

```python
async def user_message(node_input: str):
  """Tell user research process is starting."""
  yield Event(message="Beginning research process...")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

**工作流包**：要发出用户可见的消息而不推进节点的类型输出，请在通过 `emit` 回调在 `EmittingFunctionNode` 中发出的中间事件上设置 `Event.Content`。终端返回值（或 `nil`）控制 `Event.Output`。

**预构建工作流 Agent**：任何 `llmagent` 步骤都会自动将其模型响应作为面向用户的事件发出。对于非 LLM 步骤，在 `agent.Agent` 上编写自定义 `Run` 函数，该函数生成事件，其 `LLMResponse.Content` 包含文本。
{{% /tab %}}
{{< /tabs >}}
### 会话状态与状态作用域 {#session-state-and-state-scopes}

会话状态可在会话中的不同回合之间保留数据。它是预构建工作流 Agent 的主要数据共享机制，无论使用哪种 Agent 风格，工具和回调中也可以访问。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 ***Event*** 的 ***state*** 参数在节点之间维护值。节点可以修改状态值，修改后的状态值可用于下游节点：

```python
async def init_state_node(attempts: int = 0):
  yield Event(
      state={
          "attempts": attempts,
      },
  )

async def task_attempt_node(node_input, attempts: int):
  yield Event(
      state={
          "attempts": attempts + 1,
      },
  )

async def read_state_node(ctx: Context):
  print(f"attempts state: {ctx.state['attempts']}") # attempts state: 1

root_agent = Workflow(
    name="root_agent",
    edges=[("START", init_state_node, task_attempt_node, read_state_node)],
)
```

{{% alert context="warning" %}}
**注意：`state` 属性数据限制**

状态参数*不应用于在节点之间持久化大量数据*。在工作流的生命周期中，应使用 Artifact 或其他数据持久化机制，例如数据库工具，来持久化大量数据资源。
{{% /alert %}}
{{% /tab %}}
{{% tab tabName="Go" %}}

状态通过 `ctx.Session().State().Set(key, value)` 写入，通过 `.Get(key)` 读取。`session` 包定义了与 Python 状态参数相同生命周期范围映射的前缀常量。此模式适用于预构建工作流 Agent，以及任何 Agent 样式中的工具和回调：

```go
// stateScopes 显示了会话状态键前缀如何控制生命周期和
// 存储值的可见性。此模式适用于预建工作流
// Agent（顺序 Agent / 并行 Agent / 循环 Agent）以及工具和
// 回调。对于工作流包（FunctionNode / AgentNode），优先
// 通过 Event.Output 直接返回值。
//
// 可用前缀：
//
//	session.KeyPrefixApp（"app:"）– 在所有用户和会话之间共享
//	session.KeyPrefixUser（"user:"）– 与用户相关，在多个会话中共享
//	session.KeyPrefixTemp（"temp:"）– 在当前调用后被丢弃
//
// 没有前缀的键在会话期间持续存在。
func stateScopes(ctx agent.Context) error {
	st := ctx.Session().State()

	// 会话范围（无前缀）——在此会话期间持续存在。
	if err := st.Set("attempts", 0); err != nil {
		return fmt.Errorf("state.Set attempts: %w", err)
	}

	// 应用范围 — 在此应用的所有用户和会话中共享。
	if err := st.Set(session.KeyPrefixApp+"global_counter", 42); err != nil {
		return fmt.Errorf("state.Set app:global_counter: %w", err)
	}

	// 用户范围 — 在属于该用户的所有会话中共享。
	if err := st.Set(session.KeyPrefixUser+"login_count", 1); err != nil {
		return fmt.Errorf("state.Set user:login_count: %w", err)
	}

	// 临时作用域——在此调用结束后被丢弃。
	if err := st.Set(session.KeyPrefixTemp+"scratch", "ephemeral"); err != nil {
		return fmt.Errorf("state.Set temp:scratch: %w", err)
	}

	return nil
}
```

{{% alert context="warning" %}}
**注意：状态数据限制**

会话状态是一个轻量级的键值存储。不要使用它来持久化
大型负载，例如文件内容或二进制数据。请改用 ADK Artifact
或外部存储工具。
{{% /alert %}}
{{% alert context="success" %}}
**工作流包：推荐使用 Event.Output 而非状态**

对于 `workflow` 包（`FunctionNode`、`AgentNode`、`DynamicNode`），
通过返回类型化值在节点之间传递数据 —— 框架会自动设置
`Event.Output`。仅在需要与工具、回调或 Agent
`Instruction` 模板共享值时使用 `State().Set`。
{{% /alert %}}
{{% /tab %}}
{{< /tabs >}}
## 使用模式约束节点数据 {#constrain-node-data-with-schemas}

您可以设置输入和输出数据模式，以约束任何 Agent 节点
接受和生成的数据格式。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 `input_schema` 和 `output_schema` 结合继承
***BaseModel*** 的类来约束任何 Agent 的输入和输出：

```python
from datetime import date

from google.adk import Agent
from pydantic import BaseModel

class FlightSearchInput(BaseModel):
    origin: str           # Airport code "SFO"
    destination: str      # Airport code "CDG"
    departure_date: date  # date(2026, 3, 15)
    passengers: int = 1   # Number of passengers

class Flight(BaseModel):
    carrier: str
    price: float

def search_flights_api(
    origin: str, destination: str, departure_date: date, passengers: int
) -> list[dict]:
    """Look up flights with your own flight-search provider."""
    ...

class FlightSearchOutput(BaseModel):
    flights: list[Flight]
    cheapest_price: float

flight_searcher = Agent(
    name="flight_searcher",
    instruction="Search for available flights.",
    input_schema=FlightSearchInput,
    output_schema=FlightSearchOutput,
    tools=[search_flights_api],
    mode="single_turn",
    ...
)

assistant = Agent(
    name="assistant",
    instruction="You help users plan trips.",
    sub_agents=[flight_searcher],
    ...
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

**工作流包**：使用 `workflow.NewAgentNodeTyped[Input, Output]` 将模式附加到 Agent 节点。通用类型参数会自动反映到 `*jsonschema.Schema` 中——无需手动构建模式。节点的 `Event.Output` 将结构化结果传递到后续节点——无需 `OutputKey` 或状态写入：

```go
// FlightSearchInput 是航班搜索 Agent 节点的类型化输入模式。
// workflow.NewAgentNodeTyped[FlightSearchInput, FlightSearchOutput] 反映
// 将这些结构自动转换为 *jsonschema.Schema —— 无需手工构建的模式
// 需要施工。
type FlightSearchInput struct {
	Origin        string `json:"origin"         jsonschema:"Departure airport code e.g. SFO"`
	Destination   string `json:"destination"    jsonschema:"Arrival airport code e.g. CDG"`
	DepartureDate string `json:"departure_date" jsonschema:"Travel date in YYYY-MM-DD format"`
}

// FlightSearchOutput 是航班搜索 Agent 节点的类型化输出模式。
type FlightSearchOutput struct {
	CheapestPrice string `json:"cheapest_price" jsonschema:"Cheapest available fare e.g. $450"`
	FlightCount   string `json:"flight_count"   jsonschema:"Number of matching flights found"`
}

// newSchemaAgentPipeline 演示了 workflow.NewAgentNodeTyped，它可以推断
// *jsonschema.Schema 来自通用类型参数。这是 Go 的等价物
// Python 的：
//
//	flight_searcher = Agent(
//	    input_schema=FlightSearchInput,
//	    output_schema=FlightSearchOutput,
//	    ...
//	)
//
// 该节点的 event.Output 将结构化结果传递给后续节点 —
// 不需要 OutputKey 或状态写入。
func newSchemaAgentPipeline(ctx context.Context, geminiModel model.LLM) (agent.Agent, error) {
	flightSearchAgent, err := llmagent.New(llmagent.Config{
		Name:        "flight_searcher",
		Model:       geminiModel,
		Description: "Searches for available flights and returns structured results.",
		Instruction: `You are a flight-search assistant. Respond ONLY with a JSON object.`,
	})
	if err != nil {
		return nil, fmt.Errorf("flightSearchAgent: %w", err)
	}

	synthAgent, err := llmagent.New(llmagent.Config{
		Name:        "trip_assistant",
		Model:       geminiModel,
		Description: "Summarises flight search results for the user.",
		Instruction: `You help users plan trips. Summarise the flight result you received.`,
	})
	if err != nil {
		return nil, fmt.Errorf("synthAgent: %w", err)
	}

	// NewAgentNodeTyped[In, Out] 反映 FlightSearchInput 和 FlightSearchOutput
	// 自动转换为 *jsonschema.Schema。该节点强制执行输入模式
	// 并将模型的回复限制为输出模式的形状。
	flightNode, err := workflow.NewAgentNodeTyped[FlightSearchInput, FlightSearchOutput](flightSearchAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("flightNode: %w", err)
	}

	synthNode, err := workflow.NewAgentNode(synthAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("synthNode: %w", err)
	}

	return workflowagent.New(workflowagent.Config{
		Name:      "flight_booking_pipeline",
		Edges:     workflow.Chain(workflow.Start, flightNode, synthNode),
		SubAgents: []agent.Agent{flightSearchAgent, synthAgent},
	})
}
```

**预构建工作流 Agent**：在 `llmagent.Config` 上设置 `InputSchema` 和 `OutputSchema`。`OutputSchema` 强制模型以与模式匹配的 JSON 对象回复（当 `OutputSchema` 设置时，Agent 无法使用工具）。使用 `OutputKey` 将 JSON 字符串保存到状态，以便下游 Agent 通过其 `{key}` 在 `Instruction` 中引用。{{% /tab %}} {{< /tabs >}} ## 在 Agent 中访问结构化数据 {{< tabs tabTotal="2" >}} {{% tab tabName="Python" %}} 在 Agent 上使用 `input_schema` 来验证前一个节点的结构化输出，并将其作为 Agent 的输入提供。在指令中按名称引用该输入的字段：

```python
class CityTime(BaseModel):
    time_info: str  # time information
    city: str       # city name

def lookup_time_function(node_input: str):
    """Simulate returning the current time in the specified city."""
    return Event(output=CityTime(time_info='10:10 AM', city=node_input))

city_report_agent = Agent(
    name="city_report_agent",
    model="gemini-flash-latest",
    input_schema=CityTime,
    instruction="""
        You receive a CityTime with time_info and city fields. Reply with a
        single sentence stating that it is that time in that city right now.
    """,
)

root_agent = Workflow(
    name="root_agent",
    edges=[
        ("START", city_generator_agent, lookup_time_function, city_report_agent)
    ],
)
```

支持的花括号 `{key}` 占位符由 *会话状态* 替换，而不是由节点输入替换，因此像 `{CityTime.time_info}` 这样的占位符会在提示中原样保留。要将值模板化到指令中，首先用 `output_key` 或 `Event(state=...)` 写入状态，然后将其引用为 `{time_info}`。{{% /tab %}} {{% tab tabName="Go" %}}

在 ADK Go v2.0.0 中，`FunctionNode` 会返回一个已类型化的结构体，框架将其序列化为 `Event.Output`。继任的 `AgentNode` 将结构体作为其用户内容接收 — 结构体字段可供 Agent 的 `Instruction` 使用，无需任何 `{key}` 模板语法。这与 Python 的 `input_schema=CityTime` 直接等效：在两种语言中，结构体字段作为已类型化的输入提供，而不是从状态中按名称查找。

```go
// newStructuredOutputPipeline 显示了如何将结构体从一个 FunctionNode 传递
// 到另一个。该框架将返回值序列化到 event.Output 并
// 将其反序列化回继任者的类型化输入参数。
//
// 这是 Go 的等效写法：
//
//	class CityTime(BaseModel):
//	    time_info: 字符串
//	    城市：字符串
//
//	def 查询时间函数(城市: str):
//	    返回 Event(output=CityTime(time_info="10:10 AM", city=city))
//
//	def 城市报告(节点输入: 城市时间):
//	    return Event(output=f"现在{node_input.city}的时间是{node_input.time_info}。")
type CityTime struct {
	TimeInfo string `json:"time_info"`
	City     string `json:"city"`
}

func newStructuredOutputPipeline(ctx context.Context, geminiModel model.LLM) (agent.Agent, error) {
	lookupTimeFn := func(_ agent.Context, city string) (CityTime, error) {
		// 模拟查看该城市的当前时间。
		return CityTime{TimeInfo: "10:10 AM", City: city}, nil
	}

	cityReportAgent, err := llmagent.New(llmagent.Config{
		Name:        "city_report_agent",
		Model:       geminiModel,
		Description: "Reports the city and current time from the previous node's output.",
		// 当作为 AgentNode 包装时，前驱的 event.Output
		// 作为 Agent 的用户内容传送。{key} 模板
		// 不需要语法 — 结构体字段是内联提供的。
		Instruction: "Report the city time information you received in a friendly sentence.",
	})
	if err != nil {
		return nil, fmt.Errorf("cityReportAgent: %w", err)
	}

	lookupTimeNode := workflow.NewFunctionNode("lookup_time", lookupTimeFn, workflow.NodeConfig{})
	cityReportNode, err := workflow.NewAgentNode(cityReportAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("NewAgentNode: %w", err)
	}

	return workflowagent.New(workflowagent.Config{
		Name:      "city_time_pipeline",
		Edges:     workflow.Chain(workflow.Start, lookupTimeNode, cityReportNode),
		SubAgents: []agent.Agent{cityReportAgent},
	})
}
```

{{% /tab %}}
{{< /tabs >}}
有关此工作流程的完整示例，请参见
[基于图的 Agent 工作流程](/docs/adk/build/graph-workflows/#get-started)。

---

原文：[Data handling for agent workflows](https://adk.dev/graphs/data-handling/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/data-handling.md)
