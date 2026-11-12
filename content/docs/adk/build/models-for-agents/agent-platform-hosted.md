---
title: "Agent Platform 托管"
description: "为了企业级的可扩展性、可靠性以及与 Google Cloud MLOps 生态系统的整合，您可以使用部署到 Agent Platform 端点的模型。这包括来自 Model Garden 的模型或您自己微调的模型"
icon: "article"
weight: 40
toc: true
---

为了企业级的可扩展性、可靠性以及与 Google Cloud 的 MLOps 生态系统的集成，您可以使用部署到 Agent 平台端点的模型。这包括来自模型花园的模型或您自己微调的模型。

**集成方法：** 将完整的 Agent 平台端点资源字符串（`projects/PROJECT_ID/locations/LOCATION/endpoints/ENDPOINT_ID`）直接传递给 `LlmAgent` 的 `model` 参数。

## Agent 平台设置 {#agent-platform-setup}

有关连接 ADK Agent 到 Google Cloud 托管模型和服务的更多详细信息，包括 Gemini 企业 Agent 平台，请参阅 [连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/) 指南。

## 模型花园部署 {#model-garden-deployments}

支持版本：Python v0.2.0。

您可以将各种开源和专有模型从 [模型花园](https://console.cloud.google.com/vertex-ai/model-garden) 部署到端点。

**示例：**

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent
from google.genai import types # For config objects

# --- 使用从模型花园部署的 Llama 3 模型的示例 Agent ---

# 请替换为您的实际 Agent 平台端点资源名称
llama3_endpoint = "projects/YOUR_PROJECT_ID/locations/us-central1/endpoints/YOUR_LLAMA3_ENDPOINT_ID"

agent_llama3_vertex = LlmAgent(
    model=llama3_endpoint,
    name="llama3_vertex_agent",
    instruction="You are a helpful assistant based on Llama 3, hosted on Agent Platform.",
    generate_content_config=types.GenerateContentConfig(max_output_tokens=2048),
    # ... 其他 Agent 参数
)
```

{{% /tab %}}
{{< /tabs >}}

## 精调模型端点 {#fine-tuned-model-endpoints}

支持版本：Python v0.2.0。

部署你的精调模型（无论是基于 Gemini 还是 Agent 平台支持的其他架构）会生成一个可直接使用的端点。

**示例：**

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent

# --- 使用微调 Gemini 模型端点的示例 Agent ---

# 替换为您微调模型的端点资源名称
finetuned_gemini_endpoint = "projects/YOUR_PROJECT_ID/locations/us-central1/endpoints/YOUR_FINETUNED_ENDPOINT_ID"

agent_finetuned_gemini = LlmAgent(
    model=finetuned_gemini_endpoint,
    name="finetuned_gemini_agent",
    instruction="You are a specialized assistant trained on specific data.",
    # ... 其他 Agent 参数
)
```

{{% /tab %}}
{{< /tabs >}}

## Agent 平台上的 Anthropic Claude {#anthropic-claude}

支持版本：Python v0.2.0, Go v2.7.0。

一些提供商，如 Anthropic，通过 Agent 平台直接提供其模型。要在 Agent 平台上设置和使用 Claude 模型，包括扩展思考和提示缓存，请参阅 [通过 Agent 平台连接](/docs/adk/build/models-for-agents/claude/#connect-through-agent-platform) 在 Claude 模型指南中。

## Agent 平台上的开放模型 {#open-models}

支持版本：Python v0.1.0。

Agent 平台通过模型即服务（MaaS）提供精选的开源模型，例如 Meta Llama。这些模型可通过托管 API 访问，允许您在无需管理底层基础设施的情况下进行部署和扩展。有关可用选项的完整列表，请参阅 [Agent 平台 MaaS 开放模型](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/maas/use-open-models#open-models) 文档。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

您可以使用 [LiteLLM](https://docs.litellm.ai/) 库来访问 Agent 平台 MaaS 上像 Meta 的 Llama 这样的开放模型。

**集成方法：** 使用 `LiteLlm` 包装类并将其设置为 `model` 的参数。请确保参阅 [ADK Agent 的 LiteLLM 模型连接器](/docs/adk/build/models-for-agents/litellm/#litellm-model-connector-for-adk-agents) 文档，了解如何在 ADK 中使用 LiteLLM。

**设置：**

1. **Agent 平台环境：** 确保综合的 Agent 平台设置（ADC、环境变量、`GOOGLE_GENAI_USE_ENTERPRISE=TRUE`）已完成。

2. **安装 LiteLLM：** ADK 需要 `litellm>=1.84`。

        ```shell
        pip install "litellm>=1.84"
        ```

**示例：**

```python
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- 使用 Meta 的 Llama 4 Scout 的示例 Agent ---
agent_llama_vertexai = LlmAgent(
    model=LiteLlm(model="vertex_ai/meta/llama-4-scout-17b-16e-instruct-maas"), # LiteLLM model string format
    name="llama4_agent",
    instruction="You are a helpful assistant powered by Llama 4 Scout.",
    # ... 其他 Agent 参数
)
```

{{% /tab %}}
{{< /tabs >}}

---

原文：[Agent Platform hosted models for ADK agents](https://adk.dev/agents/models/agent-platform/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/agent-platform.md)
