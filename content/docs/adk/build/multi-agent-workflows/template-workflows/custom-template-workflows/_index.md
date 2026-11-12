---
title: "自定义模板工作流"
description: "自定义 Agent 和基于 Agent 的工作流允许您通过直接继承 `BaseAgent` 并实现您自己的控制流程来定义任意的编排逻辑。这种方法允许您创建新的执行 p"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

自定义 Agent 和基于 Agent 的工作流允许您通过直接继承 `BaseAgent` 并实现自己的控制流程来定义任意的编排逻辑。这种方法让您能够创建类似 `SequentialAgent`、`LoopAgent` 和 `ParallelAgent` 的新的执行模式，使您能够构建高度特定和复杂的 Agent 工作流。

{{% alert context="warning" %}}
**备选方案：基于图的工作流**

从 ADK 2.0 开始，使用 `BaseAgent` 的基于 Agent 的工作流已经被更灵活的工作流结构取代，包括 [基于图的工作流](/docs/adk/build/graph-workflows/) 和 [动态工作流](/docs/adk/build/graph-workflows/dynamic-workflows/)。在为目标工作流构建自定义 Agent 之前，您应先评估这些工作流机制的能力。
{{% /alert %}}
{{% alert context="warning" %}}
**高级概念**

通过直接实现 `_run_async_impl`（或其他语言的等效实现）来构建自定义 Agent，提供了强大的控制能力，但比使用预定义的 `LlmAgent` 或 `WorkflowAgent` 类型更复杂。我们建议先了解这些基础 Agent 类型，然后再处理自定义编排逻辑。
{{% /alert %}}
## 概述 {#overview}

自定义 Agent 本质上是任何从 `google.adk.agents.BaseAgent` 继承并在 `_run_async_impl` 异步方法中实现其核心执行逻辑的类。您可以完全控制该方法如何调用其他子 Agent、管理状态以及处理事件。

![intro_components.png](/images/adk/custom-agent-flow.png)

{{% alert context="default" %}}

实现 Agent 核心异步逻辑的具体方法名称可能因 SDK 语言而略有不同，例如 Java 中的 `runAsyncImpl`、Python 中的 `_run_async_impl` 或 TypeScript 中的 `runAsyncImpl`。详见特定语言的 API 文档。
{{% /alert %}}
### 为什么要构建自定义 Agent？ {#why-build-custom-agents}

在审查现有 ADK [Agent 工作流](/docs/adk/build/multi-agent-workflows/) 方法和架构后，如果这些机制不能满足您项目的一个或多个以下需求，您可能需要考虑构建自定义工作流 Agent：* **条件逻辑:** 根据运行时条件或前一步的结果执行不同的子 Agent 或采取不同路径。
* **复杂状态管理:** 实现复杂的逻辑，以在整个工作流中维护和更新状态，而不仅仅是简单的顺序传递。
* **外部集成:** 在编排流程控制中直接调用外部 API、数据库或自定义库。
* **动态 Agent 选择:** 根据情况或输入的动态评估选择下一个运行的子 Agent。
* **独特工作流模式:** 实现不符合标准顺序、并行或循环结构的编排逻辑。

## 实现自定义逻辑 {#implementing-custom-logic}

任何自定义 Agent 的核心是用于定义其独特异步行为的方法。该方法允许你编排子 Agent 并管理执行流程。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

  任何自定义 Agent 的核心是 `_run_async_impl` 方法。在这里你定义其独特行为。

  * **签名:** `async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:`
  * **异步生成器:** 它必须是 `async def` 函数并返回 `AsyncGenerator`。这允许它将子 Agent 或自身逻辑产生的 `yield` 事件传回 Runner。
  * **`ctx` (InvocationContext):** 提供对关键运行时信息的访问，最重要的是 `ctx.session.state`，这是在自定义 Agent 编排的步骤之间共享数据的主要方式。
  * **实时音视频运行:** `_run_async_impl` 方法仅涵盖非实时运行 (`run_async()`)。要支持 `run_live()`，还需要重写 `_run_live_impl`，它具有相同的签名。没有该重写，实时运行会触发 `NotImplementedError`。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，你通过将 `Run` 函数传递给 `agent.New` 来创建自定义 Agent，并将其放入 `agent.Config` 中。你不能直接实现 `agent.Agent` 接口，因为它包含一个未导出的方法。实际逻辑通常是自定义 Agent 结构体上的一个方法，你将其作为 `Run` 传递。

*   **签名:** `Run(ctx agent.InvocationContext) iter.Seq2[*session.Event, error]`
*   **迭代器:** `Run` 方法返回一个迭代器 (`iter.Seq2`)，用于生成事件和错误。这是处理 Agent 执行流结果的标准方式。
*   **`ctx` (InvocationContext):** `agent.InvocationContext` 提供对会话的访问，包括状态和其他关键运行时信息。
*   **会话状态:** 可通过 `ctx.Session().State()` 访问会话状态。
{{% /tab %}}
{{< /tabs >}}
### 核心异步方法中的关键能力 {#key-capabilities-within-the-core-asynchronous-method}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}1. **调用子 Agent:** 你通过调用其 `run_async` 方法并生成它们的事件来调用子 Agent（这些子 Agent 通常存储为实例属性，如 `self.my_llm_agent`）:

      ```python
      async for event in self.some_sub_agent.run_async(ctx):
          # 可选择检查或记录事件
          yield event # Pass the event up
      ```

2. **管理状态：** 从会话状态字典 (`ctx.session.state`) 读取和写入，以便在子 Agent 调用之间传递数据或做出决策：

      ```python
      # 读取之前 Agent 的数据集
      previous_result = ctx.session.state.get("some_key")

      # 根据状态做出决策
      if previous_result == "some_value":
          # ... 调用特定的子 Agent ...
      else:
          # ... 调用另一个子 Agent ...

      # 存储结果以供后续步骤使用（通常通过子 Agent 的 output_key 完成）
      # ctx.session.state["my_custom_result"] = "calculated_value"
      ```

3. **实现控制流程：** 使用标准的 Python 构造（`if`/`elif`/`else`，`for`/`while` 循环，`try`/`except`）来创建涉及子 Agent 的复杂、条件或迭代工作流。
{{% /tab %}}
{{% tab tabName="Go" %}}

1. **调用子 Agent：** 你可以通过调用它们的 `Run` 方法来调用子 Agent。

      ```go
      // 示例：运行一个子 Agent 并生成其事件
      for event, err := range someSubAgent.Run(ctx) {
          if err != nil {
              // 处理或传播错误
              return
          }
          // 将事件传递给调用者
          if !yield(event, nil) {
            return
          }
      }
      ```

2. **管理状态：** 从会话状态中读取和写入数据，以在子 Agent 调用之间传递数据或进行决策。

      ```go
      // `ctx`（`agent.InvocationContext`）直接传递给你的 agent 的 `Run` 函数。
      // 读取之前 Agent 的数据集
      previousResult, err := ctx.Session().State().Get("some_key")
      if err != nil {
          // 处理键可能尚不存在的情况
      }

      // 根据状态做出决策
      if val, ok := previousResult.(string); ok && val == "some_value" {
          // ... 调用特定的子 Agent ...
      } else {
          // ... 调用另一个子 Agent ...
      }

      // 存储一个结果以供后续步骤使用
      if err := ctx.Session().State().Set("my_custom_result", "calculated_value"); err != nil {
          // 处理错误
      }
      ```

3. **实现控制流：** 使用标准的 Go 结构（`if`/`else`、`for`/`switch`循环、流程、通道）来创建涉及子 Agent 的复杂、条件或迭代工作流。
{{% /tab %}}
{{< /tabs >}}
## 管理分 Agent 和国家 {#managing-sub-agents-and-state}

通常，定制 Agent 会协调其他 Agent（如`LlmAgent`、`LoopAgent`等）。

