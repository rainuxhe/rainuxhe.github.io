---
title: "接地"
description: "接地是将您的 AI Agent 连接到外部信息源的过程，使它们能够生成更准确、最新且可验证的响应。通过将 Agent 的响应基于权威数据，您可以"
icon: "article"
weight: 90
toc: true
---

接地（Grounding）是将您的 AI Agent 连接到外部信息源的过程，使它们能够生成更准确、最新且可验证的回答。通过将 Agent 的回答基于权威数据，您可以减少幻觉现象，并为用户提供有可靠来源支持的答案。

ADK 支持多种接地方法：

- **Google 搜索接地**：将 Agent 连接到实时网络信息，用于需要当前数据的查询，例如新闻、天气或自训练模型以来可能发生变化的事实。
- **使用搜索进行接地**：将 Agent 连接到您组织的私人文档和企业数据，用于需要专有信息的查询。
- **Agentic RAG**：构建能够推理如何搜索的 Agent，使用 Agent 检索（Agent Retrieval）、知识引擎（Knowledge Engine）或其他检索系统动态构建查询和过滤器。

## Google 搜索接地

让您的 Agent 访问实时、权威的网络信息。学习如何设置 Google 搜索接地，了解数据流，解释接地回答，并向用户显示引用。

[了解 Google 搜索接地](/docs/adk/components/grounding/google-search-grounding/)

## 使用搜索进行接地

将您的 Agent 连接到已索引的企业文档和私人数据存储库。学习如何配置 Agent 搜索数据存储，将回答接地于您组织的知识库，并提供来源归属。

[了解使用搜索进行接地](/docs/adk/components/grounding/grounding-with-search/)

## 博客文章：使用 Vector Search 2.0 和 ADK 的 10 分钟 Agentic RAG

学习如何构建一个突破简单检索-生成模式的 Agentic RAG 系统。本文讲解了如何构建一个旅行 Agent，解析用户意图，构建元数据过滤器，并使用 Vector Search 2.0 和 ADK 对 2,000 个伦敦 Airbnb 房源进行混合搜索。

[博客文章：使用 Vector Search 2.0 和 ADK 的 10 分钟 Agentic RAG](https://medium.com/google-cloud/10-minute-agentic-rag-with-the-new-vector-search-2-0-and-adk-655fff0bacac)

## 深度搜索 Agent

一个可投入生产的全栈研究 Agent，将主题转化为带有引用的综合报告。具有两阶段工作流，包括人为审批计划、迭代搜索优化，以及用于规划、研究、批评和撰写的多 Agent 架构。

[深度搜索 Agent](https://github.com/google/adk-samples/tree/main/core/python/deep-search)

---

原文：[Grounding agents with data](https://adk.dev/grounding/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/grounding/index.md)
