---
title: "概述"
description: "当预构建的 ADK 工具无法满足您的需求时，您可以创建自定义 *功能工具*。构建功能工具可以让您创建定制功能，例如连接专有数据库或实现"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

当预构建的 ADK 工具无法满足您的需求时，您可以创建自定义*函数工具*。构建函数工具可以让您创建定制功能，例如连接专有数据库或实现独特的算法。例如，一个函数工具 `myfinancetool`，可能是计算特定财务指标的函数。ADK 还支持长运行函数，因此如果计算需要一段时间，Agent 可以继续处理其他任务。

ADK 提供了多种创建函数工具的方法，每种方法都适用于不同复杂程度和控制需求：

- [函数工具](#function-tool)
- [长运行函数工具](#long-run-tool)
- [Agent 即工具](#agent-tool)

## 函数工具 {#function-tool}

将 Python 函数转换为工具是将自定义逻辑集成到 Agent 中的直接方式。当您将函数分配给 Agent 的 `tools` 列表时，框架会自动将其封装为 `FunctionTool`。

### 工作原理 {#how-it-works}

ADK 框架会自动检查您的 Python 函数签名——包括名称、文档字符串、参数、类型提示和默认值——以生成模式。该模式是 LLM 用来理解工具的用途、何时使用以及它需要哪些参数的依据。

### 定义函数签名 {#define-function-signatures}

明确定义的函数签名对于 LLM 正确使用您的工具至关重要。

#### 参数 {#parameters}

参数决定工具在被调用时期望接收的数据。您可以根据工具的需求将它们配置为必需或可选参数。

##### 必需参数 {#required-parameters}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

如果参数有类型提示但**没有默认值**，则该参数被视为**必需**。当 LLM 调用工具时，必须提供此参数的值。ADK 不会单独提供每个参数的描述：整个文档字符串会成为工具的单一顶层 `description`，因此请在文档字符串中描述每个参数。

<details>
<summary>示例：必需参数</summary>

```python
def get_weather(city: str, unit: str):
    """
    Retrieves the weather for a city in the specified unit.

    Args:
        city (str): The city name.
        unit (str): The temperature unit, either 'Celsius' or 'Fahrenheit'.
    """
    # ... 函数逻辑 ...
    return {"status": "success", "report": f"Weather for {city} is sunny."}
```

</details>
在此示例中，`city` 和 `unit` 都是必需的。如果 LLM 尝试在没有其中一个的情况下调用 `get_weather`，ADK 将向 LLM 返回错误，提示其更正调用。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 语言中，你可以使用结构体标签来控制 JSON 模式。两个主要标签是 `json` 和 `jsonschema`。

如果结构体字段的 `json` 标签中没有 `omitempty` 或 `omitzero` 选项，则该参数被视为**必需**。

`jsonschema` 标签用于提供参数的描述。这对于 LLM 理解参数的用途至关重要。

<details>
<summary> 示例：必需参数
</summary>

```go
// GetWeatherParams 定义了 getWeather 工具的参数。
type GetWeatherParams struct {
    // 此字段为必填项（不能“omitempty”）。
    // jsonschema 标签提供了描述。
    Location string `json:"location" jsonschema:"The city and state, e.g., San Francisco, CA"`

    // 此字段也是必填项。
    Unit     string `json:"unit" jsonschema:"The temperature unit, either 'celsius' or 'fahrenheit'"`
}
```

</details>
在此示例中，`location` 和 `unit` 都是必填的。
{{% /tab %}}
{{< /tabs >}}
##### 可选参数 {#optional-parameters}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

仅当您提供 **默认值** 时，参数才被视为 **可选**。这种方法是定义可选参数的标准 Python 方式。
使用 `typing.Optional[SomeType]` 或 `| None` 语法（Python 3.10）标注参数，并不会使其自动成为可选参数：没有默认值时，该参数仍然是必需的。

仅对真正可选的值使用默认值。不要为模型应该从用户请求中推导或要求用户提供的信息添加默认值。

<details>
<summary>示例：可选参数</summary>

```python
def search_flights(destination: str, departure_date: str, flexible_days: int = 0):
    """
    Searches for flights.

    Args:
        destination (str): The destination city.
        departure_date (str): The desired departure date.
        flexible_days (int, optional): Number of flexible days for the search. Defaults to 0.
    """
    # ... 函数逻辑 ...
    if flexible_days > 0:
        return {"status": "success", "report": f"Found flexible flights to {destination}."}
    return {"status": "success", "report": f"Found flights to {destination} on {departure_date}."}
```

</details>
这里，`flexible_days` 是可选的。LLM 可以选择提供它，但
不是必需的。
{{% /tab %}}
{{% tab tabName="Go" %}}

如果一个参数的结构字段在其 `json` 标签中具有
`omitempty` 或 `omitzero` 选项，则该参数被认为是**可选的**。

<details>
<summary>示例：可选参数</summary>

```go
// GetWeatherParams 定义了 getWeather 工具的参数。
type GetWeatherParams struct {
    // 位置是必填项。
    Location string `json:"location" jsonschema:"The city and state, e.g., San Francisco, CA"`

    // 单位是可选项。
    Unit string `json:"unit,omitempty" jsonschema:"The temperature unit, either 'celsius' or 'fahrenheit'"`

    // 天数是可选项。
    Days int `json:"days,omitzero" jsonschema:"The number of forecast days to return (defaults to 1)"`
}
```

</details>
在这里，`unit` 和 `days` 是可选的。LLM 可以选择提供它们，但并不是必须的。
{{% /tab %}}
{{< /tabs >}}
##### 使用 `typing.Optional` 的可选参数 {#optional-parameters-with-typingoptional}

使用 `typing.Optional[SomeType]` 或 `| None` 语法（Python 3.10）来指示参数可以是 `None`。将其与 `None` 的默认值结合使用，以获得标准可选参数；仅使用注释会使参数仍然是必需的。

<details>
<summary>示例：`typing.Optional`</summary>

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from typing import Optional

def create_user_profile(username: str, bio: Optional[str] = None):
    """
    Creates a new user profile.

    Args:
        username (str): The user's unique username.
        bio (str, optional): A short biography for the user. Defaults to None.
    """
    # ... 函数逻辑 ...
    if bio:
        return {"status": "success", "message": f"Profile for {username} created with a bio."}
    return {"status": "success", "message": f"Profile for {username} created."}
```

{{% /tab %}}
{{< /tabs >}}
</details>
##### Pydantic 模型参数 {#pydantic-model-parameters}

用 `pydantic.BaseModel` 子类标注参数，或者用
`list[Model]`、`Optional[Model]`，或模型的联合类型。ADK 将模型的
schema 嵌入工具声明中，并在函数运行前将 LLM 提供的对象转换为
你的类的实例。

<details>
<summary>示例：Pydantic 模型参数</summary>

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import pydantic

class UserProfile(pydantic.BaseModel):
    """A user's profile."""

    name: str
    age: int

def create_user(profile: UserProfile):
    """
    Creates a user account.

    Args:
        profile (UserProfile): The profile to create the account from.
    """
    # 'profile' 接收的是 UserProfile 实例，而不是字典。
    return {"status": "success", "name": profile.name}
```

{{% /tab %}}
{{< /tabs >}}
</details>
##### 可变参数 (`*args` 和 `**kwargs`) {#variadic-parameters-args-and-kwargs}

虽然你可以在函数签名中包含 `*args`（可变位置参数）和 `**kwargs`（可变关键字参数）用于其他目的，但在为 LLM 生成工具架构时，ADK 框架会**忽略它们**。LLM 不会意识到它们的存在，也无法向它们传递参数。最好依赖明确定义的参数来接收你期望从 LLM 获取的所有数据。

#### 上下文注入 {#context-injection}

上下文注入允许你的自定义函数访问 Agent 的环境，例如会话状态或可用操作。要启用此功能，向函数添加一个类型为 `ToolContext` 的参数。ADK 会在函数运行前自动注入上下文数据，并确保该参数对 LLM 不可见。

```python
from google.adk.tools import ToolContext

def my_tool(arg1: str, tool_context: ToolContext):
    # 示例：访问会话状态
    user_id = tool_context.state.get("user_id")
    # 示例：触发操作
    # tool_context.actions.transfer_to_agent = "secondary_agent"
```

`ToolContext` 提供了访问以下内容的功能：

- **`state`：** 用于会话范围数据的类似字典的对象。
- **`actions`：** 控制 Agent 行为，例如 `transfer_to_agent`。
- **方法**：用于处理 Artifact，例如 `load_artifact` 或 `save_artifact`。

##### 自定义参数名称 {#customize-the-parameter-name}

默认情况下，注入的参数名为 `tool_context`，但您可以将参数命名为任何您想要的名称。ADK 通过其 `ToolContext` 类型注解来检测，而不是通过名称。例如，要使用名称 `ctx`：

```python
from google.adk.tools import ToolContext

def my_tool(arg1: str, ctx: ToolContext):
    # 'ctx' 因其类型注解而接收 ToolContext
    user_id = ctx.state.get("user_id")
```

#### 返回类型 {#return-type}

函数工具的首选返回类型是 Python 中的 **字典**，a
**Map** 或自定义 **Java中的Record或POJO**，TypeScript中的**对象**，或
**映射**或**数据类**在Kotlin中。这允许你结构化响应
通过键值对，为 LLM 提供上下文和清晰度。如果你的函数
如果返回非字典或映射的类型，框架会自动包裹
它通过一个名为**“结果”**的单键进入一个词典。

尽量让你的返回价值尽可能具描述性。*例如，*
与其返回数字错误码，不如返回一个包含
“error_message”键，包含人类可读的解释。**请记住
LLM**，不是一段代码，需要理解结果。作为最佳实践，
在你的退货词典中加入“状态”键，以显示整体结果
（例如，“成功”、“错误”、“待处理”），为 LLM 提供了清晰信号
关于行动的现状。

#### 多克斯特林斯 {#docstrings}

你的函数文档字符串作为工具的**描述**并被发送
对 LLM 来说。因此，一份写得好且全面的文档文档至关重要
通过 LLM 了解如何有效使用该工具。清晰地解释
函数的目的、参数的含义以及期望的返回
值。在 Java 中，你可以使用 Javadoc 注释或
`@Schema(description="...")`你的方法注释以实现
描述。在Kotlin中，你可以使用KDoc注释或
`@Tool(description="...")`和`@Param(description="...")`注释为
请提供这些描述。

### 工具间传递数据 {#pass-data-between-tools}

当 Agent 连续调用多个工具时，可能需要传递数据
从一个工具到另一个工具。推荐的方法是使用`temp:`
会话状态中的前缀。

工具可以将数据写入`temp:`变量，后续工具可以读取该变量。
这些数据仅适用于当前召唤，并被丢弃
之后。

{{% alert context="info" %}}
**共享召唤上下文**

同一轮 Agent 内的所有工具调用都共享相同
`InvocationContext`。这意味着他们也共享同一个临时（`temp:`）
状态，这也是数据在它们之间传递的方式。
{{% /alert %}}
### 示例 {#example}

<details>
<summary>Example</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

该工具是一个 Python 函数，用于获取给定股票的股价
股票代码/代码。

<u>Note</u>：你需要在使用之前`pip install yfinance`库
这个工具。

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

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

import yfinance as yf

APP_NAME = "stock_app"
USER_ID = "1234"
SESSION_ID = "session1234"

def get_stock_price(symbol: str):
    """
    Retrieves the current stock price for a given symbol.

    Args:
        symbol (str): The stock symbol (e.g., "AAPL", "GOOG").

    Returns:
        float: The current stock price, or None if an error occurs.
    """
    try:
        stock = yf.Ticker(symbol)
        historical_data = stock.history(period="1d")
        if not historical_data.empty:
            current_price = historical_data['Close'].iloc[-1]
            return current_price
        else:
            return None
    except Exception as e:
        print(f"Error retrieving stock price for {symbol}: {e}")
        return None

stock_price_agent = Agent(
    model='gemini-2.0-flash',
    name='stock_agent',
    instruction= 'You are an agent who retrieves stock prices. If a ticker symbol is provided, fetch the current price. If only a company name is given, first perform a Google search to find the correct ticker symbol before retrieving the stock price. If the provided ticker symbol is invalid or data cannot be retrieved, inform the user that the stock price could not be found.',
    description='This agent specializes in retrieving real-time stock prices. Given a stock ticker symbol (e.g., AAPL, GOOG, MSFT) or the stock name, use the tools and reliable data sources to provide the most up-to-date price.',
    tools=[get_stock_price], # You can add Python functions directly to the tools list; they will be automatically wrapped as FunctionTools.
)

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=stock_price_agent, app_name=APP_NAME, session_service=session_service)
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
await call_agent_async("stock price of GOOG")
```

该工具的返回值将被封装到一个字典中。

```json
{"result": "$123"}
```

{{% /tab %}}
{{% tab tabName="Go" %}}

此工具用于获取股票价格的模拟值。

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/model/gemini"
    "google.golang.org/adk/v2/runner"
    "google.golang.org/adk/v2/session"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/functiontool"
    "google.golang.org/genai"
)

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
	"google.golang.org/adk/v2/tool/agenttool"
	"google.golang.org/adk/v2/tool/functiontool"

	"google.golang.org/genai"
)

// mockStockPrices 提供了一个简单的内存股票价格数据库
// 模拟现实中的股票数据 API。这使得示例能够
// 无需进行外部网络调用即可展示工具功能。
var mockStockPrices = map[string]float64{
	"GOOG": 300.6,
	"AAPL": 123.4,
	"MSFT": 234.5,
}

// getStockPriceArgs 定义了传递给 getStockPrice 工具的参数的模式。
// Go ADK 推荐使用结构，因为它能提供强力
// 对预期输入进行类型输入和清晰验证。
type getStockPriceArgs struct {
	Symbol string `json:"symbol" jsonschema:"The stock ticker symbol, e.g., GOOG"`
}

// getStockPriceResults 定义了 getStockPrice 工具的输出模式。
type getStockPriceResults struct {
	Symbol string  `json:"symbol"`
	Price  float64 `json:"price,omitempty"`
	Error  string  `json:"error,omitempty"`
}

// getStockPrice 是一种工具，用于获取给定股票代码的股票价格
// 来自 mockStockPrices 地图。它演示了函数如何作为
// 工具由 Agent 操作。如果找到该符号，它会返回包含
// 符号及其价格。否则，返回带有错误信息的结构。
func getStockPrice(ctx agent.Context, input getStockPriceArgs) (getStockPriceResults, error) {
	symbolUpper := strings.ToUpper(input.Symbol)
	if price, ok := mockStockPrices[symbolUpper]; ok {
		fmt.Printf("Tool: Found price for %s: %f\n", input.Symbol, price)
		return getStockPriceResults{Symbol: input.Symbol, Price: price}, nil
	}
	return getStockPriceResults{}, fmt.Errorf("no data found for symbol")
}

// createStockAgent 初始化并配置 LlmAgent。
// 该 Agent 配备了getStockPrice工具，并接受相关指导
// 关于如何回应用户关于股价的询问。它使用
// Gemini模型用于理解用户意图并决定何时使用其工具。
func createStockAgent(ctx context.Context) (agent.Agent, error) {
	stockPriceTool, err := functiontool.New(
		functiontool.Config{
			Name:        "get_stock_price",
			Description: "Retrieves the current stock price for a given symbol.",
		},
		getStockPrice)
	if err != nil {
		return nil, err
	}

	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})

	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	return llmagent.New(llmagent.Config{
		Name:        "stock_agent",
		Model:       model,
		Instruction: "You are an agent who retrieves stock prices. If a ticker symbol is provided, fetch the current price. If only a company name is given, first perform a Google search to find the correct ticker symbol before retrieving the stock price. If the provided ticker symbol is invalid or data cannot be retrieved, inform the user that the stock price could not be found.",
		Description: "This agent specializes in retrieving real-time stock prices. Given a stock ticker symbol (e.g., AAPL, GOOG, MSFT) or the stock name, use the tools and reliable data sources to provide the most up-to-date price.",
		Tools: []tool.Tool{
			stockPriceTool,
		},
	})
}

// 用户ID和应用名是用于识别用户和应用的常量
// 在整个会话中。这些数值对于日志记录、跟踪非常重要，
// 以及管理不同 Agent 交互间的状态。
const (
	userID  = "example_user_id"
	appName = "example_app"
)

// callAgent 负责协调给定提示下的 Agent 执行。
// 它会设置必要的服务，创建会话，并使用运行程序
// 管理 Agent 的生命周期。它会流式传输 Agent 的响应和
// 打印到控制台，处理运行过程中可能出现的错误。
func callAgent(ctx context.Context, a agent.Agent, prompt string) {
	sessionService := session.InMemoryService()
	// 为 Agent 互动创建一个新会话。
	session, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: appName,
		UserID:  userID,
	})
	if err != nil {
		log.Fatalf("Failed to create the session service: %v", err)
	}
	config := runner.Config{
		AppName:        appName,
		Agent:          a,
		SessionService: sessionService,
	}

	// 创建运行程序来管理 Agent 执行。
	r, err := runner.New(config)

	if err != nil {
		log.Fatalf("Failed to create the runner: %v", err)
	}

	sessionID := session.Session.ID()

	userMsg := &genai.Content{
		Parts: []*genai.Part{
			genai.NewPartFromText(prompt),
		},
		Role: string(genai.RoleUser),
	}

	for event, err := range r.Run(ctx, userID, sessionID, userMsg, agent.RunConfig{
		StreamingMode: agent.StreamingModeNone,
	}) {
		if err != nil {
			fmt.Printf("\nAGENT_ERROR: %v\n", err)
		} else {
			for _, p := range event.Content.Parts {
				fmt.Print(p.Text)
			}
		}
	}
}

// RunAgentSimulation 是这个例子的切入点。
// 它创建库存 Agent，然后模拟一系列用户交互
// 通过向 Agent 发送不同的提示。该功能展示了如何
// Agent 会回答各种问题，包括成功和失败
// 试图恢复股价。
func RunAgentSimulation() {
	// 创建股票 Agent
	agent, err := createStockAgent(context.Background())
	if err != nil {
		panic(err)
	}

	fmt.Println("Agent created:", agent.Name())

	prompts := []string{
		"stock price of GOOG",
		"What's the price of MSFT?",
		"Can you find the stock price for an unknown company XYZ?",
	}

	// 模拟运行 Agent 时，使用不同的提示
	for _, prompt := range prompts {
		fmt.Printf("\nPrompt: %s\nResponse: ", prompt)
		callAgent(context.Background(), agent, prompt)
		fmt.Println("\n---")
	}
}

// --8<-- [start:agent_tool_example]
// createSummarizerAgent 创建了一个专门用于摘要文本的 Agent。
func createSummarizerAgent(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}
	return llmagent.New(llmagent.Config{
		Name:        "SummarizerAgent",
		Model:       model,
		Instruction: "You are an expert at summarizing text. Take the user's input and provide a concise summary.",
		Description: "An agent that summarizes text.",
	})
}

// createMainAgent 创建了将摘要 Agent 作为工具的主 Agent。
func createMainAgent(ctx context.Context, tools ...tool.Tool) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}
	return llmagent.New(llmagent.Config{
		Name:  "MainAgent",
		Model: model,
		Instruction: "You are a helpful assistant. If you are asked to summarize a long text, use the 'summarize' tool. " +
			"After getting the summary, present it to the user by saying 'Here is a summary of the text:'.",
		Description: "The main agent that can delegate tasks.",
		Tools:       tools,
	})
}

func RunAgentAsToolSimulation() {
	ctx := context.Background()

	// 1. 创建工具 Agent（摘要器）
	summarizerAgent, err := createSummarizerAgent(ctx)
	if err != nil {
		log.Fatalf("Failed to create summarizer agent: %v", err)
	}

	// 2. 将工具 Agent 封装在 AgentTool 中
	summarizeTool := agenttool.New(summarizerAgent, &agenttool.Config{
		SkipSummarization: true,
	})

	// 3. 创建主 Agent 并为其提供 AgentTool
	mainAgent, err := createMainAgent(ctx, summarizeTool)
	if err != nil {
		log.Fatalf("Failed to create main agent: %v", err)
	}

	// 4. 运行主 Agent
	prompt := `
		Please summarize this text for me:
		Quantum computing represents a fundamentally different approach to computation,
		leveraging the bizarre principles of quantum mechanics to process information. Unlike classical computers
		that rely on bits representing either 0 or 1, quantum computers use qubits which can exist in a state of superposition - effectively
		being 0, 1, or a combination of both simultaneously. Furthermore, qubits can become entangled,
		meaning their fates are intertwined regardless of distance, allowing for complex correlations. This parallelism and
		interconnectedness grant quantum computers the potential to solve specific types of incredibly complex problems - such
		as drug discovery, materials science, complex system optimization, and breaking certain types of cryptography - far
		faster than even the most powerful classical supercomputers could ever achieve, although the technology is still largely in its developmental stages.
	`
	fmt.Printf("\nPrompt: %s\nResponse: ", prompt)
	callAgent(context.Background(), mainAgent, prompt)
	fmt.Println("\n---")
}

// --8<-- [end:agent_tool_example]

func main() {
	fmt.Println("Attempting to run the agent simulation...")
	RunAgentSimulation()
	fmt.Println("\nAttempting to run the agent-as-a-tool simulation...")
	RunAgentAsToolSimulation()
}
```

此工具的返回值将是一个 `getStockPriceResults` 实例。

```json
For input `{"symbol": "GOOG"}`: {"price":300.6,"symbol":"GOOG"}
```

{{% /tab %}}
{{< /tabs >}}
</details>
### 最佳实践 {#best-practices}

虽然你在定义函数时有相当大的灵活性，但请记住，
简单性可以提升 LLM 的可用性。请考虑以下指导原则：

- **参数越少越好：** 尽量减少参数数量以减小复杂性。
- **简单数据类型：** 尽量使用原始数据类型，如 `str` 和 `int`，而不是自定义类。
- **有意义的名称：** 函数名和参数名显著影响 LLM 如何理解和使用该工具。选择清晰反映函数目的和输入含义的名称。避免使用类似 `do_stuff()` 或 `beAgent()` 的通用名称。
- **构建以实现并行执行：** 当同时运行多个工具时，通过构建异步操作来提高函数调用性能。有关启用工具并行执行的信息，请参见 [通过并行执行提高工具性能](/docs/adk/components/custom-tools/function-tools/tool-performance/)。

## 长运行函数工具 {#long-run-tool}

此工具旨在帮助你启动和管理在 Agent 工作流之外处理的任务，这些任务需要大量处理时间，但不会阻塞 Agent 的执行。此工具是 `FunctionTool` 的子类。

使用 `LongRunningFunctionTool` 时，你的函数可以启动长运行操作，并可选择返回**初始结果**，例如一个长运行操作 ID。一旦调用长运行函数工具，AgentRunner 会暂停 Agent 运行，让 Agent 客户端决定是继续还是等待长运行操作完成。Agent 客户端可以查询长运行操作的进度，并返回中间或最终响应。然后 Agent 可以继续执行其他任务。一个示例是人类参与场景，Agent 在执行任务前需要人类批准。

{{% alert context="warning" %}}
**警告：执行处理**

长运行函数工具旨在帮助你启动并*管理*长运行任务作为 Agent 工作流的一部分，但***不执行***实际的长任务。对于需要大量时间完成的任务，你应当实现一个独立的服务器来执行该任务。
{{% /alert %}}
{{% alert context="success" %}}
**提示：并行执行**

根据你构建工具的类型，为异步操作设计可能比创建长运行工具更优。更多信息请参见 [通过并行执行提高工具性能](/docs/adk/components/custom-tools/function-tools/tool-performance/)。
{{% /alert %}}
### 工作原理在 Python 中，你用 `LongRunningFunctionTool` 包装一个函数。在 Java 中，你将一个 Method 名传递给 `LongRunningFunctionTool.create()`。在 TypeScript 中，你实例化 `LongRunningFunctionTool` 类。 {#how-it-works}

1. **启动:** 当 LLM 调用该工具时，你的函数启动长时间运行的操作。
2. **初始更新:** 你的函数可以选择性地返回初始结果（例如，长时间运行的操作 ID）。ADK 框架获取结果并将其包装在 `FunctionResponse` 中返回给 LLM。这允许 LLM 通知用户（例如，状态、完成百分比、消息）。然后 Agent 运行结束/暂停。
3. **继续或等待:** 在每次 Agent 运行完成后，Agent 客户端可以查询长时间运行操作的进度，并决定是使用中间响应继续 Agent 运行（以更新进度）还是等待直到获取最终响应。Agent 客户端应将中间或最终响应发送回 Agent 以进行下一次运行。
4. **框架处理:** ADK 框架管理执行。它将 Agent 客户端发送的中间或最终 `FunctionResponse` 发送给 LLM，以生成用户友好的消息。

### 创建工具 {#create-the-tool}

定义你的工具函数，并使用 `LongRunningFunctionTool` 类进行包装：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python

from typing import Any
from google.adk.tools import LongRunningFunctionTool

# 1. 定义长时间运行的函数
def ask_for_approval(
    purpose: str, amount: float
) -> dict[str, Any]:
    """Ask for approval for the reimbursement."""
    # 为审批创建一个工单
    # 向审批人发送带有工单链接的通知
    return {'status': 'pending', 'approver': 'Sean Zhou', 'purpose' : purpose, 'amount': amount, 'ticket-id': 'approval-ticket-1'}

def reimburse(purpose: str, amount: float) -> dict[str, Any]:
    """Reimburse the amount of money to the employee."""
    # 将报销请求发送给付款供应商
    return {'status': 'ok'}

# 2. 使用 LongRunningFunctionTool 包装该函数
long_running_tool = LongRunningFunctionTool(func=ask_for_approval)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/model/gemini"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/functiontool"
    "google.golang.org/genai"
)

// CreateTicketArgs 定义了我们长期运行工具的参数。
type CreateTicketArgs struct {
	Urgency string `json:"urgency" jsonschema:"The urgency level of the ticket."`
}

// CreateTicketResults 定义了我们长时间运行工具的*初始*输出。
type CreateTicketResults struct {
	Status   string `json:"status"`
	TicketId string `json:"ticket_id"`
}

// createTicketAsync 模拟了长时间运行的工单创建任务的*启动*。
func createTicketAsync(ctx agent.Context, args CreateTicketArgs) (CreateTicketResults, error) {
	log.Printf("TOOL_EXEC: 'create_ticket_long_running' called with urgency: %s (Call ID: %s)\n", args.Urgency, ctx.FunctionCallID())

	// “生成”一个票据ID并在初始响应中返回它。
	ticketID := "TICKET-ABC-123"
	log.Printf("ACTION: Generated Ticket ID: %s for Call ID: %s\n", ticketID, ctx.FunctionCallID())

	// 在实际应用中，您将保存两者之间的关联
	// FunctionCallID 和 ticketID 用于稍后处理异步响应。
	return CreateTicketResults{
		Status:   "started",
		TicketId: ticketID,
	}, nil
}

func createTicketAgent(ctx context.Context) (agent.Agent, error) {
	ticketTool, err := functiontool.New(
		functiontool.Config{
			Name:          "create_ticket_long_running",
			Description:   "Creates a new support ticket with a specified urgency level.",
			IsLongRunning: true,
		},
		createTicketAsync,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create long running tool: %w", err)
	}

	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %v", err)
	}

	return llmagent.New(llmagent.Config{
		Name:        "ticket_agent",
		Model:       model,
		Instruction: "You are a helpful assistant for creating support tickets. Provide the status of the ticket at each interaction.",
		Tools:       []tool.Tool{ticketTool},
	})
}
```

{{% /tab %}}
{{< /tabs >}}
### 中间/最终结果更新 {#intermediate--final-result-updates}

Agent 客户端接收到包含长时间运行的函数调用的事件，并检查工单状态。然后 Agent 客户端可以发送中间或最终响应以更新进度。框架将该值（即使是 None）打包到发送回 LLM 的 `FunctionResponse` 内容中。

{{% alert context="info" %}}
**注意：带有继续功能的长时间运行函数响应**

如果您的 ADK Agent 工作流配置了 [Resume](/docs/adk/run/agent-runtime/resume-agents/) 功能，您还必须在长时间运行函数响应中包含 Invocation ID (`invocation_id`) 参数。您提供的 Invocation ID 必须与生成长时间运行函数请求的调用相同，否则系统会使用该响应启动新的调用。如果您的 Agent 使用 Resume 功能，建议在您的长时间运行函数请求中包含 Invocation ID 作为参数，以便可以随响应一起包含。有关使用 Resume 功能的更多详细信息，请参见 [Resume stopped agents](/docs/adk/run/agent-runtime/resume-agents/)。

在 **Kotlin** 中，Runner 从函数响应自身的调用 ID 解析调用，因此无需将 `invocationId` 传递给 `runAsync`。ID 与会话中的函数调用不匹配的响应将抛出异常。
{{% /alert %}}
<details>
<summary>
仅适用于 Java ADK </summary>

在使用 Function Tools 传递 `ToolContext` 时，请确保以下情况之一为真：

- Schema 通过函数签名中的 ToolContext 参数传递，如:

  ```
  @com.google.adk.tools.Annotations.Schema(name = "toolContext") ToolContext toolContext
  ```

或者

- 以下 `-parameters` 标志已设置到 mvn 编译器插件

```
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.14.0</version>
            <configuration>
                <compilerArgs>
                    <arg>-parameters</arg>
                </compilerArgs>
            </configuration>
        </plugin>
    </plugins>