* **初始化：** 你通常将这些子 Agent 的实例传递到自定义 Agent 的构造器中，并将它们存储为实例字段/属性（例如 `this.story_generator = story_generator_instance` 或 `self.story_generator = story_generator_instance`）。这使得它们能够在自定义 Agent 的核心异步执行逻辑中访问（例如：`_run_async_impl`方法）。在 Python 中，`BaseAgent` 是一个配置为 `extra='forbid'` 的 Pydantic 模型，因此请将你保留的每个子 Agent 声明为带注释的类级字段，如 `story_generator: LlmAgent`，并传递给 `super().__init__(...)`。在`__init__`中分配未声明属性会引发`ValueError`。
* **子 Agent 列表：** 在使用`super()`构造函数初始化`BaseAgent`时，你应该传递一个`sub agents`列表。这个列表告诉 ADK 框架该定制 Agent 直接层级中的 Agent。它对生命周期管理、内省以及未来可能的路由功能等框架功能非常重要，即使你的核心执行逻辑（`_run_async_impl`）通过`self.xxx_agent`直接调用 Agent。包含你的自定义逻辑直接调用的 Agent。
* **状态：** 如前所述，`ctx.session.state`是子 Agent（尤其是使用 `output key` 的 `LlmAgent`）向编排器传递结果及编排器如何向下传递必要输入的标准方式。

## 基于 Agent 的工作流原语 {#agent-based-workflow-primitives}

以下章节详细介绍了 ADK 的核心原语——例如 Agent 层级，
工作流 Agent 和交互机制——使你能够构建和
有效管理这些多 Agent 系统。ADK 提供核心构建
方块——原语——使你能够在内部结构化和管理交互
你的多 Agent 系统。

{{% alert context="default" %}}

原语的具体参数或方法名称可能略有不同：
SDK 语言，例如`sub_agents` Python，`subAgents` Java 版本。参考文献
详情请参阅语言特定的 API 文档。
{{% /alert %}}
### Agent 层级结构：父 Agent 和子 Agent {#agent-hierarchy-parent-agents-and-sub-agents}

构建多 Agent 系统的基础是`BaseAgent`中定义的父子关系。* **建立层级结构：** 通过在初始化父 Agent 时，将 Agent 实例列表传递给 `sub_agents` 参数，您可以创建一个树状结构。ADK 会在初始化时自动为每个子 Agent 设置 `parent_agent` 属性。
* **单父规则：** 一个 Agent 实例只能被添加为子 Agent 一次。尝试分配第二个父 Agent 将导致 `ValueError`。
* **重要性：** 该层级结构定义了 [工作流 Agent](#workflow-agents-as-orchestrators) 的范围，并影响 LLM 驱动委派的潜在目标。您可以使用 `agent.parent_agent` 浏览层级结构，或使用 `agent.find_agent(name)` 查找后代。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念示例：定义层级
from typing import AsyncGenerator

from google.adk.agents import LlmAgent, BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event

# 自定义非 LLMAgent 必须实现 _run_async_impl；直接实例化
# BaseAgent 在运行时会引发 NotImplementedError。
class TaskExecutor(BaseAgent):
    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        yield Event(author=self.name)

# 定义单个 Agent
greeter = LlmAgent(name="Greeter", model="gemini-flash-latest")
task_doer = TaskExecutor(name="TaskExecutor") # Custom non-LLM agent

# 创建父 Agent 并通过 sub_agents 分配子 Agent
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-flash-latest",
    description="I coordinate greetings and tasks.",
    sub_agents=[ # Assign sub_agents here
        greeter,
        task_doer
    ]
)

# 框架会自动设置：
# assert greeter.parent_agent == coordinator
# assert task_doer.parent_agent == coordinator
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
)

	// 概念示例：定义层级
	// 定义单个 Agent
	greeter, _ := llmagent.New(llmagent.Config{Name: "Greeter", Model: m})
	taskDoer, _ := agent.New(agent.Config{Name: "TaskExecutor"}) // Custom non-LLM agent

	// 创建父 Agent 并通过 sub_agents 分配子 Agent
	coordinator, _ := llmagent.New(llmagent.Config{
		Name:        "Coordinator",
		Model:       m,
		Description: "I coordinate greetings and tasks.",
		SubAgents:   []agent.Agent{greeter, taskDoer}, // Assign sub_agents here
	})
```

{{% /tab %}}
{{< /tabs >}}
### 工作流 Agent 作为协调者 {#workflow-agents-as-orchestrators}

ADK 包含源自 `BaseAgent` 的专用 Agent，这些 Agent 本身不执行任务，而是协调其 `sub_agents` 的执行流程。

{{% alert context="info" %}}
**在 Python 和 TypeScript 中已弃用**

在 Python 和 TypeScript 中，`SequentialAgent`、`ParallelAgent` 和 `LoopAgent` 已被 `Workflow` 取代：构造时会发出弃用警告，并且这些类将在将来的版本中删除。
`Workflow` 不能用作 `LlmAgent` 的子 Agent。
{{% /alert %}}
* **[`SequentialAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/)：** 按列出的顺序依次执行其 `sub_agents`。
    * **上下文：** 传递 *相同的* [`InvocationContext`](/docs/adk/run/agent-runtime/)，允许 Agent 通过共享状态轻松传递结果。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念示例：顺序管道
from google.adk.agents import SequentialAgent, LlmAgent

step1 = LlmAgent(name="Step1_Fetch", output_key="data") # Saves output to state['data']
step2 = LlmAgent(name="Step2_Process", instruction="Process data from {data}.")

pipeline = SequentialAgent(name="MyPipeline", sub_agents=[step1, step2])
# 当管道运行时，步骤2可以访问由步骤1设置的state['data']。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
)

	// 概念示例：顺序管道
	step1, _ := llmagent.New(llmagent.Config{Name: "Step1_Fetch", OutputKey: "data", Model: m}) // Saves output to state["data"]
	step2, _ := llmagent.New(llmagent.Config{Name: "Step2_Process", Instruction: "Process data from {data}.", Model: m})

	pipeline, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "MyPipeline", SubAgents: []agent.Agent{step1, step2}},
	})
	// 当管道运行时，Step2 可以访问 Step1 设置的 state["data"]。
```

{{% /tab %}}
{{< /tabs >}}
* **[`ParallelAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/parallel-workflow/)：** 并行执行其 `sub_agents`。子 Agent 的事件可能会交错出现。
    * **上下文：** 修改每个子 Agent（例如 `ParentBranch.ChildName`）的 `InvocationContext.branch`，提供一个独特的上下文路径，这在某些内存实现中有助于隔离历史。
    * **状态：** 尽管分支不同，所有并行子 Agent 访问*相同的共享* `session.state`，使它们能够读取初始状态并写入结果（使用不同的键以避免竞态条件）。

{{< tabs tabTotal="4" >}}
{{% tab tabName="Python" %}}

```python
# 概念示例：并行执行
from google.adk.agents import ParallelAgent, LlmAgent

fetch_weather = LlmAgent(name="WeatherFetcher", output_key="weather")
fetch_news = LlmAgent(name="NewsFetcher", output_key="news")

gatherer = ParallelAgent(name="InfoGatherer", sub_agents=[fetch_weather, fetch_news])
# 当 gatherer 运行时，WeatherFetcher 和 NewsFetcher 并发运行。
# 后续的 Agent 可以读取 state['weather'] 和 state['news']。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/parallelagent"
)

	// 概念示例：并行执行
	fetchWeather, _ := llmagent.New(llmagent.Config{Name: "WeatherFetcher", OutputKey: "weather", Model: m})
	fetchNews, _ := llmagent.New(llmagent.Config{Name: "NewsFetcher", OutputKey: "news", Model: m})

	gatherer, _ := parallelagent.New(parallelagent.Config{
		AgentConfig: agent.Config{Name: "InfoGatherer", SubAgents: []agent.Agent{fetchWeather, fetchNews}},
	})
	// 当 gatherer 运行时，WeatherFetcher 和 NewsFetcher 并发运行。
	// 后续的 Agent 可以读取 state["weather"] 和 state["news"]。
```

