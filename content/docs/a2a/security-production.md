---
title: "安全与生产边界"
description: "鉴权、推送通知、任务存储、可观测性，以及从 A2A v0.3 迁移时的注意事项。"
icon: "shield"
weight: 50
toc: true
---

## 传输与鉴权

生产环境的 A2A 服务必须使用 HTTPS。Agent Card 通过 `securitySchemes` 声明调用方应如何鉴权，常见方式包括 OAuth 2.0、Bearer Token、API Key 和 mTLS。

凭据通过 HTTP 头或底层传输传递，不应写入 Message 或 Artifact。服务端需要在每次请求上完成三项检查：

1. 验证调用方身份和凭据有效期。
2. 只返回该调用方有权查看的 Task、历史和 Artifact。
3. 检查调用方是否有权执行指定 Skill、取消 Task 或订阅事件。

公开 Agent Card 不应泄露内部 URL、敏感技能或密钥。更多能力可以放在需要鉴权的 Extended Agent Card 中，通过 `GetExtendedAgentCard` 获取。

## 任务可见性与多租户

`taskId` 和 `contextId` 不是授权凭据。知道 ID 不代表有权读取数据。自建服务应以“调用方身份 + 租户 + Task”为访问边界，避免不同用户之间横向越权。

v1.0 在请求模型中增加了租户字段，`AgentInterface` 也可以声明默认租户。多租户实现还要把租户隔离落实到任务存储、Artifact 存储、日志和后台任务中。

## 推送通知安全

推送通知适合客户端无法持续保持连接的极长任务。启用后，服务端会向客户端注册的 Webhook 发送任务更新。

服务端必须避免把任意 URL 当作可请求目标，否则可能形成 SSRF。至少应使用域名允许列表、所有权验证和网络出口限制。客户端 Webhook 则必须：

- 验证服务端身份，例如 JWT 签名、HMAC 或 mTLS。
- 检查时间戳、受众和唯一事件 ID，防止重放。
- 在通知后调用 `GetTask` 获取完整状态，不盲目信任通知正文。

Webhook 的认证密钥要支持轮换，并保存在密钥管理系统中。

## 从示例走向生产

本文的 `InMemoryTaskStore` 只用于让示例保持简单。生产环境至少需要考虑：

- 用数据库或专用存储持久化 Task、事件和 Artifact。
- 为并发执行、取消、断线重订阅和重复请求设计一致的并发控制。
- 给消息发送、任务查询和流设置独立超时与请求限额。
- 记录 `taskId`、`contextId`、租户、协议版本和状态转换，同时对敏感内容脱敏。
- 导出延迟、错误率、活动流数量、任务停留时间和后端执行耗时等指标。
- 对 Agent Card 和任务接口分别配置缓存、CORS、鉴权和反向代理规则。

Agent Card 的 `supportedInterfaces[].url` 必须是外部可达地址。经过反向代理和负载均衡后，内部监听地址通常不能直接写进生产 Agent Card。

## v0.3 到 v1.0 的迁移重点

旧示例常见以下差异：

| v0.3 写法 | v1.0 写法 |
|---|---|
| `message/send`、`message/stream` | `SendMessage`、`SendStreamingMessage` |
| `tasks/get`、`tasks/cancel`、`tasks/resubscribe` | `GetTask`、`CancelTask`、`SubscribeToTask` |
| Agent Card 顶层 `url`、`protocolVersion` | `supportedInterfaces[]` 中的 `url`、`protocolVersion` |
| `"completed"`、`"input-required"` | `TASK_STATE_COMPLETED`、`TASK_STATE_INPUT_REQUIRED` |
| `TextPart`、`FilePart`、`DataPart` 与 `kind` | 统一 `Part`，通过 `text`、`url`、`raw`、`data` 区分 |
| `mimeType` | `mediaType` |
| HTTP+JSON 的 `/v1/message:send` | `/message:send` |

迁移时不要只替换方法名。还要重新验证 Agent Card、JSON 枚举、流事件判别方式、推送通知配置和 HTTP+JSON 路径。v1.0 还把 `a2a.proto` 作为规范来源，RPC 名称和字段命名应优先以当前规范和对应 SDK 为准。

## 上线检查表

- Agent Card 中的 URL、版本、能力和鉴权声明与真实服务一致。
- 公开端点强制 HTTPS，并按调用方限制 Task 和 Artifact 访问。
- 长任务有持久化、超时、取消和断线恢复策略。
- 流式响应和推送通知都经过负载测试与故障恢复测试。
- 日志不泄露 Token、消息正文中的敏感数据或私有 Artifact。
- SDK、协议版本和迁移说明在升级时有明确的回归用例。

## 参考资料

- [A2A Protocol 官方文档](https://a2a-protocol.org/latest/)
- [A2A v1.0 规范](https://a2a-protocol.org/latest/specification/)
- [Core Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)
- [Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)
- [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)
- [Streaming and Asynchronous Operations](https://a2a-protocol.org/latest/topics/streaming-and-async/)
- [What's New in A2A Protocol v1.0](https://a2a-protocol.org/latest/whats-new-v1/)
- [A2A Python 教程](https://a2a-protocol.org/latest/tutorials/python/1-introduction/)
- [A2A Python SDK API](https://a2a-protocol.org/latest/sdk/python/api/)
