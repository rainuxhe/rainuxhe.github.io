---
title: "记忆"
description: "当一个 `Session` 跟踪单次对话的历史（`events`）和临时数据（`state`）时，一个 Agent 可能需要回忆过去交互的信息。这就是**长期知识**的概念"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

当 `Session` 跟踪单次对话的历史 (`events`) 和临时数据 (`state`) 时，Agent 可能需要从过去的交互中回忆信息。这就是 **长期知识** 以及 **`MemoryService`** 概念发挥作用的地方。可以这样理解：

- **`Session` / `State`:** 它是你在一次特定聊天中的短期记忆。
- **长期知识 (`MemoryService`)**: 它是一个可搜索的档案或知识库，Agent 可以查询，可能包含许多过去聊天或其他来源的信息。

## `MemoryService` 角色 {#the-memoryservice-role}

`BaseMemoryService`（或 Go 中的 `Service`）定义了管理这个可搜索的长期知识库的接口。它支持以下操作：

- **信息摄取:**
    - **`add_session_to_memory`**: 接受一个完成的 `Session` 并将相关信息添加到长期知识库中。这种方法非常适合自动捕捉对话的核心内容。
    - **`add_events_to_memory`**: 附加事件增量（例如最新的一轮），无需重新摄取整个会话。当你希望在长时间会话中途写入记忆时，这种方法非常有用。
    - **`add_memory`**: 直接添加显式的 `MemoryEntry` 对象到记忆中。这种方法提供了精细的控制，非常适合注入来自其他来源的特定事实。
- **信息搜索 (`search_memory`):** 允许 Agent（通常通过 `Tool`）查询知识库并根据搜索查询检索相关片段或上下文。

`add_events_to_memory` 和 `add_memory` 是可选的，并非每个服务都实现，所以在依赖它们之前，请确认你选择的服务支持它们。

## 选择合适的记忆服务 {#choose-the-right-memory-service}

Python ADK 提供了三种 `MemoryService` 实现。请使用下面的表格来决定哪一种最适合你的 Agent。| **功能** | **InMemoryMemoryService** | **VertexAiMemoryBankService** | **VertexAiRagMemoryService** |
| :--- | :--- | :--- | :--- |
| **持久性** | 无，重启后数据会丢失 | 有，由 Agent 平台管理 | 有，存储在知识引擎中 |
| **主要使用场景** | 原型设计、本地开发和简单测试。 | 从用户对话中构建有意义、可发展的记忆。 | 对整个对话语料库或其他 RAG 索引内容进行向量搜索检索。 |
| **记忆提取** | 存储完整对话 | 从对话中提取[有意义的信息](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/generate-memories)，并将其与由 LLM 提供支持的现有记忆整合 | 存储完整对话，通过[知识引擎](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview)建立索引。 |
| **搜索能力** | 基础关键词匹配。 | 高级语义搜索。 | 基于知识引擎的向量相似度搜索。 |
| **设置复杂度** | 无。它是默认的。 | 低。需要在 Agent 平台上有一个[Agent Runtime](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/overview)实例。 | 中等。需要[知识引擎](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/manage-your-rag-corpus)。 |
| **依赖项** | 无。 | Google Cloud 项目，Agent 平台 API | Google Cloud 项目，知识引擎，可选安装 Agent 平台 SDK。 |
| **使用时机** | 当你希望在多个会话的聊天历史中进行搜索以进行原型设计时。 | 当你希望你的 Agent 能记住并从过去的互动中学习时。 | 当你已经有 RAG 基础设施或希望在原始对话记录上进行检索时。 |

你可以始终从 `google.adk.memory` 导入 `VertexAiRagMemoryService`，但构建它会引发 `ImportError`，除非 Agent 平台 SDK 已经安装了 `pip install google-adk[gcp]`。记忆库和 RAG 支持的记忆的文档在下面的 [Memory Bank](#memory-bank) 和 [RAG Memory](#rag-memory)。

## `InMemoryMemoryService` {#inmemorymemoryservice}

`InMemoryMemoryService` 将会话信息存储在应用程序的内存中，并执行基本的关键词匹配搜索。它无需设置，最适合用于原型设计和不需要持久性的简单测试场景。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.memory import InMemoryMemoryService
memory_service = InMemoryMemoryService()
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "google.golang.org/adk/v2/memory"
  "google.golang.org/adk/v2/session"
)

