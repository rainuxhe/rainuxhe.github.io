---
title: "顺序工作流"
description: "***SequentialAgent*** 类是一个模板工作流 Agent，它按照列表中指定的顺序执行其子 Agent。当你希望执行以固定的、严格的顺序进行时，请使用 ***SequentialAgent***。例如"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

***SequentialAgent*** 类是一个 [模板工作流](/docs/adk/build/multi-agent-workflows/template-workflows/) Agent，它按照列表中指定的顺序执行其子 Agent。当你希望以固定、严格的顺序执行任务时，请使用 ***SequentialAgent***。与其他模板化工作流一样，***SequentialAgent*** 对象的执行不会由 AI 模型控制，其子 Agent 的执行是确定性的。顺序执行集中指定的子 Agent 可能会使用 AI 模型，也可能不会，但这些子 Agent 的整体执行最终由你定义的 ***SequentialAgent*** 对象管理。

{{% alert context="warning" %}}
**已弃用：请使用基于图的工作流**

在 ADK Python、TypeScript、Go 和 Kotlin 中，模板工作流已被更灵活的工作流结构取代，包括 [基于图的工作流](/docs/adk/build/graph-workflows/) 和 [动态工作流](/docs/adk/build/graph-workflows/dynamic-workflows/)。
{{% /alert %}}

### 示例场景 {#example-scenario}

你希望构建一个能够总结任意网页的 Agent，使用两个工具：**获取页面内容** 和 **总结页面**。由于 Agent 必须始终先调用 **获取页面内容** 再调用 **总结页面**，你可以使用 ***SequentialAgent*** 类来构建你的 Agent。

### 工作原理 {#how-it-works}

当 `SequentialAgent` 的 `Run Async` 方法被调用时，它执行以下操作：

1. **迭代：** 按提供的顺序迭代子 Agent 列表。
2. **子 Agent 执行：** 对列表中的每个子 Agent，调用子 Agent 的 `Run Async` 方法。

![Sequential Agent](/images/adk/sequential-agent.png){: width="600"}

{{% alert context="info" %}}
**共享调用上下文**

`SequentialAgent` 将相同的 `InvocationContext` 传递给其每个子 Agent。这意味着它们共享相同的会话状态，包括临时 (`temp:`) 命名空间，从而便于在单一操作回合中在步骤之间传递数据。
{{% /alert %}}

### 完整示例：代码开发流水线 {#full-example-code-development-pipeline}

考虑一个简化的代码开发流水线：

* **代码编写 Agent：** 一个 LLM Agent，根据规范生成初始代码。
* **代码审查 Agent：** 一个 LLM Agent，用于审查生成的代码，检查错误、样式问题以及是否符合最佳实践。该 Agent 接收代码编写 Agent 的输出。
* **代码重构 Agent：** 一个 LLM Agent，接收经过审查的代码以及审查者的评论，进行重构以提高代码质量并解决问题。

使用 `SequentialAgent` 可以轻松定义此执行流程，如以下代码片段所示：

```py
SequentialAgent(name="CodePipelineAgent", sub_agents=[CodeWriterAgent, CodeReviewerAgent, CodeRefactorerAgent])
```

