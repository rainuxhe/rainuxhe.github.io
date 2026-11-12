---
title: "Gemma"
description: "ADK Agent 可以使用谷歌 Gemma 系列生成式 AI 模型，这些模型提供广泛的功能。ADK 支持许多 Gemma 功能，包括工具调用和结构化输出。"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0。

ADK Agent 可以使用 [Google Gemma](https://ai.google.dev/gemma/docs) 系列生成式 AI 模型，这些模型提供了广泛的功能。ADK 支持许多 Gemma 功能，包括 [Tool Calling](/docs/adk/components/custom-tools/) 和 [Structured Output](/docs/adk/build/agents/simple-agents/#data-handling)。

您可以通过 [Gemini API](https://ai.google.dev/gemini-api/docs) 使用 Gemma 4，或者在 Google Cloud 上使用多种自托管选项之一：[Agent Platform](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemma4)、[Google Kubernetes Engine](https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/serve-gemma-gpu-vllm)、[Cloud Run](https://docs.cloud.google.com/run/docs/run-gemma-on-cloud-run)。

Gemma 3 需要与下面的 Gemma 4 示例不同的模型类。它不支持原生函数调用或系统指令，因此 ADK 在专用类中提供了解决方法：Gemini API 使用 `Gemma(model="gemma-3-27b-it")`，Ollama 使用 `Gemma3Ollama()`，均来自 `google.adk.models`。仅当安装了 [LiteLLM](/docs/adk/build/models-for-agents/litellm/)（`litellm>=1.84`）时，`Gemma3Ollama` 才会被定义。

## Gemini API 示例 {#gemini-api-example}

在 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建一个 API 密钥。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
# 将 GEMINI_API_KEY 环境变量设置为你的 API 密钥
# export GEMINI_API_KEY="YOUR_API_KEY"

from google.adk.agents import LlmAgent
from google.adk.models import Gemini

# 简单的尝试工具
def get_weather(location: str) -> str:
    return f"Location: {location}. Weather: sunny, 76 degrees Fahrenheit, 8 mph wind."

root_agent = LlmAgent(
    model=Gemini(model="gemma-4-31b-it"),
    name="weather_agent",
    instruction="You are a helpful assistant that can provide current weather.",
    tools=[get_weather]
)
```

{{% /tab %}}
{{< /tabs >}}

## vLLM 示例 {#vllm-example}

要在这些服务中访问 Gemma 4 端点，
你可以通过 Python 的 [LiteLLM](/docs/adk/build/models-for-agents/litellm/) 库使用 vLLM 模型，
也可以通过 Java 的 [LangChain4j](https://docs.langchain4j.dev/) 使用。

以下示例展示了如何将 Gemma 4 vLLM 端点与 ADK Agent 一起使用。

### 设置 {#setup}

1. **部署模型：** 使用以下方式部署你选择的模型
    [Agent Platform](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemma4)、
    [Google Kubernetes Engine](https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/serve-gemma-gpu-vllm) 或
    [Cloud Run](https://docs.cloud.google.com/run/docs/run-gemma-on-cloud-run)，
    并使用其兼容 OpenAI 的 API 端点。
    注意 API 基础 URL 包括 `/v1`（例如 `https://your-vllm-endpoint.run.app/v1`）。
    * *ADK 工具注意事项:* 部署时确保
        服务工具支持并启用兼容的工具/函数调用和推理解析器。
2. **认证：** 确定你的端点如何处理认证（例如，
   API 密钥、Bearer 令牌）。

### 代码 {#code}

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import subprocess
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- 使用托管在 vLLM 端点上的模型的示例 Agent ---

# 由您的模型部署提供的端点 URL
api_base_url = "https://your-vllm-endpoint.run.app/v1"

# 在 *您的* vLLM 端点配置中识别的模型名称
model_name_at_endpoint = "openai/google/gemma-4-31B-it"

# 简单的尝试工具
def get_weather(location: str) -> str:
    return f"Location: {location}. Weather: sunny, 76 degrees Fahrenheit, 8 mph wind."

# 身份验证（示例：针对 Cloud Run 部署使用 gcloud 身份令牌）
# 根据您的端点安全性进行调整
try:
    gcloud_token = subprocess.check_output(
        ["gcloud", "auth", "print-identity-token", "-q"]
    ).decode().strip()
    auth_headers = {"Authorization": f"Bearer {gcloud_token}"}
except Exception as e:
    print(f"Warning: Could not get gcloud token - {e}.")
    auth_headers = None # Or handle error appropriately

root_agent = LlmAgent(
    model=LiteLlm(
        model=model_name_at_endpoint,
        api_base=api_base_url,
        # 如有需要，传递身份验证请求头
        extra_headers=auth_headers,
        # 或者，如果端点使用 API 密钥：
        # api_key="YOUR_ENDPOINT_API_KEY"
        extra_body={
            "chat_template_kwargs": {
                "enable_thinking": True # Enable thinking
            },
            "skip_special_tokens": False # Should be set to False
        },
    ),
    name="weather_agent",
    instruction="You are a helpful assistant that can provide current weather.",
    tools=[get_weather] # Tools!
)
```

{{% /tab %}}
{{< /tabs >}}

## 使用 Gemma 4、ADK 和 Google 地图 MCP 构建美食游 Agent {#build-a-food-tour-agent-with-gemma-4-adk-and-google-maps-mcp}
此示例展示了如何使用 Gemma 4、ADK 以及 Google 地图 MCP 服务器构建个性化美食游 Agent。该 Agent 会根据用户的菜品照片或文字描述、地点以及可选的预算，推荐就餐地点并将其组织成步行路线。

### 前提条件 {#prerequisites}

- 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取 API 密钥。
  将 `GEMINI_API_KEY` 环境变量设置为您的 Gemini API 密钥。
- 在 Google Cloud Console 上启用 [Google Maps API](https://console.cloud.google.com/maps-api/)。
- 创建 [Google 地图平台 API 密钥](https://console.cloud.google.com/maps-api/credentials)。
  将 `MAPS_API_KEY` 环境变量设置为您的 API 密钥。
- 安装 ADK 并在您的 Python 环境中配置它，或者在 Java 项目中配置 Java 依赖项。

### 项目结构 {#project-structure}

```bash
food_tour_app/
├── __init__.py
└── agent.py
```

`agent.py`

```python
import os
import dotenv
from google.adk.agents import LlmAgent
from google.adk.models import Gemini
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

dotenv.load_dotenv()

system_instruction = """
You are an expert personalized food tour guide.
Your goal is to build a culinary tour based on the user's inputs: a photo of a dish (or a text description), a location, and a budget.

Follow these 4 rigorous steps:
1. **Identify the Cuisine/Dish:** Analyze the user's provided description or image URL to determine the primary cuisine or specific dish.
2. **Find the Best Spots:** Use the `search_places` tool to find highly rated restaurants, stalls, or cafes serving that cuisine/dish in the user's specified location.
   **CRITICAL RULE FOR PLACES:** `search_places` returns AI-generated place data summaries along with `place_id`, latitude/longitude coordinates, and map links for each place, but may lack a direct, explicit name field. You must carefully associate each described place to its provided `place_id` or `lat_lng`.
3. **Build the Route:** Use the `compute_routes` tool to structure a walking-optimized route between the selected spots.
   **CRITICAL ROUTING RULE:** To avoid hallucinating, you MUST provide the `origin` and `destination` using the exact `place_id` string OR `lat_lng` object returned by `search_places`. Do NOT guess or hallucinate an `address` or `place_id` if you do not know the exact name.
4. **Insider Tips:** Provide specific "order this, skip that" insider tips for each location on the tour.

Structure your response clearly and concisely. If the user provides a budget, ensure your suggestions align with it.
"""

MAPS_MCP_URL = "https://mapstools.googleapis.com/mcp"

def get_maps_mcp_toolset():
    dotenv.load_dotenv()
    maps_api_key = os.getenv("MAPS_API_KEY")
    if not maps_api_key:
        print("Warning: MAPS_API_KEY environment variable not found.")
        maps_api_key = "no_api_found"

    tools = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url=MAPS_MCP_URL,
            headers={
                "X-Goog-Api-Key": maps_api_key
            }
        )
    )
    print("Google Maps MCP Toolset configured.")
    return tools

