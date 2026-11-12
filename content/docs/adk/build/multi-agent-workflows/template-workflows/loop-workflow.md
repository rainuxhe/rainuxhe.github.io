---
title: "循环工作流"
description: "***LoopAgent*** 类是一个模板工作流 Agent，它会在循环中执行其子 Agent，直到达到指定的迭代次数或满足终止条件。当您的工作流涉及需要循环执行子 Agent 时，请使用 ***LoopAgent***。"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0， Go v0.1.0。

***LoopAgent*** 类是一个 [模板工作流程](/docs/adk/build/multi-agent-workflows/template-workflows/) Agent
在指定次数的迭代内，以循环方式执行其子 Agent，或
直到满足终止条件。当你的工作流程时，使用 ***LoopAgent***
涉及重复或迭代细化，例如修订代码或
文档。与其他模板工作流程一样，***LoopAgent*** 的执行
对象不受AI模型控制，执行方式具有确定性
其子 Agent。定义循环内的子 Agent 可能会使用，也可能不会使用 AI
模型，但这些子 Agent 的整体执行最终由
你定义的***LoopAgent***对象。

{{% alert context="warning" %}}
**已弃用：使用基于图表的工作流程**

在 ADK Python、TypeScript、Go 和 Kotlin 中，模板工作流程是
被更灵活的工作流结构所取代，包括
[基于图的工作流程](/docs/adk/build/graph-workflows/) 和
[动态工作流程](/docs/adk/build/graph-workflows/dynamic-workflows/)。
{{% /alert %}}

### 示例情景 {#example-scenario}

你想构建一个能够生成食物图像的 Agent，但有时
你需要生成特定数量的物品，比如香蕉，这个 Agent
生成图像中不同数量的这些项目，例如7的图像
香蕉。你有两个工具：`Generate Image`，`Count Food Items`。如果你的目标
是要不断生成图像，直到正确生成指定的图像
物品数量，或者经过一定次数的迭代后，你可以建造你的
使用***LoopAgent***工作流程的agent。

### 运作方式 {#how-it-works}

当调用`LoopAgent`的`Run Async`方法时，它执行以下操作：

1. **子 Agent 执行：** 它遍历子 Agent 列表_in order_。对于每个子 Agent，调用 Agent 的 `Run Async` 方法。
2. **终止检定：**

    _关键_，`LoopAgent`本身并不_本质上决定何时停止循环。你_必须_实现终止机制以防止无限循环。常见策略包括：

    * **最大迭代次数**：在`LoopAgent`中设定最大迭代次数。**循环将在该次数后终止**。在 Python 中，`max_iterations`默认为`None`，这意味着循环只有在升级时才停止。
    * **从子 Agent 升级**：设计一个或多个子 Agent 来评估某个条件（例如，“文档质量是否足够好？”，“是否达成共识？”）。如果条件满足，子 Agent 通过发送一个事件，该事件的动作将`escalate`为真，从而发出终止信号。在 Python 中，自定义 Agent 产生带有`actions=EventActions(escalate=True)`的`Event`，而回调则设置`callback_context.actions.escalate = True`，工具集则设置`tool_context.actions.escalate = True`。内置的`exit_loop`工具会帮你设置该标志。![Loop Agent](/images/adk/loop-agent.png)

### 完整示例：迭代文档改进 {#full-example-iterative-document-improvement}

想象一个场景，你希望迭代地改进一份文档：

* **撰写 Agent:** 一个 `LlmAgent`，用于生成或完善某个主题的草稿。
* **批评 Agent:** 一个 `LlmAgent`，用于批评草稿，识别需要改进的地方。

    ```py
    LoopAgent(name="RefinementLoop", sub_agents=[WriterAgent, CriticAgent], max_iterations=5)
    ```

在此设置中，`LoopAgent` 将管理迭代过程。`CriticAgent` 可以**配备一个升级工具，如 `exit_loop`，当文档达到满意的质量水平时调用该工具**，以防止进一步的迭代。或者，可以使用 `max_iterations` 参数将过程限制在固定的循环次数，或者可以实现外部逻辑来做出停止决策。**循环最多运行五次**，确保迭代优化不会无限继续。

<details>
<summary>完整代码</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.agents import LoopAgent, LlmAgent, SequentialAgent
from google.adk.tools.tool_context import ToolContext
from google.adk.agents.callback_context import CallbackContext

# --- 常量 ---
GEMINI_MODEL = "gemini-2.5-flash"

