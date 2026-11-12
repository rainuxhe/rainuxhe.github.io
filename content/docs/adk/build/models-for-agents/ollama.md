---
title: "Ollama"
description: "Ollama 是一个工具，允许你在本地托管和运行开源模型。ADK 通过 LiteLLM 模型连接库与 Ollama 托管的模型集成。"
icon: "article"
weight: 80
toc: true
---

支持版本：Python v0.1.0。

[Ollama](https://ollama.com/) 是一个允许你在本地托管和运行开源模型的工具。ADK 通过 [LiteLLM](/docs/adk/build/models-for-agents/litellm/) 模型连接库与 Ollama 托管的模型集成。

## 入门 {#get-started}

使用 LiteLLM 包装器来创建使用 Ollama 托管模型的 Agent。以下代码示例展示了使用 Gemma 开源模型与您的 Agent 的基本实现：

```py
root_agent = Agent(
    model=LiteLlm(model="ollama_chat/gemma3:latest"),
    name="dice_agent",
    description=(
        "hello world agent that can roll a dice of 8 sides and check prime"
        " numbers."
    ),
    instruction="""
      You roll dice and answer questions about the outcome of the dice rolls.
    """,
    tools=[
        roll_die,
        check_prime,
    ],
)
```

{{% alert context="warning" %}}
**警告：使用 `ollama_chat` 接口**

请确保设置提供者为 `ollama_chat` 而不是 `ollama`。使用 `ollama` 可能导致意外行为，例如无限工具调用循环以及忽略先前的上下文。
{{% /alert %}}
{{% alert context="success" %}}
**使用 `OLLAMA_API_BASE` 环境变量**

虽然您可以在 LiteLLM 中为生成指定 `api_base` 参数，但截至 v1.65.5，该库在其他 API 调用中依赖环境变量。因此，您应该为 Ollama 服务器 URL 设置 `OLLAMA_API_BASE` 环境变量，以确保所有请求被正确路由。
{{% /alert %}}

```bash
export OLLAMA_API_BASE="http://localhost:11434"
adk web
```

## 模型选择 {#model-choice}

如果您的 Agent 依赖于工具，请确保您选择了一个具有工具支持的模型，可从 [Ollama 网站](https://ollama.com/search?c=tools) 获取。
为了获得可靠的结果，请使用具有工具支持的模型。
您可以使用以下命令检查模型的工具支持情况：

```bash
ollama show mistral-small3.1
  Model
    architecture        mistral3
    parameters          24.0B
    context length      131072
    embedding length    5120
    quantization        Q4_K_M

  Capabilities
    completion
    vision
    tools
```

您应该在功能中看到 **工具** 列出。您还可以查看模型正在使用的模板，并根据您的需要进行调整。

```bash
ollama show --modelfile llama3.2 > model_file_to_modify
```

例如，上述模型的默认模板本身就表明模型应始终调用一个函数。这可能导致函数调用的无限循环。

```
Given the following functions, please respond with a JSON for a function call
with its proper arguments that best answers the given prompt.

Respond in the format {"name": function name, "parameters": dictionary of
argument name and its value}. Do not use variables.
```

你可以将此类提示替换为更具描述性的提示，以防止无限工具调用循环，例如：

```
Review the user's prompt and the available functions listed below.

First, determine if calling one of these functions is the most appropriate way
to respond. A function call is likely needed if the prompt asks for a specific
action, requires external data lookup, or involves calculations handled by the
functions. If the prompt is a general question or can be answered directly, a
function call is likely NOT needed.

If you determine a function call IS required: Respond ONLY with a JSON object in
the format {"name": "function_name", "parameters": {"argument_name": "value"}}.
Ensure parameter values are concrete, not variables.

If you determine a function call IS NOT required: Respond directly to the user's
prompt in plain text, providing the answer or information requested. Do not
output any JSON.
```

然后您可以使用以下命令创建一个新模型：

```bash
ollama create llama3.2-modified -f model_file_to_modify
```

## 使用 OpenAI 提供者 {#use-openai-provider}

或者，你可以使用 `openai` 作为提供者名称。这种方法需要设置 `OPENAI_API_BASE=http://localhost:11434/v1` 和 `OPENAI_API_KEY=anything` 环境变量，而不是 `OLLAMA_API_BASE`。请注意，`API_BASE` 的值以 *`/v1`* 结尾。

```py
root_agent = Agent(
    model=LiteLlm(model="openai/mistral-small3.1"),
    name="dice_agent",
    description=(
        "hello world agent that can roll a dice of 8 sides and check prime"
        " numbers."
    ),
    instruction="""
      You roll dice and answer questions about the outcome of the dice rolls.
    """,
    tools=[
        roll_die,
        check_prime,
    ],
)
```

```bash
export OPENAI_API_BASE=http://localhost:11434/v1
export OPENAI_API_KEY=anything
adk web
```

### 调试 {#debugging}

你可以通过在 Agent 代码的导入语句之后添加以下内容来查看发送到 Ollama 服务器的请求。

```py
import litellm
litellm._turn_on_debug()
```

寻找类似以下的行：

```bash
Request Sent from LiteLLM:
curl -X POST \
http://localhost:11434/api/chat \
-d '{'model': 'mistral-small3.1', 'messages': [{'role': 'system', 'content': ...
```

---

原文：[Ollama model host for ADK agents](https://adk.dev/agents/models/ollama/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/ollama.md)
