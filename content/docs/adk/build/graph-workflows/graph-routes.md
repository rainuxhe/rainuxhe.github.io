---
title: "图路由"
description: "ADK 中基于图的工作流将 Agent 逻辑定义为执行节点和边的图，允许您构建结合AI（AI）推理和代码逻辑的更可靠流程。这些工作流 a"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

ADK 中的基于图的工作流将 Agent 逻辑定义为执行节点和边的图，从而使您可以构建结合AI（AI）推理和代码逻辑的更可靠的流程。这些工作流允许您创建执行节点的逻辑路径，这些节点可以封装代码功能、AI驱动的 Agent、工具和人工输入。通过明确绘制路由逻辑，这种方法允许您在代码中定义特定的、逐步的流程工作流，相比纯基于提示的 Agent 提供更高的精确性和可靠性。

![任务图及节点间条件路由](/images/adk/graph-workflow-router.svg)

**图 1.** 任务图及实现其路由的代码可视化。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
root_agent = Workflow(
  name="routing_workflow",
  edges=[
    ("START", process_message, router),
    (router,
      {
        "output-1": response_1,
        "output-2": response_2,
        "output-3": response_3,
      },
    ),
  ],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

ADK Go v2.0.0 提供了用于基于图的工作流的以下方法：

**图引擎**（`workflowagent`   `workflow.Edge`）：一个节点和边的图 API，直接映射到 Python 的 `Workflow(edges=[...])`。
节点由 `workflow.NewFunctionNode`、`workflow.NewAgentNode` 或 `workflow.NewDynamicNode` 定义，边声明为 `[]workflow.Edge`，整个图通过 `workflowagent.New` 调用封装：

```go
edges := workflow.Concat(
    workflow.Chain(workflow.Start, classifyNode),
    []workflow.Edge{
        {From: classifyNode, To: responseA, Route: workflow.StringRoute("output-1")},
        {From: classifyNode, To: responseB, Route: workflow.StringRoute("output-2")},
        {From: classifyNode, To: responseC, Route: workflow.StringRoute("output-3")},
    },
)
rootAgent, _ := workflowagent.New(workflowagent.Config{
    Name:  "routing_workflow",
    Edges: edges,
})
```

{{% /tab %}}
{{< /tabs >}}
使用基于图的 Agent 工作流的优势在于，相较于基于提示的 Agent，它在控制、可预测性和可靠性方面都有显著提升。通过在代码中定义整体流程工作流，你可以更好地控制任务的路由和执行方式。这种结构化的节点定义提高了 Agent 的可预测性，并增强了对需要定义步骤和流程管理的复杂任务的可靠性。

通过查看[基于图的 Agent 工作流](/docs/adk/build/graph-workflows/)，可以开始在 ADK 中使用基于图的工作流。

## 节点 {#nodes}

图由执行节点组成。这些*节点*可以是***Agent***、ADK***工具***、人工输入任务或你编写的代码函数。节点可以接受来自先前执行节点的输入，并通过***事件***对象发出数据。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

下面显示了一个处理文本输入并发送文本输出的简单***函数节点***：

```python
from google.adk import Event

def my_function_node(node_input: str):
    input_text_modified = node_input.upper()
    return Event(output=input_text_modified)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go v2.0.0 中，主要的节点类型是 `workflow.NewFunctionNode`。
`FunctionNode` 包装了一个普通的 Go 函数：该函数返回一个类型化的值，框架会自动将其包装在 `session.Event` 中，并设置 `event.Output`。后续节点将作为其类型化的 `input` 参数接收该值——无需手动写入状态或构建事件：

```go
// newFunctionNodePipeline 演示了 workflow.NewFunctionNode 作为主要节点
// v2 节点类型。FunctionNode 包装一个普通的 Go 函数：该函数返回
// 一个类型化的值，框架会自动将其包装在 session.Event 中，
// 设置 event.Output。后续节点将此值作为其类型接收
// 输入参数。
//
// 这是 Python FunctionNode 的直接 Go 等价物：
//
//	def 我的函数节点(节点输入: str):
//	    return Event(output=node_input.upper())
func newFunctionNodePipeline() (agent.Agent, error) {
	upperFn := func(_ agent.Context, input string) (string, error) {
		return strings.ToUpper(input), nil
	}

	suffixFn := func(_ agent.Context, input string) (string, error) {
		return input + " IS AWESOME!", nil
	}

	// workflow.NewFunctionNode 将每个函数封装为图节点。
	// workflow.Chain 按顺序将它们连接：START → upper → suffix。
	// upperFn 的输出被作为 suffixFn 的类型化输入传递
	// 通过 event.Output — 无需写入会话状态。
	nodeA := workflow.NewFunctionNode("upper", upperFn, workflow.NodeConfig{})
	nodeB := workflow.NewFunctionNode("suffix", suffixFn, workflow.NodeConfig{})

	return workflowagent.New(workflowagent.Config{
		Name:        "function_node_pipeline",
		Description: "Demonstrates workflow.NewFunctionNode data flow via Event.Output.",
		Edges:       workflow.Chain(workflow.Start, nodeA, nodeB),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
有关在节点之间传输数据的更多信息，请参阅
[Agent 工作流的数据处理](/docs/adk/build/graph-workflows/data-handling/)。

## 工作流图语法 {#workflow-graphs-syntax}

您可以通过组合工作流 Agent 来定义图。本节提供常见路由模式的概述。

{{% alert context="warning" %}}
**注意：工作流 Agent 的限制**

您可以将***LlmAgents***添加到基于图的工作流中。作为图节点使用的 Agent 默认处于`single_turn`模式；`chat`模式的 Agent 仅允许直接跟在`START`之后，因为它使用对话历史而非节点输入。如需有关 Agent 模式的更多信息，请参阅
[构建协作型 Agent 团队](/docs/adk/build/multi-agent-workflows/collaborative-workflows/#mode-configuration-and-behaviors)。

{{% /alert %}}

### 路由序列 {#route-sequences}

顺序路由按列表顺序依次运行每个节点。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

`edges`数组使用`START`关键字来指示图执行的开始，每个列出的节点按顺序执行：

```python
edges=[("START", task_A_node)]  # single node run
edges=[("START",
        task_A_node,
        task_B_node,
        task_C_node)]           # 3 nodes run in order
```

{{% /tab %}}
{{% tab tabName="Go" %}}

`workflow.Chain(workflow.Start, nodeA, nodeB, nodeC)` 将节点连接成顺序边切片。每个节点的类型化返回值通过 `event.Output` 转发到下一个节点——无需写入会话状态：

```go
// newSequentialNodes 使用 v2 图构建一个两步的顺序工作流
// 引擎。工作流。Chain 按顺序连接节点；每个节点的类型化返回
// 值通过 event.Output 转发到下一个节点。
//
// 这是 Go 的等效写法：
//
//	edges=[("START", task_A_node, task_B_node)]
func newSequentialNodes() (agent.Agent, error) {
	// task_A_node：转换用户的输入。
	taskANode := workflow.NewFunctionNode("task_A_node",
		func(_ agent.Context, input string) (string, error) {
			return "Summary: " + strings.TrimSpace(input), nil
		},
		workflow.NodeConfig{},
	)

	// task_B_node：接收任务A的输出作为其类型化输入并产生
	// 最终结果。不需要会话状态读取。
	taskBNode := workflow.NewFunctionNode("task_B_node",
		func(_ agent.Context, summary string) (string, error) {
			return strings.ToUpper(summary), nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "sequential_workflow",
		Description: "Runs task A then task B in order via workflow.Chain.",
		Edges:       workflow.Chain(workflow.Start, taskANode, taskBNode),
	})
}
```

{{% /tab %}}
{{< /tabs >}}

### 路由分支和条件执行 {#route-branches-and-conditional-execution}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 Python 中，分支由一个 `FunctionNode` 处理，它返回一个 `Event(route=...)` 值，该值由 `edges` 字典分发到不同的节点。

```python
from google.adk import Event, Workflow
from google.adk.agents import Agent

def router(node_input: str):
    """Route to task B or C based on node_input."""
    if condition(node_input):
        return Event(route="RUN_TASK_C")
    return Event(route="RUN_TASK_B")

task_B_node = Agent(name="task_B_agent") # An agent to execute node B

def task_C_node(node_input: str):
    """A FunctionNode to execute node C."""
    return Event(output="Task C completed")

root_agent = Workflow(
    name="routing_workflow",
    edges=[
        ("START", task_A_node, router),
        (router,
          {
            # “路由值”：node_to_run
            "RUN_TASK_B": task_B_node,
            "RUN_TASK_C": task_C_node,
          },
        ),
    ],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go v2.0.0 中，条件调度使用 `workflow` 图引擎。
一个节点将 `Event.Routes` 设置为一个或多个字符串路由键，每个
`workflow.Edge` 使用 `workflow.Route` 匹配器选择其后续节点：

-   `workflow.StringRoute("category")` — 匹配单个字符串值
-   `workflow.IntRoute(n)` 或 `workflow.MultiRoute[int]{1, 2, 3}` — 匹配
    整数值
-   `workflow.BoolRoute(true)` — 匹配布尔值
-   `workflow.Default` — 当同一源节点上的其他路由不匹配时匹配

以下模式是 Python 路由器在 Go 中的对应实现：

```go
// classifyNode 会根据消息发出一个事件，Routes=[]string{"BUG"}、
// 、["CUSTOMER_SUPPORT"] 或 ["LOGISTICS"]。
edges := workflow.Concat(
    workflow.Chain(workflow.Start, processMessage, classifyNode),
    []workflow.Edge{
        {From: classifyNode, To: bugHandler,       Route: workflow.StringRoute("BUG")},
        {From: classifyNode, To: supportHandler,   Route: workflow.StringRoute("CUSTOMER_SUPPORT")},
        {From: classifyNode, To: logisticsHandler, Route: workflow.StringRoute("LOGISTICS")},
    },
)
rootAgent, _ := workflowagent.New(workflowagent.Config{
    Name:  "routing_workflow",
    Edges: edges,
})
```

`workflow.EdgeBuilder` 提供了一种流畅的替代方案，用于手工组装 `[]workflow.Edge` 切片。构建器的 `Add`、`AddFanOut` 和 `AddFanIn` 方法以更少的重复表达相同的拓扑结构：

```go
eb := workflow.NewEdgeBuilder()
eb.Add(workflow.Start, processMessage)
eb.Add(processMessage, classifyNode)
eb.AddRoute(classifyNode, bugHandler,       workflow.StringRoute("BUG"))
eb.AddRoute(classifyNode, supportHandler,   workflow.StringRoute("CUSTOMER_SUPPORT"))
eb.AddRoute(classifyNode, logisticsHandler, workflow.StringRoute("LOGISTICS"))

rootAgent, _ := workflowagent.New(workflowagent.Config{
    Name:  "routing_workflow",
    Edges: eb.Build(),
})
```

要查看完整的、可运行的路由示例，请参见：
[string routing](https://github.com/google/adk-go/tree/v2/examples/workflow/routing/string),
[int / multi-value routing](https://github.com/google/adk-go/tree/v2/examples/workflow/routing/int),
以及 [LLM 驱动的路由](https://github.com/google/adk-go/tree/v2/examples/workflow/routing/llm)。

{{% alert context="info" %}}
**预构建 Agent：在状态中编码路由**

当使用 `sequentialagent` / `parallelagent` / `loopagent`
替代图引擎时，没有 `Event.Routes` 分派。通过 `OutputKey` 在会话状态中编码路由决策，并让下游 Agent 在其 `Instruction` 模板中检查，或者使用带有 `Escalate` 基于出口的 `loopagent` —— 见下方 [循环和升级示例](#loop-and-escalation-exit)。
{{% /alert %}}
{{% /tab %}}
{{< /tabs >}}

## 并行任务：分支与合并路径 {#parallel-tasks-fan-out-and-join-paths}

您可以创建将执行拆分到多个并行节点的图，通常需要汇总每个节点的输出以进行进一步处理。该任务执行模式有两个阶段。工作流在启动多个并行任务时首先进行分支，然后在这些任务完成后重新合并这些路径，然后再继续下一步。

![任务连接至 JoinNode](/images/adk/graph-joinnode.svg)

**图2.** 并行任务节点的输出可以在传递结果至下一步之前进行汇总和合并。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

您可以通过使用 ***JoinNode*** 对象来完成合并步骤，该对象会等待每个并行任务完成，然后将这些节点的输出集合传递给下一个节点。

```python
from google.adk.workflow import JoinNode

my_join_node = JoinNode(name="my_join_node")

edges=[
    ("START", parallel_task_A, my_join_node),
    ("START", parallel_task_B, my_join_node),
    ("START", parallel_task_C, my_join_node),
    (my_join_node, final_task_D),
]
```

{{% /tab %}}
{{% tab tabName="Go" %}}

ADK Go v2.0.0 在图引擎中提供了 `workflow.NewJoinNode` 以实现真正的汇合（fan-in）：来自 `workflow.Start`（或任何共享源节点）的发散边（fan-out edges）并行输入到汇节点（join node），该节点在所有边完成之前不会发出下一个节点的 `map[string]any`，`map[string]any` 以前驱节点的名称为键。

`workflow.EdgeBuilder` 通过其专用的 `AddFanOut` 和 `AddFanIn` 辅助工具，使发散 / 汇合（fan-out / fan-in）布线更简洁（如 [复杂工作流示例](https://github.com/google/adk-go/tree/v2/examples/workflow/complex) 所示）：

```go
gatherNode := workflow.NewJoinNode("gather")

eb := workflow.NewEdgeBuilder()
eb.AddFanOut(workflow.Start, researchNodeA, researchNodeB, researchNodeC)
eb.AddFanIn(gatherNode, researchNodeA, researchNodeB, researchNodeC)
eb.Add(gatherNode, formatNode)
eb.Add(formatNode, synthesisNode)

rootAgent, _ := workflowagent.New(workflowagent.Config{
    Name:  "research_pipeline",
    Edges: eb.Build(),
})
```

以下代码片段显示了使用 `workflow.NewJoinNode` 和 `EdgeBuilder.AddFanOut` / `AddFanIn` 的完整扇出/汇合模式：

```go
// newParallelFanOut 使用 v2 图引擎构建一个分支/合并工作流。
// 三个研究节点从开始并行运行；workflow.NewJoinNode 等待
// 让它们全部完成并输出一个 map[nodeName] 到该格式
// 节点，用于汇总综合节点的结果。
//
// 图拓扑：
//
//	开始 ─┬─> 研究_A ──┐
//	       ├─> 研究_B ──┼─> 收集（JoinNode） ─> 格式化 ─> 综合
//	       └─> 研究_C ──┘
//
// Python 等效:
//
//	edges=[
//	    （"START"，research_A，我的_join_node）
//	    （"START"，research_B，我的_join_node）
//	    （"START"，research_C，我的_join_node）
//	    (my_join_node, format_node),
//	    (format_node, synthesis_node),
//	]
func newParallelFanOut() (agent.Agent, error) {
	researchA := workflow.NewFunctionNode("research_A",
		func(_ agent.Context, _ any) (string, error) {
			return "Fact about renewable energy.", nil
		},
		workflow.NodeConfig{},
	)
	researchB := workflow.NewFunctionNode("research_B",
		func(_ agent.Context, _ any) (string, error) {
			return "Fact about electric vehicles.", nil
		},
		workflow.NodeConfig{},
	)
	researchC := workflow.NewFunctionNode("research_C",
		func(_ agent.Context, _ any) (string, error) {
			return "Fact about carbon capture.", nil
		},
		workflow.NodeConfig{},
	)

	// workflow.NewJoinNode 等待所有前置节点（research_A, research_B,
	// research_C) 完成并向其后继节点发出 map[nodeName] 输出。
	gatherNode := workflow.NewJoinNode("gather")

	// formatNode 从 gatherNode 接收 map[string]any 并组装一个
	// 组合提示字符串。
	formatNode := workflow.NewFunctionNode("format",
		func(_ agent.Context, results map[string]any) (string, error) {
			return fmt.Sprintf("A: %v\nB: %v\nC: %v",
				results["research_A"],
				results["research_B"],
				results["research_C"],
			), nil
		},
		workflow.NodeConfig{},
	)

	synthesisNode := workflow.NewFunctionNode("synthesis",
		func(_ agent.Context, prompt string) (string, error) {
			return "Combined report: " + prompt, nil
		},
		workflow.NodeConfig{},
	)

	// EdgeBuilder.AddFanOut 将 workflow.Start 扇出到所有三个研究节点。
	// EdgeBuilder.AddFanIn 将所有三个研究节点路由到 gatherNode。
	eb := workflow.NewEdgeBuilder()
	eb.AddFanOut(workflow.Start, researchA, researchB, researchC)
	eb.AddFanIn(gatherNode, researchA, researchB, researchC)
	eb.Add(gatherNode, formatNode)
	eb.Add(formatNode, synthesisNode)

	return workflowagent.New(workflowagent.Config{
		Name:        "fan_out_workflow",
		Description: "Parallel research fan-out with JoinNode barrier and synthesis.",
		Edges:       eb.Build(),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="warning" %}}
**注意：供给 JoinNode 的节点必须产生输出**

一个 `JoinNode` 只有在其所有前置节点完成后才会释放。
确保每个供给 join 的节点都有自己的输出，并为任何可能失败的节点附加一
[重试配置](/docs/adk/build/graph-workflows/retries-and-timeouts/)。没有输出而完成的前置节点会使 join 在该分支上没有值，
由此造成的失败会在下游出现，而不在引起它的节点处。
{{% /alert %}}

## 嵌套工作流 {#nested-workflows}

在构建更复杂的工作流时，你可能希望将特定任务的功能封装为可重复使用的工作流。
一个或多个工作流 Agent 可以作为子 Agent 在另一个工作流 Agent 中使用，以实现这一目标。

![父工作流中的嵌套工作流](/images/adk/graph-workflow-nodes.svg)

**图 3.** 嵌套工作流 Agent 作为父工作流中的子 Agent。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Workflow

root_agent = Workflow(
    name="parent_workflow",
    edges=[
       ("START", task_A1, router),
       (router, {
            "RUN_WORKFLOW_B": workflow_B,
            "RUN_WORKFLOW_C": workflow_C,
            },
       ),
    ],
)
```

#### 嵌套工作流数据输出 {#loop-and-escalation-exit}

嵌套工作流对象的输出与单个节点略有不同。当嵌套工作流完成其中一个节点时，它会将数据传输到嵌套工作流图中的下一个节点，*并且* 系统会将该节点的事件冒泡到父工作流，以便进行流程可追踪性。当嵌套工作流完成其流程中的最后一个节点时，父节点会从最终的叶子节点提取数据，并将其作为嵌套工作流的输出发出。

一个工作流最多只能有*一个* 终端节点产生输出。如果两个或更多终端节点产生输出，例如两个并行分支的结束，工作流将以 `ValueError` 失败。使用 ***JoinNode*** 合并这些分支，以便图形以单个终端输出结束。
{{% /tab %}}
{{% tab tabName="Go" %}}

ADK Go v2.0.0 支持两种互补方式的嵌套工作流：

**图引擎** (`workflowagent` `workflow.Edge`)：使用 `workflowagent.New` 创建的 `workflowagent` 本身是一个 `agent.Agent`，因此可以用 `workflow.NewAgentNode` 包装，并作为另一个工作流 `edges` 切片内的节点使用。从外部图的角度来看，内部工作流作为单个节点运行至完成，其终端输出作为节点输出在外部图的边上发出。

```go
innerNode, _ := workflow.NewAgentNode(innerWorkflowAgent, workflow.NodeConfig{})

outerEdges := workflow.Chain(workflow.Start, outerStepNode, innerNode, finalNode)
rootAgent, _ := workflowagent.New(workflowagent.Config{
    Name:  "parent_workflow",
    Edges: outerEdges,
})
```

以下代码片段展示了内层和外层图的构建。`workflow.NewAgentNode` 包装了内层的 `workflowagent`，以便它可以被放置在外层图的 `workflow.Chain` 中：

```go
// newNestedWorkflows 显示了如何使用在另一个工作流 Agent 中嵌套一个工作流 Agent
// v2 图引擎。内部的 workflowagent 被封装在
// workflow.NewAgentNode 并作为节点放置在外部图的边切片中。
// 从外部图的角度来看，内部工作流是一个单一的节点，它
// 在沿边到 finalNode 之前运行至完成。
//
// Python 等效:
//
//	root_agent = Workflow(
//	    name="parent_workflow",
//	    edges=[("START", task_A1, workflow_B, final_node)],
//	)
func newNestedWorkflows() (agent.Agent, error) {
	// --- 内部工作流程 B ---
	innerStep1 := workflow.NewFunctionNode("inner_step_1",
		func(_ agent.Context, input string) (string, error) {
			return "[ES] " + input, nil // simulate translation to Spanish
		},
		workflow.NodeConfig{},
	)
	innerStep2 := workflow.NewFunctionNode("inner_step_2",
		func(_ agent.Context, spanish string) (string, error) {
			return "[EN] " + spanish, nil // simulate translation back to English
		},
		workflow.NodeConfig{},
	)

	// workflowB 是一个自包含的内部图。
	workflowB, err := workflowagent.New(workflowagent.Config{
		Name:        "workflow_B",
		Description: "Translates input to Spanish then back to English.",
		Edges:       workflow.Chain(workflow.Start, innerStep1, innerStep2),
	})
	if err != nil {
		return nil, fmt.Errorf("workflowB: %w", err)
	}

	// --- 外部图 ---
	taskA1 := workflow.NewFunctionNode("task_A1",
		func(_ agent.Context, input string) (string, error) {
			return "Summary: " + strings.TrimSpace(input), nil
		},
		workflow.NodeConfig{},
	)

	finalNode := workflow.NewFunctionNode("final_node",
		func(_ agent.Context, result string) (string, error) {
			return "Final: " + result, nil
		},
		workflow.NodeConfig{},
	)

	// workflow.NewAgentNode 包装了 workflowB，因此它可以作为一个节点放置
	// 在外部图的边切片中。
	innerNode, err := workflow.NewAgentNode(workflowB, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("NewAgentNode(workflowB): %w", err)
	}

	return workflowagent.New(workflowagent.Config{
		Name:        "parent_workflow",
		Description: "Runs task_A1 then the nested workflow_B then final_node.",
		Edges:       workflow.Chain(workflow.Start, taskA1, innerNode, finalNode),
		SubAgents:   []agent.Agent{workflowB},
	})
}
```

{{% /tab %}}
{{< /tabs >}}

## 循环和升级退出

循环会重复一组步骤，直到满足终止条件。在 Python 中，这表示为 `edges` 图中一个指向回到先前节点的反向边。在 ADK Go v2.0.0 中，图引擎直接支持相同的模式：从下游节点添加一条回到先前节点的边，并设置路由条件，引擎将在每次迭代时以新的生命周期重新激活目标节点。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Event, Workflow

def router(node_input: str):
    """Exit the loop when the task is done, otherwise iterate again."""
    if condition(node_input):
        return Event(route="DONE")
    return Event(route="RETRY")

root_agent = Workflow(
    name="looping_workflow",
    edges=[
        ("START", task_A_node, router),
        (router,
          {
            # 回边：为另一轮迭代重新运行 task_A_node。
            "RETRY": task_A_node,
            "DONE": final_task_node,
          },
        ),
    ],
)
```

一个循环必须至少包含一个已路由或条件边。仅由无条件边组成的循环在构建 `Workflow` 时会被拒绝。
{{% /tab %}}
{{% tab tabName="Go" %}}

以下示例使用 `workflow.EdgeBuilder` 的图引擎。批判节点返回一个判决，路由节点设置 `Event.Routes`，从精炼器到批判节点的回边创建了循环。当批判节点满足条件时，它会路由到终端节点 `done`:

```go
// 草稿将工作文档带入完善循环中。
type draft struct {
	Text string `json:"text"`
}

// criticResult 是由评论节点发出的，包含评论裁决和
// 可选建议。路由器读取 Verdict 来设置 Event.Routes。
type criticResult struct {
	Verdict     string `json:"verdict"`     // "REFINE" or "DONE"
	Suggestions string `json:"suggestions"` // non-empty when Verdict == "REFINE"
}

// writeDraft 是初始写作节点：从...生成初稿
// 用户的主题。它的类型化返回值成为评审节点的输入
// 通过 Event.Output — 无需写入会话状态。
func writeDraft(_ agent.Context, topic string) (draft, error) {
	// 在实际工作流程中，这将调用一个大型语言模型；在这里我们返回一个存根。
	return draft{Text: "Draft about " + topic + ": placeholder content."}, nil
}

// reviewDraft 是批评节点：检查草稿并返回裁决。
// “DONE” 退出循环；“REFINE” 会触发回到精炼器的反向边。
func reviewDraft(_ agent.Context, d draft) (criticResult, error) {
	// 模拟一个评论者：一旦草稿包含“改进”，就批准。
	if strings.Contains(d.Text, "improved") {
		return criticResult{Verdict: "DONE"}, nil
	}
	return criticResult{
		Verdict:     "REFINE",
		Suggestions: "Add more detail and mark the text as improved.",
	}, nil
}

// routeVerdict 读取评论员的裁决并设置 Event.Routes，因此
// 图引擎将任务分发到优化器或完成节点。
// 返回 nil 会抑制自动终端事件。
func routeVerdict(ctx agent.Context, r criticResult, emit func(*session.Event) error) (any, error) {
	ev := session.NewEvent(ctx, ctx.InvocationID())
	ev.Routes = []string{r.Verdict}
	ev.Output = r // forward the full result to the chosen successor
	if err := emit(ev); err != nil {
		return nil, err
	}
	return nil, nil
}

// refineDraft 应用评论者的建议并返回改进后的草稿。
// 它的输出通过反向边反馈到评论节点。
func refineDraft(_ agent.Context, r criticResult) (draft, error) {
	return draft{Text: "improved draft incorporating: " + r.Suggestions}, nil
}

// reportDone 是终端节点，只有在评论者满意时才会到达。
func reportDone(_ agent.Context, r criticResult) (string, error) {
	return "Refinement complete. Final verdict: " + r.Verdict, nil
}

// newLoopEscalate 使用迭代文档改进工作流程
// 图引擎。评论节点发出一个路线（“REFINE”或“DONE”）并且
// 引擎会向炼油器调度（精炼器通过以下方式循环回给批评者）
// 一个回边）或终端完成节点。
//
// 图拓扑：
//
//	开始 → 作家 → 评论家 → 路由器 ─┬─ “精炼” → 精炼者 ──┐
//	                                   └─ "完成"   → 完成       │
//	                 ▲_______________________________┘（回边）
//
// Python 等效:
//
//	edges=[
//	    （"START"，writer_node，critic_node，router），
//	    (router, {"REFINE": refiner_node, "DONE": done_node}),
//	    (refiner_node, critic_node),  # 反向边创建循环
//	]
func newLoopEscalate() (agent.Agent, error) {
	writerNode := workflow.NewFunctionNode("writer", writeDraft, workflow.NodeConfig{})
	criticNode := workflow.NewFunctionNode("critic", reviewDraft, workflow.NodeConfig{})
	routerNode := workflow.NewEmittingFunctionNode("router", routeVerdict, workflow.NodeConfig{})
	refinerNode := workflow.NewFunctionNode("refiner", refineDraft, workflow.NodeConfig{})
	doneNode := workflow.NewFunctionNode("done", reportDone, workflow.NodeConfig{})

	// 构建边。来自精炼节点到评论节点的回边会创建
	// 循环；图形引擎重新激活 criticNode 并带有新的
	// 每次迭代的生命周期。
	eb := workflow.NewEdgeBuilder()
	eb.Add(workflow.Start, writerNode)
	eb.Add(writerNode, criticNode)
	eb.Add(criticNode, routerNode)
	eb.AddRoute(routerNode, refinerNode, workflow.StringRoute("REFINE"))
	eb.AddRoute(routerNode, doneNode, workflow.StringRoute("DONE"))
	eb.AddRoute(refinerNode, criticNode, workflow.Default) // back-edge: loop back for another review

	return workflowagent.New(workflowagent.Config{
		Name:        "iterative_writer",
		Description: "Writes then iteratively refines a document using a critic/refiner loop.",
		Edges:       eb.Build(),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="warning" %}}
**注意：图循环未被限制**

图循环不会自动受限。请确保退出条件最终为真，或将迭代表示为[动态工作流](/docs/adk/build/graph-workflows/dynamic-workflows/#loop-route)，其中循环在你自己的代码中运行，你可以控制其边界。
{{% /alert %}}

---

原文：[Build graph routes for agent workflows](https://adk.dev/graphs/routes/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/routes.md)
