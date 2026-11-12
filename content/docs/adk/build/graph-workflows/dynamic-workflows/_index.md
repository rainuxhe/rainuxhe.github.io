---
title: "动态工作流"
description: "ADK 框架提供了一种以编程方式定义工作流的方法，作为基于图的工作流的更灵活和更强大的替代方案。使用基于图的方法提供了一种方便的方式来组合多步骤的静态流程"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

ADK 框架提供了一种以编程方式定义工作流的方法，作为基于图的工作流 [graph-based workflows](/docs/adk/build/graph-workflows/) 的更灵活和强大的替代方案。使用基于图的方法可以方便地组合多步骤的静态流程结构，以及工作流节点。然而，如果您的工作流逻辑路径更复杂，包含迭代循环或复杂的分支逻辑，基于图的方法可能不适合您的需求，或者可能变得难以管理。

ADK 中的动态工作流允许您放弃基于图的路径结构，充分利用所选编程语言的全部能力来构建工作流。使用动态工作流，您可以通过简单的装饰器（Python）或构造函数（Go）创建工作流，将工作流节点作为函数调用，并构建复杂的路由逻辑。以下是 ADK 动态工作流的一些优点：

-   **灵活的控制流程：** 使用循环、条件和递归动态定义执行顺序，这些在静态图中很难或不可能表示。
-   **编程体验：** 使用熟悉的结构，如 `while` 循环和 `async/await`（Python）或 `for` 循环和 `workflow.RunNode`（Go），而非基于图的路由。
-   **自动检查点：** 动态工作流跟踪每个节点的执行。成功的子节点在恢复工作流时会自动跳过，使复杂逻辑具有持久性并默认可恢复。
-   **封装性：** 将业务逻辑封装到 *父节点* 中，内部组合低级节点，使整体工作流保持清晰和可管理。

## 开始使用 {#get-started}

以下动态工作流代码示例展示了如何定义一个包含单个具有函数的节点的基本工作流：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Context
from google.adk import Workflow
from google.adk.workflow import node
from typing import Any

@node(name="hello_node")
def my_node(node_input: Any):
    return "Hello World"

# 定义一个动态工作流节点
@node(rerun_on_resume=True)
async def my_workflow(ctx: Context, node_input: str) -> str:
    # run_node 执行一个节点并返回其输出
    result = await ctx.run_node(my_node, node_input="hello")
    return result

# 运行工作流
root_agent = Workflow(
    name="root_agent",
    edges=[("START", my_workflow)],
)
```

这个示例使用 [***@node***](#node) 注释以方便操作，并保持代码书写尽可能简单。这个注释会生成包装器，允许代码在 ADK 动态工作流的上下文中运行。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，`workflow.NewFunctionNode` 替代了 `@node` 装饰器，`workflow.NewDynamicNode` 替代了 `@node(rerun_on_resume=True)` 异步编排器。`workflow.RunNode` 是 `ctx.run_node()` 的直接等价物。`workflowagent.New` 与 `workflow.Chain` 组合替代 `Workflow(edges=[...])`。

在人工干预暂停后恢复行为由 `NodeConfig.RerunOnResume` 控制——详情请参见下面的 [Nodes](#node)。

```go
// helloNode 是一个简单的 FunctionNode，返回 “Hello World”。
// 在 Python 中，这可以写成：
//
//	@node(name="hello_node")
//	def 我的节点(node_input: Any):
//	    返回 "Hello World"
//
// 在 Go 中，workflow.NewFunctionNode 使用相同的逻辑进行封装
// 所需的节点接口，从中推断输入和输出类型
// 泛型参数。
var helloNode = workflow.NewFunctionNode("hello_node",
	func(_ agent.Context, _ string) (string, error) {
		return "Hello World", nil
	},
	workflow.NodeConfig{},
)

// myWorkflow 是一个动态编排节点。它调用 workflow.RunNode
// 将 helloNode 安排为子节点并返回其输出。
// 在 Python 中，这将是：
//
//	@node(rerun_on_resume=True)
//	async def my_workflow(ctx: Context, node_input: str) -> str:
//	    result = await ctx.run_node(my_node, node_input="hello")
//	    返回结果
//
// workflow.NewDynamicNode 默认将 RerunOnResume 设置为 &true，以匹配
// Python @node(rerun_on_resume=True) 的行为。
var myWorkflow = workflow.NewDynamicNode[string, string]("my_workflow",
	func(ctx agent.Context, _ string, _ func(*session.Event) error) (string, error) {
		return workflow.RunNode[string](ctx, helloNode, "hello")
	},
	workflow.NodeConfig{},
)

