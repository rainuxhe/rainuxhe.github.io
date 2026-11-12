---
title: "Claude"
description: "你可以将Anthropic的Claude模型用作你的 Agent Development Kit (ADK)Agent 的模型。该框架提供Claude模型类，将 ADK 请求、工具和响应转换为对Claude的调用，因此你可以"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0，Go v2.7.0。

您可以使用Anthropic的Claude模型作为您的 Agent Development Kit（ADK）Agent 的模型。该框架提供Claude模型类，将 ADK 请求、工具和响应转换为对Claude的调用，因此您可以像构建GeminiAgent 一样构建ClaudeAgent，使您能够：

- 在Claude上运行 Agent，同时保持您的 ADK 工具、会话和回调不变。
- 在一个多 Agent 系统中结合Claude和GeminiAgent，并根据每个 Agent 的任务选择模型。
- 在处理复杂任务时，通过延长思考时间给予Claude更多推理时间。

您可以通过**Anthropic API**（使用Anthropic API 密钥）或**Google Cloud**（使用您的 Google Cloud项目和凭据）访问Claude。如需选择帮助，请参见[选择后端](#choose-a-backend)。

## 快速开始 {#get-started}

以下示例创建一个通过Anthropic API 调用Claude的 Agent。在运行它们之前，请从[Anthropic Console](https://console.anthropic.com/)获取 API 密钥，并将其设置为环境变量。在生产环境中，请将密钥存储在秘密管理器中，而不是源代码或shell历史中：

```shell
export ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
```

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 Anthropic SDK 安装 ADK：

```shell
pip install "google-adk[extensions]"
```

创建一个 `AnthropicLlm` 实例并将其传递给你的 Agent。它从 `ANTHROPIC_API_KEY` 环境变量读取你的 API 密钥。`AnthropicLlm` 类在 ADK Python v1.20.0 及更高版本中可用。

```python
from google.adk.agents import LlmAgent
from google.adk.models.anthropic_llm import AnthropicLlm

root_agent = LlmAgent(
    name="claude_agent",
    model=AnthropicLlm(model="claude-sonnet-4-6"),
    instruction="You are a helpful assistant.",
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

{{% alert context="default" %}}
**实验性**

`anthropicmodel` 软件包是实验性的。其 API 和行为可能有
局限性，不建议用于生产环境。
{{% /alert %}}
使用 `anthropicmodel.NewModel` 创建一个模型并将其传递给您的 Agent。
当 `APIKey` 为空时，模型会从
`ANTHROPIC_API_KEY` 环境变量读取您的密钥。

```go
import (
	"context"
	"log"

	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/anthropicmodel"
)

llm, err := anthropicmodel.NewModel(context.Background(), "claude-sonnet-4-6", anthropicmodel.ClientConfig{
	Backend: anthropicmodel.BackendAnthropic,
})
if err != nil {
	log.Fatal(err)
}

agent, err := llmagent.New(llmagent.Config{
	Name:        "claude_agent",
	Model:       llm,
	Instruction: "You are a helpful assistant.",
})
if err != nil {
	log.Fatal(err)
}
```

关于完整且可运行的样本，请参见
[示例/人格/](https://github.com/google/adk-go/tree/main/examples/anthropic)
在 ADK Go 仓库中。
{{% /tab %}}
{{< /tabs >}}

## 选择后端 {#choose-a-backend}

根据你管理的计费、访问和配额选择后端：

- **Anthropic API：** 如果你已经有 Anthropic，可以使用这个后端
    账号并管理Claude的使用。你用Anthropic认证
    API 密钥。
- **Google Cloud：** 如果你的应用运行，可以使用这个后端
    在 Google Cloud 上，或者你希望 Claude 的使用由你的 Google Cloud 管理
    项目的IAM权限、配额和计费。你
    用应用默认凭据（ADC）认证，你就不会
    管理一个独立的 API 密钥。

下表展示了每种语言如何选择后端：

|语言 |人类 API |Agent 平台 |
|:--------- |:-------------------------------------------------- |:------------------------------------------------------------------- |
|Python |`AnthropicLlm`实例 |`Claude`实例，或`claude-*`模型字符串 |
|TypeScript |不支持 |`Claude`实例，或注册后`claude-*`字符串 `Claude` |
|开始 |`ClientConfig.Backend` 设置为`BackendAnthropic` |`ClientConfig.Backend` 设置为`BackendVertex` |
|Java |`Claude` 带有 API 密钥的 `AnthropicClient` |`Claude` 使用 `VertexBackend` 的 `AnthropicClient` |
|科特林 |`Claude(name, apiKey)` |`Claude(name, vertexCredentials)` |

{{% alert context="warning" %}}
**Python 模型字符串使用 Google Cloud Agent Platform**

在 Python 中，裸`claude-*`模型字符串，例如
`model="claude-sonnet-4-6"`，指向 Agent 平台后端的路由和
需要 Google Cloud 项目设置。使用 Anthropic API 来自
Python，传递一个`AnthropicLlm`实例而不是字符串。
{{% /alert %}}

## 通过谷歌云连接 {#connect-through-google-cloud}

要通过 Google Cloud使用Claude，请先搭建你的 Google Cloud环境：

1. 启用你想在 中的 Claude 模型
    [模型花园](https://console.cloud.google.com/vertex-ai/model-garden)
    用于你的谷歌云项目。
2. 设置应用默认凭证：

    ```shell
    gcloud auth application-default login
    ```

3. 设置您的项目和模型可用的区域，例如 `global` 或 `us-east5`：

    ```shell
    export GOOGLE_CLOUD_PROJECT="your-project-id"
    export GOOGLE_CLOUD_LOCATION="global"
    ```

有关将 ADK 连接到 Google Cloud 的详细信息，请参见
[连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/)。

以下示例创建一个通过 Google Cloud 调用 Claude 的 Agent：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

将 Claude 模型字符串传递给您的 Agent。ADK 将 `claude-*` 字符串路由到 `Claude` 类，该类读取 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION`。

```python
from google.adk.agents import LlmAgent

root_agent = LlmAgent(
    name="claude_agent",
    model="claude-sonnet-4-6",
    instruction="You are a helpful assistant.",
)
```

ADK Python v2.9.0 及更高版本会将每个 `claude-*` 型号字符串路由到 `Claude`。在较早的版本中，如果 ADK 无法识别型号字符串，请改为传递一个实例：`model=Claude(model="claude-sonnet-4-6")`，并从 `google.adk.models` 导入 `Claude`。
{{% /tab %}}
{{% tab tabName="Go" %}}

将 `Backend` 设置为 `BackendVertex`。当 `Project` 和 `Location` 为空时，模型会读取 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION`，并使用 ADC 进行凭证验证。

```go
llm, err := anthropicmodel.NewModel(ctx, "claude-sonnet-4-6", anthropicmodel.ClientConfig{
	Backend: anthropicmodel.BackendVertex,
})
if err != nil {
	log.Fatal(err)
}
```

{{% /tab %}}
{{< /tabs >}}

## 配置扩展思维 {#configure-extended-thinking}

支持版本：Python v1.34.0, Go v2.7.0。

扩展思维让 Claude 在回应之前先对问题进行推理，这对于多步骤任务（如规划、分析和工具选择）很有帮助。你可以通过标准思维配置的 `thinking_budget` 字段来配置它：

| `thinking_budget` | 行为 |
| :--- | :--- |
| 负面的，例如 `-1` | **自适应思维。** Claude 对每个请求选择推理的深度。 |
| `0` | **无思维。** Claude 在没有扩展思维的情况下回应。 |
| 正面的 | **手动思维。** Claude 使用最多这么多令牌进行推理。有关最小和最大预算，请参见 Anthropic 的扩展思维文档。 |

除非需要固定的令牌预算，否则使用自适应思维。一些较新的 Claude 模型只接受自适应思维；请参见你使用的模型的 Anthropic 扩展思维文档。设置思维配置时，必须设置 `thinking_budget` 值。

要控制 Claude 花费多少推理努力，请设置 **effort** 等级：`low`、`medium`、`high`、`xhigh` 或 `max`。Claude 不支持标准的 `thinking_level` 设置；请改用 effort。在思维或 effort 激活时，ADK 不会向 Claude 发送 `temperature`、`top_p` 或 `top_k`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 `AnthropicGenerateContentConfig` 上设置 `effort`，该功能在 ADK Python v2.4.0 及更高版本中可用：

```python
from google.adk.agents import LlmAgent
from google.adk.models import AnthropicGenerateContentConfig
from google.genai import types

root_agent = LlmAgent(
    name="claude_reasoning_agent",
    model="claude-sonnet-4-6",
    instruction="You are a helpful assistant.",
    generate_content_config=AnthropicGenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=-1),
        effort="high",
    ),
)
```

在 `AnthropicGenerateContentConfig` 上设置 `thinking_level` 会引发验证错误。在普通 `types.GenerateContentConfig` 上，ADK 会忽略它并记录警告。
{{% /tab %}}
{{% tab tabName="Go" %}}

在 Agent 的 `GenerateContentConfig` 上设置思考预算，在模型的 `ClientConfig` 上设置努力水平：

```go
llm, err := anthropicmodel.NewModel(ctx, "claude-sonnet-4-6", anthropicmodel.ClientConfig{
	Effort: anthropicmodel.EffortHigh,
})
if err != nil {
	log.Fatal(err)
}

