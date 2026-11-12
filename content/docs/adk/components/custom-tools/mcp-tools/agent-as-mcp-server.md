---
title: "将 Agent 作为 MCP 服务器"
description: "您可以通过在 MCP 服务器中托管您的 ADK Agent 的功能，使外部 MCP 客户端（例如 Antigravity、Claude Code 或自定义 Agent）能够访问您的 ADK Agent 的功能。主要有两种方式"
icon: "article"
weight: 30
toc: true
---

您可以通过在 MCP 服务器中托管您的 ADK Agent 功能，使其可以被外部 MCP 客户端访问，例如 Antigravity、Claude Code 或自定义 Agent。实现这一目标主要有两种方法：

* **暴露整个 Agent：** 将完整的多轮 Agent 推理和内部工具执行封装到服务器中，只需一行简单的转换。

* **暴露单个工具：** 涉及手动构建轻量级 MCP 服务器，以封装特定的独立 ADK 工具（如 `FunctionTool`），而不包括 Agent 的推理循环。

## 入门 {#get-started}
最强大的方法是暴露整个 `LlmAgent`。通过使用 `to_mcp_server()` 工具，您可以将您的 Agent 转换为标准的 FastMCP 服务器。这允许外部客户端与 Agent 的完整认知能力及其内部工具集进行交互。

```python
from google.adk.agents import LlmAgent
from google.adk.tools.load_web_page import load_web_page
from google.adk.tools.mcp_tool import to_mcp_server

# 1. 定义你的 ADK Agent
agent = LlmAgent(
    model="gemini-flash-latest",
    name="web_reader_agent",
    instruction="Fetch and summarize web content for the user.",
    tools=[load_web_page],
)

# 2. 将 Agent 转换为 MCP 服务器
app = to_mcp_server(agent)

if __name__ == "__main__":
    # 以标准 stdio MCP 服务器的方式运行 Agent
    app.run()
```

## 暴露单个 ADK 工具 {#expose-individual-adk-tools}
如果您只想暴露单个功能（例如特定的 `FunctionTool`），而不使用完整的 Agent 推理循环，您必须手动构建 MCP 服务器。

**前提条件:**
您必须在您的 ADK 环境中安装 MCP 服务器库：

```bash
pip install mcp
```

**实现步骤：**

1. **初始化工具：** 实例化你想要公开的 ADK 工具，例如：`FunctionTool(load_web_page)`。
2. **列出工具处理器：** 实现 MCP 服务器的 `@app.list_tools()` 处理器以宣传该工具。你可以使用来自 `google.adk.tools.mcp_tool.conversion_utils` 的 `adk_to_mcp_tool_type` 工具将 ADK 工具定义转换为 MCP 模式格式。
3. **调用工具处理器：** 实现 `@app.call_tool()` 处理器以接收客户端请求。该处理器必须识别请求是否匹配你封装的工具，执行 ADK 工具的 `.run_async()` 方法（传递 `tool_context=None`），并将响应格式化为符合 MCP 的结构，例如 `mcp.types.TextContent`。

## 使用 ADK 工具构建 MCP 服务器 {#build-the-mcp-server-with-adk-tools}

1. 为你的 MCP 服务器创建一个新的 Python 文件，例如：`my_adk_mcp_server.py`。
2. 使用以下代码在你的新文件中实现服务器逻辑。以下脚本设置了一个 MCP 服务器，公开 ADK `load_web_page` 工具。

