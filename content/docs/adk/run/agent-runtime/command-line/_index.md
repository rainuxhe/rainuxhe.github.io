---
title: "命令行"
description: "ADK 提供了一个交互式终端界面，用于测试您的 Agent。这对于快速测试、脚本化交互和 CI/CD 流水线非常有用。"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0，Go v0.1.0。

ADK 提供了一个交互式终端界面，用于测试您的 Agent。这对于快速测试、脚本化交互和 CI/CD 流程非常有用。

![ADK Run](/images/adk/adk-run.png)

## 运行 Agent {#run-an-agent}

使用以下命令在 ADK 命令行界面中运行您的 Agent：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
adk run my_agent
```

{{% /tab %}}
{{% tab tabName="Go" %}}

在 Go 中，命令行界面不是一个独立的 `adk` 工具。相反，
你将启动器直接嵌入到 Agent 的 `main.go` 中。
`full.NewLauncher()` 辅助程序将控制台、网络服务器和其他
模式打包到单个二进制文件中，当没有提供子命令关键字时，**默认为控制台**:

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

使用以下任一命令在控制台模式下运行 Agent：

```shell
go run agent.go           # console is the default sublauncher
go run agent.go console   # or explicitly name the console subcommand
```

{{% /tab %}}
{{< /tabs >}}
这将启动一个交互式会话，您可以在终端中直接输入查询并查看 Agent 的响应。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
Running agent my_agent, type exit to exit.
[user]: What's the weather in New York?
[my_agent]: The weather in New York is sunny with a temperature of 25°C.
[user]: exit
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
User -> What's the weather in New York?

Agent -> The weather in New York is sunny with a temperature of 25°C.

User ->
```

要退出，请按 **Ctrl C** 或发送 EOF (**Ctrl D**)。
{{% /tab %}}
{{< /tabs >}}
## 会话选项 {#session-options}

{{% alert context="info" %}}
**仅限 Python**

`--save_session`、`--resume`、`--replay` 和 `--session_id` 选项仅在 Python ADK CLI 中可用。Go 控制台启动器不支持通过命令行标志保存/恢复/重放会话。在 Go 中，会话持久性通过在代码中提供持久化 `session.Service` 实现（例如 `session/database`）给 `launcher.Config` 来配置。
{{% /alert %}}
`adk run` 命令包括保存、恢复和重放会话的选项。

### 保存会话 {#save-sessions}

退出时保存会话：

```shell
adk run --save_session path/to/my_agent
```

系统会提示您输入会话 ID，会话将保存到 `path/to/my_agent/<session_id>.session.json`。

您也可以提前指定会话 ID：

```shell
adk run --save_session --session_id my_session path/to/my_agent
```

### 恢复会话 {#resume-sessions}

要继续之前保存的会话：

```shell
adk run --resume path/to/my_agent/my_session.session.json path/to/my_agent
```

这将加载上一个会话状态和事件历史，显示它，并允许您继续对话。

### 回放会话 {#replay-sessions}

要在没有交互输入的情况下回放会话文件：

```shell
adk run --replay path/to/input.json path/to/my_agent
```

输入文件应包含初始状态和查询：

```json
{
  "state": {"key": "value"},
  "queries": ["What is 2 + 2?", "What is the capital of France?"]
}
```

## 存储选项 {#storage-options}

{{% alert context="info" %}}
**仅限 Python**

`--session_service_uri` 和 `--artifact_service_uri` 命令行
标志仅在 Python ADK CLI 中可用。在 Go 中，session 和 artifact
服务在构建 `launcher.Config` 时通过代码配置——例如，使用 `session/database` 创建基于持久数据库的 session 存储，或使用 `artifact/gcsartifact` 创建基于云存储的 artifact。
{{% /alert %}}
| 选项 | 描述 | 默认值 |
|--------|-------------|---------|
| `--session_service_uri` | 自定义 session 存储 URI | 每个 Agent 的 SQLite，路径为 `<agents_dir>/<agent>/.adk/session.db` |
| `--artifact_service_uri` | 自定义 artifact 存储 URI | 每个 Agent 的目录，路径为 `<agents_dir>/<agent>/.adk/artifacts` |
| `--memory_service_uri` | 自定义内存服务 URI | 内存中 |