// 服务必须在 Runner 之间共享，以共享状态和内存。
sessionService := session.InMemoryService()
memoryService := memory.InMemoryService()
```

{{% /tab %}}
{{< /tabs >}}
**示例：添加和搜索内存**

此示例使用 `InMemoryMemoryService` 演示基本流程，以简化说明。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
import asyncio
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService, Session
from google.adk.memory import InMemoryMemoryService # Import MemoryService
from google.adk.runners import Runner
from google.adk.tools import load_memory # Tool to query memory
from google.genai.types import Content, Part

# --- 常量 ---
APP_NAME = "memory_example_app"
USER_ID = "mem_user"
MODEL = "gemini-flash-latest" # Use a valid model

# --- Agent 定义 ---
# Agent 1：用于捕获信息的简单 Agent
info_capture_agent = LlmAgent(
    model=MODEL,
    name="InfoCaptureAgent",
    instruction="Acknowledge the user's statement.",
)

# Agent 2：可以使用记忆的 Agent
memory_recall_agent = LlmAgent(
    model=MODEL,
    name="MemoryRecallAgent",
    instruction="Answer the user's question. Use the 'load_memory' tool "
                "if the answer might be in past conversations.",
    tools=[load_memory] # Give the agent the tool
)

# --- 服务 ---
# 服务必须在执行器之间共享，以共享状态和记忆
session_service = InMemorySessionService()
memory_service = InMemoryMemoryService() # Use in-memory for demo

async def run_scenario():
    # --- 场景 ---

    # 第 1 回合：在一个会话中捕获一些信息
    print("--- Turn 1: Capturing Information ---")
    runner1 = Runner(
        # 从信息捕获 Agent 开始
        agent=info_capture_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service # Provide the memory service to the Runner
    )
    session1_id = "session_info"
    await runner1.session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)
    user_input1 = Content(parts=[Part(text="My favorite project is Project Alpha.")], role="user")

    # 运行 Agent
    final_response_text = "(No final response)"
    async for event in runner1.run_async(user_id=USER_ID, session_id=session1_id, new_message=user_input1):
        if event.is_final_response() and event.content and event.content.parts:
            final_response_text = event.content.parts[0].text
    print(f"Agent 1 Response: {final_response_text}")

    # 获取完成的会话
    completed_session1 = await runner1.session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)

    # 将该会话的内容添加到记忆服务
    print("\n--- Adding Session 1 to Memory ---")
    await memory_service.add_session_to_memory(completed_session1)
    print("Session added to memory.")

    # 第 2 回合：在新会话中回忆信息
    print("\n--- Turn 2: Recalling Information ---")
    runner2 = Runner(
        # 使用具有记忆工具的第二个 Agent
        agent=memory_recall_agent,
        app_name=APP_NAME,
        session_service=session_service, # Reuse the same service
        memory_service=memory_service   # Reuse the same service
    )
    session2_id = "session_recall"
    await runner2.session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session2_id)
    user_input2 = Content(parts=[Part(text="What is my favorite project?")], role="user")

    # 运行第二个 Agent
    final_response_text_2 = "(No final response)"
    async for event in runner2.run_async(user_id=USER_ID, session_id=session2_id, new_message=user_input2):
        if event.is_final_response() and event.content and event.content.parts:
            final_response_text_2 = event.content.parts[0].text
    print(f"Agent 2 Response: {final_response_text_2}")

# 要运行此示例，可以使用以下代码片段：
# asyncio.run(run_scenario())

# await run_scenario()
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go

import (
	"context"
	"fmt"
	"log"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/memory"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

const (
	appName = "go_memory_example_app"
	userID  = "go_mem_user"
	modelID = "gemini-2.5-flash"
)

// Args 定义了内存搜索工具的输入结构。
type Args struct {
	Query string `json:"query" jsonschema:"The query to search for in the memory."`
}

// Result 定义了内存搜索工具的输出结构。
type Result struct {
	Results []string `json:"results"`
}

// --8<-- [start:tool_search]

// memorySearchToolFunc 是内存搜索工具的实现。
// 此函数演示了如何通过 agent.Context 访问内存。
func memorySearchToolFunc(tctx agent.Context, args Args) (Result, error) {
	fmt.Printf("Tool: Searching memory for query: '%s'\n", args.Query)
	// SearchMemory 函数可在上下文中使用。
	searchResults, err := tctx.SearchMemory(context.Background(), args.Query)
	if err != nil {
		log.Printf("Error searching memory: %v", err)
		return Result{}, fmt.Errorf("failed memory search")
	}

	var results []string
	for _, res := range searchResults.Memories {
		if res.Content != nil {
			results = append(results, textParts(res.Content)...)
		}
	}
	return Result{Results: results}, nil
}

// 定义一个可以搜索内存的工具。
var memorySearchTool = must(functiontool.New(
	functiontool.Config{
		Name:        "search_past_conversations",
		Description: "Searches past conversations for relevant information.",
	},
	memorySearchToolFunc,
))

// --8<-- [end:tool_search]

// 此示例演示了如何在 Go ADK 中使用 MemoryService。
// 它涵盖了两个主要场景：
// 1. 将完成的会话添加到内存中，并在新的会话中回忆它。
// 2. 使用 agent.Context 在自定义工具中搜索内存。
func main() {
	ctx := context.Background()

	// --- 服务 ---
	// 服务必须在 Runner 之间共享，以共享状态和内存。
	sessionService := session.InMemoryService()
	memoryService := memory.InMemoryService() // Use in-memory for this demo.

	// --- 场景 1：在一个会话中捕获信息 ---
	fmt.Println("--- Turn 1: Capturing Information ---")
	infoCaptureAgent := must(llmagent.New(llmagent.Config{
		Name:        "InfoCaptureAgent",
		Model:       must(gemini.NewModel(ctx, modelID, nil)),
		Instruction: "Acknowledge the user's statement.",
	}))

	runner1 := must(runner.New(runner.Config{
		AppName:        appName,
		Agent:          infoCaptureAgent,
		SessionService: sessionService,
		MemoryService:  memoryService, // Provide the memory service to the Runner
	}))

	session1ID := "session_info"
	must(sessionService.Create(ctx, &session.CreateRequest{AppName: appName, UserID: userID, SessionID: session1ID}))

	userInput1 := genai.NewContentFromText("My favorite project is Project Alpha.", "user")
	var finalResponseText string
	for event, err := range runner1.Run(ctx, userID, session1ID, userInput1, agent.RunConfig{}) {
		if err != nil {
			log.Printf("Agent 1 Error: %v", err)
			continue
		}
		if event.LLMResponse.Content != nil && !event.LLMResponse.Partial {
			finalResponseText = strings.Join(textParts(event.LLMResponse.Content), "")
		}
	}
	fmt.Printf("Agent 1 Response: %s\n", finalResponseText)

	// 将完成的会话添加到 Memory Service
	fmt.Println("\n--- Adding Session 1 to Memory ---")
	resp, err := sessionService.Get(ctx, &session.GetRequest{AppName: appName, UserID: userID, SessionID: session1ID})
	if err != nil {
		log.Fatalf("Failed to get completed session: %v", err)
	}
	if err := memoryService.AddSessionToMemory(ctx, resp.Session); err != nil {
		log.Fatalf("Failed to add session to memory: %v", err)
	}
	fmt.Println("Session added to memory.")

	// --- 场景 2：使用工具在新的会话中回忆信息 ---
	fmt.Println("\n--- Turn 2: Recalling Information ---")

	memoryRecallAgent := must(llmagent.New(llmagent.Config{
		Name:        "MemoryRecallAgent",
		Model:       must(gemini.NewModel(ctx, modelID, nil)),
		Instruction: "Answer the user's question. Use the 'search_past_conversations' tool if the answer might be in past conversations.",
		Tools:       []tool.Tool{memorySearchTool}, // Give the agent the tool
	}))

	runner2 := must(runner.New(runner.Config{
		Agent:          memoryRecallAgent,
		AppName:        appName,
		SessionService: sessionService,
		MemoryService:  memoryService,
	}))

	session2ID := "session_recall"
	must(sessionService.Create(ctx, &session.CreateRequest{AppName: appName, UserID: userID, SessionID: session2ID}))
	userInput2 := genai.NewContentFromText("What is my favorite project?", "user")

	var finalResponseText2 string
	for event, err := range runner2.Run(ctx, userID, session2ID, userInput2, agent.RunConfig{}) {
		if err != nil {
			log.Printf("Agent 2 Error: %v", err)
			continue
		}
		if event.LLMResponse.Content != nil && !event.LLMResponse.Partial {
			finalResponseText2 = strings.Join(textParts(event.LLMResponse.Content), "")
		}
	}
	fmt.Printf("Agent 2 Response: %s\n", finalResponseText2)
}
```