</build>
```

</details>
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

import asyncio
from google.adk.agents import Agent
from google.adk.events import Event
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# --8<-- [start:define_long_running_function]

from typing import Any
from google.adk.tools import LongRunningFunctionTool

# 1. 定义长时间运行的函数
def ask_for_approval(
    purpose: str, amount: float
) -> dict[str, Any]:
    """Ask for approval for the reimbursement."""
    # 为审批创建一个工单
    # 向审批人发送带有工单链接的通知
    return {'status': 'pending', 'approver': 'Sean Zhou', 'purpose' : purpose, 'amount': amount, 'ticket-id': 'approval-ticket-1'}

def reimburse(purpose: str, amount: float) -> dict[str, Any]:
    """Reimburse the amount of money to the employee."""
    # 将报销请求发送给付款供应商
    return {'status': 'ok'}

# 2. 使用 LongRunningFunctionTool 包装该函数
long_running_tool = LongRunningFunctionTool(func=ask_for_approval)

# --8<-- [end:define_long_running_function]

# 3. 在 Agent 中使用工具
file_processor_agent = Agent(
    # 使用与函数调用兼容的模型
    model="gemini-2.0-flash",
    name='reimbursement_agent',
    instruction="""
      You are an agent whose job is to handle the reimbursement process for
      the employees. If the amount is less than $100, you will automatically
      approve the reimbursement.

      If the amount is greater than $100, you will
      ask for approval from the manager. If the manager approves, you will
      call reimburse() to reimburse the amount to the employee. If the manager
      rejects, you will inform the employee of the rejection.
    """,
    tools=[reimburse, long_running_tool]
)

APP_NAME = "human_in_the_loop"
USER_ID = "1234"
SESSION_ID = "session1234"

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=file_processor_agent, app_name=APP_NAME, session_service=session_service)
    return session, runner

# --8<-- [start: call_reimbursement_tool]

# Agent 交互
async def call_agent_async(query):

    def get_long_running_function_call(event: Event) -> types.FunctionCall:
        # 从事件中获取长时间运行的函数调用
        if not event.long_running_tool_ids or not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_call
                and event.long_running_tool_ids
                and part.function_call.id in event.long_running_tool_ids
            ):
                return part.function_call

    def get_function_response(event: Event, function_call_id: str) -> types.FunctionResponse:
        # 获取指定ID的函数调用的函数响应。
        if not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_response
                and part.function_response.id == function_call_id
            ):
                return part.function_response

    content = types.Content(role='user', parts=[types.Part(text=query)])
    session, runner = await setup_session_and_runner()

    print("\nRunning agent...")
    events_async = runner.run_async(
        session_id=session.id, user_id=USER_ID, new_message=content
    )

    long_running_function_call, long_running_function_response, ticket_id = None, None, None
    async for event in events_async:
        # 使用助手检查特定的授权请求事件
        if not long_running_function_call:
            long_running_function_call = get_long_running_function_call(event)
        else:
            _potential_response = get_function_response(event, long_running_function_call.id)
            if _potential_response: # Only update if we get a non-None response
                long_running_function_response = _potential_response
                ticket_id = long_running_function_response.response['ticket-id']
        if event.content and event.content.parts:
            if text := ''.join(part.text or '' for part in event.content.parts):
                print(f'[{event.author}]: {text}')

    if long_running_function_response:
        # 通过 ticket_id 查询相应工单的状态
        # 发送中间/最终响应
        updated_response = long_running_function_response.model_copy(deep=True)
        updated_response.response = {'status': 'approved'}
        async for event in runner.run_async(
          session_id=session.id, user_id=USER_ID, new_message=types.Content(parts=[types.Part(function_response = updated_response)], role='user')
        ):
            if event.content and event.content.parts:
                if text := ''.join(part.text or '' for part in event.content.parts):
                    print(f'[{event.author}]: {text}')

# --8<-- [end:call_reimbursement_tool]

# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。

# 无需审批的报销
# asyncio.run(call_agent_async("请报销50美元的餐费"))
await call_agent_async("Please reimburse 50$ for meals") # For Notebooks, uncomment this line and comment the above line
# 需要审批的报销
# asyncio.run(call_agent_async("请报销200美元的餐费"))
await call_agent_async("Please reimburse 200$ for meals") # For Notebooks, uncomment this line and comment the above line
```

