---
title: "流式与异步操作"
description: "使用 SSE 流式接收 Task 更新，并通过安全 Webhook 处理长时间运行和断线场景。"
icon: "stream"
weight: 70
toc: true
---

Agent2Agent（A2A）协议专为处理可能无法立即完成的任务而设计。许多 AI 驱动的操作往往长时间运行，涉及多个步骤、产生增量结果，或需要人工介入。A2A 提供管理这类异步交互的机制，确保客户端无论持续保持连接，还是以更接近断开模式运行，都能有效接收更新。

## 使用 Server-Sent Events（SSE）流式传输

对于会产生增量结果的任务，例如生成长文档或流式传输媒体，或需要持续提供状态更新的任务，A2A 使用 Server-Sent Events（SSE）支持实时通信。当客户端能够与 A2A 服务端保持活动 HTTP 连接时，这种方式最为理想。

以下关键特性说明 A2A 协议如何实现和管理 SSE 流式传输：

- **服务端能力**：A2A 服务端必须在 Agent Card 中设置 `capabilities.streaming: true`，以表明支持流式传输。

- **发起流**：客户端使用 `SendStreamingMessage` RPC 方法发送初始消息，例如提示或命令，同时订阅该 Task 的更新。

- **服务端响应与连接**：订阅成功后，服务端返回 HTTP 200 OK 状态和 `Content-Type: text/event-stream`。HTTP 连接保持打开，供服务端向客户端推送事件。

