---
title: "Task 的生命周期"
description: "理解 Task 与 Message 的选择、上下文关联、不可变性、并行后续任务和 Artifact 演进。"
icon: "timeline"
weight: 40
toc: true
---

在 Agent2Agent（A2A）协议中，交互形式差异很大，既可能是简单、无状态的交换，也可能是复杂、长时间运行的过程。Agent 收到客户端发来的消息后，可以通过以下两种方式之一作出响应：

- **以无状态 `Message` 响应**：适用于即时、自包含的交互。这类交互结束后不需要维护任何状态。
- **发起有状态 `Task`**：Agent 让 `Task` 经过定义好的生命周期，按需报告进度并请求输入，直到进入中断状态（例如 `input-required` 或 `auth-required`）或终止状态（例如 `completed`、`canceled`、`rejected` 或 `failed`）。

## 将相关交互归为一组

`contextId` 是一个关键标识符。它将多个 `Task` 对象和独立的 `Message` 对象归为一组，使一系列交互保持连续性。

- 客户端首次发送消息时，Agent 会返回新的 `contextId`。如果发起了 Task，该 Task 还会有一个 `taskId`。
- 要继续先前的交互，客户端应在后续消息中携带相同的 `contextId`。
- 客户端可以选择在后续消息中附带 `taskId`，表示该消息继续某个特定 Task。

`contextId` 让多个参与者可以围绕共同目标协作，也支持在多个可能同时运行的 Task 之间共享会话。在内部，A2A Agent（尤其是使用 LLM 的 Agent）会利用 `contextId` 管理会话状态或 LLM 上下文。

## Agent 响应：Message 还是 Task

选择以 `Message` 还是 `Task` 响应，取决于交互性质和 Agent 能力：

- **简单交互使用 Message**：`Message` 对象适用于事务性交互，这类交互不需要长时间处理或复杂状态。Agent 可以在正式创建 `Task` 前，通过 Message 与客户端商定任务范围。
- **有状态交互使用 Task**：Agent 将收到的消息映射到受支持的能力。当该能力需要在较长时间内执行大量可跟踪的工作时，Agent 会使用 `Task` 对象响应。

从概念上说，Agent 可以按不同复杂度层级运行：

