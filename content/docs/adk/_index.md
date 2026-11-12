---
title: "Agent Development Kit (ADK)"
description: "Google Agent Development Kit（ADK）官方文档中文翻译，覆盖 Build Agents、Run Agents 与 Components，示例以 Python 和 Go 为主。"
icon: "smart_toy"
weight: 50
toc: true
type: "docs"
layout: "single"
params:
  docId: "adk"
cascade:
  params:
    docId: "adk"
---

Agent Development Kit（ADK）是 Google 开源的、以代码优先的 Agent 开发工具包，用于构建、评估和部署单 Agent 与多 Agent 系统。本中文版完整覆盖官方导航中的 Build Agents、Run Agents 和 Components 三部分。

{{% alert context="info" %}}
本套文档以官方文档提交 `e0bf69f`（2026-11-11）为固定基线。示例和版本说明以 Python ADK **2.14.0**、Go ADK **2.7.1** 为验证基准；安装命令保留官方无版本写法，升级前请核对当前 SDK。
{{% /alert %}}

## 阅读约定

- **Agent**、**Runner**、**Artifact** 等 ADK 专名保留英文；会话（Session）、工具（Tool）、事件（Event）等通用概念使用自然中文。
- 代码中的标识符、API 名称、模型名、环境变量、命令和协议值保持原文；代码注释和面向用户的说明文字译为中文。
- 官方原文中的 Python、Go 示例已内联到页面；TypeScript、Java、Kotlin 专属内容不包含在本套文档中。
- Mermaid 图标签已中文化，官方位图保持原样并保留中文图题和替代文本。
- 指向本套文档范围之外的链接会跳转官方英文页面，并标注“官方英文”。

## 三大分区

- **构建 Agent**：快速开始、Agent 类型、图工作流、多 Agent 编排和模型。
- **运行 Agent**：运行时、部署、可观测性、评估与安全。
- **组件**：工具、Artifact、Skills、应用管理、上下文、会话、事件、A2A、实时 Agent 和 Grounding。

## 版权与许可

原文来自 [google/adk-docs](https://github.com/google/adk-docs)，采用 [Apache License 2.0](https://github.com/google/adk-docs/blob/main/LICENSE)。中文译文保留逐页原文及固定提交链接，便于对照和后续更新。
