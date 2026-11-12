---
title: "部署"
description: "在将使用 MCP 工具的 ADK Agent 部署到像 Cloud Run、GKE 或 Agent Runtime 这样的生产环境时，您需要考虑 MCP 连接在容器化和分布式环境中的工作方式。"
icon: "article"
weight: 20
toc: true
---

在将使用 MCP 工具的 ADK Agent 部署到生产环境（如 Cloud Run、GKE 或 Agent Runtime）时，您需要考虑 MCP 连接在容器化和分布式环境中的工作方式。

## 关键部署要求：同步 Agent 定义 {#critical-deployment-requirement-synchronous-agent-definition}

{{% alert context="warning" %}}

在使用 MCP 工具部署 Agent 时，必须在您的 `agent.py` 文件中**同步**定义 Agent 及其 McpToolset。虽然 `adk web` 允许异步创建 Agent，但部署环境要求同步实例化。
{{% /alert %}}

```python
# 正确：用于部署的同步 Agent 定义
import os
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

_allowed_path = os.path.dirname(os.path.abspath(__file__))

root_agent = LlmAgent(
    model='gemini-flash-latest',
    name='enterprise_assistant',
    instruction=f'Help user accessing their file systems. Allowed directory: {_allowed_path}',
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command='npx',
                    args=['-y', '@modelcontextprotocol/server-filesystem', _allowed_path],
                ),
                timeout=5,  # Configure appropriate timeouts
            ),
            # 用于生产环境中安全的过滤工具
            tool_filter=[
                'read_file', 'read_multiple_files', 'list_directory',
                'directory_tree', 'search_files', 'get_file_info',
                'list_allowed_directories',
            ],
        )
    ],
)
```

```python
# 错误：异步模式在部署中不起作用
async def get_agent():  # This won't work for deployment
    toolset = await create_mcp_toolset_async()
    return LlmAgent(tools=[toolset])
```

## 快速部署命令 {#quick-deployment-commands}

### Agent 运行时 {#agent-runtime}

```bash
uv run adk deploy agent_engine \
  --project=<your-gcp-project-id> \
  --region=<your-gcp-region> \
  --display_name="My MCP Agent" \
  ./path/to/your/agent_directory
```

### 云运行 {#cloud-run}

```bash
uv run adk deploy cloud_run \
  --project=<your-gcp-project-id> \
  --region=<your-gcp-region> \
  --service_name=<your-service-name> \
  ./path/to/your/agent_directory
```

## 部署模式 {#deployment-patterns}

### 模式 1：自包含 Stdio MCP 服务器 {#pattern-1-self-contained-stdio-mcp-servers}

对于可以打包为 npm 包或 Python 模块（如 `@modelcontextprotocol/server-filesystem`）的 MCP 服务器，你可以将它们直接包含在你的 Agent 容器中：

**容器要求：**

```dockerfile
# Example for npm-based MCP servers
FROM python:3.13-slim

# Install Node.js and npm for MCP servers
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Install your Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy your agent code
COPY . .

# Your agent can now use StdioConnectionParams with 'npx' commands
CMD ["python", "main.py"]
```

**Agent 配置:**

```python
# 这在容器中有效，因为 npx 和 MCP 服务器在同一个环境中运行
McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command='npx',
            args=["-y", "@modelcontextprotocol/server-filesystem", "/app/data"],
        ),
    ),
)
```

### 模式 2：远程 MCP 服务器（可流式 HTTP） {#pattern-2-remote-mcp-servers-streamable-http}

对于需要可扩展性的生产部署，将 MCP 服务器部署为独立服务，并通过可流式 HTTP 连接：

**MCP 服务器部署（Cloud Run）：**

