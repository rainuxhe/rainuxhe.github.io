---
title: "OpenAI"
description: "您可以使用带有 ADK 的 OpenAI 模型。您如何连接取决于所用的语言："
icon: "article"
weight: 70
toc: true
---

支持版本：Go v2.1.0。

你可以使用 ADK 来访问 OpenAI 模型。连接方式取决于使用的编程语言：

- **Go — 原生支持：** ADK Go 提供了一个直接的 `openaimodel` 包，它实现了 `model.LLM` 接口，目标是 OpenAI Responses API 或 [Chat Completions API](#chat-completions-api)。 [入门指南](#get-started)。
- **Python — 通过 LiteLLM：** ADK Python 通过 LiteLLM 连接器访问 OpenAI 模型（以及许多其他提供商）。请参见 [LiteLLM](/docs/adk/build/models-for-agents/litellm/)。
- **Kotlin — 原生支持：** ADK Kotlin 在 `com.google.adk.kt.models.openai` 中提供了 `ChatCompletions` 模型，目标是 OpenAI Chat Completions API。 [入门指南](#get-started)。

{{% alert context="default" %}}
**在 Go 中为实验性**

在 ADK Go 中，OpenAI 模型支持功能是实验性的。它可能存在限制，且行为可能会发生变化。
{{% /alert %}}
## 入门指南 {#get-started}

`openaimodel` 包提供了一个用于与 OpenAI API 交互的客户端。它实现了 `model.LLM` 接口，并默认使用 OpenAI Responses API，或者在 `ClientConfig.API` 选择时使用 [Chat Completions API](#chat-completions-api)。
以下代码示例展示了在你的 Agent 中使用 OpenAI 模型的基本实现：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Go" %}}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Responses API" %}}

```go
import (
	"context"
	"log"

	"github.com/openai/openai-go/v3"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/openaimodel"
)

// 实例化模型
llm, err := openaimodel.NewModel(context.Background(), openai.ChatModelGPT4oMini, &openaimodel.ClientConfig{})
if err != nil {
  log.Fatal(err)
}

// 创建 Agent
agent, err := llmagent.New(llmagent.Config{
  Name:        "openai_agent",
  Model:       llm,
  Instruction: "You are a helpful AI assistant.",
})
if err != nil {
  log.Fatal(err)
}
```

对于完整的可运行示例，请参阅 ADK Go 仓库中的 [examples/openai/responses/](https://github.com/google/adk-go/tree/main/examples/openai/responses)。
{{% /tab %}}
{{% tab tabName="Chat Completions API" %}}

需要 ADK Go v2.5.0 或更高版本。

```go
import (
	"context"
	"log"
	"os"

	"github.com/openai/openai-go/v3"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/openaimodel"
)

// 在聊天完成 API 上实例化模型
llm, err := openaimodel.NewModel(context.Background(), openai.ChatModelGPT4oMini, &openaimodel.ClientConfig{
  APIKey: os.Getenv("OPENAI_API_KEY"),
  API:    openaimodel.APIChatCompletions,
})
if err != nil {
  log.Fatal(err)
}

// 创建 Agent
agent, err := llmagent.New(llmagent.Config{
  Name:        "openai_agent",
  Model:       llm,
  Instruction: "You are a helpful AI assistant.",
})
if err != nil {
  log.Fatal(err)
}
```

要获取完整的可运行示例，请参见 ADK Go 仓库中的 [examples/openai/completions/](https://github.com/google/adk-go/tree/main/examples/openai/completions)。
{{% /tab %}}
{{< /tabs >}}
{{% /tab %}}
{{< /tabs >}}
## 聊天完成 API {#chat-completions-api}

支持版本：Go v2.5.0。

默认情况下，`openaimodel` 会向 OpenAI 发送请求
[Responses API ](https://platform.openai.com/docs/api-reference/responses)
(`POST /v1/responses`)。几乎每个与 OpenAI 兼容的提供商都会实现
[聊天完成 API ](https://platform.openai.com/docs/api-reference/chat)
(`POST /v1/chat/completions`)，有些只实现这一个。要使用它，请将
`ClientConfig` 的 `API` 字段设置为 `openaimodel.APIChatCompletions`，如
[入门指南 ](#get-started) 的 Chat Completions API 标签所示。Agent、工具
和 Runner 在任一 API 下的工作方式相同。

{{% alert context="warning" %}}
**设置其他提供商的 API 密钥**

要访问其他与 OpenAI 兼容的提供商，请将 `BaseURL` 设置为其端点，
`APIKey` 设置为其密钥。当 `APIKey` 为空时，`openai-go`
SDK 会回退到 `OPENAI_API_KEY` 环境变量，并将该密钥发送到 `BaseURL`。
{{% /alert %}}
这两个 API 支持相同的功能，但存在以下差异：

- **生成设置：** `StopSequences`、`FrequencyPenalty`、`PresencePenalty` 和 `Seed` 会发送到聊天完成 API。Responses API 没有等效字段，发送这些字段会返回错误。
- **推理输出：** 聊天完成 API 不返回推理文本，因此响应中不包含思考部分，`ThinkingConfig.IncludeThoughts` 会被忽略。推理努力和推理令牌计数在两种 API 下都有效。
- **输出令牌限制：** `MaxOutputTokens` 作为 `max_completion_tokens` 发送。一些兼容服务器只承认旧的 `max_tokens` 字段，因此在这些服务器上限制无效。

## 支持的功能 {#supported-features}

- 文本生成（流式和非流式）
- 函数（工具）调用
- 通过 `OutputSchema` (JSON schema) 实现结构化输出
- 推理模型（如 o 系列），包括推理令牌统计
- 令牌 logprobs

## 限制 {#limitations}

- **仅限文本** — 不支持多模态输入（图像、音频、文件）。
- **仅限函数工具** — 不支持内置工具（谷歌搜索、代码执行等）。
- **结构化输出使用 OpenAI 严格模式** — `OutputSchema` 中声明的每个字段都被视为必填。
- 一些 `GenerateContentConfig` 选项会返回错误，而不是静默忽略：`TopK`、多候选、请求标签和安全设置。Responses API 也会拒绝 stop 序列、频次/出现率惩罚以及种子，而 [聊天完成 API ](#chat-completions-api) 支持。

## 配置选项 {#configuration-options}

`ClientConfig` 提供了多个配置客户端的选项：- `APIKey`：您的 OpenAI API 密钥。
- `BaseURL`：自定义端点 URL，对于与 OpenAI 兼容的端点可能非常有用。
- `HTTPClient`：一个自定义的 `*http.Client`。
- `Options`：高级 `openai-go` 请求选项（`[]option.RequestOption`）。
- `API`：要调用的 OpenAI API：`openaimodel.APIResponses`（默认）或 `openaimodel.APIChatCompletions`。请参见 [聊天补全 API](#chat-completions-api)。

如果 `APIKey` 或 `BaseURL` 留空，它们将自动回退到 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL` 环境变量，由底层 `openai-go` SDK 的默认行为处理。

## OpenAI 模型认证 {#openai-model-authentication}

在使用 OpenAI 模型时，您必须提供 API 密钥以对 OpenAI API 进行身份验证。提供此信息的最直接方式是使用环境变量或 `.env` 文件。

`openaimodel` 软件包同样通过配置基础 URL 支持与 OpenAI 兼容的端点（例如通过 Ollama、LM Studio 或 vLLM 提供的本地模型）。如果端点不提供 Responses API，还请将 `API` 设置为 `openaimodel.APIChatCompletions`，如 [聊天补全 API](#chat-completions-api) 所述。

{{< tabs tabTotal="2" >}}
{{% tab tabName="OpenAI API" %}}

```bash
# .env configuration file
OPENAI_API_KEY="PASTE_YOUR_OPENAI_API_KEY_HERE"
```

{{% /tab %}}
{{% tab tabName="OpenAI-compatible Endpoint" %}}

```bash
# .env configuration file
OPENAI_API_KEY="api-key-if-required"
OPENAI_BASE_URL="http://localhost:11434/v1" # example: local Ollama endpoint
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[OpenAI models for ADK agents](https://adk.dev/agents/models/openai/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/openai.md)
