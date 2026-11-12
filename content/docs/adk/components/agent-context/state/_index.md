---
title: "状态"
description: "在每个 `Session`（我们的对话线程）中，**`state`** 属性就像是 Agent 在特定交互中的专用便签。虽然 `session.events` 保存完整的历史记录，但 `session.state` 是存放"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0， Go v0.1.0。

在每个`Session`（我们的对话线程）中，**`state`**属性就像 Agent 专门为该互动准备的临时记录。虽然`session.events`保存完整的历史，但`session.state`是 Agent 存储和更新对话中*在*对话中*所需的动态细节的地方。

## `session.state`是什么？ {#what-is-sessionstate}

从概念上讲，`session.state` 是一个包含键值对的集合（字典或地图）。它的设计用于 Agent 需要回忆或跟踪的信息，使当前对话更有效：

* **个性化互动：** 记住前面提到的用户偏好（例如`'user_preference_theme': 'dark'`）。
* **跟踪任务进展：** 跟踪多回合流程中的步骤（例如`'booking_step': 'confirm_payment'`）。
* **收集信息：** 构建列表或摘要（例如`'shopping_cart_items': ['book', 'pen']`）。
* **做出明智决策：** 存储影响下一个响应的标志或值（例如，`'user_is_authenticated': True`）。

### `State`的主要特征 {#key-characteristics-of-state}

1. **结构：可序列化的键值对**

    * 数据存储为`key: value`。
    * ** 键：** 始终是字符串（`str`）。使用清晰的名称（例如，`'departure_city'`，`'user:language_preference'`）。
    * **Values：** 必须是**可序列化**的。这意味着它们可以被`SessionService`轻松保存和加载。坚持使用特定语言（Python/Go/Java/TypeScript）中的基础类型，比如字符串、数字、布尔值，以及仅包含这些基本类型的简单列表或词典。（具体细节请参见 API 文档）。
    * ** ⚠️ 避免复杂对象：** ** ** 不要直接在状态中存储不可序列化的对象（自定义类实例、函数、连接等）。如有需要，存储简单标识符，并在其他地方检索复杂对象。

2. **可变性：它会变化**

    * 随着讨论的发展，预计`state`内容将有所变化。

3. **坚持：取决于`SessionService`**

    * 州是否能在申请重启后存活取决于你选择的服务：

      * `InMemorySessionService`：**不持久。** 重启时状态丢失。
      * `DatabaseSessionService` / `VertexAiSessionService`：**持久性。** 状态保存可靠。

{{% alert context="default" %}}
原语的具体参数或方法名称可能因SDK语言而略有差异（例如，Python 中的`session.state['current_intent'] = 'book_flight'`，Go 中的`context.State().Set("current_intent", "book_flight")`，Java中的`session.state().put("current_intent", "book_flight)`，或TypeScript中的`context.state.set("current_intent", "book_flight")`）。详情请参阅语言特定的 API 文档。
{{% /alert %}}
### 组织州语前缀：范围至关重要 {#organizing-state-with-prefixes-scope-matters}

状态键的前缀定义了它们的作用域和持久性行为，尤其是在持久服务中：

* **无前缀（会话状态）:**    * **范围：** 特定于 *当前* 会话 (`id`)。
    * **持久性：** 仅在 `SessionService` 是持久时才会持久 (`Database`, `VertexAI`)。
    * **使用场景：** 跟踪当前任务的进度（例如 `'current_booking_step'`）、此交互的临时标志（例如 `'needs_clarification'`）。
    * **示例：** `session.state['current_intent'] = 'book_flight'`

* **`user:` 前缀（用户状态）：**

    * **范围：** 与 `user_id` 绑定，在该用户的 *所有* 会话中共享（在相同的 `app_name` 内）。
    * **持久性：** 与 `Database` 或 `VertexAI` 一起持久存储。（由 `InMemory` 存储，但重启后会丢失）。
    * **使用场景：** 用户偏好（例如 `'user:theme'`）、个人资料详情（例如 `'user:name'`）。
    * **无会话时读取：** 在 Python 中，`await session_service.get_user_state(app_name=..., user_id=...)` 返回用户范围的键，并去掉 `user:` 前缀，因此可以在会话存在之前读取它们。`VertexAiSessionService` 是例外：它总是抛出 `NotImplementedError`，因为 Agent Runtime API 不会在没有会话的情况下独立暴露用户状态。在这种情况下，使用 `list_sessions` 列出会话，并对每个结果调用 `get_session`。
    * **示例：** `session.state['user:preferred_language'] = 'fr'`