{{% /tab %}}
{{< /tabs >}}
### 在工具内搜索记忆 {#search-memory-within-a-tool}

您也可以通过使用ToolContext从自定义工具中搜索记忆。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.tools import ToolContext

async def search_past_conversations(
    query: str, tool_context: ToolContext
) -> dict:
    response = await tool_context.search_memory(query)
    return {
        "results": [
            part.text
            for entry in response.memories
            for part in (entry.content.parts or [])
            if part.text
        ]
    }
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go

// memorySearchToolFunc 是内存搜索工具的实现。
// 此函数演示了如何通过 agent.Context 访问内存。
func memorySearchToolFunc(tctx agent.Context, args Args) (Result, error) {
	fmt.Printf("Tool: Searching memory for query: '%s'\n", args.Query)
	// SearchMemory 函数可在上下文中使用。
	searchResults, err := tctx.SearchMemory(context.Background(), args.Query)
	if err != nil {
		log.Printf("Error searching memory: %v", err)
		return Result{}, fmt.Errorf("failed memory search")
	}

	var results []string
	for _, res := range searchResults.Memories {
		if res.Content != nil {
			results = append(results, textParts(res.Content)...)
		}
	}
	return Result{Results: results}, nil
}

// 定义一个可以搜索内存的工具。
var memorySearchTool = must(functiontool.New(
	functiontool.Config{
		Name:        "search_past_conversations",
		Description: "Searches past conversations for relevant information.",
	},
	memorySearchToolFunc,
))
```

{{% /tab %}}
{{< /tabs >}}
## 内存库 {#memory-bank}

`VertexAiMemoryBankService` 将您的 Agent 连接到 [Memory Bank](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/overview)，这是一个完全托管的 Google Cloud 服务，为会话 Agent 提供复杂的、持久的内存功能。

### 工作原理 {#how-it-works}

该服务处理两个关键操作：

- **生成记忆：** 在对话结束时，您可以将会话的事件发送到内存库，内存库会智能地处理并存储这些信息为“记忆”。
- **检索记忆：** 您的 Agent 代码可以向内存库发出搜索查询，从过去的对话中检索相关记忆。

### 使用 `add_memory` 直接摄取记忆 {#direct-memory-ingestion-with-addmemory}

除了从会话历史生成记忆外，`VertexAiMemoryBankService` 还支持通过 `add_memory` 方法直接摄取记忆。该方法可以让您精确控制存储到内存库的事实。

其工作方式取决于 `enable_consolidation` 选项：

- **直接创建（默认）：** 默认情况下，`add_memory` 调用底层的 `memories.create` API。您提供的每个 `MemoryEntry` 都会作为一个独立的、单独的记忆项添加。

    ```python
    from google.adk.memory import VertexAiMemoryBankService
    from google.adk.memory.memory_entry import MemoryEntry
    from google.genai.types import Content, Part

    memory_service = VertexAiMemoryBankService(...)

    await memory_service.add_memory(
        app_name="my-app",
        user_id="user-123",
        memories=[
            MemoryEntry(content=Content(parts=[Part(text="The user's favorite color is blue.")]))
        ]
    )
    ```

- **创建与整合：** 如果你在 `custom_metadata` 中将 `enable_consolidation` 设置为 `True`，服务将使用 `memories.generate` API。此设置允许内存库智能地将新的内存项目与现有的相关记忆整合，从而防止冗余并构建更连贯的知识库。

    ```python
    await memory_service.add_memory(
        app_name="my-app",
        user_id="user-123",
        memories=[
            MemoryEntry(content=Content(parts=[Part(text="The user's favorite color is light blue.")]))
        ],
        custom_metadata={"enable_consolidation": True}
    )
    ```

### 前提条件 {#prerequisites}

在使用此功能之前，您必须具备：

1. **一个 Google Cloud 项目：** 已启用 Agent Platform API。
2. **一个 Agent Runtime：** 您需要在 Agent Platform 上创建一个 Agent Runtime。
   使用 Memory Bank 并不需要将您的 Agent 部署到 Agent Runtime。
   此设置将为您提供配置所需的 **Agent Runtime ID**。
3. **身份验证：** 确保您的本地环境已通过身份验证以访问
   Google Cloud 服务。最简单的方法是运行：

    ```bash
    gcloud auth application-default login
    ```

4. **环境变量：** 该服务需要您的 Google Cloud 项目 ID 和位置。将它们设置为环境变量：

    ```bash
    export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
    export GOOGLE_CLOUD_LOCATION="your-gcp-location"
    ```

有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参阅 [连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/)。

### 配置 {#configuration}

要将您的 Agent 连接到内存库，请在启动 ADK 服务器（`adk web` 或 `adk api_server`）时使用 `--memory_service_uri` 标志。统一资源标识符（URI）必须采用 `agentengine://<agent_engine_id>` 格式。

