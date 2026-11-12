---
title: "工具限制"
description: "一些 ADK 工具有可能影响你在 Agent 工作流程中实现它们的限制。此页面列出了这些工具限制以及可用的解决方法（如果有）。"
icon: "article"
weight: 50
toc: true
---

某些 ADK 工具存在限制，这可能会影响你在 Agent 工作流中实现它们的方式。本页列出了这些工具的限制及可用的解决方法（如果有）。

## 每个 Agent 只能使用一个工具的限制 {#one-tool-one-agent}

{{% alert context="info" %}}
**ADK Python：内置搜索解决方法为可选**

ADK Python v1.16.0 及更高版本可以绕过 Google 搜索和 Agent 搜索工具的此限制，但默认情况下不启用。你必须使用 `bypass_multi_tools_limit=True` 自行构建工具；从 `google.adk.tools` 导出的共享 `google_search` 实例未启用该标志。请参见下面的解决方法 #2。
{{% /alert %}}
通常，你可以在一个 Agent 中使用多个工具，但在一个 Agent 中使用特定工具会排除使用该 Agent 中的任何其他工具。以下 ADK 工具只能单独使用，不能在单个 Agent 对象中与其他工具一起使用：

* [代码执行（官方英文）](https://adk.dev/integrations/code-execution/) 与 Gemini API （注意：TypeScript 中需使用 Gemini 2.0，且不存在此限制）
* [Google 搜索（官方英文）](https://adk.dev/integrations/google-search/) 与 Gemini API （注意：仅对 TypeScript 中的 Gemini 1.x 模型适用此限制）
* [Agent 搜索（官方英文）](https://adk.dev/integrations/agent-search/) （注意：TypeScript 中当前不可用）

例如，以下在单个 Agent 中同时使用这些工具之一和其他工具的方法是 ***不受支持的***：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py
root_agent = Agent(
    name="RootAgent",
    model="gemini-flash-latest",
    description="Code Agent",
    tools=[custom_function],
    code_executor=BuiltInCodeExecutor() # <-- NOT supported when used with tools
)
```

{{% /tab %}}
{{< /tabs >}}

### 解决方法 #1：将 Agent 封装到 AgentTool 中 {#workaround-1-wrap-the-agent-in-an-agenttool}

支持版本：Python。

以下代码示例演示了如何使用多个内置工具，或如何通过使用多个 Agent 将内置工具与其他工具结合使用：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.tools.agent_tool import AgentTool
from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.code_executors import BuiltInCodeExecutor

search_agent = Agent(
    model='gemini-flash-latest',
    name='SearchAgent',
    instruction="""
    You're a specialist in Google Search
    """,
    tools=[google_search],
)
coding_agent = Agent(
    model='gemini-flash-latest',
    name='CodeAgent',
    instruction="""
    You're a specialist in Code Execution
    """,
    code_executor=BuiltInCodeExecutor(),
)
root_agent = Agent(
    name="RootAgent",
    model="gemini-flash-latest",
    description="Root Agent",
    tools=[AgentTool(agent=search_agent), AgentTool(agent=coding_agent)],
)
```

{{% /tab %}}
{{< /tabs >}}
在 ADK Python 中，`AgentTool` 不会将封装 Agent 的基础元数据传回调用 Agent。在
`AgentTool` 上设置 `propagate_grounding_metadata=True`，以便将该元数据存储在会话状态中，
键为 `temp:_adk_grounding_metadata`。ADK 仅在父 Agent 拥有名为 `google_search_agent` 的工具时，
才会将其附加到父 Agent 自己的响应中，而下文的解决方法 #2 将为你创建该工具。

### 解决方法 #2：bypass_multi_tools_limit {#workaround-2-bypassmultitoolslimit}

支持版本：Python。

ADK Python 内置了一个解决方法，可以绕过 `GoogleSearchTool` 和 `VertexAiSearchTool` 的限制（使用 `bypass_multi_tools_limit=True` 启用），如示例 Agent 中所示：
[built_in_multi_tools](https://github.com/google/adk-python/tree/main/contributing/samples/tools/built_in_multi_tools).

在你自己构造的工具实例上设置标志，例如 `GoogleSearchTool(bypass_multi_tools_limit=True)`（从 `google.adk.tools.google_search_tool` 导入）。从 `google.adk.tools` 导出的共享 `google_search` 实例未设置该标志。当 Agent 在其
`tools` 列表中有多个条目或可以将控制权转移给另一个 Agent 时，该绕过方法生效。

{{% alert context="warning" %}}

内置工具不能在子 Agent 中使用。在 ADK Python 中，`GoogleSearchTool` 和 `VertexAiSearchTool` 只有在子 Agent 使用 `bypass_multi_tools_limit=True` 构造该工具时才是例外。
{{% /alert %}}
例如，以下在子 Agent 中使用内置工具的方法 **不被支持**：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```py
url_context_agent = Agent(
    model='gemini-flash-latest',
    name='UrlContextAgent',
    instruction="""
    You're a specialist in URL Context
    """,
    tools=[url_context],
)
coding_agent = Agent(
    model='gemini-flash-latest',
    name='CodeAgent',
    instruction="""
    You're a specialist in Code Execution
    """,
    code_executor=BuiltInCodeExecutor(),
)
root_agent = Agent(
    name="RootAgent",
    model="gemini-flash-latest",
    description="Root Agent",
    sub_agents=[
        url_context_agent,
        coding_agent
    ],
)
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[Limitations for ADK tools](https://adk.dev/tools/limitations/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools/limitations.md)
