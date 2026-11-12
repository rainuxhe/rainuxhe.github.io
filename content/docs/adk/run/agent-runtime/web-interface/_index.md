---
title: "Web 界面"
description: "ADK 网页界面允许你直接在浏览器中测试你的 Agent。该工具提供了一种简单的方式来交互式地开发和调试你的 Agent。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

ADK Web 界面允许您直接在浏览器中测试您的 Agent。这个工具提供了一种简单的方式来交互式地开发和调试您的 Agent。

![ADK Web 界面](/images/adk/adk-web-dev-ui-chat.png)

{{% alert context="warning" %}}
**注意：ADK Web 仅用于开发**

ADK Web ***不适用于生产环境部署***。您应该仅将 ADK Web 用于开发和调试目的。
{{% /alert %}}
ADK Web 界面的主要功能包括：

- **聊天界面**：向您的 Agent 发送消息并实时查看响应
- **会话管理**：创建和切换会话
- **状态检查**：在开发过程中查看和修改会话状态
- **事件历史**：检查 Agent 执行期间生成的所有事件
- **可视化构建器**：使用拖放工作流编辑器和 AI 助手（仅限 Python，[了解更多](/docs/adk/run/agent-runtime/web-interface/visual-builder/)）

## 启动 Web 界面 {#start-the-web-interface}

使用以下命令启动 ADK Web 界面：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
adk web
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，Web 界面不是独立的 CLI 工具。相反，你需要将启动器直接嵌入到 Agent 的 `main.go` 中，并在运行时传递参数。`full.NewLauncher()` 辅助工具将 Web 服务器、REST API 和 Web UI 打包为一个单一的二进制文件：

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

然后通过在命令行上传递 `web`、`api` 和 `webui` 子命令来启动网页界面：

```shell
go run agent.go web api webui
```

`web` 关键字用于激活 HTTP 服务器。`api` 添加 ADK REST API 后端，`webui` 提供基于浏览器的聊天界面。`api` 和 `webui` 都是同时使用网页界面所必需的；如果您只是单独使用 API 或 UI，则可以省略其中任何一个。

`AgentLoader` 字段位于 `launcher.Config` 中，用于设置启动器所服务的 Agent。若要通过一个启动器提供多个 Agent，请使用 `agent.NewMultiLoader` 创建它。每个 Agent 都会以单独的应用列出，您可以在网页界面中进行选择。Agent 名称必须唯一：

```go
loader, err := agent.NewMultiLoader(rootAgent, otherAgent)
if err != nil {
    log.Fatalf("Failed to create agent loader: %v", err)
}
config := &launcher.Config{AgentLoader: loader}
```