```bash title="bash"
adk web path/to/your/agents_dir --memory_service_uri="agentengine://1234567890"
```

或者，您可以通过手动实例化 `VertexAiMemoryBankService` 并将其传递给 `Runner` 来配置您的 Agent 使用内存库。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py
from google import adk
from google.adk.memory import VertexAiMemoryBankService

memory_service = VertexAiMemoryBankService(
    project="PROJECT_ID",
    location="LOCATION",
    agent_engine_id="AGENT_ENGINE_ID"
)

runner = adk.Runner(
    ...
    memory_service=memory_service
)
```

{{% /tab %}}
{{< /tabs >}}
## RAG 记忆 {#rag-memory}

`VertexAiRagMemoryService` 在 [知识引擎](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview)中存储对话，并通过向量相似性进行检索。当你已经有 RAG 基础设施或希望获取原始记录检索而不是 Memory Bank 生成的 LLM 提取记忆时使用它。需要 Agent 平台 SDK。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.memory import VertexAiRagMemoryService

memory_service = VertexAiRagMemoryService(
    rag_corpus="projects/PROJECT_ID/locations/LOCATION/ragCorpora/CORPUS_ID",
    similarity_top_k=5,
    vector_distance_threshold=0.6,
)
```

{{% /tab %}}
{{< /tabs >}}
## 在你的 Agent 中使用记忆 {#use-memory-in-your-agent}

