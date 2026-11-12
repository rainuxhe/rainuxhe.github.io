---
title: "Agent 上下文"
description: "在 Agent 开发工具包 (ADK) 中，*上下文* 指的是在特定操作期间可供您的 agent 及其工具使用的重要信息集合。可以将其视为必要的背景知识和资源。"
icon: "article"
weight: 60
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

在 Agent Development Kit（ADK）中，*上下文* 指的是在特定操作期间可用于您的 Agent 及其工具的重要信息集合。可以将其视为处理当前任务或对话轮次所需的必要背景知识和资源。

Agent 通常需要的不仅仅是用户的最新消息。上下文至关重要，因为它能够实现：

1. **维持状态：** 在对话的多个步骤中记住细节（例如用户偏好、先前的计算、购物车中的物品）。这主要通过 **会话状态** 管理。
2. **传递数据：** 在一个步骤中发现或生成的信息（如 LLM 调用或工具执行）与后续步骤共享。会话状态在此也很关键。
3. **访问服务：** 与框架功能进行交互，例如：
    * **Artifact 存储：** 保存或加载与会话相关的文件或数据块（如 PDF、图像、配置文件）。
    * **记忆：** 从过去的交互或与用户相关的外部知识源中搜索相关信息。
    * **身份验证：** 请求并检索工具访问外部 API 所需的凭证。
4. **身份和跟踪：** 了解当前运行的 Agent（`agent.name`）并唯一识别当前请求-响应周期（`invocation_id`），以便进行日志记录和调试。
5. **工具特定操作：** 启用工具内的特殊操作，如请求身份验证或搜索记忆，这些操作需要访问当前交互的详细信息。

将所有这些信息整合在单个完整的用户请求到最终响应周期（一个 **调用**）中的核心对象是 `InvocationContext`。然而，通常您不会直接创建或管理此对象。当一个调用开始时（例如通过 `runner.run_async`），ADK 框架会创建它并将相关的上下文信息隐式传递给您的 Agent 代码、回调和工具。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 框架如何提供上下文
from google.adk import Runner

# 1. 你使用你的 Agent 和服务初始化一个 Runner
runner = Runner(
    app_name="my_app",
    agent=my_root_agent,
    session_service=my_session_service,
    artifact_service=my_artifact_service,
)

# 2. 你使用用户输入调用run_async
# 注意：run_async 是一个异步生成器，会产生事件。
# 框架在内部创建一个InvocationContext并将其
# 隐式传递给你的 Agent 代码、回调和工具。
async for event in runner.run_async(
    user_id="user123",
    session_id="session456",
    new_message=user_message
):
    print(event.stringify_content())

# 作为开发者，你使用方法参数中提供的上下文对象。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
/* Conceptual Pseudocode: How the framework provides context (Internal Logic) */
	sessionService := session.InMemoryService()

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          myAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	s, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: appName,
		UserID:  userID,
	})
	if err != nil {
		log.Fatalf("FATAL: Failed to create session: %v", err)
	}

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("\nYou > ")
		if !scanner.Scan() {
			break
		}
		userInput := scanner.Text()
		if strings.EqualFold(userInput, "quit") {
			break
		}
		userMsg := genai.NewContentFromText(userInput, genai.RoleUser)
		events := r.Run(ctx, s.Session.UserID(), s.Session.ID(), userMsg, agent.RunConfig{
			StreamingMode: agent.StreamingModeNone,
		})
		fmt.Print("\nAgent > ")
		for event, err := range events {
			if err != nil {
				log.Printf("ERROR during agent execution: %v", err)
				break
			}
			if event != nil && event.Content != nil && len(event.Content.Parts) > 0 {
				fmt.Print(event.Content.Parts[0].Text)
			}
		}
	}