- **仅使用 Message 的 Agent**：始终以 `Message` 对象响应。这类 Agent 通常不管理复杂状态或长时间执行，并使用 `contextId` 关联消息。它们可能直接包装 LLM 调用和简单工具。
- **生成 Task 的 Agent**：始终以 `Task` 对象响应，即使只是普通回复，也会建模为已完成的 Task。Task 创建后，Agent 只返回 `Task` 对象；Task 完成后，不能再发送消息。这消除了 Task 与 Message 之间的选择问题，但即使简单交互也会创建已完成的 Task 对象。
- **混合型 Agent**：同时生成 `Message` 和 `Task` 对象。这类 Agent 先通过 Message 协商 Agent 能力和工作范围，再发送 `Task` 对象跟踪执行，并管理 `input-required` 或错误处理等状态。换言之，`Message` 对象承载用于确定工作内容的轻量往返沟通；一旦有确定的工作需要执行和观察，就会创建 `Task`。与生成 Task 的 Agent 相同，Task 创建后，Agent 对后续消息只返回 `Task` 对象，并且 Task 完成后不能再向它发送消息。

    有关何时使用 Message、何时使用 Task 的更深入讨论，请参阅 [A2A protocol: Demystifying Tasks vs Messages](https://discuss.google.dev/t/a2a-protocol-demystifying-tasks-vs-messages/255879)。

## Task 细化

客户端经常需要根据 Task 结果发送新请求，或对先前 Task 的输出进行细化。这种交互通过使用与原 Task 相同的 `contextId` 启动新一轮交互来建模。客户端还可以在 `Message` 对象中通过 `referenceTaskIds` 引用原 Task，向 Agent 提供更多线索。随后，Agent 会以新的 `Task` 或 `Message` 响应。

## Task 不可变性

Task 一旦进入终止状态（completed、canceled、rejected 或 failed），就不能重新启动。与该 Task 有关的任何后续交互，例如细化，必须在同一个 `contextId` 中发起新 Task。这一原则带来以下好处：

- **Task 不可变**：客户端可以可靠地引用某个 Task 及其状态、Artifact 和 Message。输入与输出之间形成清晰映射，便于编排和追踪。
- **明确的工作单元**：每个新请求、细化或后续任务都会成为独立 Task。这简化了记录管理，可以细粒度跟踪 Agent 工作，并让每个 Artifact 都能追溯到特定工作单元。
- **更易实现**：Agent 开发者不再需要判断应该创建新 Task 还是重新启动已有 Task。

## 并行后续任务

A2A 支持并行工作：Agent 可以为同一个 `contextId` 中发送的每条后续消息创建独立的并行 Task。客户端因此可以跟踪各个 Task，并在前置 Task 完成后立即创建新的依赖 Task。

例如：

- Task 1：预订飞往赫尔辛基的航班。
- Task 2：根据 Task 1 预订酒店。
- Task 3：根据 Task 1 预订雪地摩托活动。
- Task 4：根据 Task 2 为酒店预订添加水疗预约。

## 引用先前的 Artifact

服务端 Agent 会根据被引用的 Task 或 `contextId` 推断相关 Artifact。作为领域专家，Agent 最适合消除歧义或发现缺失信息。遇到歧义时，Agent 会进入 `input-required` 状态，要求客户端澄清。客户端随后在响应中指明 Artifact，并可以在 `Part` 元数据中添加 Artifact 引用（`artifactId`、`taskId`）。

## 跟踪 Artifact 变更

后续任务或细化任务经常基于旧 Artifact 创建新 Artifact。应跟踪这些变更，以便后续交互只使用最新版本。可以把它理解为版本历史：每个新 Artifact 都链接到前一个 Artifact。

客户端最适合管理这种 Artifact 链接关系。客户端决定什么算可接受的结果，并可以接受或拒绝新版本。因此，服务端 Agent 不应跟踪 Artifact 变更，这种链接关系也不属于 A2A 协议规范。客户端应自行维护版本历史，并向用户展示最新可接受的版本。

为便于客户端跟踪，服务端 Agent 在生成现有 Artifact 的细化版本时，应复用一致的 `artifact-name`。

对于后续任务或细化任务，客户端应明确指出希望细化哪个 Artifact，最好是它视角下的“最新”版本。如果客户端没有提供 Artifact 引用，服务端 Agent 可以：

- 尝试根据当前 `contextId` 推断目标 Artifact。
- 如果存在歧义或上下文不足，Agent 应返回 `input-required` 的 Task 状态，要求客户端澄清。

## 后续任务示例

下面的示例展示了包含后续任务的典型 Task 流程：

1. 客户端向 Agent 发送消息：

    ```json
    {
      "jsonrpc": "2.0",
      "id": "req-001",
      "method": "SendMessage",
      "params": {
        "message": {
          "role": "user",
          "parts": [
            {
              "text": "Generate an image of a sailboat on the ocean."
            }
          ],
          "messageId": "msg-user-001"
        }
      }
    }
    ```

2. Agent 返回一张帆船图片，对应已完成的 Task：

    ```json
    {
      "jsonrpc": "2.0",
      "id": "req-001",
      "result": {
        "task": {
          "id": "task-boat-gen-123",
          "contextId": "ctx-conversation-abc",
          "status": {
            "state": "TASK_STATE_COMPLETED"
          },
          "artifacts": [
            {
              "artifactId": "artifact-boat-v1-xyz",
              "name": "sailboat_image.png",
              "description": "A generated image of a sailboat on the ocean.",
              "parts": [
                {
                  "filename": "sailboat_image.png",
                  "mediaType": "image/png",
                  "raw": "base64_encoded_png_data_of_a_sailboat"
                }
              ]
            }
          ]
        }
      }
    }
    ```

3. 客户端要求把船涂成红色。这个细化请求引用先前的 `taskId`，并使用相同的 `contextId`。

    ```json
    {
      "jsonrpc": "2.0",
      "id": "req-002",
      "method": "SendMessage",
      "params": {
        "message": {
          "role": "user",
          "messageId": "msg-user-002",
          "contextId": "ctx-conversation-abc",
          "referenceTaskIds": [
            "task-boat-gen-123"
          ],
          "parts": [
            {
              "text": "Please modify the sailboat to be red."
            }
          ]
        }
      }
    }
    ```

4. Agent 返回一个新的图片 Artifact：新 Task、相同上下文、相同 Artifact 名称。Agent 在同一个 `contextId` 中创建新 Task。新的帆船图片 Artifact 保持相同名称，但具有新的 `artifactId`。

    ```json
    {
      "jsonrpc": "2.0",
      "id": "req-002",
      "result": {
        "task": {
          "id": "task-boat-color-456",
          "contextId": "ctx-conversation-abc",
          "status": {
            "state": "TASK_STATE_COMPLETED"
          },
          "artifacts": [
            {
              "artifactId": "artifact-boat-v2-red-pqr",
              "name": "sailboat_image.png",
              "description": "A generated image of a red sailboat on the ocean.",
              "parts": [
                {
                  "filename": "sailboat_image.png",
                  "mediaType": "image/png",
                  "raw": "base64_encoded_png_data_of_a_RED_sailboat"
                }
              ]
            }
          ]
        }
      }
    }
    ```

---

原文：[Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/) · [固定源版本](https://github.com/a2aproject/A2A/blob/9fff3e08ab33bb7674e7d98fc7c08ae8592bb4bd/docs/topics/life-of-a-task.md)