maps_toolset = get_maps_mcp_toolset()

root_agent = LlmAgent(
    model=Gemini(model="gemma-4-31b-it"),
    name="food_tour_agent",
    instruction=system_instruction,
    tools=[maps_toolset],
)
```

### 环境变量 {#environment-variables}
在运行 Agent 之前设置所需的环境变量。

```
export MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 示例用法 {#example-usage}
要测试美食旅游 Agent 的功能，可以尝试将以下提示之一粘贴到聊天中：

- *“我想在多伦多进行拉面之旅。我的一天预算是60美元。给我规划一个前往前三名拉面店的步行路线，并告诉我在每家店应该点什么。”*
- *“我有这张芝加哥深盘披萨的照片 [插入图片网址]。我想在海军码头周围找到最好的店铺。设计一个步行路线，并告诉我每站必点的披萨。”*
- *“我在奥斯汀市中心寻找正宗的烧烤之旅。预算控制在100美元以内。建立三家高评价烧烤店之间的步行路线，并提供选购最佳肉类的内幕小贴士。”*

该 Agent 将：

1. 推断可能的菜系或菜肴风格
2. 使用 Google Maps MCP 工具搜索相关地点
3. 计算所选停靠点之间的步行路线
4. 返回结构化的美食旅游，包括推荐和内幕小贴士

---

原文：[Google Gemma models for ADK agents](https://adk.dev/agents/models/google-gemma/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/google-gemma.md)
