---
title: "技术概览"
description: "构建、评估和部署 Agent，轻松无缝！"
icon: "article"
weight: 10
toc: true
---

<p style="text-align:center;"> <b>无缝构建、评估和部署 Agent！</b> </p>

ADK 旨在赋能开发者
构建、管理、评估和部署AI驱动的 Agent。它提供了强大的
以及灵活的环境，既能创建会话型，也能实现非会话型
能够处理复杂任务和工作流程的 Agent。

![intro_components.png](/images/adk/adk-components.png)

## 核心概念 {#core-concepts}

ADK 围绕几个关键的原语和概念构建
强有力且灵活。以下是基本内容：

* **Agent：** 为特定任务设计的基本工作单元。Agent 可以
  用于复杂推理，可以使用语言模型（`LlmAgent`），或作为执行的确定性控制器，这些模型称为“[工作流agents](/docs/adk/build/multi-agent-workflows/template-workflows/)”（`SequentialAgent`、`ParallelAgent`、`LoopAgent`）。
* **工具：** 赋予特工超越对话的能力，让他们能够互动
  通过外部 API、搜索信息、运行代码或调用其他服务。
* **回调：** 你提供的自定义代码片段，用于在特定节点运行
  Agent 的流程，允许检查、日志记录或行为修改。
* **会话管理（`Session` & `State`）:** 处理单个上下文
  对话（`Session`），包括其历史（`Events`）和 Agent 人的
  那次对话的工作记忆（`State`）。
* **内存：** 使 Agent 能够在不同范围内回忆用户的信息
  *多次*会话，提供长期上下文（区别于短期）
  会议`State`）。
* **Artifact 管理（`Artifact`）:** 允许 Agent 保存、加载和管理
  与会话或用户相关的文件或二进制数据（如图片、PDF）。
* **代码执行：** Agent（通常通过工具）生成和
  执行代码以执行复杂的计算或操作。
* **规划：** 一种高级能力，使 Agent 能够分解复杂目标
  分成更小的步骤，像ReAct计划器一样规划如何实现它们。
* **模型：** 驱动 `LlmAgent` 的底层大型语言模型，使其
  推理和语言理解能力。
* **事件：** 代表发生的事情的基本交流单位
  在会话期间（用户消息、Agent 回复、工具使用），形成
  对话历史。
* **Runner：** 管理执行流程、协调 Agent 的引擎
  基于事件的交互，并与后端服务协调。

注意：** 多模态流、评估、部署等功能，
调试和追踪也是更广泛 ADK 生态系统的一部分，支持
实时交互与开发生命周期。*

## 主要能力 ADK 为开发者构建智能 Agent 应用提供了几个关键优势：1. **多 Agent 系统设计：** 轻松构建由多个分层排列的专用 Agent 组成的应用程序。Agent 可以协调复杂任务，使用 LLM 驱动的转移或显式的 `AgentTool` 调用分配子任务，实现模块化和可扩展的解决方案。 {#key-capabilities}
2. **丰富的工具生态系统：** 为 Agent 配备多样化的能力。ADK 支持集成自定义功能（`FunctionTool`）、使用其他 Agent 作为工具（`AgentTool`）、利用内置功能如代码执行，以及与外部数据源和 API（如搜索、数据库）交互。支持长时间运行的工具，有效处理异步操作。
3. **灵活的编排：** 使用内置的工作流 Agent（`SequentialAgent`、`ParallelAgent`、`LoopAgent`）结合 LLM 驱动的动态路由定义复杂的 Agent 工作流。这允许实现可预测的流水线和自适应 Agent 行为。
4. **集成开发者工具：** 轻松在本地开发和迭代。ADK 包含命令行界面（CLI）和开发者 UI，用于运行 Agent、检查执行步骤（事件、状态变化）、调试交互以及可视化 Agent 定义。
5. **原生流式支持：** 构建实时交互体验，使用 [实时和语音 Agent](/docs/adk/components/live-and-voice-agents/)，它们为双向流（文本和音频）提供原生支持。这与 Gemini Live API（用于 Gemini 开发者 API](https://ai.google.dev/gemini-api/docs/live) 或 [Agent 平台](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live)）等底层能力无缝集成，通常只需简单配置更改即可启用。
6. **内置 Agent 评估：** 系统地评估 Agent 性能。框架包含工具，可创建多轮评估数据集并在本地（通过 CLI 或开发者 UI）运行评估，以衡量质量并指导改进。
7. **广泛的 LLM 支持：** 尽管针对 Google 的 Gemini 模型进行了优化，但该框架设计灵活，允许通过其 `BaseLlm` 接口集成各种 LLM（可能包括开源或微调模型）。
8. **Artifact 管理：** 支持 Agent 处理文件和二进制数据。该框架提供机制（`ArtifactService`、上下文方法），让 Agent 在执行过程中保存、加载和管理版本化的 Artifact，如图像、文档或生成的报告。
9. **可扩展性与互操作性：** ADK 推崇开放生态系统。在提供核心工具的同时，允许开发者轻松集成和重用第三方工具及数据连接器。
10. **状态与内存管理：** 自动处理短期对话记忆（`State` 在 `Session` 内），由 `SessionService` 管理。提供长期 `Memory` 服务的集成点，使 Agent 能够跨多个会话回忆用户信息。![intro_components.png](/images/adk/adk-lifecycle.png)

## 开始 {#get-started}

* 准备好打造你的第一个经纪人了吗？[开始吧](/docs/adk/build/get-started/)！

---

原文：[Agent Development Kit (ADK)](https://adk.dev/get-started/about/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/about.md)
