---
title: "API 服务器"
description: "在部署您的 Agent 之前，您应先对其进行测试，以确保其按预期工作。使用 ADK 中的 API 服务器通过 REST API 暴露您的 Agent，以便进行程序化测试和集成。"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

在部署您的 Agent 之前，您应该先测试它，以确保它按预期工作。使用 ADK 中的 API 服务器，通过 REST API 暴露您的 Agent，以便进行程序化测试和集成。

![ADK API Server](/images/adk/adk-api-server.png)

## 启动 API 服务器 {#start-the-api-server}

使用以下命令在 ADK API 服务器中运行您的 Agent：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
adk api_server
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，没有独立的 `adk` 命令行工具。相反，你需要将启动器直接嵌入到 Agent 的 `main.go` 中。`full.NewLauncher()` 辅助工具将 REST API、Web 界面和其他模式打包成一个单一的二进制文件：

```go title="main.go"
import (
    "google.golang.org/adk/v2/cmd/launcher"
    "google.golang.org/adk/v2/cmd/launcher/full"
)

func main() {
    // ... 构建你的 Agent 和配置 ...
    l := full.NewLauncher()
    if err := l.Execute(ctx, config, os.Args[1:]); err != nil {
        log.Fatalf("Run failed: %v\n\n%s", err, l.CommandLineSyntax())
    }
}
```

然后通过在命令行上传递 `web` 和 `api` 子命令来启动 API 服务器：

```shell
go run agent.go web api
```

`web` 关键字激活 HTTP 服务器。`api` 添加 ADK REST API 后端并默认在 `/api` 路径前缀下注册所有路由。
{{% /tab %}}
{{< /tabs >}}
此命令将启动本地 Web 服务器，您可以在其中运行 cURL 命令或发送 API 请求来测试您的 Agent。默认情况下，服务器运行在 `http://localhost:8000`。

{{% alert context="success" %}}
**高级用法和调试**

有关所有可用端点、请求/响应格式及调试技巧（包括如何使用交互式 API 文档）的完整参考，请参见下方的 **ADK API 服务器指南**。
{{% /alert %}}

## 本地测试 {#test-locally}

本地测试涉及启动本地 Web 服务器、创建会话并向 Agent 发送查询。首先，确保您处于正确的工作目录。

对于 TypeScript，您应位于 Agent 项目目录本身。

```console
parent_folder/
└── my_sample_agent/  <-- For TypeScript, run commands from here
    └── agent.py (or Agent.java or agent.ts)
```

**启动本地服务器**

接下来，使用上面列出的命令启动本地服务器。

输出应类似于：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
2025/01/01 00:00:00 Starting the web server: &{port:8080 ...}
2025/01/01 00:00:00 Web servers starts on http://localhost:8080
2025/01/01 00:00:00        api:  you can access API using http://localhost:8080/api
2025/01/01 00:00:00        api:      for instance: http://localhost:8080/api/list-apps
```

{{% alert context="info" %}}
**Go：默认端口和路径前缀**

Go API 服务器默认使用端口 **8080**（不是 8000），并且默认在 **`/api`** 路径前缀下提供所有 REST 端点。请相应调整下面所有示例 `curl` 命令：
{{% /alert %}}
| Python/TypeScript/Java | Go |
|---|---|
| `http://localhost:8000/list-apps` | `http://localhost:8080/api/list-apps` |
| `http://localhost:8000/apps/…` | `http://localhost:8080/api/apps/…` |
| `http://localhost:8000/run` | `http://localhost:8080/api/run` |
| `http://localhost:8000/run_sse` | `http://localhost:8080/api/run_sse` |

可以通过 `-port` 标志在 `web` 子命令上更改端口，通过 `-path_prefix` 标志在 `api` 子命令上更改前缀。例如：

```shell
go run agent.go web -port 8000 api -path_prefix ""
```

{{% /tab %}}
{{< /tabs >}}
您的服务器现在已在本地运行。请确保在所有后续命令中使用正确的**_端口号_**。

**创建新会话**

在 API 服务器仍在运行的情况下，打开一个新的终端窗口或标签，并使用以下命令与 Agent 创建新会话：

```shell
curl -X POST http://localhost:8000/apps/my_sample_agent/users/u_123/sessions/s_123 \
  -H "Content-Type: application/json" \
  -d '{"key1": "value1", "key2": 42}'
```