{{% /tab %}}
{{% tab tabName="Go" %}}

以下示例演示了多轮工作流。首先，用户请求 Agent 创建一个工单。Agent 调用长时间运行的工具，客户端捕获 `FunctionCall` ID。然后，客户端通过向 Agent 发送后续的 `FunctionResponse` 消息来模拟异步工作的完成，以提供工单 ID 和最终状态。

```go
// runTurn 执行 Agent 的单个回合并返回捕获的函数调用 ID。
func runTurn(ctx context.Context, r *runner.Runner, sessionID, turnLabel string, content *genai.Content) string {
	var funcCallID atomic.Value // Safely store the found ID.

	fmt.Printf("\n--- %s ---\n", turnLabel)
	for event, err := range r.Run(ctx, userID, sessionID, content, agent.RunConfig{
		StreamingMode: agent.StreamingModeNone,
	}) {
		if err != nil {
			fmt.Printf("\nAGENT_ERROR: %v\n", err)
			continue
		}
		// 打印事件摘要以便清晰。
		printEventSummary(event, turnLabel)

		// 从事件中捕获函数调用 ID。
		for _, part := range event.Content.Parts {
			if fc := part.FunctionCall; fc != nil {
				if fc.Name == "create_ticket_long_running" {
					funcCallID.Store(fc.ID)
				}
			}
		}
	}

	if id, ok := funcCallID.Load().(string); ok {
		return id
	}
	return ""
}

func main() {
	ctx := context.Background()
	ticketAgent, err := createTicketAgent(ctx)
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// 设置 Runner 和会话。
	sessionService := session.InMemoryService()
	session, err := sessionService.Create(ctx, &session.CreateRequest{AppName: appName, UserID: userID})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	r, err := runner.New(runner.Config{AppName: appName, Agent: ticketAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	// --- 回合 1：用户请求创建工单。 ---
	initialUserMessage := genai.NewContentFromText("Create a high urgency ticket for me.", genai.RoleUser)
	funcCallID := runTurn(ctx, r, session.Session.ID(), "Turn 1: User Request", initialUserMessage)
	if funcCallID == "" {
		log.Fatal("ERROR: Tool 'create_ticket_long_running' not called in Turn 1.")
	}
	fmt.Printf("ACTION: Captured FunctionCall ID: %s\n", funcCallID)

	// --- 回合 2：应用提供工单的最终状态。 ---
	// 在实际应用中，ticketID 会通过 funcCallID 从数据库中获取。
	// 在此示例中，我们将使用相同的 ID。
	ticketID := "TICKET-ABC-123"
	willContinue := false // Signal that this is the final response.
	ticketStatusResponse := &genai.FunctionResponse{
		Name: "create_ticket_long_running",
		ID:   funcCallID,
		Response: map[string]any{
			"status":    "approved",
			"ticket_id": ticketID,
		},
		WillContinue: &willContinue,
	}
	appResponseWithStatus := &genai.Content{
		Role:  string(genai.RoleUser),
		Parts: []*genai.Part{{FunctionResponse: ticketStatusResponse}},
	}
	runTurn(ctx, r, session.Session.ID(), "Turn 2: App provides ticket status", appResponseWithStatus)
	fmt.Println("Long running function completed successfully.")
}

// printEventSummary 提供 Agent 和 LLM 交互的可读日志。
func printEventSummary(event *session.Event, turnLabel string) {
	for _, part := range event.Content.Parts {
		// 检查是否有文本部分。
		if part.Text != "" {
			fmt.Printf("[%s][%s_TEXT]: %s\n", turnLabel, event.Author, part.Text)
		}
		// 检查是否有函数调用部分。
		if fc := part.FunctionCall; fc != nil {
			fmt.Printf("[%s][%s_CALL]: %s(%v) ID: %s\n", turnLabel, event.Author, fc.Name, fc.Args, fc.ID)
		}
	}
}
```