{{% /tab %}}
{{% tab tabName="Python" %}}

  ```python
  # 概念示例：带条件的循环
  from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
  from google.adk.events import Event, EventActions
  from google.adk.agents.invocation_context import InvocationContext
  from typing import AsyncGenerator

  class CheckCondition(BaseAgent): # Custom agent to check state
      async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
          status = ctx.session.state.get("status", "pending")
          is_done = (status == "completed")
          yield Event(author=self.name, actions=EventActions(escalate=is_done)) # Escalate if done

  process_step = LlmAgent(name="ProcessingStep") # Agent that might update state['status']

  poller = LoopAgent(
      name="StatusPoller",
      max_iterations=10,
      sub_agents=[process_step, CheckCondition(name="Checker")]
  )
  # 当轮询器运行时，它会重复执行 process_step 然后执行 Checker
  # 直到 Checker 提升（state['status'] == 'completed'）或经过 10 次迭代。
  ```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "iter"
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/loopagent"
    "google.golang.org/adk/v2/session"
)

	// 概念示例：带条件的循环
	// 自定义 Agent 以检查状态
	checkCondition, _ := agent.New(agent.Config{
		Name: "Checker",
		Run: func(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
			return func(yield func(*session.Event, error) bool) {
				status, err := ctx.Session().State().Get("status")
				// 如果状态中没有“status”，默认为“pending”。
				// 这是 Go 语言中处理查找可能出错的惯用方法。
				if err != nil {
					status = "pending"
				}
				isDone := status == "completed"
				yield(&session.Event{Author: "Checker", Actions: session.EventActions{Escalate: isDone}}, nil)
			}
		},
	})

	processStep, _ := llmagent.New(llmagent.Config{Name: "ProcessingStep", Model: m}) // Agent that might update state["status"]

	poller, _ := loopagent.New(loopagent.Config{
		MaxIterations: 10,
		AgentConfig:   agent.Config{Name: "StatusPoller", SubAgents: []agent.Agent{processStep, checkCondition}},
	})
	// 当轮询器运行时，它会反复执行 processStep 然后执行 Checker
	// 直到 Checker 升级（state["status"] == "completed"）或经过 10 次迭代。
```

{{% /tab %}}
{{< /tabs >}}
### 交互和通信机制 {#interaction-and-communication-mechanisms}

系统中的 Agent 通常需要交换数据或触发彼此的操作。ADK 通过以下方式实现这一点：

#### 共享会话状态 {#shared-session-state}

在相同调用中运行的 Agent（从而通过 `InvocationContext` 共享相同的 [`Session`](/docs/adk/components/agent-context/sessions/) 对象）进行被动通信的最基本方式。

* **机制：** 一个 Agent（或其工具/回调）写入一个值（`context.state['data_key'] = processed_data`），随后另一个 Agent 读取它（`data = context.state.get('data_key')`）。在 Python 中，[`CallbackContext`](/docs/adk/components/app-management/callbacks/) 和 `ToolContext` 是相同的增量感知上下文类，每次对 `context.state` 的写入都会作为 `state_delta` 记录到 Agent 发出的事件中。
* **便利性：** [`LlmAgent`](/docs/adk/build/agents/simple-agents/) 上的 `output_key` 属性会自动将 Agent 的最终响应文本（或结构化输出）保存到指定的状态键中。
* **性质：** 异步、被动通信。非常适合由 `SequentialAgent` 编排的流水线或在 `LoopAgent` 迭代之间传递数据。
* **另请参阅：** [状态管理](/docs/adk/components/agent-context/state/)

{{% alert context="info" %}}
**调用上下文和 `temp:` 状态**

当父 Agent 调用子 Agent 时，它会传递相同的 `InvocationContext`。这意味着它们共享相同的临时（`temp:`）状态，这对于传递仅与当前回合相关的数据非常理想。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念示例：使用 output_key 和读取状态
from google.adk.agents import LlmAgent, SequentialAgent

agent_A = LlmAgent(name="AgentA", instruction="Find the capital of France.", output_key="capital_city")
agent_B = LlmAgent(name="AgentB", instruction="Tell me about the city stored in {capital_city}.")

pipeline = SequentialAgent(name="CityInfo", sub_agents=[agent_A, agent_B])
# AgentA 运行，将 "Paris" 保存到 state['capital_city']。
# AgentB 运行，它的指令处理器读取 state['capital_city'] 以获取 "Paris"。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
)

	// 概念示例：使用 output_key 和读取状态
	agentA, _ := llmagent.New(llmagent.Config{Name: "AgentA", Instruction: "Find the capital of France.", OutputKey: "capital_city", Model: m})
	agentB, _ := llmagent.New(llmagent.Config{Name: "AgentB", Instruction: "Tell me about the city stored in {capital_city}.", Model: m})

	pipeline2, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "CityInfo", SubAgents: []agent.Agent{agentA, agentB}},
	})
	// AgentA 运行，将 "Paris" 保存到 state["capital_city"]。
	// AgentB 运行，其指令处理器读取 state["capital_city"] 以获取 "Paris"。
```

{{% /tab %}}
{{< /tabs >}}
#### LLM 委派与 Agent 转移 {#delegation}

利用 [`LlmAgent`](/docs/adk/build/agents/simple-agents/) 的理解动态地将任务路由到层级内其他合适的 Agent。

* **机制：** Agent 的 LLM 生成一个特定的函数调用：`transfer_to_agent(agent_name='target_agent_name')`。
* **处理：** 当存在子 Agent 或未禁止转移时，默认使用 `AutoFlow` 来拦截此调用。它使用 `root_agent.find_agent()` 确定目标 Agent，并更新 `InvocationContext` 以切换执行焦点。
* **要求：** 调用的 `LlmAgent` 需要明确的 `instructions` 以确定何时转移，潜在目标 Agent 需要有不同的 `description`，以便 LLM 做出知情决策。转移范围（父级、子 Agent、同级）可以在 `LlmAgent` 上配置。
* **性质：** 基于 LLM 解释的动态、灵活路由。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念设定：LLM 转移
from google.adk.agents import LlmAgent

booking_agent = LlmAgent(name="Booker", description="Handles flight and hotel bookings.")
info_agent = LlmAgent(name="Info", description="Provides general information and answers questions.")

coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-flash-latest",
    instruction="You are an assistant. Delegate booking tasks to Booker and info requests to Info.",
    description="Main coordinator.",
    # 这里通常隐式使用 AutoFlow
    sub_agents=[booking_agent, info_agent]
)
# 如果协调器收到“预订航班”，它的 LLM 应生成：
# FunctionCall(name='transfer_to_agent', args={'agent_name': 'Booker'})
# 然后 ADK 框架将执行路由到 booking_agent。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent/llmagent"
)

	// 概念设定：LLM 转移
	bookingAgent, _ := llmagent.New(llmagent.Config{Name: "Booker", Description: "Handles flight and hotel bookings.", Model: m})
	infoAgent, _ := llmagent.New(llmagent.Config{Name: "Info", Description: "Provides general information and answers questions.", Model: m})

	coordinator, _ = llmagent.New(llmagent.Config{
		Name:        "Coordinator",
		Model:       m,
		Instruction: "You are an assistant. Delegate booking tasks to Booker and info requests to Info.",
		Description: "Main coordinator.",
		SubAgents:   []agent.Agent{bookingAgent, infoAgent},
	})

	// 如果协调器收到“预订航班”，它的 LLM 应生成：
	// FunctionCall{Name: "transfer_to_agent", Args: map[string]any{"agent_name": "Booker"}}
	// 然后 ADK 框架将执行路由到 bookingAgent。