### 带存储选项的示例 {#example-with-storage-options}

```shell
adk run --session_service_uri "sqlite:///my_sessions.db" path/to/my_agent
```

## 所有选项 {#all-options}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

要发送单条消息并退出而不是启动交互式会话，请将查询作为参数传递：

```shell
adk run path/to/my_agent "hello"
```

|选项 |描述 |
|--------|-------------|
|`--save_session` |退出时将会话保存为JSON文件 |
|`--session_id` |保存时使用的会话ID |
|`--resume` |返回已保存会话文件的路径 |
|`--replay` |非交互式回放输入文件路径 |
|`--session_service_uri` |自定义会话存储 URI |
|`--artifact_service_uri` |自定义文物存储 URI |
|`--memory_service_uri` |自定义内存服务 URI |
|`--use_local_storage/--no_use_local_storage` |当未设置服务URI时，使用本地`.adk`文件夹 |
|`--state` |作为 JSON 字符串的初始状态 |
|`--timeout` |单次轮或查询的超时，如 `30s` 或 `5m` |
|`--in_memory` |不要持久化会话数据 |
|`--jsonl` |输出结构化JSONL代替人类可读文本 |
|`--default_llm_model` |当 Agent 未设置模型时的默认模型 |
{{% /tab %}}
{{% tab tabName="Go" %}}

{{% alert context="info" %}}
**Go 标志与 Python 不同**

Go 控制台启动器不支持 `--save_session`，`--resume`，
`--replay`、`--session_id`、`--session_service_uri`或
`--artifact_service_uri`。这些是 Python CLI 的功能。会话和
Artifact 服务通过 `launcher.Config` 在围棋代码中配置。
{{% /alert %}}
标志传递在`console`关键字之后（如果`console`是，则直接传递
默认情况）：

|旗帜 |描述 |默认 |
|------|-------------|---------|
|`-streaming_mode` |Agent 响应的流式模式（`none`\|`sse`）|自动检测（TTY→ `sse`，管道→ `none`） |
|`-shutdown-timeout` |优雅的关机等待时间 |`2s` |
|`-otel_to_cloud` |导出OpenTelemetry数据到GCP |`false` |

例如，强制非流式输出：

```shell
go run agent.go console -streaming_mode none
```

或者强制使用 SSE 流式传输（逐字输出）：

```shell
go run agent.go -streaming_mode sse
```

{{% /tab %}}
{{< /tabs >}}
## 使用遥测 {#usage-telemetry}

ADK CLI 收集匿名使用遥测数据，以了解功能采用情况、指导开发优先级并提升工具性能。数据收集默认关闭，直到您明确选择启用为止。

您的遥测偏好存储在本地计算机的 `~/.adk/config.json` 中。您可以随时通过终端管理遥测数据收集：

- **启用**：`adk telemetry enable`
- **禁用**：`adk telemetry disable`
- **检查状态**：`adk telemetry status`

您也可以随时手动停用遥测数据收集，只需打开 `~/.adk/config.json` 并将 `telemetry` 属性设置为 `false`：

```json
{
  "telemetry": false
}
```

**收集的数据**

- **环境属性**：操作系统信息、运行时语言和版本，以及已安装的 ADK CLI 版本。
- **命令执行事件**：通用命令和子命令名称、传入的标志、执行时长、退出代码，以及发生错误时的异常类型。我们还会记录一个序列号和一个会在命令执行后丢弃的临时会话 ID。

**未收集的数据**

CLI 不会收集敏感、私人或个人数据，具体包括：

- 传递给命令或标志的参数值，例如 Agent 名称、提示字符串、文件路径。
- 用户凭证、用户名、API 密钥、OAuth 令牌或密钥。
- Google Cloud 项目 ID 或云账户详情。
- 源代码文件、文件内容或目录路径。
- 个人身份信息（PII）。

---

原文：[Use the Command Line](https://adk.dev/runtime/command-line/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/runtime/command-line.md)
