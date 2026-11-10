---
title: "A2A 协议"
description: "A2A 官方核心文档中文翻译，以及配套的 Python 客户端和服务端示例。"
icon: "hub"
weight: 40
toc: true
type: "docs"
layout: "single"
params:
  docId: "a2a"
cascade:
  params:
    docId: "a2a"
---

Agent2Agent（A2A）是 AI Agent 之间通信的开放标准。它让由不同团队、框架或厂商实现的 Agent 使用共同语言协作，并在互操作的同时保持各自内部的模型、记忆和工具不对外暴露。

{{< alert context="info" text="本套文档以 **A2A Protocol v1.0.0** 和官方主线 2026-11-05 的文档提交 `9fff3e0` 为基线，完整翻译官方 Documentation 分组的 8 篇核心文档。Python 示例继续使用 **a2a-sdk 1.3.0**。" />}}

A2A 协议官方网站：[https://a2a-protocol.org/](https://a2a-protocol.org/)

## 关于本中文版

本套中文文档完整翻译自 A2A 官方 Documentation 分组，保留协议字段、RPC 名称、枚举值、代码和数据结构。各页面末尾均提供官方原文和固定源版本链接。
