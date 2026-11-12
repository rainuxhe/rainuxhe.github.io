---
title: "工作流模式"
description: "本指南提供了若干可以使用 Agent Development Kit（ADK）实现的 Agent 模式，包括代码示例。这些模式在广泛的应用中都很有用，您应该评估和 t"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

本指南提供了若干可以使用 Agent Development Kit（ADK）实现的 Agent 模式，包括代码示例。这些模式适用于广泛的应用，在进行完整实现之前，你应根据项目需求评估和测试它们。

{{% alert context="info" %}}
**Python 和 TypeScript：模板工作流 Agent 已弃用**

在 Python 和 TypeScript 中，`SequentialAgent`、`ParallelAgent` 和 `LoopAgent` 已弃用：构建它们会发出弃用警告，这些类计划在未来版本中移除。以下示例仍可运行。对于新代码，请使用[基于图的工作流](/docs/adk/build/graph-workflows/)表达这些模式；注意 `Workflow` 目前还不能作为 `LlmAgent` 的子 Agent。
{{% /alert %}}
## 协调器和调度器 {#coordinator-and-dispatcher}

* **结构：** 一个中央 [`LlmAgent`](/docs/adk/build/agents/simple-agents/)（协调器）] 管理多个专业的 `sub_agents`。
* **目标：** 将传入请求路由到相应的专业 Agent。
* **使用的 ADK 原语：**
    * **层级结构：** 协调器在 `sub_agents` 列出专业 Agent。
    * **交互：** 主要使用 **LLM 驱动的委派**（需要对子 Agent 有明确的 `description`，并在协调器上有适当的 `instruction`）或 **显式调用（`AgentTool`）**（协调器在其 `tools` 中包含 `AgentTool` 包装的专业 Agent）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：使用 LLM 转移的协调器
from google.adk.agents import LlmAgent

billing_agent = LlmAgent(name="Billing", description="Handles billing inquiries.")
support_agent = LlmAgent(name="Support", description="Handles technical support requests.")

coordinator = LlmAgent(
    name="HelpDeskCoordinator",
    model="gemini-flash-latest",
    instruction="Route user requests: Use Billing agent for payment issues, Support agent for technical problems.",
    description="Main help desk router.",
    # allow_transfer=True 在 AutoFlow 的子 Agent 中通常是隐含的
    sub_agents=[billing_agent, support_agent]
)
# 用户问“我的付款失败了” -> 协调器的 LLM 应该调用 transfer_to_agent(agent_name='Billing')
# 用户问“我无法登录” -> 协调器的 LLM 应该调用 transfer_to_agent(agent_name='Support')
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
)

	// 概念代码：使用 LLM 转移的协调器
	billingAgent, _ := llmagent.New(llmagent.Config{Name: "Billing", Description: "Handles billing inquiries.", Model: m})
	supportAgent, _ := llmagent.New(llmagent.Config{Name: "Support", Description: "Handles technical support requests.", Model: m})

	coordinator, _ := llmagent.New(llmagent.Config{
		Name:        "HelpDeskCoordinator",
		Model:       m,
		Instruction: "Route user requests: Use Billing agent for payment issues, Support agent for technical problems.",
		Description: "Main help desk router.",
		SubAgents:   []agent.Agent{billingAgent, supportAgent},
	})
	// 用户问“我的付款失败了” -> 协调器的 LLM 应该调用 transfer_to_agent(agent_name='Billing')
	// 用户问“我无法登录” -> 协调器的 LLM 应该调用 transfer_to_agent(agent_name='Support')
```

{{% /tab %}}
{{< /tabs >}}
## 顺序流程 {#sequential-pipeline}

* **结构:** 一个 [`SequentialAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/) 包含按固定顺序执行的 `sub_agents`。
* **目标:** 实现一个多步骤的过程，其中一步的输出作为下一步的输入。
* **使用的 ADK 原语:**
    * **工作流:** `SequentialAgent` 定义顺序。
    * **通信:** 主要使用 **共享会话状态**。前面的 Agent 写入结果（通常通过 `output_key`），后面的 Agent 从 `context.state` 读取这些结果。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：顺序数据管道
