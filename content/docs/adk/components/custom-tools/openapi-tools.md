---
title: "OpenAPI 工具"
description: "ADK 通过直接从 OpenAPI 规范 (v3.x) 自动生成可调用工具，简化了与外部 REST API 的交互。这消除了为每个 API 手动定义单独函数工具的需求"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0。

ADK 通过直接从 [OpenAPI 规范 (v3.x)](https://swagger.io/specification/) 自动生成可调用工具，简化了与外部 REST API 的交互。这消除了为每个 API 端点手动定义单独函数工具的需要。

{{% alert context="success" %}}
**核心优势**

使用 `OpenAPIToolset` 可以从现有的 API 文档（OpenAPI 规范）即时创建 Agent 工具（`RestApiTool`），使 Agent 能够无缝调用您的网络服务。
{{% /alert %}}

## 主要组件 {#key-components}

* **`OpenAPIToolset`**：这是您将使用的主要类。您可以用 OpenAPI 规范初始化它，它负责解析和生成工具。
* **`RestApiTool`**：此类表示单个可调用的 API 操作（如 `GET /pets/{petId}` 或 `POST /pets`）。`OpenAPIToolset` 为规范中定义的每个操作创建一个 `RestApiTool` 实例。

## 工作原理 {#how-it-works}

使用 `OpenAPIToolset` 时，该过程包括以下主要步骤：

1. **初始化与解析**：
    * 您可以将 OpenAPI 规范以 Python 字典、JSON 字符串或 YAML 字符串的形式提供给 `OpenAPIToolset`。
    * 工具集内部解析规范，解析任何内部引用 (`$ref`)，以了解完整的 API 结构。

2. **操作发现**：
    * 它识别规范中 `paths` 对象内定义的所有有效 API 操作（例如 `GET`、`POST`、`PUT`、`DELETE`）。

3. **工具生成**：
    * 对于每个发现的操作，`OpenAPIToolset` 自动创建对应的 `RestApiTool` 实例。
    * **工具名称**：源自规范中的 `operationId`（转换为 `snake_case`，最大 60 个字符）。如果 `operationId` 缺失，则根据方法和路径生成名称。
    * **工具描述**：使用操作中的 `summary` 或 `description` 提供给 LLM。
    * **API 详情**：内部存储所需的 HTTP 方法、路径、服务器基础 URL、参数（路径、查询、请求头、Cookie）以及请求体模式。4. **`RestApiTool` 功能**：每个生成的 `RestApiTool`：
    * **Schema 生成**：根据操作的参数和请求体动态创建 `FunctionDeclaration`。此 schema 告诉 LLM 如何调用工具（预期的参数是什么）。
    * **执行**：当 LLM 调用工具时，工具会构建 HTTP 请求，包括 URL、头信息、查询参数和请求体，使用 LLM 的参数和 OpenAPI 规范。如果配置了身份验证，工具会处理身份验证，并使用 `httpx` 库异步执行 API 调用，读写超时时间为 600 秒（可通过 `httpx_client_factory` 自定义）。

5. **认证**：在初始化 `OpenAPIToolset` 时，您可以配置全局身份验证（如 API 密钥或 OAuth - 详情见 [Authentication](/docs/adk/components/custom-tools/authentication/)）。此身份验证配置会自动应用于所有生成的 `RestApiTool` 实例。

## 使用工作流程 {#usage-workflow}

按照以下步骤将 OpenAPI 规范集成到您的 Agent 中：

1. **获取规范**：获取您的 OpenAPI 规范文档（例如，从 `.json` 或 `.yaml` 文件加载，或从 URL 获取）。
2. **实例化工具集**：创建 `OpenAPIToolset` 实例，传入规范内容和类型（`spec_str`/`spec_dict`，`spec_str_type`）。如果 API 需要，提供身份验证详细信息（`auth_scheme`，`auth_credential`）。

    ```python
    from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

    # 带有 JSON 字符串的示例
    openapi_spec_json = '...' # Your OpenAPI JSON string
    toolset = OpenAPIToolset(spec_str=openapi_spec_json, spec_str_type="json")

    # 带有字典的示例
    # openapi_spec_dict = {...}  # 你的 OpenAPI 规范作为字典
    # toolset = OpenAPIToolset(spec_dict=openapi_spec_dict)
    ```

3. **添加到 Agent**：将检索到的工具包含到您的 `LlmAgent` 的 `tools` 列表中。

    ```python
    from google.adk.agents import LlmAgent

    my_agent = LlmAgent(
        name="api_interacting_agent",
        model="gemini-flash-latest", # Or your preferred model
        tools=[toolset], # Pass the toolset
        # ... 其他 Agent 配置 ...
    )
    ```

4. **指导 Agent**：更新你的 Agent 指令，告知它有关新 API 功能的信息以及它可以使用的工具名称（例如，`list_pets`、`create_pet`）。从规范生成的工具描述也将帮助 LLM。
5. **运行 Agent**：使用 `Runner` 执行你的 Agent。当 LLM 确定需要调用某个 API 时，它将生成针对相应 `RestApiTool` 的函数调用，该函数调用将自动处理 HTTP 请求。

## 实际演示 {#see-it-in-action}

此示例演示了如何从一个简单的宠物商店 OpenAPI 规范生成工具（使用 `httpbin.org` 获取模拟响应），并通过 Agent 与它们进行交互。

<details>
<summary>代码：宠物商店 API</summary>

```python title="openapi_example.py"
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
import uuid # For unique session IDs
from dotenv import load_dotenv

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# --- OpenAPI 工具导入 ---
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

# --- 加载环境变量（如果 ADK 工具需要，例如 API 密钥） ---
load_dotenv() # Create a .env file in the same directory if needed

# --- 常量 ---
APP_NAME_OPENAPI = "openapi_petstore_app"
USER_ID_OPENAPI = "user_openapi_1"
SESSION_ID_OPENAPI = f"session_openapi_{uuid.uuid4()}" # Unique session ID
AGENT_NAME_OPENAPI = "petstore_manager_agent"
GEMINI_MODEL = "gemini-2.0-flash"

# --- 示例 OpenAPI 规范（JSON 字符串） ---
# 一个使用 httpbin.org 作为模拟服务器的基础宠物商店 API 示例
openapi_spec_string = """
{
  "openapi": "3.0.0",
  "info": {
    "title": "Simple Pet Store API (Mock)",
    "version": "1.0.1",
    "description": "An API to manage pets in a store, using httpbin for responses."
  },
  "servers": [
    {
      "url": "https://httpbin.org",
      "description": "Mock server (httpbin.org)"
    }
  ],
  "paths": {
    "/get": {
      "get": {
        "summary": "List all pets (Simulated)",
        "operationId": "listPets",
        "description": "Simulates returning a list of pets. Uses httpbin's /get endpoint which echoes query parameters.",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "description": "Maximum number of pets to return",
            "required": false,
            "schema": { "type": "integer", "format": "int32" }
          },
          {
             "name": "status",
             "in": "query",
             "description": "Filter pets by status",
             "required": false,
             "schema": { "type": "string", "enum": ["available", "pending", "sold"] }
          }
        ],
        "responses": {
          "200": {
            "description": "A list of pets (echoed query params).",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    },
    "/post": {
      "post": {
        "summary": "Create a pet (Simulated)",
        "operationId": "createPet",
        "description": "Simulates adding a new pet. Uses httpbin's /post endpoint which echoes the request body.",
        "requestBody": {
          "description": "Pet object to add",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name"],
                "properties": {
                  "name": {"type": "string", "description": "Name of the pet"},
                  "tag": {"type": "string", "description": "Optional tag for the pet"}
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Pet created successfully (echoed request body).",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    },
    "/get?petId={petId}": {
      "get": {
        "summary": "Info for a specific pet (Simulated)",
        "operationId": "showPetById",
        "description": "Simulates returning info for a pet ID. Uses httpbin's /get endpoint.",
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "description": "This is actually passed as a query param to httpbin /get",
            "required": true,
            "schema": { "type": "integer", "format": "int64" }
          }
        ],
        "responses": {
          "200": {
            "description": "Information about the pet (echoed query params)",
            "content": { "application/json": { "schema": { "type": "object" } } }
          },
          "404": { "description": "Pet not found (simulated)" }
        }
      }
    }
  }
}
"""

# --- 创建 OpenAPIToolset ---
petstore_toolset = OpenAPIToolset(
    spec_str=openapi_spec_string,
    spec_str_type='json',
    # httpbin.org 不需要身份验证
)

# --- Agent 定义 ---
root_agent = LlmAgent(
    name=AGENT_NAME_OPENAPI,
    model=GEMINI_MODEL,
    tools=[petstore_toolset], # Pass the list of RestApiTool objects
    instruction="""You are a Pet Store assistant managing pets via an API.
    Use the available tools to fulfill user requests.
    When creating a pet, confirm the details echoed back by the API.
    When listing pets, mention any filters used (like limit or status).
    When showing a pet by ID, state the ID you requested.
    """,
    description="Manages a Pet Store using tools generated from an OpenAPI spec."
)

# --- 会话和 Runner 设置 ---
async def setup_session_and_runner():
    session_service_openapi = InMemorySessionService()
    runner_openapi = Runner(
        agent=root_agent,
        app_name=APP_NAME_OPENAPI,
        session_service=session_service_openapi,
    )
    await session_service_openapi.create_session(
        app_name=APP_NAME_OPENAPI,
        user_id=USER_ID_OPENAPI,
        session_id=SESSION_ID_OPENAPI,
    )
    return runner_openapi

# --- Agent 交互函数 ---
async def call_openapi_agent_async(query, runner_openapi):
    print("\n--- Running OpenAPI Pet Store Agent ---")
    print(f"Query: {query}")

    content = types.Content(role='user', parts=[types.Part(text=query)])
    final_response_text = "Agent did not provide a final text response."
    try:
        async for event in runner_openapi.run_async(
            user_id=USER_ID_OPENAPI, session_id=SESSION_ID_OPENAPI, new_message=content
            ):
            # 可选：用于调试的详细事件日志
            # print(f"  DEBUG 事件: 作者={event.author}, 类型={'最终' if event.is_final_response() else '中间'}, 内容={str(event.content)[:100]}...")
            if event.get_function_calls():
                call = event.get_function_calls()[0]
                print(f"  Agent Action: Called function '{call.name}' with args {call.args}")
            elif event.get_function_responses():
                response = event.get_function_responses()[0]
                print(f"  Agent Action: Received response for '{response.name}'")
                # print(f"  工具响应片段: {str(response.response)[:200]}...") # 取消注释以获取响应详情
            elif event.is_final_response() and event.content and event.content.parts:
                # 捕获最后的最终文本响应
                final_response_text = event.content.parts[0].text.strip()

        print(f"Agent Final Response: {final_response_text}")

    except Exception as e:
        print(f"An error occurred during agent run: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for errors
    print("-" * 30)

# --- 运行示例 ---
async def run_openapi_example():
    runner_openapi = await setup_session_and_runner()

    # 触发 listPets
    await call_openapi_agent_async("Show me the pets available.", runner_openapi)
    # 触发 createPet
    await call_openapi_agent_async("Please add a new dog named 'Dukey'.", runner_openapi)
    # 触发 showPetById
    await call_openapi_agent_async("Get info for pet with ID 123.", runner_openapi)

# --- 执行 ---
if __name__ == "__main__":
    print("Executing OpenAPI example...")
    # 使用 asyncio.run() 进行顶层执行
    try:
        asyncio.run(run_openapi_example())
    except RuntimeError as e:
        if "cannot be called from a running event loop" in str(e):
            print("Info: Cannot run asyncio.run from a running event loop (e.g., Jupyter/Colab).")
            # 如果在 Jupyter/Colab 中，您可能需要这样运行：
            # await run_openapi_example()
        else:
            raise e
    print("OpenAPI example finished.")
```

</details>

## 高级配置 {#advanced-configuration}

{{% alert context="info" %}}
本节中的参数需要 ADK Python v2.0.0 或更高版本。
{{% /alert %}}

### 使用 `header_provider` 自定义请求头 {#custom-headers-with-headerprovider}

要动态地向每个 API 请求添加自定义请求头，请提供一个可调用对象给 `header_provider`。该可调用对象接收 `ReadonlyContext` 并返回一个请求头字典，如以下示例所示：

```python
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

openapi_spec = {...}  # Loaded from your OpenAPI file.

def my_header_provider(context: ReadonlyContext) -> dict[str, str]:
    return {"X-Request-ID": context.invocation_id}

toolset = OpenAPIToolset(
    spec_dict=openapi_spec,
    header_provider=my_header_provider,
)
```

### 使用 `ssl_verify` 进行 SSL 证书验证 {#ssl-certificate-verification-with-sslverify}

要为工具集中所有工具配置 SSL 证书验证，请使用 `ssl_verify` 参数。以下示例演示了如何为具有自定义 CA 证书的环境配置 SSL 验证：

```python
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

openapi_spec = {...}  # Loaded from your OpenAPI file.

toolset = OpenAPIToolset(
    spec_dict=openapi_spec,
    ssl_verify="/path/to/ca.pem",
)
```

{{% alert context="warning" %}}
**不要禁用验证**

`ssl_verify` 也接受 `True`、`False` 或 `ssl.SSLContext`。设置 `ssl_verify=False` 会完全禁用证书验证，使请求暴露于拦截风险中。请改用 CA 捆绑路径或自定义 `SSLContext`。
{{% /alert %}}

### 工具名称前缀 `tool_name_prefix` {#tool-name-prefix-with-toolnameprefix}

要为工具集生成的所有工具名称添加前缀，请使用 `tool_name_prefix` 参数。以下示例演示了在使用多个 OpenAPI 规范时如何避免名称冲突：

```python
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

openapi_spec = {...}  # Loaded from your OpenAPI file.

toolset = OpenAPIToolset(
    spec_dict=openapi_spec,
    tool_name_prefix="my_api",
)
```

---

原文：[Integrate REST APIs with OpenAPI](https://adk.dev/tools-custom/openapi-tools/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/openapi-tools.md)
