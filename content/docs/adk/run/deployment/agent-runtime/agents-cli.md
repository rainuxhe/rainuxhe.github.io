---
title: "Agents CLI"
description: "在 ADK Python Go v1.2.0 中受支持"
icon: "article"
weight: 20
toc: true
---

支持版本：Python, Go v1.2.0。

本部署流程描述了如何使用[Agents CLI 在 Agent Platform](https://google.github.io/agents-cli/)和 ADK 执行部署。通过 Agents CLI 部署到 Agent Runtime 提供了一条快速通向生产就绪环境的途径。Agents CLI 会自动配置 Google Cloud 资源、CI/CD 流水线和基础设施即代码（Terraform），以支持整个开发生命周期。作为最佳实践，务必在生产部署前审核生成的配置，以确保其符合您组织的安全和合规标准。

本部署指南使用 Agents CLI 将项目模板应用到现有项目中，添加部署 Artifact，并为您的 Agent 项目做好部署准备。这些说明展示了如何使用 Agents CLI 为您的 ADK 项目提供所需的 Google Cloud 服务，具体如下：

-   [前提条件](#prerequisites-ad)：设置 Google Cloud 项目、IAM 权限并安装所需软件。
-   [准备您的 ADK 项目](#prepare-ad)：修改现有的 ADK 项目文件，为部署做好准备。
-   [连接到您的 Google Cloud 项目](#connect-ad)：将您的开发环境连接到 Google Cloud 及其项目。
-   [部署您的 ADK 项目](#deploy-ad)：在 Google Cloud 项目中提供所需服务并上传 ADK 项目代码。

有关测试已部署 Agent 的信息，请参见 [测试已部署 Agent](/docs/adk/run/deployment/agent-runtime/test-deployed-agents/)。
有关使用 Agents CLI 及其命令行工具的更多信息，请参阅 [CLI 参考](https://google.github.io/agents-cli/cli/) 和 [指南](https://google.github.io/agents-cli/)。

### 前提条件 {#prerequisites-ad}

要使用此部署路径，您需要配置以下资源：

-   **Google Cloud 项目和权限**：启用了[计费](https://cloud.google.com/billing/docs/how-to/modify-project)的 Google Cloud 项目。您可以使用现有项目或创建一个新项目。您必须在此项目中拥有以下任一 IAM 角色：
    -   **Agent Platform 用户角色** — 足以将 Agent 部署到 Agent Runtime。
    -   **所有者角色** — 完整的生产环境设置所必需（Terraform 基础设施配置、CI/CD 流水线、IAM 配置）。

{{% alert context="success" %}}
**注意**建议使用空项目以避免与现有资源冲突。
对于新项目，请参阅 [创建和管理项目](https://cloud.google.com/resource-manager/docs/creating-managing-projects)。
{{% /alert %}}
-   **Python 环境**：由 [Agents CLI ](https://google.github.io/agents-cli/guide/getting-started/) 支持的 Python 版本。
-   **uv 工具**：管理 Python 开发环境和运行 agents-cli 工具。有关安装详情，请参阅 [安装 uv ](https://docs.astral.sh/uv/getting-started/installation/)。
-   **Google Cloud CLI 工具**：gcloud 命令行接口。有关安装详情，请参阅 [Google Cloud 命令行接口](https://cloud.google.com/sdk/docs/install)。
-   **Make 工具**：构建自动化工具。该工具是大多数基于 Unix 系统的一部分，关于安装详情，请参阅 [Make 工具](https://www.gnu.org/software/make/) 文档。

### 准备你的 ADK 项目 {#prepare-ad}

当你将 ADK 项目部署到 Agent Runtime 时，你需要一些额外文件来支持部署操作。以下 Agents CLI 命令会备份你的项目，然后为部署目的向项目中添加文件。

这些说明假设你已有一个现有 ADK 项目，并且正在修改它以进行部署。如果你没有 ADK 项目，或者想要使用测试项目，请完成其中一份 [入门](/docs/adk/build/get-started/) 指南，该指南会创建一个 Agent 项目。以下说明以 `my_agent` 项目为例。

要为将 ADK 项目部署到 Agent Runtime 做准备：

1.  在你的开发环境的终端窗口中，导航到包含你的 Agent 文件夹的 **父目录**。例如，如果你的项目结构是：

    ```
    your-project-directory/
    ├── my_agent/
    │   ├── __init__.py
    │   ├── agent.py
    │   └── .env
    ```

    导航到 `your-project-directory/`

1.  运行 Agents CLI `scaffold enhance` 命令，将部署所需的文件添加到您的项目中。

    ```shell
    agents-cli scaffold enhance --deployment-target agent_runtime
    ```

1. 遵循 Agents CLI 工具的指示。通常情况下，您可以接受所有问题的默认答案。然而，对于 **GCP 区域** 选项，请确保选择一个 [Agent Runtime 支持的区域](https://docs.cloud.google.com/agent-builder/locations#supported-regions-agent-engine)。

当您成功完成此过程时，工具会显示以下信息：

```
> Success! Your agent project is ready.
```

{{% alert context="success" %}}
**注意**

在运行期间，Agents CLI 工具可能会显示连接到 Google Cloud 的提醒，但在此阶段 *不需要* 进行该连接。
{{% /alert %}}
有关 Agents CLI 对您的 ADK 项目所做更改的更多信息，请参见
[对您的 ADK 项目的更改](#adk-agents-cli-changes)。

### 连接到您的 Google Cloud 项目 {#connect-ad}

在部署 ADK 项目之前，您必须连接到 Google Cloud 及您的项目。登录到 Google Cloud 帐户后，您应验证您的部署目标项目是否在帐户中可见，并确保其被配置为当前项目。

连接到 Google Cloud 并列出您的项目：

1. 在开发环境的终端窗口中，登录到您的 Google Cloud 帐户：

    ```shell
    gcloud auth application-default login
    ```

1. 使用 Google Cloud 项目 ID 设置您的目标项目：

    ```shell
    gcloud config set project your-project-id-xxxxx
    ```

1. 验证您的 Google Cloud 目标项目是否已设置：

    ```shell
    gcloud config get-value project
    ```

一旦你成功连接到 Google Cloud 并设置了你的 Cloud Project ID，你就可以准备将你的 ADK 项目文件部署到 Agent Runtime。

### 部署你的 ADK 项目 {#deploy-ad}

使用 Agents CLI 时，你可以通过 `agents-cli deploy` 命令进行部署。该命令会从你的 Agent 代码构建一个容器，将其推送到注册表，并将其部署到托管环境中的 Agent Runtime。

{{% alert context="warning" %}}
**重要提示**

*在执行这些步骤之前，确保你的 Google Cloud 目标部署项目已设置为你的***当前项目***。* `agents-cli deploy` 命令在执行部署时会使用你当前设置的 Google Cloud 项目。有关设置和检查当前项目的信息，请参见 [连接到你的 Google Cloud 项目](#connect-ad)。
{{% /alert %}}
要将你的 ADK 项目部署到 Google Cloud 项目中的 Agent Runtime：

1. 在终端窗口中，导航到你的 Agent 项目目录（例如， `your-project-directory/`）。

2. 将你的 Agent 代码部署到 Google Cloud 开发环境：

    ```shell
    agents-cli deploy
    ```

    该命令从 `pyproject.toml` 读取您的 `deployment_target` 并部署
    到已配置的目标（Agent Runtime、Cloud Run 或 GKE）。

3.  （可选）要启用提示-响应日志和内容日志等可观测性功能，请提供遥测基础设施：

    ```shell
    agents-cli infra single-project
    ```

有关更多详情，请参阅
[可观察性指南](https://google.github.io/agents-cli/guide/observability/)。

一旦此过程成功完成，你应该能够与在 Google Cloud Agent Runtime 上运行的 Agent 进行交互。有关测试已部署 Agent 的详细信息，请参阅
[测试已部署 Agent](/docs/adk/run/deployment/agent-runtime/test-deployed-agents/)。

### 对你的 ADK 项目的更改 {#adk-agents-cli-changes}

Agents CLI 工具会向你的项目添加更多文件以进行部署。下面的步骤会在修改文件之前备份你现有的项目文件。本指南使用
[multi_tool_agent](https://github.com/google/adk-docs/tree/main/examples/python/snippets/get-started/multi_tool_agent)
项目作为参考示例。原始项目的初始文件结构如下：

```
my_agent/
├─ __init__.py
├─ agent.py
└─ .env
```

在运行 Agents CLI scaffold enhance 命令以添加 Agent Runtime 部署信息后，新的结构如下：

```
my-agent/
├─ app/                 # Core application code
│   ├─ agent.py         # Main agent logic
│   ├─ agent_engine_app.py # Agent Runtime application logic
│   └─ utils/           # Utility functions and helpers
├─ .cloudbuild/         # CI/CD pipeline configurations for Google Cloud Build
├─ deployment/          # Infrastructure and deployment scripts
├─ notebooks/           # Jupyter notebooks for prototyping and evaluation
├─ tests/               # Unit, integration, and load tests
├─ Makefile             # Makefile for common commands
├─ GEMINI.md            # AI-assisted development guide
└─ pyproject.toml       # Project dependencies and configuration
```

请查看您更新后的 ADK 项目文件夹中的 *README.md* 文件以获取更多信息。
有关使用 Agents CLI 的更多信息，请参阅 [Agents CLI 文档](https://google.github.io/agents-cli/)。

## 测试已部署的 Agent {#test-deployed-agents}

在完成 ADK Agent 的部署后，您应该在其新的托管环境中测试工作流。有关在 Agent Runtime 中测试已部署 ADK Agent 的更多信息，请参阅 [在 Agent Runtime 中测试已部署的 Agent](/docs/adk/run/deployment/agent-runtime/test-deployed-agents/)。

---

原文：[Deploy to Agent Runtime with Agents CLI](https://adk.dev/deploy/agent-runtime/agents-cli/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/agent-runtime/agents-cli.md)
