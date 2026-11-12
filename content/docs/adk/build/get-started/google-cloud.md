---
title: "Google Cloud"
description: "说明如何将 ADK Agent 连接并认证到 Google Cloud、Agent Platform 托管的模型和 Agent Platform 服务。"
icon: "article"
weight: 80
toc: true
---

本指南解释了如何将您的 ADK Agent 与 Google Cloud 平台（GCP）服务、在 Google Cloud Agent 平台上运行的模型以及 Agent 平台服务连接和认证。

## 设置 Google Cloud Agent 平台 {#setup-google-cloud-agent-platform}

在尝试将 Agent 连接到 Google Cloud 或 Agent 平台服务之前，请确保您已完成以下先决条件：

* 已启用 **Agent Platform API**（`aiplatform.googleapis.com`）的 Google Cloud 项目。
* 安装 [gcloud CLI](https://cloud.google.com/sdk/docs/install) 工具。

## Google Cloud 身份验证选项 {#google-cloud-authentication-options}

在将您的 ADK Agent 连接到 Google Cloud 时，您有几种身份验证选项，如下表所示。

| 方法 | 最适用场景 | 身份验证机制 | 环境 |
| :--- | :--- | :--- | :--- |
| [**用户凭据**](#user-credentials) | 本地开发和测试 | 通过 `gcloud` 的应用默认凭据 (ADC) | 本地工作站 |
| [**服务账户**](#service-account) | 生产部署和 CI/CD | Google IAM 服务账户密钥 / 工作负载身份 | Google Cloud（Agent Runtime, Cloud Run, GKE）或外部服务器 |
| [**快速模式**](#express-mode) | 快速原型和测试 | API 密钥 | 本地或云环境 |
| [**Agent 身份**（官方英文）](https://adk.dev/integrations/agent-identity/) | 生产部署和 CI/CD | Google IAM 服务账户密钥 / 工作负载身份 | Google Cloud（Agent Runtime, Cloud Run, GKE） |

{{% alert context="warning" %}}
**警告：保护您的凭据**

用户凭据、服务账户凭据和 API 密钥高度敏感。切勿将凭据文件或密钥直接提交到代码库中。尽可能使用安全的密钥管理器，例如
[Google Cloud Agent Identity（官方英文）](https://adk.dev/integrations/agent-identity/),
[Google Cloud Secret Manager](https://cloud.google.com/security/products/secret-manager) 或其他类似产品。
{{% /alert %}}

### 本地开发的用户凭据 {#user-credentials}

使用用户凭据身份验证方法连接到 Google Cloud，以便在本地开发环境中工作。

1. 在运行 ADK Agent 应用程序 *之前*，使用应用默认凭据 (ADC) 对本地工作站进行身份验证：

    ```bash
    gcloud auth application-default login
    ```

2. 设置您的环境变量以启用 Agent 平台并指定您的项目详细信息：

{{< tabs tabTotal="2" >}}
{{% tab tabName=".env file" %}}

    ```console
    # Add to ADK code project but NOT source control
    GOOGLE_GENAI_USE_ENTERPRISE=TRUE
    GOOGLE_CLOUD_PROJECT=your-project-id
    GOOGLE_CLOUD_LOCATION=cloud-location   # example: us-central1
    ```

    {{% /tab %}}
    {{% tab tabName="Terminal" %}}

    ```bash
    export GOOGLE_GENAI_USE_ENTERPRISE=TRUE
    export GOOGLE_CLOUD_PROJECT="your-project-id"
    export GOOGLE_CLOUD_LOCATION="cloud-location"   # example: us-central1
    ```

    {{% /tab %}}
    {{< /tabs >}}
{{% alert context="info" %}}
**`GOOGLE_GENAI_USE_ENTERPRISE` 之前是 `GOOGLE_GENAI_USE_VERTEXAI`**

这些变量名是等效的，功能相同。
如果你设置了 `GOOGLE_GENAI_USE_ENTERPRISE` 并且你的 Agent 没有连接到 Agent 平台，你使用的是较旧的 ADK 版本。请使用 `GOOGLE_GENAI_USE_VERTEXAI`，或更新到较新版本的 ADK。
{{% /alert %}}

### 生产环境服务账户 {#service-account}

在部署到安全的托管环境时，使用服务账户进行连接认证：

1. 创建一个 [服务账户](https://docs.cloud.google.com/iam/docs/service-account-overview)，并授予它 `Agent Platform User` 角色。
2. 根据部署策略向你的 Agent 应用提供凭据：
    * **在 Google Cloud 上部署（Agent Runtime, Cloud Run, GKE）：**
      环境会自动提供凭据，无需配置密钥文件。
    * **外部运行：**生成一个 [服务账户密钥文件](https://cloud.google.com/iam/docs/keys-create-delete#console) (`.json`)，并配置 `GOOGLE_APPLICATION_CREDENTIALS` 环境变量：

        ```bash
        export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
        ```

{{% alert context="success" %}}
**工作负载身份选项**

除了使用密钥文件外，您还可以使用[工作负载身份](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)对服务账户进行身份验证。
{{% /alert %}}

### 测试用 Agent 平台快速模式 {#express-mode}

快速模式提供简化的基于 API 密钥的设置，便于原型开发，无需完整的gcloud认证。

1. 注册[快速模式](https://console.cloud.google.com/expressmode)以获取 API 密钥。
2. 设置以下环境变量：

    {{< tabs tabTotal="2" >}}
    {{% tab tabName=".env file" %}}

    ```console
    # Add to ADK code project but NOT source control
    GOOGLE_GENAI_USE_ENTERPRISE=TRUE
    GOOGLE_GENAI_API_KEY=PASTE_YOUR_ACTUAL_EXPRESS_MODE_API_KEY_HERE
    ```

    {{% /tab %}}
    {{% tab tabName="Terminal" %}}

    ```bash
    export GOOGLE_GENAI_USE_ENTERPRISE=TRUE
    export GOOGLE_GENAI_API_KEY="PASTE_YOUR_EXPRESS_MODE_API_KEY_HERE"
    ```

    {{% /tab %}}
    {{< /tabs >}}

## Google Cloud 托管模型 {#google-cloud-hosted-models}

Google Cloud Agent 平台托管了各种 AI 模型，您可以将其连接到您的 ADK Agent，包括 Gemini 模型、第三方 AI 模型、开源权重模型以及为您的组织定制调优的模型。一旦您将 ADK Agent 连接到 Google Cloud 和 Agent 平台，您就可以访问满足应用需求的 AI 模型。查看这些资源以探索并找到适合您项目的模型：

*   获取更多关于在 ADK Agent 中使用 [Gemini 模型](/docs/adk/build/models-for-agents/gemini/) 的信息。
*   在 [Agent 平台托管模型](/docs/adk/build/models-for-agents/agent-platform-hosted/) 中探索第三方和自定义模型选项，可用于 ADK Agent。
*   在 [Agent 平台](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models) 文档中查找 Google Cloud 提供的可用模型及模型 ID。

## 其他 Google Cloud 服务连接 {#additional-google-cloud-services-connections}

许多 Google Cloud 服务提供 ADK 集成，并带有用于通过 ADK Agent 访问 GCP API 或资源的身份验证辅助工具。更多信息，请参见以下页面：

* [Google Cloud 应用集成（官方英文）](https://adk.dev/integrations/application-integration/)
* [BigQuery 工具集（官方英文）](https://adk.dev/integrations/bigquery/)
* [BigQuery Agent 分析（官方英文）](https://adk.dev/integrations/bigquery-agent-analytics/)
* [数据 Agent（官方英文）](https://adk.dev/integrations/data-agent/)
* [模型防护（官方英文）](https://adk.dev/integrations/model-armor/)

---

原文：[Connect to Google Cloud and Agent Platform](https://adk.dev/get-started/google-cloud/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/google-cloud.md)