让我们分解一下发生了什么：

* `http://localhost:8000/apps/my_sample_agent/users/u_123/sessions/s_123`：这会为您的 Agent `my_sample_agent`（Agent 文件夹的名称）、用户 ID（`u_123`）和会话 ID（`s_123`）创建一个新的会话。您可以将 `my_sample_agent` 替换为您的 Agent 文件夹名称。您可以将 `u_123` 替换为特定的用户 ID，将 `s_123` 替换为特定的会话 ID。
* `{"key1": "value1", "key2": 42}`：这是可选的。您可以在创建会话时使用它来自定义 Agent 的预先存在的状态（字典）。

如果会话创建成功，这应该会返回会话信息。输出应类似于：

```json
{"id":"s_123","appName":"my_sample_agent","userId":"u_123","state":{"key1":"value1","key2":42},"events":[],"lastUpdateTime":1743711430.022186}
```

{{% alert context="info" %}}

您不能使用完全相同的用户ID和会话ID创建多个会话。如果尝试，您可能会看到类似的响应：`{"detail":"Session already exists: s_123"}`。要解决此问题，您可以删除该会话（例如，`s_123`），或者选择一个不同的会话ID。
{{% /alert %}}
**发送查询**

有两种方式通过POST向您的 Agent 发送查询，通过`/run`或`/run_sse`路由。

* `POST http://localhost:8000/run`：将所有事件收集为列表，然后一次性返回该列表。适用于大多数用户（如果不确定，我们建议使用此方式）。
* `POST http://localhost:8000/run_sse`：以服务器发送事件（Server-Sent-Events）的形式返回，这是一个事件对象流。适用于希望在事件可用时立即收到通知的用户。通过`/run_sse`，您还可以设置`streaming`为`true`以启用令牌级别的流式传输。

**使用`/run`**

```shell
curl -X POST http://localhost:8000/run \
-H "Content-Type: application/json" \
-d '{
"appName": "my_sample_agent",
"userId": "u_123",
"sessionId": "s_123",
"newMessage": {
    "role": "user",
    "parts": [{
    "text": "Hey whats the weather in new york today"
    }]
}
}'
```

在 TypeScript 中，目前仅支持 `camelCase` 字段名称（例如 `appName`、`userId`、`sessionId` 等）。

如果使用 `/run`，你将同时看到事件的完整输出，作为一个列表，应该类似于：

```json
[{"content":{"parts":[{"functionCall":{"id":"af-e75e946d-c02a-4aad-931e-49e4ab859838","args":{"city":"new york"},"name":"get_weather"}}],"role":"model"},"invocationId":"e-71353f1e-aea1-4821-aa4b-46874a766853","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"longRunningToolIds":[],"id":"2Btee6zW","timestamp":1743712220.385936},{"content":{"parts":[{"functionResponse":{"id":"af-e75e946d-c02a-4aad-931e-49e4ab859838","name":"get_weather","response":{"status":"success","report":"The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit)."}}}],"role":"user"},"invocationId":"e-71353f1e-aea1-4821-aa4b-46874a766853","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"id":"PmWibL2m","timestamp":1743712221.895042},{"content":{"parts":[{"text":"OK. The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit).\n"}],"role":"model"},"invocationId":"e-71353f1e-aea1-4821-aa4b-46874a766853","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"id":"sYT42eVC","timestamp":1743712221.899018}]
```

**使用 `/run_sse`**

```shell
curl -X POST http://localhost:8000/run_sse \
-H "Content-Type: application/json" \
-d '{
"appName": "my_sample_agent",
"userId": "u_123",
"sessionId": "s_123",
"newMessage": {
    "role": "user",
    "parts": [{
    "text": "Hey whats the weather in new york today"
    }]
},
"streaming": false
}'
```

您可以将 `streaming` 设置为 `true` 以启用令牌级流式传输，这意味着
响应将分成多个块返回给您，输出应类似于：

