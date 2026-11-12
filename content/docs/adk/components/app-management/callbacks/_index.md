---
title: "回调"
description: "回调是 ADK 的一个核心功能，提供了一种强大的机制来挂钩 Agent 的执行过程。它们允许你在特定的预定义点观察、定制，甚至控制 Agent 的行为"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

回调是 ADK 的核心功能，提供了一种强大的机制，用于在 Agent 的执行过程中进行挂钩。它们允许您在特定的预定义点观察、定制甚至控制 Agent 的行为，而无需修改核心 ADK 框架代码。

**它们是什么？** 本质上，回调是您定义的标准函数。然后，当您创建 Agent 时，将这些函数与 Agent 关联。ADK 框架会在关键阶段自动调用您的函数，让您可以观察或干预。可以将其想象为 Agent 过程中设置的检查点：

* **在 Agent 开始处理请求的主要工作之前，以及完成之后：** 当您要求 Agent 执行某项任务（例如回答一个问题）时，它会运行内部逻辑以确定响应。
  * `Before Agent` 回调在该请求的主要工作开始之前立即执行。
  * `After Agent` 回调在 Agent 完成该请求的所有步骤并准备最终结果之后、但在返回结果之前执行。
  * 这个“主要工作”包含 Agent 处理该单个请求的*整个*过程。这可能涉及决定是否调用大型语言模型（LLM）、实际调用 LLM、决定是否使用某个工具、使用工具、处理结果，最终组合答案。这些回调基本上涵盖了从接收输入到为该交互生成最终输出的整个序列。
* **在向大型语言模型（LLM）发送请求之前，或在接收响应之后：** 这些回调（`Before Model`, `After Model`）允许您专门检查或修改发送给 LLM 和从 LLM 返回的数据。
* **在执行工具（例如 Python 函数或其他 Agent）之前，或在其完成之后：** 类似地，`Before Tool` 和 `After Tool` 回调为 Agent 调用的工具执行提供了专门的控制点。

![intro_components.png](/images/adk/callback_flow.png)

**为什么使用它们？** 回调 unlock 了显著的灵活性，并实现高级 Agent 功能：