from google.adk.agents import SequentialAgent, LlmAgent

validator = LlmAgent(name="ValidateInput", instruction="Validate the input.", output_key="validation_status")
processor = LlmAgent(name="ProcessData", instruction="Process data if {validation_status} is 'valid'.", output_key="result")
reporter = LlmAgent(name="ReportResult", instruction="Report the result from {result}.")

data_pipeline = SequentialAgent(
    name="DataPipeline",
    sub_agents=[validator, processor, reporter]
)
# 验证器运行 -> 保存到 state['validation_status']
# 处理器运行 -> 读取 state['validation_status']，保存到 state['result']
# 报告器运行 -> 读取 state['result']
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
)

	// 概念代码：顺序数据管道
	validator, _ := llmagent.New(llmagent.Config{Name: "ValidateInput", Instruction: "Validate the input.", OutputKey: "validation_status", Model: m})
	processor, _ := llmagent.New(llmagent.Config{Name: "ProcessData", Instruction: "Process data if {validation_status} is 'valid'.", OutputKey: "result", Model: m})
	reporter, _ := llmagent.New(llmagent.Config{Name: "ReportResult", Instruction: "Report the result from {result}.", Model: m})

	dataPipeline, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "DataPipeline", SubAgents: []agent.Agent{validator, processor, reporter}},
	})
	// 验证器运行 -> 保存到 state["validation_status"]
	// 处理器运行 -> 读取 state["validation_status"], 保存到 state["result"]
	// 报告器运行 -> 读取 state["result"]
```

{{% /tab %}}
{{< /tabs >}}
## 并行分发与汇总 {#parallel-fan-out-and-gather}

* **结构：** 一个 [`ParallelAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/parallel-workflow/) 同时运行多个 `sub_agents`，通常随后会有一个 Agent（在 `SequentialAgent` 中）汇总结果。
* **目标：** 同时执行独立任务以减少延迟，然后合并它们的输出。
* **使用的 ADK 原语：**
    * **工作流：** 使用 `ParallelAgent` 进行并发执行（分发）。通常嵌套在 `SequentialAgent` 中以处理后续的汇总步骤（收集）。
    * **通信：** 子 Agent 将结果写入 **共享会话状态** 中的不同键。随后“汇总”Agent 读取多个状态键。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：并行信息收集
from google.adk.agents import SequentialAgent, ParallelAgent, LlmAgent

fetch_api1 = LlmAgent(name="API1Fetcher", instruction="Fetch data from API 1.", output_key="api1_data")
fetch_api2 = LlmAgent(name="API2Fetcher", instruction="Fetch data from API 2.", output_key="api2_data")

gather_concurrently = ParallelAgent(
    name="ConcurrentFetch",
    sub_agents=[fetch_api1, fetch_api2]
)

synthesizer = LlmAgent(
    name="Synthesizer",
    instruction="Combine results from {api1_data} and {api2_data}."
)

overall_workflow = SequentialAgent(
    name="FetchAndSynthesize",
    sub_agents=[gather_concurrently, synthesizer] # Run parallel fetch, then synthesize
)
# fetch_api1 和 fetch_api2 并发运行，保存到 state。
# synthesizer 随后运行，读取 state['api1_data'] 和 state['api2_data']。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/parallelagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
)

	// 概念代码：并行信息收集
	fetchAPI1, _ := llmagent.New(llmagent.Config{Name: "API1Fetcher", Instruction: "Fetch data from API 1.", OutputKey: "api1_data", Model: m})
	fetchAPI2, _ := llmagent.New(llmagent.Config{Name: "API2Fetcher", Instruction: "Fetch data from API 2.", OutputKey: "api2_data", Model: m})

	gatherConcurrently, _ := parallelagent.New(parallelagent.Config{
		AgentConfig: agent.Config{Name: "ConcurrentFetch", SubAgents: []agent.Agent{fetchAPI1, fetchAPI2}},
	})

	synthesizer, _ := llmagent.New(llmagent.Config{Name: "Synthesizer", Instruction: "Combine results from {api1_data} and {api2_data}.", Model: m})

	overallWorkflow, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "FetchAndSynthesize", SubAgents: []agent.Agent{gatherConcurrently, synthesizer}},
	})
	// fetch_api1 和 fetch_api2 并发运行，保存到 state。
	// 合成器随后运行，读取 state["api1_data"] 和 state["api2_data"]。
