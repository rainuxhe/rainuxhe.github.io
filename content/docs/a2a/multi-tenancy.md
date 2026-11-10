---
title: "多租户"
description: "通过 URL、鉴权凭据或 tenant 字段在同一部署中路由多个 Agent 和租户。"
icon: "apartment"
weight: 80
toc: true
---

单个 A2A 端点可以服务多个 Agent 或租户。A2A 协议不规定具体的路由实现，运营方可以自由选择最适合自身基础设施的方式。本文介绍协议支持的路由机制，以及 Agent Card 公布路由标识符时客户端必须遵循的规则。

## 概述

一种常见部署模式是将多个 Agent 放在同一主机或反向代理之后。从外部看，这些 Agent 都通过同一域名访问，但必须区分每个 Agent，才能把请求交付给正确的后端。

可以采用三种互补方式：

### 1. 基于 URL 的路由（子路径）

为每个 Agent 分配不同的 URL 前缀。每个 Agent 的 Agent Card 在 `supportedInterfaces` 中公布自己的 `url`，因此客户端会自动向正确路径发送请求。

“billing” Agent 的 Agent Card：

```json
{
  "name": "Billing Agent",
  "supportedInterfaces": [
    {
      "url": "https://agents.example.com/billing",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    }
  ]
}
```

“support” Agent 的 Agent Card：

```json
{
  "name": "Support Agent",
  "supportedInterfaces": [
    {
      "url": "https://agents.example.com/support",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    }
  ]
}
```

网关或反向代理将 `/billing/*` 和 `/support/*` 路由到相应后端。这是最简单的方式，客户端除读取 Agent Card 外不需要额外处理。

### 2. 基于鉴权头的路由

当多个 Agent 共享同一个 URL 时，网关可以利用请求中已有的鉴权凭据判断应将请求路由到哪个 Agent。鉴权要求在 Agent Card 的 `securitySchemes` 和 `security` 字段中声明，因此客户端可以完整发现这些要求。

示例：

- 一个 Bearer Token，其 Claims（例如 audience 或 scope）用于标识目标 Agent。
- 一个 API Key，在网关配置中映射到特定 Agent。

网关检查凭据后，将请求转发到适当后端，A2A 协议消息本身无需改变。

### 3. 使用 `tenant` 字段进行基于请求体的路由

每个 A2A 请求消息都包含可选的 `tenant` 字段。该字段是一个**不透明字符串**，其值完全由服务端运营方定义，协议不规定格式或语义。网关或 Agent 实现可以检查该字段，并把请求转发给适当后端。

客户端针对特定 Agent 应使用的 `tenant` 值，在 `supportedInterfaces` 内的 `AgentInterface` 条目中公布：

```json
{
  "name": "Billing Agent",
  "supportedInterfaces": [
    {
      "url": "https://agents.example.com/a2a",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0",
      "tenant": "billing"
    }
  ]
}
```

**客户端要求**：客户端**必须**在每条请求消息中原样回传从所选 `AgentInterface` 条目获得的 `tenant` 值。如果 `AgentInterface` 未设置 `tenant`，则请求中**必须**省略该字段。规范性规则请参阅规范[第 8.3.2 节](https://a2a-protocol.org/latest/specification/#832-client-protocol-selection)。

服务端可以用 `tenant` 字段表示任何适合其部署的路由键，例如 Agent 标识符、工作区 Slug、组织 ID 或其他不透明区分符。

## 组合使用这些方式

这三种方式并不互斥。例如，部署可以使用基于 URL 的路由来区分主要产品线，同时依靠 `tenant` 字段区分每条产品线中的各个客户。合适的组合取决于运营方架构和所用网关的能力。

## 发现多个 Agent

当多个 Agent 部署在共享域名之后时，每个 Agent **应**在适当位置发布自己的 Agent Card，参见 [Agent 发现](./agent-discovery/)。客户端会分别获取每个 Agent 的 Card，并使用其中的 `supportedInterfaces` 信息（包括任何 `tenant` 值）与正确 Agent 通信。

---

原文：[Multi-Tenancy and Multi-Agent Routing](https://a2a-protocol.org/latest/topics/multi-tenancy/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/multi-tenancy.md)