当配置了记忆服务时，你的 Agent 可以使用工具或回调来
检索记忆。ADK 包含两个预构建的检索记忆工具：

- **预加载记忆**：在每轮开始时自动检索记忆，类似于回调。
- **加载记忆**：在你的 Agent 认为有帮助时检索记忆。

**示例：**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.tools import preload_memory

agent = Agent(
    model=MODEL_ID,
    name='weather_sentiment_agent',
    instruction="...",
    tools=[preload_memory]
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/preloadmemorytool"
)

agent, _ := llmagent.New(llmagent.Config{
    Model:       model,
    Name:        "weather_sentiment_agent",
    Instruction: "...",
    Tools:       []tool.Tool{preloadmemorytool.New()},
})
```

{{% /tab %}}
{{< /tabs >}}
要从您的会话中提取记忆，您需要调用 `add_session_to_memory`。
例如，您可以使用回调自动化此步骤：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.tools import preload_memory

async def auto_save_session_to_memory_callback(callback_context):
    await callback_context.add_session_to_memory()

agent = Agent(
    model=MODEL,
    name="Generic_QA_Agent",
    instruction="Answer the user's questions",
    tools=[preload_memory],
    after_agent_callback=auto_save_session_to_memory_callback,
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 ADK Go 中，Agent 回调无法访问内存服务。请改为从插件的 `AfterRunCallback` 保存会话，并将插件与内存服务一起在 Runner 上注册：

```go
import (
    "log"

    "google.golang.org/adk/v2/agent"
    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/plugin"
    "google.golang.org/adk/v2/runner"
    "google.golang.org/adk/v2/tool"
    "google.golang.org/adk/v2/tool/loadmemorytool"
)