{{% /tab %}}
{{< /tabs >}}
<details>
<summary>Python 完整示例：报销审批</summary>

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
from google.adk.agents import Agent
from google.adk.events import Event
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# --8<-- [start:define_long_running_function]

from typing import Any
from google.adk.tools import LongRunningFunctionTool

# 1. 定义长时间运行的函数
def ask_for_approval(
    purpose: str, amount: float
) -> dict[str, Any]:
    """Ask for approval for the reimbursement."""
    # 为审批创建一个工单
    # 向审批人发送带有工单链接的通知
    return {'status': 'pending', 'approver': 'Sean Zhou', 'purpose' : purpose, 'amount': amount, 'ticket-id': 'approval-ticket-1'}

def reimburse(purpose: str, amount: float) -> dict[str, Any]:
    """Reimburse the amount of money to the employee."""
    # 将报销请求发送给付款供应商
    return {'status': 'ok'}

# 2. 使用 LongRunningFunctionTool 包装该函数
long_running_tool = LongRunningFunctionTool(func=ask_for_approval)

# --8<-- [end:define_long_running_function]

# 3. 在 Agent 中使用工具
file_processor_agent = Agent(
    # 使用与函数调用兼容的模型
    model="gemini-2.0-flash",
    name='reimbursement_agent',
    instruction="""
      You are an agent whose job is to handle the reimbursement process for
      the employees. If the amount is less than $100, you will automatically
      approve the reimbursement.

      If the amount is greater than $100, you will
      ask for approval from the manager. If the manager approves, you will
      call reimburse() to reimburse the amount to the employee. If the manager
      rejects, you will inform the employee of the rejection.
    """,
    tools=[reimburse, long_running_tool]
)