```python
# deploy_mcp_server.py - 使用可流式 HTTP 的独立 Cloud Run 服务
import contextlib
import logging
from collections.abc import AsyncIterator
from typing import Any

import mcp.types as types
from mcp.server.lowlevel import Server
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from starlette.applications import Starlette
from starlette.routing import Mount
from starlette.types import Receive, Scope, Send

logger = logging.getLogger(__name__)

def create_mcp_server():
    """Create and configure the MCP server."""
    app = Server("adk-mcp-streamable-server")

    @app.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[types.ContentBlock]:
        """Handle tool calls from MCP clients."""
        # 示例工具实现 - 用您的实际 ADK 工具替换
        if name == "example_tool":
            result = arguments.get("input", "No input provided")
            return [
                types.TextContent(
                    type="text",
                    text=f"Processed: {result}"
                )
            ]
        else:
            raise ValueError(f"Unknown tool: {name}")

    @app.list_tools()
    async def list_tools() -> list[types.Tool]:
        """List available tools."""
        return [
            types.Tool(
                name="example_tool",
                description="Example tool for demonstration",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "input": {
                            "type": "string",
                            "description": "Input text to process"
                        }
                    },
                    "required": ["input"]
                }
            )
        ]

    return app

def main(port: int = 8080, json_response: bool = False):
    """Main server function."""
    logging.basicConfig(level=logging.INFO)

    app = create_mcp_server()

    # 创建具有无状态模式以实现可扩展性的会话管理器
    session_manager = StreamableHTTPSessionManager(
        app=app,
        event_store=None,
        json_response=json_response,
        stateless=True,  # Important for Cloud Run scalability
    )

    async def handle_streamable_http(scope: Scope, receive: Receive, send: Send) -> None:
        await session_manager.handle_request(scope, receive, send)

    @contextlib.asynccontextmanager
    async def lifespan(app: Starlette) -> AsyncIterator[None]:
        """Manage session manager lifecycle."""
        async with session_manager.run():
            logger.info("MCP Streamable HTTP server started!")
            try:
                yield
            finally:
                logger.info("MCP server shutting down...")

    # 创建 ASGI 应用
    starlette_app = Starlette(
        debug=False,  # Set to False for production
        routes=[
            Mount("/mcp", app=handle_streamable_http),
        ],
        lifespan=lifespan,
    )

    import uvicorn
    uvicorn.run(starlette_app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    main()
```

**远程 MCP 的 Agent 配置：**

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 您的 ADK Agent 通过可流式 HTTP 连接到远程 MCP 服务
McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://your-mcp-server-url.run.app/mcp",
        headers={"Authorization": "Bearer your-auth-token"}
    ),
)
```

{{% /tab %}}
{{< /tabs >}}
### 模式 3：Sidecar MCP 服务器（GKE） {#pattern-3-sidecar-mcp-servers-gke}

在 Kubernetes 环境中，您可以将 MCP 服务器作为 sidecar 容器部署：

```yaml
# deployment.yaml - GKE with MCP sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adk-agent-with-mcp
spec:
  template:
    spec:
      containers:
      # Main ADK agent container
      - name: adk-agent
        image: your-adk-agent:latest
        ports:
        - containerPort: 8080
        env:
        - name: MCP_SERVER_URL
          value: "http://localhost:8081"

      # MCP server sidecar
      - name: mcp-server
        image: your-mcp-server:latest
        ports:
        - containerPort: 8081
```

## 连接管理注意事项 {#connection-management-considerations}

根据您的扩展和基础设施需求选择连接类型。

### Stdio 连接 {#stdio-connections}
*   **优点:** 配置简单，进程隔离，且在容器中运行良好。
*   **缺点:** 进程开销大；不适合大规模部署。
*   **适用:** 开发、单租户部署和简单的 MCP 服务器。

### SSE/HTTP 连接 {#ssehttp-connections}
*   **优点:** 基于网络，可扩展，并能处理多个客户端。
*   **缺点:** 需要网络基础设施和复杂的认证配置。
*   **适用:** 生产环境部署、多租户系统、外部 MCP 服务和高流量场景。

## 生产部署指南 {#production-deployment-guidelines}

在使用 MCP 工具将 Agent 部署到生产环境时，请遵循以下核心指南。

### 连接生命周期 {#connection-lifecycle}
*   关闭 `Runner` (`await runner.close()`) 以清理其 Agent 树上的每个 `McpToolset`。
*   为连接建立和请求配置适当的超时。
*   实现重试逻辑，以优雅地处理临时连接失败。

### 资源管理 {#resource-management}
*   密切监控 stdio MCP 服务器的内存使用情况，因为每个连接都会生成一个新进程。
*   为 MCP 服务器进程配置适当的 CPU 和内存限制。
*   为远程 MCP 服务器实现连接池，以优化资源消耗。

### 安全 {#security}
{{% alert context="default" %}}
**安全最佳实践**

*   对所有远程 MCP 连接使用严格的认证头。
*   对于每用户或可刷新凭证，优先使用 `header_provider` 或 `auth_credential`，而不是静态 `headers` 字典。
*   严格限制 ADK Agent 与 MCP 服务器之间的网络访问。
*   使用 `tool_filter` 过滤 MCP 工具，以严格限制公开功能。
*   验证所有 MCP 工具的输入，以防止提示或命令注入攻击。
*   对文件系统 MCP 服务器使用限制性、绝对的文件路径（例如 `os.path.dirname(os.path.abspath(__file__))`）。
*   在生产环境中尽可能应用只读工具过滤器。
{{% /alert %}}
### 监控与可观察性 {#monitoring-and-observability}
*   记录所有 MCP 连接建立和关闭事件。
*   监控 MCP 工具的执行时间和总体成功率。
*   针对重复出现的 MCP 连接失败设置自动警报。

---

原文：[Deploy Agents with MCP Tools](https://adk.dev/tools-custom/mcp-tools/deployment/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/mcp-tools/deployment.md)