# --- 状态键 ---
STATE_CURRENT_DOC = "current_document"
STATE_CRITICISM = "criticism"
# 定义评论者应使用的确切短语以表示完成
COMPLETION_PHRASE = "No major issues found."

# --- 工具定义 ---
def exit_loop(tool_context: ToolContext):
    """Call this function ONLY when the critique indicates no further changes are needed, signaling the iterative process should end."""
    print(f"  [Tool Call] exit_loop triggered by {tool_context.agent_name}")
    tool_context.actions.escalate = True
    tool_context.actions.skip_summarization = True
    # 返回空字典，因为工具通常应该返回可 JSON 序列化的输出
    return {}

# --- Agent 前回调 ---
def update_initial_topic_state(callback_context: CallbackContext):
    """Ensure 'initial_topic' is set in state before pipeline starts."""
    callback_context.state['initial_topic'] = callback_context.state.get('initial_topic', 'a robot developing unexpected emotions')

# --- Agent 定义 ---

# 步骤 1：初始写作 Agent（在开始时运行一次）
initial_writer_agent = LlmAgent(
    name="InitialWriterAgent",
    model=GEMINI_MODEL,
    include_contents='none',
    instruction=f"""
    You are a Creative Writing Assistant tasked with starting a story.
    Write a *very basic* first draft of a short story (just 1-2 simple sentences).
    Keep it plain and minimal - do NOT add descriptive language yet.
    Topic: {{initial_topic}}

    Output *only* the story/document text. Do not add introductions or explanations.
    """,
    description="Writes the initial document draft based on the topic, aiming for some initial substance.",
    output_key=STATE_CURRENT_DOC
)

# 步骤 2a：评论者 Agent（在完善循环内部）
critic_agent_in_loop = LlmAgent(
    name="CriticAgent",
    model=GEMINI_MODEL,
    include_contents='none',
    instruction=f"""
    You are a Constructive Critic AI reviewing a short story draft.

    **Document to Review:**
    ```

    {{current_document}}

    ```

    **Completion Criteria (ALL must be met):**
    1. At least 4 sentences long
    2. Has a clear beginning, middle, and end
    3. Includes at least one descriptive detail (sensory or emotional)

    **Task:**
    Check the document against the criteria above.

    IF any criteria is NOT met, provide specific feedback on what to add or improve.
    Output *only* the critique text.

    IF ALL criteria are met, respond *exactly* with: "{COMPLETION_PHRASE}"
    """,
    description="Reviews the current draft, providing critique if clear improvements are needed, otherwise signals completion.",
    output_key=STATE_CRITICISM
    )

    # STEP 2b: Refiner/Exiter Agent (Inside the Refinement Loop)
    refiner_agent_in_loop = LlmAgent(
    name="RefinerAgent",
    model=GEMINI_MODEL,
    # Relies solely on state via placeholders
    include_contents='none',
    instruction=f"""
    You are a Creative Writing Assistant refining a document based on feedback OR exiting the process.
    **Current Document:**
    ```

    {{current_document}}

    ```
    **Critique/Suggestions:**
    {{criticism}}

    **Task:**
    Analyze the 'Critique/Suggestions'.
    IF the critique is *exactly* "{COMPLETION_PHRASE}":
    You MUST call the 'exit_loop' function. Do not output any text.
    ELSE (the critique contains actionable feedback):
    Carefully apply the suggestions to improve the 'Current Document'. Output *only* the refined document text.

    Do not add explanations. Either output the refined document OR call the exit_loop function.
    """,
    description="Refines the document based on critique, or calls exit_loop if critique indicates completion.",
    tools=[exit_loop], # Provide the exit_loop tool
    output_key=STATE_CURRENT_DOC # Overwrites state['current_document'] with the refined version
    )

    # STEP 2: Refinement Loop Agent
    refinement_loop = LoopAgent(
    name="RefinementLoop",
    # Agent order is crucial: Critique first, then Refine/Exit
    sub_agents=[
        critic_agent_in_loop,
        refiner_agent_in_loop,
    ],
    max_iterations=5 # Limit loops
    )

    # STEP 3: Overall Sequential Pipeline
    # For ADK tools compatibility, the root agent must be named `root_agent`
    root_agent = SequentialAgent(
    name="IterativeWritingPipeline",
    sub_agents=[
        initial_writer_agent, # Run first to create initial doc
        refinement_loop       # Then run the critique/refine loop
    ],
    before_agent_callback=update_initial_topic_state, # set initial topic in state
    description="Writes an initial document and then iteratively refines it with critique using an exit tool."
    )
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// ExitLoopArgs 定义了 ExitLoop 工具的（空的）参数。
type ExitLoopArgs struct{}