APP_NAME = "human_in_the_loop"
USER_ID = "1234"
SESSION_ID = "session1234"

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=file_processor_agent, app_name=APP_NAME, session_service=session_service)
    return session, runner

# --8<-- [start: call_reimbursement_tool]

# Agent 交互
async def call_agent_async(query):

    def get_long_running_function_call(event: Event) -> types.FunctionCall:
        # 从事件中获取长时间运行的函数调用
        if not event.long_running_tool_ids or not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_call
                and event.long_running_tool_ids
                and part.function_call.id in event.long_running_tool_ids
            ):
                return part.function_call

    def get_function_response(event: Event, function_call_id: str) -> types.FunctionResponse:
        # 获取指定ID的函数调用的函数响应。
        if not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_response
                and part.function_response.id == function_call_id
            ):
                return part.function_response

    content = types.Content(role='user', parts=[types.Part(text=query)])
    session, runner = await setup_session_and_runner()

    print("\nRunning agent...")
    events_async = runner.run_async(
        session_id=session.id, user_id=USER_ID, new_message=content
    )

    long_running_function_call, long_running_function_response, ticket_id = None, None, None
    async for event in events_async:
        # 使用助手检查特定的授权请求事件
        if not long_running_function_call:
            long_running_function_call = get_long_running_function_call(event)
        else:
            _potential_response = get_function_response(event, long_running_function_call.id)
            if _potential_response: # Only update if we get a non-None response
                long_running_function_response = _potential_response
                ticket_id = long_running_function_response.response['ticket-id']
        if event.content and event.content.parts:
            if text := ''.join(part.text or '' for part in event.content.parts):
                print(f'[{event.author}]: {text}')

    if long_running_function_response:
        # 通过 ticket_id 查询相应工单的状态
        # 发送中间/最终响应
        updated_response = long_running_function_response.model_copy(deep=True)
        updated_response.response = {'status': 'approved'}
        async for event in runner.run_async(
          session_id=session.id, user_id=USER_ID, new_message=types.Content(parts=[types.Part(function_response = updated_response)], role='user')
        ):
            if event.content and event.content.parts:
                if text := ''.join(part.text or '' for part in event.content.parts):
                    print(f'[{event.author}]: {text}')

