---
title: "A2A 协议"
description: "使用 Agent Development Kit (ADK)，您可以构建复杂的多 Agent 系统，其中不同的 Agent 需要使用 Agent2Agent (A2A) 协议进行协作和交互！本节提供了构建的全面指南"
icon: "hub"
weight: 70
toc: true
---

支持版本：Python, Go。

通过 Agent Development Kit（ADK），您可以构建复杂的多 Agent 系统，其中不同的 Agent 需要使用 [Agent2Agent (A2A) Protocol](https://a2a-protocol.org/) 进行协作和交互。本节提供了构建强大多 Agent 系统的全面指南，Agent 可以安全高效地通信和协作。

{{% alert context="default" %}}
**在 Go 和 Java 中为实验性**

A2A 支持在 ADK Go、ADK Java 和 ADK Kotlin 中是实验性的。
{{% /alert %}}
请浏览以下指南以了解 ADK 的 A2A 功能：

  **[A2A 介绍 ](/docs/adk/components/a2a-protocol/introduction-to-a2a/)**

  从这里开始，通过构建一个包含根 Agent、本地子 Agent 和远程 A2A Agent 的多 Agent 系统来学习 A2A 的基本原理。以下指南涵盖了如何将您的 Agent 公开，使其他 Agent 可以通过 A2A 协议使用：

  *   **[A2A 快速入门（公开）- Python ](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/python/)**
  *   **[A2A 快速入门（公开）- Go ](/docs/adk/components/a2a-protocol/a2a-quickstart-exposing/go/)**
  *   **[A2A 快速入门（公开）- Java（官方英文）](https://adk.dev/a2a/quickstart-exposing-java/)**

  这些指南演示了如何允许您的 Agent 使用另一个远程 Agent 通过 A2A 协议：

  *   **[A2A 快速入门（使用）- Python ](/docs/adk/components/a2a-protocol/a2a-quickstart-consuming/python/)**
      * **[A2A 扩展 - V2 实现 ](/docs/adk/components/a2a-protocol/a2a-extension/)**
  *   **[A2A 快速入门（使用）- Go ](/docs/adk/components/a2a-protocol/a2a-quickstart-consuming/go/)**
  *   **[A2A 快速入门（使用）- Java（官方英文）](https://adk.dev/a2a/quickstart-consuming-java/)**

  [**Agent2Agent (A2A) 协议官方站点 ](https://a2a-protocol.org/)**

  A2A 协议的官方网站。

---

原文：[Agent2Agent (A2A) Protocol for ADK](https://adk.dev/a2a/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/a2a/index.md)
