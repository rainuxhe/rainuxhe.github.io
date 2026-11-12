---
title: "回调类型"
description: "该框架提供了在 Agent 执行的不同阶段触发的多种回调。了解每个回调触发的时机以及它接收的上下文对于有效使用它们至关重要。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

该框架提供了在 Agent 执行的各个阶段触发的不同类型回调。了解每个回调何时触发以及它接收的上下文，对于有效使用它们至关重要。

## Agent 生命周期回调 {#agent-lifecycle-callbacks}

这些回调适用于*任何*继承自 `BaseAgent` 的 Agent（包括 `LlmAgent`、`SequentialAgent`、`ParallelAgent`、`LoopAgent` 等）。

{{% alert context="default" %}}
具体的方法名称或返回类型可能因 SDK 语言略有不同（例如，在 Python 中返回 `None`，在 Java 中返回 `Optional.empty()` 或 `Maybe.empty()`）。详情请参考特定语言的 API 文档。
{{% /alert %}}
<details>
<summary>Python：使用文档中记录的回调参数名称</summary>

在 Python 中，回调函数参数名称必须与文档中完全匹配，因为 ADK 通过关键字传递回调参数。例如，Agent 和模型回调用 `callback_context`，工具回调用 `tool_context`。将这些参数重命名为别名（如 `ctx`）将导致运行时 `TypeError` 错误。

```python
# 正确
def before_agent_callback(callback_context):
    ...

# 错误
def before_agent_callback(ctx):
    ...
```

| 回调 | 必需的参数名 |
|---|---|
| `before_agent_callback` | `callback_context` |
| `after_agent_callback` | `callback_context` |
| `before_model_callback` | `callback_context`, `llm_request` |
| `after_model_callback` | `callback_context`, `llm_response` |
| `on_model_error_callback` | `callback_context`, `llm_request`, `error` |
| `before_tool_callback` | `tool`, `args`, `tool_context` |
| `after_tool_callback` | `tool`, `args`, `tool_context`, `tool_response` |
| `on_tool_error_callback` | `tool`, `args`, `tool_context`, `error` |

只有 `before_agent_callback` 和 `after_agent_callback` 是每个
`BaseAgent` 上的字段。表中六个模型和工具回调仅是
`LlmAgent` 上的字段。

</details>
<details>
<summary>
Python: `async` 回调和回调列表 </summary>

在 Python 中，回调可以是普通的 `def` 或 `async def`。ADK 无论哪种方式都会等待结果。

每个回调字段也接受一个函数列表，而不仅限于单个函数。ADK 会按照列出的顺序调用它们，并在第一个返回结果的函数处停止：该值成为回调结果，其余回调将被跳过。什么算作结果因系列而异。六个 `before_`/`after_` 的 Agent、模型和工具钩子仅在*真值*时停止，因此返回 `None` 或其他假值（例如空 `dict`）的回调会让下一个继续运行。`on_model_error_callback` 和 `on_tool_error_callback` 会在任何非 `None` 的值时停止，所以 `on_tool_error_callback` 返回的空 `dict` 会终止链、抑制异常，并成为工具结果。

将列表分配给 Agent 上的回调字段：

```python
root_agent = LlmAgent(
    name="my_agent",
    model="gemini-flash-latest",
    before_model_callback=[check_policy, log_request],
)
```

</details>
### Agent 回调之前 {#before-agent-callback}

**时间:** 在执行 Agent 的 `_run_async_impl`（或 `_run_live_impl`）方法 *之前立即* 调用。它在创建 Agent 的 `InvocationContext` 之后运行，但 *在核心逻辑开始之前*。

**目的:** 通过回调上下文验证会话状态，记录 Agent 运行的开始，或返回内容以跳过 Agent 的核心逻辑。在 ADK Python 中，通过 `callback_context.state` 所做的更改会被 `callback_context.actions.state_delta` 跟踪。

<details>
<summary>Code</summary>

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

# # --- 设置说明 ---
# # 1. 安装 ADK 包：
# !pip install google-adk
# # 如果使用 colab/jupyter notebook，请确保重启内核

# # 2. 设置您的 Gemini API Key：
# #    - 从 Google AI Studio 获取一个密钥：https://aistudio.google.com/app/apikey
# #    - 将其设置为环境变量：
# import os
# os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY_HERE" # <--- 用您实际的密钥替换
# # 或了解其他认证方法（如 Agent 平台）：
# # https://adk.dev/agents/models/

# ADK 导入
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.runners import InMemoryRunner  # Use InMemoryRunner
from google.genai import types  # For types.Content
from typing import Optional

# 定义模型 - 使用指定的模型名称
GEMINI_2_FLASH = "gemini-2.0-flash"

