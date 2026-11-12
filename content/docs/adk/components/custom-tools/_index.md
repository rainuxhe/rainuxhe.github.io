---
title: "自定义工具"
description: "在 ADK Agent 工作流中，工具是具有结构化输入和输出的编程功能，可以由 ADK Agent 调用以执行操作。ADK 工具的功能与使用 Gemini 的函数调用类似"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

在 ADK Agent 工作流中，工具是具有结构化输入和输出的编程函数，ADK Agent 可以调用这些工具来执行操作。ADK 工具的功能类似于使用 [Function Call](https://ai.google.dev/gemini-api/docs/function-calling) 与 Gemini 或其他生成式 AI 模型。当你使用 ADK 工具时，可以执行各种操作和编程功能，例如：

* 查询数据库
* 发起 API 请求：获取天气数据、预订系统
* 搜索网络
* 执行代码片段
* 从文档中检索信息（RAG）
* 与其他软件或服务交互

{{% alert context="success" %}}
**[ADK 工具与集成（官方英文）](https://adk.dev/integrations/)**

在为 ADK 构建自己的工具之前，先查看 **[ADK 工具与集成（官方英文）](https://adk.dev/integrations/)**，了解可与 ADK Agent 一起使用的预构建工具和集成。
{{% /alert %}}

## 什么是工具？ {#what-is-a-tool}

在 ADK 的上下文中，工具代表提供给 AI Agent 的特定功能，使其能够执行操作并与其核心文本生成和推理能力之外的世界进行交互。能够 Agent 与基础语言模型的区别通常在于其有效使用工具的能力。

从技术上讲，工具通常是一个模块化的代码组件——**如 Python、Java 或 TypeScript 函数**、类方法，甚至是另一个专门的 Agent——用于执行特定的、预定义的任务。这些任务通常涉及与外部系统或数据的交互。

![Agent tool call](/images/adk/agent-tool-call.png)

### 主要特征 {#key-characteristics}

**面向行动：** 工具为 Agent 执行特定操作，例如搜索信息、调用 API 或执行计算。

**扩展 Agent 能力：** 它们使 Agent 能够访问实时信息，影响外部系统，并克服训练数据固有的知识局限。

**执行预定义逻辑：** 关键是，工具执行特定的、由开发者定义的逻辑。它们自身没有像 Agent 核心大语言模型（LLM）那样的独立推理能力。LLM 会推理使用哪个工具、何时使用以及使用什么输入，而工具本身仅执行其指定功能。

## Agent 如何使用工具 {#how-agents-use-tools}

Agent 通过通常涉及函数调用的机制动态利用工具。该过程大致遵循以下步骤：1. **推理：** Agent 的 LLM 会分析其系统指令、对话历史以及用户请求。
2. **选择：** 基于分析结果，LLM 会决定执行哪个工具（如果需要的话），依据 Agent 可用的工具以及描述每个工具的文档字符串。
3. **调用：** LLM 生成所选工具所需的参数（输入），并触发其执行。
4. **观察：** Agent 接收工具返回的输出（结果）。
5. **最终化：** Agent 将工具的输出纳入其持续的推理过程中，以制定下一步的响应、决定后续步骤或确定目标是否已达成。

可以将工具视为一个专门的工具箱，Agent 的智能核心（LLM）可以根据需要访问并使用这些工具来完成复杂任务。

## ADK 中的工具类型 {#tool-types-in-adk}

ADK 提供了通过支持几种类型的工具而具有灵活性的功能：

1. **[函数工具](/docs/adk/components/custom-tools/function-tools/overview/)：]** 由你创建的工具，针对你特定应用的需求定制。
    * **[函数/方法](/docs/adk/components/custom-tools/function-tools/overview/#function-tool)：]** 在你的代码中定义标准的同步函数或方法（例如 Python def）。
    * **[Agent 即工具](/docs/adk/components/custom-tools/function-tools/overview/#agent-tool)：]** 将另一个可能是专门化的 Agent 用作父 Agent 的工具。
    * **[长运行函数工具](/docs/adk/components/custom-tools/function-tools/overview/#long-run-tool)：]** 支持执行异步操作或需要较长时间完成的工具。
2. **[内置工具（官方英文）](https://adk.dev/integrations/)：]** 框架提供的用于常见任务的现成工具。
        示例：Google 搜索、代码执行、增强检索生成（RAG）。
3. **第三方工具：** 无缝集成来自流行外部库的工具。

访问上述各文档页面，可获得有关每种工具类型的详细信息和示例。

## 在 Agent 指令中引用工具 {#referencing-tool-in-agents-instructions}

在 Agent 的指令中，你可以直接使用工具的 **函数名称** 来引用该工具。如果工具的 **函数名称** 和 **文档字符串** 足够具有描述性，你的指令可以主要关注 **大型语言模型 (LLM) 何时应使用该工具**。这有助于清晰表达，并帮助模型理解每个工具的预期用途。

**明确指示 Agent 如何处理工具可能产生的不同返回值至关重要。** 例如，如果工具返回错误信息，你的指令应明确说明 Agent 是应该重试操作、放弃任务还是从用户处请求额外信息。此外，ADK 支持工具的顺序使用，其中一个工具的输出可以作为另一个工具的输入。在实现此类工作流时，**在 Agent 的指令中描述预期的工具使用顺序**非常重要，以引导模型完成必要的步骤。

### 示例 {#example}

以下示例展示了 Agent 如何通过**在指令中引用工具的功能名称**来使用工具。它还演示了如何引导 Agent**处理工具的不同返回值**，例如成功或错误信息，以及如何协调**多个工具的顺序使用**来完成任务。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
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
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

APP_NAME="weather_sentiment_agent"
USER_ID="user1234"
SESSION_ID="1234"
MODEL_ID="gemini-2.0-flash"

# 工具 1
def get_weather_report(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Returns:
        dict: A dictionary containing the weather information with a 'status' key ('success' or 'error') and a 'report' key with the weather details if successful, or an 'error_message' if an error occurred.
    """
    if city.lower() == "london":
        return {"status": "success", "report": "The current weather in London is cloudy with a temperature of 18 degrees Celsius and a chance of rain."}
    elif city.lower() == "paris":
        return {"status": "success", "report": "The weather in Paris is sunny with a temperature of 25 degrees Celsius."}
    else:
        return {"status": "error", "error_message": f"Weather information for '{city}' is not available."}

weather_tool = FunctionTool(func=get_weather_report)

# 工具 2
def analyze_sentiment(text: str) -> dict:
    """Analyzes the sentiment of the given text.

    Returns:
        dict: A dictionary with 'sentiment' ('positive', 'negative', or 'neutral') and a 'confidence' score.
    """
    if "good" in text.lower() or "sunny" in text.lower():
        return {"sentiment": "positive", "confidence": 0.8}
    elif "rain" in text.lower() or "bad" in text.lower():
        return {"sentiment": "negative", "confidence": 0.7}
    else:
        return {"sentiment": "neutral", "confidence": 0.6}

sentiment_tool = FunctionTool(func=analyze_sentiment)

# Agent
weather_sentiment_agent = Agent(
    model=MODEL_ID,
    name='weather_sentiment_agent',
    instruction="""You are a helpful assistant that provides weather information and analyzes the sentiment of user feedback.
**If the user asks about the weather in a specific city, use the 'get_weather_report' tool to retrieve the weather details.**
**If the 'get_weather_report' tool returns a 'success' status, provide the weather report to the user.**
**If the 'get_weather_report' tool returns an 'error' status, inform the user that the weather information for the specified city is not available and ask if they have another city in mind.**
**After providing a weather report, if the user gives feedback on the weather (e.g., 'That's good' or 'I don't like rain'), use the 'analyze_sentiment' tool to understand their sentiment.** Then, briefly acknowledge their sentiment.
You can handle these tasks sequentially if needed.""",
    tools=[weather_tool, sentiment_tool]
)

async def main():
    """Main function to run the agent asynchronously."""
    # 会话和 Runner 设置
    session_service = InMemorySessionService()
    # 使用 'await' 正确创建会话
    await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)

    runner = Runner(agent=weather_sentiment_agent, app_name=APP_NAME, session_service=session_service)

    # Agent 交互
    query = "weather in london?"
    print(f"User Query: {query}")
    content = types.Content(role='user', parts=[types.Part(text=query)])

    # Runner 的 run 方法在内部处理异步循环
    events = runner.run(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    for event in events:
        if event.is_final_response():
            final_response = event.content.parts[0].text
            print("Agent Response:", final_response)

# 运行主异步函数的标准方式
if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// 除非遵守许可协议，否则您不得使用此文件。
// 您可以在以下位置获取许可副本
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// 除非适用法律要求或书面约定，否则根据许可协议分发的软件
// 按“原样”提供
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 请参阅许可协议以了解管理权限和
// limitations under the License.

package main

import (
	"context"
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

type getWeatherReportArgs struct {
	City string `json:"city" jsonschema:"The city for which to get the weather report."`
}

type getWeatherReportResult struct {
	Status string `json:"status"`
	Report string `json:"report,omitempty"`
}

func getWeatherReport(ctx agent.Context, args getWeatherReportArgs) (getWeatherReportResult, error) {
	if strings.ToLower(args.City) == "london" {
		return getWeatherReportResult{Status: "success", Report: "The current weather in London is cloudy with a temperature of 18 degrees Celsius and a chance of rain."}, nil
	}
	if strings.ToLower(args.City) == "paris" {
		return getWeatherReportResult{Status: "success", Report: "The weather in Paris is sunny with a temperature of 25 degrees Celsius."}, nil
	}
	return getWeatherReportResult{}, fmt.Errorf("weather information for '%s' is not available.", args.City)
}

type analyzeSentimentArgs struct {
	Text string `json:"text" jsonschema:"The text to analyze for sentiment."`
}

type analyzeSentimentResult struct {
	Sentiment  string  `json:"sentiment"`
	Confidence float64 `json:"confidence"`
}

func analyzeSentiment(ctx agent.Context, args analyzeSentimentArgs) (analyzeSentimentResult, error) {
	if strings.Contains(strings.ToLower(args.Text), "good") || strings.Contains(strings.ToLower(args.Text), "sunny") {
		return analyzeSentimentResult{Sentiment: "positive", Confidence: 0.8}, nil
	}
	if strings.Contains(strings.ToLower(args.Text), "rain") || strings.Contains(strings.ToLower(args.Text), "bad") {
		return analyzeSentimentResult{Sentiment: "negative", Confidence: 0.7}, nil
	}
	return analyzeSentimentResult{Sentiment: "neutral", Confidence: 0.6}, nil
}

func main() {
	ctx := context.Background()
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		log.Fatal(err)
	}

	weatherTool, err := functiontool.New(
		functiontool.Config{
			Name:        "get_weather_report",
			Description: "Retrieves the current weather report for a specified city.",
		},
		getWeatherReport,
	)
	if err != nil {
		log.Fatal(err)
	}

	sentimentTool, err := functiontool.New(
		functiontool.Config{
			Name:        "analyze_sentiment",
			Description: "Analyzes the sentiment of the given text.",
		},
		analyzeSentiment,
	)
	if err != nil {
		log.Fatal(err)
	}

	weatherSentimentAgent, err := llmagent.New(llmagent.Config{
		Name:        "weather_sentiment_agent",
		Model:       model,
		Instruction: "You are a helpful assistant that provides weather information and analyzes the sentiment of user feedback. **If the user asks about the weather in a specific city, use the 'get_weather_report' tool to retrieve the weather details.** **If the 'get_weather_report' tool returns a 'success' status, provide the weather report to the user.** **If the 'get_weather_report' tool returns an 'error' status, inform the user that the weather information for the specified city is not available and ask if they have another city in mind.** **After providing a weather report, if the user gives feedback on the weather (e.g., 'That's good' or 'I don't like rain'), use the 'analyze_sentiment' tool to understand their sentiment.** Then, briefly acknowledge their sentiment. You can handle these tasks sequentially if needed.",
		Tools:       []tool.Tool{weatherTool, sentimentTool},
	})
	if err != nil {
		log.Fatal(err)
	}

	sessionService := session.InMemoryService()
	runner, err := runner.New(runner.Config{
		AppName:        "weather_sentiment_agent",
		Agent:          weatherSentimentAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatal(err)
	}

	session, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: "weather_sentiment_agent",
		UserID:  "user1234",
	})
	if err != nil {
		log.Fatal(err)
	}

	run(ctx, runner, session.Session.ID(), "weather in london?")
	run(ctx, runner, session.Session.ID(), "I don't like rain.")
}

func run(ctx context.Context, r *runner.Runner, sessionID string, prompt string) {
	fmt.Printf("\n> %s\n", prompt)
	events := r.Run(
		ctx,
		"user1234",
		sessionID,
		genai.NewContentFromText(prompt, genai.RoleUser),
		agent.RunConfig{
			StreamingMode: agent.StreamingModeNone,
		},
	)
	for event, err := range events {
		if err != nil {
			log.Fatalf("ERROR during agent execution: %v", err)
		}

		if event.Content.Parts[0].Text != "" {
			fmt.Printf("Agent Response: %s\n", event.Content.Parts[0].Text)
		}
	}
}
```

{{% /tab %}}
{{< /tabs >}}

## ToolContext {#tool-context}

对于更高级的场景，ADK 允许您通过在工具函数中包含特殊参数 `tool_context: ToolContext` 来访问额外的上下文信息。通过在函数签名中包含它，当 Agent 执行过程中调用您的工具时，ADK 将**自动**提供一个**ToolContext 类的实例**。

**ToolContext** 提供对多个关键信息和控制手段的访问：

* `state: State`：读取和修改当前会话的状态。这里所做的更改会被跟踪和保存。

* `actions: EventActions`：影响工具运行后 Agent 的后续操作（例如，跳过摘要，转交给其他 Agent）。

* `function_call_id: str | None`：框架为此特定工具调用分配的唯一标识符。用于跟踪和与身份验证响应进行关联。当在单个模型响应中调用多个工具时，这也很有用。

* `invocation_id: str`：当前调用的唯一标识符。

* `agent_name: str`：正在运行的 Agent 名称。

* `get_auth_response(auth_config)`：如果在此工具调用之前完成了身份验证流程，则返回身份验证凭据。

* 访问服务：与已配置服务（如 Artifacts 和 Memory）交互的方法。

请注意，您不应在工具函数文档字符串中包含 `tool_context` 参数。由于 `ToolContext` 是在 LLM 决定调用工具函数之后由 ADK 框架**自动注入**的，它与 LLM 的决策无关，包含它可能会让 LLM 感到困惑。

### **状态管理** {#state-management}

`tool_context.state` 属性提供对与当前会话关联的状态的直接读写访问。它的行为类似于字典，但确保任何修改都会被作为增量跟踪并由会话服务持久保存。这使工具能够在不同的交互和 Agent 步骤之间维护和共享信息。

* **读取状态**：使用标准字典访问（`tool_context.state['my_key']`）或 `.get()` 方法（`tool_context.state.get('my_key', default_value)`）。

* **写入状态**：直接赋值（`tool_context.state['new_key'] = 'new_value'`）。这些更改会记录在最终事件的 state_delta 中。

* **状态前缀**：记住标准状态前缀：

    * `app:*`：在应用的所有用户之间共享。

    * `user:*`：在当前用户的所有会话中专用。

    * （无前缀）：当前会话专用。

    * `temp:*`：临时的，不会在调用之间保存（用于在单次运行调用中传递数据，但在ToolContext中通常不太有用，因为ToolContext在 LLM 调用之间操作）。{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
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

from google.adk.tools import ToolContext, FunctionTool

def update_user_preference(preference: str, value: str, tool_context: ToolContext):
    """Updates a user-specific preference."""
    user_prefs_key = "user:preferences"
    # 获取当前偏好或在不存在时进行初始化
    preferences = tool_context.state.get(user_prefs_key, {})
    preferences[preference] = value
    # 将更新后的字典写回状态
    tool_context.state[user_prefs_key] = preferences
    print(f"Tool: Updated user preference '{preference}' to '{value}'")
    return {"status": "success", "updated_preference": preference}

pref_tool = FunctionTool(func=update_user_preference)

# 在一个 Agent 中：
# my_agent = Agent(..., tools=[pref_tool])

# 当 LLM 调用 update_user_preference(preference='theme', value='dark', ...) 时：
# tool_context.state 将会被更新，并且该更改将成为
# 生成的工具响应事件的 actions.state_delta 的一部分。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"fmt"

	"google.golang.org/adk/v2/agent"
)

type updateUserPreferenceArgs struct {
	Preference string `json:"preference" jsonschema:"The name of the preference to set."`
	Value      string `json:"value" jsonschema:"The value to set for the preference."`
}

type updateUserPreferenceResult struct {
	UpdatedPreference string `json:"updated_preference"`
}

func updateUserPreference(ctx agent.Context, args updateUserPreferenceArgs) (*updateUserPreferenceResult, error) {
	userPrefsKey := "user:preferences"
	val, err := ctx.State().Get(userPrefsKey)
	if err != nil {
		val = make(map[string]any)
	}

	preferencesMap, ok := val.(map[string]any)
	if !ok {
		preferencesMap = make(map[string]any)
	}

	preferencesMap[args.Preference] = args.Value

	if err := ctx.State().Set(userPrefsKey, preferencesMap); err != nil {
		return nil, err
	}

	fmt.Printf("Tool: Updated user preference '%s' to '%s'\n", args.Preference, args.Value)
	return &updateUserPreferenceResult{
		UpdatedPreference: args.Preference,
	}, nil
}
```

{{% /tab %}}
{{< /tabs >}}

### **控制 Agent 流** {#controlling-agent-flow}

Python 和 TypeScript 中的 `tool_context.actions` 属性、Java 中的 `ToolContext.actions()` 属性以及 Go 中的 `agent.Context.Actions()` 属性，保存了一个 **EventActions** 对象。修改此对象的属性可以让你的工具影响工具执行完成后 Agent 或框架的行为。

* **`skip_summarization: bool`**：(默认值：无) 如果设置为 True，指示 ADK 跳过通常用于总结工具输出的 LLM 调用。如果工具的返回值已经是用户可直接使用的信息，这将非常有用。

* **`transfer_to_agent: str`**：将其设置为另一个 Agent 的名称。框架将停止当前 Agent 的执行，并 **将会话控制权转移给指定的 Agent**。这允许工具动态地将任务交给更专业的 Agent。

* **`escalate: bool`**：(默认值：无) 设置为 True 表示当前 Agent 无法处理请求，应将控制权交给其上级 Agent（如果存在层级结构）。在 LoopAgent 中，在子 Agent 的工具中设置 **escalate=True** 会终止循环。

#### 示例 {#example}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
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

from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import ToolContext
from google.genai import types

APP_NAME="customer_support_agent"
USER_ID="user1234"
SESSION_ID="1234"

def check_and_transfer(query: str, tool_context: ToolContext) -> str:
    """Checks if the query requires escalation and transfers to another agent if needed."""
    if "urgent" in query.lower():
        print("Tool: Detected urgency, transferring to the support agent.")
        tool_context.actions.transfer_to_agent = "support_agent"
        return "Transferring to the support agent..."
    else:
        return f"Processed query: '{query}'. No further action needed."

escalation_tool = FunctionTool(func=check_and_transfer)

main_agent = Agent(
    model='gemini-2.0-flash',
    name='main_agent',
    instruction="""You are the first point of contact for customer support of an analytics tool. Answer general queries. If the user indicates urgency, use the 'escalation_tool' tool.""",
    tools=[escalation_tool]
)

support_agent = Agent(
    model='gemini-2.0-flash',
    name='support_agent',
    instruction="""You are the dedicated support agent. Mentioned you are a support handler and please help the user with their urgent issue."""
)

main_agent.sub_agents = [support_agent]

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=main_agent, app_name=APP_NAME, session_service=session_service)
    return session, runner

# Agent 交互
async def call_agent_async(query):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    session, runner = await setup_session_and_runner()
    events = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    async for event in events:
        if event.is_final_response():
            final_response = event.content.parts[0].text
            print("Agent Response: ", final_response)

# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
await call_agent_async("this is urgent, i cant login")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// 除非遵守许可协议，否则您不得使用此文件。
// 您可以在以下位置获取许可副本
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// 除非适用法律要求或书面约定，否则根据许可协议分发的软件
// 按“原样”提供
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 请参阅许可协议以了解管理权限和
// limitations under the License.

package main

import (
	"context"
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

type checkAndTransferArgs struct {
	Query string `json:"query" jsonschema:"The user's query to check for urgency."`
}

type checkAndTransferResult struct {
	Status string `json:"status"`
}

func checkAndTransfer(ctx agent.Context, args checkAndTransferArgs) (checkAndTransferResult, error) {
	if strings.Contains(strings.ToLower(args.Query), "urgent") {
		fmt.Println("Tool: Detected urgency, transferring to the support agent.")
		ctx.Actions().TransferToAgent = "support_agent"
		return checkAndTransferResult{Status: "Transferring to the support agent..."}, nil
	}
	return checkAndTransferResult{Status: fmt.Sprintf("Processed query: '%s'. No further action needed.", args.Query)}, nil
}

func main() {
	ctx := context.Background()
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		log.Fatal(err)
	}

	supportAgent, err := llmagent.New(llmagent.Config{
		Name:        "support_agent",
		Model:       model,
		Instruction: "You are the dedicated support agent. Mentioned you are a support handler and please help the user with their urgent issue.",
	})
	if err != nil {
		log.Fatal(err)
	}

	checkAndTransferTool, err := functiontool.New(
		functiontool.Config{
			Name:        "check_and_transfer",
			Description: "Checks if the query requires escalation and transfers to another agent if needed.",
		},
		checkAndTransfer,
	)
	if err != nil {
		log.Fatal(err)
	}

	mainAgent, err := llmagent.New(llmagent.Config{
		Name:        "main_agent",
		Model:       model,
		Instruction: "You are the first point of contact for customer support of an analytics tool. Answer general queries. If the user indicates urgency, use the 'check_and_transfer' tool.",
		Tools:       []tool.Tool{checkAndTransferTool},
		SubAgents:   []agent.Agent{supportAgent},
	})
	if err != nil {
		log.Fatal(err)
	}

	sessionService := session.InMemoryService()
	runner, err := runner.New(runner.Config{
		AppName:        "customer_support_agent",
		Agent:          mainAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatal(err)
	}

	session, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: "customer_support_agent",
		UserID:  "user1234",
	})
	if err != nil {
		log.Fatal(err)
	}

	run(ctx, runner, session.Session.ID(), "this is urgent, i cant login")
}

func run(ctx context.Context, r *runner.Runner, sessionID string, prompt string) {
	fmt.Printf("\n> %s\n", prompt)
	events := r.Run(
		ctx,
		"user1234",
		sessionID,
		genai.NewContentFromText(prompt, genai.RoleUser),
		agent.RunConfig{
			StreamingMode: agent.StreamingModeNone,
		},
	)
	for event, err := range events {
		if err != nil {
			log.Fatalf("ERROR during agent execution: %v", err)
		}

		if event.Content.Parts[0].Text != "" {
			fmt.Printf("Agent Response: %s\n", event.Content.Parts[0].Text)
		}
	}
}
```

{{% /tab %}}
{{< /tabs >}}

##### 说明 {#explanation}

* 我们定义了两个 Agent：`main_agent` 和 `support_agent`。`main_agent` 被设计为初始接触点。
* 当 `main_agent` 调用 `check_and_transfer` 工具时，它会检查用户的查询。
* 如果查询包含“urgent”（紧急）一词，工具会访问 `tool_context`，具体是 **`tool_context.actions`**，并将 transfer_to_agent 属性设置为 `support_agent`。
* 此操作向框架发出信号，**将对话控制权转移给名为 `support_agent` 的 Agent**。
* 当 `main_agent` 处理紧急查询时，`check_and_transfer` 工具会触发转移。随后理想的响应将来自 `support_agent`。
* 对于没有紧急性的普通查询，工具只是处理它而不会触发转移。

此示例说明了一个工具如何通过其 ToolContext 中的 EventActions，动态地影响对话流程，将控制权转移给另一个专门 Agent。

### **认证** {#authentication}

ToolContext 提供了工具与认证 API 交互的机制。如果您的工具需要处理认证，可以使用以下方法：

* **`request_credential(auth_config: AuthConfig)`**（Python 中）或 **`requestCredential(authConfig: AuthConfig)`**（TypeScript 中）：如果您的工具确定需要认证但没有可用凭证，请调用此方法。这会向框架发出信号，根据提供的 auth_config 启动认证流程。

* **`get_auth_response(auth_config: AuthConfig)`**（Python 中）或 **`getAuthResponse(authConfig: AuthConfig)`**（TypeScript 中）：在后续调用（在 request_credential 成功处理后）中调用此方法，以获取用户提供的凭证。如果尚未有凭证，它将返回 `None`，否则返回 `AuthCredential`。

有关认证流程、配置和示例的详细解释，请参阅专用的工具认证文档页面。

### **上下文感知数据访问方法** {#context-aware-data-access-methods}

这些方法为您的工具提供了方便的方式，与会话或用户相关的持久数据进行交互，这些数据由配置的服务管理。在 Python 中，下面所有的 artifact 和 memory 方法都是 `async`，因此您的工具函数必须是 `async def` 并 `await` 它们。

* **`list_artifacts()`**（Python 中）或 **`listArtifacts()`**（Java 和 TypeScript 中）：返回通过 artifact_service 当前为会话存储的所有 artifact 的文件名（或键）列表。Artifact 通常是用户上传或工具/Agent 生成的文件（图片、文档等）。* **`load_artifact(filename: str)`**：通过文件名从 **artifact_service** 检索特定的 Artifact。您可以选择指定版本；如果省略，将返回最新版本。返回一个包含 Artifact 数据和 MIME 类型的 `google.genai.types.Part` 对象，如果未找到则返回 None。

* **`save_artifact(filename: str, artifact: types.Part)`**：将 Artifact 的新版本保存到 artifact_service。返回新版本号（从 0 开始）。

* **`search_memory(query: str)`**：（支持 ADK Python、Go 和 TypeScript）
    使用配置的 `memory_service` 查询用户的长期记忆。这对于从过去的交互或存储的知识中检索相关信息非常有用。**SearchMemoryResponse** 的结构取决于具体的记忆服务实现，但通常包含相关的文本片段或对话摘录。

#### 示例 {#example}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
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

from google.adk.tools import ToolContext, FunctionTool
from google.genai import types

async def process_document(
    document_name: str, analysis_query: str, tool_context: ToolContext
) -> dict:
    """Analyzes a document using context from memory."""

    # 1. 加载 Artifact
    print(f"Tool: Attempting to load artifact: {document_name}")
    document_part = await tool_context.load_artifact(document_name)

    if not document_part:
        return {"status": "error", "message": f"Document '{document_name}' not found."}

    document_text = document_part.text  # Assuming it's text for simplicity
    print(f"Tool: Loaded document '{document_name}' ({len(document_text)} chars).")

    # 2. 在内存中搜索相关上下文
    print(f"Tool: Searching memory for context related to: '{analysis_query}'")
    memory_response = await tool_context.search_memory(
        f"Context for analyzing document about {analysis_query}"
    )
    memory_context = "\n".join(
        [
            m.events[0].content.parts[0].text
            for m in memory_response.memories
            if m.events and m.events[0].content
        ]
    )  # Simplified extraction
    print(f"Tool: Found memory context: {memory_context[:100]}...")

    # 3. 执行分析（占位符）
    analysis_result = f"Analysis of '{document_name}' regarding '{analysis_query}' using memory context: [Placeholder Analysis Result]"
    print("Tool: Performed analysis.")

    # 4. 将分析结果保存为新 Artifact
    analysis_part = types.Part.from_text(text=analysis_result)
    new_artifact_name = f"analysis_{document_name}"
    version = await tool_context.save_artifact(new_artifact_name, analysis_part)
    print(f"Tool: Saved analysis result as '{new_artifact_name}' version {version}.")

    return {
        "status": "success",
        "analysis_artifact": new_artifact_name,
        "version": version,
    }

doc_analysis_tool = FunctionTool(func=process_document)

# 在一个 Agent 中：
# 假设 Artifact 'report.txt' 已经保存。
# 假设内存服务已配置并且有相关的历史数据。
# my_agent = Agent(..., tools=[doc_analysis_tool], artifact_service=..., memory_service=...)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// 除非遵守许可协议，否则您不得使用此文件。
// 您可以在以下位置获取许可副本
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// 除非适用法律要求或书面约定，否则根据许可协议分发的软件
// 按“原样”提供
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 请参阅许可协议以了解管理权限和
// limitations under the License.

package main

import (
	"fmt"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/genai"
)

type processDocumentArgs struct {
	DocumentName  string `json:"document_name" jsonschema:"The name of the document to be processed."`
	AnalysisQuery string `json:"analysis_query" jsonschema:"The query for the analysis."`
}

type processDocumentResult struct {
	Status           string `json:"status"`
	AnalysisArtifact string `json:"analysis_artifact,omitempty"`
	Version          int64  `json:"version,omitempty"`
	Message          string `json:"message,omitempty"`
}

func processDocument(ctx agent.Context, args processDocumentArgs) (*processDocumentResult, error) {
	fmt.Printf("Tool: Attempting to load artifact: %s\n", args.DocumentName)

	// 列出所有 Artifact
	listResponse, err := ctx.Artifacts().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list artifacts")
	}

	fmt.Println("Tool: Available artifacts:")
	for _, file := range listResponse.FileNames {
		fmt.Printf(" - %s\n", file)
	}

	documentPart, err := ctx.Artifacts().Load(ctx, args.DocumentName)
	if err != nil {
		return nil, fmt.Errorf("document '%s' not found", args.DocumentName)
	}

	fmt.Printf("Tool: Loaded document '%s' of size %d bytes.\n", args.DocumentName, len(documentPart.Part.InlineData.Data))

	// 3. 在内存中搜索相关上下文
	fmt.Printf("Tool: Searching memory for context related to: '%s'\n", args.AnalysisQuery)
	memoryResp, err := ctx.SearchMemory(ctx, args.AnalysisQuery)
	if err != nil {
		fmt.Printf("Tool: Error searching memory: %v\n", err)
	}
	memoryResultCount := 0
	if memoryResp != nil {
		memoryResultCount = len(memoryResp.Memories)
	}
	fmt.Printf("Tool: Found %d memory results.\n", memoryResultCount)

	analysisResult := fmt.Sprintf("Analysis of '%s' regarding '%s' using memory context: [Placeholder Analysis Result]", args.DocumentName, args.AnalysisQuery)
	fmt.Println("Tool: Performed analysis.")

	analysisPart := genai.NewPartFromText(analysisResult)
	newArtifactName := fmt.Sprintf("analysis_%s", args.DocumentName)
	version, err := ctx.Artifacts().Save(ctx, newArtifactName, analysisPart)
	if err != nil {
		return nil, fmt.Errorf("failed to save artifact")
	}
	fmt.Printf("Tool: Saved analysis result as '%s' version %d.\n", newArtifactName, version.Version)

	return &processDocumentResult{
		Status:           "success",
		AnalysisArtifact: newArtifactName,
		Version:          version.Version,
	}, nil
}
```

{{% /tab %}}
{{< /tabs >}}
通过利用 **ToolContext**，开发者可以创建更复杂且具上下文感知的自定义工具，这些工具能够无缝集成到 ADK 的架构中，并增强 Agent 的整体能力。

## 定义有效的工具函数 {#defining-effective-tool-functions}

当将某个方法或函数用作 ADK 工具时，如何定义它会显著影响 Agent 正确使用它的能力。Agent 的大型语言模型 (LLM) 在理解函数目的和生成正确调用时，严重依赖于函数的 **名称**、**参数 (arguments)**、**类型提示** 和 **文档字符串 / 源代码注释**。

以下是定义有效工具函数的关键指南：

* **函数名称:**
    * 使用描述性且以动词-名词为基础的名称，清楚地表明操作 (例如 `get_weather`、`searchDocuments`、`schedule_meeting`)。
    * 避免使用通用名称如 `run`、`process`、`handle_data`，或过于模糊的名称如 `doStuff`。即使描述良好，像 `do_stuff` 这样的名称可能会让模型在何时使用此工具与例如 `cancelFlight` 之间产生混淆。
    * LLM 在选择工具时，将函数名称作为主要标识符。

* **参数 (Arguments):**
    * 你的函数可以有任意数量的参数。
    * 使用清晰且描述性的名称 (例如 `city` 而不是 `c`，`search_query` 而不是 `q`)。
    * **在 Python 中为所有参数提供类型提示** (例如 `city: str`、`user_id: int`、`items: list[str]`)。这对 ADK 生成 LLM 的正确模式至关重要。
    * 确保所有参数类型 **可 JSON 序列化**。所有 Java 原始类型以及标准 Python 类型如 `str`、`int`、`float`、`bool`、`list`、`dict` 及其组合通常是安全的。除非有明确的 JSON 表示，否则避免将复杂的自定义类实例作为直接参数。
    * **避免为模型必须提供的信息设置默认值。** 例如，如果目的地应来自用户或对话上下文，则避免 `def my_func(destination: str = "Paris")`。默认值可用于真正可选的调优参数，但不应使用默认值来隐藏工具模式所需的必需业务输入。
    * **`self` / `cls` 自动处理：** 隐含参数如 `self` (实例方法) 或 `cls` (类方法) 会由 ADK 自动处理，并从展示给 LLM 的模式中排除。你只需要为工具逻辑上需要 LLM 提供的参数定义类型提示和描述。
* **返回类型:**
    * 函数的返回值 **必须是 Python 中的字典 (`dict`)**，Java 中的 **Map**，或 TypeScript 中的普通 **对象**。
    * 如果你的函数返回的是非字典类型（例如字符串、数字、列表），ADK 框架会自动将其包装成字典/Map 类似 `{'result': your_original_return_value}`，然后再将结果传回模型。
    * 设计字典/Map 的键和值时要 **具有描述性且易于 LLM 理解**。请记住，模型读取该输出以决定下一步操作。
    * 包含有意义的键。例如，不要仅返回错误代码 `500`，而是返回 `{'status': 'error', 'error_message': 'Database connection failed'}`。
    * **强烈建议**包含一个 `status` 键（例如 `'success'`、`'error'`、`'pending'`、`'ambiguous'`），以便清楚地向模型指示工具执行的结果。

* **文档字符串 / 源代码注释:**
    * **这是关键。** 文档字符串是 LLM 获取描述性信息的主要来源。
    * **清楚说明工具的功能**。具体说明其用途和限制。
    * **解释工具应在何时使用**。提供上下文或示例场景，以指导 LLM 的决策。
    * **清晰描述每个参数**。说明 LLM 需要为该参数提供什么信息。
    * 描述 **预期 `dict` 返回值的结构和含义**，特别是不同 `status` 值和相关数据键。
    * **不要描述注入的 ToolContext 参数**。在文档字符串中避免提及可选的 `tool_context: ToolContext` 参数，因为模型不需要知道它。ToolContext 由 ADK 注入，*在* LLM 决定调用后提供。

    **一个良好定义的示例:**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
def lookup_order_status(order_id: str) -> dict:
  """Fetches the current status of a customer's order using its ID.

  Use this tool ONLY when a user explicitly asks for the status of
  a specific order and provides the order ID. Do not use it for
  general inquiries.

  Args:
      order_id: The unique identifier of the order to look up.

  Returns:
      A dictionary indicating the outcome.
      On success, status is 'success' and includes an 'order' dictionary.
      On failure, status is 'error' and includes an 'error_message'.
      Example success: {'status': 'success', 'order': {'state': 'shipped', 'tracking_number': '1Z9...'}}
      Example error: {'status': 'error', 'error_message': 'Order ID not found.'}
  """
  # ... 函数实现以获取状态 ...
  if status_details := fetch_status_from_backend(order_id):
    return {
        "status": "success",
        "order": {
            "state": status_details.state,
            "tracking_number": status_details.tracking,
        },
    }
  else:
    return {"status": "error", "error_message": f"Order ID {order_id} not found."}
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"fmt"

	"google.golang.org/adk/v2/agent"
)

type lookupOrderStatusArgs struct {
	OrderID string `json:"order_id" jsonschema:"The ID of the order to look up."`
}

type order struct {
	State          string `json:"state"`
	TrackingNumber string `json:"tracking_number"`
}

type lookupOrderStatusResult struct {
	Status string `json:"status"`
	Order  order  `json:"order,omitempty"`
}

func lookupOrderStatus(ctx agent.Context, args lookupOrderStatusArgs) (*lookupOrderStatusResult, error) {
	// ... 函数实现以获取状态 ...
	statusDetails, ok := fetchStatusFromBackend(args.OrderID)
	if !ok {
		return nil, fmt.Errorf("order ID %s not found", args.OrderID)
	}
	return &lookupOrderStatusResult{
		Status: "success",
		Order: order{
			State:          statusDetails.State,
			TrackingNumber: statusDetails.Tracking,
		},
	}, nil
}
```

{{% /tab %}}
{{< /tabs >}}
* **简洁与专注：**
    * **保持工具专注：** 每个工具理想情况下应执行一个明确定义的任务。
    * **参数越少越好：** 模型通常比参数多或复杂参数较多的工具更可靠地处理参数较少且定义清晰的工具。
    * ** 使用简单数据类型：** 更倾向于基本类型（`str`、`int`、`bool`、`float`、`List[str]`，在 **Python** 中;`int`、`byte`、`short`、`long`、`float`、`double`、`boolean` 和 `char` 在 **Java** 中;或者在可能的情况下，在复杂的自定义类或深度嵌套结构上使用`string`、`number`、`boolean`和数组，如 **TypeScript** 中的 `string[]`）。
    * **分解复杂任务：** 将执行多个不同逻辑步骤的函数拆解成更小、更集中的工具。例如，不要只用一个`update_user_profile(profile: ProfileObject)`工具，而是考虑像`update_user_name(name: str)`、`update_user_address(address: str)`、`update_user_preferences(preferences: list[str])`等独立工具。这样 LLM 更容易选择并使用正确的能力。

遵循这些指南，你为 LLM 提供了清晰度和结构，使其能够有效利用自定义功能工具，从而使 Agent 行为更加强大、更可靠。

## 工具集：分组与动态提供工具 {#toolsets-grouping-and-dynamically-providing-tools}

支持版本：Python v0.5.0。

除了单个工具，ADK 还通过 `BaseToolset` 接口（定义于 `google.adk.tools.base_toolset` 年）引入了 **工具集**的概念。工具集允许你管理并向 Agent 提供一组`BaseTool`实例，通常是动态的。

这种方法有助于：

* **组织相关工具：** 将服务于共同目的的工具分组（例如，所有用于数学运算的工具，或所有与特定 API 交互的工具）。
* **动态工具可用性：** 使 Agent 能够根据当前上下文（如用户权限、会话状态或其他运行时条件）拥有不同的工具。工具集的`get_tools`方法可以决定要暴露哪些工具。
* **集成外部工具提供者：** 工具集可以作为来自外部系统的工具（如OpenAPI 规范或 MCP 服务器）的适配器，将其转换为兼容 ADK 的`BaseTool`对象。

### `BaseToolset`界面 {#the-basetoolset-interface}

任何作为 ADK 工具集的类都应实现`BaseToolset`抽象基类。该接口主要定义两种方法：* **`async def get_tools(...) -> list[BaseTool]:`**
    这是工具集的核心方法。当 ADKAgent 需要了解其可用工具时，它会调用`tools`列表中每个`BaseToolset`实例的 `get_tools()`。
    * 它接收一个可选的 `readonly_context`（`ReadonlyContext` 实例）。该上下文提供只读访问当前会话状态（`readonly_context.state`）、Agent 名称和调用 ID 等信息。工具集可以利用该上下文动态决定返回哪些工具。
    * 它**必须**返回`list` `BaseTool`实例（例如，`FunctionTool`，`RestApiTool`）。

* **`async def close(self) -> None:`**
    当工具集不再需要时，ADK 框架调用该异步方法，例如 Agent 服务器关闭或`Runner`关闭时。实现此方法以执行必要的清理，如关闭网络连接、释放文件句柄或清理工具集管理的其他资源。

在 Python 中，基础`__init__`也接受两个仅包含关键词的选项，你的子类应该通过这些选项`super().__init__(...)`：

* **`tool_filter`：**
    一个工具名称列表，或者一个`ToolPredicate`调用对象。

* **`tool_name_prefix`：**
    工具集工具名称的前缀。当设置前缀时，ADK 会将每个工具集的工具作为`<prefix>_<tool_name>`向 LLM 展示。

### 使用 Agent 工具集 {#using-toolsets-with-agents}

你可以直接将`BaseToolset`实现实例与单个`BaseTool`实例并列，直接包含在`LlmAgent`的`tools`列表中。

当 Agent 初始化或需要确定其可用能力时，ADK 框架会遍历`tools`列表：

* 如果某项是`BaseTool`实例，则直接使用。
* 如果某项是`BaseToolset`实例，则调用其`get_tools()`方法（当前`ReadonlyContext`），返回的`BaseTool`列表会被添加到 Agent 可用的工具中。

### 示例：一个简单的数学工具集 {#example-a-simple-math-toolset}

让我们创建一个提供简单算术运算工具的基本示例。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py

import asyncio
from typing import Optional, List, Dict, Any

from google.adk.agents import LlmAgent
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools import BaseTool, FunctionTool
from google.adk.tools.base_toolset import BaseToolset
from google.adk.tools.tool_context import ToolContext
from google.adk.runners import InMemoryRunner

# 1. 定义各个工具的功能
def add_numbers(a: int, b: int, tool_context: ToolContext) -> Dict[str, Any]:
    """Adds two integer numbers.
    Args:
        a: The first number.
        b: The second number.
    Returns:
        A dictionary with the sum, e.g., {'status': 'success', 'result': 5}
    """
    print(f"Tool: add_numbers called with a={a}, b={b}")
    result = a + b
    # 示例：在 tool_context 状态中存储某些内容
    tool_context.state["last_math_operation"] = "addition"
    return {"status": "success", "result": result}

def subtract_numbers(a: int, b: int) -> Dict[str, Any]:
    """Subtracts the second number from the first.
    Args:
        a: The first number.
        b: The second number.
    Returns:
        A dictionary with the difference, e.g., {'status': 'success', 'result': 1}
    """
    print(f"Tool: subtract_numbers called with a={a}, b={b}")
    return {"status": "success", "result": a - b}

# 2. 通过实现 BaseToolset 创建工具集
class SimpleMathToolset(BaseToolset):
    def __init__(self, prefix: str = "math"):
        self.prefix = prefix
        super().__init__(tool_name_prefix=self.prefix) # Toolset can customize names by passing a prefix

        # 创建 FunctionTool 实例一次
        self._add_tool = FunctionTool(
            func=add_numbers,
        )
        self._subtract_tool = FunctionTool(
            func=subtract_numbers,
        )
        print(f"SimpleMathToolset initialized with prefix '{self.prefix}'")

    async def get_tools(
        self, readonly_context: Optional[ReadonlyContext] = None
    ) -> List[BaseTool]:
        print("SimpleMathToolset.get_tools() called.")
        # 动态行为示例：
        # 可以使用 readonly_context.state 来决定返回哪些工具
        # 例如，如果 readonly_context.state.get("enable_advanced_math")：
        #    返回 [self._add_tool, self._subtract_tool, self._multiply_tool]

        # 对于这个简单示例，总是返回两个工具
        tools_to_return = [self._add_tool, self._subtract_tool]
        print(f"SimpleMathToolset providing tools: {[t.name for t in tools_to_return]}")
        return tools_to_return

    async def close(self) -> None:
        # 在这个简单示例中没有资源需要清理
        print(f"SimpleMathToolset.close() called for prefix '{self.prefix}'.")
        await asyncio.sleep(0)  # Placeholder for async cleanup if needed

# 3. 定义单独的工具（不属于工具集的一部分）
def greet_user(name: str = "User") -> Dict[str, str]:
    """Greets the user."""
    print(f"Tool: greet_user called with name={name}")
    return {"greeting": f"Hello, {name}!"}

greet_tool = FunctionTool(func=greet_user)

# 4. 实例化工具集
math_toolset_instance = SimpleMathToolset(prefix="calculator")

# 5. 定义一个同时使用单独工具和工具集的 Agent
calculator_agent = LlmAgent(
    name="CalculatorAgent",
    model="gemini-flash-latest",  # Replace with your desired model
    instruction="You are a helpful calculator and greeter. "
    "Use 'greet_user' for greetings. "
    "Use 'calculator_add_numbers' to add and 'calculator_subtract_numbers' to subtract. "
    "Announce the state of 'last_math_operation' if it's set.",
    tools=[greet_tool, math_toolset_instance],  # Individual tool  # Toolset instance
)

# 6. 运行 Agent
runner = InMemoryRunner(agent=calculator_agent, app_name="toolset_example_app")

async def main():
    print("\n--- Query 1: Greeting ---")
    await runner.run_debug("Hi there!")
    print("\n--- Query 2: Addition ---")
    await runner.run_debug("What is 5 plus 3?")
    await math_toolset_instance.close()

if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{< /tabs >}}
在这个示例中：

* `SimpleMathToolset` 实现了 `BaseToolset`，其 `get_tools()` 方法返回 `FunctionTool` 实例给 `add_numbers` 和 `subtract_numbers`。它还使用前缀自定义了它们的名称。
* `calculator_agent` 配置了单独的 `greet_tool` 以及 `SimpleMathToolset` 的一个实例。
* 当 `calculator_agent` 运行时，ADK 将调用 `math_toolset_instance.get_tools()`。Agent 的 LLM 将能够访问 `greet_user`、`calculator_add_numbers` 和 `calculator_subtract_numbers` 来处理用户请求。
* `add_numbers` 工具展示了如何写入 `tool_context.state`，且 Agent 的指令提到了读取此状态。
* `close()` 方法被调用以确保释放由工具集持有的任何资源。
* Kotlin 示例没有为工具名称添加前缀，因为 adk-kotlin 没有前缀机制，且 `BaseTool.name` 是只读的。它的工具保持为 `greetUser`、`addNumbers` 和 `subtractNumbers`。Kotlin 还会将两种工具分开：单独工具放在 `tools`，工具集放在 `toolsets`。

### 在工具集中筛选工具 {#filter-tools-in-toolsets}

当前 Python/Go 版本暂不支持此功能。

每个 SDK 都允许工具集按名称或通过看到当前上下文的谓词来缩小提供给模型的工具范围；Python、Java 和 TypeScript 在 `BaseToolset` 上使用该过滤器。此处示例为 Kotlin 形式。

工具集可以接受 `ToolFilter` 并通过 `isToolSelected` 应用它，而不是在 `getTools()` 内硬编码列表，如上 Kotlin 示例中的 `SimpleMathToolset` 所示。`ToolFilter.allowList` 按名称选择工具，而 `ToolFilter.Predicate` 接收 `ReadonlyContext`，所以工具列表可以依赖会话状态或当前用户。空过滤器选择所有内容，这也是为何同一个类在无过滤时也能工作。

> 官方此示例仅提供 kotlin 版本；本套文档只保留 Python 和 Go 示例。

工具集提供了一种强大的方式来组织、管理并动态提供工具集合给您的 ADK Agent，从而使 Agent 应用更加模块化、易维护和适应性强。

---

原文：[Custom Tools for ADK](https://adk.dev/tools-custom/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/index.md)