这确保代码是先被编写，*然后*审查，*最后*重构，遵循严格、可靠的顺序。**每个子 Agent 的输出通过使用 [Output Key](/docs/adk/build/agents/simple-agents/#data-handling)** 将它们存储在状态中并传递给下一个 Agent。

<details>
<summary>代码</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.agents.llm_agent import LlmAgent

# --- 常量 ---
GEMINI_MODEL = "gemini-2.5-flash"

# --- 1. 为每个流水线阶段定义子 Agent ---

# 代码编写 Agent
# 接收初始规范（来自用户查询）并编写代码。
code_writer_agent = LlmAgent(
    name="CodeWriterAgent",
    model=GEMINI_MODEL,
    instruction="""
    You are a Python Code Generator.
    Based *only* on the user's request, write Python code that fulfills the requirement.
    Output *only* the complete Python code block, enclosed in triple backticks (```python ... ```).
    Do not add any other text before or after the code block.
    """,
    description="Writes initial Python code based on a specification.",
    output_key="generated_code"
)

# 代码审查 Agent
# 接收前一个 Agent 生成的代码（从状态中读取）并提供反馈。
code_reviewer_agent = LlmAgent(
    name="CodeReviewerAgent",
    model=GEMINI_MODEL,
    instruction="""
    You are an expert Python Code Reviewer.
    Your task is to provide constructive feedback on the provided code.

    **Code to Review:**
    ```python
    {generated_code}
    ```

    **评审标准:**
    1.  **正确性:** 代码是否按预期工作？是否存在逻辑错误？
    2.  **可读性:** 代码是否清晰易懂？是否遵循 PEP 8 风格指南？
    3.  **效率:** 代码是否足够高效？是否存在明显的性能瓶颈？
    4.  **边界情况:** 代码是否能优雅地处理潜在的边界情况或无效输入？
    5.  **最佳实践:** 代码是否遵循常见的 Python 最佳实践？

    **输出:**
    以简明的项目符号列表提供反馈。专注于最重要的改进点。
    如果代码非常完善且无需修改，只需说明：“未发现重大问题”。
    仅输出评审意见或“未发现重大问题”声明。

    ```python
    {generated_code}
    ```

    **审查评论:**
    {review_comments}

    **任务:**
    仔细根据审查评论的建议重构原始代码。
    如果审查评论指出“未发现重大问题”，则返回原始代码，不作更改。
    确保最终代码完整、可运行，并包含必要的导入和文档字符串。

    **输出:**
    仅输出最终重构的 Python 代码块，用三重反引号 (```python ... ```) 包裹。
    不要在代码块前后添加任何其他文本。

```
{{% /tab %}}
{{% tab tabName="Go" %}}
```go
	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		return fmt.Errorf("failed to create model: %v", err)
	}

	codeWriterAgent, err := llmagent.New(llmagent.Config{
		Name:        "CodeWriterAgent",
		Model:       model,
		Description: "Writes initial Go code based on a specification.",
		Instruction: `You are a Go Code Generator.
Based *only* on the user's request, write Go code that fulfills the requirement.
Output *only* the complete Go code block, enclosed in triple backticks ('''go ... ''').
Do not add any other text before or after the code block.`,
		OutputKey: "generated_code",
	})
	if err != nil {
		return fmt.Errorf("failed to create code writer agent: %v", err)
	}

	codeReviewerAgent, err := llmagent.New(llmagent.Config{
		Name:        "CodeReviewerAgent",
		Model:       model,
		Description: "Reviews code and provides feedback.",
		Instruction: `You are an expert Go Code Reviewer.
Your task is to provide constructive feedback on the provided code.

**Code to Review:**
'''go
{generated_code}
'''

**Review Criteria:**
1.  **Correctness:** Does the code work as intended? Are there logic errors?
2.  **Readability:** Is the code clear and easy to understand? Follows Go style guidelines?
3.  **Idiomatic Go:** Does the code use Go's features in a natural and standard way?
4.  **Edge Cases:** Does the code handle potential edge cases or invalid inputs gracefully?
5.  **Best Practices:** Does the code follow common Go best practices?

**Output:**
Provide your feedback as a concise, bulleted list. Focus on the most important points for improvement.
If the code is excellent and requires no changes, simply state: "No major issues found."
Output *only* the review comments or the "No major issues" statement.`,
		OutputKey: "review_comments",
	})
	if err != nil {
		return fmt.Errorf("failed to create code reviewer agent: %v", err)
	}

	codeRefactorerAgent, err := llmagent.New(llmagent.Config{
		Name:        "CodeRefactorerAgent",
		Model:       model,
		Description: "Refactors code based on review comments.",
		Instruction: `You are a Go Code Refactoring AI.
Your goal is to improve the given Go code based on the provided review comments.

**Original Code:**
'''go
{generated_code}
'''

**Review Comments:**
{review_comments}

**Task:**
Carefully apply the suggestions from the review comments to refactor the original code.
If the review comments state "No major issues found," return the original code unchanged.
Ensure the final code is complete, functional, and includes necessary imports.

**Output:**
Output *only* the final, refactored Go code block, enclosed in triple backticks ('''go ... ''').
Do not add any other text before or after the code block.`,
		OutputKey: "refactored_code",
	})
	if err != nil {
		return fmt.Errorf("failed to create code refactorer agent: %v", err)
	}

	codePipelineAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:        appName,
			Description: "Executes a sequence of code writing, reviewing, and refactoring.",
			SubAgents: []agent.Agent{
				codeWriterAgent,
				codeReviewerAgent,
				codeRefactorerAgent,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create sequential agent: %v", err)
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

原文：[Sequential template workflow agent](https://adk.dev/agents/workflow-agents/sequential-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/workflow-agents/sequential-agents.md)