```python
import asyncio
import json
import os
from dotenv import load_dotenv

# MCP 服务器导入
from mcp import types as mcp_types
from mcp.server.lowlevel import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio

# ADK 工具导入
from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.load_web_page import load_web_page
from google.adk.tools.mcp_tool.conversion_utils import adk_to_mcp_tool_type

load_dotenv()

# 1. 准备 ADK 工具
adk_tool_to_expose = FunctionTool(load_web_page)

# 2. 创建 MCP 服务器实例
app = Server("adk-tool-exposing-mcp-server")

# 3. 实现 list_tools 处理程序
@app.list_tools()
async def list_mcp_tools() -> list[mcp_types.Tool]:
    mcp_tool_schema = adk_to_mcp_tool_type(adk_tool_to_expose)
    return [mcp_tool_schema]

# 4. 实现 call_tool 处理程序
@app.call_tool()
async def call_mcp_tool(name: str, arguments: dict) -> list[mcp_types.Content]:
    if name == adk_tool_to_expose.name:
        try:
            # 执行 ADK 工具
            adk_tool_response = await adk_tool_to_expose.run_async(
                args=arguments,
                tool_context=None,
            )
            # 格式化为 MCP 文本内容
            response_text = json.dumps(adk_tool_response, indent=2)
            return [mcp_types.TextContent(type="text", text=response_text)]
        except Exception as e:
            error_text = json.dumps({"error": str(e)})
            return [mcp_types.TextContent(type="text", text=error_text)]
    else:
        error_text = json.dumps({"error": f"Tool '{name}' not found."})
        return [mcp_types.TextContent(type="text", text=error_text)]

# 5. MCP 服务器 Runner（Stdio）
async def run_mcp_stdio_server():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name=app.name,
                server_version="0.1.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(run_mcp_stdio_server())
```

## 连接和传输模式 {#connection-and-transport-modes}
当通过这些 MCP 服务器公开您的 ADK 功能时，通常使用标准输入/输出连接（`mcp.server.stdio`）来运行它们。该连接允许运行在父进程中的外部客户端应用程序生成您的脚本，并通过 stdio 流直接与其通信，从而保持连接自包含且隔离。

## 使用 ADK Agent 测试您的自定义 MCP 服务器 {#test-your-custom-mcp-server-with-an-adk-agent}

要测试您的自定义服务器，您需要构建一个充当客户端的 ADK Agent。该 Agent 使用 `McpToolset` 与您刚创建的服务器脚本建立连接。

1. 在新目录中设置您的 Agent，例如 `./adk_agent_samples/mcp_client_agent/`。创建一个 `agent.py` 文件，并附带一个 `__init__.py` 来使其可发现。

    ```python
    from google.adk.agents import LlmAgent
    from google.adk.tools.mcp_tool import McpToolset
    from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
    from mcp import StdioServerParameters

    # 重要：提供您之前创建的服务器脚本的绝对路径
    MCP_SERVER_SCRIPT = "/path/to/your/my_adk_mcp_server.py"

    root_agent = LlmAgent(
        model='gemini-flash-latest',
        name='web_reader_mcp_client_agent',
        instruction="Use the 'load_web_page' tool to fetch content from a URL provided by the user.",
        tools=[
            McpToolset(
                connection_params=StdioConnectionParams(
                    server_params=StdioServerParameters(
                        command='python3',
                        args=[MCP_SERVER_SCRIPT],
                    )
                )
            )
        ],
    )
    ```

2. 在终端中导航到 Agent 的父目录：

    ```bash
    cd ./adk_agent_samples
    adk web
    ```

3. 打开 ADK Web 界面并选择 web_reader_mcp_client_agent。
4. 使用如下提示测试连接：*从 "https://example.com" 加载内容*。

## Google Cloud Genmedia 的 MCP 服务器 {#mcp-servers-for-google-cloud-genmedia}

[MCP Tools for Genmedia Services](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia) 是一套开源的 MCP 服务器，能够让你将 Google Cloud 的生成式媒体服务——如 Imagen、Veo、Chirp 3 高清语音和 Lyria——集成到你的 AI 应用中。

Agent Development Kit (ADK) 和 [Genkit](https://genkit.dev/) 提供对这些 MCP 工具的内置支持，使你的 AI Agent 能够高效地协调生成式媒体工作流。关于实现指导，请参考 [ADK 示例 Agent](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia/sample-agents/adk) 和 [Genkit 示例](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia/sample-agents/genkit)。

---

原文：[Configure ADK agents as MCP servers](https://adk.dev/tools-custom/mcp-tools/agent-as-server/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/mcp-tools/agent-as-server.md)