```

{{% /tab %}}
{{< /tabs >}}
#### 使用 `AgentTool` 显式调用 {#explicit-invocation-with-agenttool}

允许一个 [`LlmAgent`](/docs/adk/build/agents/simple-agents/) 将另一个 `BaseAgent` 实例视为可调用函数或 [Tool](/docs/adk/components/custom-tools/)。

* **机制：** 将目标 Agent 实例封装在 `AgentTool` 中，并将其包括在父 `LlmAgent` 的 `tools` 列表中。`AgentTool` 为 LLM 生成相应的函数声明。
* **处理：** 当父 LLM 生成针对 `AgentTool` 的函数调用时，框架会执行 `AgentTool.run_async`。此方法运行目标 Agent，捕获其最终响应，将任何状态/Artifact 变更传回父上下文，并将响应作为工具结果返回。
* **性质：** 同步（在父流程内）、显式、受控调用，类似任何其他工具。
* **（注意：** `AgentTool` 需要显式导入和使用）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念设置：将 Agent 作为工具
from google.adk import Event
from google.adk.agents import LlmAgent, BaseAgent
from google.adk.tools import agent_tool
from google.genai import types
from pydantic import BaseModel

# 定义一个目标 Agent（可以是 LlmAgent 或自定义 BaseAgent）
class ImageGeneratorAgent(BaseAgent): # Example custom agent
    name: str = "ImageGen"
    description: str = "Generates an image based on a prompt."
    # ... 内部逻辑 ...
    async def _run_async_impl(self, ctx): # Simplified run logic
        prompt = ctx.session.state.get("image_prompt", "default prompt")
        # ... 生成图像字节 ...
        image_bytes = b"..."
        yield Event(author=self.name, content=types.Content(parts=[types.Part.from_bytes(data=image_bytes, mime_type="image/png")]))

image_agent = ImageGeneratorAgent()
image_tool = agent_tool.AgentTool(agent=image_agent) # Wrap the agent

# 父 Agent 使用 AgentTool
artist_agent = LlmAgent(
    name="Artist",
    model="gemini-flash-latest",
    instruction="Create a prompt and use the ImageGen tool to generate the image.",
    tools=[image_tool] # Include the AgentTool
)
# 艺术家 LLM 生成提示，然后调用：
# FunctionCall(name='ImageGen', args={'image_prompt': '戴着帽子的猫'})
# 框架调用 image_tool.run_async(...)，它运行 ImageGeneratorAgent。
# 生成的图像部分作为工具结果返回给艺术家 Agent。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "fmt"
    "iter"
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/model"
    "google.golang.org/adk/v2/session"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/agenttool"
    "google.golang.org/genai"
)

	// 概念设置：将 Agent 作为工具
	// 定义一个目标 Agent（可以是 LlmAgent 或自定义 BaseAgent）
	imageAgent, _ := agent.New(agent.Config{
		Name:        "ImageGen",
		Description: "Generates an image based on a prompt.",
		Run: func(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
			return func(yield func(*session.Event, error) bool) {
				prompt, _ := ctx.Session().State().Get("image_prompt")
				fmt.Printf("Generating image for prompt: %v\n", prompt)
				imageBytes := []byte("...") // Simulate image bytes
				yield(&session.Event{
					Author: "ImageGen",
					LLMResponse: model.LLMResponse{
						Content: &genai.Content{
							Parts: []*genai.Part{genai.NewPartFromBytes(imageBytes, "image/png")},
						},
					},
				}, nil)
			}
		},
	})

	// 封装 Agent
	imageTool := agenttool.New(imageAgent, nil)

	// 现在 imageTool 可以被其他 Agent 作为工具使用。

	// 父 Agent 使用 AgentTool
	artistAgent, _ := llmagent.New(llmagent.Config{
		Name:        "Artist",
		Model:       m,
		Instruction: "Create a prompt and use the ImageGen tool to generate the image.",
		Tools:       []tool.Tool{imageTool}, // Include the AgentTool
	})
	// 艺术家 LLM 生成提示，然后调用：
	// FunctionCall{Name: "ImageGen", Args: map[string]any{"image_prompt": "戴着帽子的猫"}}
	// 框架调用 imageTool.Run(...)，它运行 ImageGeneratorAgent。
	// 生成的图像部分作为工具结果返回给艺术家 Agent。
```

{{% /tab %}}
{{< /tabs >}}
这些原语提供了设计多 Agent 交互的灵活性，范围从紧密耦合的顺序工作流到动态的、由大型语言模型（LLM）驱动的委派网络。

## 设计模式示例：StoryFlow Agent {#design-pattern-example-storyflow-agent}

让我们通过一个示例模式来说明自定义 Agent 的强大功能：一个具有条件逻辑的多阶段内容生成工作流。

**目标：** 创建一个系统，用于生成故事，通过批评和修改迭代地完善故事，执行最终检查，并且关键是，如果最终语气检查失败，*重新生成故事*。

**为什么需要自定义？** 这里推动需要自定义 Agent 的核心要求是**基于语气检查的条件性再生成**。标准工作流 Agent 没有基于子 Agent 任务结果的内置条件分支。我们需要在协调器中实现自定义逻辑（`if tone == "negative": ...`）。

### 第1部分：简化的自定义 Agent 初始化 {#part-1-simplified-custom-agent-initialization}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

我们定义继承自 `BaseAgent` 的 `StoryFlowAgent`。在 `__init__` 中，我们将必要的子 Agent（传入的）存储为实例属性，并告知 `BaseAgent` 框架该自定义 Agent 将直接协调的顶级 Agent。

```python
class StoryFlowAgent(BaseAgent):
    """
    Custom agent for a story generation and refinement workflow.

    This agent orchestrates a sequence of LLM agents to generate a story,
    critique it, revise it, check grammar and tone, and potentially
    regenerate the story if the tone is negative.
    """

    # --- Pydantic 的字段声明 ---
    # 将初始化时传入的 Agent 声明为带类型提示的类属性
    story_generator: LlmAgent
    critic: LlmAgent
    reviser: LlmAgent
    grammar_check: LlmAgent
    tone_check: LlmAgent

    loop_agent: LoopAgent
    sequential_agent: SequentialAgent

    # model_config 允许在需要时设置 Pydantic 配置，例如 arbitrary_types_allowed
    model_config = {"arbitrary_types_allowed": True}

    def __init__(
        self,
        name: str,
        story_generator: LlmAgent,
        critic: LlmAgent,
        reviser: LlmAgent,
        grammar_check: LlmAgent,
        tone_check: LlmAgent,
    ):
        """
        Initializes the StoryFlowAgent.

        Args:
            name: The name of the agent.
            story_generator: An LlmAgent to generate the initial story.
            critic: An LlmAgent to critique the story.
            reviser: An LlmAgent to revise the story based on criticism.
            grammar_check: An LlmAgent to check the grammar.
            tone_check: An LlmAgent to analyze the tone.
        """
        # 在调用 super().__init__ 之前创建内部 Agent
        loop_agent = LoopAgent(
            name="CriticReviserLoop", sub_agents=[critic, reviser], max_iterations=2
        )
        sequential_agent = SequentialAgent(
            name="PostProcessing", sub_agents=[grammar_check, tone_check]
        )

        # 为框架定义 sub_agents 列表
        sub_agents_list = [
            story_generator,
            loop_agent,
            sequential_agent,
        ]

        # Pydantic 将根据类注解进行验证和赋值
        super().__init__(
            name=name,
            story_generator=story_generator,
            critic=critic,
            reviser=reviser,
            grammar_check=grammar_check,
            tone_check=tone_check,
            loop_agent=loop_agent,
            sequential_agent=sequential_agent,
            sub_agents=sub_agents_list, # Pass the sub_agents list directly
        )
```

{{% /tab %}}
{{% tab tabName="Go" %}}

我们定义了 `StoryFlowAgent` 结构体和一个构造函数。在构造函数中，我们存储必要的子 Agent，并告知 `BaseAgent` 框架该自定义 Agent 将直接协调的顶级 Agent。

```go
// StoryFlowAgent 是一个自定义 Agent，用于协调故事生成工作流。
// 它封装了按特定顺序运行子 Agent 的逻辑。
type StoryFlowAgent struct {
	storyGenerator     agent.Agent
	revisionLoopAgent  agent.Agent
	postProcessorAgent agent.Agent
}

// NewStoryFlowAgent 创建并配置整个自定义 Agent 工作流。
// 它以单个 LLM Agent 作为输入，并在内部创建必要的
// 工作流 Agent（循环、顺序），返回最终的协调器 Agent。
func NewStoryFlowAgent(
	storyGenerator,
	critic,
	reviser,
	grammarCheck,
	toneCheck agent.Agent,
) (agent.Agent, error) {
	loopAgent, err := loopagent.New(loopagent.Config{
		MaxIterations: 2,
		AgentConfig: agent.Config{
			Name:      "CriticReviserLoop",
			SubAgents: []agent.Agent{critic, reviser},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create loop agent: %w", err)
	}

	sequentialAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:      "PostProcessing",
			SubAgents: []agent.Agent{grammarCheck, toneCheck},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create sequential agent: %w", err)
	}

	// StoryFlowAgent 结构体保存 Run 方法所需的 Agent。
	orchestrator := &StoryFlowAgent{
		storyGenerator:     storyGenerator,
		revisionLoopAgent:  loopAgent,
		postProcessorAgent: sequentialAgent,
	}

	// agent.New 创建最终 Agent，连接 Run 方法。
	return agent.New(agent.Config{
		Name:        "StoryFlowAgent",
		Description: "Orchestrates story generation, critique, revision, and checks.",
		SubAgents:   []agent.Agent{storyGenerator, loopAgent, sequentialAgent},
		Run:         orchestrator.Run,
	})
}
```

