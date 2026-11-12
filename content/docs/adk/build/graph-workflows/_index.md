---
title: "图工作流"
description: "ADK 中基于图的 Agent 工作流让您可以构建具有更精确控制的 Agent，创建结合代码逻辑和 AI 推理能力的确定性流程。基于图的工作流允许您定义您的 ag"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

ADK 中基于图的 Agent 工作流让你可以更精确地控制 Agent 的构建，创建结合代码逻辑和 AI 推理能力的确定性流程。基于图的工作流允许你将 Agent 逻辑定义为执行节点和边的图，将 AI 驱动的 Agent 推理与确定性工具和代码结合起来。

![基于图的航班升级 Agent](/images/adk/workflow-design.svg)

**图 1.** 用于航班升级的基于图的 Agent 设计，结合了不同类型的工作流节点，包括函数、人工输入、工具和 LLM 功能。

{{% alert context="default" %}}
**在 Kotlin 中为实验性**

基于图的 Agent 工作流功能在 ADK Kotlin 中为实验性功能。它可能存在限制，其行为可能会发生变化。
{{% /alert %}}
预构建 ADK [模板工作流](/docs/adk/build/multi-agent-workflows/template-workflows/)，例如 [顺序 Agent](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/)，仅提供跨一组 Agent 的定义流程控制。你仍然可以继续构建带有长提示、工具的标准 ADK Agent，并在基于图的工作流 Agent 中使用。 当你需要更精确的控制时，工作流 Agent 图可以让你更灵活地控制任务的路由和执行。基于图的工作流提供以下优势：

- **定义精确逻辑：** 明确映射路由逻辑以管理不同节点之间的转换。
- **实现复杂结构：** 构建支持分支和状态管理的 Agent 工作流。
- **无需 AI 运行函数链：** 调用 Agent 工具和自定义代码，而无需调用生成式 AI 模型。
- **增强可靠性：** 通过依赖结构化节点定义而不仅仅依赖提示，提高 Agent 的可预测性。

{{% alert context="info" %}}
**ADK 中的工作流类型**

ADK 提供三种互补的多步骤工作组合方式：

- **基于图的工作流**（本节）：一个具有明确路由的节点和边的声明性图——最适合确定性、结构化的流程。
- **[动态工作流](/docs/adk/build/graph-workflows/dynamic-workflows/)：** 在你自己的代码中进行编程化编排（循环、条件、递归）——当控制流程对于静态图过于复杂或迭代时，最为合适。
- **[预构建工作流 Agent](/docs/adk/build/multi-agent-workflows/template-workflows/)**（顺序、并行、循环）：用于常见模式的高层次构建块，无需自己组装图。
{{% /alert %}}

## 快速开始 {#get-started}

本节介绍如何开始使用基于图的 Agent。以下示例演示如何创建一个顺序的基于图的 Agent 工作流，该工作流生成一个城市名称，通过代码函数查询该城市的当前时间，最终 Agent 报告该信息。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Agent
from google.adk import Workflow
from google.adk import Event
from pydantic import BaseModel

city_generator_agent = Agent(
    name="city_generator_agent",
    model="gemini-flash-latest",
    instruction="""Return the name of a random city.
      Return only the name, nothing else.""",
)

class CityTime(BaseModel):
    time_info: str  # time information
    city: str       # city name

def lookup_time_function(node_input: str):
    """Simulate returning the current time in the specified city."""
    return CityTime(time_info="10:10 AM", city=node_input)

city_report_agent = Agent(
    name="city_report_agent",
    model="gemini-flash-latest",
    input_schema=CityTime,
    instruction="""You receive a CityTime with time_info and city fields.
    Output a single line stating that it is that time in that city right
    now.""",
)

def completed_message_function(node_input: str):
    return Event(
        message=f"{node_input}\n WORKFLOW COMPLETED.",
    )

