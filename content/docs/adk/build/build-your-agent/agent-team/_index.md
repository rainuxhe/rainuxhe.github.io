---
title: "Agent 团队"
description: "在 Colab 中打开"
icon: "article"
weight: 20
toc: true
---

<a href="https://colab.research.google.com/github/google/adk-docs/blob/main/examples/python/tutorial/agent_team/adk_tutorial.ipynb" target="_blank" style="display: inline-flex; align-items: center; gap: 5px; text-decoration: none; color: #4285F4;">
  <img width="32px" src="https://www.gstatic.com/pantheon/images/bigquery/welcome_page/colab-logo.svg" alt="Google Colaboratory logo">
  <span>Open 在 Colab</span>
</a>

本教程源自[Multi-tool agent](/docs/adk/build/build-your-agent/multi-tool-agent/)项目。现在，你准备好深入构建一个更复杂的**多 Agent 系统**。

我们将着手打造**天气机器人 Agent 团队**，逐步将高级功能叠加到简单的基础上。从一个能够查询天气的 Agent 开始，我们将逐步增加以下功能：

* 利用不同的AI模型（Gemini、GPT、Claude）。
* 设计专门的子 Agent，用于特定任务（如问候和告别）。
* 实现智能 Agent 之间的智能委托。
* 通过持久会话状态为 Agent 提供内存。
* 通过回调实施关键安全防护措施。

**为什么要有气象机器人团队？**

这一用例虽然看似简单，但为探索构建复杂、现实世界 Agent 应用所必需的核心 ADK 概念提供了实用且贴近生活的画布。你将学习如何构建交互、管理状态、确保安全，并协调多个AI“大脑”协同工作。

**什么是 ADK 再说一次？**

提醒一下，ADK 是一个 Python 框架，旨在简化由大型语言模型（LLM）驱动的应用程序开发。它提供了强大的构建模块，用于创建能够推理、规划、使用工具、动态与用户互动并在团队内有效协作的 Agent。

**在这个高级教程中，你将掌握：**

* ✅ **工具定义与使用：** 编写 Python 函数（`tools`），赋予 Agent 特定能力（如获取数据），并指导 Agent 有效使用这些功能。
* ✅ **多 LLM 灵活性：** 通过LiteLLM 集成配置 Agent 以利用各种主流 LLM（Gemini、GPT-4o、Claude Sonnet），从而为每个任务选择最佳模型。
* ✅ **Agent 委派与协作：** 设计专用子 Agent，并启用用户请求的自动路由（`auto flow`）到团队内最合适的 Agent。
* ✅ **会话状态用于记忆：** 利用`Session State`和`ToolContext`使 Agent 能够跨会话回合记忆信息，从而实现更多上下文交互。
* ✅ **带回调的安全护栏：** 实施`before_model_callback`和`before_tool_callback`，根据预设规则检查、修改或阻止请求/工具使用，提升应用安全性和控制。

**结束状态期望：**通过完成本教程，您将构建一个功能齐全的多 Agent 天气机器人系统。该系统不仅可以提供天气信息，还可以处理会话礼貌性，记住上次查询的城市，并在定义的安全范围内运行，所有操作都通过 ADK 协调。

**先决条件：**

*   ✅ **扎实的 Python 编程基础。**
*   ✅ **熟悉大型语言模型（LLM）、API 以及 Agent 的概念。**
*   ❗ **关键：完成 ADK 快速入门教程或具有相当的 ADK 基础知识（Agent Agent、Runner Runner、会话服务 SessionService、基本工具 Tool 使用）。** 本教程直接建立在这些概念之上。
*   ✅ **所使用 LLM 的 API 密钥**（例如用于 Gemini 的 Google AI Studio、OpenAI 平台、Anthropic 控制台）。
**关于执行环境的说明：**

本教程针对交互式笔记本环境（如 Google Colab、Colab Enterprise 或 Jupyter notebook）设计。请注意以下事项：

*   **运行异步代码：** 笔记本环境处理异步代码的方式不同。您将看到使用 `await`（适用于事件循环已经运行的情况，在笔记本中常见）或 `asyncio.run()`（通常在作为独立 `.py` 脚本运行或特定笔记本设置中需要）。代码块为两种情况提供了指导。
*   **手动 Runner/会话设置：** 步骤涉及显式创建 `Runner` 和 `SessionService` 实例。这种方法展示了如何精细控制 Agent 的执行生命周期、会话管理和状态持久化。

**可选：使用 ADK 内置工具（Web UI / CLI / API Server）**