```

{{% /tab %}}
{{< /tabs >}}
## 语境类型 {#types-of-context}

ADK 使用`Context`类作为管理 Agent 环境、状态和资源的核心机制。虽然`Context`是所有 Agent 交互的基础，但它体现为专门的“类型”，旨在根据执行流中能力和权限的使用位置提供适当的平衡。
如果你使用这些特定的上下文类型，ADK 确保你的 Agent 能准确访问必要信息，如内存、会话状态或凭据，准确地在你需要的时间和地点。
以下是你将遇到的主要情境口味：

- **`InvocationContext`**：在核心 Agent 运行（`_run_async_impl`、`_run_live_impl`）期间使用，提供整个调用的全面视图，包括服务引用和生命周期管理。

- **`ReadonlyContext`**：一种轻量级、受限的基本上下文细节视图，用于禁止变异的场景，例如指令提供者内部。

- **`Context`**：用于 Agent 生命周期和模型回调。它提供了一套强大的功能，用于读写会话状态、管理 Artifact 以及向内存服务注入数据。

- **`ToolContext`**：专为工具执行和相关回调设计。除了上下文的功能外，它还包括认证流程、内存搜索和 Artifact 发现等专用方法。{{% alert context="info" %}}
**关于兼容性**：在 Python 和 TypeScript 中，`CallbackContext` 和 `ToolContext` 已被 `Context` 类型取代。`CallbackContext` 类被保留作为 `Context` 的别名，以确保向后兼容。虽然您可能会在现有代码库中遇到 `CallbackContext`，**但对于所有新开发，您应使用 `Context` 类**以利用完整的统一功能集。
{{% /alert %}}
### `InvocationContext` {#invocationcontext}
- **使用场景:** 作为 `ctx` 参数直接传入 Agent 核心实现方法中（`_run_async_impl`、`_run_live_impl`）。
- **目的:** 提供对当前调用的整个状态的访问。这是最全面的上下文对象。
- **主要内容:** 直接访问 `session`（包括 `state` 和 `events`）、当前 `agent` 实例、`invocation_id`、初始 `user_content`、已配置服务的引用（`artifact_service`、`memory_service`、`session_service`），以及与实时/流模式相关的字段。
- **使用案例:** 主要在 Agent 核心逻辑需要直接访问整个会话或服务时使用，尽管状态和 Artifact 交互通常委托给使用自己上下文的回调/工具。还用于控制调用本身（例如，设置 `ctx.end_invocation = True`）。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # Agent 实现接收调用上下文
    from google.adk.agents import BaseAgent
    from google.adk.agents.invocation_context import InvocationContext
    from google.adk.events import Event
    from typing import AsyncGenerator

    class MyAgent(BaseAgent):
        async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
            # 直接访问示例
            agent_name = ctx.agent.name
            session_id = ctx.session.id
            print(f"Agent {agent_name} running in session {session_id} for invocation {ctx.invocation_id}")
            # ... 使用 ctx 的 Agent 逻辑 ...
            yield # ... event ...
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
    	"fmt"

    	"google.golang.org/adk/v2/agent"
    	"google.golang.org/adk/v2/session"
    )

    // 伪代码：接收 InvocationContext 的 Agent 实现
    type MyAgent struct {
    }

    func (a *MyAgent) Run(ctx agent.InvocationContext) iter.Seq2[*session.Event, error] {
    	return func(yield func(*session.Event, error) bool) {
    		// 直接访问示例
    		agentName := ctx.Agent().Name()
    		sessionID := ctx.Session().ID()
    		fmt.Printf("Agent %s running in session %s for invocation %s\n", agentName, sessionID, ctx.InvocationID())
    		// ... 使用 ctx 的 Agent 逻辑 ...
    		yield(&session.Event{Author: agentName}, nil)
    	}
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
### `ReadonlyContext` {#readonlycontext}
- **使用场景:** 在只需要读取基本信息且不允许修改的场景中提供（例如，`InstructionProvider` 函数）。它也是其他上下文的基类。
- **目的:** 提供对基本上下文细节的安全只读视图。
- **主要内容:** `invocation_id`、`agent_name`，以及当前 `state` 的只读*视图*。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：指令提供者接收只读上下文
    from google.adk.agents.readonly_context import ReadonlyContext

    def my_instruction_provider(context: ReadonlyContext) -> str:
        # 只读访问示例
        # state 属性提供对状态的只读 MappingProxyType 视图
        user_tier = context.state.get("user_tier", "standard")
        # context.state['new_key'] = 'value' # 类型错误：'mappingproxy' 对象不支持项目赋值
        return f"Process the request for a {user_tier} user."
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
    	"fmt"

    	"google.golang.org/adk/v2/agent"
    )

    // 伪代码：指令提供者接收只读上下文
    func myInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
    	// 只读访问示例
    	userTier, err := ctx.ReadonlyState().Get("user_tier")
    	if err != nil {
    		userTier = "standard" // Default value
    	}
    	// ctx.ReadonlyState() 没有 Set 方法，因为 State() 是只读的。
    	return fmt.Sprintf("Process the request for a %v user.", userTier), nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
### `CallbackContext` 和 `Context` {#callbackcontext-and-context}

- **使用场景：** 作为 `callback_context` 传递给 Agent 生命周期回调（`before_agent_callback`、`after_agent_callback`）和模型交互回调（`before_model_callback`、`after_model_callback`）。
- **用途：** 便于在回调中检查和修改状态、与 Artifact 交互以及访问调用详细信息。
- **主要功能（增加到 `ReadonlyContext`）：**
    - **可变的 `state` 属性：** 允许读写会话状态。在此处（`callback_context.state['key'] = value`）进行的更改会被追踪，并与回调后框架生成的事件关联。
    - **Artifact 方法：** `load_artifact(filename)` 和 `save_artifact(filename, part)` 方法用于与配置的 `artifact_service` 交互。
    - 直接访问 `user_content`。

{{% alert context="info" %}}

在 Python 和 TypeScript 中，`CallbackContext` 和 `ToolContext` 已被 `Context` 类型取代。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 示例：回调接收上下文（CallbackContext 已统一为 Context）
from google.adk.agents.context import Context
from google.adk.models import LlmRequest
from google.genai import types
from typing import Optional

def my_before_model_cb(context: Context, request: LlmRequest) -> Optional[types.Content]:
    # 读/写状态示例
    call_count = context.state.get("model_calls", 0)
    context.state["model_calls"] = call_count + 1 # Modify state (tracks delta)

    # 可选加载一个 Artifact
    # config_part = context.load_artifact("model_config.json")
    print(f"Preparing model call #{call_count + 1} for invocation {context.invocation_id}")
    return None # Allow model call to proceed
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "fmt"

  "google.golang.org/adk/v2/agent"
  "google.golang.org/adk/v2/model"
)

// 伪代码：回调接收 CallbackContext
func myBeforeModelCb(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
	// 读/写状态示例
	callCount, err := ctx.State().Get("model_calls")
	if err != nil {
		callCount = 0 // Default value
	}
	newCount := callCount.(int) + 1
	if err := ctx.State().Set("model_calls", newCount); err != nil {
		return nil, err
	}

	// 可选加载一个 Artifact
	// configPart, err := ctx.Artifacts().Load("model_config.json")
	fmt.Printf("Preparing model call #%d for invocation %s\n", newCount, ctx.InvocationID())
	return nil, nil // Allow model call to proceed
}
```