root_agent = Workflow(
    name="root_agent",
    edges=[
        ("START", city_generator_agent, lookup_time_function,
          city_report_agent, completed_message_function)
    ],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go 中，顺序工作流使用图形引擎：
`workflow.NewFunctionNode` 包装每个步骤，`workflow.Chain` 将节点连接到顺序的 `edges` 切片中。框架会自动通过 `event.Output` 将每个节点的类型化返回值传递给下一个节点——无需写入会话状态。整个图形被包装在 `workflowagent.New` 中，生成标准的 `agent.Agent`。

```go
// cityTime 保存从查找步骤传递到报告步骤的数据。
type cityTime struct {
	City     string
	TimeInfo string
}

// newSequentialGetStarted 使用三节点顺序工作流构建
// v2 图引擎。每个节点都是一个工作流。NewFunctionNode 其返回值
// 会自动包装在 session.Event.Output 中并转发到下一个
// 将节点作为其类型化输入。
//
// 这是 Python 工作流示例的 Go 等价物：
//
//	root_agent = Workflow(
//	    name="root_agent",
//	    edges=[("START", city_generator_agent, lookup_time_function,
//	             city_report_agent，completed_message_function)]，
//	)
func newSequentialGetStarted() (agent.Agent, error) {
	// 第1步：返回一个城市名称。该字符串被设置为 event.Output 并
	// 成为下一个节点的输入类型。
	cityGeneratorNode := workflow.NewFunctionNode("city_generator_agent",
		func(_ agent.Context, _ any) (string, error) {
			return "Tokyo", nil
		},
		workflow.NodeConfig{},
	)

	// 步骤2：接收城市名称并返回结构化时间数据。
	lookupTimeNode := workflow.NewFunctionNode("lookup_time_function",
		func(_ agent.Context, city string) (cityTime, error) {
			return cityTime{City: city, TimeInfo: "10:10 AM"}, nil
		},
		workflow.NodeConfig{},
	)

	// 步骤 3：接收 cityTime 结构并生成最终报告字符串。
	cityReportNode := workflow.NewFunctionNode("city_report_agent",
		func(_ agent.Context, ct cityTime) (string, error) {
			return fmt.Sprintf("It is %s in %s right now.\nWORKFLOW COMPLETED.",
				ct.TimeInfo, ct.City), nil
		},
		workflow.NodeConfig{},
	)

	// 工作流.链路连接 START → 城市生成节点 → 查询时间节点 → 城市报告节点。
	// 数据通过 event.Output 流动：无需写入会话状态。
	return workflowagent.New(workflowagent.Config{
		Name:        "root_agent",
		Description: "Sequential workflow: generate city → look up time → report.",
		Edges:       workflow.Chain(workflow.Start, cityGeneratorNode, lookupTimeNode, cityReportNode),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
此示例代码演示了如何组装一个简单的顺序工作流，并在 Agent 处理和代码执行之间交替进行。虽然你可以使用单个 Agent 通过更长的提示和工具调用来执行这些步骤，但基于图的方式可以让你精确控制任务的执行顺序以及每一步的输出数据。

有关使用基于图的工作流进行数据处理的更多信息，请参见 [使用工作流节点和 Agent 进行数据处理](/docs/adk/build/graph-workflows/data-handling/)。

## 使用图构建流程 {#build-processes-with-graphs}

你可以使用基于提示的 Agent，通过 ADK Agent 的 instructions 字段定义多步骤流程，并描述任务和操作流程。然而，随着你的指令和操作流程变得更长、更复杂，确保 Agent 遵循每一步和每个指南将变得更加复杂且不可靠。

基于图的工作流 Agent 相比基于提示的 Agent 提供了显著优势，它允许你在代码中明确地定义整个流程工作流。在基于图的 Agent 工作流中，流程的每一步都可以定义为图中的执行***节点***，每个节点可以是 AI Agent、工具或你编写的代码。下图说明了一个简单的基于提示的 Agent 如何转换为工作流 Agent 图：

![基于提示的 Agent 到基于图的工作流](/images/adk/prompts-to-graphs.svg)

**图 2.** 基于提示的 Agent 指令转换为基于图的工作流结构。

从基于提示的 Agent 过渡到基于图的工作流 Agent，可以让你显式地分解操作流程中的任务，以定义特定的执行流程。一旦定义完成，Agent 应用程序会按照图中的步骤进行流程，在需要时在非确定性 AI 驱动的 Agent 和确定性代码之间切换。

以下代码示例展示了图 2 中的工作流图如何转换为基于图的 Agent：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
process_message = Agent(
    name="process_message",
    model="gemini-flash-latest",
    instruction="""Classify user message into either "BUG", "CUSTOMER_SUPPORT",
      or "LOGISTICS". If you think a message applies to more than one category,
      reply with a comma separated list of categories.
   """,
)

def router(node_input: str):
    routes = node_input.split(",")
    routes = [route.strip() for route in routes]
    return Event(route=routes)

def response_1_bug():
    return Event(message="Handling bug...")

def response_2_support():
    return Event(message="Handling customer support...")

def response_3_logistics():
    return Event(message="Handling logistics...")

root_agent = Workflow(
   name="routing_workflow",
   edges=[
       ("START", process_message, router),
       ( router,
           {
               "BUG": response_1_bug,
               "CUSTOMER_SUPPORT": response_2_support,
               "LOGISTICS": response_3_logistics,
           }
       )
   ],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go 中，条件路由使用 `workflow.NewEmittingFunctionNode` 来设置 `event.Routes` 和 `workflow.StringRoute` 边以分派到匹配的处理程序——这与 Python 的 `router` 函数和字典分派完全等效。`workflow.Concat` 将链和条件边合并为传递给 `workflowagent.New` 的单个 `edges` 切片。

```go
// classifyMessage 是路由节点。它发出 ev.Routes 来选择哪个
// 要跟随的分支 — Python 的 Go 等价:
//
//	def 路由器(node_input: str):
//	    return Event(route=["BUG"])}
func classifyMessage(ctx agent.Context, msg string, emit func(*session.Event) error) (any, error) {
	// 在实际工作流程中，这一步会调用大型语言模型；在这里我们通过关键词进行分类。
	category := "LOGISTICS"
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "bug") || strings.Contains(lower, "error"):
		category = "BUG"
	case strings.Contains(lower, "help") || strings.Contains(lower, "support"):
		category = "CUSTOMER_SUPPORT"
	}

	ev := session.NewEvent(ctx, ctx.InvocationID())
	ev.Routes = []string{category} // drives edge dispatch
	ev.Output = msg                // forward original message to the chosen handler
	if err := emit(ev); err != nil {
		return nil, err
	}
	return nil, nil // nil suppresses the automatic terminal event
}

