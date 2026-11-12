---
title: "Gemini"
description: "ADK 支持 Google Gemini 系列生成式 AI 模型，这些模型提供了一套功能强大的模型，具有广泛的功能。ADK 提供对许多 Gemini 功能的支持，包括代码执行、Google 搜索、C"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

ADK 支持 Google Gemini 系列生成式 AI 模型，这些模型提供了一套功能强大的模型和广泛的特性。ADK 提供对许多 Gemini 功能的支持，包括
[代码执行（官方英文）](https://adk.dev/integrations/code-execution/),
[Google 搜索（官方英文）](https://adk.dev/integrations/google-search/),
[上下文缓存 ](/docs/adk/components/agent-context/model-context-caching/),
[计算机使用（官方英文）](https://adk.dev/integrations/computer-use/)
以及 [交互 API ](#interactions-api)。

## 快速入门 {#get-started}

以下代码示例展示了在您的 Agent 中使用 Gemini 模型的基本实现：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent

# --- 使用稳定的 Gemini Flash 模型的示例 ---
agent_gemini_flash = LlmAgent(
    # 使用最新的稳定 Flash 模型标识符
    model="gemini-flash-latest",
    name="gemini_flash_agent",
    instruction="You are a fast and helpful Gemini assistant.",
    # ... 其他 Agent 参数
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/genai"
)

	// --- 使用稳定的 Gemini Flash 模型的示例 ---
	modelFlash, err := gemini.NewModel(ctx, "gemini-2.0-flash", &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("failed to create model: %v", err)
	}
	agentGeminiFlash, err := llmagent.New(llmagent.Config{
		// 使用最新的稳定 Flash 模型标识符
		Model:       modelFlash,
		Name:        "gemini_flash_agent",
		Instruction: "You are a fast and helpful Gemini assistant.",
		// ... 其他 Agent 参数
	})
	if err != nil {
		log.Fatalf("failed to create agent: %v", err)
	}
```

{{% /tab %}}
{{< /tabs >}}
<details>
<summary>注意：双子座模型选择器 `gemini-flash-latest`</summary>

在 ADK 文档中的大多数代码示例中使用 `gemini-flash-latest` 来选择
[最新可用](https://ai.google.dev/gemini-api/docs/models#latest)
双子座 Flash 版本。然而，如果你通过区域端点访问双子座，
例如 `us-central1`，这个选择字符串可能无法使用。在这种情况下，
请使用来自 [双子座模型](https://ai.google.dev/gemini-api/docs/models) 页面或 Google Cloud [双子座模型](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models) 列表的特定模型版本字符串。

</details>

## 双子座模型认证 {#gemini-model-authentication}

当通过服务使用 AI 模型时，例如 Gemini API 或 Google Cloud 上的
t Gemini Enterprise Agent Platform，你必须提供 API 密钥或
通过服务进行认证。提供此信息的最直接方法是使用环境变量或 `.env` 文件。以下示例展示了
配置 Agent 以用于 Gemini API 或 Gemini Enterprise Agent Platform 的最常见方法。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Gemini API" %}}

```
# .env configuration file
GOOGLE_API_KEY="PASTE_YOUR_GEMINI_API_KEY_HERE"
```

{{% /tab %}}
{{% tab tabName="Google Cloud Agent Platform" %}}

```
# .env configuration file
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=location-code        # example: us-central1
GOOGLE_GENAI_USE_ENTERPRISE=True
```

{{% /tab %}}
{{< /tabs >}}
有关将 ADK Agent 连接到 Google Cloud 托管的模型和服务的更多详细信息，包括 Gemini 企业 Agent 平台，请参见 [连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/) 指南。

## 语音和视频流支持 {#voice-and-video-streaming-support}

要在 ADK 中使用语音/视频流，您需要使用支持 Live API 的 Gemini 模型。您可以在文档中找到支持 Gemini Live API 的 **模型 ID(s)**：

- [Google AI Studio: Gemini Live API](https://ai.google.dev/gemini-api/docs/models#live-api)
- [Agent Platform: Gemini Live API](https://cloud.google.com/vertex-ai/generative-ai/docs/live-api)

## Gemini 交互 API {#interactions-api}

支持版本：Python v1.21.0。

Gemini [交互 API](https://ai.google.dev/gemini-api/docs/interactions) 是 ***generateContent*** 推理 API 的替代方案，它提供了有状态的对话能力，允许您使用 `previous_interaction_id` 链接交互，而不是在每次请求时发送完整的对话历史。使用此功能对长对话更加高效。

您可以通过在 Gemini 模型配置中设置 `use_interactions_api=True` 参数来启用交互 API，如以下代码片段所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents.llm_agent import Agent
from google.adk.models.google_llm import Gemini
from google.adk.tools.google_search_tool import GoogleSearchTool

root_agent = Agent(
    model=Gemini(
        model="gemini-flash-latest",
        use_interactions_api=True,  # Enable Interactions API
    ),
    name="interactions_test_agent",
    tools=[
        GoogleSearchTool(bypass_multi_tools_limit=True),  # Converted to function tool
        get_current_weather,  # Custom function tool
    ],
)
```

{{% /tab %}}
{{< /tabs >}}
有关完整代码示例，请参见
[Interactions API sample](https://github.com/google/adk-python/tree/main/contributing/samples/models/interactions_api)。

启用 Interactions API 还可以让您为每次运行选择服务等级。
有关将模型调用排队以在非高峰时段运行的详细信息，请参见
[Deferred scheduling](/docs/adk/build/models-for-agents/gemini/deferred-scheduling/)。

### 已知限制 {#known-limitations}

Interactions API **不**支持将自定义函数调用工具与内置工具混合使用，
例如在同一 Agent 中使用 [Google Search（官方英文）](https://adk.dev/integrations/google-search/) 工具。
您可以通过配置内置工具作为自定义工具并使用 `bypass_multi_tools_limit` 参数来解决此限制：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 使用 bypass_multi_tools_limit=True 将 google_search 转换为函数工具
GoogleSearchTool(bypass_multi_tools_limit=True)
```

{{% /tab %}}
{{< /tabs >}}
在此示例中，此选项将内置的 `google_search` 转换为函数调用工具（通过 `GoogleSearchAgentTool`），从而允许它与自定义函数工具一起工作。

## 故障排除 {#troubleshooting}

### 错误代码 429 - RESOURCE_EXHAUSTED {#error-code-429---resourceexhausted}

此错误通常发生在您的请求数量超过处理请求分配的容量时。

为缓解此问题，您可以采取以下措施之一：

1. 请求您尝试使用的模型的更高配额限制。

2. 启用客户端重试。重试允许客户端在延迟后自动重新尝试请求，这在配额问题是暂时性的情况下可能有所帮助。

    设置重试选项有两种方法：

    **选项 1：** 作为 `generate_content_config` 的一部分在 Agent 上设置重试选项。

    如果您是通过名称字符串传递模型，并让 ADK 为您创建模型适配器，则会使用此选项。

    {{< tabs tabTotal="1" >}}
    {{% tab tabName="Python" %}}

    ```python
    from google.genai import types

    # ...

    root_agent = Agent(
        model='gemini-flash-latest',
        # ...
        generate_content_config=types.GenerateContentConfig(
            # ...
            http_options=types.HttpOptions(
                # ...
                retry_options=types.HttpRetryOptions(initial_delay=1, attempts=2),
                # ...
            ),
            # ...
        ),
    )
    ```

    {{% /tab %}}
    {{< /tabs >}}
    **选项 2:** 在此模型适配器上重试选项。

    如果您自己实例化适配器实例，则会使用此选项。

    {{< tabs tabTotal="1" >}}
    {{% tab tabName="Python" %}}

    ```python
    from google.genai import types

    # ...

    agent = Agent(
        model=Gemini(
        retry_options=types.HttpRetryOptions(initial_delay=1, attempts=2),
        )
    )
    ```

    {{% /tab %}}
    {{< /tabs >}}

---

原文：[Google Gemini models for ADK agents](https://adk.dev/agents/models/google-gemini/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/google-gemini/index.md)