{{% /tab %}}
{{< /tabs >}}
### `ToolContext` {#toolcontext}
- **使用场景:** 作为 `tool_context` 传递给支持 `FunctionTool` 的函数以及工具执行回调（`before_tool_callback`, `after_tool_callback`）。
- **目的:** 提供 `CallbackContext` 所具备的全部功能，加上工具执行所必需的专门方法，例如处理认证、搜索内存和列出 Artifact。
- **关键功能（在 `CallbackContext` 基础上增加）:**
    - **认证方法:** `request_credential(auth_config)` 用于触发认证流程，`get_auth_response(auth_config)` 用于获取用户/系统提供的凭证。
    - **Artifact 列出:** `list_artifacts()` 用于发现会话中可用的 Artifact。
    - **内存搜索:** `search_memory(query)` 用于查询配置的 `memory_service`。
    - **`function_call_id` 属性:** 确认触发此工具执行的 LLM 具体函数调用，对于正确关联认证请求或响应至关重要。
    - **`actions` 属性:** 直接访问此步骤的 `EventActions` 对象，允许工具发出状态变更、认证请求等信号。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：工具函数接收 ToolContext
    from google.adk.tools import ToolContext
    from typing import Dict, Any

    # 假设此函数被 FunctionTool 包装
    def search_external_api(query: str, tool_context: ToolContext) -> Dict[str, Any]:
        api_key = tool_context.state.get("api_key")
        if not api_key:
            # 定义所需的认证配置
            # auth_config = AuthConfig(...)
            # tool_context.request_credential(auth_config) # 请求凭据
            # 使用 'actions' 属性表示已发出认证请求
            # tool_context.actions.requested_auth_configs[tool_context.function_call_id] = auth_config
            return {"status": "Auth Required"}

        # 使用 API 密钥...
        print(f"Tool executing for query '{query}' using API key. Invocation: {tool_context.invocation_id}")

        # 可选地搜索内存或列出 Artifact
        # relevant_docs = tool_context.search_memory(f"与 {query} 相关的信息")
        # available_files = tool_context.list_artifacts()

        return {"result": f"Data for {query} fetched."}
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import "google.golang.org/adk/v2/tool"

    // 伪代码：接收 ToolContext 的工具函数
    type searchExternalAPIArgs struct {
    	Query string `json:"query" jsonschema:"The query to search for."`
    }

    func searchExternalAPI(tc agent.Context, input searchExternalAPIArgs) (string, error) {
    	apiKey, err := tc.State().Get("api_key")
    	if err != nil || apiKey == "" {
    		// 在实际场景中，您将在此处定义并请求凭据。
    		// 这是一个概念性占位符。
    		return "", fmt.Errorf("auth required")
    	}

    	// 使用 API 密钥...
    	fmt.Printf("Tool executing for query '%s' using API key. Invocation: %s\n", input.Query, tc.InvocationID())

    	// 可选地搜索内存或列出 Artifact
    	// relevantDocs, _ := tc.SearchMemory(tc, "与 %s 相关的信息", input.Query))
    	// availableFiles, _ := tc.Artifacts().List()

    	return fmt.Sprintf("Data for %s fetched.", input.Query), nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
理解这些不同的上下文对象以及何时使用它们是有效管理状态、访问服务和控制 ADK 应用程序流程的关键。

## 使用上下文的常见任务 {#common-tasks-using-context}

既然你已经了解了不同的上下文对象，让我们集中讨论在构建 Agent 和工具时如何使用它们来完成常见任务。

### 访问信息 {#access-information}

你经常需要读取存储在上下文中的信息。

*   **读取会话状态：** 访问在先前步骤或用户/应用程序级设置中保存的数据。在`state`属性上使用字典式访问。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：在工具函数中
    from google.adk.tools import ToolContext

    def my_tool(tool_context: ToolContext, **kwargs):
        user_pref = tool_context.state.get("user_display_preference", "default_mode")
        api_endpoint = tool_context.state.get("app:api_endpoint") # Read app-level state

        if user_pref == "dark_mode":
            # ... 应用深色模式逻辑 ...
            pass
        print(f"Using API endpoint: {api_endpoint}")
        # ... 工具的其余逻辑 ...

    # 示例：在回调函数中
    from google.adk.agents.context import Context

    def my_callback(context: Context, **kwargs):
        last_tool_result = context.state.get("temp:last_api_result") # Read temporary state
        if last_tool_result:
            print(f"Found temporary result from last tool: {last_tool_result}")
        # ... 回调逻辑 ...
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
    	"google.golang.org/adk/v2/agent"
    	"google.golang.org/adk/v2/session"
        "google.golang.org/adk/v2/tool"
    	"google.golang.org/genai"
    )

    // 伪代码：在一个工具函数中
    type toolArgs struct {
    	// 在此定义工具特定的参数
    }

    type toolResults struct {
    	// 在此定义工具特定的结果
    }

    // 示例工具函数演示状态访问
    func myTool(tc agent.Context, input toolArgs) (toolResults, error) {
    	userPref, err := tc.State().Get("user_display_preference")
    	if err != nil {
    		userPref = "default_mode"
    	}
    	apiEndpoint, _ := tc.State().Get("app:api_endpoint") // Read app-level state

    	if userPref == "dark_mode" {
    		// ... 应用深色模式逻辑 ...
    	}
    	fmt.Printf("Using API endpoint: %v\n", apiEndpoint)
    	// ... 工具的其余逻辑 ...
    	return toolResults{}, nil
    }

    // 伪代码：在一个回调函数中
    func myCallback(ctx agent.Context) (*genai.Content, error) {
    	lastToolResult, err := ctx.State().Get("temp:last_api_result") // Read temporary state
    	if err == nil {
    		fmt.Printf("Found temporary result from last tool: %v\n", lastToolResult)
    	} else {
    		fmt.Println("No temporary result found.")
    	}
    	// ... 回调逻辑 ...
    	return nil, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **获取当前标识符:** 对于基于当前操作的日志记录或自定义逻辑很有用。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：在任何上下文中（显示 ToolContext）
    from google.adk.tools import ToolContext

    def log_tool_usage(tool_context: ToolContext, **kwargs):
        agent_name = tool_context.agent_name
        inv_id = tool_context.invocation_id
        func_call_id = getattr(tool_context, 'function_call_id', 'N/A') # Specific to ToolContext

        print(f"Log: Invocation={inv_id}, Agent={agent_name}, FunctionCallID={func_call_id} - Tool Executed.")
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import "google.golang.org/adk/v2/tool"

    // 伪代码：在任何上下文中（显示ToolContext）
    type logToolUsageArgs struct{}
    type logToolUsageResult struct {
    	Status string `json:"status"`
    }

    func logToolUsage(tc agent.Context, args logToolUsageArgs) (logToolUsageResult, error) {
    	agentName := tc.AgentName()
    	invID := tc.InvocationID()
    	funcCallID := tc.FunctionCallID()

    	fmt.Printf("Log: Invocation=%s, Agent=%s, FunctionCallID=%s - Tool Executed.\n", invID, agentName, funcCallID)
    	return logToolUsageResult{Status: "Logged successfully"}, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **访问初始用户输入：** 回到启动当前调用的消息。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：在回调中
    from google.adk.agents.context import Context

    def check_initial_intent(context: Context, **kwargs):
        initial_text = "N/A"
        if context.user_content and context.user_content.parts:
            initial_text = context.user_content.parts[0].text or "Non-text input"

        print(f"This invocation started with user input: '{initial_text}'")

    # 示例：在 Agent 的 _run_async_impl 中
    # async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
    #     if ctx.user_content and ctx.user_content.parts:
    #         initial_text = ctx.user_content.parts[0].text
    #         print(f"Agent 逻辑记住初始查询：{initial_text}")
    #     ...
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
    	"fmt"

    	"google.golang.org/adk/v2/agent"
    	"google.golang.org/genai"
    )

    // 伪代码：在回调中
    func logInitialUserInput(ctx agent.Context) (*genai.Content, error) {
    	userContent := ctx.UserContent()
    	if userContent != nil && len(userContent.Parts) > 0 {
    		if text := userContent.Parts[0].Text; text != "" {
    			fmt.Printf("User's initial input for this turn: '%s'\n", text)
    		}
    	}
    	return nil, nil // No modification
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
### 管理状态 {#manage-state}

状态对于内存和数据流至关重要。当你使用 `CallbackContext` 或 `ToolContext` 修改状态时，框架会自动跟踪并持久化这些更改。

*   **工作原理:** 写入 `callback_context.state['my_key'] = my_value` 或 `tool_context.state['my_key'] = my_value` 会将此更改添加到与当前步骤事件关联的 `EventActions.state_delta` 中。`SessionService` 然后在持久化事件时应用这些增量。

*  **在工具之间传递数据**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：工具 1 - 获取用户 ID
    from google.adk.tools import ToolContext
    import uuid

    def get_user_profile(tool_context: ToolContext) -> dict:
        user_id = str(uuid.uuid4()) # Simulate fetching ID
        # 将 ID 保存到状态以供下一个工具使用
        tool_context.state["temp:current_user_id"] = user_id
        return {"profile_status": "ID generated"}

    # 示例：工具 2 - 使用状态中的用户 ID
    def get_user_orders(tool_context: ToolContext) -> dict:
        user_id = tool_context.state.get("temp:current_user_id")
        if not user_id:
            return {"error": "User ID not found in state"}

        print(f"Fetching orders for user ID: {user_id}")
        # ... 使用 user_id 获取订单的逻辑 ...
        return {"orders": ["order123", "order456"]}
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import "google.golang.org/adk/v2/tool"

    // 伪代码：工具1 - 获取用户ID
    type GetUserProfileArgs struct {
    }

    func getUserProfile(tc agent.Context, input GetUserProfileArgs) (string, error) {
    	// 演示用途的随机用户ID
    	userID := "random_user_456"

    	// 将 ID 保存到状态以供下一个工具使用
    	if err := tc.State().Set("temp:current_user_id", userID); err != nil {
    		return "", fmt.Errorf("failed to set user ID in state: %w", err)
    	}
    	return "ID generated", nil
    }

    // 伪代码：工具2 - 使用状态中的用户ID
    type GetUserOrdersArgs struct {
    }

    type getUserOrdersResult struct {
    	Orders []string `json:"orders"`
    }

    func getUserOrders(tc agent.Context, input GetUserOrdersArgs) (*getUserOrdersResult, error) {
    	userID, err := tc.State().Get("temp:current_user_id")
    	if err != nil {
    		return &getUserOrdersResult{}, fmt.Errorf("user ID not found in state")
    	}

    	fmt.Printf("Fetching orders for user ID: %v\n", userID)
    	// ... 使用 user_id 获取订单的逻辑 ...
    	return &getUserOrdersResult{Orders: []string{"order123", "order456"}}, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **更新用户偏好：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：工具或回调识别一个偏好
    from google.adk.tools import ToolContext # Or Context

    def set_user_preference(tool_context: ToolContext, preference: str, value: str) -> dict:
        # 使用 'user:' 前缀来表示用户级状态（如果使用持久会话服务）
        state_key = f"user:{preference}"
        tool_context.state[state_key] = value
        print(f"Set user preference '{preference}' to '{value}'")
        return {"status": "Preference updated"}
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import "google.golang.org/adk/v2/tool"

    // 伪代码：工具或回调识别偏好
    type setUserPreferenceArgs struct {
    	Preference string `json:"preference" jsonschema:"The name of the preference to set."`
    	Value      string `json:"value" jsonschema:"The value to set for the preference."`
    }

    type setUserPreferenceResult struct {
    	Status string `json:"status"`
    }

    func setUserPreference(tc agent.Context, args setUserPreferenceArgs) (setUserPreferenceResult, error) {
    	// 使用 'user:' 前缀来表示用户级状态（如果使用持久会话服务）
    	stateKey := fmt.Sprintf("user:%s", args.Preference)
    	if err := tc.State().Set(stateKey, args.Value); err != nil {
    		return setUserPreferenceResult{}, fmt.Errorf("failed to set preference in state: %w", err)
    	}
    	fmt.Printf("Set user preference '%s' to '%s'\n", args.Preference, args.Value)
    	return setUserPreferenceResult{Status: "Preference updated"}, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
*   **状态前缀:** 虽然基本状态是会话特定的，但像 `app:` 和 `user:` 这样的前缀可以与持久的 `SessionService` 实现（例如 `DatabaseSessionService` 或 `VertexAiSessionService`）结合使用，以表示更广泛的范围（应用程序范围或跨会话的用户范围）。`temp:` 可以表示仅在当前调用中相关的数据。

### 使用 Artifact {#work-with-artifacts}

使用 Artifact 来处理与会话相关的文件或大型数据块。常见用例：处理上传的文档。

*   **文档摘要示例流程:**

    1.  **摄取参考（例如在设置工具或回调中）：** 将文档的*路径或 URI*保存为 Artifact，而不是整个内容。

        {{< tabs tabTotal="2" >}}
        {{% tab tabName="Python" %}}

           ```python
           # 示例：在回调或初始工具中
           from google.adk.agents.context import Context # Or ToolContext
           from google.genai import types

           async def save_document_reference(context: Context, file_path: str) -> None:
               # 假设 file_path 类似于 "gs://my-bucket/docs/report.pdf" 或 "/local/path/to/report.pdf"
               try:
                   # 创建一个包含路径/URI 文本的部分
                   artifact_part = types.Part.from_text(text=file_path)
                   version = await context.save_artifact("document_to_summarize.txt", artifact_part)
                   print(f"Saved document reference '{file_path}' as artifact version {version}")
                   # 如果其他工具需要，将文件名存储在状态中
                   context.state["temp:doc_artifact_name"] = "document_to_summarize.txt"
               except ValueError as e:
                   print(f"Error saving artifact: {e}") # E.g., Artifact service not configured
               except Exception as e:
                   print(f"Unexpected error saving artifact reference: {e}")

           # 使用示例：
           # save_document_reference(context, "gs://my-bucket/docs/report.pdf")
           ```

        {{% /tab %}}
        {{% tab tabName="Go" %}}

        ```go
        import (
        	"google.golang.org/adk/v2/tool"
        	"google.golang.org/genai"
        )

        // 将 saveDocumentReference 回调改编为这个示例的工具。
        type saveDocRefArgs struct {
        	FilePath string `json:"file_path" jsonschema:"The path to the file to save."`
        }

        type saveDocRefResult struct {
        	Status string `json:"status"`
        }

        func saveDocRef(tc agent.Context, args saveDocRefArgs) (saveDocRefResult, error) {
        	artifactPart := genai.NewPartFromText(args.FilePath)
        	_, err := tc.Artifacts().Save(tc, "document_to_summarize.txt", artifactPart)
        	if err != nil {
        		return saveDocRefResult{}, err
        	}
        	fmt.Printf("Saved document reference '%s' as artifact\n", args.FilePath)
        	if err := tc.State().Set("temp:doc_artifact_name", "document_to_summarize.txt"); err != nil {
        		return saveDocRefResult{}, fmt.Errorf("failed to set artifact name in state")
        	}
        	return saveDocRefResult{"Reference saved"}, nil
        }
        ```

        {{% /tab %}}
        {{< /tabs >}}
    2.  **摘要工具:** 加载 Artifact 以获取路径/URI，使用适当的库读取实际文档内容，进行摘要，并返回结果。

        {{< tabs tabTotal="2" >}}
        {{% tab tabName="Python" %}}

        ```python
        # 示例：在 Summarizer 工具功能中
        from google.adk.tools import ToolContext
        from google.genai import types
        # 假设可以使用像 google.cloud.storage 或内置的 open 这样的库
        # 假设存在一个 'summarize_text' 函数
        # from my_summarizer_lib import summarize_text

        async def summarize_document_tool(tool_context: ToolContext) -> dict:
            artifact_name = tool_context.state.get("temp:doc_artifact_name")
            if not artifact_name:
                return {"error": "Document artifact name not found in state."}

            try:
                # 1. 加载包含路径/URI 的 Artifact 部分
                artifact_part = await tool_context.load_artifact(artifact_name)
                if not artifact_part or not artifact_part.text:
                    return {"error": f"Could not load artifact or artifact has no text path: {artifact_name}"}

                file_path = artifact_part.text
                print(f"Loaded document reference: {file_path}")

                # 2. 读取实际文档内容（在 ADK 上下文之外）
                document_content = ""
                if file_path.startswith("gs://"):
                    # 示例：使用 GCS 客户端库下载/读取
                    pass # Replace with actual GCS reading logic
                elif file_path.startswith("/"):
                     # 示例：使用本地文件系统
                     with open(file_path, 'r', encoding='utf-8') as f:
                         document_content = f.read()
                else:
                    return {"error": f"Unsupported file path scheme: {file_path}"}

                # 3. 总结内容
                if not document_content:
                     return {"error": "Failed to read document content."}

                # summary = summarize_text(document_content) # 调用你的摘要逻辑
                summary = f"Summary of content from {file_path}" # Placeholder

                return {"summary": summary}

            except ValueError as e:
                 return {"error": f"Artifact service error: {e}"}
            except FileNotFoundError:
                 return {"error": f"Local file not found: {file_path}"}
        ```

        {{% /tab %}}
        {{% tab tabName="Go" %}}

        ```go
        import "google.golang.org/adk/v2/tool"

        // 伪代码：在摘要工具函数中
        type summarizeDocumentArgs struct{}

        type summarizeDocumentResult struct {
        	Summary string `json:"summary"`
        }

        func summarizeDocumentTool(tc agent.Context, input summarizeDocumentArgs) (summarizeDocumentResult, error) {
        	artifactName, err := tc.State().Get("temp:doc_artifact_name")
        	if err != nil {
        		return summarizeDocumentResult{}, fmt.Errorf("No document artifact name found in state")
        	}

        	// 1. 加载包含路径/URI 的 Artifact 部分
        	artifactPart, err := tc.Artifacts().Load(tc, artifactName.(string))
        	if err != nil {
        		return summarizeDocumentResult{}, err
        	}

        	if artifactPart.Part.Text == "" {
        		return summarizeDocumentResult{}, fmt.Errorf("Could not load artifact or artifact has no text path.")
        	}
        	filePath := artifactPart.Part.Text
        	fmt.Printf("Loaded document reference: %s\n", filePath)

        	// 2. 读取实际文档内容（在 ADK 上下文之外）
        	// 在实际实现中，你会使用 GCS 客户端或本地文件读取器。
        	documentContent := "This is the fake content of the document at " + filePath
        	_ = documentContent // Avoid unused variable error.

        	// 3. 总结内容
        	summary := "Summary of content from " + filePath // Placeholder

        	return summarizeDocumentResult{Summary: summary}, nil
        }
        ```

        {{% /tab %}}
        {{< /tabs >}}
*   **列出 Artifact:** 发现可用的文件。

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    # 示例：在工具功能中
    from google.adk.tools import ToolContext

    async def check_available_docs(tool_context: ToolContext) -> dict:
        try:
            artifact_keys = await tool_context.list_artifacts()
            print(f"Available artifacts: {artifact_keys}")
            return {"available_docs": artifact_keys}
        except ValueError as e:
            return {"error": f"Artifact service error: {e}"}
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import "google.golang.org/adk/v2/tool"

    // 伪代码：在工具函数中
    type checkAvailableDocsArgs struct{}

    type checkAvailableDocsResult struct {
    	AvailableDocs []string `json:"available_docs"`
    }

    func checkAvailableDocs(tc agent.Context, args checkAvailableDocsArgs) (checkAvailableDocsResult, error) {
    	artifactKeys, err := tc.Artifacts().List(tc)
    	if err != nil {
    		return checkAvailableDocsResult{}, err
    	}
    	fmt.Printf("Available artifacts: %v\n", artifactKeys)
    	return checkAvailableDocsResult{AvailableDocs: artifactKeys.FileNames}, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}
### 处理工具认证 {#handle-tool-authentication}

支持版本：Python v0.1.0。

安全管理工具所需的 API 密钥或其他凭证。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 示例：需要认证的工具
from google.adk.tools import ToolContext
from google.adk.auth import AuthConfig # Assume appropriate AuthConfig is defined

# 定义所需的认证配置（例如，OAuth、API 密钥）
MY_API_AUTH_CONFIG = AuthConfig(...)
AUTH_STATE_KEY = "user:my_api_credential" # Key to store retrieved credential

def call_secure_api(tool_context: ToolContext, request_data: str) -> dict:
    # 1. 检查状态中是否已有凭证
    credential = tool_context.state.get(AUTH_STATE_KEY)

    if not credential:
        # 2. 如果没有，请求凭证
        print("Credential not found, requesting...")
        try:
            tool_context.request_credential(MY_API_AUTH_CONFIG)
            # 框架会处理事件的生成。此轮工具执行在此处停止。
            return {"status": "Authentication required. Please provide credentials."}
        except ValueError as e:
            return {"error": f"Auth error: {e}"} # e.g., function_call_id missing
        except Exception as e:
            return {"error": f"Failed to request credential: {e}"}

    # 3. 如果凭证存在（可能是在之前请求后获得的）
    #    或者如果这是在外部完成认证流程后的后续调用
    try:
        # 如果需要，可选择重新验证/获取，或者直接使用
        # 如果外部流程刚完成，这可能会获取凭证
        auth_credential_obj = tool_context.get_auth_response(MY_API_AUTH_CONFIG)
        api_key = auth_credential_obj.api_key # Or access_token, etc.

        # 将其存回状态，以便会话内的后续调用使用
        tool_context.state[AUTH_STATE_KEY] = auth_credential_obj.model_dump() # Persist retrieved credential

        print(f"Using retrieved credential to call API with data: {request_data}")
        # ... 使用 api_key 进行实际的 API 调用 ...
        api_result = f"API result for {request_data}"

        return {"result": api_result}
    except Exception as e:
        # 处理获取/使用凭证时的错误
        print(f"Error using credential: {e}")
        # 如果凭证无效，是否清除状态键？
        # tool_context.state[AUTH_STATE_KEY] = None
        return {"error": "Failed to use credential"}
```

{{% /tab %}}
{{< /tabs >}}
*记住：`request_credential` 会暂停工具并提示需要认证。用户/系统提供凭据，在随后调用中，`get_auth_response`（或再次检查状态）允许工具继续操作。* `tool_context.function_call_id` 由框架隐式使用，用于关联请求和响应。

### 利用记忆 {#leveraging-memory}

支持版本：Python v0.1.0。

从过去或外部来源获取相关信息。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 示例：使用内存搜索的工具
from google.adk.tools import ToolContext

async def find_related_info(tool_context: ToolContext, topic: str) -> dict:
    try:
        search_results = await tool_context.search_memory(f"Information about {topic}")
        if search_results.memories:
            print(f"Found {len(search_results.memories)} memory results for '{topic}'")
            # 处理 search_results.memories（它们是 MemoryEntry 对象）
            top_entry = search_results.memories[0]
            top_result_text = next(
                (part.text for part in (top_entry.content.parts or []) if part.text),
                "",
            )
            return {"memory_snippet": top_result_text}
        else:
            return {"message": "No relevant memories found."}
    except ValueError as e:
        return {"error": f"Memory service error: {e}"} # e.g., Service not configured
    except Exception as e:
        return {"error": f"Unexpected error searching memory: {e}"}
```

{{% /tab %}}
{{< /tabs >}}
### 渲染 UI 小部件 {#render-ui-widgets}

支持版本：Python v1.27.0。

要在向客户端发送 Agent 响应的同时发送丰富的 UI 组件（例如 MCP 应用 iframe），请使用 `context.render_ui_widget()`。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.events.ui_widget import UiWidget
from google.adk.tools import ToolContext

def render_styled_widget(color: str, context: ToolContext) -> str:
    """Render a UI widget utilizing the user-specified color."""

    widget = UiWidget(
        id="my_status_dashboard",
        provider="mcp",
        payload={
            "resource_uri": "ui://analytics/status",
            "tool": {"name": "get_system_status"},
            "tool_args": {"theme_color": color} # Dynamically passed from user interaction
        }
    )

    context.render_ui_widget(widget)
    return f"Widget successfully rendered with color: {color}"
```

{{% /tab %}}
{{< /tabs >}}
### 高级：直接使用 `InvocationContext` {#advanced-direct-invocationcontext-usage}

支持版本：Python v0.1.0。

虽然大多数交互是通过 `CallbackContext` 或 `ToolContext` 进行的，但有时 Agent 的核心逻辑需要直接访问，例如在 Python 中使用 `_run_async_impl` 或 `_run_live_impl`，或在 TypeScript、Java 和 Kotlin 中使用 `runAsyncImpl`。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 示例：在 Agent 的 _run_async_impl 内部
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types
from typing import AsyncGenerator

class MyControllingAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        # 示例：检查特定服务是否可用
        if not ctx.memory_service:
            print("Memory service is not available for this invocation.")
            # 可能更改 Agent 行为

        # 示例：基于某些条件的提前终止
        if ctx.session.state.get("critical_error_flag"):
            print("Critical error detected, ending invocation.")
            ctx.end_invocation = True # Signal framework to stop processing
            yield Event(
            author=self.name,
            invocation_id=ctx.invocation_id,
            content=types.Content(
                role="model",
                parts=[types.Part(text="Stopping due to critical error.")],
            ),
        )
            return # Stop this agent's execution

        # ... 正常的 Agent 处理 ...
        yield # ... event ...
```

{{% /tab %}}
{{< /tabs >}}
将调用结束标志设置为 **True** 是一种从 Agent 或其回调或工具中通过各自的上下文对象优雅地停止整个请求-响应周期的方法，这些对象也可以访问并修改底层 `InvocationContext` 的标志。具体而言，在 Python 中使用 `ctx.end_invocation = True`，在 TypeScript 中使用 `ctx.endInvocation = true`，在 Java 中使用 `ctx.setEndInvocation(true)`，在 Kotlin 中使用 `context.isEndOfInvocation = true` 或 `context.endInvocation()`。

## 关键要点与最佳实践 {#key-takeaways--best-practices}

*   **使用正确的上下文：** 始终使用提供的最具体的上下文对象（工具/工具回调中使用 `ToolContext`，Agent/模型回调中使用 `CallbackContext`，适用时使用 `ReadonlyContext`）。仅在必要时在 `_run_async_impl` / `_run_live_impl` 中直接使用完整的 `InvocationContext`（`ctx`）。
*   **数据流的状态：** `context.state` 是在一次调用中共享数据、记住偏好和管理对话记忆的主要方式。在使用持久存储时，请谨慎使用前缀（`app:`、`user:`、`temp:`）。
*   **文件 Artifact：** 使用 `context.save_artifact` 和 `context.load_artifact` 来管理文件引用（如路径或 URI）或较大的数据块。存储引用，按需加载内容。
*   **跟踪更改：** 通过上下文方法对状态或 Artifact 所做的修改会自动链接到当前步骤的 `EventActions`，由 `SessionService` 处理。
*   **用户界面渲染：** 使用 `context.render_ui_widget(widget)` 向客户端发送丰富的 UI 组件（如 MCP App iframe）。
*   **从简单开始：** 首先关注 `state` 和基本的 Artifact 使用。随着需求的增加，再探索身份验证、记忆以及高级 `InvocationContext` 字段（如用于实时流的字段）。

通过理解并有效使用这些上下文对象，您可以构建更复杂的、有状态的、高能力的 Agent，使用 ADK。

---

原文：[Agent context](https://adk.dev/context/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/context/index.md)
