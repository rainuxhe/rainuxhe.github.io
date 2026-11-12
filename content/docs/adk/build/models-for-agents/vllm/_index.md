---
title: "vLLM"
description: "像 vLLM 这样的工具可以让您高效地托管模型，并将其作为与 OpenAI 兼容的 API 端点提供服务。您可以通过 Python 的 LiteLLM 库使用 vLLM 模型。"
icon: "article"
weight: 90
toc: true
---

支持版本：Python v0.1.0。

像 [vLLM](https://github.com/vllm-project/vllm) 这样的工具允许您高效托管模型，并将其作为兼容 OpenAI 的 API 端点提供服务。您可以通过 Python 的 [LiteLLM](/docs/adk/build/models-for-agents/litellm/) 库使用 vLLM 模型。

## 设置 {#setup}

1. **部署模型：** 使用 vLLM（或类似工具）部署您选择的模型。记下 API 基础 URL（例如 `https://your-vllm-endpoint.run.app/v1`）。
   * *ADK 工具的重要提示：* 在部署时，确保服务工具支持并启用与 OpenAI 兼容的工具/函数调用。对于 vLLM，这可能涉及像 `--enable-auto-tool-choice` 的标志，以及可能依赖于模型的特定 `--tool-call-parser`。请参阅 vLLM 关于工具使用的文档。
2. **认证：** 了解您的端点如何处理认证（例如，API 密钥、Bearer 令牌）。

## 集成示例 {#integration-example}

以下示例展示了如何使用带有 ADK Agent 的 vLLM 端点。

```python
import subprocess
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- 使用托管在 vLLM 端点上的 Gemma 4 模型的示例 Agent ---

# 由您的 vLLM 部署提供的端点 URL
api_base_url = "https://your-vllm-endpoint.run.app/v1"

# 在 *您的* vLLM 端点配置中识别的模型名称
model_name_at_endpoint = "hosted_vllm/google/gemma-4-E4B-it" # Example from vllm_test.py

# 身份验证（示例：针对 Cloud Run 部署使用 gcloud 身份令牌）
# 根据您的端点安全性进行调整
try:
    gcloud_token = subprocess.check_output(
        ["gcloud", "auth", "print-identity-token", "-q"]
    ).decode().strip()
    auth_headers = {"Authorization": f"Bearer {gcloud_token}"}
except Exception as e:
    print(f"Warning: Could not get gcloud token - {e}. Endpoint might be unsecured or require different auth.")
    auth_headers = None # Or handle error appropriately

agent_vllm = LlmAgent(
    model=LiteLlm(
        model=model_name_at_endpoint,
        api_base=api_base_url,
        # 此 extra_body 值特定于 Gemma 4。
        extra_body={
            "chat_template_kwargs": {
                "enable_thinking": True # Enable thinking
            },
            "skip_special_tokens": False # Should be set to False
        },
        # 如有需要，传递身份验证请求头
        extra_headers=auth_headers,
        # 或者，如果端点使用 API 密钥：
        # api_key="YOUR_ENDPOINT_API_KEY"
    ),
    name="vllm_agent",
    instruction="You are a helpful assistant running on a self-hosted vLLM endpoint.",
    # ... 其他 Agent 参数
)
```

---

原文：[vLLM model host for ADK agents](https://adk.dev/agents/models/vllm/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/vllm.md)