* **`app:` 前缀（应用状态）：**

    * **范围：** 与 `app_name` 绑定，在该应用的 *所有* 用户和会话中共享。
    * **持久性：** 与 `Database` 或 `VertexAI` 一起持久存储。（由 `InMemory` 存储，但重启后会丢失）。
    * **使用场景：** 全局设置（例如 `'app:api_endpoint'`）、共享模板。
    * **示例：** `session.state['app:global_discount_code'] = 'SAVE10'`

* **`temp:` 前缀（临时调用状态）：**

    * **范围：** 特定于当前 **调用**（从 Agent 接收用户输入到生成该输入的最终输出的整个过程）。
    * **持久性：** **不持久。** 调用完成后即被丢弃，不会延续到下一次调用。
    * **使用场景：** 存储中间计算结果、标志或单次调用中工具调用之间传递的数据。
    * **不适用情况：** 需要跨不同调用持久的信息，例如用户偏好、会话历史摘要或累积数据。
    * **示例：** `session.state['temp:raw_api_response'] = {...}`

{{% alert context="info" %}}
**子 Agent 和调用上下文**当父 Agent 调用子 Agent（例如，使用 `SequentialAgent` 或 `ParallelAgent`）时，它会将其 `InvocationContext` 传递给子 Agent。这意味着整个 Agent 调用链共享相同的调用 ID，因此也共享相同的 `temp:` 状态。
{{% /alert %}}
**Agent 看到的情况：** 您的 Agent 代码通过单个 `session.state` 集合（字典/映射）与*组合*状态进行交互。`SessionService` 根据前缀处理从正确的底层存储中获取/合并状态。

### 在 Agent 指令中访问会话状态 {#accessing-session-state-in-agent-instructions}

在使用 `LlmAgent` 实例时，您可以直接使用简单的模板语法将会话状态值注入到 Agent 的指令字符串中。这使您能够创建动态且具有上下文感知的指令，而不仅仅依赖自然语言指令。

#### 使用 `{key}` 模板 {#using-key-templating}

要从会话状态注入值，请将所需状态变量的键放在大括号内：`{key}`。在将指令传递给 LLM 之前，框架会自动将此占位符替换为 `session.state` 中的相应值。

**示例：**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent

story_generator = LlmAgent(
    name="StoryGenerator",
    model="gemini-flash-latest",
    instruction="""Write a short story about a cat, focusing on the theme: {topic}."""
)