# --8<-- [end:call_reimbursement_tool]

# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。

# 无需审批的报销
# asyncio.run(call_agent_async("请报销50美元的餐费"))
await call_agent_async("Please reimburse 50$ for meals") # For Notebooks, uncomment this line and comment the above line
# 需要审批的报销
# asyncio.run(call_agent_async("请报销200美元的餐费"))
await call_agent_async("Please reimburse 200$ for meals") # For Notebooks, uncomment this line and comment the above line
```

</details>
#### 这个示例的关键方面 {#key-aspects-of-this-example}

- **`LongRunningFunctionTool`**：包装提供的方法/函数并将其标记为长时间运行。框架像调用其他函数工具一样调用该函数一次，不会消费生成器产生的值。
- **Agent 指令**：指导大型语言模型使用工具，并解释 Agent 客户端随后发送的进度和完成 FunctionResponse，以进行用户更新。
- **初始返回**：函数返回的任何内容都作为第一个 FunctionResponse 发送，而返回空值或不返回的函数不会发出任何响应。之后的每个进度或完成更新都是 Agent 客户端发送的 FunctionResponse。
- **Kotlin 没有 `LongRunningFunctionTool` 类**：用 `@Tool(isLongRunning = true)` 注解函数，或将 `isLongRunning = true` 传递给 `BaseTool` 子类。
- **Kotlin 回合计数**：上述工具返回一个值而不是 `Unit`，因此不可恢复的应用程序将该占位符发送到模型并第二次调用它，在中间回复中结束第一回合。可恢复应用程序在函数调用处暂停，不进行第二次模型调用。返回 `Unit` 会完全抑制占位符响应，在两种模式下都在函数调用处结束回合。

## Agent 作为工具 {#agent-tool}

此功能允许您通过将其他 Agent 作为工具调用来利用系统中其他 Agent 的功能。Agent 作为工具使您能够调用另一个 Agent 执行特定任务，有效地**委派责任**。从概念上讲，这类似于创建一个调用其他 Agent 并使用其响应作为函数返回值的 Python 函数。

### 与子 Agent 的关键区别 {#key-difference-from-sub-agents}

区分 Agent 作为工具和子 Agent 非常重要。

- **Agent 作为工具：** 当 Agent A 将 Agent B 作为工具调用（使用 Agent 作为工具）时，Agent B 的答案**传回**Agent A，然后 Agent A 总结答案并生成对用户的响应。Agent A 保持控制权，并继续处理未来的用户输入。
- **子 Agent：** 当 Agent A 将 Agent B 作为子 Agent 调用时，回答用户的责任完全**转移给 Agent B**。Agent A 实际上被排除在外。之后的所有用户输入都由 Agent B 回答。

### 使用 `AgentTool` {#use-agenttool}

要将 Agent 用作工具，请使用 `AgentTool` 类包装该 Agent。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
tools=[AgentTool(agent=agent_b)]
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
agenttool.New(agent, &agenttool.Config{...})
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**Python：考虑使用 `single_turn` 子 Agent**

对于 ADK Python 中的标准内联委派，建议在子 Agent 上设置
`mode="single_turn"`，并使用
`sub_agents=[...]` 进行附加，而不是将其包装在 `AgentTool` 中。ADK 将子 Agent 作为工具公开，并在父会话中内联运行它。请参阅 [Agent
协作](/docs/adk/build/multi-agent-workflows/collaborative-workflows/)。
{{% /alert %}}
### 自定义你的 Agent 工具 {#customize-your-agent-tool}

`AgentTool` 类提供以下属性以自定义其行为。

#### 跳过摘要 {#skip-summarization}

**`skip_summarization`**（布尔值）
如果设置为 `True`，则此自定义指示框架跳过工具 Agent 响应的基于 LLM 的摘要。此功能最好在工具输出已经格式良好且无需进一步处理时使用。

- **用法：** Python/TypeScript（`skip_summarization`）；Kotlin/Java
  （`skipSummarization`）。

<details>
<summary>示例</summary>

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

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.agent_tool import AgentTool
from google.genai import types

APP_NAME="summary_agent"
USER_ID="user1234"
SESSION_ID="1234"

summary_agent = Agent(
    model="gemini-2.0-flash",
    name="summary_agent",
    instruction="""You are an expert summarizer. Please read the following text and provide a concise summary.""",
    description="Agent to summarize text",
)

root_agent = Agent(
    model='gemini-2.0-flash',
    name='root_agent',
    instruction="""You are a helpful assistant. When the user provides a text, use the 'summarize' tool to generate a summary. Always forward the user's message exactly as received to the 'summarize' tool, without modifying or summarizing it yourself. Present the response from the tool to the user.""",
    tools=[AgentTool(agent=summary_agent, skip_summarization=True)]
)

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
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

long_text = """Quantum computing represents a fundamentally different approach to computation,
leveraging the bizarre principles of quantum mechanics to process information. Unlike classical computers
that rely on bits representing either 0 or 1, quantum computers use qubits which can exist in a state of superposition - effectively
being 0, 1, or a combination of both simultaneously. Furthermore, qubits can become entangled,
meaning their fates are intertwined regardless of distance, allowing for complex correlations. This parallelism and
interconnectedness grant quantum computers the potential to solve specific types of incredibly complex problems - such
as drug discovery, materials science, complex system optimization, and breaking certain types of cryptography - far
faster than even the most powerful classical supercomputers could ever achieve, although the technology is still largely in its developmental stages."""

# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
await call_agent_async(long_text)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/model/gemini"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/agenttool"
    "google.golang.org/genai"
)

// createSummarizerAgent 创建了一个专门用于摘要文本的 Agent。
func createSummarizerAgent(ctx context.Context) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}
	return llmagent.New(llmagent.Config{
		Name:        "SummarizerAgent",
		Model:       model,
		Instruction: "You are an expert at summarizing text. Take the user's input and provide a concise summary.",
		Description: "An agent that summarizes text.",
	})
}

// createMainAgent 创建了将摘要 Agent 作为工具的主 Agent。
func createMainAgent(ctx context.Context, tools ...tool.Tool) (agent.Agent, error) {
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		return nil, err
	}
	return llmagent.New(llmagent.Config{
		Name:  "MainAgent",
		Model: model,
		Instruction: "You are a helpful assistant. If you are asked to summarize a long text, use the 'summarize' tool. " +
			"After getting the summary, present it to the user by saying 'Here is a summary of the text:'.",
		Description: "The main agent that can delegate tasks.",
		Tools:       tools,
	})
}

func RunAgentAsToolSimulation() {
	ctx := context.Background()

	// 1. 创建工具 Agent（摘要器）
	summarizerAgent, err := createSummarizerAgent(ctx)
	if err != nil {
		log.Fatalf("Failed to create summarizer agent: %v", err)
	}

	// 2. 将工具 Agent 封装在 AgentTool 中
	summarizeTool := agenttool.New(summarizerAgent, &agenttool.Config{
		SkipSummarization: true,
	})

	// 3. 创建主 Agent 并为其提供 AgentTool
	mainAgent, err := createMainAgent(ctx, summarizeTool)
	if err != nil {
		log.Fatalf("Failed to create main agent: %v", err)
	}

	// 4. 运行主 Agent
	prompt := `
		Please summarize this text for me:
		Quantum computing represents a fundamentally different approach to computation,
		leveraging the bizarre principles of quantum mechanics to process information. Unlike classical computers
		that rely on bits representing either 0 or 1, quantum computers use qubits which can exist in a state of superposition - effectively
		being 0, 1, or a combination of both simultaneously. Furthermore, qubits can become entangled,
		meaning their fates are intertwined regardless of distance, allowing for complex correlations. This parallelism and
		interconnectedness grant quantum computers the potential to solve specific types of incredibly complex problems - such
		as drug discovery, materials science, complex system optimization, and breaking certain types of cryptography - far
		faster than even the most powerful classical supercomputers could ever achieve, although the technology is still largely in its developmental stages.
	`
	fmt.Printf("\nPrompt: %s\nResponse: ", prompt)
	callAgent(context.Background(), mainAgent, prompt)
	fmt.Println("\n---")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
##### 工作原理 {#how-it-works}
1. 当 `root_agent` 接收到长文本时，其指令告诉它使用“总结”工具处理长文本。
2. 框架将“总结”识别为一个 `AgentTool`，它封装了 `summary_agent`。
3. 在后台，`root_agent` 将调用 `summary_agent`，并将长文本作为输入。
4. `summary_agent` 将根据其指令处理文本并生成摘要。
5. **来自 `summary_agent` 的响应随后传回给 `root_agent`。**
6. 然后 `root_agent` 可以使用该摘要并形成对用户的最终响应（例如：“这是文本的摘要：...”）

#### 传播基础数据元 {#propagate-grounding-metadata}

**`propagate_grounding_metadata`**（布尔值，默认：`False`）
如果设置为 `True`，该工具会自动将子 Agent 生成的任何基础数据元（例如 Google 搜索引用）转发到父 Agent 的会话状态中。这种自定义确保在使用专门的搜索 Agent 作为工具时引用得以保留。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.tools import AgentTool

search_specialist_agent = Agent(
    # 指定你的生成模型
    model="gemini-flash-latest",
    name="search_specialist_agent",
    instruction=(
        "You are a search expert. Find and "
        "compile citations on requested topics."
    ),
    # 在此添加任何搜索工具
)

search_agent_tool = AgentTool(
    agent=search_specialist_agent,
    # 保持引用完整直到源头
    propagate_grounding_metadata=True
)

root_agent = Agent(
    model="gemini-flash-latest",
    name="root_agent",
    description=(
        "A central coordinator that delegates "
        "to specialist agents."
    ),
    tools=[search_agent_tool]
)
```