```shell
data: {"content":{"parts":[{"functionCall":{"id":"af-f83f8af9-f732-46b6-8cb5-7b5b73bbf13d","args":{"city":"new york"},"name":"get_weather"}}],"role":"model"},"invocationId":"e-3f6d7765-5287-419e-9991-5fffa1a75565","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"longRunningToolIds":[],"id":"ptcjaZBa","timestamp":1743712255.313043}

data: {"content":{"parts":[{"functionResponse":{"id":"af-f83f8af9-f732-46b6-8cb5-7b5b73bbf13d","name":"get_weather","response":{"status":"success","report":"The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit)."}}}],"role":"user"},"invocationId":"e-3f6d7765-5287-419e-9991-5fffa1a75565","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"id":"5aocxjaq","timestamp":1743712257.387306}

data: {"content":{"parts":[{"text":"OK. The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit).\n"}],"role":"model"},"invocationId":"e-3f6d7765-5287-419e-9991-5fffa1a75565","author":"weather_time_agent","actions":{"stateDelta":{},"artifactDelta":{},"requestedAuthConfigs":{}},"id":"rAnWGSiV","timestamp":1743712257.391317}
```

**使用 `/run` 或 `/run_sse` 发送包含 Base64 编码文件的查询**

```shell
curl -X POST http://localhost:8000/run \
-H 'Content-Type: application/json' \
-d '{
   "appName":"my_sample_agent",
   "userId":"u_123",
   "sessionId":"s_123",
   "newMessage":{
      "role":"user",
      "parts":[
         {
            "text":"Describe this image"
         },
         {
            "inlineData":{
               "displayName":"my_image.png",
               "data":"iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAAsTAAALEwEAmpw...",
               "mimeType":"image/png"
            }
         }
      ]
   },
   "streaming":false
}'
```

{{% alert context="info" %}}

如果您正在使用 `/run_sse`，您应该在每个事件可用时立即看到它。
{{% /alert %}}

## 集成 {#integrations}

ADK 使用 [Callbacks](/docs/adk/components/app-management/callbacks/) 与第三方可观测性工具集成。这些集成捕获 Agent 调用和交互的详细跟踪，对于理解行为、调试问题和评估性能至关重要。

