---
title: "简单的 Agent"
description: "`LlmAgent` 类，通常简写为 `Agent`，是 ADK 的核心组件，作为你的 Agent 应用程序的核心部分。它利用大型语言模型（LLM）或生成式 AI 模型的能力进行推理"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0， Go v0.1.0。

`LlmAgent`类，通常简称为`Agent`，是核心组件。
ADK，作为你 Agent 应用的核心部分。它利用了强大的功能
大型语言模型（LLM）或生成式AI模型用于推理，
理解自然语言、做决策、生成反应，以及
与工具交互。因为这种类型的 Agent 使用AI模型来解释
指令和上下文，AI模型动态决定下一步如何进行，哪种情况
可以使用的工具（如果有的话），以及应提供哪些输出。因此，该过程的行为
Agent 类型是非确定性的，必须基于此构建和评估
行为的心态。

建立有效的`LlmAgent`需要明确其身份，明确指导
通过指令来表现其行为，并配备必要的工具，
能力。

## 定义 Agent 人身份和目的 {#define-agent-identity-and-purpose}

首先，你需要确定 Agent*是什么*以及它的*用途*。

- **`name` （必需）:** 每个 Agent 都需要一个唯一的字符串标识符。这
  `name`对内部运营至关重要，尤其是在多 Agent 系统中
  Agent 需要相互指涉或委派任务。选择
  反映 Agent 功能的描述性名称（例如，
  `customer_support_router`，`billing_inquiry_agent`）。在 Python 中，名字必须
  是有效的 Python 标识符，ADK 会拒绝保留名称 `user`。

- **`description`（可选，推荐多 Agent）:** 提供简明说明
  Agent 能力的总结。此描述主要用于
  *其他* LLMAgent 来决定是否应该将任务路由给该 Agent。
  要足够具体，以区别于其他对等节点（例如，“Handles”
  关于当前账单的查询“，而不仅仅是”账单 Agent“）。