* **观察与调试：** 在关键步骤记录详细信息以便监控和排查问题。
* **定制与控制：** 修改通过 Agent 流动的数据（如 LLM 请求或工具结果），甚至根据您的逻辑完全跳过某些步骤。
* **实现防护墙：** 强制执行安全规则、验证输入/输出或阻止不允许的操作。
* **管理状态：** 在执行过程中读取或动态更新 Agent 的会话状态。
* **集成与增强：** 触发外部操作（API 调用、通知）或添加功能，如缓存。{{% alert context="success" %}}
在实施安全防护栏和策略时，使用 ADK 插件
比回调更灵活、模块化更佳。更多详情请参见
[安全护栏的回调和插件](/docs/adk/run/safety-and-security/#callbacks-and-plugins-for-security-guardrails)。
{{% /alert %}}
**它们是如何添加的：**

<details>
<summary>Code</summary>

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from typing import Optional

# --- 定义你的回调函数 ---
def my_before_model_logic(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    print(f"Callback running before model call for agent: {callback_context.agent_name}")
    # ... 在这里编写你的自定义逻辑 ...
    return None # Allow the model call to proceed

# --- 在创建 Agent 时注册它 ---
my_agent = LlmAgent(
    name="MyCallbackAgent",
    model="gemini-2.0-flash", # Or your desired model
    instruction="Be helpful.",
    # 其他 Agent 参数...
    before_model_callback=my_before_model_logic # Pass the function here
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/genai"
)

// onBeforeModel 是一个回调函数，会在 LLM 调用之前触发。
func onBeforeModel(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
	log.Println("--- onBeforeModel Callback Triggered ---")
	log.Printf("Model Request to be sent: %v\n", req)
	// 返回 nil 允许默认的 LLM 调用继续进行。
	return nil, nil
}

func runBasicExample() {
	const (
		appName = "CallbackBasicApp"
		userID  = "test_user_123"
	)
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	// 在 Agent 配置中注册回调函数。
	agentCfg := llmagent.Config{
		Name:                 "SimpleAgent",
		Model:                geminiModel,
		BeforeModelCallbacks: []llmagent.BeforeModelCallback{onBeforeModel},
	}
	simpleAgent, err := llmagent.New(agentCfg)
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          simpleAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}
```

{{% /tab %}}
{{< /tabs >}}
</details>

## 回调机制：拦截与控制 {#the-callback-mechanism-interception-and-control}

当 ADK 框架遇到可以运行回调的点（例如，在调用 LLM 之前），它会检查你是否为该 Agent 提供了相应的回调函数。如果提供了，框架会执行你的函数。

**上下文是关键：** 你的回调函数不是孤立调用的。框架会提供特殊的**上下文对象**（`CallbackContext` 或 `ToolContext`）作为参数。这些对象包含 Agent 执行当前状态的重要信息，包括调用细节、会话状态，以及可能的服务引用，如 Artifact 或内存。你可以使用这些上下文对象来理解情况并与框架互动。（有关完整信息，请参阅专门的“上下文对象”章节）。

**控制流程（核心机制）：** 回调最强大的方面在于它们的**返回值**如何影响 Agent 的后续操作。这就是你拦截和控制执行流程的方式：

1. **`return None`（允许默认行为）：**

    * 特定返回类型可能因语言而异。在 Java 中，相应的返回类型是 `Optional.empty()`。在 Kotlin 中，对于 `before_*` 回调，它是 `CallbackChoice.Continue(value)`，或者对于 `after_*` 回调，返回原始对象。请参考 API 文档获取特定语言的指南。
    * 这是表明你的回调已完成工作（例如记录、检查、对输入参数进行少量修改）并且 ADK Agent 应**继续正常操作**的标准方式。
    * 对于 `before_*` 回调（`before_agent`、`before_model`、`before_tool`），返回 `None` 意味着序列中的下一步将发生，无论该步骤是运行 Agent 逻辑、调用 LLM 还是执行工具。
    * 对于 `after_*` 回调（`after_agent`、`after_model`、`after_tool`），返回 `None` 会保留刚生成的结果，无论该结果是 Agent 输出、LLM 的响应还是工具结果。在 Python 中，将该结果返回而不是 `None` 对于 `after_agent_callback` 并不等效：ADK 会发出第二个事件传递相同内容。

2. **`return <Specific Object>`（覆盖默认行为）：**    * 返回一个*特定类型的对象*（而不是信号“继续”）是**覆盖**ADKAgent 默认行为的方式。在Kotlin中，这可以通过返回`CallbackChoice.Break(value)`（用于`before_*`回调）或替代对象（用于`after_*`回调）来实现。框架将使用你返回的对象，并*跳过*通常会执行的步骤或*替换*刚生成的结果。
    * **`before_agent_callback` → `Content`**：跳过 Agent 的主要执行逻辑。返回的`Content`对象会立即被视为该轮的最终输出。适用于直接处理简单请求或执行访问控制。
    * **`before_model_callback` → `LlmResponse`**：跳过对外部大语言模型的调用。返回的`LlmResponse`对象会被作为实际 LLM 响应处理。非常适合实现输入保护、提示验证或提供缓存响应。
    * **`before_tool_callback` → Python: `dict`, Kotlin: `Map<String, Any>`**：跳过实际工具函数（或子 Agent）的执行。返回的`dict` 或 `Map` 将用作工具调用的结果，然后传回给 LLM。这种行为允许验证工具参数、应用策略限制或返回模拟/缓存的工具结果。
    * **`after_agent_callback` → `Content`**：*附加*返回的`Content`作为 Agent 运行逻辑已生成输出后的额外事件。它不会替换该输出；如需更改模型响应，请使用`after_model_callback`。
    * **`after_model_callback` → `LlmResponse`**：*替换*从 LLM 接收到的`LlmResponse`。适用于清理输出、添加标准免责声明或修改 LLM 的响应结构。
    * **`after_tool_callback` → Python: `dict`, Kotlin: `Map<String, Any>`**：*替换*工具返回的结果。允许在将结果发送回 LLM 之前对工具输出进行后处理或标准化。

**概念代码示例（保护机制）：**

此示例展示了使用`before_model_callback`实现保护机制的常见模式。

<details>
<summary>代码</summary>

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

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from google.adk.runners import Runner
from typing import Optional
from google.genai import types
from google.adk.sessions import InMemorySessionService

GEMINI_2_FLASH="gemini-2.0-flash"

# --- 定义回调函数 ---
def simple_before_model_modifier(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Inspects/modifies the LLM request or skips the call."""
    agent_name = callback_context.agent_name
    print(f"[Callback] Before model call for agent: {agent_name}")

    # 检查请求内容中的最后用户消息
    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
         if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text
    print(f"[Callback] Inspecting last user message: '{last_user_message}'")

    # --- 修改示例 ---
    # 给系统指令添加前缀
    original_instruction = llm_request.config.system_instruction or types.Content(role="system", parts=[])
    prefix = "[Modified by Callback] "
    # 确保 system_instruction 是 Content 并且 parts 列表存在
    if not isinstance(original_instruction, types.Content):
         # 处理可能是字符串的情况（尽管配置期望 Content）
         original_instruction = types.Content(role="system", parts=[types.Part(text=str(original_instruction))])
    if not original_instruction.parts:
        original_instruction.parts.append(types.Part(text="")) # Add an empty part if none exist

    # 修改第一部分的文本
    modified_text = prefix + (original_instruction.parts[0].text or "")
    original_instruction.parts[0].text = modified_text
    llm_request.config.system_instruction = original_instruction
    print(f"[Callback] Modified system instruction to: '{modified_text}'")

    # --- 跳过示例 ---
    # 检查最后用户消息是否包含 "BLOCK"
    if "BLOCK" in last_user_message.upper():
        print("[Callback] 'BLOCK' keyword found. Skipping LLM call.")
        # 返回 LlmResponse 以跳过实际的 LLM 调用
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text="LLM call was blocked by before_model_callback.")],
            )
        )
    else:
        print("[Callback] Proceeding with LLM call.")
        # 返回 None 允许（修改后的）请求发送到 LLM
        return None

# 创建 LlmAgent 并分配回调
my_llm_agent = LlmAgent(
        name="ModelCallbackAgent",
        model=GEMINI_2_FLASH,
        instruction="You are a helpful assistant.", # Base instruction
        description="An LLM agent demonstrating before_model_callback",
        before_model_callback=simple_before_model_modifier # Assign the function here
)

APP_NAME = "guardrail_app"
USER_ID = "user_1"
SESSION_ID = "session_001"

# 会话与 Runner
async def setup_session_and_runner():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    runner = Runner(agent=my_llm_agent, app_name=APP_NAME, session_service=session_service)
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
await call_agent_async("write a joke on BLOCK")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/genai"
)

// onBeforeModelGuardrail 是一个回调函数，用于检查 LLM 请求。
// 如果请求包含禁止的主题，它会阻止该请求并返回一个
// 预定义的响应。否则，它允许请求继续。
func onBeforeModelGuardrail(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
	log.Println("--- onBeforeModelGuardrail Callback Triggered ---")

	// 检查请求内容是否包含禁止的主题。
	for _, content := range req.Contents {
		for _, part := range content.Parts {
			if strings.Contains(part.Text, "finance") {
				log.Println("Forbidden topic 'finance' detected. Blocking LLM call.")
				// 通过返回非 nil 的响应，我们可以覆盖默认行为
				// 并阻止实际的 LLM 调用。
				return &model.LLMResponse{
					Content: &genai.Content{
						Parts: []*genai.Part{{Text: "I'm sorry, but I cannot discuss financial topics."}},
						Role:  "model",
					},
				}, nil
			}
		}
	}

	log.Println("No forbidden topics found. Allowing LLM call to proceed.")
	// 返回 nil 允许默认的 LLM 调用继续进行。
	return nil, nil
}

func runGuardrailExample() {
	const (
		appName = "GuardrailApp"
		userID  = "test_user_456"
	)
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	agentCfg := llmagent.Config{
		Name:                 "ChatAgent",
		Model:                geminiModel,
		BeforeModelCallbacks: []llmagent.BeforeModelCallback{onBeforeModelGuardrail},
	}
	chatAgent, err := llmagent.New(agentCfg)
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{
		AppName:        appName,
		Agent:          chatAgent,
		SessionService: sessionService,
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}
```

{{% /tab %}}
{{< /tabs >}}
</details>
通过理解返回 `None` 与返回特定对象的机制，您可以精确控制 Agent 的执行路径，使回调成为使用 ADK 构建复杂且可靠 Agent 的关键工具。

---

原文：[Callbacks: Observe, Customize, and Control Agent Behavior](https://adk.dev/callbacks/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/callbacks/index.md)
