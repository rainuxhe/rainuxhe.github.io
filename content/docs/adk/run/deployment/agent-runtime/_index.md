---
title: "Agent 运行时"
description: "在 ADK Python Go v1.2.0 中受支持"
icon: "article"
weight: 10
toc: true
---

支持版本：Python, Go v1.2.0。

Google Cloud Agent 平台
[Agent Runtime](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)
是一组模块化服务，可帮助开发者在生产环境中扩展和管理 Agent。Agent Runtime 使您能够在生产环境中部署 Agent，提供端到端的托管基础设施，让您专注于创建智能且有影响力的 Agent。当您将 ADK Agent 部署到 Agent Runtime 时，您的代码将在 *Agent Runtime* 环境中运行，该环境是 Agent Runtime 产品提供的更大 Agent 服务集的一部分。

本指南包含以下部署路径，用于不同目的：

*   **[标准部署](/docs/adk/run/deployment/agent-runtime/standard-deployment/)**：如果您希望仔细管理将 ADK Agent 部署到 Agent Runtime，请遵循此标准部署路径。此部署路径使用云控制台、ADK 命令行接口，并提供逐步说明。建议已熟悉配置 Google Cloud 项目的用户以及准备进行生产部署的用户采用此路径。

*   **[Agents CLI 部署](/docs/adk/run/deployment/agent-runtime/agents-cli/)**：
    遵循此加速部署路径，可以为您的 ADK Agent 设置完全配置的 Google Cloud 环境，包括 CI/CD、基础设施即代码和部署管道。您需要一个已启用计费的 Google Cloud 项目。Agent 平台中的 Agents CLI 帮助您快速部署 ADK 项目，并包含扩展 Agent Runtime 核心功能的高级服务配置，以应对更成熟的使用场景。

{{% alert context="info" %}}
**Google Cloud 上的 Agent Runtime 服务**

Agent Runtime 是付费服务，如果超出免费访问层，您可能会产生费用。更多信息可在 [Agent Runtime 定价页面](https://cloud.google.com/vertex-ai/pricing#vertex-ai-agent-engine) 找到。
{{% /alert %}}
## 部署内容 {#payload}

当您将 ADK Agent 项目部署到 Agent Runtime 时，以下内容将上传到服务：

- 您的 ADK Agent 代码
- ADK Agent 代码中声明的所有依赖项

根据您使用的编程语言，可能会包括其他库，如以下部分所述。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 Python 部署 *不包含* ADK API 服务器或 ADK Web 用户界面库。Agent Runtime 服务提供 ADK API 服务器功能的库。
{{% /tab %}}
{{% tab tabName="Go" %}}

使用 Go 部署包括 ADK `agentengine` 启动器，它提供 Agent Runtime `:query` 和 `:streamQuery` 方法。它 *不包含* ADK API 服务器或 ADK Web 用户界面。
{{% /tab %}}
{{< /tabs >}}

---

原文：[Deploy to Agent Runtime](https://adk.dev/deploy/agent-runtime/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/agent-runtime/index.md)
