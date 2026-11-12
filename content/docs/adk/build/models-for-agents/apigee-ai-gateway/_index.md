---
title: "Apigee AI 网关"
description: "Apigee 提供了一个强大的 AI 网关，改变了您管理和治理生成式 AI 模型流量的方式。通过 Apigee Agent 公开您的 AI 模型端点（如 Agent 平台或 Gemini API），您可以立即"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v1.18.0。

[Apigee](https://docs.cloud.google.com/apigee/docs/api-platform/get-started/what-apigee) 提供了一个强大的 [AI Gateway](https://cloud.google.com/solutions/apigee-ai)，
改变了您管理和治理生成型 AI 模型流量的方式。通过
通过 Apigee Agent 公开您的 AI 模型端点（如 Agent 平台或 Gemini API），您可以立即获得企业级功能：

- **模型安全：** 实施像 Model Armor 这样的安全策略以进行威胁防护。

- **流量治理：** 执行速率限制和令牌限制以管理成本并防止滥用。

- **性能：** 使用语义缓存和高级模型路由提高响应时间和效率。

- **监控与可见性：** 对所有 AI 请求进行精细监控、分析和审计。

   `ApigeeLlm` 包装器设计用于与 Agent 平台和 Gemini API（generateContent）一起使用。我们正在不断扩展对其他模型和接口的支持。对于兼容 OpenAI 的模型，包括自托管或其他提供商，请使用 `CompletionsHTTPClient` 通过您的 Apigee Agent 路由流量。

## 实现示例 {#implementation-example}

通过实例化 `ApigeeLlm` 包装器对象并将其传递给 `LlmAgent` 或其他 Agent 类型，将 Apigee 的治理集成到您的 Agent 工作流程。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python

from google.adk.agents import LlmAgent
from google.adk.models.apigee_llm import ApigeeLlm

# 实例化 ApigeeLlm 包装器
model = ApigeeLlm(
    # 指定模型的 Apigee 路由。更多信息，请查看 ApigeeLlm 文档 (https://github.com/google/adk-python/tree/main/contributing/samples/models/hello_world_apigeellm)
    model="apigee/gemini-flash-latest",
    # 您已部署的 Apigee Agent 的 Agent URL，包括基础路径
    proxy_url=f"https://{APIGEE_PROXY_URL}",
    # 传递必要的身份验证/授权头（如 API 密钥）
    custom_headers={"foo": "bar"},
    # 可选：如果 Agent 需要额外的 OAuth 范围，传递 google-auth 凭据
    # credentials=my_credentials
)

# 将配置好的模型包装器传递给您的 LlmAgent
agent = LlmAgent(
    model=model,
    name="my_governed_agent",
    instruction="You are a helpful assistant powered by Gemini and governed by Apigee.",
    # ... 其他 Agent 参数
)
```

{{% /tab %}}
{{< /tabs >}}
通过这种配置，你的 Agent 的每次 API 调用都会先经过 Apigee，在那里会执行所有必要的策略（安全、速率限制、日志记录），然后请求才会安全地转发到底层 AI 模型端点。有关使用 Apigee Agent 的完整代码示例，请参见
[Hello World Apigee LLM](https://github.com/google/adk-python/tree/main/contributing/samples/models/hello_world_apigeellm)。

## 与 OpenAI 的兼容性 {#compatibility-with-openai}

`CompletionsHTTPClient` 是一个通用 HTTP 客户端，旨在与 OpenAI API 格式兼容。它允许你通过期望标准 OpenAI 兼容 `/chat/completions` 端点的 Agent（例如 Apigee）路由请求，而不是使用原生 Gemini 或 Vertex AI 协议。此客户端处理：

- **负载构建**：将 LlmRequest 对象转换为 OpenAI 兼容 API 所需的格式。
- **响应处理**：管理来自 Agent 的流式和非流式响应。
- **可靠性**：使用 `tenacity` 重试非流式请求，但仅在你将 `retry_options=types.HttpRetryOptions(...)` 传递给构造函数时才会重试。默认情况下，每个请求只尝试一次，流式请求从不重试。
- **规范化**：将响应和流式数据块解析为 ADK 框架其余部分期望的标准格式。

### 实现示例 {#implementation-example}

```python

import asyncio
from google.adk.models.apigee_llm import CompletionsHTTPClient
from google.adk.models.llm_request import LlmRequest
from google.genai import types

async def test_client():
    # 1. 初始化客户端
    client = CompletionsHTTPClient(
        base_url="https://your-apigee-proxy-url.com/v1",
        headers={"Authorization": "Bearer YOUR_API_KEY"}
    )

    # 2. 构建最小请求
    request = LlmRequest(
        model="gpt-4o",  # Replace with your target model ID
        contents=[types.Content(role="user", parts=[types.Part.from_text(text="Hello!")])]
    )

    # 3. 执行非流式生成
    async for response in client.generate_content_async(request, stream=False):
        if response.content and response.content.parts:
            print(f"Response: {response.content.parts[0].text}")

if __name__ == "__main__":
    asyncio.run(test_client())
```

---

原文：[Apigee AI Gateway for ADK agents](https://adk.dev/agents/models/apigee/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/apigee.md)