- **事件结构与类型**：服务端通过该流发送事件。每个事件的 `data` 字段包含 JSON-RPC 2.0 Response 对象，通常是 `SendStreamingMessageResponse`。`SendStreamingMessageResponse` 的 `result` 字段包含：

    - [`Task`](https://a2a-protocol.org/latest/specification/#411-task)：表示当前工作状态。
    - [`TaskStatusUpdateEvent`](https://a2a-protocol.org/latest/specification/#421-taskstatusupdateevent)：传达 Task 生命周期状态变化，例如从 `working` 变为 `input-required` 或 `completed`，同时提供 Agent 的中间消息。
    - [`TaskArtifactUpdateEvent`](https://a2a-protocol.org/latest/specification/#422-taskartifactupdateevent)：交付 Task 生成的新 Artifact 或更新后的 Artifact。大型文件或数据结构可使用 `append` 和 `lastChunk` 等字段分块流式传输，以便重新组装。

- **流终止**：当 Task 进入终止状态或中断状态（例如 `COMPLETED`、`FAILED`、`CANCELED`、`REJECTED` 或 `INPUT_REQUIRED`）时，服务端关闭流，不再发送更新。

- **重新订阅**：如果 Task 仍处于活动状态时客户端 SSE 连接意外中断，客户端可以使用 `SubscribeToTask` RPC 方法尝试重新连接流。

### 何时使用流式传输

SSE 流式传输最适合：

- 实时监控长时间运行任务的进度。
- 增量接收大型结果（Artifact）。
- 进行交互式对话，其中即时反馈或部分响应能带来明显收益。
- 需要从 Agent 获得低延迟更新的应用。

### 协议规范参考

详细结构请参阅协议规范：

- [`SendStreamingMessage`](https://a2a-protocol.org/latest/specification/#312-send-streaming-message)
- [`SubscribeToTask`](https://a2a-protocol.org/latest/specification/#316-subscribe-to-task)

## 面向断线场景的推送通知

对于运行时间极长的 Task（例如持续数分钟、数小时甚至数天），或客户端无法、不愿意保持持久连接的场景（例如移动客户端或无服务器函数），A2A 支持使用推送通知进行异步更新。当 Task 发生重要更新时，A2A 服务端可以主动通知客户端提供的 Webhook。

以下关键特性说明 A2A 协议如何实现和管理推送通知：

- **服务端能力**：A2A 服务端必须在 Agent Card 中设置 `capabilities.pushNotifications: true`，以表明支持该特性。
- **配置**：客户端向服务端提供 [`TaskPushNotificationConfig`](https://a2a-protocol.org/latest/specification/#431-taskpushnotificationconfig)。可以在以下时机提供配置：
    - 在初始 `SendMessage` 或 `SendStreamingMessage` 请求中提供，或
    - 对已有 Task 单独调用 `CreateTaskPushNotificationConfig` RPC 方法提供。
    `TaskPushNotificationConfig` 包含 `url`（HTTPS Webhook URL）、可选的 `token`（供客户端校验）以及可选的 `authentication` 详情（供 A2A 服务端向 Webhook 鉴权）。
- **通知触发**：A2A 服务端决定何时发送推送通知，通常是在 Task 出现重要状态变化时，例如进入终止状态、`input-required` 或 `auth-required`。
- **通知载荷**：A2A 协议将 HTTP Body 载荷定义为 [`StreamResponse`](https://a2a-protocol.org/latest/specification/#323-stream-response) 对象，其格式与流式操作一致。载荷包含 `task`、`message`、`statusUpdate` 或 `artifactUpdate` 之一。详细结构请参阅[推送通知载荷](https://a2a-protocol.org/latest/specification/#433-push-notification-payload)。
- **客户端操作**：收到推送通知并成功验证真实性后，客户端通常使用通知中的 `taskId` 调用 `GetTask` RPC 方法，获取完整的更新后 `Task` 对象，包括任何新 Artifact。

### 何时使用推送通知

推送通知最适合：

- 可能需要数分钟、数小时甚至数天才能完成的长时间运行 Task。
- 无法或不愿保持持久连接的客户端，例如移动应用或无服务器函数。
- 客户端只需了解重要状态变化，而不需要持续更新的场景。

### 协议规范参考

详细结构请参阅协议规范：

- [`CreateTaskPushNotificationConfig`](https://a2a-protocol.org/latest/specification/#317-create-push-notification-config)
- [`GetTask`](https://a2a-protocol.org/latest/specification/#313-get-task)

### 客户端推送通知服务

`TaskPushNotificationConfig.url` 指定的 `url` 指向客户端推送通知服务。该服务负责接收 A2A 服务端发来的 HTTP POST 通知，包括验证入站通知、检查通知是否相关，并把通知或其内容转发给适当的客户端应用逻辑或系统。

### 推送通知的安全注意事项

推送通知由服务端主动发起、具有异步性质，因此安全至关重要。发送通知的 A2A 服务端和接收通知的客户端 Webhook 都承担关键责任。

#### A2A 服务端安全（向客户端 Webhook 发送通知时）

- **Webhook URL 校验**：服务端不应盲目信任客户端提供的任意 URL，并向其发送 POST 请求。恶意客户端可以提交指向内部服务或无关第三方系统的 URL，导致服务端请求伪造（SSRF）攻击，或使其成为分布式拒绝服务（DDoS）放大器。
    - **缓解措施**：使用受信任域名允许列表、所有权验证（例如质询-响应机制）和网络控制（例如出口防火墙）。
- **向客户端 Webhook 鉴权**：A2A 服务端必须按照 `TaskPushNotificationConfig.authentication` 指定的方案向客户端 Webhook URL 证明自身身份。常见方案包括 Bearer Token（OAuth 2.0）、API Key、HMAC 签名或双向 TLS（mTLS）。

#### 客户端 Webhook 接收方安全（接收 A2A 服务端通知时）

- **验证 A2A 服务端身份**：Webhook 端点必须严格验证入站通知请求的真实性，确保请求来自合法的 A2A 服务端，而不是冒充者。
    - **验证方法**：校验签名或 Token，例如使用 A2A 服务端的受信任公钥验证 JWT 签名、校验 HMAC 签名或 API Key。如果提供了 `TaskPushNotificationConfig.token`，还应验证该值。
- **防止重放攻击**：
    - **时间戳**：通知应包含时间戳。Webhook 应拒绝过旧的通知。
    - **Nonce/唯一 ID**：对于关键通知，应考虑使用唯一的单次标识符，例如 JWT 的 `jti` Claim 或事件 ID，防止重复处理同一通知。
- **安全的密钥管理与轮换**：实施安全的密钥管理实践，包括定期轮换密钥，尤其是密码学密钥。JWKS（JSON Web Key Set）等协议有助于轮换非对称密钥。

#### 非对称密钥流程示例（JWT + JWKS）

1. 客户端创建 `TaskPushNotificationConfig`，指定 `authentication.scheme: "Bearer"`，并可选地指定 JWT 预期的 `issuer` 或 `audience`。
2. A2A 服务端在发送通知时：
    - 生成 JWT，并使用私钥签名。JWT 包含 `iss`（签发者）、`aud`（受众）、`iat`（签发时间）、`exp`（过期时间）、`jti`（JWT ID）和 `taskId` 等 Claim。
    - JWT Header 指明签名算法和密钥 ID（`kid`）。
    - A2A 服务端通过 JWKS 端点公开其公钥。
3. 客户端 Webhook 收到通知后：
    - 从 Authorization 头提取 JWT。
    - 检查 JWT Header 中的 `kid`（密钥 ID）。
    - 从 A2A 服务端的 JWKS 端点获取对应公钥，建议缓存公钥。
    - 使用公钥验证 JWT 签名。
    - 校验 Claim（`iss`、`aud`、`iat`、`exp`、`jti`）。
    - 如果提供了 `TaskPushNotificationConfig.token`，则进行验证。

这种分层、全面的推送通知安全方案有助于确保消息真实、完整且及时，同时保护发送通知的 A2A 服务端和接收通知的客户端 Webhook 基础设施。

---

原文：[Streaming and Asynchronous Operations for Long-Running Tasks](https://a2a-protocol.org/latest/topics/streaming-and-async/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/streaming-and-async.md)