autoSavePlugin, _ := plugin.New(plugin.Config{
    Name: "auto_save_session_to_memory",
    AfterRunCallback: func(ctx agent.InvocationContext) {
        if m := ctx.Memory(); m != nil {
            if err := m.AddSessionToMemory(ctx, ctx.Session()); err != nil {
                log.Printf("failed to save session to memory: %v", err)
            }
        }
    },
})

rootAgent, _ := llmagent.New(llmagent.Config{
    Model:       model,
    Name:        "Generic_QA_Agent",
    Instruction: "Answer the user's questions",
    Tools:       []tool.Tool{loadmemorytool.New()},
})

r, _ := runner.New(runner.Config{
    AppName:        "my_app",
    Agent:          rootAgent,
    SessionService: sessionService,
    MemoryService:  memoryService,
    PluginConfig: runner.PluginConfig{
        Plugins: []*plugin.Plugin{autoSavePlugin},
    },
})
```

{{% /tab %}}
{{< /tabs >}}
### 从回调中写入具体事件或事实 {#write-specific-events-or-facts-from-a-callback}

当前 Python/Go 版本暂不支持此功能。

`CallbackContext.addSessionToMemory` 方法是默认的内存行为，会保存 Agent 的整个会话。当你想要更精细的控制时，`CallbackContext` 还提供另外两种方法：`addEventsToMemory`，用于选定子集的事件，以及 `addMemory`，用于你自己构建的事实。两者都接受可选的 `customMetadata`，并且都会从当前调用中填充应用、用户和会话信息。

> 官方此示例仅提供 kotlin 版本；本套文档只保留 Python 和 Go 示例。

如果 Runner 未配置内存服务，所有三种方法都会抛出 `IllegalStateException`，因此它们在运行时失败，而非编译时。

## 扩展内存功能 {#extend-memory-capabilities}

从 `BaseMemoryService` 扩展的内存服务支持将会话和事件添加到 Agent 内存中，包括自定义元数据。使用 `add_session_to_memory` 和 `add_events_to_memory` 方法（例如 `InMemoryMemoryService` 的内存服务）来修改内存数据，如以下代码示例所示：

```python
import asyncio
from google.adk.memory import InMemoryMemoryService

# 假设 my_memory_service 是 InMemoryMemoryService 的一个实例
# 并且 my_latest_events 是来自最近一次回合的新 adk.Event 对象的列表。
my_latest_events = [...]

async def update_incremental_memory(my_memory_service, my_latest_events):
    # 示例 1：基本增量更新
    await my_memory_service.add_events_to_memory(
        app_name="my-app",
        user_id="my-user",
        events=my_latest_events,
        session_id="my-optional-session-id"
    )

    # 示例 2：带自定义元数据的增量更新
    await my_memory_service.add_events_to_memory(
        app_name="my-app",
        user_id="my-user",
        events=my_latest_events,
        session_id="my-optional-session-id",
        custom_metadata={
            "my_custom_key": "my_custom_value"
        }
    )