# --- 1. 定义回调函数 ---
def check_if_agent_should_run(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    """
    Logs entry and checks 'skip_llm_agent' in session state.
    If True, returns Content to skip the agent's execution.
    If False or not present, returns None to allow execution.
    """
    agent_name = callback_context.agent_name
    invocation_id = callback_context.invocation_id
    current_state = callback_context.state.to_dict()

    print(f"\n[Callback] Entering agent: {agent_name} (Inv: {invocation_id})")
    print(f"[Callback] Current State: {current_state}")

    # 检查 session 状态字典中的条件
    if current_state.get("skip_llm_agent", False):
        print(
            f"[Callback] State condition 'skip_llm_agent=True' met: Skipping agent {agent_name}."
        )
        # 返回内容以跳过 Agent 运行
        return types.Content(
            parts=[
                types.Part(
                    text=f"Agent {agent_name} skipped by before_agent_callback due to state."
                )
            ],
            role="model",  # Assign model role to the overriding response
        )
    else:
        print(
            f"[Callback] State condition not met: Proceeding with agent {agent_name}."
        )
        # 返回 None 来允许 LlmAgent 的正常执行
        return None

# --- 2. 使用回调设置 Agent ---
llm_agent_with_before_cb = LlmAgent(
    name="MyControlledAgent",
    model=GEMINI_2_FLASH,
    instruction="You are a concise assistant.",
    description="An LLM agent demonstrating stateful before_agent_callback",
    before_agent_callback=check_if_agent_should_run,  # Assign the callback
)

# --- 3. 使用 InMemoryRunner 设置 Runner 和会话 ---
async def main():
    app_name = "before_agent_demo"
    user_id = "test_user"
    session_id_run = "session_will_run"
    session_id_skip = "session_will_skip"

    # 使用 InMemoryRunner - 它包含 InMemorySessionService
    runner = InMemoryRunner(agent=llm_agent_with_before_cb, app_name=app_name)
    # 获取捆绑的会话服务以创建会话
    session_service = runner.session_service

    # 创建会话 1：Agent 将运行（默认空状态）
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id_run,
        # 没有初始状态意味着回调检查中的 'skip_llm_agent' 为 False
    )

    # 创建会话 2：Agent 将被跳过（状态为 skip_llm_agent=True）
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id_skip,
        state={"skip_llm_agent": True},  # Set the state flag here
    )

    # --- 情景 1：回调允许 Agent 执行的运行 ---
    print(
        "\n"
        + "=" * 20
        + f" SCENARIO 1: Running Agent on Session '{session_id_run}' (Should Proceed) "
        + "=" * 20
    )
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id_run,
        new_message=types.Content(
            role="user", parts=[types.Part(text="Hello, please respond.")]
        ),
    ):
        # 打印最终输出（来自 LLM 或回调重写）
        if event.is_final_response() and event.content:
            print(
                f"Final Output: [{event.author}] {event.content.parts[0].text.strip()}"
            )
        elif event.is_error():
            print(f"Error Event: {event.error_details}")

    # --- 情景 2：回调拦截并跳过 Agent 的运行 ---
    print(
        "\n"
        + "=" * 20
        + f" SCENARIO 2: Running Agent on Session '{session_id_skip}' (Should Skip) "
        + "=" * 20
    )
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id_skip,
        new_message=types.Content(
            role="user", parts=[types.Part(text="This message won't reach the LLM.")]
        ),
    ):
        # 打印最终输出（来自 LLM 或回调重写）
        if event.is_final_response() and event.content:
            print(
                f"Final Output: [{event.author}] {event.content.parts[0].text.strip()}"
            )
        elif event.is_error():
            print(f"Error Event: {event.error_details}")

# --- 4. 执行 ---
# 在 Python 脚本中：
# import asyncio
# if __name__ == "__main__":
#     # 如果不使用 Agent 平台认证，请确保设置了 GOOGLE_API_KEY 环境变量
#     # 或确保 Agent 平台配置了应用默认凭证（ADC）
#     asyncio.run(main())

# 在 Jupyter Notebook 或类似环境中：
await main()
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

// 1. 定义回调函数
func onBeforeAgent(ctx agent.Context) (*genai.Content, error) {
	agentName := ctx.AgentName()
	log.Printf("[Callback] Entering agent: %s", agentName)
	if skip, _ := ctx.State().Get("skip_llm_agent"); skip == true {
		log.Printf("[Callback] State condition met: Skipping agent %s", agentName)
		return genai.NewContentFromText(
				fmt.Sprintf("Agent %s skipped by before_agent_callback.", agentName),
				genai.RoleModel,
			),
			nil
	}
	log.Printf("[Callback] State condition not met: Running agent %s", agentName)
	return nil, nil
}