# 假设 session.state['topic'] 被设置为 "friendship"，LLM
# 将收到以下指令：
# "写一个关于猫的短篇故事，重点主题是：友谊。"
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func main() {
	ctx := context.Background()
	sessionService := session.InMemoryService()

	// 1. 使用带有“主题”状态的会话进行初始化。
	_, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName:   appName,
		UserID:    userID,
		SessionID: sessionID,
		State: map[string]any{
			"topic": "friendship",
		},
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}

	// 2. 创建一个包含 {topic} 占位符指令的 Agent。
	//    ADK 将自动从中注入“topic”的值
	//    在调用大型语言模型之前，将会话状态纳入指令中。
	model, err := gemini.NewModel(ctx, modelID, nil)
	if err != nil {
		log.Fatalf("Failed to create Gemini model: %v", err)
	}
	storyGenerator, err := llmagent.New(llmagent.Config{
		Name:        "StoryGenerator",
		Model:       model,
		Instruction: "Write a short story about a cat, focusing on the theme: {topic}.",
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          agent.Agent(storyGenerator),
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}
```

{{% /tab %}}
{{< /tabs >}}
#### 重要注意事项 {#important-considerations}

* 键存在性：确保你在指令字符串中引用的键存在于 session.state 中。如果键不存在，Agent 将抛出错误。要使用可能存在或不存在的键，可以在键后面加问号（?）（例如 {topic?}）。
* 数据类型：键对应的值应为字符串或可以轻松转换为字符串的类型。
* 字面花括号：`{key}` 语法匹配单花括号内的任何有效 Python 标识符。如果你的指令中需要字面花括号，例如用于 JSON 格式或模板语法，请使用 `InstructionProvider` 函数而非字符串（见下文）。

{{% alert context="info" %}}
**f 字符串与双花括号**

一些 ADK 示例在指令中使用 Python f 字符串，例如 `f"Topic: {{initial_topic}}"`。那些示例中的 `{{` 和 `}}` 是 **Python f 字符串转义**，而不是 ADK 语法。在运行时，Python 会将 `{{initial_topic}}` 转换为 `{initial_topic}`，ADK 随后将其视为普通状态变量占位符。如果你不使用 f 字符串，可直接使用单花括号 `{key}`。

{{% /alert %}}
#### 使用 `InstructionProvider` 实现完全控制 {#using-instructionprovider-for-full-control}

在某些情况下，你可能需要对指令字符串进行完全控制——例如当指令中包含本应解释为状态变量占位符的字面花括号（如 JSON 示例、模板语法）时。

为实现这一点，向 `instruction` 参数提供函数而非字符串。该函数称为 `InstructionProvider`。当使用 `InstructionProvider` 时，ADK **不会**尝试注入状态变量，返回的字符串将按原样传递给模型。

`InstructionProvider` 函数接收一个 `ReadonlyContext` 对象，如果你需要动态构建指令，可使用该对象访问会话状态或其他上下文信息。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent
from google.adk.agents.readonly_context import ReadonlyContext

# 这是一个指令提供者
def my_instruction_provider(context: ReadonlyContext) -> str:
    # 不会发生状态注入——花括号被视为普通文本。
    return 'Format your output as JSON: {"city": "<name>", "population": <number>}'

agent = LlmAgent(
    model="gemini-flash-latest",
    name="template_helper_agent",
    instruction=my_instruction_provider
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go

//  1. 这个 InstructionProvider 返回一个静态字符串。
//     因为它是一个提供者函数，ADK 不会尝试注入
//     状态，并且指令将原样传递给模型，
//     保留字面上的大括号。
func staticInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	return "This is an instruction with {{literal_braces}} that will not be replaced.", nil
}
```

{{% /tab %}}
{{< /tabs >}}
如果你想既使用 `InstructionProvider` *又* 在你的指令中注入状态，你可以使用 `inject_session_state` 实用函数。只有与有效状态变量名匹配的 `{key}` 占位符会被替换；其他文本（包括不匹配有效标识符的大括号）将保持原样。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.utils import instructions_utils

async def my_dynamic_instruction_provider(context: ReadonlyContext) -> str:
    template = "This is a {adjective} instruction. Use JSON like: {\"key\": \"value\"}."
    # 这将注入“形容词”状态变量。
    # JSON 大括号保持不变，因为它们的内容不是有效的标识符。
    return await instructions_utils.inject_session_state(template, context)

agent = LlmAgent(
    model="gemini-flash-latest",
    name="dynamic_template_helper_agent",
    instruction=my_dynamic_instruction_provider
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go

//  2. 这个 InstructionProvider 演示了如何手动注入状态
//     同时还保留字面上的大括号。它使用了 instructionutil 辅助工具。
func dynamicInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	template := "This is a {adjective} instruction with {{literal_braces}}."
	// 这将注入 'adjective' 状态变量，但保留字面上的大括号。
	return instructionutil.InjectSessionState(ctx, template)
}
```

{{% /tab %}}
{{< /tabs >}}
**直接注入的好处**

* 清晰性：明确指出指令中哪些部分是动态的，并基于会话状态。
* 可靠性：避免依赖 LLM 正确解释自然语言指令来访问状态。
* 可维护性：简化指令字符串，减少更新状态变量名称时出错的风险。

**与其他状态访问方法的关系**

此直接注入方法特定于 LlmAgent 指令。有关其他状态访问方法的更多信息，请参阅以下部分。

### 状态更新方式：推荐方法 {#how-state-is-updated-recommended-methods}

{{% alert context="info" %}}
**修改状态的正确方法**

当您需要更改会话状态时，正确且最安全的方法是 **直接修改传递给您的函数的 `Context` 上的 `state` 对象**（例如 `callback_context.state['my_key'] = 'new_value'`）。这被认为是以正确方式“直接操作状态”，因为框架会自动跟踪这些更改。

这与直接修改您从 `SessionService` 获取的 `Session` 对象上的 `state` 有本质不同（例如 `my_session.state['my_key'] = 'new_value'`）。**您应避免这样做**，因为这会绕过 ADK 的事件跟踪，可能导致数据丢失。本页末尾的“警告”部分对这一重要区别有更多细节说明。
{{% /alert %}}
状态应**始终**作为使用 `session_service.append_event()` 向会话历史中添加 `Event` 的一部分进行更新。这可确保更改被跟踪、持久性正常，以及更新是线程安全的。

**1\. 简便方法：`output_key`（用于 Agent 文本响应）**

这是将 Agent 的最终文本响应直接保存到状态的最简单方法。在定义您的 `LlmAgent` 时，指定 `output_key`：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService, Session
from google.adk.runners import Runner
from google.genai.types import Content, Part

# 使用 output_key 定义 Agent
greeting_agent = LlmAgent(
    name="Greeter",
    model="gemini-flash-latest", # Use a valid model
    instruction="Generate a short, friendly greeting.",
    output_key="last_greeting" # Save response to state['last_greeting']
)

# --- 设置 Runner 和会话 ---
app_name, user_id, session_id = "state_app", "user1", "session1"
session_service = InMemorySessionService()
runner = Runner(
    agent=greeting_agent,
    app_name=app_name,
    session_service=session_service
)
session = await session_service.create_session(app_name=app_name,
                                    user_id=user_id,
                                    session_id=session_id)
print(f"Initial state: {session.state}")

# --- 运行 Agent ---
# Agent 使用 output_key 将其响应放入事件的
# state_delta；Runner 将该事件传递给 append_event，
# 将 delta 应用于会话状态。
user_message = Content(parts=[Part(text="Hello")])
for event in runner.run(user_id=user_id,
                        session_id=session_id,
                        new_message=user_message):
    if event.is_final_response():
      print(f"Agent responded.") # Response text is also in event.content

# --- 检查更新后的状态 ---
updated_session = await session_service.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
print(f"State after agent run: {updated_session.state}")
# 预期输出可能包括：{'last_greeting': '你好！我今天能帮你什么吗？'}
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
//  1. GreetingAgent 演示了如何使用 `OutputKey` 来保存 Agent 的
//     将最终文本响应直接输入会话状态。
func greetingAgentExample(sessionService session.Service) {
	fmt.Println("--- Running GreetingAgent (output_key) Example ---")
	ctx := context.Background()

	modelGreeting, err := gemini.NewModel(ctx, modelID, nil)
	if err != nil {
		log.Fatalf("Failed to create Gemini model for greeting agent: %v", err)
	}
	greetingAgent, err := llmagent.New(llmagent.Config{
		Name:        "Greeter",
		Model:       modelGreeting,
		Instruction: "Generate a short, friendly greeting.",
		OutputKey:   "last_greeting",
	})
	if err != nil {
		log.Fatalf("Failed to create greeting agent: %v", err)
	}

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          agent.Agent(greetingAgent),
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	// 运行 Agent
	userMessage := genai.NewContentFromText("Hello", "user")
	for event, err := range r.Run(ctx, userID, sessionID, userMessage, agent.RunConfig{}) {
		if err != nil {
			log.Printf("Agent Error: %v", err)
			continue
		}
		if isFinalResponse(event) {
			if event.LLMResponse.Content != nil {
				fmt.Printf("Agent responded with: %q\n", textParts(event.LLMResponse.Content))
			} else {
				fmt.Println("Agent responded.")
			}
		}
	}

	// 检查更新的状态
	resp, err := sessionService.Get(ctx, &session.GetRequest{AppName: appName, UserID: userID, SessionID: sessionID})
	if err != nil {
		log.Fatalf("Failed to get session: %v", err)
	}
	lastGreeting, _ := resp.Session.State().Get("last_greeting")
	fmt.Printf("State after agent run: last_greeting = %q\n\n", lastGreeting)
}
```

{{% /tab %}}
{{< /tabs >}}
在幕后，Agent 本身使用 `output_key` 将响应写入 `EventActions` 的 `state_delta` 中在事件生成时；`Runner` 然后将该事件传递给 `SessionService` 的 `append_event`，后者应用该增量。

**2\. 标准方式：`EventActions.state_delta`（用于复杂更新）**

对于更复杂的场景（更新多个键、非字符串值、特定范围如 `user:` 或 `app:`，或与 Agent 最终文本不直接相关的更新），您可以在 `EventActions` 中手动构建 `state_delta`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.sessions import InMemorySessionService, Session
from google.adk.events import Event, EventActions
from google.genai.types import Part, Content
import time

# --- 设置 ---
session_service = InMemorySessionService()
app_name, user_id, session_id = "state_app_manual", "user2", "session2"
session = await session_service.create_session(
    app_name=app_name,
    user_id=user_id,
    session_id=session_id,
    state={"user:login_count": 0, "task_status": "idle"}
)
print(f"Initial state: {session.state}")

# --- 定义状态变化 ---
current_time = time.time()
state_changes = {
    "task_status": "active",              # Update session state
    "user:login_count": session.state.get("user:login_count", 0) + 1, # Update user state
    "user:last_login_ts": current_time,   # Add user state
    "temp:validation_needed": True        # Add temporary state (will be discarded)
}

# --- 创建带动作的事件 ---
actions_with_update = EventActions(state_delta=state_changes)
# 此事件可能表示内部系统操作，而不仅仅是 Agent 响应
system_event = Event(
    invocation_id="inv_login_update",
    author="system", # Or 'agent', 'tool' etc.
    actions=actions_with_update,
    timestamp=current_time
    # 内容可能为 None 或表示所执行的动作
)

# --- 追加事件（这将更新状态） ---
await session_service.append_event(session, system_event)
print("`append_event` called with explicit state delta.")

# --- 检查更新后的状态 ---
updated_session = await session_service.get_session(app_name=app_name,
                                            user_id=user_id,
                                            session_id=session_id)
print(f"State after event: {updated_session.state}")
# 预期: {'user:login_count': 1, 'task_status': 'active', 'user:last_login_ts': <timestamp>}
# 注意: 'temp:validation_needed' 不存在。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
//  2. manualStateUpdateExample 演示了如何创建一个带有显式的事件
//     状态更改（一个“state_delta”）以更新多个键，包括
//     带有 user- 和 temp- 前缀的那些。
func manualStateUpdateExample(sessionService session.Service) {
	fmt.Println("--- Running Manual State Update (EventActions) Example ---")
	ctx := context.Background()
	s, err := sessionService.Get(ctx, &session.GetRequest{AppName: appName, UserID: userID, SessionID: sessionID})
	if err != nil {
		log.Fatalf("Failed to get session: %v", err)
	}
	retrievedSession := s.Session

	// 定义状态变化
	loginCount, _ := retrievedSession.State().Get("user:login_count")
	newLoginCount := 1
	if lc, ok := loginCount.(int); ok {
		newLoginCount = lc + 1
	}

	stateChanges := map[string]any{
		"task_status":            "active",
		"user:login_count":       newLoginCount,
		"user:last_login_ts":     time.Now().Unix(),
		"temp:validation_needed": true,
	}

	// 创建一个具有状态更改的事件
	systemEvent := session.NewEvent(ctx, "inv_login_update")
	systemEvent.Author = "system"
	systemEvent.Actions.StateDelta = stateChanges

	// 将事件附加以更新状态
	if err := sessionService.AppendEvent(ctx, retrievedSession, systemEvent); err != nil {
		log.Fatalf("Failed to append event: %v", err)
	}
	fmt.Println("`append_event` called with explicit state delta.")

	// 检查更新的状态
	updatedResp, err := sessionService.Get(ctx, &session.GetRequest{AppName: appName, UserID: userID, SessionID: sessionID})
	if err != nil {
		log.Fatalf("Failed to get session: %v", err)
	}
	taskStatus, _ := updatedResp.Session.State().Get("task_status")
	loginCount, _ = updatedResp.Session.State().Get("user:login_count")
	lastLogin, _ := updatedResp.Session.State().Get("user:last_login_ts")
	temp, err := updatedResp.Session.State().Get("temp:validation_needed") // This should fail or be nil

	fmt.Printf("State after event: task_status=%q, user:login_count=%v, user:last_login_ts=%v\n", taskStatus, loginCount, lastLogin)
	if err != nil {
		fmt.Printf("As expected, temp state was not persisted: %v\n\n", err)
	} else {
		fmt.Printf("Unexpected temp state value: %v\n\n", temp)
	}
}
```

{{% /tab %}}
{{< /tabs >}}
**3. 通过 `CallbackContext` 或 `ToolContext`（推荐用于回调和工具）**

*(注意：在 Python 和 TypeScript 中，`CallbackContext` 和 `ToolContext` 已统一为单一的 `Context` 类型，在 Python 中两者名称仍可作为它的别名使用。)*

在 Agent 回调例如 `before_agent_callback` 和 `after_agent_callback`，或在工具函数中修改状态时，最好使用传入函数的 `CallbackContext` 或 `ToolContext` 的 `state` 属性进行操作。

*   `callback_context.state['my_key'] = my_value`
*   `tool_context.state['my_key'] = my_value`

这些上下文对象专门用于管理各自执行范围内的状态变化。当你修改 `context.state` 时，ADK 框架会确保这些变化被自动捕获，并正确地传入回调或工具生成事件的 `EventActions.state_delta` 中。然后，当事件被追加时，这个增量会由 `SessionService` 处理，从而确保正确的持久化和追踪。

这种方法抽象了在大多数常见回调和工具的状态更新场景中手动创建 `EventActions` 和 `state_delta`，使你的代码更简洁且错误率更低。

有关上下文对象的更多详细信息，请参阅 [上下文文档](/docs/adk/components/agent-context/)。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 在 Agent 回调或工具函数中
from google.adk.agents.callback_context import CallbackContext
# 或者等价地：from google.adk.tools.tool_context import ToolContext

def my_callback_or_tool_function(context: CallbackContext, # Or ToolContext
                                 # ... 其他参数 ...
                                ):
    # 更新现有状态
    count = context.state.get("user_action_count", 0)
    context.state["user_action_count"] = count + 1

    # 添加新状态
    context.state["temp:last_operation_status"] = "success"

    # 状态更改会自动成为事件的 state_delta 的一部分
    # ... 回调/工具逻辑的其余部分 ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
//  3. contextStateUpdateExample 演示了修改状态的推荐方法
//     使用提供的 `agent.Context` 从工具函数内部。
func contextStateUpdateExample(sessionService session.Service) {
	fmt.Println("--- Running Context State Update (ToolContext) Example ---")
	ctx := context.Background()

	// 定义修改状态的工具
	updateActionCountTool, err := functiontool.New(
		functiontool.Config{Name: "update_action_count", Description: "Updates the user action count in the state."},
		func(actx agent.Context, args struct{}) (struct{}, error) {
			s, err := actx.State().Get("user_action_count")
			if err != nil {
				log.Printf("could not get user_action_count: %v", err)
			}
			newCount := 1
			if c, ok := s.(int); ok {
				newCount = c + 1
			}
			if err := actx.State().Set("user_action_count", newCount); err != nil {
				log.Printf("could not set user_action_count: %v", err)
			}
			if err := actx.State().Set("temp:last_operation_status", "success from tool"); err != nil {
				log.Printf("could not set temp:last_operation_status: %v", err)
			}
			fmt.Println("Tool: Updated state via agent.Context.")
			return struct{}{}, nil
		},
	)
	if err != nil {
		log.Fatalf("Failed to create tool: %v", err)
	}

	// 定义一个使用该工具的 Agent
	modelTool, err := gemini.NewModel(ctx, modelID, nil)
	if err != nil {
		log.Fatalf("Failed to create Gemini model for tool agent: %v", err)
	}
	toolAgent, err := llmagent.New(llmagent.Config{
		Name:        "ToolAgent",
		Model:       modelTool,
		Instruction: "Use the update_action_count tool.",
		Tools:       []tool.Tool{updateActionCountTool},
	})
	if err != nil {
		log.Fatalf("Failed to create tool agent: %v", err)
	}

	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          agent.Agent(toolAgent),
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	// 运行 Agent 以触发工具
	userMessage := genai.NewContentFromText("Please update the action count.", "user")
	for _, err := range r.Run(ctx, userID, sessionID, userMessage, agent.RunConfig{}) {
		if err != nil {
			log.Printf("Agent Error: %v", err)
		}
	}

	// 检查更新的状态
	resp, err := sessionService.Get(ctx, &session.GetRequest{AppName: appName, UserID: userID, SessionID: sessionID})
	if err != nil {
		log.Fatalf("Failed to get session: %v", err)
	}
	actionCount, _ := resp.Session.State().Get("user_action_count")
	fmt.Printf("State after tool run: user_action_count = %v\n", actionCount)
}
```

{{% /tab %}}
{{< /tabs >}}
**`append_event` 的功能：**

* 将 `Event` 添加到 `session.events`。
* 从事件的 `actions` 中读取 `state_delta`。
* 将这些更改应用于由 `SessionService` 管理的状态，根据服务类型正确处理前缀和持久性。
* 更新会话的 `last_update_time`。
* 对支持的服务序列化对同一会话的并发更新：`DatabaseSessionService` 获取每会话锁，而 `InMemorySessionService` 不适合多线程使用。

### ⚠️ 关于直接修改状态的警告 {#a-warning-about-direct-state-modification}

避免直接修改从 `SessionService` 获取的 `Session` 对象上的 `session.state` 集合（字典/Map）（例如，通过 `session_service.get_session()` 或 `session_service.create_session()` 获得）*在*Agent 调用的管理生命周期之外（即，不通过 `CallbackContext` 或 `ToolContext`）。例如，像 `retrieved_session = await session_service.get_session(...); retrieved_session.state['key'] = value` 这样的代码是有问题的。

在回调或使用 `CallbackContext.state` 或 `ToolContext.state` 的工具中修改状态是确保更改被跟踪的正确方式，因为这些上下文对象处理与事件系统的必要集成。

**为什么强烈不建议直接修改（上下文之外）：**

1. **绕过事件历史记录：**更改不会作为 `Event` 被记录，失去可审计性。
2. **破坏持久性：**通过这种方式进行的更改 **很可能不会被 `DatabaseSessionService` 或 `VertexAiSessionService` 保存**。它们依赖 `append_event` 触发保存。
3. **线程不安全：**可能导致竞态条件和更新丢失。
4. **忽略时间戳/逻辑：**不会更新 `last_update_time` 或触发相关事件逻辑。

**建议：**坚持通过 `output_key`、`EventActions.state_delta`（在手动创建事件时）或在各自作用域内修改 `CallbackContext` 或 `ToolContext` 对象的 `state` 属性来更新状态。这些方法确保可靠、可追踪且持久的状态管理。仅在 *读取* 状态时使用从 `SessionService` 检索的会话直接访问 `session.state`。

### 状态设计最佳实践回顾 {#best-practices-for-state-design-recap}

* **简约性：**只存储必要的动态数据。
* **序列化：**使用基本的，可序列化类型。
* **描述性键和前缀：**使用清晰的名称和适当的前缀（`user:`, `app:`, `temp:`, 或无）。
* **浅结构：**尽可能避免深层嵌套。
* **标准更新流程：**依赖 `append_event`。

---

原文：[State: The Session's Scratchpad](https://adk.dev/sessions/state/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/sessions/state.md)