async def update_session_memory(my_memory_service, my_completed_session):
    # 示例 3：将自定义元数据应用于完整会话
    await my_memory_service.add_session_to_memory(
        session=my_completed_session,
        custom_metadata={
            "category": "user_preference"
        }
    )
```

## 高级概念 {#advanced-concepts}

### 内存在实践中的工作原理 {#how-memory-works-in-practice}

内存工作流程包括以下步骤：

1. **会话交互：** 用户通过 `Session` 与 Agent 进行交互，由 `SessionService` 管理。在此交互过程中，会记录事件，并可能更新会话状态。
2. **写入内存：** 当会话结束或获取到重要信息时，您的应用会调用 `memory_service.add_session_to_memory(session)`。此操作提取关键数据并将其持久化到您的长期知识存储中，例如 Agent 运行时内存库。
3. **后续查询：** 在不同的或相同的会话中，您可能会提出需要过去上下文的问题，例如，“上周我们讨论了项目 X 的内容是什么？”
4. **Agent 使用内存工具：** 配备了内存检索工具的 Agent，例如内置的 `load_memory` 工具，会识别出需要过去上下文。它调用该工具，提供搜索查询（例如，“上周项目 X 的讨论”）。
5. **执行搜索：** 工具内部调用 `memory_service.search_memory(app_name=..., user_id=..., query=...)`。
6. **返回结果：** `MemoryService` 搜索其存储库，使用关键字匹配或语义搜索，并将匹配的片段作为 `SearchMemoryResponse` 返回，其中包含 `MemoryEntry` 对象列表，每个对象包含 `content`，以及可选的：`id`、`author`、`timestamp` 和 `custom_metadata`。
7. **Agent 使用结果：** 工具将这些结果返回给 Agent，通常作为上下文或函数响应的一部分。Agent 随后可以使用这些检索到的信息来形成对用户的最终回答。

### Agent 可以访问多个内存服务吗？ {#can-an-agent-have-access-to-more-than-one-memory-service}

- **通过标准配置：不行。** 框架（`adk web`、`adk
  api_server`）设计为一次通过 `--memory_service_uri` 标志配置一个内存服务。该单一服务被连接到 Runner，并通过 `tool_context.search_memory()` 和 `callback_context.search_memory()` 暴露。
- **在 Agent 代码中：可以。** 您可以实例化第二个 `BaseMemoryService`，并通过自定义工具访问它，而自定义工具已经拥有框架配置服务的 `ToolContext`。

例如，您的 Agent 可以使用框架配置的 `InMemoryMemoryService` 进行对话历史管理，并手动实例化第二个服务，即 `VertexAiMemoryBankService`，一个用于文档语料库的 `VertexAiRagMemoryService`，或任何其他 `BaseMemoryService` 实现，用于单独的知识库。

#### 示例：使用两个内存服务 {#example-use-two-memory-services}

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.memory import InMemoryMemoryService
from google.adk.tools import ToolContext

# 用于文档查找的第二个内存服务；可以是任何 BaseMemoryService。
docs_memory = InMemoryMemoryService()

async def search_all_memory(query: str, tool_context: ToolContext) -> dict:
    """Search both the conversational memory and the docs corpus."""
    conversational = await tool_context.search_memory(query)
    docs = await docs_memory.search_memory(
        app_name="docs", user_id="shared", query=query
    )
    return {
        "from_conversations": [
            part.text
            for entry in conversational.memories
            for part in (entry.content.parts or [])
            if part.text
        ],
        "from_docs": [
            part.text
            for entry in docs.memories
            for part in (entry.content.parts or [])
            if part.text
        ],
    }

agent = Agent(
    model="gemini-flash-latest",
    name="multi_memory_agent",
    instruction=(
        "Answer questions using both your conversation history and the "
        "docs knowledge base. Use the search_all_memory tool."
    ),
    tools=[search_all_memory],
)
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[Memory: Long-term knowledge with MemoryService](https://adk.dev/sessions/memory/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/sessions/memory.md)
