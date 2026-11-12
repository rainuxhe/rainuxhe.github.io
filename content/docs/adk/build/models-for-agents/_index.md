---
title: "Agent 模型"
description: "Agent 开发工具包（ADK）旨在提供灵活性，允许您将各种大型语言模型（LLMs）整合到您的 Agent 中。本节详细说明如何利用 Gemini 并整合其他流行模型。"
icon: "article"
weight: 60
toc: true
---

支持版本：Python, Go。

Agent 开发工具包（ADK）旨在提供灵活性，使您能够将各种大型语言模型（LLM）集成到您的 Agent 中。本节将详细说明如何利用 Gemini 以及有效集成其他流行模型，包括那些托管在外部或本地运行的模型。

ADK 提供了几种模型集成机制：

1. **直接字符串 / 注册表：** 适用于与 Google Cloud 紧密集成的模型，例如通过 Google AI Studio 或 Agent 平台访问的 Gemini 模型，或托管在 Agent 平台端点上的模型。您只需提供模型名称或端点资源字符串，ADK 的内部注册表会将该字符串解析到相应的后端客户端。

      *  [Gemini 模型](/docs/adk/build/models-for-agents/gemini/)
      *  [Claude 模型](/docs/adk/build/models-for-agents/claude/)
      *  [Agent 平台托管模型](/docs/adk/build/models-for-agents/agent-platform-hosted/)

2. **模型连接器：** 适用于更广泛的兼容性，尤其是 Google 生态系统之外的模型或需要特定客户端配置的模型，如通过 Apigee 或 LiteLLM 访问的模型。您可以实例化特定的包装类，例如 `ApigeeLlm` 或 `LiteLlm`，并将该对象作为 `model` 参数传递给您的 `LlmAgent`。

      *  [Apigee 模型](/docs/adk/build/models-for-agents/apigee-ai-gateway/)
      *  [LiteLLM 模型](/docs/adk/build/models-for-agents/litellm/)
      *  [Ollama 模型托管](/docs/adk/build/models-for-agents/ollama/)
      *  [vLLM 模型托管](/docs/adk/build/models-for-agents/vllm/)
      *  [LiteRT-LM 模型托管](/docs/adk/build/models-for-agents/litert-lm/)

3. **[模型路由](/docs/adk/build/models-for-agents/model-routing/)：** 用于在运行时通过路由器函数动态选择多个模型，并在发生错误时自动切换。

---

原文：[AI Models for ADK agents](https://adk.dev/agents/models/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/index.md)
