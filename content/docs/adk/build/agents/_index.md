---
title: "Agent"
description: "在 Agent Development Kit（ADK）中，***Agent***或***LlmAgent***是一个自包含的执行单元，旨在自主行动以实现特定目标。Agent 可以执行任务、与用户互动、利用外部资源"
icon: "article"
weight: 30
toc: true
---

支持版本：Python, Go。

在 Agent Development Kit (ADK) 中，***Agent*** 或 ***LlmAgent*** 是一个自包含的执行单元，旨在自主行动以实现特定目标。Agent 可以执行任务、与用户互动、使用外部工具，并与其他 Agent 进行协调。***Agent*** 的基本组成部分包括AI (AI) 模型、任务指令，以及可选的一组 Agent 可以使用的工具。随着 Agent 任务和复杂性的增加，你可以使用 ADK 开发框架将其扩展为*工作流*，从而允许你组合和协调多个 Agent 和代码执行任务。

![ADK 中的 Agent 和工作流](/images/adk/agents_overview.svg)

**图 1.** ADK 中的简单 Agent 和 Agent 工作流

对于大多数开发者来说，只使用模型、指令和工具构建一个 Agent 是一个很好的起点。随着你的 Agent 能力和复杂性的增长，你可能希望分解 Agent 应用程序的功能，以更好地管理其行为，在模型操作上下文限制内工作，并模块化你的代码以保持可管理。ADK Agent***工作流***架构允许你将 Agent 从单体结构发展为更模块化的代码和项目结构。

## 从单个 Agent 到工作流的成长 {#grow-from-single-agent-to-workflows}

在 ADK 中，任何拥有多个 Agent 或可执行*节点*的 Agent 应用程序都被视为工作流。ADK 并未对从单 Agent 架构迁移到多 Agent 或基于图的***工作流***架构施加任何强制性要求。你可以根据项目需求或发现单 Agent 方法的局限性时决定何时进行改动，例如：

* **指令执行性能：** 当多步骤指令集达到一定长度或复杂度时，你可能会发现单个 Agent 无法可靠完成所有指令，或者无法以所需的质量或速度执行。
* **上下文限制：** 你可能会发现执行 Agent 任务所需的数据量超过了所使用 AI 模型的上下文窗口限制。
* **Agent 代码模块化：** 随着 Agent 代码复杂性和组织结构的增加，你可能希望分解 Agent 功能，使代码更易于管理，或使 Agent 代码可用于其他 Agent 项目。
* **混合确定性和非确定性任务：** 当你构建用于解决更复杂问题的 Agent 时，你可能希望设计和构建将 AI 模型的非确定性功能与确定性代码交织的 Agent，而不是依赖非确定性 AI 模型管理任务的完整执行。更多细节，请参见 [基于图的工作流](/docs/adk/build/graph-workflows/).有关 ADK 工作流和 Agent 项目架构的更多信息，请参阅 [Workflows](/docs/adk/build/multi-agent-workflows/) 部分。

## Agent 功能 {#agent-features}

可以使用以下功能扩展和增强 ADK Agent 的能力：

* [**AI 模型**](/docs/adk/build/models-for-agents/)：
  通过整合来自 Google 和其他提供商的生成式 AI 模型，更换 Agent 的底层智能。

* [**预构建工具和集成**（官方英文）](https://adk.dev/integrations/)：
  为您的 Agent 配备大量工具、插件及其他集成，用于与世界进行交互，包括网站、MCP 工具、应用程序、数据库、编程接口等。

* [**自定义工具**](/docs/adk/components/custom-tools/)：
  创建您自己的特定任务工具，以精确控制解决特定问题。

* [**Artifact**](/docs/adk/components/artifacts/)：
  使 Agent 能够创建和管理持久的输出，如文件、代码或文档，这些输出存在于对话生命周期之外。

* [**技能**](/docs/adk/components/skills-for-agents/)：
  使用预构建或自定义的 [Agent Skills](https://agentskills.io/) 扩展 Agent 功能，使其在 AI 上下文窗口限制内高效工作。

* [**插件**](/docs/adk/components/app-management/plugins/)：
  将复杂的预打包行为和第三方服务直接集成到 Agent 的工作流中。

* [**回调**](/docs/adk/components/app-management/callbacks/)：
  在 Agent 执行生命周期中的特定事件挂钩，以添加日志记录、监控或自定义副作用，而无需更改核心 Agent 逻辑。

* [**服务注册**](/docs/adk/build/agents/service-registration/)：
  为会话、Artifact、内存和 Agent2Agent (A2A) 任务存储注册自定义后端服务。

## 下一步 {#next-steps}

现在您已经了解了 ADK 中可用的不同 Agent 类型，深入了解它们的工作原理及有效使用方法：* [**简单 Agent：**](/docs/adk/build/agents/simple-agents/) 探索如何配置由 AI 模型驱动的 Agent，包括设置指令、提供工具及启用高级功能，如规划和代码执行。
* [**托管 Agent：**](/docs/adk/build/agents/managed-agents/) 直接在 ADK 流程中使用 Google 的一方、开箱即用的 Agent（由托管 Agent API 支持），并内置服务器端工具，如网页搜索和代码执行。
* [**图形工作流：**](/docs/adk/build/graph-workflows/) 了解如何将 Agent 从普通语言指令发展为可组合、可靠的执行路径，将 AI 推理与确定性代码逻辑结合。
* [**多 Agent 工作流：**](/docs/adk/build/multi-agent-workflows/) 探索如何构建结合多个 Agent、执行节点及多种任务执行控制机制的 Agent 应用，以满足项目需求。
* [**Agent 优化：**](/docs/adk/run/evaluation/optimization/) 探索评估、测试并提升 Agent 应用性能、可靠性和成本效益的方法。

---

原文：[Agents](https://adk.dev/agents/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/index.md)