{{% /tab %}}
{{< /tabs >}}
### 第2部分：定义自定义执行逻辑 {#part-2-define-custom-execution-logic}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

此方法使用标准的 Python 异步/等待和控制流来协调子 Agent。

```python
@override
async def _run_async_impl(
    self, ctx: InvocationContext
) -> AsyncGenerator[Event, None]:
    """
    Implements the custom orchestration logic for the story workflow.
    Uses the instance attributes assigned by Pydantic (e.g., self.story_generator).
    """
    logger.info(f"[{self.name}] Starting story generation workflow.")

    # 1. 初始故事生成
    logger.info(f"[{self.name}] Running StoryGenerator...")
    async for event in self.story_generator.run_async(ctx):
        logger.info(f"[{self.name}] Event from StoryGenerator: {event.model_dump_json(indent=2, exclude_none=True)}")
        yield event

    # 在继续之前检查故事是否已生成
    if "current_story" not in ctx.session.state or not ctx.session.state["current_story"]:
         logger.error(f"[{self.name}] Failed to generate initial story. Aborting workflow.")
         return # Stop processing if initial story failed

    logger.info(f"[{self.name}] Story state after generator: {ctx.session.state.get('current_story')}")

    # 2. 批评-修订循环
    logger.info(f"[{self.name}] Running CriticReviserLoop...")
    # 使用初始化期间分配的 loop_agent 实例属性
    async for event in self.loop_agent.run_async(ctx):
        logger.info(f"[{self.name}] Event from CriticReviserLoop: {event.model_dump_json(indent=2, exclude_none=True)}")
        yield event

    logger.info(f"[{self.name}] Story state after loop: {ctx.session.state.get('current_story')}")

    # 3. 顺序后处理（语法和语气检查）
    logger.info(f"[{self.name}] Running PostProcessing...")
    # 使用初始化期间分配的 sequential_agent 实例属性
    async for event in self.sequential_agent.run_async(ctx):
        logger.info(f"[{self.name}] Event from PostProcessing: {event.model_dump_json(indent=2, exclude_none=True)}")
        yield event

    # 4. 基于语气的条件逻辑
    tone_check_result = ctx.session.state.get("tone_check_result")
    logger.info(f"[{self.name}] Tone check result: {tone_check_result}")

    if tone_check_result == "negative":
        logger.info(f"[{self.name}] Tone is negative. Regenerating story...")
        async for event in self.story_generator.run_async(ctx):
            logger.info(f"[{self.name}] Event from StoryGenerator (Regen): {event.model_dump_json(indent=2, exclude_none=True)}")
            yield event
    else:
        logger.info(f"[{self.name}] Tone is not negative. Keeping current story.")
        pass

    logger.info(f"[{self.name}] Workflow finished.")
```

**逻辑说明：**

1. 初始的 `story_generator` 运行。其输出预期存放在 `ctx.session.state["current_story"]`。
2. `loop_agent` 运行，它内部依次调用 `critic` 和 `reviser`，共 `max_iterations` 次。它们从状态中读取/写入 `current_story` 和 `criticism`。
3. `sequential_agent` 运行，先调用 `grammar_check`，然后调用 `tone_check`，读取 `current_story`，并向状态中写入 `grammar_suggestions` 和 `tone_check_result`。
4. **自定义部分：** `if` 语句检查状态中的 `tone_check_result`。如果它是“负面”，则再次调用 `story_generator`，覆盖状态中的 `current_story`。否则，流程结束。
{{% /tab %}}
{{% tab tabName="Go" %}}

`Run` 方法通过循环调用子 Agent 的各自 `Run` 方法并产出它们的事件来协调子 Agent。

```go
// Run 定义了 StoryFlowAgent 的自定义执行逻辑。
func (s *StoryFlowAgent) Run(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
	return func(yield func(*session.Event, error) bool) {
		// 阶段 1：初始故事生成
		for event, err := range s.storyGenerator.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("story generator failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 在继续之前检查故事是否已生成
		currentStory, err := ctx.Session().State().Get("current_story")
		if err != nil || currentStory == "" {
			log.Println("Failed to generate initial story. Aborting workflow.")
			return
		}

		// 阶段 2：批评-修订循环
		for event, err := range s.revisionLoopAgent.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("loop agent failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 阶段 3：后处理
		for event, err := range s.postProcessorAgent.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("sequential agent failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 阶段 4：条件再生成
		toneResult, err := ctx.Session().State().Get("tone_check_result")
		if err != nil {
			log.Printf("Could not read tone_check_result from state: %v. Assuming tone is not negative.", err)
			return
		}

		if tone, ok := toneResult.(string); ok && tone == "negative" {
			log.Println("Tone is negative. Regenerating story...")
			for event, err := range s.storyGenerator.Run(ctx) {
				if err != nil {
					yield(nil, fmt.Errorf("story regeneration failed: %w", err))
					return
				}
				if !yield(event, nil) {
					return
				}
			}
		} else {
			log.Println("Tone is not negative. Keeping current story.")
		}
	}
}
```

**逻辑说明：**

1. 最初的 `storyGenerator` 运行。其输出预计存储在会话状态的键 `"current_story"` 下。
2. `revisionLoopAgent` 运行，它内部按顺序调用 `critic` 和 `reviser`，重复 `max_iterations` 次。它们从状态中读取/写入 `current_story` 和 `criticism`。
3. `postProcessorAgent` 运行，依次调用 `grammar_check` 然后 `tone_check`，读取 `current_story` 并将 `grammar_suggestions` 和 `tone_check_result` 写入状态。
4. **自定义部分：** 代码检查状态中的 `tone_check_result`。如果其值为“negative”，则再次调用 `story_generator`，覆盖状态中的 `current_story`。否则，流程结束。
{{% /tab %}}
{{< /tabs >}}
### 第三部分：定义 LLM 子 Agent {#part-3-define-llm-sub-agents}

这些是标准的 `LlmAgent` 定义，负责特定任务。它们的 `output key` 参数对于将结果放入 `session.state` 十分关键，从而其他 Agent 或自定义编排器可以访问这些结果。

{{% alert context="success" %}}
**指令中的直接状态注入**

