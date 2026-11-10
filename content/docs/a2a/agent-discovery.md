---
title: "Agent 发现"
description: "了解 Well-Known URI、注册表和私有配置等 Agent Card 发现方式，以及安全与缓存策略。"
icon: "travel_explore"
weight: 50
toc: true
---

要使用 Agent2Agent（A2A）协议协作，AI Agent 首先需要找到彼此并了解各自具备的能力。A2A 通过 **[Agent Card](https://a2a-protocol.org/latest/specification/#8-agent-discovery-the-agent-card)** 标准化 Agent 的自我描述。不过，这些 Agent Card 的发现方式会因环境和要求而异。Agent Card 定义 Agent 能提供什么，而客户端 Agent 可以通过多种策略发现这些 Card。选择哪种策略取决于部署环境和安全要求。

## Agent Card 的作用

Agent Card 是一份 JSON 文档，相当于 A2A 服务端（远端 Agent）的数字“名片”。它对 Agent 发现和交互至关重要。Agent Card 包含的关键信息如下：

- **身份**：包含 `name`、`description` 和 `provider` 信息。
- **服务端点**：指定 A2A 服务的 `url`。
- **A2A 能力**：列出 `streaming` 或 `pushNotifications` 等受支持特性。
- **鉴权**：说明要求的 `schemes`，例如 “Bearer” 或 “OAuth2”。
- **技能**：使用 `AgentSkill` 对象描述 Agent 的任务，包括 `id`、`name`、`description`、`inputModes`、`outputModes` 和 `examples`。

客户端 Agent 使用 Agent Card 判断某个 Agent 是否合适、构造请求，并确保安全通信。

## 发现策略

以下各节介绍客户端 Agent 发现远端 Agent Card 时常用的策略：

### 1. Well-Known URI

对于公开 Agent，或需要在特定域内被广泛发现的 Agent，推荐采用这种方式。

- **机制**：A2A 服务端将 Agent Card 托管在域内标准化 `well-known` URI 上，使其可被发现。标准路径为 `https://{agent-server-domain}/.well-known/agent-card.json`，遵循 [RFC 8615](https://datatracker.ietf.org/doc/html/rfc8615) 的原则。

- **流程**：
    1. 客户端 Agent 已知，或通过程序发现某个潜在 A2A 服务端的域名，例如 `smart-thermostat.example.com`。
    2. 客户端向 `https://smart-thermostat.example.com/.well-known/agent-card.json` 发起 HTTP GET 请求。
    3. 如果 Agent Card 存在且可访问，服务端会以 JSON 响应返回该 Card。

- **优势**：
    - 易于实现
    - 遵循标准
    - 便于自动发现

- **注意事项**：
    - 最适合开放的发现场景或受域名控制的发现场景。
    - 如果 Agent Card 包含敏感细节，承载 Agent Card 的端点必须启用鉴权。

### 2. 精选注册表（基于目录的发现）

这种方式用于企业环境或公开市场。在这些场景中，Agent Card 通常由中心注册表管理。精选注册表充当中心存储库，允许客户端根据“技能”或“标签”等条件查询和发现 Agent。

- **机制**：注册表这一中间服务维护 Agent Card 集合。客户端通过不同条件查询注册表，例如提供的技能、标签、提供商名称和能力，从而发现 Agent。

- **流程**：
    1. A2A 服务端将 Agent Card 发布到注册表。
    2. 客户端 Agent 查询注册表 API，并按“特定技能”等条件搜索。
    3. 注册表返回匹配的 Agent Card 或引用。

- **优势**：
    - 集中化管理和治理。
    - 基于能力的发现，例如按技能查找。
    - 支持访问控制和信任框架。
    - 适用于私有和公开市场。
- **注意事项**：
    - 需要部署和维护注册表服务。
    - 当前 A2A 规范尚未规定精选注册表的标准 API。

### 3. 直接配置 / 私有发现

这种方式用于紧耦合系统、私有 Agent 或开发场景。客户端通过配置直接获得 Agent Card 信息或 URL。

- **机制**：客户端应用使用硬编码信息、配置文件、环境变量或专有 API 进行发现。
- **流程**：具体流程取决于应用的部署和配置策略。
- **优势**：对于已知的静态关系，这种方式可以简单直接地建立连接。
- **注意事项**：
    - 不适合动态发现场景。
    - Agent Card 信息变化后，客户端必须重新配置。
    - 基于专有 API 的发现也缺少标准化。

## 保护 Agent Card

Agent Card 可能包含敏感信息，例如：

- 内部 Agent 或受限 Agent 的 URL。
- 敏感技能的描述。

### 保护机制

为降低风险，应考虑以下保护机制：

- **经过鉴权的 Agent Card**：对于敏感信息，或需要提供更详细 Card 的场景，建议使用[经过鉴权的扩展 Agent Card](https://a2a-protocol.org/latest/specification/#3111-get-extended-agent-card)。
- **安全端点**：在提供 Agent Card 的 HTTP 端点（例如 `/.well-known/agent-card.json` 或注册表 API）上实施访问控制。可采用以下方式：
    - 双向 TLS（mTLS）
    - 网络限制，例如 IP 范围
    - HTTP 鉴权，例如 OAuth 2.0

- **注册表选择性披露**：注册表根据客户端身份和权限返回不同的 Agent Card。

任何包含敏感数据的 Agent Card 都必须通过鉴权和授权机制保护。A2A 规范强烈建议使用带外的动态凭据，而不是在 Agent Card 中嵌入静态密钥。

## 缓存注意事项

Agent Card 描述 Agent 能力，通常很少变化，例如只在新增技能或更新鉴权要求时才会改变。对 Agent Card 端点应用标准 HTTP 缓存实践，可以减少不必要的网络请求，同时确保客户端最终获得更新后的信息。

### 服务端指南

托管 Agent Card 端点的服务端应在响应中包含 HTTP 缓存头。带有合适 `max-age` 指令的 `Cache-Control` 头允许客户端和中间缓存将 Card 缓存指定时长。加入 `ETag` 头（可以由 Card 的 `version` 字段或内容哈希生成）后，客户端可以发起条件请求，避免重新下载未变化的 Card。

### 客户端指南

获取 Agent Card 的客户端应遵循标准 HTTP 缓存语义。缓存 Card 过期后，客户端应使用条件请求，例如携带已保存 `ETag` 的 `If-None-Match` 或 `If-Modified-Since`，而不是无条件重新获取完整 Card。服务端未提供缓存头时，客户端可以应用合理的默认缓存时长。

对于扩展 Agent Card，客户端还应遵循[规范](https://a2a-protocol.org/latest/specification/#133-extended-agent-card-access-control)中描述的会话级缓存指南。

规范性要求请参阅规范[第 8.6 节](https://a2a-protocol.org/latest/specification/#86-caching)。

## 未来考虑

A2A 社区仍在探索注册表交互标准化或更高级发现协议的可能性。

---

原文：[Agent Discovery in A2A](https://a2a-protocol.org/latest/topics/agent-discovery/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/agent-discovery.md)