* [Comet Opik](https://github.com/comet-ml/opik) 是一个开源的 LLM 可观测性和评估平台，它 [原生支持 ADK](https://www.comet.com/docs/opik/tracing/integrations/adk)。

## 部署您的 Agent {#deploy-your-agent}

现在您已经验证了 Agent 的本地运行，就可以开始部署您的 Agent 了！以下是一些部署 Agent 的方法：

* 部署到 [Agent Runtime](/docs/adk/run/deployment/agent-runtime/)，这是将您的 ADK Agent 部署到 Google Cloud 上的托管服务的简单方法。
* 部署到 [Cloud Run](/docs/adk/run/deployment/cloud-run/)，并完全控制如何在 Google Cloud 上使用无服务器架构来扩展和管理您的 Agent。

## 交互式 API 文档 {#interactive-api-docs}

{{% alert context="info" %}}
**仅适用于 Python 和 TypeScript**

Swagger UI 交互式文档仅由 Python 和 TypeScript ADK API 服务器在 `/docs` 提供。Go API 服务器不提供 `/docs` 端点。要探索 Go REST API，请使用以下端点参考或直接使用 `curl` 发送请求。
{{% /alert %}}
API 服务器使用 Swagger UI 自动生成交互式 API 文档。这是探索端点、了解请求格式以及直接从浏览器测试 Agent 的宝贵工具。

要访问交互式文档，请启动 API 服务器并在浏览器中导航到 [http://localhost:8000/docs](http://localhost:8000/docs)。

您将看到一个完整的、交互式的所有可用 API 端点列表，您可以展开查看参数、请求体和响应模式的详细信息。您甚至可以点击“Try it out”向正在运行的 Agent 发送实时请求。

## API 端点 {#api-endpoints}

以下部分详细说明与您的 Agent 交互的主要端点。

{{% alert context="info" %}}
**JSON 命名约定**

- **请求和响应体** 都将使用 `camelCase` 作为字段名（例如 `"appName"`）。
{{% /alert %}}

### 工具端点 {#utility-endpoints}

#### 列出可用 Agent {#list-available-agents}

返回服务器发现的所有 Agent 应用程序的列表。

* **方法：** `GET`
* **路径：** `/list-apps`

**示例请求**

```shell
curl -X GET http://localhost:8000/list-apps
```

**示例回复**

```json
["my_sample_agent", "another_agent"]
```

### 会话管理 {#session-management}

会话存储特定用户与 Agent 交互的状态和事件历史。

#### 更新会话 {#update-a-session}

{{% alert context="info" %}}
**在 Go 中不可用**

`PATCH` 会话更新端点在 Go ADK REST API 服务器中未实现。要在 Go 中修改会话状态，请在 `/run` 或 `/run_sse` 请求体中传递 `stateDelta` 字段。
{{% /alert %}}
更新现有会话。

*   **方法：** `PATCH`
*   **路径：** `/apps/{app_name}/users/{user_id}/sessions/{session_id}`

**请求体**

```json
{
  "stateDelta": {
    "key1": "value1",
    "key2": 42
  }
}
```

**示例请求**

```shell
curl -X PATCH http://localhost:8000/apps/my_sample_agent/users/u_123/sessions/s_abc \
  -H "Content-Type: application/json" \
  -d '{"stateDelta":{"visit_count": 5}}'
```

**示例回复**

```json
{"id":"s_abc","appName":"my_sample_agent","userId":"u_123","state":{"visit_count":5},"events":[],"lastUpdateTime":1743711430.022186}
```

#### 获取会话 {#get-a-session}

检索特定会话的详细信息，包括其当前状态和所有相关事件。

*   **方法:** `GET`
*   **路径:** `/apps/{app_name}/users/{user_id}/sessions/{session_id}`

**示例请求**

```shell
curl -X GET http://localhost:8000/apps/my_sample_agent/users/u_123/sessions/s_abc
```

**示例回复**

```json
{"id":"s_abc","appName":"my_sample_agent","userId":"u_123","state":{"visit_count":5},"events":[...],"lastUpdateTime":1743711430.022186}
```

#### 删除会话 {#delete-a-session}

删除一个会话及其所有相关数据。

*   **方法:** `DELETE`
*   **路径:** `/apps/{app_name}/users/{user_id}/sessions/{session_id}`

**示例请求**

```shell
curl -X DELETE http://localhost:8000/apps/my_sample_agent/users/u_123/sessions/s_abc
```

**示例响应**
成功删除将不返回会话数据。Python 返回 `200 OK` 以及 `null` 的正文。TypeScript 返回 `204 No Content` 状态码。Go 返回 `200 OK` 且正文为空。

### Agent 执行 {#agent-execution}

这些端点用于向 Agent 发送新消息并获取响应。

#### 运行 Agent（单次响应） {#run-agent-single-response}

执行 Agent 并在运行完成后以单个 JSON 数组返回所有生成的事件。

*   **方法:** `POST`
*   **路径:** `/run`

**请求正文**

```json
{
  "appName": "my_sample_agent",
  "userId": "u_123",
  "sessionId": "s_abc",
  "newMessage": {
    "role": "user",
    "parts": [
      { "text": "What is the capital of France?" }
    ]
  }
}
```

在 TypeScript 中，目前仅支持 `camelCase` 字段名称（例如 `appName`、`userId`、`sessionId` 等）。

**示例请求**

```shell
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "my_sample_agent",
    "userId": "u_123",
    "sessionId": "s_abc",
    "newMessage": {
      "role": "user",
      "parts": [{"text": "What is the capital of France?"}]
    }
  }'
```

#### 运行 Agent（流式传输） {#run-agent-streaming}

执行 Agent，并在生成事件时使用[服务器发送事件 (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)将事件流回客户端。

*   **方法:** `POST`
*   **路径:** `/run_sse`

**请求体**
请求体与`/run`相同，另外有一个可选的`streaming`标志。

```json
{
  "appName": "my_sample_agent",
  "userId": "u_123",
  "sessionId": "s_abc",
  "newMessage": {
    "role": "user",
    "parts": [
      { "text": "What is the weather in New York?" }
    ]
  },
  "streaming": true
}
```

- `streaming`：（可选）设置为 `true` 以启用模型响应的令牌级流式传输。默认值为 `false`。

**示例请求**

```shell
curl -X POST http://localhost:8000/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "my_sample_agent",
    "userId": "u_123",
    "sessionId": "s_abc",
    "newMessage": {
      "role": "user",
      "parts": [{"text": "What is the weather in New York?"}]
    },
    "streaming": false
  }'
```

---

原文：[Use the API Server](https://adk.dev/runtime/api-server/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/api-server.md)
