---
title: "协作工作流"
description: "一些复杂的任务可能需要多个具有特定职责的 Agent，并且从不那么结构化的程序中受益，特别是对于包含多个重要子任务的迭代过程。在协作 Agent 中"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v2.0.0, Go v2.0.0。

一些复杂的任务可能需要多个具有特定职责的 Agent，并且从较不结构化的流程中受益，尤其是对于包含多个重要子任务的迭代过程。在 ADK 的协作 Agent 团队中，协调 Agent 负责将任务分配给一个或多个子 Agent。这种方法使构建复杂的、自我管理的 Agent 系统变得更容易，子 Agent 被定义为处理特定任务，并在完成任务后自动返回到父 Agent。

在使用这种自我管理的 Agent 团队方法时，子 Agent 会被分配一个运行***模式***以管理其行为并限制其工作范围。这些***模式***为子 Agent 设定了一般行为准则，并创建更可预测和可靠的多 Agent 工作流程。可用于协作模式的设置如下：

-   ***聊天***: 完全用户交互，手动返回父 Agent（默认，当前行为）
-   ***任务***: 对澄清事项进行用户交互，并自动返回父 Agent
-   ***单次交互:*** 无用户交互，自动返回，并可并行运行

本指南涵盖如何为子 Agent 使用模式以及这些模式如何影响 Agent 行为。

{{% alert context="warning" %}}
**已禁用：基于图的工作流中的任务模式**

在 ADK Python v2.0.0 中，协作模式 `task` 的行为在基于图的工作流中已被禁用。预计该功能将在未来版本中重新启用。
{{% /alert %}}
## 快速开始 {#get-started}

以下代码示例演示了如何为一小组子 Agent 设置运行模式，并将它们分配给协调 Agent：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Agent