请注意 `story_generator` 的指令。`{var}` 语法是一个占位符。在指令发送给 LLM 之前，ADK 框架会自动将 (示例:`{topic}`) 替换为 `session.state['topic']` 的值。这是向 Agent 提供上下文的推荐方式，通过在指令中使用模板化。更多详细信息，请参见 [状态文档](/docs/adk/components/agent-context/state/#accessing-session-state-in-agent-instructions)(#)。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
GEMINI_2_FLASH = "gemini-flash-latest" # Define model constant
# --- 定义各个 LLM Agent ---
story_generator = LlmAgent(
    name="StoryGenerator",
    model=GEMINI_2_FLASH,
    instruction="""You are a story writer. Write a short story (around 100 words), on the following topic: {topic}""",
    input_schema=None,
    output_key="current_story",  # Key for storing output in session state
)

critic = LlmAgent(
    name="Critic",
    model=GEMINI_2_FLASH,
    instruction="""You are a story critic. Review the story provided: {{current_story}}. Provide 1-2 sentences of constructive criticism
on how to improve it. Focus on plot or character.""",
    input_schema=None,
    output_key="criticism",  # Key for storing criticism in session state
)

reviser = LlmAgent(
    name="Reviser",
    model=GEMINI_2_FLASH,
    instruction="""You are a story reviser. Revise the story provided: {{current_story}}, based on the criticism in
{{criticism}}. Output only the revised story.""",
    input_schema=None,
    output_key="current_story",  # Overwrites the original story
)

grammar_check = LlmAgent(
    name="GrammarCheck",
    model=GEMINI_2_FLASH,
    instruction="""You are a grammar checker. Check the grammar of the story provided: {current_story}. Output only the suggested
corrections as a list, or output 'Grammar is good!' if there are no errors.""",
    input_schema=None,
    output_key="grammar_suggestions",
)

tone_check = LlmAgent(
    name="ToneCheck",
    model=GEMINI_2_FLASH,
    instruction="""You are a tone analyzer. Analyze the tone of the story provided: {current_story}. Output only one word: 'positive' if
the tone is generally positive, 'negative' if the tone is generally negative, or 'neutral'
otherwise.""",
    input_schema=None,
    output_key="tone_check_result", # This agent's output determines the conditional flow
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// --- 定义各个 LLM Agent ---
storyGenerator, err := llmagent.New(llmagent.Config{
	Name:        "StoryGenerator",
	Model:       model,
	Description: "Generates the initial story.",
	Instruction: "You are a story writer. Write a short story (around 100 words) about a cat, based on the topic: {topic}",
	OutputKey:   "current_story",
})
if err != nil {
	log.Fatalf("Failed to create StoryGenerator agent: %v", err)
}

critic, err := llmagent.New(llmagent.Config{
	Name:        "Critic",
	Model:       model,
	Description: "Critiques the story.",
	Instruction: "You are a story critic. Review the story: {current_story}. Provide 1-2 sentences of constructive criticism on how to improve it. Focus on plot or character.",
	OutputKey:   "criticism",
})
if err != nil {
	log.Fatalf("Failed to create Critic agent: %v", err)
}

reviser, err := llmagent.New(llmagent.Config{
	Name:        "Reviser",
	Model:       model,
	Description: "Revises the story based on criticism.",
	Instruction: "You are a story reviser. Revise the story: {current_story}, based on the criticism: {criticism}. Output only the revised story.",
	OutputKey:   "current_story",
})
if err != nil {
	log.Fatalf("Failed to create Reviser agent: %v", err)
}

grammarCheck, err := llmagent.New(llmagent.Config{
	Name:        "GrammarCheck",
	Model:       model,
	Description: "Checks grammar and suggests corrections.",
	Instruction: "You are a grammar checker. Check the grammar of the story: {current_story}. Output only the suggested corrections as a list, or output 'Grammar is good!' if there are no errors.",
	OutputKey:   "grammar_suggestions",
})
if err != nil {
	log.Fatalf("Failed to create GrammarCheck agent: %v", err)
}

toneCheck, err := llmagent.New(llmagent.Config{
	Name:        "ToneCheck",
	Model:       model,
	Description: "Analyzes the tone of the story.",
	Instruction: "You are a tone analyzer. Analyze the tone of the story: {current_story}. Output only one word: 'positive' if the tone is generally positive, 'negative' if the tone is generally negative, or 'neutral' otherwise.",
	OutputKey:   "tone_check_result",
})
if err != nil {
	log.Fatalf("Failed to create ToneCheck agent: %v", err)
}
```

{{% /tab %}}
{{< /tabs >}}
### 第4部分：实例化并运行自定义 Agent {#part-4-instantiate-and-run-the-custom-agent}

最后，您实例化您的`StoryFlowAgent`，并像往常一样使用`Runner`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# --- 创建自定义 Agent 实例 ---
story_flow_agent = StoryFlowAgent(
    name="StoryFlowAgent",
    story_generator=story_generator,
    critic=critic,
    reviser=reviser,
    grammar_check=grammar_check,
    tone_check=tone_check,
)

INITIAL_STATE = {"topic": "a brave kitten exploring a haunted house"}

# --- 设置 Runner 和会话 ---
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=INITIAL_STATE)
    logger.info(f"Initial session state: {session.state}")
    runner = Runner(
        agent=story_flow_agent, # Pass the custom orchestrator agent
        app_name=APP_NAME,
        session_service=session_service
    )
    return session_service, runner

# --- 与 Agent 交互的功能 ---
async def call_agent_async(user_input_topic: str):
    """
    Sends a new topic to the agent (overwriting the initial one if needed)
    and runs the workflow.
    """

    session_service, runner = await setup_session_and_runner()

    current_session = session_service.sessions[APP_NAME][USER_ID][SESSION_ID]
    current_session.state["topic"] = user_input_topic
    logger.info(f"Updated session state topic to: {user_input_topic}")

    content = types.Content(role='user', parts=[types.Part(text=f"Generate a story about the preset topic.")])
    events = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    final_response = "No final response captured."
    async for event in events:
        if event.is_final_response() and event.content and event.content.parts:
            logger.info(f"Potential final response from [{event.author}]: {event.content.parts[0].text}")
            final_response = event.content.parts[0].text

    print("\n--- Agent Interaction Result ---")
    print("Agent Final Response: ", final_response)

    final_session = await session_service.get_session(app_name=APP_NAME,
                                                user_id=USER_ID,
                                                session_id=SESSION_ID)
    print("Final Session State:")
    import json
    print(json.dumps(final_session.state, indent=2))
    print("-------------------------------\n")

# --- 运行 Agent ---
# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
await call_agent_async("a lonely robot finding a friend in a junkyard")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
	// 实例化自定义 Agent，它封装了工作流 Agent。
	storyFlowAgent, err := NewStoryFlowAgent(
		storyGenerator,
		critic,
		reviser,
		grammarCheck,
		toneCheck,
	)
	if err != nil {
		log.Fatalf("Failed to create story flow agent: %v", err)
	}

	// --- 运行 Agent ---
	sessionService := session.InMemoryService()
	initialState := map[string]any{
		"topic": "a brave kitten exploring a haunted house",
	}
	sessionInstance, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: appName,
		UserID:  userID,
		State:   initialState,
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}

	userTopic := "a lonely robot finding a friend in a junkyard"

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          storyFlowAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	input := genai.NewContentFromText("Generate a story about: "+userTopic, genai.RoleUser)
	events := r.Run(ctx, userID, sessionInstance.Session.ID(), input, agent.RunConfig{
		StreamingMode: agent.StreamingModeSSE,
	})

	var finalResponse string
	for event, err := range events {
		if err != nil {
			log.Fatalf("An error occurred during agent execution: %v", err)
		}

		for _, part := range event.Content.Parts {
			// 从最终响应的所有部分累积文本。
			finalResponse += part.Text
		}
	}

	fmt.Println("\n--- Agent Interaction Result ---")
	fmt.Println("Agent Final Response: " + finalResponse)

	finalSession, err := sessionService.Get(ctx, &session.GetRequest{
		UserID:    userID,
		AppName:   appName,
		SessionID: sessionInstance.Session.ID(),
	})

	if err != nil {
		log.Fatalf("Failed to retrieve final session: %v", err)
	}

	fmt.Println("Final Session State:", finalSession.Session.State())
}
```

{{% /tab %}}
{{< /tabs >}}
*(注意：完整的可运行代码，包括导入和执行逻辑，可在下方链接中找到。)*
### Storyflow Agent 代码清单 {#storyflow-agent-code-listing}

<details>
<summary>Storyflow Agent</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# StoryFlowAgent 示例的完整可运行代码
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# 除非遵守许可协议，否则您不得使用此文件。
# 您可以在以下位置获取许可副本
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# 除非适用法律要求或书面约定，否则根据许可协议分发的软件
# 按“原样”提供
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# 请参阅许可协议以了解管理权限和
# limitations under the License.

import logging
from typing import AsyncGenerator
from typing_extensions import override

from google.adk.agents import LlmAgent, BaseAgent, LoopAgent, SequentialAgent
from google.adk.agents.invocation_context import InvocationContext
from google.genai import types
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.adk.events import Event
from pydantic import BaseModel, Field

# --- 常量 ---
APP_NAME = "story_app"
USER_ID = "12345"
SESSION_ID = "123344"
GEMINI_2_FLASH = "gemini-2.0-flash"

# --- 配置日志 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 自定义编排 Agent ---
# --8<-- [start:init]
class StoryFlowAgent(BaseAgent):
    """
    Custom agent for a story generation and refinement workflow.

    This agent orchestrates a sequence of LLM agents to generate a story,
    critique it, revise it, check grammar and tone, and potentially
    regenerate the story if the tone is negative.
    """

    # --- Pydantic 的字段声明 ---
    # 将初始化时传入的 Agent 声明为带类型提示的类属性
    story_generator: LlmAgent
    critic: LlmAgent
    reviser: LlmAgent
    grammar_check: LlmAgent
    tone_check: LlmAgent

    loop_agent: LoopAgent
    sequential_agent: SequentialAgent

    # model_config 允许在需要时设置 Pydantic 配置，例如 arbitrary_types_allowed
    model_config = {"arbitrary_types_allowed": True}

    def __init__(
        self,
        name: str,
        story_generator: LlmAgent,
        critic: LlmAgent,
        reviser: LlmAgent,
        grammar_check: LlmAgent,
        tone_check: LlmAgent,
    ):
        """
        Initializes the StoryFlowAgent.

        Args:
            name: The name of the agent.
            story_generator: An LlmAgent to generate the initial story.
            critic: An LlmAgent to critique the story.
            reviser: An LlmAgent to revise the story based on criticism.
            grammar_check: An LlmAgent to check the grammar.
            tone_check: An LlmAgent to analyze the tone.
        """
        # 在调用 super().__init__ 之前创建内部 Agent
        loop_agent = LoopAgent(
            name="CriticReviserLoop", sub_agents=[critic, reviser], max_iterations=2
        )
        sequential_agent = SequentialAgent(
            name="PostProcessing", sub_agents=[grammar_check, tone_check]
        )

        # 为框架定义 sub_agents 列表
        sub_agents_list = [
            story_generator,
            loop_agent,
            sequential_agent,
        ]

        # Pydantic 将根据类注解进行验证和赋值
        super().__init__(
            name=name,
            story_generator=story_generator,
            critic=critic,
            reviser=reviser,
            grammar_check=grammar_check,
            tone_check=tone_check,
            loop_agent=loop_agent,
            sequential_agent=sequential_agent,
            sub_agents=sub_agents_list, # Pass the sub_agents list directly
        )
# --8<-- [end:init]

    # --8<-- [start:executionlogic]
    @override
    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        """
        Implements the custom orchestration logic for the story workflow.
        Uses the instance attributes assigned by Pydantic (e.g., self.story_generator).
        """
        logger.info(f"[{self.name}] Starting story generation workflow.")

        # 1. 初始故事生成
        logger.info(f"[{self.name}] Running StoryGenerator...")
        async for event in self.story_generator.run_async(ctx):
            logger.info(f"[{self.name}] Event from StoryGenerator: {event.model_dump_json(indent=2, exclude_none=True)}")
            yield event

        # 在继续之前检查故事是否已生成
        if "current_story" not in ctx.session.state or not ctx.session.state["current_story"]:
             logger.error(f"[{self.name}] Failed to generate initial story. Aborting workflow.")
             return # Stop processing if initial story failed

        logger.info(f"[{self.name}] Story state after generator: {ctx.session.state.get('current_story')}")

        # 2. 批评-修订循环
        logger.info(f"[{self.name}] Running CriticReviserLoop...")
        # 使用初始化期间分配的 loop_agent 实例属性
        async for event in self.loop_agent.run_async(ctx):
            logger.info(f"[{self.name}] Event from CriticReviserLoop: {event.model_dump_json(indent=2, exclude_none=True)}")
            yield event

        logger.info(f"[{self.name}] Story state after loop: {ctx.session.state.get('current_story')}")

        # 3. 顺序后处理（语法和语气检查）
        logger.info(f"[{self.name}] Running PostProcessing...")
        # 使用初始化期间分配的 sequential_agent 实例属性
        async for event in self.sequential_agent.run_async(ctx):
            logger.info(f"[{self.name}] Event from PostProcessing: {event.model_dump_json(indent=2, exclude_none=True)}")
            yield event

        # 4. 基于语气的条件逻辑
        tone_check_result = ctx.session.state.get("tone_check_result")
        logger.info(f"[{self.name}] Tone check result: {tone_check_result}")

        if tone_check_result == "negative":
            logger.info(f"[{self.name}] Tone is negative. Regenerating story...")
            async for event in self.story_generator.run_async(ctx):
                logger.info(f"[{self.name}] Event from StoryGenerator (Regen): {event.model_dump_json(indent=2, exclude_none=True)}")
                yield event
        else:
            logger.info(f"[{self.name}] Tone is not negative. Keeping current story.")
            pass

        logger.info(f"[{self.name}] Workflow finished.")
    # --8<-- [end:executionlogic]

# --8<-- [start:llmagents]
# --- 定义各个 LLM Agent ---
story_generator = LlmAgent(
    name="StoryGenerator",
    model=GEMINI_2_FLASH,
    instruction="""You are a story writer. Write a short story (around 100 words), on the following topic: {topic}""",
    input_schema=None,
    output_key="current_story",  # Key for storing output in session state
)

critic = LlmAgent(
    name="Critic",
    model=GEMINI_2_FLASH,
    instruction="""You are a story critic. Review the story provided: {{current_story}}. Provide 1-2 sentences of constructive criticism
on how to improve it. Focus on plot or character.""",
    input_schema=None,
    output_key="criticism",  # Key for storing criticism in session state
)

reviser = LlmAgent(
    name="Reviser",
    model=GEMINI_2_FLASH,
    instruction="""You are a story reviser. Revise the story provided: {{current_story}}, based on the criticism in
{{criticism}}. Output only the revised story.""",
    input_schema=None,
    output_key="current_story",  # Overwrites the original story
)

grammar_check = LlmAgent(
    name="GrammarCheck",
    model=GEMINI_2_FLASH,
    instruction="""You are a grammar checker. Check the grammar of the story provided: {current_story}. Output only the suggested
corrections as a list, or output 'Grammar is good!' if there are no errors.""",
    input_schema=None,
    output_key="grammar_suggestions",
)

tone_check = LlmAgent(
    name="ToneCheck",
    model=GEMINI_2_FLASH,
    instruction="""You are a tone analyzer. Analyze the tone of the story provided: {current_story}. Output only one word: 'positive' if
the tone is generally positive, 'negative' if the tone is generally negative, or 'neutral'
otherwise.""",
    input_schema=None,
    output_key="tone_check_result", # This agent's output determines the conditional flow
)
# --8<-- [end:llmagents]

# --8<-- [start:story_flow_agent]
# --- 创建自定义 Agent 实例 ---
story_flow_agent = StoryFlowAgent(
    name="StoryFlowAgent",
    story_generator=story_generator,
    critic=critic,
    reviser=reviser,
    grammar_check=grammar_check,
    tone_check=tone_check,
)

INITIAL_STATE = {"topic": "a brave kitten exploring a haunted house"}

# --- 设置 Runner 和会话 ---
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=INITIAL_STATE)
    logger.info(f"Initial session state: {session.state}")
    runner = Runner(
        agent=story_flow_agent, # Pass the custom orchestrator agent
        app_name=APP_NAME,
        session_service=session_service
    )
    return session_service, runner

# --- 与 Agent 交互的功能 ---
async def call_agent_async(user_input_topic: str):
    """
    Sends a new topic to the agent (overwriting the initial one if needed)
    and runs the workflow.
    """

    session_service, runner = await setup_session_and_runner()

    current_session = session_service.sessions[APP_NAME][USER_ID][SESSION_ID]
    current_session.state["topic"] = user_input_topic
    logger.info(f"Updated session state topic to: {user_input_topic}")

    content = types.Content(role='user', parts=[types.Part(text=f"Generate a story about the preset topic.")])
    events = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    final_response = "No final response captured."
    async for event in events:
        if event.is_final_response() and event.content and event.content.parts:
            logger.info(f"Potential final response from [{event.author}]: {event.content.parts[0].text}")
            final_response = event.content.parts[0].text

    print("\n--- Agent Interaction Result ---")
    print("Agent Final Response: ", final_response)

    final_session = await session_service.get_session(app_name=APP_NAME,
                                                user_id=USER_ID,
                                                session_id=SESSION_ID)
    print("Final Session State:")
    import json
    print(json.dumps(final_session.state, indent=2))
    print("-------------------------------\n")

# --- 运行 Agent ---
# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
await call_agent_async("a lonely robot finding a friend in a junkyard")
# --8<-- [end:story_flow_agent]
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// StoryFlowAgent 示例的完整可运行代码
package main

import (
	"context"
	"fmt"
	"iter"
	"log"

	"google.golang.org/adk/v2/agent/workflowagents/loopagent"
	"google.golang.org/adk/v2/agent/workflowagents/sequentialagent"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/genai"
)

// --8<-- [start:init]
// StoryFlowAgent 是一个自定义 Agent，用于协调故事生成工作流。
// 它封装了按特定顺序运行子 Agent 的逻辑。
type StoryFlowAgent struct {
	storyGenerator     agent.Agent
	revisionLoopAgent  agent.Agent
	postProcessorAgent agent.Agent
}

// NewStoryFlowAgent 创建并配置整个自定义 Agent 工作流。
// 它以单个 LLM Agent 作为输入，并在内部创建必要的
// 工作流 Agent（循环、顺序），返回最终的协调器 Agent。
func NewStoryFlowAgent(
	storyGenerator,
	critic,
	reviser,
	grammarCheck,
	toneCheck agent.Agent,
) (agent.Agent, error) {
	loopAgent, err := loopagent.New(loopagent.Config{
		MaxIterations: 2,
		AgentConfig: agent.Config{
			Name:      "CriticReviserLoop",
			SubAgents: []agent.Agent{critic, reviser},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create loop agent: %w", err)
	}

	sequentialAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:      "PostProcessing",
			SubAgents: []agent.Agent{grammarCheck, toneCheck},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create sequential agent: %w", err)
	}

	// StoryFlowAgent 结构体保存 Run 方法所需的 Agent。
	orchestrator := &StoryFlowAgent{
		storyGenerator:     storyGenerator,
		revisionLoopAgent:  loopAgent,
		postProcessorAgent: sequentialAgent,
	}

	// agent.New 创建最终 Agent，连接 Run 方法。
	return agent.New(agent.Config{
		Name:        "StoryFlowAgent",
		Description: "Orchestrates story generation, critique, revision, and checks.",
		SubAgents:   []agent.Agent{storyGenerator, loopAgent, sequentialAgent},
		Run:         orchestrator.Run,
	})
}

// --8<-- [end:init]

// --8<-- [start:executionlogic]
// Run 定义了 StoryFlowAgent 的自定义执行逻辑。
func (s *StoryFlowAgent) Run(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
	return func(yield func(*session.Event, error) bool) {
		// 阶段 1：初始故事生成
		for event, err := range s.storyGenerator.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("story generator failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 在继续之前检查故事是否已生成
		currentStory, err := ctx.Session().State().Get("current_story")
		if err != nil || currentStory == "" {
			log.Println("Failed to generate initial story. Aborting workflow.")
			return
		}

		// 阶段 2：批评-修订循环
		for event, err := range s.revisionLoopAgent.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("loop agent failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 阶段 3：后处理
		for event, err := range s.postProcessorAgent.Run(ctx) {
			if err != nil {
				yield(nil, fmt.Errorf("sequential agent failed: %w", err))
				return
			}
			if !yield(event, nil) {
				return
			}
		}

		// 阶段 4：条件再生成
		toneResult, err := ctx.Session().State().Get("tone_check_result")
		if err != nil {
			log.Printf("Could not read tone_check_result from state: %v. Assuming tone is not negative.", err)
			return
		}

		if tone, ok := toneResult.(string); ok && tone == "negative" {
			log.Println("Tone is negative. Regenerating story...")
			for event, err := range s.storyGenerator.Run(ctx) {
				if err != nil {
					yield(nil, fmt.Errorf("story regeneration failed: %w", err))
					return
				}
				if !yield(event, nil) {
					return
				}
			}
		} else {
			log.Println("Tone is not negative. Keeping current story.")
		}
	}
}

// --8<-- [end:executionlogic]

const (
	modelName = "gemini-flash-latest"
	appName   = "story_app"
	userID    = "user_12345"
)

func main() {
	ctx := context.Background()
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	// --8<-- [start:llmagents]
	// --- 定义各个 LLM Agent ---
	storyGenerator, err := llmagent.New(llmagent.Config{
		Name:        "StoryGenerator",
		Model:       model,
		Description: "Generates the initial story.",
		Instruction: "You are a story writer. Write a short story (around 100 words) about a cat, based on the topic: {topic}",
		OutputKey:   "current_story",
	})
	if err != nil {
		log.Fatalf("Failed to create StoryGenerator agent: %v", err)
	}

	critic, err := llmagent.New(llmagent.Config{
		Name:        "Critic",
		Model:       model,
		Description: "Critiques the story.",
		Instruction: "You are a story critic. Review the story: {current_story}. Provide 1-2 sentences of constructive criticism on how to improve it. Focus on plot or character.",
		OutputKey:   "criticism",
	})
	if err != nil {
		log.Fatalf("Failed to create Critic agent: %v", err)
	}

	reviser, err := llmagent.New(llmagent.Config{
		Name:        "Reviser",
		Model:       model,
		Description: "Revises the story based on criticism.",
		Instruction: "You are a story reviser. Revise the story: {current_story}, based on the criticism: {criticism}. Output only the revised story.",
		OutputKey:   "current_story",
	})
	if err != nil {
		log.Fatalf("Failed to create Reviser agent: %v", err)
	}

	grammarCheck, err := llmagent.New(llmagent.Config{
		Name:        "GrammarCheck",
		Model:       model,
		Description: "Checks grammar and suggests corrections.",
		Instruction: "You are a grammar checker. Check the grammar of the story: {current_story}. Output only the suggested corrections as a list, or output 'Grammar is good!' if there are no errors.",
		OutputKey:   "grammar_suggestions",
	})
	if err != nil {
		log.Fatalf("Failed to create GrammarCheck agent: %v", err)
	}

	toneCheck, err := llmagent.New(llmagent.Config{
		Name:        "ToneCheck",
		Model:       model,
		Description: "Analyzes the tone of the story.",
		Instruction: "You are a tone analyzer. Analyze the tone of the story: {current_story}. Output only one word: 'positive' if the tone is generally positive, 'negative' if the tone is generally negative, or 'neutral' otherwise.",
		OutputKey:   "tone_check_result",
	})
	if err != nil {
		log.Fatalf("Failed to create ToneCheck agent: %v", err)
	}
	// --8<-- [end:llmagents]

	// --8<-- [start:story_flow_agent]
	// 实例化自定义 Agent，它封装了工作流 Agent。
	storyFlowAgent, err := NewStoryFlowAgent(
		storyGenerator,
		critic,
		reviser,
		grammarCheck,
		toneCheck,
	)
	if err != nil {
		log.Fatalf("Failed to create story flow agent: %v", err)
	}

	// --- 运行 Agent ---
	sessionService := session.InMemoryService()
	initialState := map[string]any{
		"topic": "a brave kitten exploring a haunted house",
	}
	sessionInstance, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: appName,
		UserID:  userID,
		State:   initialState,
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}

	userTopic := "a lonely robot finding a friend in a junkyard"

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          storyFlowAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	input := genai.NewContentFromText("Generate a story about: "+userTopic, genai.RoleUser)
	events := r.Run(ctx, userID, sessionInstance.Session.ID(), input, agent.RunConfig{
		StreamingMode: agent.StreamingModeSSE,
	})

	var finalResponse string
	for event, err := range events {
		if err != nil {
			log.Fatalf("An error occurred during agent execution: %v", err)
		}

		for _, part := range event.Content.Parts {
			// 从最终响应的所有部分累积文本。
			finalResponse += part.Text
		}
	}

	fmt.Println("\n--- Agent Interaction Result ---")
	fmt.Println("Agent Final Response: " + finalResponse)

	finalSession, err := sessionService.Get(ctx, &session.GetRequest{
		UserID:    userID,
		AppName:   appName,
		SessionID: sessionInstance.Session.ID(),
	})

	if err != nil {
		log.Fatalf("Failed to retrieve final session: %v", err)
	}

	fmt.Println("Final Session State:", finalSession.Session.State())
}

// --8<-- [end:story_flow_agent]
```

{{% /tab %}}
{{< /tabs >}}
</details>

---

原文：[Custom agent template workflows](https://adk.dev/agents/custom-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/custom-agents.md)