{{% /tab %}}
{{< /tabs >}}
一旦启动，服务器会将访问 URL 打印到控制台。在浏览器中打开它以使用 Web 界面：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
+-----------------------------------------------------------------------------+
| ADK Web Server started                                                      |
|                                                                             |
| For local testing, access at http://localhost:8000.                         |
+-----------------------------------------------------------------------------+
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
2025/01/01 00:00:00 Starting the web server: &{port:8080 ...}
2025/01/01 00:00:00 Web servers starts on http://localhost:8080
2025/01/01 00:00:00        webui:  you can access API using http://localhost:8080/ui/
2025/01/01 00:00:00        api:  you can access API using http://localhost:8080/api
```

{{% /tab %}}
{{< /tabs >}}
## 常用选项 {#common-options}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

以下是 `adk web` 命令的一些常用选项。运行 `adk web
--help` 可查看所有可用选项。

| 选项 | 描述 | 默认值 |
|--------|-------------|---------|
| `--port` | 服务器运行端口 | `8000` |
| `--host` | 主机绑定地址 | `127.0.0.1` |
| `--session_service_uri` | 自定义会话存储 URI | 每 Agent 使用 `<agents_dir>/<agent>/.adk/session.db` 的 SQLite |
| `--artifact_service_uri` | 自定义 Artifact 存储 URI | 每 Agent 使用 `<agents_dir>/<agent>/.adk/artifacts` 的目录 |
| `--reload/--no-reload` | 在代码更改时启用自动重新加载 | `true` |

传递 `--no_use_local_storage` 可回退到内存中的会话和
Artifact 服务，而不是本地 `.adk` 文件夹。

例如：

```shell
adk web --port 3000 --session_service_uri "sqlite:///sessions.db"
```

{{% /tab %}}
{{% tab tabName="Go" %}}

{{% alert context="info" %}}
**Go 标志与 Python/TypeScript 不同**

Go 的 Web 启动器使用的标志不同于 Python 或 TypeScript 中的 `adk web`。像 `--host`、`--session_service_uri`、`--artifact_service_uri` 和 `--reload` 这样的选项不可用。会话和 Artifact 服务在构建 `launcher.Config` 时通过 Go 代码进行配置，而不是通过命令行标志。
{{% /alert %}}
标志分布在 `web`、`api` 和 `webui` 子命令中。在相关子命令关键字之后传递标志。

**`web` 子命令标志**（直接在 `web` 之后传递）：

| 标志 | 描述 | 默认值 |
|------|-------------|---------|
| `-port` | HTTP 服务器端口 | `8080` |
| `-write-timeout` | 写入 HTTP 响应的超时 | `15s` |
| `-read-timeout` | 读取 HTTP 请求的超时 | `15s` |
| `-idle-timeout` | 长连接空闲超时 | `60s` |
| `-shutdown-timeout` | 优雅关闭等待时间 | `15s` |
| `-otel_to_cloud` | 将 OpenTelemetry 数据导出到 GCP | `false` |

**`api` 子命令标志**（在 `api` 之后传递）：

| 标志 | 描述 | 默认值 |
|------|-------------|---------|
| `-webui_address` | WebUI CORS 允许的来源 | `localhost:8080` |
| `-path_prefix` | REST API 的 URL 路径前缀 | `/api` |
| `-sse-write-timeout` | SSE（流式）响应的超时 | `120s` |
| `-trace_capacity` | 最大保留的内存追踪数 | `10000` |

**`webui` 子命令标志**（在 `webui` 之后传递）：

| 标志 | 描述 | 默认值 |
|------|-------------|---------|
| `-api_server_address` | 浏览器中看到的 REST API URL | `http://localhost:8080/api` |

例如，要在 9090 端口运行并使用自定义 API 前缀：

```shell
go run agent.go web -port 9090 api -path_prefix /myapi webui -api_server_address http://localhost:9090/myapi
```

{{% /tab %}}
{{< /tabs >}}
## 使用遥测 {#usage-telemetry}

ADK Web UI 收集匿名使用遥测，以了解功能采用情况、发现可用性问题，并改善您的整体开发者体验。默认情况下，数据收集处于关闭状态，直到您明确选择启用。

您可以随时通过在 Web UI 中导航到右上角的用户图标下的用户设置来启用或禁用使用遥测。此设置会更新存储在您本地计算机上的单一统一偏好，位于 `~/.adk/config.json`。如果您愿意，也可以通过直接编辑此文件并将 `telemetry` 属性设置为 `false` 来手动停用数据收集：

```json
{
  "telemetry": false
}
```

**收集的数据**

启用后，Web UI 遥测会捕获标准页面事件和功能交互，包括：

- **标准导航**：页面浏览量、会话开始和活动会话持续时间。
- **环境**：ADK 版本和运行时语言。
- **功能使用**：使用构建器模式功能、使用 Agent 聊天、切换执行跟踪或事件日志查看器、创建评估集，以及点击 Agent 结构图视图。

**不收集的数据**

Web UI 不会收集敏感、私密或个人数据，具体包括：

- Agent 提示内容、系统指令或大语言模型响应。
- 用户凭证、用户名、API 密钥、OAuth 令牌或密钥。
- Google Cloud 项目 ID 或云帐户详情。
- 个人身份信息 (PII)。

---

原文：[Use the Web Interface](https://adk.dev/runtime/web-interface/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/web-interface/index.md)