```

{{% /tab %}}
{{< /tabs >}}
## 分层任务分解 {#hierarchical-task-decomposition}

* **结构：** 一个多层级的 Agent 树，高层 Agent 将复杂目标拆分，并将子任务委派给低层 Agent。
* **目标：** 通过递归地将复杂问题分解为更简单、可执行的步骤来解决问题。
* **使用的 ADK 原语：**
    * **层级：** 多层级 `parent_agent`/`sub_agents` 结构。
    * **交互：** 主要由父 Agent 使用 **LLM 驱动的委派** 或 **显式调用 (`AgentTool`)** 来分配任务给子 Agent。结果通过层级返回（通过工具响应或状态）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：分层研究任务
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool

# 低级工具型 Agent
web_searcher = LlmAgent(name="WebSearch", description="Performs web searches for facts.")
summarizer = LlmAgent(name="Summarizer", description="Summarizes text.")

# 中级 Agent，结合工具
research_assistant = LlmAgent(
    name="ResearchAssistant",
    model="gemini-flash-latest",
    description="Finds and summarizes information on a topic.",
    tools=[agent_tool.AgentTool(agent=web_searcher), agent_tool.AgentTool(agent=summarizer)]
)

# 高级 Agent，委派研究
report_writer = LlmAgent(
    name="ReportWriter",
    model="gemini-flash-latest",
    instruction="Write a report on topic X. Use the ResearchAssistant to gather information.",
    tools=[agent_tool.AgentTool(agent=research_assistant)]
    # 或者，如果 research_assistant 是子 Agent，可以使用 LLM 转移
)
# 用户与 ReportWriter 交互。
# ReportWriter 调用 ResearchAssistant 工具。
# ResearchAssistant 调用 WebSearch 和 Summarizer 工具。
# 结果向上传递。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/agenttool"
)

	// 概念代码：分层研究任务
	// 低级工具型 Agent
	webSearcher, _ := llmagent.New(llmagent.Config{Name: "WebSearch", Description: "Performs web searches for facts.", Model: m})
	summarizer, _ := llmagent.New(llmagent.Config{Name: "Summarizer", Description: "Summarizes text.", Model: m})

	// 中级 Agent，结合工具
	webSearcherTool := agenttool.New(webSearcher, nil)
	summarizerTool := agenttool.New(summarizer, nil)
	researchAssistant, _ := llmagent.New(llmagent.Config{
		Name:        "ResearchAssistant",
		Model:       m,
		Description: "Finds and summarizes information on a topic.",
		Tools:       []tool.Tool{webSearcherTool, summarizerTool},
	})

	// 高级 Agent，委派研究
	researchAssistantTool := agenttool.New(researchAssistant, nil)
	reportWriter, _ := llmagent.New(llmagent.Config{
		Name:        "ReportWriter",
		Model:       m,
		Instruction: "Write a report on topic X. Use the ResearchAssistant to gather information.",
		Tools:       []tool.Tool{researchAssistantTool},
	})
	// 用户与 ReportWriter 交互。
	// ReportWriter 调用 ResearchAssistant 工具。
	// ResearchAssistant 调用 WebSearch 和 Summarizer 工具。
	// 结果向上传递。
```

{{% /tab %}}
{{< /tabs >}}
## 生成和审查模式 {#generate-and-review-pattern}

