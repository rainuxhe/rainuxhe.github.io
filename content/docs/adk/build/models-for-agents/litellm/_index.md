---
title: "LiteLLM"
description: "在 2026 年 3 月 24 日的 PyPI 上，LiteLLM 版本 1.82.7 和 1.82.8 中发现了未经授权的代码。如果您在使用 ADK Python 时启用了 `eval` 或 `extensions` 扩展，请立即更新到最新版本的 ADK Python。如果您"
icon: "article"
weight: 100
toc: true
---

支持版本：Python v0.1.0。

<details>
<summary>ADK Python 安全咨询：LiteLLM 供应链漏洞</summary>

在LiteLLM 1.82.7和1.82.8版本中，未授权代码被识别为
PyPI 于 2026 年 3 月 24 日发布。如果你使用 ADK Python 并带有`eval`
`extensions`额外内容，请立即更新到最新版本的 ADK Python。
如果您在这段时间内安装或升级了LiteLLM，请轮换所有秘密
以及凭证。有关详细信息和所需操作，请参见[ADK]
security advisory](https://github.com/google/adk-python/issues/5005) 和
[LiteLLM 安全更新：疑似供应链
事件](https://docs.litellm.ai/blog/security-update-march-2026)。

</details>
[LiteLLM](https://docs.litellm.ai/) 是一个 Python 库，作为
用于模型和模型托管服务的翻译层，提供
支持100多个大型语言模型的标准化、OpenAI兼容接口。ADK 提供
通过LiteLLM 库集成，允许您访问广泛的
来自OpenAI、Anthropic、Ollama、Mistral、DeepSeek和Cohere等众多服务商的大型语言模型
其他的。你可以本地运行开源模型，也可以自行托管并集成
他们使用 LiteLLM 进行运营控制、节约成本、隐私或离线
使用场景。

您可以使用LiteLLM 库访问远程或本地托管的AI模型：

* **远程模型主机：** 使用`LiteLlm`包装类并设置它
    作为`LlmAgent`的`model`参数。
* **本地模型主机：** `LiteLlm`使用配置为
    指向你的本地模型服务器。本地模型托管示例
    解法，参见 [Ollama](/docs/adk/build/models-for-agents/ollama/)
    或[vLLM](/docs/adk/build/models-for-agents/vllm/)文档。

<details>
<summary>Windows Encoding with LiteLLM</summary>

在Windows上使用带有LiteLLM 的 ADKAgent 时，你可能会遇到
`UnicodeDecodeError`。此错误发生是因为LiteLLM 可能会尝试读取
缓存文件使用默认的Windows编码（`cp1252`）而非UTF-8。
通过将`PYTHONUTF8`环境变量设置为 来防止此错误
`1`。这迫使 Python 对所有文件 I/O 使用 UTF-8。

**示例（PowerShell）:**

```powershell
# Set for the current session
$env:PYTHONUTF8 = "1"

# Set persistently for the user
[System.Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', [System.EnvironmentVariableTarget]::User)
```

</details>
## 设置 {#setup}

1. **安装 LiteLLM：** ADK 需要 `litellm>=1.84`。

        ```shell
        pip install "litellm>=1.84"
        ```

2. **设置提供商 API 密钥：** 将 API 密钥配置为您打算使用的特定提供商的环境变量。

   * *OpenAI 示例：*

        ```shell
        export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
        ```

    * *Anthropic 示例（非 Agent 平台）：*

        ```shell
        export ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
        ```

    * *请查阅 [LiteLLM 提供商文档](https://docs.litellm.ai/docs/providers) 以获取其他提供商的正确环境变量名称。*

## 示例实现 {#example-implementation}

```python
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- 使用 OpenAI 的 GPT-4o 的示例 Agent ---
# （需要 OPENAI_API_KEY）
agent_openai = LlmAgent(
    model=LiteLlm(model="openai/gpt-4o"), # LiteLLM model string format
    name="openai_agent",
    instruction="You are a helpful assistant powered by GPT-4o.",
    # ... 其他 Agent 参数
)

# --- 使用 Anthropic 的 Claude Haiku（非 Vertex）的示例 Agent ---
# （需要 ANTHROPIC_API_KEY）
agent_claude_direct = LlmAgent(
    model=LiteLlm(model="anthropic/claude-3-haiku-20240307"),
    name="claude_direct_agent",
    instruction="You are an assistant powered by Claude Haiku.",
    # ... 其他 Agent 参数
)
```

## 人类学思维模块 {#anthropic-thinking-blocks}

支持版本：Python v1.28.0。

当您通过 `LiteLlm` 连接器使用 Anthropic Claude 模型（如 Claude 3.7 Sonnet）时，ADK 支持 Anthropic 的结构化推理功能，也称为“思维模块”。ADK 会自动提取 `thinking_blocks` 及其签名。

Anthropic 需要在多轮对话中发送这些签名，否则在第一轮之后将静默丢弃思维内容。ADK 在每次外发请求时重新构建 `thinking_blocks` 并附上其签名，因此 Claude 的推理能够在工具调用和多轮交互中得到保留，无需您进行任何自定义状态管理。

---

原文：[LiteLLM model connector for ADK agents](https://adk.dev/agents/models/litellm/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/litellm.md)
