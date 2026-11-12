---
title: "部署"
description: "一旦你使用 ADK 构建并测试了你的 Agent，下一步就是部署它，以便可以在生产环境中访问、查询和使用，或与其他应用程序集成。部署将你的 Agent 从本地环境移动到"
icon: "article"
weight: 20
toc: true
---

一旦你使用 ADK 构建并测试了你的 Agent，下一步就是部署它，使其可以被访问、查询并在生产环境中使用，或与其他应用程序集成。部署将你的 Agent 从本地开发机器迁移到一个可扩展且可靠的环境。

![部署你的 Agent](/images/adk/deploy-agent.png)

## 部署选项 {#deployment-options}

你的 ADK Agent 可以根据你对生产就绪性或自定义灵活性的需求，部署到不同的环境中：

### 在 Agent 平台上的 Agent 运行时 {#agent-runtime-on-agent-platform}

[Agent 运行时](/docs/adk/run/deployment/agent-runtime/) 是 Google Cloud 上的全管理自动扩展服务，专门用于部署、管理和扩展使用 ADK 等框架构建的 AI Agent。

了解更多关于 [将你的 Agent 部署到 Agent 运行时](/docs/adk/run/deployment/agent-runtime/)。

### Cloud Run {#cloud-run}

[Cloud Run](https://cloud.google.com/run) 是 Google Cloud 上的管理型自动扩展计算平台，使你能够将 Agent 作为基于容器的应用程序运行。

了解更多关于 [将你的 Agent 部署到 Cloud Run](/docs/adk/run/deployment/cloud-run/)。

### Google Kubernetes Engine (GKE) {#google-kubernetes-engine-gke}

[Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine) 是 Google Cloud 的托管 Kubernetes 服务，允许你在容器化环境中运行 Agent。如果你需要对部署进行更多控制，以及运行开源模型，GKE 是一个很好的选择。

了解更多关于 [将你的 Agent 部署到 GKE](/docs/adk/run/deployment/gke/)。

### 其他支持容器的基础设施 {#other-container-friendly-infrastructure}

你可以手动将你的 Agent 打包成容器镜像，然后在任何支持容器镜像的环境中运行。例如，你可以在本地使用 Docker 或 Podman 运行。如果你更倾向于离线或断开连接环境运行，或者在没有 Google Cloud 连接的系统中运行，这是一个不错的选项。

按照 [将你的 Agent 部署到 Cloud Run](/docs/adk/run/deployment/cloud-run/#deployment-commands) 的说明进行操作。在 gcloud CLI 的“部署命令”部分，你会找到一个 FastAPI 入口点示例和 Dockerfile。

---

原文：[Deploying Your Agent](https://adk.dev/deploy/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/index.md)
