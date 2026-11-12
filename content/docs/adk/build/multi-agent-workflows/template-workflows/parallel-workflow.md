---
title: "并行工作流"
description: "***ParallelAgent*** 类是一个模板工作流 Agent，用于并发执行其子 Agent。这种执行策略可以显著加快两个或多个任务可以独立执行的工作流。Fo"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

***ParallelAgent*** 类是一个并行执行子 Agent 的模板工作流 Agent。此执行策略可以显著加快两个或多个任务可以独立完成的工作流。对于优先考虑速度并涉及独立、资源密集型任务的场景，这种模板化工作流便于并行执行，从而显著减少整体处理时间。在使用此类型的工作流时，需要确保每个子 Agent 可以在不依赖其他子 Agent 的情况下运行。这种工作流类型对于多源数据检索或重计算等操作尤其有益，其中并行化可以带来显著的性能提升。

与其他模板工作流一样，***ParallelAgent*** 对象的执行不受 AI 模型控制，其对子 Agent 的执行是确定性的。并行执行集中指定的子 Agent 可能使用 AI 模型，也可能不使用，但这些子 Agent 的总体执行最终由您定义的 ***ParallelAgent*** 对象管理。

已弃用：请使用基于图的工作流

在 ADK 的 Python、TypeScript、Go 和 Kotlin 中，模板工作流已被更灵活的工作流结构取代，包括[基于图的工作流]和[动态工作流]。

### 工作原理 {#how-it-works}

当 `ParallelAgent` 的 `run_async()` 方法被调用时：

1. **并发执行：** 它会同时启动 `sub_agents` 列表中*每个*子 Agent 的 `run_async()` 方法。这意味着所有 Agent 几乎在同一时间开始运行。
2. **独立分支：** 每个子 Agent 在自己的执行分支中运行，执行过程中***不会自动共享会话历史***。子 Agent 只能看到其自身分支上的事件。会话状态是共享的：所有分支都在同一个会话中运行，因此一个子 Agent 写入的值，例如通过 `output_key` 写入的值，对其他分支和后续的 Agent 也是可见的。
3. **结果收集：** `ParallelAgent` 合并子 Agent 的事件流，并在事件产生时立即输出；它不会将结果收集到您之后可以读取的列表中。由于分支间交织，事件顺序是不确定的。要使用子 Agent 的结果，请从共享会话状态中读取，例如通过 `output_key` 分配给它的键。

### 独立执行与状态管理理解`ParallelAgent`中的子 Agent 是独立运行的*至关重要*。如果您*需要*这些 Agent 之间进行通信或数据共享，必须明确实现。可能的方法包括： {#independent-execution-and-state-management}

* **共享会话状态：** 所有分支在同一个会话中运行，因此给每个子 Agent 一个`output_key`，并从后续 Agent 的指令中读取这些键。由于分支是并行运行的，不要依赖一个分支读取另一个仍在写入的分支的键。
* **外部状态管理：** 使用外部数据库、消息队列或其他机制来管理共享状态并促进 Agent 之间的通信。
* **后处理：** 收集每个分支的结果，然后实现逻辑来协调数据。

![Parallel Agent](/images/adk/parallel-agent.png){: width="600"}

### 完整示例：并行网络研究 {#full-example-parallel-web-research}

想象一下同时研究多个主题：

1. **研究员 Agent 1：** 一个`LlmAgent`，研究“可再生能源来源”。
2. **研究员 Agent 2：** 一个`LlmAgent`，研究“电动车技术”。
3. **研究员 Agent 3：** 一个`LlmAgent`，研究“碳捕获方法”。

    ```py
    ParallelAgent(name="ParallelWebResearchAgent", sub_agents=[ResearcherAgent1, ResearcherAgent2, ResearcherAgent3])
    ```

这些研究任务是独立的。使用 `ParallelAgent` 可以使它们同时运行，与顺序运行相比，可能显著减少总体研究时间。要在之后使用每个 Agent 的结果，请给它 `output_key` 并从会话状态中读取该键。

<details>
<summary>完整代码</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.agents.parallel_agent import ParallelAgent
from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.tools import google_search

# --- 常量 ---
GEMINI_MODEL = "gemini-2.5-flash"

# --- 1. 定义研究子 Agent（并行运行） ---
# 研究员 1：可再生能源
researcher_agent_1 = LlmAgent(
    name="RenewableEnergyResearcher",
    model=GEMINI_MODEL,
    instruction="""
    You are an AI Research Assistant specializing in energy.
    Research the latest advancements in 'renewable energy sources'.
    Use the Google Search tool provided.
    Summarize your key findings concisely (1-2 sentences).
    Output *only* the summary.
    """,
    description="Researches renewable energy sources.",
    tools=[google_search],
    # 将结果存储在状态中以供合并 Agent 使用
    output_key="renewable_energy_result"
)