- **`model`（Python 中的可选）:** 指定将供电的底层 LLM
  这个 Agent 的推理。这要么是一个字符串标识符，比如
  `"gemini-flash-latest"`或`BaseLlm`实例。如果你省略`model`，则
  Agent 继承了其最近`LlmAgent`祖先的模型，跳过任何
  非 `LlmAgent` 的父，如 `SequentialAgent`，
  `ParallelAgent`、`LoopAgent`或自定义`BaseAgent`。如果没有
  祖先设置模型，Agent 则退回到内置的默认模型
  描述见[配置默认模型](#configure-a-default-model)。该
  模型的选择会影响 Agent 的能力、成本和性能。参见
  [Models](/docs/adk/build/models-for-agents/)页面，提供可用选项和考虑因素。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 示例：定义基本身份
capital_agent = LlmAgent(
    model="gemini-flash-latest",
    name="capital_agent",
    description="Answers user questions about the capital city of a given country."
    # 指令和工具将随后添加
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// 示例：定义基本身份
agent, err := llmagent.New(llmagent.Config{
	Name:        "capital_agent",
	Model:       model,
	Description: "Answers user questions about the capital city of a given country.",
	// 指令和工具将随后添加
})
```

{{% /tab %}}
{{< /tabs >}}

## 使用说明指导 Agent {#guide-the-agent-with-instructions}

`instruction` 参数可以说是塑造 `LlmAgent` 行为最关键的因素。它是一个字符串（或返回字符串的函数），用于告诉 Agent：

- 它的核心任务或目标。
- 它的性格或角色（例如，“你是一个乐于助人的助手”，“你是一个机智的海盗”）。
- 行为的约束（例如，“仅回答关于 X 的问题”，“绝不泄露 Y”）。
- 如何以及何时使用其 `tools`。你应解释每个工具的用途及应调用的情况，补充工具自身的描述。
- 输出的期望格式（例如，“以 JSON 做答”，“提供项目列表”）。

**有效说明的技巧：**

- **清晰具体：** 避免含糊。明确说明所需的操作和结果。
- **使用 Markdown：** 通过标题、列表等提高复杂说明的可读性。
- **提供示例（少量示例）：** 对于复杂任务或特定输出格式，直接在说明中包含示例。
- **指导工具使用：** 不仅列出工具，还解释 Agent 应在 *何时* 以及 *为何* 使用它们。

**使用动态状态变量：**

- 说明是一个字符串模板，你可以使用 `{var}` 语法将动态值插入说明中。
- `{var}` 用于插入名为 var 的状态变量的值。
- `{artifact.var}` 用于插入名为 var 的 Artifact 的文本内容。
- 如果状态变量或 Artifact 不存在，Agent 将引发错误。如果你想忽略该错误，可以在变量名后添加 `?`，如 `{var?}`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 示例：添加指令
capital_agent = LlmAgent(
    model="gemini-flash-latest",
    name="capital_agent",
    description="Answers user questions about the capital city of a given country.",
    instruction="""You are an agent that provides the capital city of a country.
When a user asks for the capital of a country:
1. Identify the country name from the user's query.
2. Use the `get_capital_city` tool to find the capital.
3. Respond clearly to the user, stating the capital city.
Example Query: "What's the capital of France?"
Example Response: "The capital of France is Paris."
""",
    # 工具将随后添加
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
	// 示例：添加指令
	agent, err := llmagent.New(llmagent.Config{
		Name:        "capital_agent",
		Model:       model,
		Description: "Answers user questions about the capital city of a given country.",
		Instruction: `You are an agent that provides the capital city of a country.
When a user asks for the capital of a country:
1. Identify the country name from the user's query.
2. Use the 'get_capital_city' tool to find the capital.
3. Respond clearly to the user, stating the capital city.
Example Query: "What's the capital of {country}?"
Example Response: "The capital of France is Paris."`,
		// 工具将随后添加
	})
```

{{% /tab %}}
{{< /tabs >}}
要在 Python 中从 MCP（MCP）服务器动态获取 Agent 指令，请参阅 [Dynamic instructions with `McpInstructionProvider`](/docs/adk/components/custom-tools/mcp-tools/advanced-configuration/#dynamic-instructions-with-mcpinstructionprovider).

{{% alert context="info" %}}
**GlobalInstructionPlugin**

要对系统中的*所有*Agent 应用共享规则或一致的个性，请使用 `GlobalInstructionPlugin`，而不是已弃用的 `global_instruction` 参数。对于 ADK Go，请在 `llmagent.Config` 上设置 `GlobalInstruction` 或 `GlobalInstructionProvider`。
{{% /alert %}}

## 配备 Agent 工具 {#equip-the-agent-with-tools}

工具为您的 `LlmAgent` 提供超出 LLM 内置知识或推理能力的功能。它们允许 Agent 与外部世界交互、执行计算、获取实时数据或执行特定操作。

- **`tools`（可选）:** 提供 Agent 可使用的工具列表。列表中的每一项可以是：
    - 一个本地函数或方法（包装为 `FunctionTool`）。Python ADK 会自动将本地函数包装为 `FunctionTool`，而 Java 方法必须显式使用 `FunctionTool.create(...)` 进行包装。在 Kotlin 中，可以使用 `@Tool` 注解在编译时自动生成 `FunctionTool`。
    - 继承自 `BaseTool` 的类的实例。
    - 包装另一个 Agent 的 `AgentTool`，实现 Agent 间委派。有关更多信息，请参阅 [Custom agent workflows](/docs/adk/build/multi-agent-workflows/template-workflows/custom-template-workflows/#delegation)。在 Python 中，建议在 Agent 上设置 `mode='single_turn'` 并将其添加到 `sub_agents`，这会自动将其作为内联工具暴露，避免直接使用 `AgentTool(agent=...)` 语法。

LLM 使用函数/工具名称、描述（来自文档字符串或 `description` 字段）以及参数模式，根据对话和其指令决定调用哪个工具。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 定义一个工具功能
def get_capital_city(country: str) -> str:
  """Retrieves the capital city for a given country."""
  # 用实际逻辑替换（例如，API 调用，数据库查询）
  capitals = {"france": "Paris", "japan": "Tokyo", "canada": "Ottawa"}
  return capitals.get(country.lower(), f"Sorry, I don't know the capital of {country}.")

# 将该工具添加到 Agent 中
capital_agent = LlmAgent(
    model="gemini-flash-latest",
    name="capital_agent",
    description="Answers user questions about the capital city of a given country.",
    instruction="""You are an agent that provides the capital city of a country... (previous instruction text)""",
    tools=[get_capital_city] # Provide the function directly
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// 定义一个工具功能
type getCapitalCityArgs struct {
	Country string `json:"country" jsonschema:"The country to get the capital of."`
}
getCapitalCity := func(ctx agent.Context, args getCapitalCityArgs) (map[string]any, error) {
	// 用实际逻辑替换（例如，API 调用，数据库查询）
	capitals := map[string]string{"france": "Paris", "japan": "Tokyo", "canada": "Ottawa"}
	capital, ok := capitals[strings.ToLower(args.Country)]
	if !ok {
		return nil, fmt.Errorf("Sorry, I don't know the capital of %s.", args.Country)
	}
	return map[string]any{"result": capital}, nil
}

// 将该工具添加到 Agent 中
capitalTool, err := functiontool.New(
	functiontool.Config{
		Name:        "get_capital_city",
		Description: "Retrieves the capital city for a given country.",
	},
	getCapitalCity,
)
if err != nil {
	log.Fatal(err)
}
agent, err := llmagent.New(llmagent.Config{
	Name:        "capital_agent",
	Model:       model,
	Description: "Answers user questions about the capital city of a given country.",
	Instruction: "You are an agent that provides the capital city of a country... (previous instruction text)",
	Tools:       []tool.Tool{capitalTool},
})
```

{{% /tab %}}
{{< /tabs >}}
在 [Custom Tools](/docs/adk/components/custom-tools/) 中了解有关工具的更多信息。

## 高级配置与控制 {#advanced-configuration-and-control}

除了核心参数外，`LlmAgent` 提供了若干选项，以实现更精细的控制：

### 微调 AI 模型操作 {#fine-tune-ai-model-operation}

您可以使用 `generate_content_config` 调整底层 AI 模型生成响应的方式。

- **`generate_content_config`（可选）：** 传入一个实例 [`google.genai.types.GenerateContentConfig`](https://googleapis.github.io/python-genai/genai.html#genai.types.GenerateContentConfig)，以控制诸如 `temperature`（随机性）、`max_output_tokens`（响应长度）、`top_p`、`top_k` 以及安全设置等参数。在 Python 中，如果 `generate_content_config` 设置了 `tools`、`system_instruction`、`response_schema` 或 `http_options.base_url`，ADK 会引发 `ValueError`。请改为通过 Agent 的 `tools`、`instruction` 和 `output_schema` 字段设置前三项，并在模型或其客户端上设置基本网址。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.genai import types

agent = LlmAgent(
    # ... 其他参数
    generate_content_config=types.GenerateContentConfig(
        temperature=0.2, # More deterministic output
        max_output_tokens=250,
        safety_settings=[
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            )
        ]
    )
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import "google.golang.org/genai"

	temperature := float32(0.2)
	agent, err := llmagent.New(llmagent.Config{
		Name:  "gen_config_agent",
		Model: model,
		GenerateContentConfig: &genai.GenerateContentConfig{
			Temperature:     &temperature,
			MaxOutputTokens: 250,
		},
	})
```

{{% /tab %}}
{{< /tabs >}}

### 配置默认模型 {#configure-a-default-model}

支持版本：Python v1.22.0。

您可以使用 `set_default_model` 类方法为所有 `LlmAgent` 实例设置系统范围的默认模型。如果在创建 Agent 时未指定模型，它将回退到 ADK 的内置默认模型。此设置可帮助您避免重复指定模型，并轻松一次性更改所有 Agent 的模型。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent

# 为所有 Agent 设置新的默认模型
LlmAgent.set_default_model("gemini-flash-latest")

# 此 Agent 现在将默认使用“gemini-flash-latest”
agent_with_default_model = LlmAgent(
    name="default_model_agent",
    instruction="You are a helpful assistant."
)

# 您仍然可以为特定 Agent 覆盖默认设置
specific_agent = LlmAgent(
    name="specific_model_agent",
    model="gemini-pro-latest",
    instruction="You are a creative writer."
)
```

{{% /tab %}}
{{< /tabs >}}

### 结构化数据输入与输出 {#data-处理}

对于需要与`LLM Agent`进行结构化数据交换的场景，ADK
提供了定义期望输入和期望输出格式的机制，使用
模式定义。

- **`input_schema`（可选）:** 定义表示预期输入的模式
  当该 Agent 被*作为工具*调用时，结构。在 Python 中，`AgentTool`
  验证调用 Agent 对该模式的参数，并传递
  结果为该 Agent 的输入。该模式不适用于发送的用户消息
  直接告诉 Agent 人。

- **`output_schema`（可选）:** 定义一个表示所需模式的模式
  输出结构。如果设置为，Agent 的最终响应*必须*是JSON字符串
  符合这一模式。
  - 在 Python 中，支持的模式类型包括：
    - 以`MySchema`为例的Pydantic模型类
    - 原语列表，如 `list[str]`、`list[int]`、`list[bool]`、`list[float]`
    - `dict`
    - `google.genai.types.Schema`

{{% alert context="info" %}}
**用`output_schema` `tools`**

在 Python 中，ADK 支持在同一 Agent 上的 `output_schema` 和 `tools`：
工具在 Agent 工作时保持可用，模式仅适用于
最终回答。有些型号在同一个请求中接受两者，比如Gemini
Google Cloud 上的模型以及支持响应的供应商`LiteLlm`模型
模式，ADK 直接传递这些模式。对于其他模型，ADK 会添加
[`set_model_response`功能
tool](https://github.com/google/adk-python/blob/main/src/google/adk/tools/set_model_response_tool.py)
并指示模型通过该工具返回最终答案，即
可能无法可靠地工作。在这种情况下，考虑使用能够处理的子 Agent
输出格式是单独的。
{{% /alert %}}
- **`output_key`（可选）:** 提供字符串键。如果设置为，Agent 的*最终键*
  响应将自动保存到会议的州字典中，以下地址为
  这个密钥。这对于在 Agent 之间传递结果或在
  工作流程。
    - 在 Python 中，这可能看起来像：`session.state[output_key] =
      agent_response_text`。如果 `output_schema` 也被设置，ADK 会解析
      首先对模式进行响应，并存储解析后的值，而不是
      响应文本。`BaseModel`模式存储为`dict`，且
      `list[BaseModel]`模式存储为`list[dict]`。
    - 爪哇语：`session.state().put(outputKey, agentResponseText)`
    - 在 Golang 中，回调处理器内：`ctx.State().Set(output_key,
      agentResponseText)`

    在 Java 和 Kotlin 中，当 `output_schema` 也被设置时，*解析*响应
    以`Map`形式存储，而非文本。

{{% alert context="info" %}}
**Java 和 Kotlin 中的模式验证**Java 和 Kotlin 会根据模式的*结构*检查响应 — `type`、`required`、`nullable`、`anyOf` 和 `items`（参见 [`SchemaUtils`](https://github.com/google/adk-kotlin/blob/v1.0.0/core/src/commonMain/kotlin/com/google/adk/kt/SchemaUtils.kt)）。
约束字段如 `pattern`、`minLength` 和 `minimum` 会作为模式的一部分发送给模型，但 ADK 不会重新检查它们，因此由模型决定是否遵守它们。Python 会根据 Pydantic 模型进行验证，该模型会强制执行其声明的约束。

Java 和 Kotlin 只接受顶层对象模式；顶层数组或原始类型会验证失败。Python 也支持列表和原始类型输出模式。

如果响应验证失败，ADK 会记录错误，并将原始响应字符串存储在 `output_key` 下，而不是解析后的对象（参见 [`LlmAgent`](https://github.com/google/adk-kotlin/blob/v1.0.0/core/src/commonMain/kotlin/com/google/adk/kt/agents/LlmAgent.kt)）。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

输入和输出模式通常是 `Pydantic` BaseModel。

```python
from pydantic import BaseModel, Field

class CapitalOutput(BaseModel):
    capital: str = Field(description="The capital of the country.")

structured_capital_agent = LlmAgent(
    # ... 名称，型号，描述
    instruction="""You are a Capital Information Agent. Given a country, respond ONLY with a JSON object containing the capital. Format: {"capital": "capital_name"}""",
    output_schema=CapitalOutput, # Enforce JSON output
    output_key="found_capital"  # Store result in state['found_capital']
    # 工具=[...] 可与输出_schema结合使用；参见上面的说明
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

输入和输出的模式是一个 `google.genai.types.Schema` 对象。

```go
capitalOutput := &genai.Schema{
	Type:        genai.TypeObject,
	Description: "Schema for capital city information.",
	Properties: map[string]*genai.Schema{
		"capital": {
			Type:        genai.TypeString,
			Description: "The capital city of the country.",
		},
	},
}

agent, err := llmagent.New(llmagent.Config{
	Name:         "structured_capital_agent",
	Model:        model,
	Description:  "Provides capital information in a structured format.",
	Instruction:  `You are a Capital Information Agent. Given a country, respond ONLY with a JSON object containing the capital. Format: {"capital": "capital_name"}`,
	OutputSchema: capitalOutput,
	OutputKey:    "found_capital",
	// 仍然可以添加工具。当 ADK 注入 set_model_response 工具时
	// 该模型无法原生地将工具与输出模式结合。
})
```

{{% /tab %}}
{{< /tabs >}}

### 管理 Agent 上下文 {#manage-agent-context}

控制 Agent 是否接收先前的对话历史。

- **`include_contents`（可选，默认: `'default'`）:** 决定是否将 `contents`（历史）发送给 LLM。
    - `'default'`: Agent 接收相关的对话历史。
    - `'none'`: Agent 不接收任何先前的 `contents`。它仅根据当前指令和在*当前*轮提供的任何输入进行操作
      （适用于无状态任务或执行特定上下文）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
stateless_agent = LlmAgent(
    # ... 其他参数
    include_contents='none'
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import "google.golang.org/adk/v2/agent/llmagent"

	agent, err := llmagent.New(llmagent.Config{
		Name:            "stateless_agent",
		Model:           model,
		IncludeContents: llmagent.IncludeContentsNone,
	})
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**Go v2.0.0：Agent 执行模式**

ADK Go v2.0.0 在 `llmagent.Config` 上引入了一个显式的 `Mode` 字段，用于控制 Agent 在图形化或动态工作流中运行时的方式。提供三种模式：

- **`ModeChat`**（用于作为子 Agent 时的默认值）：Agent 与用户进行多轮对话，并可通过 `transfer_to_agent` 被同级 Agent 访问。
- **`ModeSingleTurn`**（用于作为工作流节点时的默认值）：Agent 在单轮中完成任务，不与用户进行聊天。
- **`ModeTask`**：一个与用户聊天以完成任务的任务 Agent——与 `ModeSingleTurn` 相比，它可以跨轮次与用户互动以完成工作。

当您用 `workflow.NewAgentNode` 封装一个 `llmagent` 时，如果未指定模式，工作流引擎会自动将模式设置为 `ModeSingleTurn`——相当于在工作流节点上使用 Python 的 `mode="single_turn"`。有关在图形化工作流中组合 Agent 的更多信息，请参见 [基于图形的 Agent 工作流](/docs/adk/build/graph-workflows/)。

作为 `ModeSingleTurn` 节点运行的 Agent（例如工作流节点）只看到当前轮次，就像 `IncludeContents` 是 `IncludeContentsNone` 一样。自 ADK Go v2.4.0 起，您可以通过将 `IncludeContents` 明确设置为 `llmagent.IncludeContentsDefault` 来保存对话历史。早期版本会忽略单轮节点的该设置。
{{% /alert %}}

### 配置计划器 {#configure-a-planner}

支持版本：Python v0.1.0。

**`planner`（可选）：** 分配一个 `BasePlanner` 实例，以在执行前启用多步推理和计划。主要有两个计划器：

- **`BuiltInPlanner`：** 利用模型内置的计划能力（例如 Gemini 的思考功能）。详情及示例见 [Gemini 思考](https://ai.google.dev/gemini-api/docs/thinking)。

    此处，`thinking_budget` 参数指导模型在生成响应时使用的思考 token 数量。`include_thoughts` 参数控制模型是否在响应中包含其原始思考和内部推理过程。

    ```python
    from google.adk import Agent
    from google.adk.planners import BuiltInPlanner
    from google.genai import types

    my_agent = Agent(
        name="my_agent",
        model="gemini-flash-latest",
        planner=BuiltInPlanner(
            thinking_config=types.ThinkingConfig(
                include_thoughts=True,
                thinking_budget=1024,
            )
        ),
        # ... 你的工具在这里
    )
    ```

- **`PlanReActPlanner`:** 这个规划器指示模型在输出中遵循特定结构：先创建一个计划，然后执行操作（例如调用工具），并为其步骤提供推理。*它对于没有内置“思考”功能的模型尤为有用*。

    ```python
    from google.adk import Agent
    from google.adk.planners import PlanReActPlanner

    my_agent = Agent(
        name="my_agent",
        model="gemini-flash-latest",
        planner=PlanReActPlanner(),
        # ... 你的工具在这里
    )
    ```

Agent 的回应将遵循结构化格式：

    ```
    [user]: ai news
    [google_search_agent]: /*PLANNING*/
    1. Perform a Google search for "latest AI news" to get current updates and headlines related to artificial intelligence.
    2. Synthesize the information from the search results to provide a summary of recent AI news.

    /*ACTION*/
    /*REASONING*/
    The search results provide a comprehensive overview of recent AI news, covering various aspects like company developments, research breakthroughs, and applications. I have enough information to answer the user's request.

    /*FINAL_ANSWER*/
    Here's a summary of recent AI news:
    ....
    ```

使用内置计划器的示例：

```python
from dotenv import load_dotenv

import asyncio
import os

from google.genai import types
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService # Optional
from google.adk.planners import BasePlanner, BuiltInPlanner, PlanReActPlanner
from google.adk.models import LlmRequest

from google.genai.types import ThinkingConfig
from google.genai.types import GenerateContentConfig

import datetime
from zoneinfo import ZoneInfo

APP_NAME = "weather_app"
USER_ID = "1234"
SESSION_ID = "session1234"

def get_weather(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Args:
        city (str): The name of the city for which to retrieve the weather report.

    Returns:
        dict: status and result or error msg.
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": (
                "The weather in New York is sunny with a temperature of 25 degrees"
                " Celsius (77 degrees Fahrenheit)."
            ),
        }
    else:
        return {
            "status": "error",
            "error_message": f"Weather information for '{city}' is not available.",
        }

def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city.

    Args:
        city (str): The name of the city for which to retrieve the current time.

    Returns:
        dict: status and result or error msg.
    """

    if city.lower() == "new york":
        tz_identifier = "America/New_York"
    else:
        return {
            "status": "error",
            "error_message": (
                f"Sorry, I don't have timezone information for {city}."
            ),
        }

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    report = (
        f'The current time in {city} is {now.strftime("%Y-%m-%d %H:%M:%S %Z%z")}'
    )
    return {"status": "success", "report": report}

# 第1步：创建 ThinkingConfig
thinking_config = ThinkingConfig(
    include_thoughts=True,   # Ask the model to include its thoughts in the response
    thinking_budget=256      # Limit the 'thinking' to 256 tokens (adjust as needed)
)
print("ThinkingConfig:", thinking_config)

# 第2步：实例化 BuiltInPlanner
planner = BuiltInPlanner(
    thinking_config=thinking_config
)
print("BuiltInPlanner created.")

# 第3步：将规划器封装到 LlmAgent 中
agent = LlmAgent(
    model="gemini-flash-latest",  # Set your model name
    name="weather_and_time_agent",
    instruction="You are an agent that returns time and weather",
    planner=planner,
    tools=[get_weather, get_current_time]
)

# 会话与 Runner
session_service = InMemorySessionService()
session = asyncio.run(
    session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
)
runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)

# Agent 交互
def call_agent(query):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    events = runner.run(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    for event in events:
        print(f"\nDEBUG EVENT: {event}\n")
        if event.is_final_response() and event.content and event.content.parts:
            final_answer = event.content.parts[0].text.strip()
            print("\n🟢 FINAL ANSWER\n", final_answer, "\n")

call_agent("If it's raining in New York right now, what is the current temperature?")
```

### 代码执行 {#code-execution}

支持版本：Python v0.1.0。

- **`code_executor`（可选）：** 提供一个 `BaseCodeExecutor` 实例，以允许
  Agent 执行在 LLM 响应中找到的代码块。更多信息，请参见 [使用 Gemini API 进行代码执行（官方英文）](https://adk.dev/integrations/code-execution/)。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
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

import asyncio
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.code_executors import BuiltInCodeExecutor
from google.genai import types

AGENT_NAME = "calculator_agent"
APP_NAME = "calculator"
USER_ID = "user1234"
SESSION_ID = "session_code_exec_async"
GEMINI_MODEL = "gemini-2.0-flash"

# Agent 定义
code_agent = LlmAgent(
    name=AGENT_NAME,
    model=GEMINI_MODEL,
    code_executor=BuiltInCodeExecutor(),
    instruction="""You are a calculator agent.
    When given a mathematical expression, write and execute Python code to calculate the result.
    Return only the final numerical result as plain text, without markdown or code blocks.
    """,
    description="Executes Python code to perform calculations.",
)

# 会话与 Runner
session_service = InMemorySessionService()
session = asyncio.run(session_service.create_session(
    app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID
))
runner = Runner(agent=code_agent, app_name=APP_NAME,
                session_service=session_service)

# Agent 交互（异步）
async def call_agent_async(query):
    content = types.Content(role="user", parts=[types.Part(text=query)])
    print(f"\n--- Running Query: {query} ---")
    final_response_text = "No final text response captured."
    try:
        # 使用 run_async
        async for event in runner.run_async(
            user_id=USER_ID, session_id=SESSION_ID, new_message=content
        ):
            print(f"Event ID: {event.id}, Author: {event.author}")

            # --- 首先检查特定部分 ---
            has_specific_part = False
            if event.content and event.content.parts:
                for part in event.content.parts:  # Iterate through all parts
                    if part.executable_code:
                        # 通过 .code 访问实际代码字符串
                        print(
                            f"  Debug: Agent generated code:\n```python\n{part.executable_code.code}\n```"
                        )
                        has_specific_part = True
                    elif part.code_execution_result:
                        # 正确访问结果和输出
                        print(
                            f"  Debug: Code Execution Result: {part.code_execution_result.outcome} - Output:\n{part.code_execution_result.output}"
                        )
                        has_specific_part = True
                    # 同时打印在任何事件中找到的任何文本部分以进行调试
                    elif part.text and not part.text.isspace():
                        print(f"  Text: '{part.text.strip()}'")
                        # 这里不要将 has_specific_part 设置为 True，因为我们希望使用下面的最终响应逻辑

            # --- 在特定部分之后检查最终响应 ---
            # 仅当没有我们刚处理的特定代码部分时才认为是最终响应
            if not has_specific_part and event.is_final_response():
                if (
                    event.content
                    and event.content.parts
                    and event.content.parts[0].text
                ):
                    final_response_text = event.content.parts[0].text.strip()
                    print(f"==> Final Agent Response: {final_response_text}")
                else:
                    print(
                        "==> Final Agent Response: [No text content in final event]")

    except Exception as e:
        print(f"ERROR during agent run: {e}")
    print("-" * 30)

# 运行示例的主异步函数
async def main():
    await call_agent_async("Calculate the value of (5 + 7) * 3")
    await call_agent_async("What is 10 factorial?")

# 执行主异步函数
try:
    asyncio.run(main())
except RuntimeError as e:
    # 在已经运行的循环中运行 asyncio.run 时处理特定错误（如 Jupyter/Colab）
    if "cannot be called from a running event loop" in str(e):
        print("\nRunning in an existing event loop (like Colab/Jupyter).")
        print("Please run `await main()` in a notebook cell instead.")
        # 如果在像笔记本这样的交互环境中，你可能需要运行：
        # await main()
    else:
        raise e  # Re-raise other runtime errors
```

{{% /tab %}}
{{< /tabs >}}

## 代码示例 {#code-example}

以下示例演示了本页讨论的核心概念。
更复杂的 Agent 可能会结合方案、上下文控制和规划。

<details>
<summary>代码</summary>

这是完整的基础 `capital_agent`：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
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

# --- 使用工具与输出模式的 LlmAgent 的完整示例代码 ---
import json # Needed for pretty printing dicts
import asyncio

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel, Field

# --- 1. 定义常量 ---
APP_NAME = "agent_comparison_app"
USER_ID = "test_user_456"
SESSION_ID_TOOL_AGENT = "session_tool_agent_xyz"
SESSION_ID_SCHEMA_AGENT = "session_schema_agent_xyz"
MODEL_NAME = "gemini-2.0-flash"

# --- 2. 定义模式 ---

# 两个 Agent 都使用的输入模式
class CountryInput(BaseModel):
    country: str = Field(description="The country to get information about.")

# 仅用于第二个 Agent 的输出模式
class CapitalInfoOutput(BaseModel):
    capital: str = Field(description="The capital city of the country.")
    # 注意：人口数量仅为示例；由于设置了 output_schema，LLM 将推断或估算该值
    # 因为在设置 output_schema 时不能使用工具。
    population_estimate: str = Field(description="An estimated population of the capital city.")

# --- 3. 定义工具（仅适用于第一个 Agent） ---
def get_capital_city(country: str) -> str:
    """Retrieves the capital city of a given country."""
    print(f"\n-- Tool Call: get_capital_city(country='{country}') --")
    country_capitals = {
        "united states": "Washington, D.C.",
        "canada": "Ottawa",
        "france": "Paris",
        "japan": "Tokyo",
    }
    result = country_capitals.get(country.lower(), f"Sorry, I couldn't find the capital for {country}.")
    print(f"-- Tool Result: '{result}' --")
    return result

# --- 4. 配置 Agent ---

# Agent 1：使用工具和 output_key
capital_agent_with_tool = LlmAgent(
    model=MODEL_NAME,
    name="capital_agent_tool",
    description="Retrieves the capital city using a specific tool.",
    instruction="""You are a helpful agent that provides the capital city of a country using a tool.
The user will provide the country name in a JSON format like {"country": "country_name"}.
1. Extract the country name.
2. Use the `get_capital_city` tool to find the capital.
3. Respond clearly to the user, stating the capital city found by the tool.
""",
    tools=[get_capital_city],
    input_schema=CountryInput,
    output_key="capital_tool_result", # Store final text response
)

# Agent 2：使用 output_schema（无法使用工具）
structured_info_agent_schema = LlmAgent(
    model=MODEL_NAME,
    name="structured_info_agent_schema",
    description="Provides capital and estimated population in a specific JSON format.",
    instruction=f"""You are an agent that provides country information.
The user will provide the country name in a JSON format like {{"country": "country_name"}}.
Respond ONLY with a JSON object matching this exact schema:
{json.dumps(CapitalInfoOutput.model_json_schema(), indent=2)}
Use your knowledge to determine the capital and estimate the population. Do not use any tools.
""",
    # *** 此处无 tools 参数 — 使用 output_schema 会阻止工具使用 ***
    input_schema=CountryInput,
    output_schema=CapitalInfoOutput, # Enforce JSON output structure
    output_key="structured_info_result", # Store final JSON response
)

# --- 5. 设置会话管理和 Runner ---
session_service = InMemorySessionService()

# 为每个 Agent 创建一个 Runner
capital_runner = Runner(
    agent=capital_agent_with_tool,
    app_name=APP_NAME,
    session_service=session_service
)
structured_runner = Runner(
    agent=structured_info_agent_schema,
    app_name=APP_NAME,
    session_service=session_service
)

# --- 6. 定义 Agent 交互逻辑 ---
async def call_agent_and_print(
    runner_instance: Runner,
    agent_instance: LlmAgent,
    session_id: str,
    query_json: str
):
    """Sends a query to the specified agent/runner and prints results."""
    print(f"\n>>> Calling Agent: '{agent_instance.name}' | Query: {query_json}")

    user_content = types.Content(role='user', parts=[types.Part(text=query_json)])

    final_response_content = "No final response received."
    async for event in runner_instance.run_async(user_id=USER_ID, session_id=session_id, new_message=user_content):
        # print(f"事件: {event.type}, 作者: {event.author}") # 取消注释以进行详细日志记录
        if event.is_final_response() and event.content and event.content.parts:
            # 对于 output_schema，内容就是 JSON 字符串本身
            final_response_content = event.content.parts[0].text

    print(f"<<< Agent '{agent_instance.name}' Response: {final_response_content}")

    current_session = await session_service.get_session(app_name=APP_NAME,
                                                  user_id=USER_ID,
                                                  session_id=session_id)
    stored_output = current_session.state.get(agent_instance.output_key)

    # 如果存储的输出看起来像 JSON，则进行美化打印（很可能来自 output_schema）
    print(f"--- Session State ['{agent_instance.output_key}']: ", end="")
    try:
        # 尝试解析并美化打印 JSON
        parsed_output = json.loads(stored_output)
        print(json.dumps(parsed_output, indent=2))
    except (json.JSONDecodeError, TypeError):
         # 否则，按字符串打印
        print(stored_output)
    print("-" * 30)

# --- 7. 运行交互 ---
async def main():
    # 为清晰起见创建单独的会话，尽管如果上下文管理得当并非绝对必要
    print("--- Creating Sessions ---")
    await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID_TOOL_AGENT)
    await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID_SCHEMA_AGENT)

    print("--- Testing Agent with Tool ---")
    await call_agent_and_print(capital_runner, capital_agent_with_tool, SESSION_ID_TOOL_AGENT, '{"country": "France"}')
    await call_agent_and_print(capital_runner, capital_agent_with_tool, SESSION_ID_TOOL_AGENT, '{"country": "Canada"}')

    print("\n\n--- Testing Agent with Output Schema (No Tool Use) ---")
    await call_agent_and_print(structured_runner, structured_info_agent_schema, SESSION_ID_SCHEMA_AGENT, '{"country": "France"}')
    await call_agent_and_print(structured_runner, structured_info_agent_schema, SESSION_ID_SCHEMA_AGENT, '{"country": "Japan"}')

# --- 运行 Agent ---
# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"

	"google.golang.org/genai"
)

// --- 主运行示例 ---

const (
	modelName = "gemini-flash-latest"
	appName   = "agent_comparison_app"
	userID    = "test_user_456"
)

type getCapitalCityArgs struct {
	Country string `json:"country" jsonschema:"The country to get the capital of."`
}

// getCapitalCity 获取给定国家的首都城市。
func getCapitalCity(ctx agent.Context, args getCapitalCityArgs) (map[string]any, error) {
	fmt.Printf("\n-- Tool Call: getCapitalCity(country='%s') --\n", args.Country)
	capitals := map[string]string{
		"united states": "Washington, D.C.",
		"canada":        "Ottawa",
		"france":        "Paris",
		"japan":         "Tokyo",
	}
	capital, ok := capitals[strings.ToLower(args.Country)]
	if !ok {
		result := fmt.Sprintf("Sorry, I couldn't find the capital for %s.", args.Country)
		fmt.Printf("-- Tool Result: '%s' --\n", result)
		return nil, errors.New(result)
	}
	fmt.Printf("-- Tool Result: '%s' --\n", capital)
	return map[string]any{"result": capital}, nil
}

// callAgent 是一个辅助函数，用于使用给定的提示执行 Agent 并处理其输出。
func callAgent(ctx context.Context, a agent.Agent, outputKey string, prompt string) {
	fmt.Printf("\n>>> Calling Agent: '%s' | Query: %s\n", a.Name(), prompt)
	// 创建一个内存中的会话服务以管理 Agent 状态。
	sessionService := session.InMemoryService()

	// 为 Agent 交互创建一个新会话。
	sessionCreateResponse, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: appName,
		UserID:  userID,
	})
	if err != nil {
		log.Fatalf("Failed to create the session service: %v", err)
	}

	session := sessionCreateResponse.Session

	// 用应用程序名称、Agent 和会话服务配置 Runner。
	config := runner.Config{
		AppName:        appName,
		Agent:          a,
		SessionService: sessionService,
	}

	// 创建一个新的 Runner 实例。
	r, err := runner.New(config)
	if err != nil {
		log.Fatalf("Failed to create the runner: %v", err)
	}

	// 准备要发送给 Agent 的用户消息。
	sessionID := session.ID()
	userMsg := &genai.Content{
		Parts: []*genai.Part{
			genai.NewPartFromText(prompt),
		},
		Role: string(genai.RoleUser),
	}

	// 运行 Agent 并处理流事件。
	for event, err := range r.Run(ctx, userID, sessionID, userMsg, agent.RunConfig{
		StreamingMode: agent.StreamingModeSSE,
	}) {
		if err != nil {
			fmt.Printf("\nAGENT_ERROR: %v\n", err)
		} else if event.Partial {
			// 在接收部分响应时打印出来。
			for _, p := range event.Content.Parts {
				fmt.Print(p.Text)
			}
		}
	}

	// 运行后，检查会话状态中是否存在预期的输出键。
	if outputKey != "" {
		storedOutput, error := session.State().Get(outputKey)
		if error == nil {
			// 如果存储的输出是 JSON 字符串，则美化打印输出。
			fmt.Printf("\n--- Session State ['%s']: ", outputKey)
			storedString, isString := storedOutput.(string)
			if isString {
				var prettyJSON map[string]interface{}
				if err := json.Unmarshal([]byte(storedString), &prettyJSON); err == nil {
					indentedJSON, err := json.MarshalIndent(prettyJSON, "", "  ")
					if err == nil {
						fmt.Println(string(indentedJSON))
					} else {
						fmt.Println(storedString)
					}
				} else {
					fmt.Println(storedString)
				}
			} else {
				fmt.Println(storedOutput)
			}
			fmt.Println(strings.Repeat("-", 30))
		}
	}
}

func main() {
	ctx := context.Background()

	model, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	capitalTool, err := functiontool.New(
		functiontool.Config{
			Name:        "get_capital_city",
			Description: "Retrieves the capital city for a given country.",
		},
		getCapitalCity,
	)
	if err != nil {
		log.Fatalf("Failed to create function tool: %v", err)
	}

	countryInputSchema := &genai.Schema{
		Type:        genai.TypeObject,
		Description: "Input for specifying a country.",
		Properties: map[string]*genai.Schema{
			"country": {
				Type:        genai.TypeString,
				Description: "The country to get information about.",
			},
		},
		Required: []string{"country"},
	}

	capitalAgentWithTool, err := llmagent.New(llmagent.Config{
		Name:        "capital_agent_tool",
		Model:       model,
		Description: "Retrieves the capital city using a specific tool.",
		Instruction: `You are a helpful agent that provides the capital city of a country using a tool.
The user will provide the country name in a JSON format like {"country": "country_name"}.
1. Extract the country name.
2. Use the 'get_capital_city' tool to find the capital.
3. Respond clearly to the user, stating the capital city found by the tool.`,
		Tools:       []tool.Tool{capitalTool},
		InputSchema: countryInputSchema,
		OutputKey:   "capital_tool_result",
	})
	if err != nil {
		log.Fatalf("Failed to create capital agent with tool: %v", err)
	}

	capitalInfoOutputSchema := &genai.Schema{
		Type:        genai.TypeObject,
		Description: "Schema for capital city information.",
		Properties: map[string]*genai.Schema{
			"capital": {
				Type:        genai.TypeString,
				Description: "The capital city of the country.",
			},
			"population_estimate": {
				Type:        genai.TypeString,
				Description: "An estimated population of the capital city.",
			},
		},
		Required: []string{"capital", "population_estimate"},
	}
	schemaJSON, _ := json.Marshal(capitalInfoOutputSchema)
	structuredInfoAgentSchema, err := llmagent.New(llmagent.Config{
		Name:        "structured_info_agent_schema",
		Model:       model,
		Description: "Provides capital and estimated population in a specific JSON format.",
		Instruction: fmt.Sprintf(`You are an agent that provides country information.
The user will provide the country name in a JSON format like {"country": "country_name"}.
Respond ONLY with a JSON object matching this exact schema:
%s
Use your knowledge to determine the capital and estimate the population. Do not use any tools.`, string(schemaJSON)),
		InputSchema:  countryInputSchema,
		OutputSchema: capitalInfoOutputSchema,
		OutputKey:    "structured_info_result",
	})
	if err != nil {
		log.Fatalf("Failed to create structured info agent: %v", err)
	}

	fmt.Println("--- Testing Agent with Tool ---")
	callAgent(ctx, capitalAgentWithTool, "capital_tool_result", `{"country": "France"}`)
	callAgent(ctx, capitalAgentWithTool, "capital_tool_result", `{"country": "Canada"}`)

	fmt.Println("\n\n--- Testing Agent with Output Schema (No Tool Use) ---")
	callAgent(ctx, structuredInfoAgentSchema, "structured_info_result", `{"country": "France"}`)
	callAgent(ctx, structuredInfoAgentSchema, "structured_info_result", `{"country": "Japan"}`)
}
```

{{% /tab %}}
{{< /tabs >}}
</details>

## 附加功能 {#additional-features}

ADK 为本指南未涵盖的 Agent 提供附加功能，包括以下内容：

- **回调:** 通过拦截 Agent 执行点来增加更多控制，包括在模型调用前后，以及在工具调用前后使用 [Callbacks](/docs/adk/components/app-management/callbacks/types-of-callbacks/)。
- **基于图的工作流:** 使用 [Graph-based agent workflows](/docs/adk/build/graph-workflows/) 将 LLM Agent 作为确定性图形管道中的步骤来组合。在 Go v2.0.0 中，使用 `workflow.NewAgentNode` 将任何 LLM Agent 包装为工作流节点。
- **多 Agent 系统:** 高级 Agent 交互策略，包括 Agent 转移 (`disallow_transfer_to_parent`, `disallow_transfer_to_peers`)，以及为应用中的每个 Agent 保持一致的身份和规则 (`GlobalInstructionPlugin`, 或在 Go 中的 `GlobalInstruction`)。见 [Multi-agent workflows](/docs/adk/build/multi-agent-workflows/) 和 [collaborative agent teams](/docs/adk/build/multi-agent-workflows/collaborative-workflows/)。

---

原文：[Simple agents with LlmAgent](https://adk.dev/agents/llm-agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/llm-agents.md)