如果您更喜欢使用 ADK 标准工具自动处理 Runner 和会话管理，可以找到适用于该目的的等效代码 ](https://github.com/google/adk-docs/tree/main/examples/python/tutorial/agent_team/adk_tutorial)。该版本设计可直接通过命令运行，例如 `adk web`（用于 Web UI）、`adk run`（用于 CLI 交互）或 `adk api_server`（用于暴露 API）。请遵循该替代资源中提供的 `README.md` 说明。
**准备好构建您的 Agent 团队了吗？让我们开始吧！**

> **注意：** 本教程适用于 adk 版本 1.0.0 及以上

```python
# @title 步骤 0：设置和安装
# 安装 ADK 和 LiteLLM 以支持多模型

!pip install google-adk -q
!pip install "litellm>=1.84" -q

print("Installation complete.")
```

```python
# @title 导入必要的库
import os
import asyncio
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm # For multi-model support
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types # For creating message Content/Parts

import warnings
# 忽略所有警告
warnings.filterwarnings("ignore")

import logging
logging.basicConfig(level=logging.ERROR)

print("Libraries imported.")
```

```python
# @title 配置 API 密钥（请替换为您的实际密钥！）

# --- 重要提示：请将占位符替换为您的真实 API 密钥 ---

# Gemini API 密钥（从 Google AI Studio 获取：https://aistudio.google.com/app/apikey）
os.environ["GOOGLE_API_KEY"] = "YOUR_GOOGLE_API_KEY" # <--- REPLACE

# ［可选］
# OpenAI API 密钥（从 OpenAI 平台获取：https://platform.openai.com/api-keys）
os.environ['OPENAI_API_KEY'] = 'YOUR_OPENAI_API_KEY' # <--- REPLACE

# ［可选］
# Anthropic API 密钥（从 Anthropic 控制台获取：https://console.anthropic.com/settings/keys）
os.environ['ANTHROPIC_API_KEY'] = 'YOUR_ANTHROPIC_API_KEY' # <--- REPLACE

# --- 验证密钥（可选检查） ---
print("API Keys Set:")
print(f"Google API Key set: {'Yes' if os.environ.get('GOOGLE_API_KEY') and os.environ['GOOGLE_API_KEY'] != 'YOUR_GOOGLE_API_KEY' else 'No (REPLACE PLACEHOLDER!)'}")
print(f"OpenAI API Key set: {'Yes' if os.environ.get('OPENAI_API_KEY') and os.environ['OPENAI_API_KEY'] != 'YOUR_OPENAI_API_KEY' else 'No (REPLACE PLACEHOLDER!)'}")
print(f"Anthropic API Key set: {'Yes' if os.environ.get('ANTHROPIC_API_KEY') and os.environ['ANTHROPIC_API_KEY'] != 'YOUR_ANTHROPIC_API_KEY' else 'No (REPLACE PLACEHOLDER!)'}")

# 将 ADK 配置为直接使用 API 密钥（而不是多模型设置的 Agent 平台）
os.environ["GOOGLE_GENAI_USE_ENTERPRISE"] = "False"

# @markdown **安全提示：** 最佳实践是安全地管理 API 密钥（例如使用 Colab Secrets 或环境变量），而不是直接将它们硬编码在笔记本中。请替换上方的占位符字符串。
```

```python
# --- 为了更方便使用，定义模型常量 ---

# 更多支持的模型可以参考这里：https://ai.google.dev/gemini-api/docs/models#model-variations
MODEL_GEMINI_FLASH = "gemini-flash-latest"

# 更多支持的模型可以参考这里：https://docs.litellm.ai/docs/providers/openai#openai-chat-completion-models
MODEL_GPT_4O = "openai/gpt-4.1" # You can also try: gpt-4.1-mini, gpt-4o etc.

# 更多支持的模型可以参考这里：https://docs.litellm.ai/docs/providers/anthropic
MODEL_CLAUDE_SONNET = "claude-sonnet-4-6" # You can also try: claude-opus-4-6, etc

print("\nEnvironment configured.")
```

## 第一步：你的第一个 Agent - 基本天气查询 {#step-1-your-first-agent---basic-weather-lookup}

让我们开始构建天气机器人的基础组件：一个能够执行特定任务的单一 Agent——查询天气信息。这涉及创建两个核心部分：

1. **工具：** 一个 Python 函数，为 Agent 提供获取天气数据的*能力*。
2. **Agent：** AI 的“头脑”，它理解用户的请求，知道自己拥有一个天气工具，并决定何时以及如何使用它。

**1. 定义工具 (`get_weather`)**

在 ADK 中，**工具** 是构建 Agent 的基石，它们赋予 Agent 超越文本生成的具体能力。它们通常是执行特定操作的普通 Python 函数，比如调用 API、查询数据库或进行计算。

我们的第一个工具将提供一个*模拟*天气报告。这使我们可以专注于 Agent 结构，而无需立即获取外部 API 密钥。之后，你可以轻松将这个模拟函数替换为调用真实天气服务的函数。

**关键概念：文档字符串至关重要！** Agent 的 LLM 在很大程度上依赖函数的**文档字符串**来理解：

* 工具*做什么*。
* 何时使用它。
* 它需要哪些参数 (`city: str`)。
* 它返回哪些信息。

**最佳实践：** 为你的工具编写清晰、描述准确的文档字符串。这对于 LLM 正确使用工具至关重要。

```python
# @title 定义 get_weather 工具
def get_weather(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Args:
        city (str): The name of the city (e.g., "New York", "London", "Tokyo").

    Returns:
        dict: A dictionary containing the weather information.
              Includes a 'status' key ('success' or 'error').
              If 'success', includes a 'report' key with weather details.
              If 'error', includes an 'error_message' key.
    """
    print(f"--- Tool: get_weather called for city: {city} ---") # Log tool execution
    city_normalized = city.lower().replace(" ", "") # Basic normalization

    # 模拟天气数据
    mock_weather_db = {
        "newyork": {"status": "success", "report": "The weather in New York is sunny with a temperature of 25°C."},
        "london": {"status": "success", "report": "It's cloudy in London with a temperature of 15°C."},
        "tokyo": {"status": "success", "report": "Tokyo is experiencing light rain and a temperature of 18°C."},
    }

    if city_normalized in mock_weather_db:
        return mock_weather_db[city_normalized]
    else:
        return {"status": "error", "error_message": f"Sorry, I don't have weather information for '{city}'."}

# 工具示例使用（可选测试）
print(get_weather("New York"))
print(get_weather("Paris"))
```

**2\. 定义 Agent (`weather_agent`)**

现在，让我们创建**Agent**本身。在 ADK 中，`Agent` 协调用户、LLM 与可用工具之间的交互。

我们通过几个关键参数进行配置：

* `name`：该 Agent 的唯一标识符（例如，“weather_agent_v1”）。
* `model`：指定使用哪种 LLM（例如 `MODEL_GEMINI_FLASH`）。我们将从一个特定的 Gemini 模型开始。
* `description`：Agent 整体目标的简要总结。当其他 Agent 需要决定是否将任务委派给**此**Agent 时，这一点非常重要。
* `instruction`：为 LLM 提供的详细指导，包括其行为、角色、目标，以及具体**如何以及何时**使用分配的 `tools`。
* `tools`：包含 Agent 允许使用的实际 Python 工具函数的列表（例如 `[get_weather]`）。

**最佳实践：** 提供清晰而具体的 `instruction` 提示。指令越详细，LLM 越能理解自己的角色以及如何有效使用其工具。在需要时，要明确错误处理方式。

**最佳实践：** 选择描述性强的 `name` 和 `description` 值。这些值在 ADK 内部使用，对于自动委派等功能至关重要（稍后会讲）。

```python
# @title 定义天气 Agent
# 使用之前定义的某一个模型常量
AGENT_MODEL = MODEL_GEMINI_FLASH # Starting with Gemini

weather_agent = Agent(
    name="weather_agent_v1",
    model=AGENT_MODEL, # Can be a string for Gemini or a LiteLlm object
    description="Provides weather information for specific cities.",
    instruction="You are a helpful weather assistant. "
                "When the user asks for the weather in a specific city, "
                "use the 'get_weather' tool to find the information. "
                "If the tool returns an error, inform the user politely. "
                "If the tool is successful, present the weather report clearly.",
    tools=[get_weather], # Pass the function directly
)

print(f"Agent '{weather_agent.name}' created using model '{AGENT_MODEL}'.")
```

**3\. 设置 Runner 和会话服务**

要管理对话并执行 Agent，我们还需要两个组件：

* `SessionService`：负责管理不同用户和会话的对话历史和状态。`InMemorySessionService` 是一个简单的实现，所有内容都存储在内存中，适用于测试和简单应用。它会跟踪交换的消息。我们将在步骤 4 中进一步探讨状态持久化。
* `Runner`：负责协调交互流程的引擎。它接收用户输入，将其路由到相应的 Agent，根据 Agent 的逻辑管理对 LLM 和工具的调用，通过 `SessionService` 处理会话更新，并产生表示交互进展的事件。

```python
# @title 设置会话服务和 Runner

# --- 会话管理 ---
# 关键概念：SessionService 存储对话历史和状态。
# InMemorySessionService 是本教程中简单的、非持久化的存储。
session_service = InMemorySessionService()

# 定义用于识别交互上下文的常量
APP_NAME = "weather_tutorial_app"
USER_ID = "user_1"
SESSION_ID = "session_001" # Using a fixed ID for simplicity

# 创建会话，进行对话的具体场所
session = await session_service.create_session(
    app_name=APP_NAME,
    user_id=USER_ID,
    session_id=SESSION_ID
)
print(f"Session created: App='{APP_NAME}', User='{USER_ID}', Session='{SESSION_ID}'")

# --- 或者 ---

# 如果作为标准 Python 脚本 (.py 文件) 运行，请取消注释以下行：

# from google.adk.sessions import Session
#
# async def init_session(app_name:str,user_id:str,session_id:str) -> Session:
#     session = await session_service.create_session(
#         app_name=app_name,
#         user_id=user_id,
#         session_id=session_id
#     )
#     print(f"会话已创建: App='{app_name}', User='{user_id}', Session='{session_id}'")
#     return session
#
# session = asyncio.run(init_session(APP_NAME,USER_ID,SESSION_ID))

# --- Runner ---
# 关键概念：Runner（Runner）协调 Agent 的执行循环。
runner = Runner(
    agent=weather_agent, # The agent we want to run
    app_name=APP_NAME,   # Associates runs with our app
    session_service=session_service # Uses our session manager
)
print(f"Runner created for agent '{runner.agent.name}'.")
```

**4\. 与 Agent 互动**

我们需要一种方式向 Agent 发送消息并接收其响应。由于 LLM 调用和工具执行可能需要时间，ADK 的 `Runner` 是异步操作的。

我们将定义一个 `async` 辅助函数 (`call_agent_async`)，该函数：

1. 接收用户查询字符串。
2. 将其打包为 ADK `Content` 格式。
3. 调用 `runner.run_async`，提供用户/会话上下文和新消息。
4. 遍历 Runner 生成的 **事件**。事件表示 Agent 执行的各个步骤（例如，请求工具调用、接收工具结果、中间 LLM 思路、最终响应）。
5. 使用 `event.is_final_response()` 识别并打印 **最终响应** 事件。

**为什么使用 `async`?** 与 LLM 以及可能的工具（如外部 API）的交互是 I/O 密集型操作。使用 `asyncio` 可以让程序高效处理这些操作，而不会阻塞执行。

```python
# @title 定义 Agent 交互函数

from google.genai import types # For creating message Content/Parts

async def call_agent_async(query: str, runner, user_id, session_id):
  """Sends a query to the agent and prints the final response."""
  print(f"\n>>> User Query: {query}")

  # 以 ADK 格式准备用户的消息
  content = types.Content(role='user', parts=[types.Part(text=query)])

  final_response_text = "Agent did not produce a final response." # Default

  # 关键概念：run_async 执行 Agent 逻辑并生成事件。
  # 我们遍历事件以找到最终答案。
  async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
      # 您可以取消注释下面的行以查看执行期间的*所有*事件
      # print(f"  [事件] 作者: {event.author}, 类型: {type(event).__name__}, 是否最终: {event.is_final_response()}, 内容: {event.content}")

      # 关键概念：is_final_response() 标记回合的最终消息。
      if event.is_final_response():
          if event.content and event.content.parts:
             # 假设文本响应在第一部分
             final_response_text = event.content.parts[0].text
          elif event.actions and event.actions.escalate: # Handle potential errors/escalations
             final_response_text = f"Agent escalated: {event.error_message or 'No specific message.'}"
          # 如有需要，可在此添加更多检查（例如，特定的错误代码）
          break # Stop processing events once the final response is found

  print(f"<<< Agent Response: {final_response_text}")
```

**5. 运行对话**

最后，让我们通过向 Agent 发送一些查询来测试我们的设置。我们将 `async` 调用包装在一个主 zxqadkterm0001qzx 函数中，并使用 `await` 运行它。

观察输出：

* 查看用户查询。
* 注意当 Agent 使用工具时的 `--- Tool: get_weather called... ---` 日志。
* 观察 Agent 的最终响应，包括它如何处理无法获取天气数据的情况（例如巴黎）。

```python
# @title 运行初始对话

# 我们需要一个异步函数来等待我们的交互助手
async def run_conversation():
    await call_agent_async("What is the weather like in London?",
                                       runner=runner,
                                       user_id=USER_ID,
                                       session_id=SESSION_ID)

    await call_agent_async("How about Paris?",
                                       runner=runner,
                                       user_id=USER_ID,
                                       session_id=SESSION_ID) # Expecting the tool's error message

    await call_agent_async("Tell me the weather in New York",
                                       runner=runner,
                                       user_id=USER_ID,
                                       session_id=SESSION_ID)

# 在异步上下文中使用 await 执行对话（比如 Colab/Jupyter）
await run_conversation()

# --- 或者 ---

# 如果作为标准 Python 脚本 (.py 文件) 运行，请取消注释以下行：
# import asyncio
# if __name__ == "__main__":
#     try:
#         asyncio.run(run_conversation())
#     except Exception as e:
#         print(f"发生错误: {e}")
```

恭喜你！你已经成功构建并与第一个 ADK Agent 进行了交互。它能够理解用户的请求，使用工具查找信息，并根据工具的结果做出适当的回应。

在下一步中，我们将探索如何轻松切换为支持该 Agent 的底层语言模型。

## 第 2 步：使用 LiteLLM 进行多模型操作【可选】 {#step-2-going-multi-model-with-litellm-optional}

在第 1 步中，我们构建了一个由特定 Gemini 模型驱动的功能性天气 Agent。虽然有效，但实际应用中通常受益于使用*不同*大型语言模型（LLM）的灵活性。为什么？

* **性能：** 一些模型在特定任务上表现出色（例如，编码、推理、创意写作）。
* **成本：** 不同模型的价格各异。
* **功能：** 模型提供多样的特性、上下文窗口大小和微调选项。
* **可用性/冗余：** 拥有备选方案可以确保即使某个提供商出现问题，你的应用仍能正常运行。

ADK 通过与 [**LiteLLM**](https://github.com/BerriAI/litellm) 库的集成，使模型切换变得无缝。LiteLLM 充当对 100 多种不同 LLM 的一致接口。

**在本步骤中，我们将：**

1. 学习如何配置 ADK（`Agent`）以使用来自 OpenAI（GPT）和 Anthropic（Claude）等提供商的模型，通过 `LiteLlm` 封装。
2. 定义、配置（各自拥有自己的会话和执行器）并立即测试我们天气 Agent 的实例，每个实例都由不同的 LLM 支持。
3. 与这些不同的 Agent 互动，即使使用相同的底层工具，也可观察它们响应的潜在差异。

**1\. 导入 `LiteLlm`**

我们在最初的设置（第 0 步）中已导入此组件，但它是多模型支持的关键组成部分：

```python
# @title 1. 导入 LiteLlm
from google.adk.models.lite_llm import LiteLlm
```

**2\. 定义和测试多模型 Agent**

与其只传递模型名称字符串（默认使用 Google 的 Gemini 模型），我们将所需的模型标识符字符串封装在 `LiteLlm` 类中。

*   **关键概念：`LiteLlm` 包装器：** `LiteLlm(model="provider/model_name")` 语法告诉 ADK 通过 LiteLLM 库将此 Agent 的请求路由到指定的模型提供者。

确保你已经在步骤 0 中配置了 OpenAI 和 Anthropic 的必需 API 密钥。我们将使用 `call_agent_async` 函数（之前定义的，现在接受 `runner`、`user_id` 和 `session_id`）在每个 Agent 设置完成后立即与其交互。

下面的每个块将会：

*   使用特定的 LiteLLM 模型（`MODEL_GPT_4O` 或 `MODEL_CLAUDE_SONNET`）定义 Agent。
*   为该 Agent 的测试运行创建一个*新的、独立的* `InMemorySessionService` 和会话。这能让对话历史保持隔离，以便演示。
*   创建一个为特定 Agent 及其会话服务配置的 `Runner`。
*   立即调用 `call_agent_async` 发送查询并测试 Agent。

**最佳实践：** 使用模型名称的常量（如步骤 0 定义的 `MODEL_GPT_4O`、`MODEL_CLAUDE_SONNET`）以避免拼写错误并使代码更易管理。

**错误处理：** 我们将 Agent 定义封装在 `try...except` 块中。这可以防止整个代码单元因某个提供者的 API 密钥缺失或无效而失败，从而允许教程继续使用已配置的模型。

首先，让我们使用 OpenAI 的 GPT-4o 创建并测试 Agent。

```python
# @title 定义并测试 GPT Agent

# 确保步骤 1 中的 'get_weather' 函数在你的环境中已定义。
# 确保之前已定义 'call_agent_async'。

# --- 使用 GPT-4o 的 Agent ---
weather_agent_gpt = None # Initialize to None
runner_gpt = None      # Initialize runner to None

try:
    weather_agent_gpt = Agent(
        name="weather_agent_gpt",
        # 关键更改：包装 LiteLLM 模型标识符
        model=LiteLlm(model=MODEL_GPT_4O),
        description="Provides weather information (using GPT-4o).",
        instruction="You are a helpful weather assistant powered by GPT-4o. "
                    "Use the 'get_weather' tool for city weather requests. "
                    "Clearly present successful reports or polite error messages based on the tool's output status.",
        tools=[get_weather], # Re-use the same tool
    )
    print(f"Agent '{weather_agent_gpt.name}' created using model '{MODEL_GPT_4O}'.")

    # InMemorySessionService 是本教程中简单的、非持久化的存储。
    session_service_gpt = InMemorySessionService() # Create a dedicated service

    # 定义用于识别交互上下文的常量
    APP_NAME_GPT = "weather_tutorial_app_gpt" # Unique app name for this test
    USER_ID_GPT = "user_1_gpt"
    SESSION_ID_GPT = "session_001_gpt" # Using a fixed ID for simplicity

    # 创建会话，进行对话的具体场所
    session_gpt = await session_service_gpt.create_session(
        app_name=APP_NAME_GPT,
        user_id=USER_ID_GPT,
        session_id=SESSION_ID_GPT
    )
    print(f"Session created: App='{APP_NAME_GPT}', User='{USER_ID_GPT}', Session='{SESSION_ID_GPT}'")

    # 为该 Agent 及其会话服务创建专用 Runner
    runner_gpt = Runner(
        agent=weather_agent_gpt,
        app_name=APP_NAME_GPT,       # Use the specific app name
        session_service=session_service_gpt # Use the specific session service
        )
    print(f"Runner created for agent '{runner_gpt.agent.name}'.")

    # --- 测试 GPT Agent ---
    print("\n--- Testing GPT Agent ---")
    # 确保 call_agent_async 使用正确的 Runner、user_id 和 session_id
    await call_agent_async(query = "What's the weather in Tokyo?",
                           runner=runner_gpt,
                           user_id=USER_ID_GPT,
                           session_id=SESSION_ID_GPT)
    # --- 或者 ---

    # 如果作为标准 Python 脚本 (.py 文件) 运行，请取消注释以下行：
    # import asyncio
    # if __name__ == "__main__":
    #     try:
    #         asyncio.run(call_agent_async(query = "东京的天气怎么样？",
    #                      runner=runner_gpt,
    #                       user_id=USER_ID_GPT,
    #                       session_id=SESSION_ID_GPT)
    #     except Exception as e:
    #         print(f"发生错误: {e}")

except Exception as e:
    print(f"❌ Could not create or run GPT agent '{MODEL_GPT_4O}'. Check API Key and model name. Error: {e}")
```

接下来，我们将对Anthropic的Claude Sonnet做同样的操作。

```python
# @title 定义并测试 Claude Agent

# 确保步骤 1 中的 'get_weather' 函数在你的环境中已定义。
# 确保之前已定义 'call_agent_async'。

# --- 使用 Claude Sonnet 的 Agent ---
weather_agent_claude = None # Initialize to None
runner_claude = None      # Initialize runner to None

try:
    weather_agent_claude = Agent(
        name="weather_agent_claude",
        # 关键更改：包装 LiteLLM 模型标识符
        model=LiteLlm(model=MODEL_CLAUDE_SONNET),
        description="Provides weather information (using Claude Sonnet).",
        instruction="You are a helpful weather assistant powered by Claude Sonnet. "
                    "Use the 'get_weather' tool for city weather requests. "
                    "Analyze the tool's dictionary output ('status', 'report'/'error_message'). "
                    "Clearly present successful reports or polite error messages.",
        tools=[get_weather], # Re-use the same tool
    )
    print(f"Agent '{weather_agent_claude.name}' created using model '{MODEL_CLAUDE_SONNET}'.")

    # InMemorySessionService 是本教程中简单的、非持久化的存储。
    session_service_claude = InMemorySessionService() # Create a dedicated service

    # 定义用于识别交互上下文的常量
    APP_NAME_CLAUDE = "weather_tutorial_app_claude" # Unique app name
    USER_ID_CLAUDE = "user_1_claude"
    SESSION_ID_CLAUDE = "session_001_claude" # Using a fixed ID for simplicity

    # 创建会话，进行对话的具体场所
    session_claude = await session_service_claude.create_session(
        app_name=APP_NAME_CLAUDE,
        user_id=USER_ID_CLAUDE,
        session_id=SESSION_ID_CLAUDE
    )
    print(f"Session created: App='{APP_NAME_CLAUDE}', User='{USER_ID_CLAUDE}', Session='{SESSION_ID_CLAUDE}'")

    # 为该 Agent 及其会话服务创建专用 Runner
    runner_claude = Runner(
        agent=weather_agent_claude,
        app_name=APP_NAME_CLAUDE,       # Use the specific app name
        session_service=session_service_claude # Use the specific session service
        )
    print(f"Runner created for agent '{runner_claude.agent.name}'.")

    # --- 测试 Claude Agent ---
    print("\n--- Testing Claude Agent ---")
    # 确保 call_agent_async 使用正确的 Runner、user_id 和 session_id
    await call_agent_async(query = "Weather in London please.",
                           runner=runner_claude,
                           user_id=USER_ID_CLAUDE,
                           session_id=SESSION_ID_CLAUDE)

    # --- 或者 ---

    # 如果作为标准 Python 脚本 (.py 文件) 运行，请取消注释以下行：
    # import asyncio
    # if __name__ == "__main__":
    #     try:
    #         asyncio.run(call_agent_async(query = "请提供伦敦的天气。",
    #                      runner=runner_claude,
    #                       user_id=USER_ID_CLAUDE,
    #                       session_id=SESSION_ID_CLAUDE)
    #     except Exception as e:
    #         print(f"发生错误: {e}")

except Exception as e:
    print(f"❌ Could not create or run Claude agent '{MODEL_CLAUDE_SONNET}'. Check API Key and model name. Error: {e}")
```

仔细观察两个代码块的输出。你应该会看到：

1. 每个 Agent（`weather_agent_gpt`、`weather_agent_claude`）成功创建（如果 API 密钥有效）。
2. 为每个项目设立专属会话和跑腿。
3. 每个 Agent 在处理查询时正确识别使用`get_weather`工具的必要性（你会看到`--- Tool: get_weather called... ---`日志）。
4. *底层工具逻辑*保持相同，始终返回我们的模拟数据。
5. 然而，每个 Agent 生成的**最终文本回复**在措辞、语气或格式上可能略有不同。这是因为指令提示由不同的大型语言模型（GPT-4o vs. Claude Sonnet）解释和执行。

这一步展示了 ADK LiteLLM 所提供的强大与灵活性。你可以在保持核心应用逻辑（工具、基本 Agent 结构）一致的同时，轻松地尝试和部署各种 LLM 的 Agent。

下一步，我们将超越单一 Agent，建立一个小型团队，让 Agent 们可以相互委派任务！
## 第三步：组建经纪人团队 \- 问候与告别代表团 {#step-3-building-an-agent-team---delegation-for-greetings--farewells}

在第一和第二步中，我们构建并试验了一个专注于天气查询的单一 Agent。虽然对其特定任务有效，但实际应用通常涉及处理更广泛的用户交互。我们*本*可以不断为单一天气 Agent 添加更多工具和复杂指令，但这很快会变得难以管理且效率下降。

更为有力的方法是组建**Agent 团队**。这包括：

1. 创建多个**专用 Agent**，每个 Agent 针对特定能力设计（例如，一个用于天气，一个用于问候，一个用于计算）。
2. 指定一个**根 Agent（或编排器）来接收初始用户请求。
3. 使根 Agent 能够根据用户意图**委托**请求给最合适的专业子 Agent。

**为什么要组建特工团队？**

* **模块化：** 更易于开发、测试和维护单个 Agent。
* **专业化：** 每个 Agent 都可以根据其特定任务进行微调（指令、型号选择）。
* **可扩展性：** 通过添加新 Agent 更简单地添加新功能。
* **效率：** 允许使用可能更简单/更便宜的模型来完成更简单的任务（如问候）。

**在这一步中，我们将：**1. 定义处理问候（`say_hello`）和告别（`say_goodbye`）的简单工具。
2. 创建两个新的专业子 Agent：`greeting_agent`和`farewell_agent`。
3. 更新我们的主天气 Agent（`weather_agent_v2`）作为**根 Agent**。
4. 配置根 Agent 及其子 Agent，启用**自动委派**。
5. 通过向根 Agent 发送不同类型的请求来测试委派流程。
**1\.定义子 Agent 工具**

首先，让我们创建简单的 Python 函数，作为我们新专业 Agent 的工具。请记住，清晰的文档字符串对使用它们的 Agent 至关重要。

```python
# @title 为问候和告别 Agent 定义工具
from typing import Optional # Make sure to import Optional

# 如果单独运行此步骤，请确保步骤1中的 'get_weather' 可用。
# def get_weather(city: str) -> dict: ...（来自步骤1）

def say_hello(name: Optional[str] = None) -> str:
    """Provides a simple greeting. If a name is provided, it will be used.

    Args:
        name (str, optional): The name of the person to greet. Defaults to a generic greeting if not provided.

    Returns:
        str: A friendly greeting message.
    """
    if name:
        greeting = f"Hello, {name}!"
        print(f"--- Tool: say_hello called with name: {name} ---")
    else:
        greeting = "Hello there!" # Default greeting if name is None or not explicitly passed
        print(f"--- Tool: say_hello called without a specific name (name_arg_value: {name}) ---")
    return greeting

def say_goodbye() -> str:
    """Provides a simple farewell message to conclude the conversation."""
    print(f"--- Tool: say_goodbye called ---")
    return "Goodbye! Have a great day."

print("Greeting and Farewell tools defined.")

# 可选自测
print(say_hello("Alice"))
print(say_hello()) # Test with no argument (should use default "Hello there!")
print(say_hello(name=None)) # Test with name explicitly as None (should use default "Hello there!")
```

**2. 定义子 Agent（问候与告别）**

现在，为我们的专家创建 `Agent` 实例。注意他们高度集中的 `instruction`，并且至关重要的是，他们清晰的 `description`。`description` 是 *根 Agent* 用来决定 *何时* 委派给这些子 Agent 的主要信息。

**最佳实践：** 子 Agent `description` 字段应准确且简明地总结其特定能力。这对于有效的自动委派至关重要。

**最佳实践：** 子 Agent `instruction` 字段应根据其有限范围进行定制，明确告诉他们该做什么以及*不*该做什么（例如，“你的*唯一*任务是...”）。

```python
# @title 定义问候和告别子 Agent

# 如果您想使用除 Gemini 以外的模型，请确保已导入 LiteLlm 并设置 API 密钥（从步骤 0/2 开始）
# from google.adk.models.lite_llm import LiteLlm
# 应该定义 MODEL_GPT_4O、MODEL_CLAUDE_SONNET 等
# 否则，继续使用：model = MODEL_GEMINI_FLASH

# --- 问候 Agent ---
greeting_agent = None
try:
    greeting_agent = Agent(
        # 对简单任务使用可能不同/更便宜的模型
        model = MODEL_GEMINI_FLASH,
        # model=LiteLlm(model=MODEL_GPT_4O), # 如果您想尝试其他模型
        name="greeting_agent",
        instruction="You are the Greeting Agent. Your ONLY task is to provide a friendly greeting to the user. "
                    "Use the 'say_hello' tool to generate the greeting. "
                    "If the user provides their name, make sure to pass it to the tool. "
                    "Do not engage in any other conversation or tasks.",
        description="Handles simple greetings and hellos using the 'say_hello' tool.", # Crucial for delegation
        tools=[say_hello],
    )
    print(f"✅ Agent '{greeting_agent.name}' created using model '{greeting_agent.model}'.")
except Exception as e:
    print(f"❌ Could not create Greeting agent. Check API Key ({greeting_agent.model}). Error: {e}")

# --- 告别 Agent ---
farewell_agent = None
try:
    farewell_agent = Agent(
        # 可以使用相同或不同的模型
        model = MODEL_GEMINI_FLASH,
        # model=LiteLlm(model=MODEL_GPT_4O), # 如果您想尝试其他模型
        name="farewell_agent",
        instruction="You are the Farewell Agent. Your ONLY task is to provide a polite goodbye message. "
                    "Use the 'say_goodbye' tool when the user indicates they are leaving or ending the conversation "
                    "(e.g., using words like 'bye', 'goodbye', 'thanks bye', 'see you'). "
                    "Do not perform any other actions.",
        description="Handles simple farewells and goodbyes using the 'say_goodbye' tool.", # Crucial for delegation
        tools=[say_goodbye],
    )
    print(f"✅ Agent '{farewell_agent.name}' created using model '{farewell_agent.model}'.")
except Exception as e:
    print(f"❌ Could not create Farewell agent. Check API Key ({farewell_agent.model}). Error: {e}")
```

**3\. 使用子 Agent 定义根 Agent（Weather Agent v2）**

现在，我们升级我们的 `weather_agent`。主要修改包括：

* 添加 `sub_agents` 参数：我们传入一个包含刚创建的 `greeting_agent` 和 `farewell_agent` 实例的列表。
* 更新 `instruction`：我们明确告诉根 Agent 它的子 Agent 是谁以及*何时*应将任务委派给它们。

**关键概念：自动委派（Auto Flow）** 通过提供 `sub_agents` 列表，ADK 实现自动委派。当根 Agent 收到用户查询时，其 LLM 不仅会考虑自身的指令和工具，还会考虑每个子 Agent 的 `description`。如果 LLM 判定某个查询更适合某个子 Agent 的描述能力（例如，“处理简单问候”），它将自动生成一个特殊的内部操作来*将控制权转移*给该子 Agent 进行该轮处理。然后子 Agent 使用其自身的模型、指令和工具处理查询。

**最佳实践：** 确保根 Agent 的指令清晰地指导其委派决策。提及子 Agent 的名称，并描述发生委派的条件。

```python
# @title 使用子 Agent 定义根 Agent

# 在定义根 Agent 之前，确保子 Agent 已成功创建。
# 还要确保原始的 'get_weather' 工具已定义。
root_agent = None
runner_root = None # Initialize runner

if greeting_agent and farewell_agent and 'get_weather' in globals():
    # 让我们为根 Agent 使用一个有能力的 Gemini 模型来处理协调
    root_agent_model = MODEL_GEMINI_FLASH

    weather_agent_team = Agent(
        name="weather_agent_v2", # Give it a new version name
        model=root_agent_model,
        description="The main coordinator agent. Handles weather requests and delegates greetings/farewells to specialists.",
        instruction="You are the main Weather Agent coordinating a team. Your primary responsibility is to provide weather information. "
                    "Use the 'get_weather' tool ONLY for specific weather requests (e.g., 'weather in London'). "
                    "You have specialized sub-agents: "
                    "1. 'greeting_agent': Handles simple greetings like 'Hi', 'Hello'. Delegate to it for these. "
                    "2. 'farewell_agent': Handles simple farewells like 'Bye', 'See you'. Delegate to it for these. "
                    "Analyze the user's query. If it's a greeting, delegate to 'greeting_agent'. If it's a farewell, delegate to 'farewell_agent'. "
                    "If it's a weather request, handle it yourself using 'get_weather'. "
                    "For anything else, respond appropriately or state you cannot handle it.",
        tools=[get_weather], # Root agent still needs the weather tool for its core task
        # 关键更改：在此链接子 Agent！
        sub_agents=[greeting_agent, farewell_agent]
    )
    print(f"✅ Root Agent '{weather_agent_team.name}' created using model '{root_agent_model}' with sub-agents: {[sa.name for sa in weather_agent_team.sub_agents]}")

else:
    print("❌ Cannot create root agent because one or more sub-agents failed to initialize or 'get_weather' tool is missing.")
    if not greeting_agent: print(" - Greeting Agent is missing.")
    if not farewell_agent: print(" - Farewell Agent is missing.")
    if 'get_weather' not in globals(): print(" - get_weather function is missing.")
```

**4\. 与 Agent 团队互动**

现在我们已经定义了我们的根 Agent（`weather_agent_team` - *注意：确保此变量名与前面代码块中定义的名称匹配，很可能是 `# @title Define the Root Agent with Sub-Agents`，之前可能命名为 `root_agent`*）及其专门的子 Agent，接下来让我们测试委派机制。

以下代码块将会：

1. 定义一个 `async` 函数 `run_team_conversation`。
2. 在此函数内部，创建一个*新的、专用的* `InMemorySessionService` 以及一个专门的会话（`session_001_agent_team`），仅用于此次测试运行。这将隔离测试团队动态的对话历史。
3. 创建一个 `Runner`（`runner_agent_team`），配置为使用我们的 `weather_agent_team`（根 Agent）和专用会话服务。
4. 使用我们更新后的 `call_agent_async` 函数向 `runner_agent_team` 发送不同类型的查询（问候语、天气请求、告别语）。我们会为这次特定测试明确传递 Runner、用户 ID 和会话 ID。
5. 立即执行 `run_team_conversation` 函数。

我们预期以下流程：

1. “Hello there!” 查询会发送给 `runner_agent_team`。
2. 根 Agent（`weather_agent_team`）接收该查询，并根据其指令及 `greeting_agent` 的描述进行任务委派。
3. `greeting_agent` 处理该查询，调用其 `say_hello` 工具，并生成响应。
4. “纽约的天气如何？” 查询*不会*被委派，而是由根 Agent 直接使用其 `get_weather` 工具处理。
5. “谢谢，再见！” 查询被委派给 `farewell_agent`，该 Agent 使用其 `say_goodbye` 工具处理。

```python
# @标题 与 Agent 团队互动
import asyncio # Ensure asyncio is imported

# 确保根 Agent（例如前一单元格中的 'weather_agent_team' 或 'root_agent'）已定义。
# 确保 call_agent_async 函数已定义。

# 在定义对话函数之前检查根 Agent 变量是否存在
root_agent_var_name = 'root_agent' # Default name from Step 3 guide
if 'weather_agent_team' in globals(): # Check if user used this name instead
    root_agent_var_name = 'weather_agent_team'
elif 'root_agent' not in globals():
    print("⚠️ Root agent ('root_agent' or 'weather_agent_team') not found. Cannot define run_team_conversation.")
    # 如果代码块仍然运行，为防止稍后出现 NameError，可分配一个虚拟值
    root_agent = None # Or set a flag to prevent execution

# 仅在根 Agent 存在时定义和运行
if root_agent_var_name in globals() and globals()[root_agent_var_name]:
    # 定义对话逻辑的主要异步函数。
    # 此函数内部的 'await' 关键字对于异步操作是必要的。
    async def run_team_conversation():
        print("\n--- Testing Agent Team Delegation ---")
        session_service = InMemorySessionService()
        APP_NAME = "weather_tutorial_agent_team"
        USER_ID = "user_1_agent_team"
        SESSION_ID = "session_001_agent_team"
        session = await session_service.create_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID
        )
        print(f"Session created: App='{APP_NAME}', User='{USER_ID}', Session='{SESSION_ID}'")

        actual_root_agent = globals()[root_agent_var_name]
        runner_agent_team = Runner( # Or use InMemoryRunner
            agent=actual_root_agent,
            app_name=APP_NAME,
            session_service=session_service
        )
        print(f"Runner created for agent '{actual_root_agent.name}'.")

        # --- 使用 await 的互动（在 async def 内正确） ---
        await call_agent_async(query = "Hello there!",
                               runner=runner_agent_team,
                               user_id=USER_ID,
                               session_id=SESSION_ID)
        await call_agent_async(query = "What is the weather in New York?",
                               runner=runner_agent_team,
                               user_id=USER_ID,
                               session_id=SESSION_ID)
        await call_agent_async(query = "Thanks, bye!",
                               runner=runner_agent_team,
                               user_id=USER_ID,
                               session_id=SESSION_ID)

    # --- 执行 `run_team_conversation` 异步函数 ---
    # 根据你的环境选择下面的一种方法。
    # 注意：这可能需要所使用模型的 API 密钥！

    # 方法 1：直接 await（适用于笔记本/异步 REPL 默认）
    # 如果你的环境支持顶层 await（如 Colab/Jupyter 笔记本），
    # 意味着事件循环已经在运行，因此你可以直接 await 该函数。
    print("Attempting execution using 'await' (default for notebooks)...")
    await run_team_conversation()

    # 方法 2：asyncio.run（适用于标准 Python 脚本 [.py]）
    # 如果从终端以标准 Python 脚本运行此代码，
    # 脚本上下文是同步的。需要 `asyncio.run()`
    # 来创建并管理事件循环以执行你的异步函数。
    # 使用此方法：
    # 1. 注释掉上面的 `await run_team_conversation()` 行。
    # 2. 取消注释以下代码块：
    """
    import asyncio
    if __name__ == "__main__": # Ensures this runs only when script is executed directly
        print("Executing using 'asyncio.run()' (for standard Python scripts)...")
        try:
            # 这将创建事件循环，运行你的异步函数，并关闭循环。
            asyncio.run(run_team_conversation())
        except Exception as e:
            print(f"An error occurred: {e}")
    """

else:
    # 如果之前未找到根 Agent 变量，将打印此消息
    print("\n⚠️ Skipping agent team conversation execution as the root agent was not successfully defined in a previous step.")
```

仔细查看输出日志，特别是 `--- Tool: ... called ---` 消息。你应该会注意到：

* 对于“Hello there!”，调用了 `say_hello` 工具（表明 `greeting_agent` 处理了它）。
* 对于“What is the weather in New York?”，调用了 `get_weather` 工具（表明根 Agent 处理了它）。
* 对于“Thanks, bye!”，调用了 `say_goodbye` 工具（表明 `farewell_agent` 处理了它）。

这证实了 **自动委派** 成功！根 Agent 在其指令和 `description` 的 `sub_agents` 的指导下，正确地将用户请求路由到团队中合适的专家 Agent。

你现在已经构建了一个具有多个协作 Agent 的应用程序。这种模块化设计对于构建更复杂、更有能力的 Agent 系统是基本的。在下一步中，我们将赋予 Agent 使用会话状态在交互中记忆信息的能力。

## 第 4 步：使用会话状态添加记忆和个性化 {#step-4-adding-memory-and-personalization-with-session-state}

到目前为止，我们的 Agent 团队可以通过委派处理不同任务，但每次交互都是全新的——Agent 无法记住会话中的过去对话或用户偏好。为了创建更复杂和具有上下文感知的体验，Agent 需要 **记忆**。ADK 通过 **会话状态** 提供了这一功能。

**什么是会话状态？**

* 它是一个与特定用户会话关联的 Python 字典 (`session.state`)（通过 `APP_NAME`、`USER_ID`、`SESSION_ID` 标识会话）。
* 它在该会话的多轮对话中 *持续保存信息*。
* Agent 和工具可以读取和写入此状态，使它们能够记住细节、适应行为并个性化响应。

**Agent 如何与状态交互：**

1. **`ToolContext`（主要方法）：** 工具可以接受一个 `ToolContext` 对象（由 ADK 自动提供给任何标注为 `ToolContext` 的参数，无论其位置如何）。此对象通过 `tool_context.state` 提供对会话状态的直接访问，使工具在执行过程中可以读取偏好或保存结果。
2. **`output_key`（自动保存 Agent 响应）：** 可以为一个 `Agent` 配置 `output_key="your_key"`。ADK 将自动将 Agent 在这一轮的最终文本响应保存到 `session.state["your_key"]`。

**在这一步中，我们将通过以下方式增强我们的天气机器人团队：**1. 使用 **新的** `InMemorySessionService` 来展示孤立状态。
2. 使用用户对 `temperature_unit` 的偏好初始化会话状态。
3. 创建天气工具（`get_weather_stateful`）的状态感知版本，该版本通过 `ToolContext` 读取此偏好并调整其输出格式（摄氏度/华氏度）。
4. 更新根 Agent 以使用此有状态的工具，并配置 `output_key` 自动将其最终的天气报告保存到会话状态。
5. 运行对话以观察初始状态如何影响工具，手动状态更改如何改变后续行为，以及 `output_key` 如何持久化 Agent 的响应。
**1\. 初始化新会话服务和状态**

为了清晰展示状态管理而不受先前步骤的干扰，我们将实例化一个新的 `InMemorySessionService`。我们还将创建一个会话，并定义用户首选的温度单位作为初始状态。

```python
# @title 1. 初始化新会话服务和状态

# 导入必要的会话组件
from google.adk.sessions import InMemorySessionService

# 为此状态示例创建一个新的会话服务实例
session_service_stateful = InMemorySessionService()
print("✅ New InMemorySessionService created for state demonstration.")

# 为本教程的这一部分定义一个新的会话ID
SESSION_ID_STATEFUL = "session_state_demo_001"
USER_ID_STATEFUL = "user_state_demo"

# 定义初始状态数据——用户最初偏好摄氏度
initial_state = {
    "user_preference_temperature_unit": "Celsius"
}

# 创建会话，提供初始状态
session_stateful = await session_service_stateful.create_session(
    app_name=APP_NAME, # Use the consistent app name
    user_id=USER_ID_STATEFUL,
    session_id=SESSION_ID_STATEFUL,
    state=initial_state # <<< Initialize state during creation
)
print(f"✅ Session '{SESSION_ID_STATEFUL}' created for user '{USER_ID_STATEFUL}'.")

# 验证初始状态是否设置正确
retrieved_session = await session_service_stateful.get_session(app_name=APP_NAME,
                                                         user_id=USER_ID_STATEFUL,
                                                         session_id = SESSION_ID_STATEFUL)
print("\n--- Initial Session State ---")
if retrieved_session:
    print(retrieved_session.state)
else:
    print("Error: Could not retrieve session.")
```

**2\. 创建状态感知的天气工具 (`get_weather_stateful`)**

现在，我们创建一个天气工具的新版本。它的主要特点是接受 `tool_context: ToolContext`，这允许它访问 `tool_context.state`。它将读取 `user_preference_temperature_unit` 并相应地格式化温度。

* **关键概念: `ToolContext`** 该对象是桥梁，使您的工具逻辑能够与会话上下文交互，包括读取和写入状态变量。ADK 通过其 `ToolContext` 注解找到该参数并自动注入，因此它可以位于工具函数签名的任意位置。被注解的参数也会对 LLM 可见的 schema 隐藏。

* **最佳实践：** 从状态读取时，使用 `dictionary.get('key', default_value)` 来处理键可能尚不存在的情况，以确保您的工具不会崩溃。

```python
from google.adk.tools.tool_context import ToolContext

def get_weather_stateful(city: str, tool_context: ToolContext) -> dict:
    """Retrieves weather, converts temp unit based on session state."""
    print(f"--- Tool: get_weather_stateful called for {city} ---")

    # --- 从状态读取偏好 ---
    preferred_unit = tool_context.state.get("user_preference_temperature_unit", "Celsius") # Default to Celsius
    print(f"--- Tool: Reading state 'user_preference_temperature_unit': {preferred_unit} ---")

    city_normalized = city.lower().replace(" ", "")

    # 模拟天气数据（内部始终以摄氏度存储）
    mock_weather_db = {
        "newyork": {"temp_c": 25, "condition": "sunny"},
        "london": {"temp_c": 15, "condition": "cloudy"},
        "tokyo": {"temp_c": 18, "condition": "light rain"},
    }

    if city_normalized in mock_weather_db:
        data = mock_weather_db[city_normalized]
        temp_c = data["temp_c"]
        condition = data["condition"]

        # 根据状态偏好格式化温度
        if preferred_unit == "Fahrenheit":
            temp_value = (temp_c * 9/5) + 32 # Calculate Fahrenheit
            temp_unit = "°F"
        else: # Default to Celsius
            temp_value = temp_c
            temp_unit = "°C"

        report = f"The weather in {city.capitalize()} is {condition} with a temperature of {temp_value:.0f}{temp_unit}."
        result = {"status": "success", "report": report}
        print(f"--- Tool: Generated report in {preferred_unit}. Result: {result} ---")

        # 将数据写回状态的示例（此工具可选）
        tool_context.state["last_city_checked_stateful"] = city
        print(f"--- Tool: Updated state 'last_city_checked_stateful': {city} ---")

        return result
    else:
        # 处理未找到的城市
        error_msg = f"Sorry, I don't have weather information for '{city}'."
        print(f"--- Tool: City '{city}' not found. ---")
        return {"status": "error", "error_message": error_msg}

print("✅ State-aware 'get_weather_stateful' tool defined.")
```

**3\. 重新定义子 Agent 并更新根 Agent**

为了确保此步骤自包含且正确构建，我们首先将 `greeting_agent` 和 `farewell_agent` 精确定义为步骤 3 中的样子。然后，我们定义新的根 Agent (`weather_agent_v4_stateful`)：

* 它使用新的 `get_weather_stateful` 工具。
* 它包括用于委派的问候和告别子 Agent。
* **关键是**，它设置了 `output_key="last_weather_report"`，该 Agent 会自动将最终的天气响应保存到会话状态。

```python
# @title 3. 重新定义子 Agent 并使用 output_key 更新根 Agent

# 确保必要的导入：Agent, LiteLlm, Runner
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
# 确保工具 'say_hello'、'say_goodbye' 已定义（来自第3步）
# 确保模型常量 MODEL_GPT_4O、MODEL_GEMINI_FLASH 等已定义

# --- 重新定义问候 Agent（来自第3步） ---
greeting_agent = None
try:
    greeting_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="greeting_agent",
        instruction="You are the Greeting Agent. Your ONLY task is to provide a friendly greeting using the 'say_hello' tool. Do nothing else.",
        description="Handles simple greetings and hellos using the 'say_hello' tool.",
        tools=[say_hello],
    )
    print(f"✅ Agent '{greeting_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Greeting agent. Error: {e}")

# --- 重新定义告别 Agent（来自第3步） ---
farewell_agent = None
try:
    farewell_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="farewell_agent",
        instruction="You are the Farewell Agent. Your ONLY task is to provide a polite goodbye message using the 'say_goodbye' tool. Do not perform any other actions.",
        description="Handles simple farewells and goodbyes using the 'say_goodbye' tool.",
        tools=[say_goodbye],
    )
    print(f"✅ Agent '{farewell_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Farewell agent. Error: {e}")

# --- 定义更新后的根 Agent ---
root_agent_stateful = None
runner_root_stateful = None # Initialize runner

# 在创建根 Agent 之前检查前提条件
if greeting_agent and farewell_agent and 'get_weather_stateful' in globals():

    root_agent_model = MODEL_GEMINI_FLASH # Choose orchestration model

    root_agent_stateful = Agent(
        name="weather_agent_v4_stateful", # New version name
        model=root_agent_model,
        description="Main agent: Provides weather (state-aware unit), delegates greetings/farewells, saves report to state.",
        instruction="You are the main Weather Agent. Your job is to provide weather using 'get_weather_stateful'. "
                    "The tool will format the temperature based on user preference stored in state. "
                    "Delegate simple greetings to 'greeting_agent' and farewells to 'farewell_agent'. "
                    "Handle only weather requests, greetings, and farewells.",
        tools=[get_weather_stateful], # Use the state-aware tool
        sub_agents=[greeting_agent, farewell_agent], # Include sub-agents
        output_key="last_weather_report" # <<< Auto-save agent's final weather response
    )
    print(f"✅ Root Agent '{root_agent_stateful.name}' created using stateful tool and output_key.")

    # --- 为此根 Agent 和新的会话服务创建 Runner ---
    runner_root_stateful = Runner(
        agent=root_agent_stateful,
        app_name=APP_NAME,
        session_service=session_service_stateful # Use the NEW stateful session service
    )
    print(f"✅ Runner created for stateful root agent '{runner_root_stateful.agent.name}' using stateful session service.")

else:
    print("❌ Cannot create stateful root agent. Prerequisites missing.")
    if not greeting_agent: print(" - greeting_agent definition missing.")
    if not farewell_agent: print(" - farewell_agent definition missing.")
    if 'get_weather_stateful' not in globals(): print(" - get_weather_stateful tool missing.")
```

**4\. 交互和测试状态流程**

现在，让我们执行一个设计用来测试状态交互的对话，使用 `runner_root_stateful`（与我们的有状态 Agent 和 `session_service_stateful` 相关联）。我们将使用之前定义的 `call_agent_async` 函数，确保传递正确的 runner、用户 ID（`USER_ID_STATEFUL`）和会话 ID（`SESSION_ID_STATEFUL`）。

对话流程如下：

1.  **检查天气（伦敦）：** `get_weather_stateful` 工具应该从第 1 节初始化的会话状态中读取初始的“摄氏度”偏好。根 Agent 的最终响应（摄氏度天气报告）应通过 `output_key` 配置保存到 `state['last_weather_report']`。
2.  **手动更新状态：** 我们将*直接修改*存储在 `InMemorySessionService` 实例（`session_service_stateful`）中的状态。
    *   **为什么直接修改？** `session_service.get_session()` 方法返回的是会话的*副本*。修改该副本不会影响后续 Agent 运行中使用的状态。在这个使用 `InMemorySessionService` 的测试场景中，我们访问内部的 `sessions` 字典来更改 `user_preference_temperature_unit` 的*实际*存储状态值为“华氏度”。*注意：在实际应用中，状态变化通常是由工具或 Agent 逻辑返回 `EventActions(state_delta=...)` 触发，而不是手动直接更新。*
3.  **再次检查天气（纽约）：** `get_weather_stateful` 工具现在应从状态中读取更新后的“华氏度”偏好，并相应地转换温度。根 Agent 的*新*响应（华氏度天气）将覆盖 `state['last_weather_report']` 中的先前值，依据 `output_key`。
4.  **向 Agent 打招呼：** 验证在状态化操作的同时，委派到 `greeting_agent` 仍然正常工作。
5.  **检查最终状态：** 对话结束后，我们最后一次检索会话（获取副本）并打印其状态，以确认 `user_preference_temperature_unit` 确实为“华氏度”，观察 `output_key` 保存的最终值（将是本轮运行中的前一次天气报告），以及工具写入的 `last_city_checked_stateful` 值。

```python
# @title 4. 互动以测试状态流和输出键
import asyncio # Ensure asyncio is imported

# 确保有状态 Runner（runner_root_stateful）可以从前一个单元获取
# 确保 call_agent_async、USER_ID_STATEFUL、SESSION_ID_STATEFUL、APP_NAME 已定义

if 'runner_root_stateful' in globals() and runner_root_stateful:
    # 为有状态对话逻辑定义主要的异步函数。
    # 此函数内部的 'await' 关键字对于异步操作是必要的。
    async def run_stateful_conversation():
        print("\n--- Testing State: Temp Unit Conversion & output_key ---")

        # 1. 检查天气（使用初始状态：摄氏度）
        print("--- Turn 1: Requesting weather in London (expect Celsius) ---")
        await call_agent_async(query= "What's the weather in London?",
                               runner=runner_root_stateful,
                               user_id=USER_ID_STATEFUL,
                               session_id=SESSION_ID_STATEFUL
                              )

        # 2. 手动将州偏好更新为华氏度 - 直接修改存储
        print("\n--- Manually Updating State: Setting unit to Fahrenheit ---")
        try:
            # 直接访问内部存储——这是针对 InMemorySessionService 的测试专用
            # 注意：在使用持久性服务（数据库、VertexAI）的生产环境中，你会
            # 通常通过 Agent 操作或可用的特定服务 API 更新状态，
            # 不是通过直接操作内部存储。
            stored_session = session_service_stateful.sessions[APP_NAME][USER_ID_STATEFUL][SESSION_ID_STATEFUL]
            stored_session.state["user_preference_temperature_unit"] = "Fahrenheit"
            # 可选：如果有任何逻辑依赖于时间戳，你可能也想更新它
            # 导入时间
            # stored_session.last_update_time = time.time()
            print(f"--- Stored session state updated. Current 'user_preference_temperature_unit': {stored_session.state.get('user_preference_temperature_unit', 'Not Set')} ---") # Added .get for safety
        except KeyError:
            print(f"--- Error: Could not retrieve session '{SESSION_ID_STATEFUL}' from internal storage for user '{USER_ID_STATEFUL}' in app '{APP_NAME}' to update state. Check IDs and if session was created. ---")
        except Exception as e:
             print(f"--- Error updating internal session state: {e} ---")

        # 3. 再次检查天气（工具现在应使用华氏度）
        # 这也将通过 output_key 更新 'last_weather_report'
        print("\n--- Turn 2: Requesting weather in New York (expect Fahrenheit) ---")
        await call_agent_async(query= "Tell me the weather in New York.",
                               runner=runner_root_stateful,
                               user_id=USER_ID_STATEFUL,
                               session_id=SESSION_ID_STATEFUL
                              )

        # 4. 测试基本委托（仍应可用）
        # 该问候语由委托的子 Agent 撰写，而不是根 Agent 撰写，
        # 所以 output_key 不会触发：'last_weather_report' 保持纽约的报告。
        print("\n--- Turn 3: Sending a greeting ---")
        await call_agent_async(query= "Hi!",
                               runner=runner_root_stateful,
                               user_id=USER_ID_STATEFUL,
                               session_id=SESSION_ID_STATEFUL
                              )

    # --- 执行 `run_stateful_conversation` 异步函数 ---
    # 根据你的环境选择下面的一种方法。

    # 方法 1：直接 await（适用于笔记本/异步 REPL 默认）
    # 如果你的环境支持顶层 await（如 Colab/Jupyter 笔记本），
    # 意味着事件循环已经在运行，因此你可以直接 await 该函数。
    print("Attempting execution using 'await' (default for notebooks)...")
    await run_stateful_conversation()

    # 方法 2：asyncio.run（适用于标准 Python 脚本 [.py]）
    # 如果从终端以标准 Python 脚本运行此代码，
    # 脚本上下文是同步的。需要 `asyncio.run()`
    # 来创建并管理事件循环以执行你的异步函数。
    # 使用此方法：
    # 1. 注释掉上面的 `await run_stateful_conversation()` 行。
    # 2. 取消注释以下代码块：
    """
    import asyncio
    if __name__ == "__main__": # Ensures this runs only when script is executed directly
        print("Executing using 'asyncio.run()' (for standard Python scripts)...")
        try:
            # 这将创建事件循环，运行你的异步函数，并关闭循环。
            asyncio.run(run_stateful_conversation())
        except Exception as e:
            print(f"An error occurred: {e}")
    """

    # --- 在对话结束后检查最终会话状态 ---
    # 这个块在任一执行方法完成后运行。
    print("\n--- Inspecting Final Session State ---")
    final_session = await session_service_stateful.get_session(app_name=APP_NAME,
                                                         user_id= USER_ID_STATEFUL,
                                                         session_id=SESSION_ID_STATEFUL)
    if final_session:
        # 使用 .get() 来更安全地访问可能缺失的键
        print(f"Final Preference: {final_session.state.get('user_preference_temperature_unit', 'Not Set')}")
        print(f"Final Last Weather Report (from output_key): {final_session.state.get('last_weather_report', 'Not Set')}")
        print(f"Final Last City Checked (by tool): {final_session.state.get('last_city_checked_stateful', 'Not Set')}")
        # 打印完整状态以查看详细信息
        # print(f"完整状态字典: {final_session.state}") # 查看详细信息
    else:
        print("\n❌ Error: Could not retrieve final session state.")

else:
    print("\n⚠️ Skipping state test conversation. Stateful root agent runner ('runner_root_stateful') is not available.")
```

通过查看对话流程和最终会话状态打印件，您可以确认：

* **状态读取：** 天气工具（`get_weather_stateful`）正确读取状态`user_preference_temperature_unit`，最初使用“摄氏”表示伦敦。
* **状态更新：** 直接修改成功将存储的偏好更改为“华氏度”。
* **状态已读（更新）:** 工具随后在被要求查询纽约天气时读取“华氏度”并进行了转换。
* **工具状态写入：** 工具成功通过`tool_context.state`将`last_city_checked_stateful`（第二次天气检查后为“纽约”）写入州。
* **委托：** “Hi！”的`greeting_agent`转委即使经过州级修改后依然正常运作。
* **`output_key`：** `output_key="last_weather_report"`成功保存了根 Agent 的*最终*响应，适用于*每回合*，且根 Agent 最终响应者为该回合。在此序列中，最终问候语（“你好！”）由委派的子 Agent 生成，而非根 Agent，因此`output_key`未在最后一回合触发，之前的天气报告保持会话状态。
* **最终状态：** 最终检查确认偏好仍为“华氏度”。

你现在已经成功集成了会话状态，利用`ToolContext`个性化 Agent 行为，手动操作状态用于测试`InMemorySessionService`，并观察到`output_key`提供了保存 Agent 对状态的最后响应的简单机制。这种对状态管理的基础理解对于我们后续通过回调实现安全护栏至关重要。
## 步骤5：添加安全 \- 输入护栏与 `before_model_callback` {#step-5-adding-safety---input-guardrail-with-beforemodelcallback}

我们的 Agent 团队能力正在增强，能够记住偏好并有效使用工具。然而，在现实场景中，我们通常需要安全机制来控制 Agent 的行为，*在*潜在问题请求到达核心大型语言模型（LLM）之前。

ADK 提供 **回调功能**——允许您钩入 Agent 执行生命周期中的特定节点的功能。该 `before_model_callback` 对输入安全尤其有用。

**什么是`before_model_callback`？**

* 这是你定义的一个 Python 函数，ADK 在 Agent 发送编译请求（包括对话历史、指令和最新用户消息）给底层 LLM 之前执行。
* **目的：** 检查请求，必要时修改，或根据预设规则完全屏蔽请求。

**常见用例：*** **输入验证/过滤：** 检查用户输入是否符合标准或是否包含不允许的内容（如个人身份信息或关键词）。
* **防护措施（Guardrails）：** 防止有害、不相关或违反政策的请求被 LLM 处理。
* **动态提示修改：** 在发送给 LLM 请求之前，将及时的信息（例如来自会话状态）添加到请求上下文中。

**工作原理：**

1. 定义一个接受 `callback_context: CallbackContext` 和 `llm_request: LlmRequest` 的函数。

    * `callback_context`：提供对 Agent 信息、会话状态（`callback_context.state`）等的访问。
    * `llm_request`：包含要发送给 LLM 的完整负载（`contents`、`config`）。

2. 在函数内部：

    * **检查：** 检查 `llm_request.contents`（尤其是最后一条用户消息）。
    * **修改（谨慎使用）：** 你*可以*修改 `llm_request` 的部分内容。
    * **阻止（防护）：** 返回一个 `LlmResponse` 对象。ADK 会立即返回此响应，*跳过*该轮的 LLM 调用。
    * **允许：** 返回 `None`。ADK 将使用（可能已修改的）请求调用 LLM。

**在此步骤中，我们将：**

1. 定义一个 `before_model_callback` 函数（`block_keyword_guardrail`），用于检查用户输入中是否包含特定关键词（"BLOCK"）。
2. 更新我们的有状态根 Agent（从步骤 4 的 `weather_agent_v4_stateful`）以使用此回调。
3. 创建一个与此更新 Agent 关联的新 Runner，但使用*同一个有状态会话服务*以保持状态连续性。
4. 通过发送正常请求和包含关键词的请求来测试防护措施。

**1\. 定义防护回调函数**

此函数将检查 `llm_request` 内容中的最后一条用户消息。如果发现 "BLOCK"（不区分大小写），则构建并返回 `LlmResponse` 以阻止流程；否则返回 `None`。

```python
# @标题 1. 定义 before_model_callback Guardrail

# 确保必要的导入可用
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types # For creating response content
from typing import Optional

def block_keyword_guardrail(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """
    Inspects the latest user message for 'BLOCK'. If found, blocks the LLM call
    and returns a predefined LlmResponse. Otherwise, returns None to proceed.
    """
    agent_name = callback_context.agent_name # Get the name of the agent whose model call is being intercepted
    print(f"--- Callback: block_keyword_guardrail running for agent: {agent_name} ---")

    # 从请求历史中提取最新用户消息的文本
    last_user_message_text = ""
    if llm_request.contents:
        # 找到最近的角色为“用户”的消息
        for content in reversed(llm_request.contents):
            if content.role == 'user' and content.parts:
                # 为简化起见，假设文本在第一部分
                if content.parts[0].text:
                    last_user_message_text = content.parts[0].text
                    break # Found the last user message text

    print(f"--- Callback: Inspecting last user message: '{last_user_message_text[:100]}...' ---") # Log first 100 chars

    # --- Guardrail 逻辑 ---
    keyword_to_block = "BLOCK"
    if keyword_to_block in last_user_message_text.upper(): # Case-insensitive check
        print(f"--- Callback: Found '{keyword_to_block}'. Blocking LLM call! ---")
        # 可选地，在状态中设置标志以记录阻止事件
        callback_context.state["guardrail_block_keyword_triggered"] = True
        print(f"--- Callback: Set state 'guardrail_block_keyword_triggered': True ---")

        # 构建并返回 LlmResponse 以停止流程，并将其返回
        return LlmResponse(
            content=types.Content(
                role="model", # Mimic a response from the agent's perspective
                parts=[types.Part(text=f"I cannot process this request because it contains the blocked keyword '{keyword_to_block}'.")],
            )
            # 注意：如果需要，你也可以在此设置 error_message 字段
        )
    else:
        # 未找到关键字，允许请求继续到 LLM
        print(f"--- Callback: Keyword not found. Allowing LLM call for {agent_name}. ---")
        return None # Returning None signals ADK to continue normally

print("✅ block_keyword_guardrail function defined.")
```

**2\. 更新根 Agent 以使用回调**

我们重新定义根 Agent，增加 `before_model_callback` 参数，并将其指向我们新的护栏函数。我们会给它一个新的版本名称以便清楚。

*重要:* 如果子 Agent（`greeting_agent`、`farewell_agent`）和有状态工具（`get_weather_stateful`）在之前的步骤中尚不可用，我们需要在此上下文中重新定义它们，以确保根 Agent 定义能够访问其所有组件。

```python
# @title 2. 使用 before_model_callback 更新根 Agent

# --- 重新定义子 Agent（确保它们在此上下文中存在） ---
greeting_agent = None
try:
    # 使用已定义的模型常量
    greeting_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="greeting_agent", # Keep original name for consistency
        instruction="You are the Greeting Agent. Your ONLY task is to provide a friendly greeting using the 'say_hello' tool. Do nothing else.",
        description="Handles simple greetings and hellos using the 'say_hello' tool.",
        tools=[say_hello],
    )
    print(f"✅ Sub-Agent '{greeting_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Greeting agent. Check Model/API Key ({greeting_agent.model}). Error: {e}")

farewell_agent = None
try:
    # 使用已定义的模型常量
    farewell_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="farewell_agent", # Keep original name
        instruction="You are the Farewell Agent. Your ONLY task is to provide a polite goodbye message using the 'say_goodbye' tool. Do not perform any other actions.",
        description="Handles simple farewells and goodbyes using the 'say_goodbye' tool.",
        tools=[say_goodbye],
    )
    print(f"✅ Sub-Agent '{farewell_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Farewell agent. Check Model/API Key ({farewell_agent.model}). Error: {e}")

# --- 使用回调定义根 Agent ---
root_agent_model_guardrail = None
runner_root_model_guardrail = None

# 在继续之前检查所有组件
if greeting_agent and farewell_agent and 'get_weather_stateful' in globals() and 'block_keyword_guardrail' in globals():

    # 使用已定义的模型常量
    root_agent_model = MODEL_GEMINI_FLASH

    root_agent_model_guardrail = Agent(
        name="weather_agent_v5_model_guardrail", # New version name for clarity
        model=root_agent_model,
        description="Main agent: Handles weather, delegates greetings/farewells, includes input keyword guardrail.",
        instruction="You are the main Weather Agent. Provide weather using 'get_weather_stateful'. "
                    "Delegate simple greetings to 'greeting_agent' and farewells to 'farewell_agent'. "
                    "Handle only weather requests, greetings, and farewells.",
        tools=[get_weather_stateful],
        sub_agents=[greeting_agent, farewell_agent], # Reference the redefined sub-agents
        output_key="last_weather_report", # Keep output_key from Step 4
        before_model_callback=block_keyword_guardrail # <<< Assign the guardrail callback
    )
    print(f"✅ Root Agent '{root_agent_model_guardrail.name}' created with before_model_callback.")

    # --- 为此 Agent 创建 Runner，使用相同的有状态会话服务 ---
    # 确保 session_service_stateful 在步骤4中存在
    if 'session_service_stateful' in globals():
        runner_root_model_guardrail = Runner(
            agent=root_agent_model_guardrail,
            app_name=APP_NAME, # Use consistent APP_NAME
            session_service=session_service_stateful # <<< Use the service from Step 4
        )
        print(f"✅ Runner created for guardrail agent '{runner_root_model_guardrail.agent.name}', using stateful session service.")
    else:
        print("❌ Cannot create runner. 'session_service_stateful' from Step 4 is missing.")

else:
    print("❌ Cannot create root agent with model guardrail. One or more prerequisites are missing or failed initialization:")
    if not greeting_agent: print("   - Greeting Agent")
    if not farewell_agent: print("   - Farewell Agent")
    if 'get_weather_stateful' not in globals(): print("   - 'get_weather_stateful' tool")
    if 'block_keyword_guardrail' not in globals(): print("   - 'block_keyword_guardrail' callback")
```

**3. 互动测试护栏**

让我们测试护栏的行为。我们将使用与第4步相同的 *会话*（`SESSION_ID_STATEFUL`），以显示状态在这些更改之间是持续的。

1. 发送一个普通的天气请求（应该通过护栏并执行）。
2. 发送包含“BLOCK”的请求（应该被回调拦截）。
3. 发送一个问候（应该通过根 Agent 的护栏，被委派，并正常执行）。

```python
# @title 3. 交互以测试模型输入防护
import asyncio # Ensure asyncio is imported

# 确保防护 Agent 的 Runner 可用
if 'runner_root_model_guardrail' in globals() and runner_root_model_guardrail:
    # 定义防护测试对话的主要异步函数。
    # 此函数内部的 'await' 关键字对于异步操作是必要的。
    async def run_guardrail_test_conversation():
        print("\n--- Testing Model Input Guardrail ---")

        # 使用带有回调和现有有状态会话 ID 的 AgentRunner
        # 定义一个辅助 lambda 以便清晰的交互调用
        interaction_func = lambda query: call_agent_async(query,
                                                         runner_root_model_guardrail,
                                                         USER_ID_STATEFUL, # Use existing user ID
                                                         SESSION_ID_STATEFUL # Use existing session ID
                                                        )
        # 1. 普通请求（回调允许，应使用先前状态更改的华氏度）
        print("--- Turn 1: Requesting weather in London (expect allowed, Fahrenheit) ---")
        await interaction_func("What is the weather in London?")

        # 2. 包含被阻止关键字的请求（回调拦截）
        print("\n--- Turn 2: Requesting with blocked keyword (expect blocked) ---")
        await interaction_func("BLOCK the request for weather in Tokyo") # Callback should catch "BLOCK"

        # 3. 普通问候（回调允许根 Agent，发生委派）
        print("\n--- Turn 3: Sending a greeting (expect allowed) ---")
        await interaction_func("Hello again")

    # --- 执行 `run_guardrail_test_conversation` 异步函数 ---
    # 根据你的环境选择下面的一种方法。

    # 方法 1：直接 await（适用于笔记本/异步 REPL 默认）
    # 如果你的环境支持顶层 await（如 Colab/Jupyter 笔记本），
    # 意味着事件循环已经在运行，因此你可以直接 await 该函数。
    print("Attempting execution using 'await' (default for notebooks)...")
    await run_guardrail_test_conversation()

    # 方法 2：asyncio.run（适用于标准 Python 脚本 [.py]）
    # 如果从终端以标准 Python 脚本运行此代码，
    # 脚本上下文是同步的。需要 `asyncio.run()`
    # 来创建并管理事件循环以执行你的异步函数。
    # 使用此方法：
    # 1. 注释掉上面的 `await run_guardrail_test_conversation()` 行。
    # 2. 取消注释以下代码块：
    """
    import asyncio
    if __name__ == "__main__": # Ensures this runs only when script is executed directly
        print("Executing using 'asyncio.run()' (for standard Python scripts)...")
        try:
            # 这将创建事件循环，运行你的异步函数，并关闭循环。
            asyncio.run(run_guardrail_test_conversation())
        except Exception as e:
            print(f"An error occurred: {e}")
    """

    # --- 在对话结束后检查最终会话状态 ---
    # 这个块在任一执行方法完成后运行。
    # 可选：检查回调设置的触发标志状态
    print("\n--- Inspecting Final Session State (After Guardrail Test) ---")
    # 使用与此有状态会话关联的会话服务实例
    final_session = await session_service_stateful.get_session(app_name=APP_NAME,
                                                         user_id=USER_ID_STATEFUL,
                                                         session_id=SESSION_ID_STATEFUL)
    if final_session:
        # 使用 .get() 以更安全地访问
        print(f"Guardrail Triggered Flag: {final_session.state.get('guardrail_block_keyword_triggered', 'Not Set (or False)')}")
        print(f"Last Weather Report: {final_session.state.get('last_weather_report', 'Not Set')}") # Should be London weather if successful
        print(f"Temperature Unit: {final_session.state.get('user_preference_temperature_unit', 'Not Set')}") # Should be Fahrenheit
        # print(f"完整状态字典: {final_session.state}") # 查看详细信息
    else:
        print("\n❌ Error: Could not retrieve final session state.")

else:
    print("\n⚠️ Skipping model guardrail test. Runner ('runner_root_model_guardrail') is not available.")
```

观察执行流程：

1. **伦敦天气：** 回调运行`weather_agent_v5_model_guardrail`，检查消息，打印“未找到关键词。允许 LLM 调用。”，然后返回`None`。Agent 继续，调用`get_weather_stateful`工具（使用步骤4状态变化中的“华氏度”偏好），返回天气。该响应通过`output_key`更新`last_weather_report`。
2. **BLOCK 请求：** 回调再次运行`weather_agent_v5_model_guardrail`，检查消息，找到“BLOCK”，打印“Blocking LLM call\！”，设置状态标志，返回预定义`LlmResponse`。该回合智能 Agent 底层的 LLM*永远不会被调用*。用户会看到回调的阻断消息。
3. **再次问候：** 回调运行 `weather_agent_v5_model_guardrail`，允许请求。根 Agent 随后委派给`greeting_agent`。*注：根 Agent 定义的`before_model_callback`不自动应用于子 Agent。* `greeting_agent`正常运行，调用`say_hello`工具，返回问候。

你已经成功实现了一个输入安全层！`before_model_callback`提供了一个强大的机制，可以在昂贵或潜在风险的 LLM 调用发出之前强制执行规则并控制 Agent 行为。接下来，我们将应用类似的概念来为工具使用本身设置防护措施。

## 步骤6：添加安全 \- 工具论证护栏（`before_tool_callback`） {#step-6-adding-safety---tool-argument-guardrail-beforetoolcallback}

在第5步，我们添加了护栏，用于检查并可能阻止用户输入，*在*它到达 LLM 之前。现在，我们将在*LLM 决定使用某个工具但*在*该工具实际执行之前*添加另一层控制。这对于验证 LLM 想传递给工具的*参数*非常有用。

ADK 为此提供了`before_tool_callback`。

**什么是`before_tool_callback`？**

* 这是一个 Python 函数，在特定工具函数运行前执行，LLM 请求使用该函数并决定参数后。
* **目的：** 验证工具参数，防止基于特定输入的工具执行，动态修改参数，或执行资源使用策略。

**常见用例：**

* **参数验证：** 检查 LLM 提供的参数是否有效、是否在允许范围内，或是否符合预期格式。
* **资源保护：** 防止工具调用可能成本高昂、访问受限数据或产生不良副作用（例如，某些参数阻断 API 调用）。
* **动态参数修改：** 在工具运行前，根据会话状态或其他上下文信息调整参数。

**工作原理：**

1. 定义一个接受`tool: BaseTool`、`args: Dict[str, Any]`和`tool_context: ToolContext`的函数。    * `tool`：即将调用的工具对象（检查 `tool.name`）。
    * `args`：LLM 为该工具生成的参数字典。
    * `tool_context`：提供访问会话状态（`tool_context.state`）、Agent 信息等的功能。

2. 在函数内部：

    * **检查**：检查 `tool.name` 和 `args` 字典。
    * **修改**：直接修改 `args` 字典中的值。如果返回 `None`，工具将使用这些修改后的参数运行。
    * **阻止/覆盖（保护栏）**：返回一个 **字典**。ADK 会将这个字典作为工具调用的*结果*，完全*跳过*原始工具函数的执行。该字典最好与被阻止的工具预期的返回格式匹配。
    * **允许**：返回 `None`。ADK 将使用（可能已修改的）参数继续执行实际工具函数。

**在此步骤中，我们将：**

1. 定义一个 `before_tool_callback` 函数（`block_paris_tool_guardrail`），专门检查 `get_weather_stateful` 工具是否被调用时城市为“巴黎”。
2. 如果检测到“巴黎”，回调将阻止该工具并返回自定义错误字典。
3. 更新我们的根 Agent（`weather_agent_v6_tool_guardrail`），以包含 *两个* `before_model_callback` 和这个新的 `before_tool_callback`。
4. 为该 Agent 创建一个新的 Runner，使用相同的有状态会话服务。
5. 通过请求允许城市及被阻止城市（“巴黎”）的天气来测试流程。

**1\. 定义工具保护栏回调函数**

此函数针对 `get_weather_stateful` 工具。它检查 `city` 参数。如果是“巴黎”，返回一个类似工具自身错误响应的错误字典。否则，通过返回 `None` 允许工具运行。

```python
# @title 1. 定义 before_tool_callback 的防护措施

# 确保必要的导入可用
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from typing import Optional, Dict, Any # For type hints

def block_paris_tool_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> Optional[Dict]:
    """
    Checks if 'get_weather_stateful' is called for 'Paris'.
    If so, blocks the tool execution and returns a specific error dictionary.
    Otherwise, allows the tool call to proceed by returning None.
    """
    tool_name = tool.name
    agent_name = tool_context.agent_name # Agent attempting the tool call
    print(f"--- Callback: block_paris_tool_guardrail running for tool '{tool_name}' in agent '{agent_name}' ---")
    print(f"--- Callback: Inspecting args: {args} ---")

    # --- Guardrail 逻辑 ---
    target_tool_name = "get_weather_stateful" # Match the function name used by FunctionTool
    blocked_city = "paris"

    # 检查这是否是正确的工具，并且 city 参数是否与被阻止的城市匹配
    if tool_name == target_tool_name:
        city_argument = args.get("city", "") # Safely get the 'city' argument
        if city_argument and city_argument.lower() == blocked_city:
            print(f"--- Callback: Detected blocked city '{city_argument}'. Blocking tool execution! ---")
            # 可选地更新状态
            tool_context.state["guardrail_tool_block_triggered"] = True
            print(f"--- Callback: Set state 'guardrail_tool_block_triggered': True ---")

            # 返回一个与工具预期输出格式匹配的错误字典
            # 该字典将成为工具的结果，跳过实际工具运行。
            return {
                "status": "error",
                "error_message": f"Policy restriction: Weather checks for '{city_argument.capitalize()}' are currently disabled by a tool guardrail."
            }
        else:
             print(f"--- Callback: City '{city_argument}' is allowed for tool '{tool_name}'. ---")
    else:
        print(f"--- Callback: Tool '{tool_name}' is not the target tool. Allowing. ---")

    # 如果上述检查没有返回字典，则允许工具执行
    print(f"--- Callback: Allowing tool '{tool_name}' to proceed. ---")
    return None # Returning None allows the actual tool function to run

print("✅ block_paris_tool_guardrail function defined.")
```

**2. 更新根 Agent 以使用两个回调**

我们再次重新定义根 Agent（`weather_agent_v6_tool_guardrail`），这次在步骤5中的`before_model_callback`旁边添加`before_tool_callback`参数。

*自包含执行说明：* 与步骤5类似，在定义此 Agent 之前，确保所有前提条件（子 Agent、工具、`before_model_callback`）在执行上下文中已定义或可用。

```python
# @标题 2. 使用两个回调更新根 Agent（自包含）

# --- 确保已定义先决条件 ---
# （包括或确保执行以下定义：Agent、LiteLlm、Runner、ToolContext、
#  模型常量、say_hello、say_goodbye、greeting_agent、farewell_agent、
#  get_weather_stateful、block_keyword_guardrail、block_paris_tool_guardrail）

# --- 重新定义子 Agent（确保它们在此上下文中存在） ---
greeting_agent = None
try:
    # 使用已定义的模型常量
    greeting_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="greeting_agent", # Keep original name for consistency
        instruction="You are the Greeting Agent. Your ONLY task is to provide a friendly greeting using the 'say_hello' tool. Do nothing else.",
        description="Handles simple greetings and hellos using the 'say_hello' tool.",
        tools=[say_hello],
    )
    print(f"✅ Sub-Agent '{greeting_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Greeting agent. Check Model/API Key ({greeting_agent.model}). Error: {e}")

farewell_agent = None
try:
    # 使用已定义的模型常量
    farewell_agent = Agent(
        model=MODEL_GEMINI_FLASH,
        name="farewell_agent", # Keep original name
        instruction="You are the Farewell Agent. Your ONLY task is to provide a polite goodbye message using the 'say_goodbye' tool. Do not perform any other actions.",
        description="Handles simple farewells and goodbyes using the 'say_goodbye' tool.",
        tools=[say_goodbye],
    )
    print(f"✅ Sub-Agent '{farewell_agent.name}' redefined.")
except Exception as e:
    print(f"❌ Could not redefine Farewell agent. Check Model/API Key ({farewell_agent.model}). Error: {e}")

# --- 定义具有两个回调的根 Agent ---
root_agent_tool_guardrail = None
runner_root_tool_guardrail = None

if ('greeting_agent' in globals() and greeting_agent and
    'farewell_agent' in globals() and farewell_agent and
    'get_weather_stateful' in globals() and
    'block_keyword_guardrail' in globals() and
    'block_paris_tool_guardrail' in globals()):

    root_agent_model = MODEL_GEMINI_FLASH

    root_agent_tool_guardrail = Agent(
        name="weather_agent_v6_tool_guardrail", # New version name
        model=root_agent_model,
        description="Main agent: Handles weather, delegates, includes input AND tool guardrails.",
        instruction="You are the main Weather Agent. Provide weather using 'get_weather_stateful'. "
                    "Delegate greetings to 'greeting_agent' and farewells to 'farewell_agent'. "
                    "Handle only weather, greetings, and farewells.",
        tools=[get_weather_stateful],
        sub_agents=[greeting_agent, farewell_agent],
        output_key="last_weather_report",
        before_model_callback=block_keyword_guardrail, # Keep model guardrail
        before_tool_callback=block_paris_tool_guardrail # <<< Add tool guardrail
    )
    print(f"✅ Root Agent '{root_agent_tool_guardrail.name}' created with BOTH callbacks.")

    # --- 创建 Runner，使用相同的状态会话服务 ---
    if 'session_service_stateful' in globals():
        runner_root_tool_guardrail = Runner(
            agent=root_agent_tool_guardrail,
            app_name=APP_NAME,
            session_service=session_service_stateful # <<< Use the service from Step 4/5
        )
        print(f"✅ Runner created for tool guardrail agent '{runner_root_tool_guardrail.agent.name}', using stateful session service.")
    else:
        print("❌ Cannot create runner. 'session_service_stateful' from Step 4/5 is missing.")

else:
    print("❌ Cannot create root agent with tool guardrail. Prerequisites missing.")
```

**3\. 交互以测试工具护栏**

让我们测试交互流程，仍然使用前面步骤中的相同状态会话 (`SESSION_ID_STATEFUL`)。

1. 请求“纽约”的天气：通过两个回调，工具执行（使用状态中的华氏度偏好）。
2. 请求“巴黎”的天气：通过 `before_model_callback`。LLM 决定调用 `get_weather_stateful(city='Paris')`。`before_tool_callback` 拦截，阻止工具，并返回错误字典。Agent 传递此错误。
3. 请求“伦敦”的天气：通过两个回调，工具正常执行。

```python
# @title 3. 交互以测试工具防护参数
import asyncio # Ensure asyncio is imported

# 确保工具防护 Agent 的 Runner 可用
if 'runner_root_tool_guardrail' in globals() and runner_root_tool_guardrail:
    # 定义工具防护测试对话的主异步函数。
    # 此函数内部的 'await' 关键字对于异步操作是必要的。
    async def run_tool_guardrail_test():
        print("\n--- Testing Tool Argument Guardrail ('Paris' blocked) ---")

        # 使用具有回调和现有有状态会话的 AgentRunner
        # 定义一个辅助 lambda 以便清晰的交互调用
        interaction_func = lambda query: call_agent_async(query,
                                                         runner_root_tool_guardrail,
                                                         USER_ID_STATEFUL, # Use existing user ID
                                                         SESSION_ID_STATEFUL # Use existing session ID
                                                        )
        # 1. 允许的城市（应通过两个回调，使用华氏状态）
        print("--- Turn 1: Requesting weather in New York (expect allowed) ---")
        await interaction_func("What's the weather in New York?")

        # 2. 被阻止的城市（应通过模型回调，但被工具回调阻止）
        print("\n--- Turn 2: Requesting weather in Paris (expect blocked by tool guardrail) ---")
        await interaction_func("How about Paris?") # Tool callback should intercept this

        # 3. 另一个允许的城市（应再次正常工作）
        print("\n--- Turn 3: Requesting weather in London (expect allowed) ---")
        await interaction_func("Tell me the weather in London.")

    # --- 执行 `run_tool_guardrail_test` 异步函数 ---
    # 根据你的环境选择下面的一种方法。

    # 方法 1：直接 await（适用于笔记本/异步 REPL 默认）
    # 如果你的环境支持顶层 await（如 Colab/Jupyter 笔记本），
    # 意味着事件循环已经在运行，因此你可以直接 await 该函数。
    print("Attempting execution using 'await' (default for notebooks)...")
    await run_tool_guardrail_test()

    # 方法 2：asyncio.run（适用于标准 Python 脚本 [.py]）
    # 如果从终端以标准 Python 脚本运行此代码，
    # 脚本上下文是同步的。需要 `asyncio.run()`
    # 来创建并管理事件循环以执行你的异步函数。
    # 使用此方法：
    # 1. 注释掉上面的 `await run_tool_guardrail_test()` 行。
    # 2. 取消注释以下代码块：
    """
    import asyncio
    if __name__ == "__main__": # Ensures this runs only when script is executed directly
        print("Executing using 'asyncio.run()' (for standard Python scripts)...")
        try:
            # 这将创建事件循环，运行你的异步函数，并关闭循环。
            asyncio.run(run_tool_guardrail_test())
        except Exception as e:
            print(f"An error occurred: {e}")
    """

    # --- 在对话结束后检查最终会话状态 ---
    # 这个块在任一执行方法完成后运行。
    # 可选：检查工具阻止触发标志的状态
    print("\n--- Inspecting Final Session State (After Tool Guardrail Test) ---")
    # 使用与此有状态会话关联的会话服务实例
    final_session = await session_service_stateful.get_session(app_name=APP_NAME,
                                                         user_id=USER_ID_STATEFUL,
                                                         session_id= SESSION_ID_STATEFUL)
    if final_session:
        # 使用 .get() 以更安全地访问
        print(f"Tool Guardrail Triggered Flag: {final_session.state.get('guardrail_tool_block_triggered', 'Not Set (or False)')}")
        print(f"Last Weather Report: {final_session.state.get('last_weather_report', 'Not Set')}") # Should be London weather if successful
        print(f"Temperature Unit: {final_session.state.get('user_preference_temperature_unit', 'Not Set')}") # Should be Fahrenheit
        # print(f"完整状态字典: {final_session.state}") # 查看详细信息
    else:
        print("\n❌ Error: Could not retrieve final session state.")

else:
    print("\n⚠️ Skipping tool guardrail test. Runner ('runner_root_tool_guardrail') is not available.")
```

分析输出：

1. **纽约：** `before_model_callback`允许请求。LLM 请求`get_weather_stateful`。`before_tool_callback`运行，检查ARG（`{'city': 'New York'}`），发现不是“Paris”，打印“允许工具......”并返回`None`。实际`get_weather_stateful`函数执行，从状态读取“华氏度”，返回天气报告。Agent 转达此信息，通过`output_key`保存。
2. **Paris：** `before_model_callback`允许该请求。LLM 请求`get_weather_stateful(city='Paris')`。`before_tool_callback`运行，检查ARG，检测“Paris”，打印“阻塞工具执行\！”，设置状态标志，返回错误字典`{'status': 'error', 'error_message': 'Policy restriction...'}`。实际`get_weather_stateful`函数**从未执行**。Agent 接收错误字典*就像它是工具输出*，并基于该错误消息生成响应。
3. **伦敦：** 表现类似纽约，通过了两次回调并成功执行了该工具。新的伦敦天气预报覆盖了该州的`last_weather_report`。

你现在增加了一个关键的安全层，不仅控制了“什么*能到达 LLM，还*如何*根据 LLM 生成的具体参数使用 Agent 的工具。像`before_model_callback`和`before_tool_callback`这样的回调对于构建稳健、安全且符合策略的 Agent 应用至关重要。
## 结论：你的经纪团队已准备好！ {#conclusion-your-agent-team-is-ready}

恭喜你！你已经成功地从构建一个单一基础的气象 Agent，发展到使用 Agent Development Kit（ADK）组建了一个复杂的多 Agent 团队。

**让我们回顾一下你们的成就：**

* 你从一个**基本 Agent**开始，配备了单一工具（`get_weather`）。
* 你用LiteLLM 探索了 ADK 的**多模型灵活性**，在Gemini、GPT-4o和Claude等不同 LLM 上运行相同的核心逻辑。
* 你通过创建专用子 Agent（`greeting_agent`、`farewell_agent`）并启用了**自动委托**从根 Agent 实现了**模块化**。
* 你通过**会话状态**赋予 Agent**内存**，使他们能够记住用户偏好（`temperature_unit`）和过去的交互（`output_key`）。
* 你实施了关键的**安全护栏**，同时使用`before_model_callback`（阻断特定输入关键词）和`before_tool_callback`（基于“巴黎”等参数阻挡工具执行）。

通过组建这个进步的天气机器人团队，你获得了对开发复杂智能应用至关重要的核心 ADK 概念的实践经验。

**主要收获：* **Agent 与工具：** 定义能力和推理的基本构建模块。清晰的指令和文档字符串至关重要。
* **运行者与会话服务：** 用于协调 Agent 执行并维护会话上下文的引擎和内存管理系统。
* **委托：** 设计多 Agent 团队可以实现专业化、模块化以及更好地管理复杂任务。Agent`description`是自动流程的关键。
* **会话状态（`ToolContext`，`output_key`）:** 对于创建上下文感知、个性化和多回合对话 Agent 至关重要。
* **回调（`before_model`、`before_tool`）:** 强大的钩子，用于在关键操作（LLM 调用或工具执行）前实现安全、验证、策略执行和动态修改。
* **灵活性（`LiteLlm`）:** ADK 赋予你选择最适合工作的 LLM，平衡性能、成本和功能。

**下一步该去哪里？**

你的天气机器人团队是一个很好的起点。以下是一些进一步探索 ADK 并提升应用的建议：

1. **Real Weather API：** 用调用真实天气 API（如 OpenWeatherMap、WeatherAPI）替换你`get_weather`工具中的`mock_weather_db`。
2. **更复杂的状态：** 在会话状态中存储更多用户偏好（例如首选位置、通知设置）或对话摘要。
3. **精炼委派：** 尝试不同的根 Agent 指令或子 Agent 描述，以微调委派逻辑。你能添加一个“预测”Agent 吗？
4. **高级回访：**
    * 使用`after_model_callback`来可能在生成后重新格式化或净化 LLM 的回复。
    * 使用`after_tool_callback`处理或记录工具返回的结果。
    * 实现 Agent 级进入/退出逻辑的`before_agent_callback`或`after_agent_callback`。
5. **错误处理：** 改进 Agent 处理工具错误或意外 API 响应的方式。也许可以在工具中添加重试逻辑。
6. **持久会话存储：** 考虑将`InMemorySessionService`切换到 ADK 的持久实现之一，如`DatabaseSessionService`，支持SQLAlchemy并安装`pip install google-adk[db]`，或`VertexAiSessionService`。更多信息请参见[Session](/docs/adk/components/agent-context/sessions/)页面。
7. **流媒体界面：** 将您的经纪团队与网络框架（如 ADK 流媒体快速入门中所示的 FastAPI）集成，创建实时聊天界面。

Agent Development Kit为构建复杂的大型语言模型应用提供了坚实基础。掌握本教程涵盖的概念——工具、状态、委派和回调——你将能够应对日益复杂的 Agent 系统。

祝你建造愉快！

---

原文：[Build Your First Intelligent Agent Team: A Progressive Weather Bot with ADK](https://adk.dev/tutorials/agent-team/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tutorials/agent-team.md)