* **结构:** 通常涉及两个 Agent[`SequentialAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/): 一个生成 Agent 和一个审查 Agent]。
* **目标:** 通过专门的 Agent 进行审查，提高生成输出的质量或有效性。
* **使用的 ADK 原语:**
    * **工作流:** `SequentialAgent` 确保生成在审查之前进行。
    * **通信:** **共享会话状态**（生成者使用 `output_key` 保存输出；审查者读取该状态键）。审查者可能将其反馈保存到另一个状态键，以用于后续步骤。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：生成器-评论者
from google.adk.agents import SequentialAgent, LlmAgent

generator = LlmAgent(
    name="DraftWriter",
    instruction="Write a short paragraph about subject X.",
    output_key="draft_text"
)

reviewer = LlmAgent(
    name="FactChecker",
    instruction="Review the text in {draft_text} for factual accuracy. Output 'valid' or 'invalid' with reasons.",
    output_key="review_status"
)

# 可选：基于 review_status 的进一步步骤

review_pipeline = SequentialAgent(
    name="WriteAndReview",
    sub_agents=[generator, reviewer]
)
# 生成器运行 -> 将草稿保存到 state['draft_text']
# 评论者运行 -> 读取 state['draft_text']，将状态保存到 state['review_status']
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
)

	// 概念代码：生成器-评论者
	generator, _ := llmagent.New(llmagent.Config{
		Name:        "DraftWriter",
		Instruction: "Write a short paragraph about subject X.",
		OutputKey:   "draft_text",
		Model:       m,
	})

	reviewer, _ := llmagent.New(llmagent.Config{
		Name:        "FactChecker",
		Instruction: "Review the text in {draft_text} for factual accuracy. Output 'valid' or 'invalid' with reasons.",
		OutputKey:   "review_status",
		Model:       m,
	})

	reviewPipeline, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "WriteAndReview", SubAgents: []agent.Agent{generator, reviewer}},
	})
	// 生成器运行 -> 将草稿保存到 state["draft_text"]
	// 审阅者运行 -> 读取 state["draft_text"]，将状态保存到 state["review_status"]
```

{{% /tab %}}
{{< /tabs >}}
## 迭代优化 {#iterative-refinement}

* **结构:** 使用一个 [`LoopAgent`](/docs/adk/build/multi-agent-workflows/template-workflows/loop-workflow/)，其中包含一个或多个在多个迭代中处理任务的 Agent。
* **目标:** 逐步改进存储在会话状态中的结果（例如代码、文本、计划），直到达到质量阈值或达到最大迭代次数。
* **使用的 ADK 原语:**
    * **流程:** `LoopAgent` 管理重复操作。
    * **通信:** **共享会话状态** 对 Agent 读取上一迭代的输出并保存优化版本至关重要。
    * **终止:** 循环通常基于 `max_iterations` 结束，或者由专门的检查 Agent 在结果令人满意时设置 `escalate=True` 到 `Event Actions`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：迭代代码精炼
from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext
from typing import AsyncGenerator

# Agent 根据 state['current_code'] 和 state['requirements'] 生成/精炼代码
code_refiner = LlmAgent(
    name="CodeRefiner",
    instruction="Read state['current_code'] (if exists) and state['requirements']. Generate/refine Python code to meet requirements. Save to state['current_code'].",
    output_key="current_code" # Overwrites previous code in state
)

# Agent 检查代码是否符合质量标准
quality_checker = LlmAgent(
    name="QualityChecker",
    instruction="Evaluate the code in state['current_code'] against state['requirements']. Output 'pass' or 'fail'.",
    output_key="quality_status"
)

# 自定义 Agent 检查状态，如果为 'pass' 则升级
class CheckStatusAndEscalate(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        status = ctx.session.state.get("quality_status", "fail")
        should_stop = (status == "pass")
        yield Event(author=self.name, actions=EventActions(escalate=should_stop))

refinement_loop = LoopAgent(
    name="CodeRefinementLoop",
    max_iterations=5,
    sub_agents=[code_refiner, quality_checker, CheckStatusAndEscalate(name="StopChecker")]
)
# 循环运行：精炼器 -> 检查器 -> 停止检查器
# 每次迭代会更新 State['current_code']。
# 如果 QualityChecker 输出 'pass'（导致 StopChecker 升级）或超过 5 次迭代，循环停止。
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

	// 概念代码：迭代代码精炼
	codeRefiner, _ := llmagent.New(llmagent.Config{
		Name:        "CodeRefiner",
		Instruction: "Read state['current_code'] (if exists) and state['requirements']. Generate/refine Python code to meet requirements. Save to state['current_code'].",
		OutputKey:   "current_code",
		Model:       m,
	})

	qualityChecker, _ := llmagent.New(llmagent.Config{
		Name:        "QualityChecker",
		Instruction: "Evaluate the code in state['current_code'] against state['requirements']. Output 'pass' or 'fail'.",
		OutputKey:   "quality_status",
		Model:       m,
	})

	checkStatusAndEscalate, _ := agent.New(agent.Config{
		Name: "StopChecker",
		Run: func(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
			return func(yield func(*session.Event, error) bool) {
				status, _ := ctx.Session().State().Get("quality_status")
				shouldStop := status == "pass"
				yield(&session.Event{Author: "StopChecker", Actions: session.EventActions{Escalate: shouldStop}}, nil)
			}
		},
	})

	refinementLoop, _ := loopagent.New(loopagent.Config{
		MaxIterations: 5,
		AgentConfig:   agent.Config{Name: "CodeRefinementLoop", SubAgents: []agent.Agent{codeRefiner, qualityChecker, checkStatusAndEscalate}},
	})
	// 循环运行：精炼器 -> 检查器 -> 停止检查器
	// State["current_code"] 会在每次迭代时更新。
	// 如果 QualityChecker 输出 'pass'（导致 StopChecker 升级）或超过 5 次迭代，循环停止。
```

{{% /tab %}}
{{< /tabs >}}
## 人类参与环节 {#human-in-the-loop}

* **结构:** 在 Agent 工作流中整合人类干预点。
* **目标:** 允许人工监督、批准、纠正或执行 AI 无法完成的任务。
* **使用的 ADK 原语（概念性）:**
    * **交互:** 可以使用自定义 **工具** 实现，该工具会暂停执行并向外部系统（例如 UI、工单系统）发送请求，等待人工输入。然后该工具将人工的回应返回给 Agent。
    * **工作流:** 可以使用 **LLM 驱动的委派** (`transfer_to_agent`) 指向一个概念性“人类 Agent”，触发外部工作流，或者在 `LlmAgent` 中使用自定义工具。
    * **状态/回调:** 状态可以保存给人工的任务细节；回调可以管理交互流程。
    * **注意:** ADK 没有人类 Agent 类型，但你不必自行构建暂停功能：可以从 [图形工作流节点](/docs/adk/build/graph-workflows/human-input/) 触发 `RequestInput` 事件，或在 `FunctionTool` 上启用 [工具确认](/docs/adk/components/custom-tools/function-tools/action-confirmations/#boolean-confirmation) 以实现是/否批准。要提供自定义提示或收集结构化数据，请在工具内使用 [高级确认](/docs/adk/components/custom-tools/function-tools/action-confirmations/#advanced-confirmation)。有关各语言的支持，请参见相应页面。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 概念代码：使用工具进行人工批准
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool

# --- 假设 external_approval_tool 存在 ---
# 该工具将：
# 1. 获取详细信息（例如 request_id、金额、原因）。
# 2. 将这些详细信息发送到人工审核系统（例如，通过 API）。
# 3. 轮询或等待人工回复（批准/拒绝）。
# 4. 返回人工的决定。
# async def external_approval_tool(amount: float, reason: str) -> str: ...
approval_tool = FunctionTool(func=external_approval_tool)

# 准备请求的 Agent
prepare_request = LlmAgent(
    name="PrepareApproval",
    instruction="Prepare the approval request details based on user input. Store amount and reason in state.",
    # ... 可能会设置 state['approval_amount'] 和 state['approval_reason'] ...
)

# 调用人工批准工具的 Agent
request_approval = LlmAgent(
    name="RequestHumanApproval",
    instruction="Use the external_approval_tool with amount from state['approval_amount'] and reason from state['approval_reason'].",
    tools=[approval_tool],
    output_key="human_decision"
)

# 根据人工决定继续操作的 Agent
process_decision = LlmAgent(
    name="ProcessDecision",
    instruction="Check {human_decision}. If 'approved', proceed. If 'rejected', inform user."
)

approval_workflow = SequentialAgent(
    name="HumanApprovalWorkflow",
    sub_agents=[prepare_request, request_approval, process_decision]
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/agent/workflowagents/sequentialagent"
    "google.golang.org/adk/v2/tool"
)

	// 概念代码：使用工具进行人工批准
	// --- 假设 externalApprovalTool 存在 ---
	// func externalApprovalTool(amount float64, reason string) (string, error) { ... }
	type externalApprovalToolArgs struct {
		Amount float64 `json:"amount" jsonschema:"The amount for which approval is requested."`
		Reason string  `json:"reason" jsonschema:"The reason for the approval request."`
	}
	var externalApprovalTool func(agent.Context, externalApprovalToolArgs) (string, error)
	approvalTool, _ := functiontool.New(
		functiontool.Config{
			Name:        "external_approval_tool",
			Description: "Sends a request for human approval.",
		},
		externalApprovalTool,
	)

	prepareRequest, _ := llmagent.New(llmagent.Config{
		Name:        "PrepareApproval",
		Instruction: "Prepare the approval request details based on user input. Store amount and reason in state.",
		Model:       m,
	})

	requestApproval, _ := llmagent.New(llmagent.Config{
		Name:        "RequestHumanApproval",
		Instruction: "Use the external_approval_tool with amount from state['approval_amount'] and reason from state['approval_reason'].",
		Tools:       []tool.Tool{approvalTool},
		OutputKey:   "human_decision",
		Model:       m,
	})

	processDecision, _ := llmagent.New(llmagent.Config{
		Name:        "ProcessDecision",
		Instruction: "Check {human_decision}. If 'approved', proceed. If 'rejected', inform user.",
		Model:       m,
	})

	approvalWorkflow, _ := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{Name: "HumanApprovalWorkflow", SubAgents: []agent.Agent{prepareRequest, requestApproval, processDecision}},
	})
```

{{% /tab %}}
{{< /tabs >}}
### 带政策的人机循环 {#human-in-the-loop-with-policy}

实现人机循环的一种更高级且结构化的方式是使用 `PolicyEngine`。该方法允许您定义策略，在工具执行之前触发用户确认步骤。`SecurityPlugin` 会拦截工具调用，咨询 `PolicyEngine`，如果策略要求，它将自动请求用户确认。该模式在执行治理和安全规则方面更为稳健。

其工作原理如下：

1.  **`SecurityPlugin`**: 将此插件添加到您的 `Runner` 中。它充当所有工具调用的拦截器。
2.  **`BasePolicyEngine`**: 创建一个自定义类来实现此接口。其 `evaluate()` 方法包含您决定工具调用是否需要确认的逻辑。
3.  **`PolicyOutcome.CONFIRM`**: 当您的 `evaluate()` 方法返回此结果时，`SecurityPlugin` 会暂停工具执行，并使用 `getAskUserConfirmationFunctionCalls` 生成一个特殊的 `FunctionCall`。
4.  **应用处理**: 您的应用代码接收此特殊函数调用，并向用户展示确认请求。
5.  **用户确认**: 一旦用户确认，您的应用将 `FunctionResponse` 发送回 Agent，使 `SecurityPlugin` 能继续执行原始工具调用。

{{% alert context="default" %}}
**TypeScript 推荐模式**

基于策略的模式是使用 TypeScript 实现人机循环工作流的推荐方法。对其他 ADK 语言的支持计划在未来版本中推出。
{{% /alert %}}
下面展示了使用 `CustomPolicyEngine` 在执行任何工具之前要求用户确认的概念示例。

---

原文：[Multi-agent workflow patterns](https://adk.dev/workflows/patterns/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/workflows/patterns.md)