func runGetStarted() error {
	ctx := context.Background()

	// workflowagent.New 创建了一个由工作流引擎支持的 agent.Agent。
	// workflow.Chain(workflow.Start, myWorkflow) 会生成边缘切片
	// 等同于 Python 的 edges=[("START", my_workflow)]。
	wa, err := workflowagent.New(workflowagent.Config{
		Name:        "root_agent",
		Description: "A minimal dynamic workflow.",
		Edges:       workflow.Chain(workflow.Start, myWorkflow),
	})
	if err != nil {
		return fmt.Errorf("workflowagent.New: %w", err)
	}

	l := full.NewLauncher()
	return l.Execute(ctx, &launcher.Config{
		AgentLoader: agent.NewSingleLoader(wa),
	}, os.Args[1:])
}
```

{{% /tab %}}
{{< /tabs >}}
## 构建模块：节点和工作流 {#building-blocks-nodes-and-workflows}

节点和工作流代表了 ADK 动态工作流的基本构建模块。这些类型和函数提供了将您的代码包装起来所需的功能，以便它可以集成到 ADK 的基于代码的工作流中。

### 节点 {#node}

ADK 中的动态工作流由 *节点* 组成。一个可用工作流节点的简单版本会将普通函数与在工作流中运行所需的元数据封装在一起。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 Python 中，***@node*** 注解会生成节点包装器，将样板代码降到最低：

```python
@node(name="hello_node")
def my_function_node(node_input: Any):
    return "Hello World"
```

以下代码片段显示了等效代码*不带* ***@node*** 注解的情况：

```python
from typing import Any

from google.adk.workflow import FunctionNode

# 基础功能
def hello_world(node_input: Any):
    return "Hello World"

# 带选项的 FunctionNode 包装器
my_function_node = FunctionNode(
    func=hello_world,
    name="hello_node",
)
```

自己创建节点包装代码可能很有用，如果你正在封装来自外部库的函数，需要使用不同配置从同一个函数创建多个节点，或者如果你正在一个注册表中管理节点引用以进行高级编排。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，`workflow.NewFunctionNode[IN, OUT]` 将一个普通函数封装为工作流节点，从泛型参数推断输入和输出类型。没有装饰器语法；该节点是一个值，你将其作为子节点传递给动态编排器中的 `workflow.RunNode`：

```go
// myFunctionNode 演示了显式的 NewFunctionNode 构造函数 —
// 等同于在 Python 中手动将函数包装在 FunctionNode 中：
//
//	success_node = FunctionNode(my_function_node, name="hello", rerun_on_resume=True)
//
// 直接创建节点（而不是通过 @node）在以下情况下很有用：
// 当你需要从同一个函数创建多个具有不同配置的节点时，
// 或者当包装来自外部库的函数时。
var myFunctionNode = workflow.NewFunctionNode("hello",
	func(_ agent.Context, _ any) (string, error) {
		return "Hello World", nil
	},
	workflow.NodeConfig{},
)