{{% /tab %}}
{{< /tabs >}}
#### 控制插件继承 {#control-plugin-inheritance}

当你使用 `AgentTool` 包装一个 Agent 时，你可以通过 `include_plugins` 参数控制它是否继承父 Runner 的插件。

* **`include_plugins=True`（默认）：** 子 Agent 继承父 Agent 的所有插件，保留跟踪跨度和事件流。
* **`include_plugins=False`：** 子 Agent 在隔离环境中运行，不继承父 Agent 的任何插件。使用此设置可以确保 Agent 的执行是自包含的，不受父 Agent 插件环境的影响。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.tools import agent_tool

# MyImageAgent 的占位符定义
class MyImageAgent:
    def __init__(
        self, name="My Agent", description="A simple image agent."
    ):
        self.name = name
        # 已添加描述属性
        self.description = description

# 示例 1：将 MyImageAgent 从父插件中隔离
my_isolated_tool = agent_tool.AgentTool(
    agent=MyImageAgent(), # Instantiate MyImageAgent
    include_plugins=False
)

# 示例 2：继承插件
my_observable_tool = agent_tool.AgentTool(
    agent=MyImageAgent(), # Instantiate MyImageAgent
    include_plugins=True
)
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[Function tools](https://adk.dev/tools-custom/function-tools/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/function-tools.md)