# 研究员 2：电动汽车
researcher_agent_2 = LlmAgent(
    name="EVResearcher",
    model=GEMINI_MODEL,
    instruction="""
    You are an AI Research Assistant specializing in transportation.
    Research the latest developments in 'electric vehicle technology'.
    Use the Google Search tool provided.
    Summarize your key findings concisely (1-2 sentences).
    Output *only* the summary.
    """,
    description="Researches electric vehicle technology.",
    tools=[google_search],
    # 将结果存储在状态中以供合并 Agent 使用
    output_key="ev_technology_result"
)

# 研究员 3：碳捕获
researcher_agent_3 = LlmAgent(
    name="CarbonCaptureResearcher",
    model=GEMINI_MODEL,
    instruction="""
    You are an AI Research Assistant specializing in climate solutions.
    Research the current state of 'carbon capture methods'.
    Use the Google Search tool provided.
    Summarize your key findings concisely (1-2 sentences).
    Output *only* the summary.
    """,
    description="Researches carbon capture methods.",
    tools=[google_search],
    # 将结果存储在状态中以供合并 Agent 使用
    output_key="carbon_capture_result"
)

# --- 2. 创建并行 Agent（同时运行研究员） ---
# 该 Agent 协调研究员的并发执行。
# 当所有研究员完成并将结果存储在状态中时，它结束。
parallel_research_agent = ParallelAgent(
    name="ParallelWebResearchAgent",
    sub_agents=[researcher_agent_1, researcher_agent_2, researcher_agent_3],
    description="Runs multiple research agents in parallel to gather information."
)

# --- 3. 定义合并 Agent（在并行 Agent 之后运行） ---
# 该 Agent 获取并行 Agent 存储在会话状态中的结果
# 并将其综合为一个带有归属的单一结构化响应。
merger_agent = LlmAgent(
    name="SynthesisAgent",
    model=GEMINI_MODEL,  # Or potentially a more powerful model if needed for synthesis
    instruction="""
    You are an AI Assistant responsible for combining research findings into a structured report.

    Your primary task is to synthesize the following research summaries, clearly attributing findings to their source areas. Structure your response using headings for each topic. Ensure the report is coherent and integrates the key points smoothly.

    **Crucially: Your entire response MUST be grounded *exclusively* on the information provided in the 'Input Summaries' below. Do NOT add any external knowledge, facts, or details not present in these specific summaries.**

    **Input Summaries:**

    *   **Renewable Energy:**
        {renewable_energy_result}

    *   **Electric Vehicles:**
        {ev_technology_result}

    *   **Carbon Capture:**
        {carbon_capture_result}

    **Output Format:**

    ## 最近可持续技术进展总结

    ### 可再生能源研究结果
    (Based on RenewableEnergyResearcher's findings)
    [Synthesize and elaborate *only* on the renewable energy input summary provided above.]

    ### 电动汽车研究结果
    (Based on EVResearcher's findings)
    [Synthesize and elaborate *only* on the EV input summary provided above.]

    ### 碳捕获研究结果
    (Based on CarbonCaptureResearcher's findings)
    [Synthesize and elaborate *only* on the carbon capture input summary provided above.]

    ### 综合结论
    [Provide a brief (1-2 sentence) concluding statement that connects *only* the findings presented above.]

    Output *only* the structured report following this format. Do not include introductory or concluding phrases outside this structure, and strictly adhere to using only the provided input summary content.
    """,
    description="Combines research findings from parallel agents into a structured, cited report, strictly grounded on provided inputs.",
    # 合并不需要工具
    # 这里不需要 output_key，因为它的直接响应是序列的最终输出
)

# --- 4. 创建顺序 Agent（协调整体流程） ---
# 这是要运行的主要 Agent。它首先执行并行 Agent
# 以填充状态，然后执行合并 Agent 以生成最终输出。
sequential_pipeline_agent = SequentialAgent(
    name="ResearchAndSynthesisPipeline",
    # 先运行并行研究，然后再合并
    sub_agents=[parallel_research_agent, merger_agent],
    description="Coordinates parallel research and synthesizes the results."
)

