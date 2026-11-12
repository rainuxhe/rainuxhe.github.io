---
title: "使用 AI 编码"
description: "你可以使用 AI 编码助手通过 Agent Development Kit (ADK) 构建 Agent。通过将开发技能安装到你的项目中，或者通过连接到 ADK 文档，为你的编码 Agent 提供 ADK 专业知识。"
icon: "article"
weight: 30
toc: true
---

您可以使用 AI 编码助手通过 Agent Development Kit (ADK) 构建 Agent。通过将开发技能安装到您的项目中，或者通过 MCP 服务器将其连接到 ADK 文档，为您的编码 Agent 提供 ADK 专业知识。

- [**Agent 平台中的 Agents CLI**](#agents-cli)：用于 ADK 开发的命令行工具和编码技能。
- [**ADK 文档 MCP 服务器**](#adk-docs-mcp-server)：通过 MCP 服务器将您的编码工具连接到 ADK 文档。
- [**ADK 文档索引**](#adk-docs-index)：遵循 `llms.txt` 标准的机器可读文档文件。

## Agents CLI {#agents-cli}

[Agents CLI ](https://google.github.io/agents-cli/) 工具集可让您将 ADK Agent 专业知识插入您喜欢的 AI 编码环境，包括 Antigravity、Claude Code、Cursor 及其他 AI 编码工具。将 Agents CLI 安装到您当前的 AI 驱动开发环境中，以便搭建、构建、测试、评估和部署 ADK Agent。通过这些 Agents CLI 技能增强您的开发环境：

*   开发生命周期和编码指南
*   项目脚手架
*   评估方法和评分
*   Agent 运行时、Cloud Run 和 GKE 部署
*   Gemini Enterprise Agent 发布
*   追踪、日志记录及集成
*   Python API 快速参考及文档索引

安装 Agents CLI 并设置 ADK 开发技能：

```bash
uvx google-agents-cli setup
```

有关在开发环境中安装 Agents CLI 并使用它的更多信息，请参见
[Agents CLI 文档](https://google.github.io/agents-cli/)。

## ADK 文档 MCP 服务器 {#adk-docs-mcp-server}

您可以配置您的编码工具，以使用 MCP 服务器搜索和读取 ADK 文档。以下是流行工具的设置说明。

### Antigravity {#antigravity}

要将 ADK 文档 MCP 服务器添加到 [Antigravity](https://antigravity.google/)（需要 [`uv`](https://docs.astral.sh/uv/)）：

1. 通过编辑器 Agent 面板顶部的 **...**（更多）菜单打开 MCP 商店。
2. 点击 **管理 MCP 服务器**，然后点击 **查看原始配置**。
3. 将以下内容添加到 `mcp_config.json`：

    ```json
    {
      "mcpServers": {
        "adk-docs-mcp": {
          "command": "uvx",
          "args": [
            "--from",
            "mcpdoc",
            "--with",
            "mcp<2",
            "mcpdoc",
            "--urls",
            "AgentDevelopmentKit:https://adk.dev/llms.txt",
            "--transport",
            "stdio"
          ]
        }
      }
    }
    ```

### Claude 代码 {#claude-code}

要将 ADK 文档 MCP 服务器添加到 [Claude Code](https://code.claude.com/docs/en/overview):

```bash
claude mcp add adk-docs --transport stdio -- uvx --from mcpdoc --with "mcp<2" mcpdoc --urls AgentDevelopmentKit:https://adk.dev/llms.txt --transport stdio
```

### 光标 {#cursor}

要将 ADK 文档 MCP 服务器添加到 [Cursor](https://cursor.com/)（需要 [`uv`](https://docs.astral.sh/uv/))：

1. 打开 **光标设置**，然后导航到 **工具与 MCP** 标签。
2. 点击 **新建 MCP 服务器**，这将打开 `mcp.json` 进行编辑。
3. 将以下内容添加到 `mcp.json`：

    ```json
    {
      "mcpServers": {
        "adk-docs-mcp": {
          "command": "uvx",
          "args": [
            "--from",
            "mcpdoc",
            "--with",
            "mcp<2",
            "mcpdoc",
            "--urls",
            "AgentDevelopmentKit:https://adk.dev/llms.txt",
            "--transport",
            "stdio"
          ]
        }
      }
    }
    ```

{{% alert context="info" %}}
**MCP 版本设置**

`mcp<2` 约束设置保持 `mcpdoc` 与当前使用的 MCP 1.x FastMCP API 兼容。
{{% /alert %}}
### 其他工具 {#other-tools}

任何支持 MCP 服务器的编码工具都可以使用上面显示的相同服务器配置。根据 Antigravity 或 Cursor 部分的示例 JSON 调整您工具的 MCP 设置。

## ADK 文档索引 {#adk-docs-index}

ADK 文档可作为机器可读文件提供，遵循 [`llms.txt` 标准](https://llmstxt.org/)。这些文件随每次文档更新生成，并始终保持最新。

| 文件 | 描述 | URL |
|------|-------------|-----|
| `llms.txt` | 带链接的文档索引 | [`adk.dev/llms.txt`](https://adk.dev/llms.txt) |
| `llms-full.txt` | 单文件完整文档 | [`adk.dev/llms-full.txt`](https://adk.dev/llms-full.txt) |

---

原文：[Coding with AI](https://adk.dev/tutorials/coding-with-ai/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tutorials/coding-with-ai.md)