// newProcessPipeline 构建一个分类条件路由工作流
// 使用 v2 图引擎。classifyMessage 发射节点设置
// ev.Routes，并且图形引擎通过匹配的处理程序进行分发
// workflow.StringRoute.
//
// 这是 Python 工作流示例的 Go 等价物：
//
//	root_agent = Workflow(
//	    name="routing_workflow",
//	    edges=[
//	        （"START"，process_message，router），
//	        (路由器, {
//	            “BUG”: response_1_bug,
//	            "CUSTOMER_SUPPORT": response_2_support,
//	            "物流": response_3_logistics,
//	        }),
//	    ],
//	)
func newProcessPipeline() (agent.Agent, error) {
	classifyNode := workflow.NewEmittingFunctionNode(
		"process_message", classifyMessage, workflow.NodeConfig{},
	)

	bugNode := workflow.NewFunctionNode("response_1_bug",
		func(_ agent.Context, _ any) (string, error) {
			return "Handling bug...", nil
		},
		workflow.NodeConfig{},
	)

	supportNode := workflow.NewFunctionNode("response_2_support",
		func(_ agent.Context, _ any) (string, error) {
			return "Handling customer support...", nil
		},
		workflow.NodeConfig{},
	)

	logisticsNode := workflow.NewFunctionNode("response_3_logistics",
		func(_ agent.Context, _ any) (string, error) {
			return "Handling logistics...", nil
		},
		workflow.NodeConfig{},
	)

	// workflow.Concat 将顺序链与条件边合并。
	// 每个工作流.Edge 都携带一个工作流.StringRoute 匹配器，该匹配器由引擎使用
	// 检查针对 classifyNode 发出的 ev.Routes。
	edges := workflow.Concat(
		workflow.Chain(workflow.Start, classifyNode),
		[]workflow.Edge{
			{From: classifyNode, To: bugNode, Route: workflow.StringRoute("BUG")},
			{From: classifyNode, To: supportNode, Route: workflow.StringRoute("CUSTOMER_SUPPORT")},
			{From: classifyNode, To: logisticsNode, Route: workflow.StringRoute("LOGISTICS")},
		},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "routing_workflow",
		Description: "Classifies a message and routes it to the appropriate handler.",
		Edges:       edges,
	})
}
```

{{% /tab %}}
{{< /tabs >}}
此示例代码演示了如何组合一系列 Agent 来定义一个图，其中包含一组*节点*之间的路线，这些节点是离散任务，任务可以包括 Agent、工具、您的代码，甚至额外的工作流 Agent。
有关构建高级管道的信息，请参见 [为工作流 Agent 构建图路线](/docs/adk/build/graph-workflows/graph-routes/)。

{{% alert context="success" %}}
**所有 Agent 的全局指令**

使用 `GlobalInstructionPlugin` 在您的 `App`（[Python](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/global_instruction_plugin.py)、[TypeScript](https://github.com/google/adk-js/blob/main/core/src/plugins/global_instruction_plugin.ts)、[Java](https://github.com/google/adk-java/blob/main/core/src/main/java/com/google/adk/plugins/GlobalInstructionPlugin.java)） 或 Agent 的 `GlobalInstruction` 参数（[Go](https://github.com/google/adk-go/blob/main/agent/llmagent/llmagent.go)）上，在整个工作流中应用一致的规则。
{{% /alert %}}

## 已知限制 {#known-limitations}

基于图的工作流存在一些已知限制。它们 *不兼容* 以下 ADK 功能：

-   **集成：** 一些第三方 [集成（官方英文）](https://adk.dev/integrations/) 可能与基于图的工作流不兼容。

{{% alert context="info" %}}
**Go：图工作流 API**

ADK Go 中的 `workflow` 包是 Python `Workflow` 类的直接对应物。使用 `workflow.NewFunctionNode` 和 `workflow.NewAgentNode` 来定义节点，`workflow.Chain` 或 `workflow.Concat` 与 `[]workflow.Edge` 来连接它们，使用 `workflowagent.New` 将图包装为可运行的 Agent。条件路由使用 `workflow.StringRoute`、`workflow.IntRoute` 或 `workflow.BoolRoute` 与 `event.Routes` 匹配。汇聚由 `workflow.NewJoinNode` 处理。
{{% /alert %}}

## 下一步 {#next-steps}

有关高级路由模式及分支/汇合示例，请参见 [为工作流 Agent 构建图路线](/docs/adk/build/graph-workflows/graph-routes/)。对于预构建的更高级替代方案（顺序、并行、循环），请参见 [预构建工作流 Agent](/docs/adk/build/multi-agent-workflows/template-workflows/)。

---

原文：[Graph-based agent workflows](https://adk.dev/graphs/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/index.md)