root_agent = sequential_pipeline_agent
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		return fmt.Errorf("failed to create model: %v", err)
	}

	// --- 1. 定义研究子 Agent（并行运行） ---
	researcher1, err := llmagent.New(llmagent.Config{
		Name:  "RenewableEnergyResearcher",
		Model: model,
		Instruction: `You are an AI Research Assistant specializing in energy.
Research the latest advancements in 'renewable energy sources'.
Use the Google Search tool provided.
Summarize your key findings concisely (1-2 sentences).
Output *only* the summary.`,
		Description: "Researches renewable energy sources.",
		OutputKey:   "renewable_energy_result",
	})
	if err != nil {
		return err
	}
	researcher2, err := llmagent.New(llmagent.Config{
		Name:  "EVResearcher",
		Model: model,
		Instruction: `You are an AI Research Assistant specializing in transportation.
Research the latest developments in 'electric vehicle technology'.
Use the Google Search tool provided.
Summarize your key findings concisely (1-2 sentences).
Output *only* the summary.`,
		Description: "Researches electric vehicle technology.",
		OutputKey:   "ev_technology_result",
	})
	if err != nil {
		return err
	}
	researcher3, err := llmagent.New(llmagent.Config{
		Name:  "CarbonCaptureResearcher",
		Model: model,
		Instruction: `You are an AI Research Assistant specializing in climate solutions.
Research the current state of 'carbon capture methods'.
Use the Google Search tool provided.
Summarize your key findings concisely (1-2 sentences).
Output *only* the summary.`,
		Description: "Researches carbon capture methods.",
		OutputKey:   "carbon_capture_result",
	})
	if err != nil {
		return err
	}

	// --- 2. 创建并行 Agent（同时运行研究员） ---
	parallelResearchAgent, err := parallelagent.New(parallelagent.Config{
		AgentConfig: agent.Config{
			Name:        "ParallelWebResearchAgent",
			Description: "Runs multiple research agents in parallel to gather information.",
			SubAgents:   []agent.Agent{researcher1, researcher2, researcher3},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create parallel agent: %v", err)
	}

	// --- 3. 定义合并 Agent（在并行 Agent 之后运行） ---
	synthesisAgent, err := llmagent.New(llmagent.Config{
		Name:  "SynthesisAgent",
		Model: model,
		Instruction: `You are an AI Assistant responsible for combining research findings into a structured report.
Your primary task is to synthesize the following research summaries, clearly attributing findings to their source areas. Structure your response using headings for each topic. Ensure the report is coherent and integrates the key points smoothly.
**Crucially: Your entire response MUST be grounded *exclusively* on the information provided in the 'Input Summaries' below. Do NOT add any external knowledge, facts, or details not present in these specific summaries.**
**Input Summaries:**

*   **Renewable Energy:**
    {renewable_energy_result}

*   **Electric Vehicles:**
    {ev_technology_result}

*   **Carbon Capture:**
    {carbon_capture_result}

**Output Format:**

## Summary of Recent Sustainable Technology Advancements

### Renewable Energy Findings
(Based on RenewableEnergyResearcher's findings)
[Synthesize and elaborate *only* on the renewable energy input summary provided above.]

### Electric Vehicle Findings
(Based on EVResearcher's findings)
[Synthesize and elaborate *only* on the EV input summary provided above.]

### Carbon Capture Findings
(Based on CarbonCaptureResearcher's findings)
[Synthesize and elaborate *only* on the carbon capture input summary provided above.]

### Overall Conclusion
[Provide a brief (1-2 sentence) concluding statement that connects *only* the findings presented above.]

Output *only* the structured report following this format. Do not include introductory or concluding phrases outside this structure, and strictly adhere to using only the provided input summary content.`,
		Description: "Combines research findings from parallel agents into a structured, cited report, strictly grounded on provided inputs.",
	})
	if err != nil {
		return fmt.Errorf("failed to create synthesis agent: %v", err)
	}

	// --- 4. 创建顺序 Agent（协调整体流程） ---
	pipeline, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:        "ResearchAndSynthesisPipeline",
			Description: "Coordinates parallel research and synthesizes the results.",
			SubAgents:   []agent.Agent{parallelResearchAgent, synthesisAgent},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create sequential agent pipeline: %v", err)
	}
```

{{% /tab %}}
{{< /tabs >}}
</details>
{{% alert context="success" %}}
**所有 Agent 的全球指令**

在您的工作流程中使用 `GlobalInstructionPlugin` 对 `App` ([Python](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/global_instruction_plugin.py),
[TypeScript](https://github.com/google/adk-js/blob/main/core/src/plugins/global_instruction_plugin.ts),
[Java](https://github.com/google/adk-java/blob/main/core/src/main/java/com/google/adk/plugins/GlobalInstructionPlugin.java)) 或者在您的 Agent 上使用 `GlobalInstruction` 参数 ([Go](https://github.com/google/adk-go/blob/main/agent/llmagent/llmagent.go)) 应用一致的规则。
{{% /alert %}}

---

原文：[Parallel template workflow agent](https://adk.dev/agents/workflow-agents/parallel-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/workflow-agents/parallel-agents.md)