// 2. 定义一个用于设置并运行带回调的 Agent 的函数。
func runBeforeAgentExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}

	// 3. 在 Agent 配置中注册回调。
	llmCfg := llmagent.Config{
		Name:                 "AgentWithBeforeAgentCallback",
		BeforeAgentCallbacks: []agent.BeforeAgentCallback{onBeforeAgent},
		Model:                geminiModel,
		Instruction:          "You are a concise assistant.",
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	// 4. 运行场景以演示回调的行为。
	log.Println("--- SCENARIO 1: Agent should run normally ---")
	runScenario(ctx, r, sessionService, appName, "session_normal", nil, "Hello, world!")

	log.Println("\n--- SCENARIO 2: Agent should be skipped ---")
	runScenario(ctx, r, sessionService, appName, "session_skip", map[string]any{"skip_llm_agent": true}, "This should be skipped.")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
**关于`before_agent_callback`示例的说明：**

* **显示内容：** 这个示例展示了`before_agent_callback`。该回调运行在 Agent 主处理逻辑开始前。
* **工作原理：** 回调函数（`check_if_agent_should_run`）会在会话状态下查看一个标志（`skip_llm_agent`）。
    * 如果标志`True`，回调返回一个`types.Content`对象。这告诉 ADK 框架完全跳过 Agent 的主执行，使用回调返回的内容作为最终响应。
    * 如果标志`False`（或未设置），回调返回`None`或空对象。这告诉 ADK 框架**继续**执行 Agent 的正常执行（此例中调用 LLM）。
* **预期结果：** 你会看到两种情况：
    1. 在*与*`skip_llm_agent: True`状态的会话中，Agent 的 LLM 调用被绕过，输出直接来自回调（“Agent......跳过了......”）。
    2. 在*没有*该状态标志的会话中，回调允许 Agent 运行，你会看到 LLM 的实际响应（例如，“你好！”）。
* **理解回调：** 这凸显了`before_`回调如何作为**守门人**，允许你在重大步骤之前拦截执行，并可能基于检查（如状态、输入验证、权限）阻止执行。

### 在特工回拨之后 {#after-agent-callback}

**When：** 在 Agent 的`_run_async_impl`（或`_run_live_impl`）方法成功完成后*立即调用。如果 Agent 因返回内容而被跳过，则该方法*不会*运行`before_agent_callback`。在 Python 中，在 Agent 运行时设置`end_invocation`也会跳过该方法，但仅限于`run_async`路径;`run_live`在`_run_live_impl`完成后不会重新检查`end_invocation`，因此回调仍会在那里运行。

**目的：** 适用于清理任务、执行后验证、记录 Agent 活动完成或修改最终状态。

{{% alert context="info" %}}
**Agent 回调后输出修改限制**

`after_agent_callback`无法完全更改响应输出，因为 Agent 可能多次调用AI模型并遗漏了多个事件。因此不允许修改输出，尽管你可以*附加*额外内容。如果你想更改AI模型的响应，可以考虑 `after_model_callback`。
{{% /alert %}}
<details>
<summary>Code</summary>

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

# # --- 设置说明 ---
# # 1. 安装 ADK 包：
# !pip install google-adk
# # 如果使用 colab/jupyter notebook，请确保重启内核

# # 2. 设置您的 Gemini API Key：
# #    - 从 Google AI Studio 获取一个密钥：https://aistudio.google.com/app/apikey
# #    - 将其设置为环境变量：
# import os
# os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY_HERE" # <--- 用您实际的密钥替换
# # 或了解其他认证方法（如 Agent 平台）：
# # https://adk.dev/agents/models/

# ADK 导入
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.runners import InMemoryRunner  # Use InMemoryRunner
from google.genai import types  # For types.Content
from typing import Optional

# 定义模型 - 使用指定的模型名称
GEMINI_2_FLASH = "gemini-2.0-flash"

# --- 1. 定义回调函数 ---
def modify_output_after_agent(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    """
    Logs exit from an agent and checks 'add_concluding_note' in session state.
    If True, returns new Content to *replace* the agent's original output.
    If False or not present, returns None, allowing the agent's original output to be used.
    """
    agent_name = callback_context.agent_name
    invocation_id = callback_context.invocation_id
    current_state = callback_context.state.to_dict()

    print(f"\n[Callback] Exiting agent: {agent_name} (Inv: {invocation_id})")
    print(f"[Callback] Current State: {current_state}")

    # 示例：检查状态以决定是否修改最终输出
    if current_state.get("add_concluding_note", False):
        print(
            f"[Callback] State condition 'add_concluding_note=True' met: Replacing agent {agent_name}'s output."
        )
        # 返回内容以*替换*Agent 自己的输出
        return types.Content(
            parts=[
                types.Part(
                    text=f"Concluding note added by after_agent_callback, replacing original output."
                )
            ],
            role="model",  # Assign model role to the overriding response
        )
    else:
        print(
            f"[Callback] State condition not met: Using agent {agent_name}'s original output."
        )
        # 返回 None - 将使用此回调之前 Agent 产生的输出。
        return None

# --- 2. 使用回调设置 Agent ---
llm_agent_with_after_cb = LlmAgent(
    name="MySimpleAgentWithAfter",
    model=GEMINI_2_FLASH,
    instruction="You are a simple agent. Just say 'Processing complete!'",
    description="An LLM agent demonstrating after_agent_callback for output modification",
    after_agent_callback=modify_output_after_agent,  # Assign the callback here
)

# --- 3. 使用 InMemoryRunner 设置 Runner 和会话 ---
async def main():
    app_name = "after_agent_demo"
    user_id = "test_user_after"
    session_id_normal = "session_run_normally"
    session_id_modify = "session_modify_output"

    # 使用 InMemoryRunner - 它包含 InMemorySessionService
    runner = InMemoryRunner(agent=llm_agent_with_after_cb, app_name=app_name)
    # 获取捆绑的会话服务以创建会话
    session_service = runner.session_service

    # 创建会话 1：Agent 输出将按原样使用（默认空状态）
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id_normal,
        # 没有初始状态意味着在回调检查中 'add_concluding_note' 将为 False
    )
    # print(f"会话 '{session_id_normal}' 已创建，使用默认状态。")

    # 创建会话 2：Agent 输出将被回调替换
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id_modify,
        state={"add_concluding_note": True},  # Set the state flag here
    )
    # print(f"会话 '{session_id_modify}' 已创建，状态={{'add_concluding_note': True}}。")

    # --- 场景 1：运行回调允许 Agent 原始输出 ---
    print(
        "\n"
        + "=" * 20
        + f" SCENARIO 1: Running Agent on Session '{session_id_normal}' (Should Use Original Output) "
        + "=" * 20
    )
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id_normal,
        new_message=types.Content(
            role="user", parts=[types.Part(text="Process this please.")]
        ),
    ):
        # 打印最终输出（来自 LLM 或回调重写）
        if event.is_final_response() and event.content:
            print(
                f"Final Output: [{event.author}] {event.content.parts[0].text.strip()}"
            )
        elif event.is_error():
            print(f"Error Event: {event.error_details}")

    # --- 场景 2：运行回调替换 Agent 输出 ---
    print(
        "\n"
        + "=" * 20
        + f" SCENARIO 2: Running Agent on Session '{session_id_modify}' (Should Replace Output) "
        + "=" * 20
    )
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id_modify,
        new_message=types.Content(
            role="user", parts=[types.Part(text="Process this and add note.")]
        ),
    ):
        # 打印最终输出（来自 LLM 或回调重写）
        if event.is_final_response() and event.content:
            print(
                f"Final Output: [{event.author}] {event.content.parts[0].text.strip()}"
            )
        elif event.is_error():
            print(f"Error Event: {event.error_details}")