// myFormattingNode 是第二个函数节点，动态编排器会按顺序调用它，
// 与以下操作相对应：
//
//	result_formatted = await ctx.run_node(my_formatting_node, node_input=result)
var myFormattingNode = workflow.NewFunctionNode("format",
	func(_ agent.Context, in string) (string, error) {
		return fmt.Sprintf("[formatted] %s", in), nil
	},
	workflow.NodeConfig{},
)
```

`NodeConfig` 具有与 Python 的 `@node` 参数相同的选项。
最重要的字段是 `RerunOnResume *bool`，它控制在工作流在人工干预暂停后恢复时的行为：

-   **`&true`（重新进入模式）**：在恢复时从头重新运行被中断的节点。对于在循环中调用 `workflow.RunNode` 的动态编排器节点，请使用此模式——主体会重新执行，并且已完成的子激活会自动跳过（检查点机制）。这与 Python 的 `@node(rerun_on_resume=True)` 相对应。
-   **`&false`（交接模式）**：恢复时的负载会直接作为输入路由到节点的后续节点，完全绕过被中断的节点。对于仅发出暂停事件并期望人工响应流向下一步骤的叶节点，请使用此模式。
-   **`nil`**：默认值取决于节点类型。`workflow.NewDynamicNode` 会自动设置 `nil → &true`（重新进入模式），因为编排器主体在恢复时必须重新进入，以提供缓存的子结果。`workflow.NewFunctionNode` 和其他叶节点构造函数会保持 `nil` 原样，运行引擎将其视为交接模式（`&false`）。对于任何节点类型，显式指定的 `&false` 总会被遵守。

```go
// NewDynamicNode: nil RerunOnResume 会自动设置为 &true。
// 显式传递 &rerun 是等效的，并且能使意图更清晰。
rerun := true
orchestratorNode := workflow.NewDynamicNode[string, string]("my_workflow",
    myOrchestratorfn,
    workflow.NodeConfig{RerunOnResume: &rerun}, // re-entry: node body re-runs on resume
)

// NewFunctionNode: nil RerunOnResume 保持为 nil → 引擎将其视为交接。
handoffNode := workflow.NewFunctionNode("leaf_node",
    myLeafFn,
    workflow.NodeConfig{}, // nil RerunOnResume → handoff for FunctionNode
)
```

{{% /tab %}}
{{< /tabs >}}
### 工作流 {#workflows}

在 ADK 动态工作流中，你使用动态节点作为节点的主要协调者。动态节点管理运行子节点以及这些节点的执行逻辑（顺序和路径）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
@node(rerun_on_resume=True)
async def my_workflow(ctx):
    # run_node 执行一个节点并返回其输出
    result = await ctx.run_node(my_function_node, node_input="Hello")
    result_formatted = await ctx.run_node(my_formatting_node, node_input=result)
    return result_formatted

# 运行工作流
root_agent = Workflow(
    name="root_agent",
    edges=[("START", my_workflow)],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

`workflow.NewDynamicNode` 创建一个协调器，其主体为每个子步骤调用
`workflow.RunNode`。`workflowagent.New` 与
`workflow.Chain(workflow.Start, myWorkflow)` 相当于
`Workflow(edges=[("START", my_workflow)])`：

```go
// orchestratorWorkflow 是一个动态节点，用于调度两个子节点
// 通过 workflow.RunNode 执行序列，相当于：
//
//	@node(rerun_on_resume=True)
//	异步定义 my_workflow(ctx):
//	    result = await ctx.run_node(my_function_node, node_input="Hello")
//	    result_formatted = await ctx.run_node(my_formatting_node, node_input=result)
//	    返回格式化结果
var orchestratorWorkflow = workflow.NewDynamicNode[string, string]("my_workflow",
	func(ctx agent.Context, _ string, _ func(*session.Event) error) (string, error) {
		result, err := workflow.RunNode[string](ctx, myFunctionNode, "Hello")
		if err != nil {
			return "", err
		}
		return workflow.RunNode[string](ctx, myFormattingNode, result)
	},
	workflow.NodeConfig{},
)
```

{{% /tab %}}
{{< /tabs >}}
## 数据处理 {#data-handling}

在使用带有 ADK 的动态工作流时，数据传递比
[基于图的工作流](/docs/adk/build/graph-workflows/)更简单，因为运行子节点会将该
节点的输出直接返回给调用者 — 消除了手动读取和写入会话状态键以进行数据传输的需要。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Context
from google.adk.workflow import node

@node(rerun_on_resume=True)
async def editorial_workflow(ctx: Context, node_input: str):
    # Agent 节点生成输出
    raw_draft = await ctx.run_node(draft_agent, node_input)

    # 功能节点格式化文本
    formatted_text = await ctx.run_node(format_function_node, raw_draft)

    return formatted_text
```

你也可以使用已定义的类传递特定的数据模式，并配置输入和输出模式，类似于基于图的工作流节点：