weather_agent = Agent(
    name="weather_checker",
    mode="single_turn",         # no user interaction
    tools=[get_weather, user_info, geocode_address],
)
flight_agent = Agent(
    name="flight_booker",
    mode="task",                # can ask user questions
    input_schema=FlightInput,
    output_schema=FlightResult,
    tools=[search_flights, book_flight],
)
root = Agent(
    name="travel_planner",      # coordinator agent
    sub_agents=[weather_agent, flight_agent],
    # 自动注入以每个子 Agent 命名的委派工具：
    # weather_checker，flight_booker
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go v2.0.0 中，`llmagent.Config` 上的 `Mode` 字段接受与 Python 相同的模式字符串：`"chat"`、`"task"` 和 `"single_turn"`。在协调 Agent 上声明 `SubAgents` 会导致 ADK 自动为每个子 Agent 生成一个委派工具，其名称与子 Agent 自身相同，就像在 Python 中一样。

```go
// 存根工具功能——在真实 Agent 中，这些会调用外部服务。
func getWeather(_ agent.Context, _ struct{ City string }) (string, error) {
	return "Sunny, 22°C", nil
}

func searchFlights(_ agent.Context, _ struct{ Origin, Destination string }) (string, error) {
	return "3 flights found", nil
}

func bookFlight(_ agent.Context, _ struct{ FlightID string }) (string, error) {
	return "Flight booked", nil
}

// newCollaborativeTeam 构建一个协调员 Agent，该 Agent 包含两个子 Agent，每个
// 配置了不同的协作模式。这是 Go 的等效做法:
//
//	weather_agent = Agent(name="weather_checker", mode="single_turn", ...)
//	flight_agent  = Agent(name="flight_booker",   mode="task",        ...)
//	root = Agent(name="travel_planner", sub_agents=[weather_agent, flight_agent])
func newCollaborativeTeam(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}

	getWeatherTool, err := functiontool.New(functiontool.Config{
		Name:        "get_weather",
		Description: "Returns the current weather for a city.",
	}, getWeather)
	if err != nil {
		return nil, err
	}

	searchFlightsTool, err := functiontool.New(functiontool.Config{
		Name:        "search_flights",
		Description: "Searches for available flights between two airports.",
	}, searchFlights)
	if err != nil {
		return nil, err
	}

	bookFlightTool, err := functiontool.New(functiontool.Config{
		Name:        "book_flight",
		Description: "Books a specific flight by ID.",
	}, bookFlight)
	if err != nil {
		return nil, err
	}

	// weatherAgent 以单回合模式运行：无需用户交互，执行一次
	// 自动转向并返回。相当于 Python 中的 mode="single_turn"。
	weatherAgent, err := llmagent.New(llmagent.Config{
		Name:        "weather_checker",
		Model:       model,
		Mode:        llmagent.ModeSingleTurn,
		Description: "Checks the current weather for a given city.",
		Instruction: "Use the get_weather tool to look up the current weather.",
		Tools:       []tool.Tool{getWeatherTool},
	})
	if err != nil {
		return nil, err
	}

	// flightAgent 在 ModeTask 中运行：可能会向用户提出澄清性问题并
	// 完成后自动将控制权返回给协调器。等同于
	// 在 Python 中的 mode="task"。
	flightAgent, err := llmagent.New(llmagent.Config{
		Name:        "flight_booker",
		Model:       model,
		Mode:        llmagent.ModeTask,
		Description: "Searches for and books flights.",
		Instruction: "Help the user find and book a flight using the available tools.",
		Tools:       []tool.Tool{searchFlightsTool, bookFlightTool},
	})
	if err != nil {
		return nil, err
	}

	// 协调员 Agent 声明子 Agent。ADK 自动生成
	// 天气检查器和航班预订器委托工具，分别以各自命名
	// 子 Agent，这样协调员可以将工作分配给每个人。
	return llmagent.New(llmagent.Config{
		Name:        "travel_planner",
		Model:       model,
		Description: "Coordinator agent that delegates to weather and flight subagents.",
		Instruction: "Help the user plan their trip. Use the weather checker and flight booker as needed.",
		SubAgents:   []agent.Agent{weatherAgent, flightAgent},
	})
}
```

{{% /tab %}}
{{< /tabs >}}
运行该工作流程时，`travel_planner`协调 Agent 会自动
识别并分配任务给子 Agent。当子 Agent 完成时
任务会自动返回给协调 Agent。
关于使用 ***input_schema*** 和
output_schema*** 包含 Agent、子 Agent 和工作流节点，详见
[Agent 工作流的数据处理](/docs/adk/build/graph-workflows/data-handling/)。

## 模式配置与行为 {#mode-configuration-and-behaviors}

每种协作模式都有特定的行为和限制
它。下表比较了配置为 的子 Agent 的属性
每种模式：

{{% alert context="warning" %}}
**注意：仅供子 Agent 人使用模式*****mode*** 设置专门用于调用的子 Agent
由协调者父 Agent 进行。不要将根 Agent 配置为
环境。
{{% /alert %}}
<table>
  <thead>
    <tr>
      <th><strong>Topic \ Mode</strong></th>
      <th><code>chat</code> （default）</th>
      <th><code>task</code></th>
      <th><code>single_turn</code></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Human in the Loop</strong></td>
      <td> Full interaction</td>
      <td> 或仅说明 </td>
      <td>Disallowed</td>
    </tr>
    <tr>
      <td><strong>用户交互</strong></td>
      <td>用户可与 Agent 自由聊天</td>
      <td>Agent 按需提问</td>
      <td>无用户交互</td>
    </tr>
    <tr>
      <td><strong>Control flow</strong></td>
      <td> 手动切换前的控制 </td>
      <td> 任务完成前的控制</td>
      <td> 任务结束后立即转动</td>
    </tr>
    <tr>
      <td><strong>Parallel execution</strong></td>
      <td>Not supported</td>
      <td>Not supported</td>
      <td> 多任务可以并行运行</td>
    </tr>
    <tr>
      <td><strong>Return to parent</strong></td>
      <td>Manual（通过传输）</td>
      <td>Automatic（通过<code>finish_task</code>）</td>
      <td>Automatic（含结果）</td>
    </tr>
  </tbody>
</table>

**表1.** ADK 协作 Agent**mode***行为比较及
限制。

{{% alert context="success" %}}
**所有 Agent 的全局指令**在工作流程中应用一致规则，使用`GlobalInstructionPlugin`
在你的`App`上 （[Python](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/global_instruction_plugin.py)，
[TypeScript](https://github.com/google/adk-js/blob/main/core/src/plugins/global_instruction_plugin.ts)，
[Java](https://github.com/google/adk-java/blob/main/core/src/main/java/com/google/adk/plugins/GlobalInstructionPlugin.java)）
或者你 Agent 上的`GlobalInstruction`参数
（[Go](https://github.com/google/adk-go/blob/main/agent/llmagent/llmagent.go)）
{{% /alert %}}
## 操作考虑 {#operating-considerations}

使用协作 Agent 模式时，有一些控制转移和
需要考虑的情境管理考虑，详见如下
分段。

### 工作流程节点和 Agent 传输 {#workflow-node-and-agent-transfers}

配置为***任务***或***单回合***模式的 Agent 可用作
工作流 Agent 图节点，以及 ***LlmAgent*** 实例。然而
执行传输行为会根据调用方或父端不同而有所不同，
Agent 人：

**作为工作流图节点：** 当任务或单回合 Agent 被放置在其中时
一个工作流程图——例如 ***SequentialAgent*** 或 ***ParallelAgent*** （Python）
以及 Go 预构建 Agent），或者在 ADK Go 中与 `workflow.NewAgentNode` 包裹
v2.0.0 图引擎 — Agent 执行其任务。完成后，控制
根据工作流程的逻辑自动推进到下一个节点
Agent 图。

**作为LlmAgent 的转让人：** 当父母***LlmAgent***转移时
通过以该子 Agent 命名的委托工具控制任务 Agent，
任务 Agent 执行直到调用`finish_task`。此时，控制
自动返回发起转移的起始 Agent。
这种行为不同于默认的聊天 ***mode*** Agent，后者需要
明确`transfer_to_agent`呼唤，要求重新掌控。

<table>
  <thead>
    <tr>
      <th><strong>Invocation Context</strong></th>
      <th><strong>After Task Completion</strong></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>工作流节点</td>
      <td>推进到图中的下一个节点</td>
    </tr>
    <tr>
      <td>从 LlmAgent 转移</td>
      <td>将控制权返回发起转移的 Agent</td>
    </tr>
  </tbody>
</table>

这种区分使同一任务 Agent 可以在两种语境中重复使用
无需修改。运行时间决定基于的适当控制流
关于该 Agent 人是如何被调用的。

### 特工上下文隔离每个***任务***或***单回合***模式 Agent 都独立运行 {#agent-context-isolation}
会话分支。当这些 Agent 并行运行时，每个 Agent 只看到
在为 AI 模型调用构建上下文时，无法从自身分支中处理事件，
查看其对等 Agent 的操作。当所有并行分支完成后，
母 Agent 收到收集到的结果后可以继续。

## 已知的限制 {#known-limitations}

Agent 协作模式存在一些已知的局限性：

- ***任务*模式 Agent**必须是叶 Agent，不能有子 Agent。

---

原文：[Build collaborative agent teams](https://adk.dev/workflows/collaboration/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/workflows/collaboration.md)