# --- 4. 执行 ---
# 在 Python 脚本中：
# import asyncio
# if __name__ == "__main__":
#     # 如果不使用 Agent 平台认证，请确保设置了 GOOGLE_API_KEY 环境变量
#     # 或确保 Agent 平台配置了应用默认凭证（ADC）
#     asyncio.run(main())

# 在 Jupyter Notebook 或类似环境中：
await main()
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

func onAfterAgent(ctx agent.Context) (*genai.Content, error) {
	agentName := ctx.AgentName()
	invocationID := ctx.InvocationID()
	state := ctx.State()

	log.Printf("\n[Callback] Exiting agent: %s (Inv: %s)", agentName, invocationID)
	log.Printf("[Callback] Current State: %v", state)

	if addNote, _ := state.Get("add_concluding_note"); addNote == true {
		log.Printf("[Callback] State condition 'add_concluding_note=True' met: Replacing agent %s's output.", agentName)
		return genai.NewContentFromText(
			"Concluding note added by after_agent_callback, replacing original output.",
			genai.RoleModel,
		), nil
	}

	log.Printf("[Callback] State condition not met: Using agent %s's original output.", agentName)
	return nil, nil
}

func runAfterAgentExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}

	llmCfg := llmagent.Config{
		Name:                "AgentWithAfterAgentCallback",
		AfterAgentCallbacks: []agent.AfterAgentCallback{onAfterAgent},
		Model:               geminiModel,
		Instruction:         "You are a simple agent. Just say 'Processing complete!'",
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	log.Println("--- SCENARIO 1: Should use original output ---")
	runScenario(ctx, r, sessionService, appName, "session_normal", nil, "Process this.")

	log.Println("\n--- SCENARIO 2: Should replace output ---")
	runScenario(ctx, r, sessionService, appName, "session_modify", map[string]any{"add_concluding_note": true}, "Process and add note.")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
**关于`after_agent_callback`示例的说明：**

* **展示内容：** 此示例演示了`after_agent_callback`。该回调在 Agent 的主要处理逻辑完成并生成结果后立即运行，但在结果被最终确定和返回之前。
* **工作原理：** 回调函数（`modify_output_after_agent`）检查会话状态中的标志（`add_concluding_note`）。
    * 如果标志为`True`，回调返回一个*新的*`types.Content`对象。这告诉 ADK 框架**将**Agent 的原始输出与回调返回的内容**追加**。
    * 如果标志为`False`（或未设置），回调返回`None`或空对象。这告诉 ADK 框架**使用**Agent 生成的原始输出。
* **预期结果：** 将看到两种情况：
    1. 在没有`add_concluding_note: True`状态的会话中，回调允许使用 Agent 的原始输出（"处理完成！"）。
    2. 在具有该状态标志的会话中，回调拦截 Agent 的原始输出并将其附加自己的消息（"已添加结束说明..."）。
* **理解回调：** 该示例强调了`after_`回调如何允许**后处理**。您可以检查步骤的结果，并决定是让其通过还是添加内容。`after_agent_callback`不能替换 Agent 的输出：其返回的内容作为 Agent 自身事件之后的*附加*事件发布。

## LLM 交互回调 {#llm-interaction-callbacks}

这些回调特定于`LlmAgent`，并提供在与大型语言模型交互时的挂钩。在 Python 中，`LlmAgent`还接受一个`on_model_error_callback`，当模型调用发生异常时运行。如果它返回`LlmResponse`，则异常被抑制，并使用该响应。在 Go 中，在`llmagent.Config`上设置`OnModelErrorCallbacks`。这些回调在模型调用返回错误时运行。如果回调返回非nil的`*model.LLMResponse`且error为nil，则使用该响应。如果返回错误，则该错误替换原始错误。

模型回调还在实时双向会话中运行，在这种情况下回调在轮次的不同点触发，阻塞效果与请求-响应流不同。参阅[实时 Agent 的防护措施](/docs/adk/components/live-and-voice-agents/production/guardrails/)。在 Go 中，包括`OnModelErrorCallbacks`在内的模型回调不会在实时会话中运行。

### 模型前回调 {#before-model-callback}

**时间：** 在`LlmAgent`流程中向 LLM 发送`generate_content_async`（或等效）请求之前调用。**目的:** 允许检查和修改发送到 LLM 的请求。使用场景包括添加动态指令、根据状态注入少量示例、修改模型配置、实现安全防护措施（如脏话过滤器）或实现请求级缓存。

**返回值效果:**
如果回调返回 `None`（或 Java 中的 `Maybe.empty()` 对象），LLM 将继续其正常工作流程。如果回调返回 `LlmResponse` 对象，则对 LLM 的调用将被**跳过**。返回的 `LlmResponse` 将被直接使用，就像它来自模型一样。这对于实现安全防护或缓存非常强大。

<details>
<summary>Code</summary>

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
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

func onBeforeModel(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
	log.Printf("[Callback] BeforeModel triggered for agent %q.", ctx.AgentName())

	// 修改示例：在系统指令前添加前缀。
	if req.Config.SystemInstruction != nil {
		prefix := "[Modified by Callback] "
		// 这是一个简化示例；生产代码可能需要更深入的检查。
		if len(req.Config.SystemInstruction.Parts) > 0 {
			req.Config.SystemInstruction.Parts[0].Text = prefix + req.Config.SystemInstruction.Parts[0].Text
		} else {
			req.Config.SystemInstruction.Parts = append(req.Config.SystemInstruction.Parts, &genai.Part{Text: prefix})
		}
		log.Printf("[Callback] Modified system instruction.")
	}

	// 跳过示例：检查用户提示中是否包含“BLOCK”。
	for _, content := range req.Contents {
		for _, part := range content.Parts {
			if strings.Contains(strings.ToUpper(part.Text), "BLOCK") {
				log.Println("[Callback] 'BLOCK' keyword found. Skipping LLM call.")
				return &model.LLMResponse{
					Content: &genai.Content{
						Parts: []*genai.Part{{Text: "LLM call was blocked by before_model_callback."}},
						Role:  "model",
					},
				}, nil
			}
		}
	}

	log.Println("[Callback] Proceeding with LLM call.")
	return nil, nil
}

func runBeforeModelExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}

	llmCfg := llmagent.Config{
		Name:                 "AgentWithBeforeModelCallback",
		Model:                geminiModel,
		BeforeModelCallbacks: []llmagent.BeforeModelCallback{onBeforeModel},
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	log.Println("--- SCENARIO 1: Should proceed to LLM ---")
	runScenario(ctx, r, sessionService, appName, "session_normal", nil, "Tell me a fun fact.")

	log.Println("\n--- SCENARIO 2: Should be blocked by callback ---")
	runScenario(ctx, r, sessionService, appName, "session_blocked", nil, "write a joke on BLOCK")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
### 模型回调后 {#after-model-callback}

**时间：** 在从 LLM 接收到响应（`LlmResponse`）之后调用，在调用 Agent 进一步处理之前。

**目的：** 允许检查或修改原始 LLM 响应。使用案例包括：

* 记录模型输出，
* 重新格式化响应，
* 审查模型生成的敏感信息，
* 从 LLM 响应中解析结构化数据并存储到 `callback_context.state` 中，
* 或处理特定错误代码。

<details>
<summary>Code</summary>

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
from google.adk.runners import Runner
from typing import Optional
from google.genai import types
from google.adk.sessions import InMemorySessionService
from google.adk.models import LlmResponse
from copy import deepcopy

GEMINI_2_FLASH="gemini-2.0-flash"

# --- 定义回调函数 ---
def simple_after_model_modifier(
    callback_context: CallbackContext, llm_response: LlmResponse
) -> Optional[LlmResponse]:
    """Inspects/modifies the LLM response after it's received."""
    agent_name = callback_context.agent_name
    print(f"[Callback] After model call for agent: {agent_name}")

    # --- 检查 ---
    original_text = ""
    if llm_response.content and llm_response.content.parts:
        # 假设此示例为简单的文本响应
        if llm_response.content.parts[0].text:
            original_text = llm_response.content.parts[0].text
            print(f"[Callback] Inspected original response text: '{original_text[:100]}...'") # Log snippet
        elif llm_response.content.parts[0].function_call:
             print(f"[Callback] Inspected response: Contains function call '{llm_response.content.parts[0].function_call.name}'. No text modification.")
             return None # Don't modify tool calls in this example
        else:
             print("[Callback] Inspected response: No text content found.")
             return None
    elif llm_response.error_message:
        print(f"[Callback] Inspected response: Contains error '{llm_response.error_message}'. No modification.")
        return None
    else:
        print("[Callback] Inspected response: Empty LlmResponse.")
        return None # Nothing to modify

    # --- 修改示例 ---
    # 将“joke”替换为“funny story”（不区分大小写）
    search_term = "joke"
    replace_term = "funny story"
    if search_term in original_text.lower():
        print(f"[Callback] Found '{search_term}'. Modifying response.")
        modified_text = original_text.replace(search_term, replace_term)
        modified_text = modified_text.replace(search_term.capitalize(), replace_term.capitalize()) # Handle capitalization

        # 创建一个带有修改内容的新 LlmResponse
        # 深拷贝部分内容以避免修改原始内容，如果存在其他回调
        modified_parts = [deepcopy(part) for part in llm_response.content.parts]
        modified_parts[0].text = modified_text # Update the text in the copied part

        new_response = LlmResponse(
             content=types.Content(role="model", parts=modified_parts),
             # 如有必要，复制其他相关字段，例如 grounding_metadata
             grounding_metadata=llm_response.grounding_metadata
             )
        print(f"[Callback] Returning modified response.")
        return new_response # Return the modified response
    else:
        print(f"[Callback] '{search_term}' not found. Passing original response through.")
        # 返回 None 以使用原始 llm_response
        return None

# 创建 LlmAgent 并分配回调
my_llm_agent = LlmAgent(
        name="AfterModelCallbackAgent",
        model=GEMINI_2_FLASH,
        instruction="You are a helpful assistant.",
        description="An LLM agent demonstrating after_model_callback",
        after_model_callback=simple_after_model_modifier # Assign the function here
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
  session, runner = await setup_session_and_runner()

  content = types.Content(role='user', parts=[types.Part(text=query)])
  events = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

  async for event in events:
      if event.is_final_response():
          final_response = event.content.parts[0].text
          print("Agent Response: ", final_response)

# 注意：在 Colab 中可以直接在顶层使用 'await'。
# 如果将此代码作为独立 Python 脚本运行，则需要使用 asyncio.run() 或管理事件循环。
await call_agent_async("""write multiple time the word "joke" """)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

func onAfterModel(ctx agent.Context, resp *model.LLMResponse, respErr error) (*model.LLMResponse, error) {
	log.Printf("[Callback] AfterModel triggered for agent %q.", ctx.AgentName())
	if respErr != nil {
		log.Printf("[Callback] Model returned an error: %v. Passing it through.", respErr)
		return nil, respErr
	}
	if resp == nil || resp.Content == nil || len(resp.Content.Parts) == 0 {
		log.Println("[Callback] Response is nil or has no parts, nothing to process.")
		return nil, nil
	}
	// 检查函数调用并直接传递它们而不修改。
	if resp.Content.Parts[0].FunctionCall != nil {
		log.Println("[Callback] Response is a function call. No modification.")
		return nil, nil
	}

	originalText := resp.Content.Parts[0].Text

	// 使用不区分大小写且带单词边界的正则表达式查找“joke”。
	re := regexp.MustCompile(`(?i)\bjoke\b`)
	if !re.MatchString(originalText) {
		log.Println("[Callback] 'joke' not found. Passing original response through.")
		return nil, nil
	}

	log.Println("[Callback] 'joke' found. Modifying response.")
	// 使用替换函数处理大写。
	modifiedText := re.ReplaceAllStringFunc(originalText, func(s string) string {
		if strings.ToUpper(s) == "JOKE" {
			if s == "Joke" {
				return "Funny story"
			}
			return "funny story"
		}
		return s // Should not be reached with this regex, but it's safe.
	})

	resp.Content.Parts[0].Text = modifiedText
	return resp, nil
}

func runAfterModelExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}

	llmCfg := llmagent.Config{
		Name:                "AgentWithAfterModelCallback",
		Model:               geminiModel,
		AfterModelCallbacks: []llmagent.AfterModelCallback{onAfterModel},
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}

	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	log.Println("--- SCENARIO 1: Response should be modified ---")
	runScenario(ctx, r, sessionService, appName, "session_modify", nil, `Give me a paragraph about different styles of jokes.`)
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
## 工具执行回调 {#tool-execution-callbacks}

这些回调也是特定于 `LlmAgent` 的，并在 LLM 可能请求的工具执行前后触发，包括 `FunctionTool` 和 `AgentTool`。在 Python 中，`LlmAgent` 还接受一个 `on_tool_error_callback`，当工具引发异常时运行。如果它返回 `dict`，该异常将被抑制，并且使用 `dict` 作为工具结果。在 Go 中，将 `OnToolErrorCallbacks` 设置在 `llmagent.Config` 上。这些回调在工具调用失败时运行，但流式工具的错误除外。如果回调返回非空的 `map[string]any` 并且错误为 nil，则该映射被用作工具结果。如果它返回一个错误，该错误将替换原始错误。

### 工具前回调 {#before-tool-callback}

**何时触发：** 在 LLM 为特定工具生成函数调用后、该工具的 `run_async` 方法被调用之前触发。

**目的：** 允许检查和修改工具参数，在执行前进行授权检查，记录工具使用尝试，或实现工具级缓存。

**返回值效果：**

1. 如果回调返回 `None`（或在 Java 中返回 `Maybe.empty()` 对象），工具的 `run_async` 方法将使用（可能修改后的）`args` 执行。
2. 如果返回一个字典（或在 Java 中的 `Map`），工具的 `run_async` 方法将**被跳过**。返回的字典将直接作为工具调用的结果。这对于缓存或覆盖工具行为非常有用。

{{% alert context="info" %}}
**Python: 仅 `None` 允许工具执行**

ADK 将返回值与 `None` 进行比较，因此空的 `dict` 计数为覆盖：工具被跳过且 `{}` 成为工具结果。在希望工具执行时返回 `None`，而不是 `{}`。对于回调列表，这适用于最后生成的值，因为空的 `dict` 不会停止链，并且如果后来的回调返回其他值，则被丢弃。
{{% /alert %}}
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
from google.adk.runners import Runner
from typing import Optional
from google.genai import types
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.base_tool import BaseTool
from typing import Dict, Any

GEMINI_2_FLASH="gemini-2.0-flash"

def get_capital_city(country: str) -> str:
    """Retrieves the capital city of a given country."""
    print(f"--- Tool 'get_capital_city' executing with country: {country} ---")
    country_capitals = {
        "united states": "Washington, D.C.",
        "canada": "Ottawa",
        "france": "Paris",
        "germany": "Berlin",
    }
    return country_capitals.get(country.lower(), f"Capital not found for {country}")

capital_tool = FunctionTool(func=get_capital_city)

def simple_before_tool_modifier(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> Optional[Dict]:
    """Inspects/modifies tool args or skips the tool call."""
    agent_name = tool_context.agent_name
    tool_name = tool.name
    print(f"[Callback] Before tool call for tool '{tool_name}' in agent '{agent_name}'")
    print(f"[Callback] Original args: {args}")

    if tool_name == 'get_capital_city' and args.get('country', '').lower() == 'canada':
        print("[Callback] Detected 'Canada'. Modifying args to 'France'.")
        args['country'] = 'France'
        print(f"[Callback] Modified args: {args}")
        return None

    # 如果工具是 'get_capital_city' 且国家是 'BLOCK'
    if tool_name == 'get_capital_city' and args.get('country', '').upper() == 'BLOCK':
        print("[Callback] Detected 'BLOCK'. Skipping tool execution.")
        return {"result": "Tool execution was blocked by before_tool_callback."}

    print("[Callback] Proceeding with original or previously modified args.")
    return None

my_llm_agent = LlmAgent(
        name="ToolCallbackAgent",
        model=GEMINI_2_FLASH,
        instruction="You are an agent that can find capital cities. Use the get_capital_city tool.",
        description="An LLM agent demonstrating before_tool_callback",
        tools=[capital_tool],
        before_tool_callback=simple_before_tool_modifier
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
await call_agent_async("Canada")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)
// GetCapitalCityArgs 定义了 getCapitalCity 工具的参数。
type GetCapitalCityArgs struct {
	Country string `json:"country" jsonschema:"The country to get the capital of."`
}

// getCapitalCity 是一个返回给定国家首都的工具。
func getCapitalCity(ctx agent.Context, args *GetCapitalCityArgs) (string, error) {
	capitals := map[string]string{
		"canada":        "Ottawa",
		"france":        "Paris",
		"germany":       "Berlin",
		"united states": "Washington, D.C.",
	}
	capital, ok := capitals[strings.ToLower(args.Country)]
	if !ok {
		return "", fmt.Errorf("unknown country: %s", args.Country)
	}
	return capital, nil
}
func onBeforeTool(ctx agent.Context, t tool.Tool, args map[string]any) (map[string]any, error) {
	log.Printf("[Callback] BeforeTool triggered for tool %q in agent %q.", t.Name(), ctx.AgentName())
	log.Printf("[Callback] Original args: %v", args)

	if t.Name() == "getCapitalCity" {
		if country, ok := args["country"].(string); ok {
			if strings.ToLower(country) == "canada" {
				log.Println("[Callback] Detected 'Canada'. Modifying args to 'France'.")
				args["country"] = "France"
				return args, nil // Proceed with modified args
			} else if strings.ToUpper(country) == "BLOCK" {
				log.Println("[Callback] Detected 'BLOCK'. Skipping tool execution.")
				// 跳过工具并返回自定义结果。
				return map[string]any{"result": "Tool execution was blocked by before_tool_callback."}, nil
			}
		}
	}
	log.Println("[Callback] Proceeding with original or previously modified args.")
	return nil, nil // Proceed with original args
}

func runBeforeToolExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}
	capitalTool, err := functiontool.New(functiontool.Config{
		Name:        "getCapitalCity",
		Description: "Retrieves the capital city of a given country.",
	}, getCapitalCity)
	if err != nil {
		log.Fatalf("FATAL: Failed to create function tool: %v", err)
	}

	llmCfg := llmagent.Config{
		Name:                "AgentWithBeforeToolCallback",
		Model:               geminiModel,
		Tools:               []tool.Tool{capitalTool},
		BeforeToolCallbacks: []llmagent.BeforeToolCallback{onBeforeTool},
		Instruction:         "You are an agent that can find capital cities. Use the getCapitalCity tool.",
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}
	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	log.Println("--- SCENARIO 1: Args should be modified ---")
	runScenario(ctx, r, sessionService, appName, "session_tool_modify", nil, "What is the capital of Canada?")

	log.Println("--- SCENARIO 2: Tool call should be blocked ---")
	runScenario(ctx, r, sessionService, appName, "session_tool_block", nil, "capital of BLOCK")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>
### 工具回调后 {#after-tool-callback}

**何时：** 在工具的 `run_async` 方法成功完成后立即调用。

**目的：** 允许在将工具结果发送回 LLM 之前（可能在摘要之后）检查和修改工具的结果。用于记录工具结果、后处理或格式化结果，或将结果的特定部分保存到会话状态。

**返回值效果：**

1. 如果回调返回 `None`（或 Java 中的 `Maybe.empty()` 对象），则使用原始 `tool_response`。
2. 如果返回新的字典，它将 **替换** 原始 `tool_response`。这允许修改或过滤 LLM 所看到的结果。

{{% alert context="info" %}}
**Python: `tool_response` 类型和返回值**

ADK 仅在回调运行后将非 `dict` 结果封装到 `{"result": <value>}` 中，因此经过注解的工具 `-> str` 会将您的 `after_tool_callback` 提供 `str`，而不是 `dict`。在调用字典方法之前请检查类型。

ADK 还将返回值与 `None` 进行比较，因此返回 `{}` 会用 `{}` 替换工具响应。返回 `None` 以保留原始响应。
{{% /alert %}}
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
from google.adk.runners import Runner
from typing import Optional
from google.genai import types
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.base_tool import BaseTool
from typing import Dict, Any
from copy import deepcopy

GEMINI_2_FLASH="gemini-2.0-flash"

# --- 定义一个简单的工具函数（与之前相同）---
def get_capital_city(country: str) -> str:
    """Retrieves the capital city of a given country."""
    print(f"--- Tool 'get_capital_city' executing with country: {country} ---")
    country_capitals = {
        "united states": "Washington, D.C.",
        "canada": "Ottawa",
        "france": "Paris",
        "germany": "Berlin",
    }
    return {"result": country_capitals.get(country.lower(), f"Capital not found for {country}")}

# --- 将函数封装为工具 ---
capital_tool = FunctionTool(func=get_capital_city)

# --- 定义回调函数 ---
def simple_after_tool_modifier(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext, tool_response: Dict
) -> Optional[Dict]:
    """Inspects/modifies the tool result after execution."""
    agent_name = tool_context.agent_name
    tool_name = tool.name
    print(f"[Callback] After tool call for tool '{tool_name}' in agent '{agent_name}'")
    print(f"[Callback] Args used: {args}")
    print(f"[Callback] Original tool_response: {tool_response}")

    # 函数工具结果的默认结构为 {"result": <return_value>}
    original_result_value = tool_response.get("result", "")
    # original_result_value = tool_response

    # --- 修改示例 ---
    # 如果工具是 'get_capital_city' 并且结果是 'Washington, D.C.'
    if tool_name == 'get_capital_city' and original_result_value == "Washington, D.C.":
        print("[Callback] Detected 'Washington, D.C.'. Modifying tool response.")

        # 重要：创建一个新字典或修改副本
        modified_response = deepcopy(tool_response)
        modified_response["result"] = f"{original_result_value} (Note: This is the capital of the USA)."
        modified_response["note_added_by_callback"] = True # Add extra info if needed

        print(f"[Callback] Modified tool_response: {modified_response}")
        return modified_response # Return the modified dictionary

    print("[Callback] Passing original tool response through.")
    # 返回 None 以使用原始的 tool_response
    return None

# 创建 LlmAgent 并分配回调
my_llm_agent = LlmAgent(
        name="AfterToolCallbackAgent",
        model=GEMINI_2_FLASH,
        instruction="You are an agent that finds capital cities using the get_capital_city tool. Report the result clearly.",
        description="An LLM agent demonstrating after_tool_callback",
        tools=[capital_tool], # Add the tool
        after_tool_callback=simple_after_tool_modifier # Assign the callback
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
await call_agent_async("united states")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)
// GetCapitalCityArgs 定义了 getCapitalCity 工具的参数。
type GetCapitalCityArgs struct {
	Country string `json:"country" jsonschema:"The country to get the capital of."`
}

// getCapitalCity 是一个返回给定国家首都的工具。
func getCapitalCity(ctx agent.Context, args *GetCapitalCityArgs) (string, error) {
	capitals := map[string]string{
		"canada":        "Ottawa",
		"france":        "Paris",
		"germany":       "Berlin",
		"united states": "Washington, D.C.",
	}
	capital, ok := capitals[strings.ToLower(args.Country)]
	if !ok {
		return "", fmt.Errorf("unknown country: %s", args.Country)
	}
	return capital, nil
}
func onAfterTool(ctx agent.Context, t tool.Tool, args map[string]any, result map[string]any, err error) (map[string]any, error) {
	log.Printf("[Callback] AfterTool triggered for tool %q in agent %q.", t.Name(), ctx.AgentName())
	log.Printf("[Callback] Original result: %v", result)

	if err != nil {
		log.Printf("[Callback] Tool run produced an error: %v. Passing through.", err)
		return nil, err
	}

	if t.Name() == "getCapitalCity" {
		if originalResult, ok := result["result"].(string); ok && originalResult == "Washington, D.C." {
			log.Println("[Callback] Detected 'Washington, D.C.'. Modifying tool response.")
			modifiedResult := make(map[string]any)
			for k, v := range result {
				modifiedResult[k] = v
			}
			modifiedResult["result"] = fmt.Sprintf("%s (Note: This is the capital of the USA).", originalResult)
			modifiedResult["note_added_by_callback"] = true
			return modifiedResult, nil
		}
	}

	log.Println("[Callback] Passing original tool response through.")
	return nil, nil
}

func runAfterToolExample() {
	ctx := context.Background()
	geminiModel, err := gemini.NewModel(ctx, modelName, &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("FATAL: Failed to create model: %v", err)
	}
	capitalTool, err := functiontool.New(functiontool.Config{
		Name:        "getCapitalCity",
		Description: "Retrieves the capital city of a given country.",
	}, getCapitalCity)
	if err != nil {
		log.Fatalf("FATAL: Failed to create function tool: %v", err)
	}

	llmCfg := llmagent.Config{
		Name:               "AgentWithAfterToolCallback",
		Model:              geminiModel,
		Tools:              []tool.Tool{capitalTool},
		AfterToolCallbacks: []llmagent.AfterToolCallback{onAfterTool},
		Instruction:        "You are an agent that finds capital cities. Use the getCapitalCity tool.",
	}
	testAgent, err := llmagent.New(llmCfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to create agent: %v", err)
	}
	sessionService := session.InMemoryService()
	r, err := runner.New(runner.Config{AppName: appName, Agent: testAgent, SessionService: sessionService})
	if err != nil {
		log.Fatalf("FATAL: Failed to create runner: %v", err)
	}

	log.Println("--- SCENARIO 1: Result should be modified ---")
	runScenario(ctx, r, sessionService, appName, "session_tool_after_modify", nil, "capital of united states")
}
```

{{% /tab %}}
{{< /tabs >}}
</details>

---

原文：[Types of Callbacks](https://adk.dev/callbacks/types-of-callbacks/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/callbacks/types-of-callbacks.md)