// ExitLoopResults 定义了 ExitLoop 工具的输出。
type ExitLoopResults struct{}

// ExitLoop 是一个通过将 Escalate 设置为 true 来通知循环终止的工具。
func ExitLoop(ctx agent.Context, input ExitLoopArgs) (ExitLoopResults, error) {
	fmt.Printf("[Tool Call] exitLoop triggered by %s \n", ctx.AgentName())
	ctx.Actions().Escalate = true
	return ExitLoopResults{}, nil
}

func main() {
	ctx := context.Background()

	if err := runAgent(ctx, "Write a document about a cat"); err != nil {
		log.Fatalf("Agent execution failed: %v", err)
	}
}

func runAgent(ctx context.Context, prompt string) error {
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		return fmt.Errorf("failed to create model: %v", err)
	}

	// 步骤 1：初始写作 Agent（在开始时运行一次）
	initialWriterAgent, err := llmagent.New(llmagent.Config{
		Name:        "InitialWriterAgent",
		Model:       model,
		Description: "Writes the initial document draft based on the topic.",
		Instruction: `You are a Creative Writing Assistant tasked with starting a story.
Write the *first draft* of a short story (aim for 2-4 sentences).
Base the content *only* on the topic provided in the user's prompt.
Output *only* the story/document text. Do not add introductions or explanations.`,
		OutputKey: stateDoc,
	})
	if err != nil {
		return fmt.Errorf("failed to create initial writer agent: %v", err)
	}

	// 步骤 2a：评论者 Agent（在完善循环内部）
	criticAgentInLoop, err := llmagent.New(llmagent.Config{
		Name:        "CriticAgent",
		Model:       model,
		Description: "Reviews the current draft, providing critique or signaling completion.",
		Instruction: fmt.Sprintf(`You are a Constructive Critic AI reviewing a short document draft.
**Document to Review:**
"""
{%s}
"""
**Task:**
Review the document.
IF you identify 1-2 *clear and actionable* ways it could be improved:
Provide these specific suggestions concisely. Output *only* the critique text.
ELSE IF the document is coherent and addresses the topic adequately:
Respond *exactly* with the phrase "%s" and nothing else.`, stateDoc, donePhrase),
		OutputKey: stateCrit,
	})
	if err != nil {
		return fmt.Errorf("failed to create critic agent: %v", err)
	}

	exitLoopTool, err := functiontool.New(
		functiontool.Config{
			Name:        "exitLoop",
			Description: "Call this function ONLY when the critique indicates no further changes are needed.",
		},
		ExitLoop,
	)
	if err != nil {
		return fmt.Errorf("failed to create exit loop tool: %v", err)
	}

	// 步骤 2b：精炼器/退出器 Agent（在精炼循环内部）
	refinerAgentInLoop, err := llmagent.New(llmagent.Config{
		Name:  "RefinerAgent",
		Model: model,
		Instruction: fmt.Sprintf(`You are a Creative Writing Assistant refining a document based on feedback OR exiting the process.
**Current Document:**

"""
{%s}
"""

**Critique/Suggestions:**
{%s}
**Task:**
Analyze the 'Critique/Suggestions'.
IF the critique is *exactly* "%s":
You MUST call the 'exitLoop' function. Do not output any text.
ELSE (the critique contains actionable feedback):
Carefully apply the suggestions to improve the 'Current Document'. Output *only* the refined document text.`, stateDoc, stateCrit, donePhrase),
		Description: "Refines the document based on critique, or calls exitLoop if critique indicates completion.",
		Tools:       []tool.Tool{exitLoopTool},
		OutputKey:   stateDoc,
	})
	if err != nil {
		return fmt.Errorf("failed to create refiner agent: %v", err)
	}

	// 步骤 2：精炼循环 Agent
	refinementLoop, err := loopagent.New(loopagent.Config{
		AgentConfig: agent.Config{
			Name:      "RefinementLoop",
			SubAgents: []agent.Agent{criticAgentInLoop, refinerAgentInLoop},
		},
		MaxIterations: 5,
	})
	if err != nil {
		return fmt.Errorf("failed to create loop agent: %v", err)
	}

	// 步骤 3：整体顺序管道
	iterativeWriterAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:      appName,
			SubAgents: []agent.Agent{initialWriterAgent, refinementLoop},
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

原文：[Loop template workflow agent](https://adk.dev/agents/workflow-agents/loop-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/workflow-agents/loop-agents.md)