agent, err := llmagent.New(llmagent.Config{
	Name:        "claude_reasoning_agent",
	Model:       llm,
	Instruction: "You are a helpful assistant.",
	GenerateContentConfig: &genai.GenerateContentConfig{
		ThinkingConfig: &genai.ThinkingConfig{ThinkingBudget: genai.Ptr[int32（官方英文）](https://adk.dev/agents/models/-1/)},
	},
})
```

{{% /tab %}}
{{< /tabs >}}
ADK 将 Claude 的推理以思考部分的形式返回在响应中，并在一次对话中的工具调用之间保留思考块及其签名，正如 Anthropic API 所要求的。

## 高级应用 {#advanced-applications}

ADK 支持 Anthropic 模型的一些高级用法，包括提示缓存以及通过 LiteLLM 库访问模型。

### 缓存提示 {#cache-prompts}

支持版本：Python v2.8.0，Go v2.7.0。

具有长指令或许多工具的 Agent 在每次请求时都会发送相同的提示前缀。Claude 提示缓存会存储该前缀，以便后续请求重复使用，从而可以降低成本和延迟。ADK 会在工具声明、系统指令以及最新的对话内容上设置缓存断点。

Anthropic 支持 5 分钟的缓存期限，这是默认值，也支持 1 小时缓存期限。当对同一 Agent 的请求通常间隔超过 5 分钟时，请使用 1 小时的缓存期限。更多信息，请参见 Anthropic 的 [提示缓存](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) 文档]。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在您的 `App` 上设置 `ContextCacheConfig`。`ttl_seconds` 值为 3600 或更大时选择 1 小时缓存。更多关于此配置的信息，请参见 [上下文缓存](/docs/adk/components/agent-context/model-context-caching/)。

```python
from google.adk.agents.context_cache_config import ContextCacheConfig
from google.adk.apps.app import App

app = App(
    name="claude_caching_app",
    root_agent=root_agent,
    context_cache_config=ContextCacheConfig(
        min_tokens=2048,  # Skip caching for short prompts.
        ttl_seconds=600,
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在模型的 `ClientConfig` 上设置 `PromptCache`。将 `TTL` 设置为 `PromptCacheTTL1h` 以选择 1 小时缓存。

```go
llm, err := anthropicmodel.NewModel(ctx, "claude-sonnet-4-6", anthropicmodel.ClientConfig{
	PromptCache: &anthropicmodel.PromptCacheConfig{TTL: anthropicmodel.PromptCacheTTL5m},
})
```

{{% /tab %}}
{{< /tabs >}}

### 通过LiteLLM 使用Claude {#use-claude-through-litellm}

在 Python 中，你也可以通过 `LiteLlm` 连接器访问 Claude
`anthropic/` model string。如果你的应用已经有路由，就用这条路径
通过LiteLLM 进行模型。关于设置，请参见
[LiteLLM](/docs/adk/build/models-for-agents/litellm/#anthropic-thinking-blocks)。

## 配置选项 {#configuration-options}

Claude 模型类接受以下选项：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

这些选项适用于`AnthropicLlm`和`Claude`。

|选项 |类型 |默认 |描述 |
|:--- |:--- |:--- |:--- |
|`model` |`str` |`"claude-sonnet-4-20250514"`（`AnthropicLlm`），`"claude-3-5-sonnet-v2@20241022"`（`Claude`）|Claude型号ID。|
|`max_tokens` |`int` |`8192` |当请求设置无`max_output_tokens`时，最大输出令牌。|
|`client` |`AsyncAnthropic` 或 `AsyncAnthropicVertex` |`None` |一个预配置的 Anthropic 客户端。`Claude` 类需要一个`AsyncAnthropicVertex`客户端。|
{{% /tab %}}
{{% tab tabName="Go" %}}

精选`ClientConfig`领域：

|选项 |类型 |默认 |描述 |
|:--- |:--- |:--- |:--- |
|`Backend` |`Backend` |`BackendAnthropic` |发球后端：`BackendAnthropic`或`BackendVertex`。|
|`APIKey` |`string` |`ANTHROPIC_API_KEY` |`BackendAnthropic` 的 Anthropic API 密钥。|
|`Project` |`string` |`GOOGLE_CLOUD_PROJECT` |谷歌云项目 for `BackendVertex`。|
|`Location` |`string` |`GOOGLE_CLOUD_LOCATION` |谷歌云区域`BackendVertex`。|
|`MaxTokens` |`int` |`8192` |当请求设置无`MaxOutputTokens`时，最大输出令牌。|
|`MaxRetries` |`*int` |`2` |Anthropic SDK 对失败请求的重试次数。|
|`Effort` |`Effort` |模型默认 |推理努力程度。|
|`PromptCache` |`*PromptCacheConfig` |`nil` |设置时启用提示缓存。|

完整列表请参见
[`anthropicmodel`包参考](https://pkg.go.dev/google.golang.org/adk/v2/model/anthropicmodel)。
{{% /tab %}}
{{< /tabs >}}

## 局限性 {#limitations}

- **Live API：** Claude 模型不支持 ADK 双向流
    即 Live API。
- **TypeScript：** `Claude` 类返回完整的响应，且
    流式传输，并接受文本、函数调用和函数响应部分
    仅此而已。完整列表请参见
    [Claude 积分指南](https://github.com/google/adk-js/blob/main/docs/guides/integrations/models/anthropic_llm/index.md#limitations)。

## 下一步- [Agent 平台托管模型](/docs/adk/build/models-for-agents/agent-platform-hosted/)：使用其他 {#next-steps}
    部署在 Agent 平台上的模型。
- [LiteLLM](/docs/adk/build/models-for-agents/litellm/)：连接其他模型
    提供者。
- [上下文缓存](/docs/adk/components/agent-context/model-context-caching/)：了解更多关于缓存设置的信息。

---

原文：[Use Anthropic Claude models with ADK](https://adk.dev/agents/models/anthropic/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/anthropic.md)