```python
from google.adk import Agent
from google.adk import Context
from google.adk.workflow import node
from pydantic import BaseModel

class CityTime(BaseModel):
    time_info: str  # time information
    city: str       # city name

@node
def city_time_function(node_input: str):
    """Simulate returning the current time in a specified city."""
    return CityTime(time_info="10:10 AM", city=node_input)

city_report_agent = Agent(
    name="city_report_agent",
    model="gemini-flash-latest",
    input_schema=CityTime,
    instruction="""output the data provided by the previous node.""",
)

@node(rerun_on_resume=True) # workflow node
async def city_workflow(ctx: Context):
    city_time = await ctx.run_node(city_time_function, "Paris")
    report_text = await ctx.run_node(city_report_agent, city_time)

    return report_text
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，`workflow.NewAgentNode` 包装了一个 `agent.Agent`，因此可以通过 `workflow.RunNode` 在动态编排器中调用。每次 `RunNode` 调用的输出都会作为类型化值返回——无需读取会话状态：

```go
// newDataHandlingWorkflow 演示了如何在动态之间传递数据
// 编排器和一个由 LlmAgent 支持的节点。workflow.NewAgentNode 包装了一个
// agent.Agent，以便可以通过 workflow.RunNode 调用它。
//
// 在 Python 中，这对应于：
//
//	city_report_agent = Agent(name="city_report_agent", ...)
//	@节点
//	异步定义城市工作流程(ctx: Context):
//	    city_time = await ctx.run_node(city_time_function, "巴黎")
//	    report_text = await ctx.run_node(city_report_agent, city_time)
//	    返回报告文本
func newDataHandlingWorkflow(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, fmt.Errorf("gemini.NewModel: %w", err)
	}

	// cityTimeNode 是一个 FunctionNode，它返回格式化的城市时间字符串。
	cityTimeNode := workflow.NewFunctionNode("city_time_function",
		func(_ agent.Context, city string) (string, error) {
			return fmt.Sprintf("10:10 AM in %s", city), nil
		},
		workflow.NodeConfig{},
	)

	// cityReportAgent 是一个 LlmAgent，它接收城市-时间字符串并
	// 生成一个对人类友好的报告。
	cityReportAgent, err := llmagent.New(llmagent.Config{
		Name:        "city_report_agent",
		Model:       model,
		Description: "Reports city time information.",
		Instruction: "Output the data provided by the previous node in a friendly sentence.",
	})
	if err != nil {
		return nil, fmt.Errorf("llmagent.New (cityReport): %w", err)
	}

	// workflow.NewAgentNode 包装了 cityReportAgent，以便可以从中调用
	// 通过 workflow.RunNode 在动态节点内部。
	cityReportNode, err := workflow.NewAgentNode(cityReportAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("workflow.NewAgentNode: %w", err)
	}

	cityWorkflow := workflow.NewDynamicNode[string, string]("city_workflow",
		func(ctx agent.Context, _ string, _ func(*session.Event) error) (string, error) {
			cityTime, err := workflow.RunNode[string](ctx, cityTimeNode, "Paris")
			if err != nil {
				return "", err
			}
			return workflow.RunNode[string](ctx, cityReportNode, cityTime)
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:      "data_handling_workflow",
		SubAgents: []agent.Agent{cityReportAgent},
		Edges:     workflow.Chain(workflow.Start, cityWorkflow),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
有关工作流节点之间的数据处理的更多信息，请参见
[Agent 工作流的数据处理](/docs/adk/build/graph-workflows/data-handling/)。

## 工作流路由 {#workflow-routes}

ADK 中的动态工作流在路由逻辑方面比 [基于图的工作流](/docs/adk/build/graph-workflows/) 更灵活，包括迭代循环或更复杂的分支逻辑。本节描述了一些可用于路由的技术。

### 顺序路由 {#sequence-route}

您可以像使用基于图的工作流一样，在 ADK 中创建顺序任务处理的动态工作流。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

下面的代码片段显示了一个包含 Agent、函数节点和第二个 Agent 的动态工作流：

```python
@node(rerun_on_resume=True) # workflow node
async def city_workflow(ctx: Context):
    city = await ctx.run_node(city_generator_agent)
    city_time = await ctx.run_node(city_time_function, city)
    report_text = await ctx.run_node(city_report_agent, city_time)

    return report_text
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 `NewDynamicNode` 主体内依次调用 `workflow.RunNode`——每次调用都会等待子任务完成后再开始下一个。
上面的 [数据处理示例](#data-handling) 精确地展示了这种模式：`cityWorkflow` 依次调用 `workflow.RunNode` 获取 `cityTimeNode`，然后是 `cityReportNode`，并将每个节点的类型化输出传递给下一个。
{{% /tab %}}
{{< /tabs >}}
### 循环路线 {#loop-route}

对于希望使用迭代循环执行任务的工作流，动态工作流提供了更大的灵活性来定义所需的路由逻辑。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

下面的代码示例展示了如何使用动态工作流来构建一个用于生成、审查和更新代码的工作流循环：

```python
from google.adk import Context
from google.adk import Event
from google.adk.agents import LlmAgent
from google.adk.workflow import node

coder_agent = LlmAgent(
    name="generator_agent",
    model="gemini-flash-latest",
    instruction="Write python code for user request.",
)

@node(name="lint_reviewer")
async def compile_lint_check(ctx: Context, node_input: str):
    # 模拟 API 调用或 lint 检查
    class Response:
        findings = ""
    return Response()

fixer_agent = LlmAgent(
    name="fixer_agent",
    model="gemini-flash-latest",
    instruction="""Refactor current code {code}.
        Based on compile & lint review: {findings}""",
)

@node(rerun_on_resume=True) # workflow node
async def code_workflow(ctx: Context, node_input: str):
  code = await ctx.run_node(coder_agent, node_input)
  check_resp = await ctx.run_node(compile_lint_check, code)

  while check_resp.findings:
    yield Event(state={"code": code, "findings": check_resp.findings})
    code = await ctx.run_node(fixer_agent, {"code": code, "findings": check_resp.findings})

    check_resp = await ctx.run_node(compile_lint_check, code)

  yield Event(output=code)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，循环是动态节点主体内部的一个普通 `for` 循环。当没有发现问题时，lint 检查节点返回一个空字符串，这将通知循环退出：

```go
// newLoopWorkflow 演示了动态节点内的迭代循环。
// 协调器主体使用一个普通的 Go 循环来不断调用
// lintCheckNode 直到没有发现 — 相当于 Python 的：
//
//	@节点
//	async def 代码工作流程(ctx: Context, 用户请求: str):
//	    code = await ctx.run_node(coder_agent, user_request)
//	    check_resp = await ctx.run_node(compile_lint_check, code)
//	    而 check_resp.findings:
//	        code = await ctx.run_node(fixer_agent, ...)
//	        check_resp = await ctx.run_node(compile_lint_check, code)
//	    返回代码
func newLoopWorkflow(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, fmt.Errorf("gemini.NewModel: %w", err)
	}

	coderAgent, err := llmagent.New(llmagent.Config{
		Name:        "generator_agent",
		Model:       model,
		Description: "Writes Go code for the user request.",
		Instruction: "Write Go code for the user request. Output only the code.",
		OutputKey:   "generated_code",
	})
	if err != nil {
		return nil, fmt.Errorf("llmagent.New (coder): %w", err)
	}

	coderNode, err := workflow.NewAgentNode(coderAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("workflow.NewAgentNode (coder): %w", err)
	}

	// lintCheckNode 模拟 lint/编译检查。它返回一个空的
	// 当没有发现时的字符串，指示循环退出。
	lintCheckNode := workflow.NewFunctionNode("lint_reviewer",
		func(_ agent.Context, code string) (string, error) {
			// 模拟 lint 检查：返回发现的内容，或在清洁时返回空字符串。
			if len(code) < 50 {
				return "Code is too short; add error handling.", nil
			}
			return "", nil // no findings — loop exits
		},
		workflow.NodeConfig{},
	)

	fixerAgent, err := llmagent.New(llmagent.Config{
		Name:        "fixer_agent",
		Model:       model,
		Description: "Refactors code based on lint findings.",
		Instruction: "Refactor the provided code to address the review findings. Output only the improved code.",
	})
	if err != nil {
		return nil, fmt.Errorf("llmagent.New (fixer): %w", err)
	}

	fixerNode, err := workflow.NewAgentNode(fixerAgent, workflow.NodeConfig{})
	if err != nil {
		return nil, fmt.Errorf("workflow.NewAgentNode (fixer): %w", err)
	}

	codeWorkflow := workflow.NewDynamicNode[string, string]("code_workflow",
		func(ctx agent.Context, userRequest string, _ func(*session.Event) error) (string, error) {
			code, err := workflow.RunNode[string](ctx, coderNode, userRequest)
			if err != nil {
				return "", err
			}

			findings, err := workflow.RunNode[string](ctx, lintCheckNode, code)
			if err != nil {
				return "", err
			}

			// 循环直到代码检查报告没有发现问题。
			for findings != "" {
				code, err = workflow.RunNode[string](ctx, fixerNode, code)
				if err != nil {
					return "", err
				}
				findings, err = workflow.RunNode[string](ctx, lintCheckNode, code)
				if err != nil {
					return "", err
				}
			}
			return code, nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:      "code_pipeline",
		SubAgents: []agent.Agent{coderAgent, fixerAgent},
		Edges:     workflow.Chain(workflow.Start, codeWorkflow),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
### 并行执行路线 {#parallel-execution-routes}

ADK 中的动态工作流可以支持并行执行。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 Python 中，您可以使用 `asyncio.gather` 来构建并行执行：

```python
import asyncio
from typing import Any
from google.adk import Context
from google.adk.workflow import node

@node
def worker_node(node_input: Any):
    """Processes a single item."""
    return f"done {node_input}"

@node(rerun_on_resume=True)
async def parallel_supervisor(ctx: Context, node_input: list[Any]):
    """Runs worker_node in parallel for each item in the input list."""
    tasks = []
    for item in node_input:
        # ctx.run_node 返回一个协程。请使用 append 而不是 await
        # 立即，并使用子分支来隔离每次运行的事件。
        tasks.append(ctx.run_node(worker_node, item, use_sub_branch=True))

    # 并行收集所有结果
    results = await asyncio.gather(*tasks)
    return results
```

{{% alert context="success" %}}
**提示：恢复并行节点**

工作流框架确保如果动态工作流恢复时，
只有失败或中断的工作节点会被重新执行，包括并行工作节点。
{{% /alert %}}
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，`workflow.NewParallelWorker` 封装一个子节点并为列表输入的每个元素并发运行它，
将结果收集到单个输出切片中。`maxConcurrency` 参数限制同时运行的并发激活数量；`0` 表示无限：

```go
// newParallelWorkflow 演示了使用并行执行
// workflow.NewParallelWorker。工作节点运行一个被封装的子节点
// 并行处理列表输入中的每个元素，收集结果。
//
// 这是在 Go 中使用的相当于 Python 中 asyncio.gather 的用法：
//
//	@node(rerun_on_resume=True)
//	异步定义 并行主管(ctx, 节点输入, 真节点):
//	    tasks = [ctx.run_node(real_node, item) for item in node_input]
//	    results = await asyncio.gather(*tasks)
//	    返回结果
func newParallelWorkflow() (agent.Agent, error) {
	// workerNode 处理单个项目。NewParallelWorker 会调用它
	// 对列表输入中的每个元素各执行一次，同时进行。
	workerNode := workflow.NewFunctionNode("worker",
		func(_ agent.Context, item string) (string, error) {
			return fmt.Sprintf("processed: %s", item), nil
		},
		workflow.NodeConfig{},
	)

	// NewParallelWorker 包装 workerNode，使其为每个节点并发运行
	// []string 输入的元素。maxConcurrency=0 表示无限制。
	parallelWorker, err := workflow.NewParallelWorker(
		"parallel_supervisor",
		workerNode,
		0, // maxConcurrency: 0 = unlimited
		workflow.NodeConfig{},
	)
	if err != nil {
		return nil, fmt.Errorf("workflow.NewParallelWorker: %w", err)
	}

	return workflowagent.New(workflowagent.Config{
		Name:        "parallel_workflow",
		Description: "Runs a worker node in parallel for each item in the input list.",
		Edges:       workflow.Chain(workflow.Start, parallelWorker),
	})
}
```

{{% alert context="success" %}}
**提示：恢复并行节点**

工作流框架确保如果动态工作流被恢复，
只有失败或中断的工作节点会被重新执行，包括
由 `NewParallelWorker` 管理的并行工作节点。
{{% /alert %}}
{{% /tab %}}
{{< /tabs >}}
## 人类输入 {#human-input}

ADK 中的动态工作流也可以包含人类输入或人机交互(HITL)步骤。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

你可以通过从节点生成 ***RequestInput*** 来在工作流中构建人类输入，
这会暂停工作流并等待用户输入。以下代码示例展示了如何构建一个人类输入节点并将其包含在工作流中：

```python
from typing import Any
from google.adk import Context
from google.adk.events import RequestInput
from google.adk.workflow import node

@node(rerun_on_resume=False)
async def get_user_approval(ctx: Context, node_input: Any):
    """Yields a RequestInput to pause the workflow and wait for user input."""
    yield RequestInput(message="Please approve this request (Yes/No)")

@node(rerun_on_resume=True)
async def handle_process(ctx: Context, node_input: Any):
    """The orchestrator calling the interactive step."""
    user_response = await ctx.run_node(get_user_approval)

    if user_response.lower() == "yes":
        return "Approved"
    return "Denied"
```

{{% alert context="default" %}}
**重要：带有 `ctx.run_node` 的父节点**

在调用 `ctx.run_node` 的动态工作流中，父节点必须设置 `rerun_on_resume=True` 以正确处理中断。
{{% /alert %}}
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，使用 `workflow.NewEmittingFunctionNode` 与 `workflow.ResumeOrRequestInput` 来实现重新进入 HITL 模式。在第一次执行时，`ResumeOrRequestInput` 会触发 `session.RequestInput` 事件并返回 `ErrNodeInterrupted`，从而暂停工作流。在人类回复后，该节点从顶部（`RerunOnResume: &true`）重新运行，并且 `ResumeOrRequestInput` 直接返回人类的回复：

```go
// newHITLWorkflow 演示了使用再入 HITL 模式
// workflow.ResumeOrRequestInput。在第一次运行时，该节点发出一个
// RequestInput 事件并返回 ErrNodeInterrupted（暂停工作流）。
// 在人工回复之后，同一个节点将从头重新运行
// (RerunOnResume=&true) 并且 ResumeOrRequestInput 返回人类的回复。
//
// 在 Python 中，这相当于：
//
//	@node(rerun_on_resume=True)
//	异步定义 获取用户批准(ctx, 节点输入):
//	    yield RequestInput(message="请批准此请求（是/否）")
//
//	@node(rerun_on_resume=True)
//	异步定义 处理_过程(ctx, 节点输入):
//	    user_response = await ctx.run_node(get_user_approval)
//	    if user_response.lower() == "yes":
//	        返回 "已批准"
//	    返回 "拒绝"
func newHITLWorkflow() (agent.Agent, error) {
	rerun := true

	// approvalNode 在第一次通过时暂停，以询问用户是/否
	// 批准，然后决定是否恢复。
	// workflow.ResumeOrRequestInput 处理两个阶段。
	approvalNode := workflow.NewEmittingFunctionNode[any, any]("get_user_approval",
		func(nc agent.Context, _ any, emit func(*session.Event) error) (any, error) {
			// ResumeOrRequestInput：在第一次运行时，输出提示并
			// 返回 ErrNodeInterrupted。在人工回复后重新运行时，
			// 它直接返回回复负载。
			reply, err := workflow.ResumeOrRequestInput(nc, emit, session.RequestInput{
				InterruptID: "user_approval",
				Message:     "Please approve this request (Yes/No)",
			})
			if err != nil {
				return nil, err
			}

			response, _ := reply.(string)
			if response == "" {
				response = "No"
			}
			if response == "yes" || response == "Yes" {
				return "Approved", nil
			}
			return "Denied", nil
		},
		workflow.NodeConfig{RerunOnResume: &rerun},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "hitl_workflow",
		Description: "Pauses for user approval before completing a task.",
		Edges:       workflow.Chain(workflow.Start, approvalNode),
	})
}
```

{{% /tab %}}
{{< /tabs >}}
## 高级功能 {#advanced-features}

动态工作流提供了一些高级功能，旨在处理更复杂的开发场景。这些功能可以实现对执行的更精细控制，并与现有技术基础设施更好地集成。

### 执行 ID {#execution-ids}

ADK 框架基于父 ID 和计数器为子节点执行生成确定性的标识符 (ID)。ADK 工作流为每个调度的节点使用确定性 ID 来识别先前的结果。这些 ID 是根据动态节点调度的顺序生成的，用于检查点以及在恢复或重新运行工作流的情况下按正确顺序重新运行任务。

#### 自定义执行 ID {#custom-execution-ids}

在某些罕见情况下，您可能需要具有稳定的标识符，例如在处理可重新排序的列表时。一般来说，应避免这样做，因为这会影响工作流任务重试和流程恢复。具体来说，这些 ID 用于检查节点状态，如果节点已经运行，则跳过执行。如果您提供自定义 ID，请确保它们在工作流重运行时是确定的，并且对输入逻辑保持不变。

{{% alert context="warning" %}}
**警告：自定义执行 ID**

避免创建自定义执行 ID。由于执行 ID 用于确定节点的执行顺序，当系统尝试重新运行工作流中的这些节点时，自定义执行 ID 可能会导致问题。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Context
from google.adk.workflow import node
from pydantic import BaseModel
from typing import Any
import asyncio

class Product(BaseModel):
  sku: str
  quantity: int

class Order(BaseModel):
  order_id: str
  cart_items: list[Product]

async def get_orders() -> list[Order]:
  """Fetch the orders to process from your own data source."""
  ...

@node
async def process_order(node_input: Order):
  """Processes a single order."""
  return f"processed {node_input.order_id}"

@node(rerun_on_resume=True)
async def process_all_orders(ctx: Context, node_input: Any):
  orders = await get_orders()

  process_tasks = []
  for order in orders:
    # 使用 run_id 来提供自定义标识符。
    # 自定义 run_id 必须至少包含一个非数字字符
    # 以避免与自动生成的顺序数字 ID 冲突。
    task = ctx.run_node(process_order, order, run_id=f"order-{order.order_id}")
    process_tasks.append(task)

  results = await asyncio.gather(*process_tasks)
  return results
```

默认情况下，自动生成的运行 ID 是从 `"1"`（以字符串表示）开始的顺序整数。自定义 `run_id` 值必须至少包含一个非数字字符，以避免与这些自动生成的 ID 冲突。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，将 `workflow.WithRunID("order-x")` 作为尾随选项传递给 `workflow.RunNode`。该 ID 必须至少包含一个非数字字符，以避免与自动生成的顺序计数器 ID 冲突：

```go
// newCustomIDWorkflow 演示了如何通过提供稳定的自定义运行 ID
// workflow.WithRunID — 相当于 Python 的：
//
//	task = ctx.run_node(process_order, order, run_id=f"order-{order.order_id}")
//
// 自定义运行 ID 必须至少包含一个非数字字符以避免
// 与自动生成的顺序整数ID的冲突。
func newCustomIDWorkflow() (agent.Agent, error) {
	processOrderNode := workflow.NewFunctionNode("process_order",
		func(_ agent.Context, orderID string) (string, error) {
			return fmt.Sprintf("processed order %s", orderID), nil
		},
		workflow.NodeConfig{},
	)

	orders := []string{"ord-001", "ord-002", "ord-003"}

	processAllOrders := workflow.NewDynamicNode[any, []string]("process_all_orders",
		func(ctx agent.Context, _ any, _ func(*session.Event) error) ([]string, error) {
			results := make([]string, 0, len(orders))
			for _, orderID := range orders {
				// WithRunID 提供一个稳定的、确定性的标识符，用于
				// 每个子调用。ID必须至少包含一个
				// 非数字字符以避免与…冲突
				// 自动生成的顺序计数器ID。
				result, err := workflow.RunNode[string](
					ctx,
					processOrderNode,
					orderID,
					workflow.WithRunID(fmt.Sprintf("order-%s", orderID)),
				)
				if err != nil {
					return nil, fmt.Errorf("process order %s: %w", orderID, err)
				}
				results = append(results, result)
			}
			return results, nil
		},
		workflow.NodeConfig{},
	)

	return workflowagent.New(workflowagent.Config{
		Name:        "custom_id_workflow",
		Description: "Processes orders with stable per-order execution IDs.",
		Edges:       workflow.Chain(workflow.Start, processAllOrders),
	})
}
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[Dynamic agent workflows](https://adk.dev/graphs/dynamic/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/graphs/dynamic.md)
