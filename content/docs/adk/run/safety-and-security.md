---
title: "安全与防护"
description: "随着AIAgent 能力的增强，确保它们安全、可靠地运行，并与您的品牌价值观保持一致，至关重要。失控的 Agent 可能带来风险，包括执行不一致或有害的操作，例如数据"
icon: "article"
weight: 50
toc: true
---

支持版本：Python, Go。

随着 AI Agent 能力的增长，确保它们安全、可靠地运作并且符合您的品牌价值至关重要。失控的 Agent 可能带来风险，包括执行不符合要求或有害的操作（如数据外泄）以及生成可能影响品牌声誉的不当内容。**风险来源包括指令不明确、模型幻觉、越狱和来自对抗性用户的提示注入，以及通过工具使用产生的间接提示注入。**

[Google Cloud Agent Platform](https://cloud.google.com/vertex-ai/generative-ai/docs/overview) 提供多层方法来降低这些风险，使您能够构建强大且值得信赖的 Agent。它提供多种机制以建立严格的边界，确保 Agent 只执行您明确允许的操作：

1. **身份与授权**：通过定义 Agent 和用户认证来控制 Agent 的“身份”。
2. **输入和输出的安全防护**：精确控制模型和工具调用。

    * *工具内防护*：以防御性设计工具，使用开发者设置的ToolContext来执行策略（例如，仅允许查询特定表）。
    * *内置 Gemini 安全功能*：如果使用 Gemini 模型，可利用内容过滤器阻止有害输出，并通过系统指令指导模型行为和安全指南。
    * *回调与插件*：在执行前后验证模型和工具调用，将参数与 Agent 状态或外部策略进行比对。
    * *使用 Gemini 作为安全防护*：通过回调配置廉价且快速的模型（如 Gemini Flash Lite）来筛查输入和输出，实现额外的安全层。

3. **沙箱代码执行**：通过沙箱环境防止模型生成代码导致安全问题。
4. **评估与追踪**：使用评估工具评估 Agent 最终输出的质量、相关性和正确性。使用追踪功能了解 Agent 行为，分析 Agent 为达成解决方案所采取的步骤，包括其工具选择、策略及方法效率。
5. **网络控制与 VPC-SC**：将 Agent 活动限制在安全边界内（如 VPC 服务控制），以防数据泄露并限制潜在影响范围。

## 安全与风险 {#safety-and-security-risks}

在实施安全措施之前，需要针对 Agent 的能力、领域和部署环境进行全面的风险评估。

***风险来源*** 包括：

* 模糊的 Agent 指令
* 来自对抗性用户的提示注入和越狱尝试
* 通过工具使用产生的间接提示注入

**风险类别** 包括：* **不对齐与目标腐化**
    * 追求非预期或 Agent 目标，导致有害结果（“奖励黑客”）
    * 误解复杂或模糊的指令
* **有害内容生成，包括品牌安全**
    * 生成有毒、仇恨、偏见、色情、歧视或非法内容
    * 品牌安全风险，例如使用违背品牌价值的语言或离题的对话
* **不安全行为**
    * 执行可能损坏系统的命令
    * 进行未经授权的购买或金融交易
    * 泄露敏感个人数据（PII）
    * 数据外流

## 最佳实践 {#best-practices}

### 身份与授权 {#identity-and-authorization}

*工具* 用于在外部系统上执行操作的身份，从安全角度来看是一个关键的设计考虑。相同 Agent 中的不同工具可以配置不同策略，因此在设置 Agent 的配置时需要小心。

#### Agent-Auth {#agent-auth}

**工具使用 Agent 自身身份与外部系统交互**（例如服务账户）。Agent 身份必须在外部系统访问策略中显式授权，例如将 Agent 的服务账户添加到数据库的 IAM 策略中以获得只读访问权限。这类策略限制 Agent 只执行开发者所期望的操作：通过给予资源只读权限，无论模型做出何种决定，工具都无法进行写操作。

这种方法实现简单，并且**适用于所有用户共享相同访问级别的 Agent**。如果并非所有用户都具有相同访问级别，仅采用此方法无法提供足够保护，必须配合以下其他技术。在工具实现中，应确保生成日志以保持操作的用户归属，因为所有 Agent 的操作都会显示为来自 Agent 本身。

#### User Auth {#user-auth}

工具使用**“控制用户”的身份与外部系统交互**（例如 web 应用中与前端交互的人类用户）。在 ADK 中，这通常使用 OAuth 实现：Agent 与前端交互以获取 OAuth 令牌，然后工具在执行外部操作时使用该令牌：如果控制用户被授权在外部系统上执行该操作，外部系统将授权该操作。用户认证的优点在于 Agent 只执行用户自己可以执行的操作。这大大降低了恶意用户可能滥用 Agent 获取额外数据的风险。然而，大多数常见的委托实现具有固定的可委托权限集（即 OAuth 范围）。通常，这些权限范围比 Agent 实际需要的访问权限更广，因此需要下面的技术来进一步限制 Agent 的操作。

### 用于筛选输入和输出的防护措施 {#guardrails-to-screen-inputs-and-outputs}

#### 工具内防护措施 {#in-tool-guardrails}

工具可以在设计时考虑安全性：我们可以创建只暴露我们希望模型执行的操作的工具，而不暴露其他操作。通过限制我们提供给 Agent 的操作范围，我们可以确定性地消除那些我们绝不希望 Agent 执行的恶意操作类别。

工具内防护措施是一种方法，用于创建通用且可重复使用的工具，这些工具暴露了可以由开发者使用的确定性控制，以限制每个工具实例化的操作。

这种方法依赖于工具接收两种类型的输入：由模型设置的参数，以及可由 Agent 开发者确定性设置的 [**`Tool Context`**](/docs/adk/components/custom-tools/#tool-context)。我们可以依赖这些确定性设置信息来验证模型的行为是否符合预期。*(注意：在 TypeScript 中，`Tool Context` 对应于统一的 `Context` 类型。)*

例如，一个查询工具可以设计为从ToolContext中读取策略。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# 概念示例：为ToolContext设置策略数据
# 在实际的 ADK 应用中，这可能设置在 InvocationContext.session.state 中
# 或者在工具初始化时传入，然后通过 ToolContext 获取。

policy = {} # Assuming policy is a dictionary
policy['select_only'] = True
policy['tables'] = ['mytable1', 'mytable2']

# 概念：将策略存储在工具稍后可以通过 ToolContext 访问的位置。
# 这行具体代码在实际情况中可能会有所不同。
# 例如，存储在会话状态中：
invocation_context.session.state["query_tool_policy"] = policy

# 或者在工具初始化时传入：
query_tool = QueryTool(policy=policy)
# 在此示例中，我们假设它被存储在某个可访问的位置。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// 概念示例：为ToolContext设置策略数据
// 在一个真实的 ADK 应用中，这可能使用会话状态服务来设置。
// `ctx` 是回调或自定义 Agent 中可用的 `agent.Context`。

policy := map[string]any{
	"select_only": true,
	"tables":      []string{"mytable1", "mytable2"},
}

// 概念：将策略存储在工具稍后可以通过 ToolContext 访问的位置。
// 这行具体代码在实际情况中可能会有所不同。
// 例如，存储在会话状态中：
if err := ctx.Session().State().Set("query_tool_policy", policy); err != nil {
    // 处理错误，例如，记录它。
}

// 或者在工具初始化时传入：
// queryTool := NewQueryTool(policy)
// 在此示例中，我们假设它被存储在某个可访问的位置。
```

{{% /tab %}}
{{< /tabs >}}
在工具执行期间，[**`Tool Context`**](/docs/adk/components/custom-tools/#tool-context) 将被传递给工具 *(注意：在 TypeScript 中，这作为统一的 `Context` 类型传递)*：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
def query(query: str, tool_context: ToolContext) -> str | dict:
  # 假设“policy”是从上下文中获取的，例如，通过会话状态：
  # policy = tool_context.invocation_context.session.state.get('query_tool_policy', {})

  # --- 占位策略执行 ---
  policy = tool_context.invocation_context.session.state.get('query_tool_policy', {}) # Example retrieval
  actual_tables = explainQuery(query) # Hypothetical function call

  if not set(actual_tables).issubset(set(policy.get('tables', []))):
    # 为模型返回一个错误信息
    allowed = ", ".join(policy.get('tables', ['(None defined)']))
    return f"Error: Query targets unauthorized tables. Allowed: {allowed}"

  if policy.get('select_only', False):
       if not query.strip().upper().startswith("SELECT"):
           return "Error: Policy restricts queries to SELECT statements only."
  # --- 策略执行结束 ---

  print(f"Executing validated query (hypothetical): {query}")
  return {"status": "success", "results": [...]} # Example successful return
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"fmt"
	"strings"

	"google.golang.org/adk/v2/agent"
)

func query(ctx agent.Context, args QueryArgs) (map[string]any, error) {
	// 假设“policy”是从上下文中获取的，例如，通过会话状态：
	policyAny, err := ctx.Session().State().Get("query_tool_policy")
	if err != nil {
		return nil, fmt.Errorf("could not retrieve policy: %w", err)
	}
	policy, _ := policyAny.(map[string]any)
	actualTables := explainQuery(args.Query) // Hypothetical function call

	// --- 占位策略执行 ---
	if tables, ok := policy["tables"].([]string); ok {
		if !isSubset(actualTables, tables) {
			// 返回错误以表示失败
			allowed := strings.Join(tables, ", ")
			if allowed == "" {
				allowed = "(None defined)"
			}
			return nil, fmt.Errorf("query targets unauthorized tables. Allowed: %s", allowed)
		}
	}

	if selectOnly, _ := policy["select_only"].(bool); selectOnly {
		if !strings.HasPrefix(strings.ToUpper(strings.TrimSpace(args.Query)), "SELECT") {
			return nil, fmt.Errorf("policy restricts queries to SELECT statements only")
		}
	}
	// --- 策略执行结束 ---

	fmt.Printf("Executing validated query (hypothetical): %s\n", args.Query)
	return map[string]any{"status": "success", "results": []string{"..."}}, nil
}

// 辅助函数，用于检查 a 是否是 b 的子集
func isSubset(a, b []string) bool {
	set := make(map[string]bool)
	for _, item := range b {
		set[item] = true
	}
	for _, item := range a {
		if _, found := set[item]; !found {
			return false
		}
	}
	return true
}
```

{{% /tab %}}
{{< /tabs >}}

#### 内置的双子座安全功能 {#built-in-gemini-safety-features}

双子座模型配备了内置的安全机制，可用于提升内容和品牌的安全性。

* **内容安全过滤器**： [内容过滤器](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes)可以帮助阻止有害内容的输出。它们作为对试图突破模型的威胁行为者的多层防御的一部分，独立于双子座模型运行。在 Agent 平台上的双子座模型使用两种类型的内容过滤器：
    * **不可配置的安全过滤器** 会自动阻止包含禁止内容的输出，例如儿童性虐待材料 (CSAM) 和个人身份信息 (PII)。
    * **可配置内容过滤器** 允许你根据概率和严重性分数，在四类危害类别（仇恨言论、骚扰、性露骨内容和危险内容）中定义阻止阈值。这些过滤器默认关闭，但你可以根据需要进行配置。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.genai import types

agent = Agent(
    name="safety_agent",
    # ...
    generate_content_config=types.GenerateContentConfig(
        safety_settings=[
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.OFF,
            ),
        ],
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/genai"
)

agent, _ := llmagent.New(llmagent.Config{
	// ...
	GenerateContentConfig: &genai.GenerateContentConfig{
		SafetySettings: []*genai.SafetySetting{
			{
				Category:  genai.HarmCategoryHateSpeech,
				Threshold: genai.HarmBlockThresholdBlockLowAndAbove,
			},
		},
	},
})
```

{{% /tab %}}
{{< /tabs >}}
* **系统安全指令**：[System instructions](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/safety-system-instructions) 用于 Agent 平台上的Gemini模型，为模型提供关于如何行为以及生成何种类型内容的直接指导。通过提供具体指令，您可以主动引导模型避免生成不受欢迎的内容，以满足组织的独特需求。您可以制定系统指令来定义内容安全指南，例如禁止和敏感主题，以及免责声明语言，还可以制定品牌安全指南，以确保模型的输出符合您品牌的语音、语调、价值观和目标受众。

虽然这些措施在内容安全方面非常有效，但您还需要额外的检查以减少 Agent 的不一致行为、不安全操作和品牌安全风险。

#### 安全防护回调和插件 {#callbacks-and-plugins-for-security-guardrails}

回调为每个 Agent 提供了一种简单的工具，可以在工具和模型输入输出(IO)前进行验证，而插件则提供了在多个 Agent 中实现通用安全策略的可重用解决方案。

当无法修改工具以添加防护措施时，[**`Before Tool Callback`**](/docs/adk/components/app-management/callbacks/types-of-callbacks/#before-tool-callback) 功能可用于在调用前进行验证。该回调可以访问 Agent 的状态、请求的工具及参数。这种方法非常通用，甚至可以创建一个可重用工具策略的通用库。然而，如果在参数中无法直接看到执行防护措施所需的信息，则可能不适用于所有工具。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# 假设的回调函数
def validate_tool_params(
    tool: BaseTool,
    args: Dict[str, Any],
    tool_context: ToolContext
    ) -> Optional[Dict]: # Correct return type for before_tool_callback

  print(f"Callback triggered for tool: {tool.name}, args: {args}")

  # 示例验证：检查状态中所需的用户 ID 是否与参数匹配
  expected_user_id = tool_context.state.get("session_user_id")
  actual_user_id_in_args = args.get("user_id_param") # Assuming tool takes 'user_id_param'

  if actual_user_id_in_args != expected_user_id:
      print("Validation Failed: User ID mismatch!")
      # 返回字典以防止工具执行并提供反馈
      return {"error": f"Tool call blocked: User ID mismatch."}

  # 如果验证通过，返回 None 以允许工具调用继续
  print("Callback validation passed.")
  return None

# 假设的 Agent 设置
root_agent = LlmAgent( # Use specific agent type
    model='gemini-flash-latest',
    name='root_agent',
    instruction="...",
    before_tool_callback=validate_tool_params, # Assign the callback
    tools = [
      # ... 工具函数或工具实例的列表 ...
      # 例如，query_tool_instance
    ]
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"fmt"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/tool"
)

// 假设的回调函数
func validateToolParams(
	ctx agent.Context,
	t tool.Tool,
	args map[string]any,
) (map[string]any, error) {
	fmt.Printf("Callback triggered for tool: %s, args: %v\n", t.Name(), args)

	// 示例验证：检查状态中所需的用户 ID 是否与参数匹配
	expectedUserIDVal, err := ctx.Session().State().Get("session_user_id")
	if err != nil {
		// 返回一个地图以防止工具执行，并向模型反馈。
		return map[string]any{"error": "Tool call blocked: User ID not found."}, nil
	}
	expectedUserID, _ := expectedUserIDVal.(string)

	actualUserID, ok := args["user_id_param"].(string)
	if !ok || actualUserID != expectedUserID {
		fmt.Println("Validation Failed: User ID mismatch!")
		return map[string]any{"error": "Tool call blocked: User ID mismatch."}, nil
	}

	// 返回 nil， nil 以便在验证通过后允许工具调用继续
	fmt.Println("Callback validation passed.")
	return nil, nil
}

// 假设的 Agent 设置
// agent， _ ：= llmagent.New（llmagent.Config{
// 	型号：“gemini-flash-latest”，
// 	名称：“root_agent”，
// 	指令：“......”，
// 	BeforeToolCallbacks： []llmagent.beforeToolCallback{validateToolParams}，
// 	工具：[]tool。工具{queryToolInstance}，
```

{{% /tab %}}
{{< /tabs >}}
然而，在为您的 Agent 应用程序添加安全防护时，插件是实现非特定于单个 Agent 的策略的推荐方法。插件设计为自包含和模块化，允许您为特定安全策略创建单独的插件，并在 Runner 级别全局应用。这意味着安全插件可以配置一次并应用于使用该 Runner 的每个 Agent，确保整个应用的一致安全防护，而无需重复代码。

一些示例包括：

* **作为评判插件的 Gemini**：该插件使用 Gemini Flash Lite 评估用户输入、工具输入和输出以及 Agent 的响应是否合适，以及检测提示注入和越狱。插件将 Gemini 配置为安全过滤器，以缓解内容安全、品牌安全和 Agent 错位问题。插件配置为将用户输入、工具输入和输出以及模型输出传递给 Gemini Flash Lite，由其决定 Agent 的输入是否安全。如果 Gemini 判断输入不安全，Agent 将返回预设响应：“抱歉，我无法提供帮助。请问我可以帮您做其他事情吗？”

* **[Model Armor Plugin（官方英文）](https://adk.dev/integrations/model-armor/)**：随 ADK 提供的插件，通过查询 Model Armor API，在指定的 Agent 执行点检查潜在的内容安全违规。与 _作为评判的 Gemini_ 插件类似，如果 Model Armor 发现有害内容匹配，将向用户返回预设响应。

* **PII 涂黑插件**：专门为 [Before Tool Callback](/docs/adk/components/app-management/plugins/#tool-callbacks) 设计的插件，专门用于在被工具处理或发送到外部服务之前去除个人身份信息。

### 沙箱代码执行 {#sandboxed-code-execution}

代码执行是一种特殊工具，具有额外的安全意义：必须使用沙箱以防止模型生成的代码破坏本地环境，从而可能产生安全问题。

Google 和 ADK 提供了多种安全代码执行选项。[Vertex Gemini Enterprise API 代码执行功能](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/code-execution-api) 使 Agent 能够通过启用 tool_execution 工具在服务器端利用沙箱代码执行。对于执行数据分析的代码，您可以使用 ADK 中的 [Code Executor（官方英文）](https://adk.dev/integrations/code-execution/) 工具调用 [Vertex Code Interpreter Extension](https://cloud.google.com/vertex-ai/generative-ai/docs/extensions/code-interpreter)。如果这些选项都无法满足您的需求，您可以使用 ADK 提供的构建模块来自行构建代码执行器。我们建议创建封闭的执行环境：不允许网络连接和 API 调用，以避免无法控制的数据外泄；并在整个执行过程中完全清理数据，以避免跨用户的数据外泄问题。

### 评估 {#evaluations}

请参阅 [Evaluate Agents](/docs/adk/run/evaluation/)。

### VPC-SC 周界和网络控制 {#vpc-sc-perimeters-and-network-controls}

如果您将 Agent 执行在 VPC-SC 周界内，这将保证所有 API 调用仅操作周界内的资源，从而降低数据外泄的可能性。

然而，身份和周界只提供对 Agent 操作的大致控制。工具使用护栏可以减轻这些限制，并为 Agent 开发者提供更精确控制允许哪些操作的能力。

### 其他安全风险 {#other-security-risks}

#### 在用户界面中始终转义模型生成的内容 {#always-escape-model-generated-content-in-uis}

在浏览器中显示 Agent 输出时必须小心：如果 HTML 或 JS 内容未在用户界面中正确转义，模型返回的文本可能会被执行，导致数据外泄。例如，间接提示注入可能诱使模型包含一个 img 标签，从而欺骗浏览器将会话内容发送到第三方网站；或构造 URL，如果点击，可能将数据发送到外部站点。正确转义此类内容必须确保模型生成的文本不会被浏览器解释为代码。

---

原文：[Safety and Security for AI Agents](https://adk.dev/safety/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/safety/index.md)
