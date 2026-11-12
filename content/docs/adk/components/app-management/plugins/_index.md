---
title: "插件"
description: "在 Agent Development Kit（ADK）中，插件是一个自定义代码模块，可以在 Agent 工作流生命周期的各个阶段通过回调钩子执行。您可以使用插件来实现适用于整个"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v1.7.0，Go v0.4.0。

Agent 开发工具包（ADK）中的插件是自定义代码模块，可在 Agent 工作流生命周期的各个阶段通过回调钩子执行。您可以使用插件来实现适用于整个 Agent 工作流的功能。插件的一些典型应用如下：

- **日志记录和跟踪**：创建 Agent、工具和生成式 AI 模型活动的详细日志，用于调试和性能分析。
- **策略执行**：实现安全防护措施，例如检查用户是否有权限使用特定工具，如果没有权限则阻止其执行的功能。
- **监控和指标**：收集并导出令牌使用情况、执行时间和调用次数等指标到监控系统，如 Prometheus 或 [Google Cloud Observability](https://cloud.google.com/stackdriver/docs)（前身为 Stackdriver）。
- **响应缓存**：检查请求是否曾经提交过，以便返回缓存响应，跳过昂贵或耗时的 AI 模型或工具调用。
- **请求或响应修改**：动态向 AI 模型提示添加信息或标准化工具输出响应。

{{% alert context="success" %}}
**提示：使用插件实现安全功能**

在实现安全防护措施和策略时，使用 ADK 插件相比回调具有更好的模块化和灵活性。更多详细信息，请参见 [Callbacks and Plugins for Security Guardrails](/docs/adk/run/safety-and-security/#callbacks-and-plugins-for-security-guardrails)。
{{% /alert %}}
{{% alert context="success" %}}
**提示：ADK 集成**

有关 ADK 的预构建插件和其他集成的列表，请参见 [Tools and Integrations（官方英文）](https://adk.dev/integrations/)。
{{% /alert %}}
## 插件如何工作？ {#how-do-plugins-work}

ADK 插件扩展了 `BasePlugin` 类，并包含一个或多个 `callback` 方法，用于指示插件在 Agent 生命周期中的执行位置。您可以通过在 Agent 的 `Runner` 类中注册它们，或者在 Python 中在 `App` 对象中注册它们，将插件集成到 Agent 中。有关如何以及在何处触发 Agent 应用中插件的更多信息，请参见 [Plugin callback hooks](#plugin-callback-hooks)。

插件功能建立在 [Callbacks](/docs/adk/components/app-management/callbacks/) 之上，后者是 ADK 可扩展架构的关键设计元素。虽然典型的 Agent 回调通常针对「单个 Agent、单个工具、特定任务」进行配置，但插件只需「一次注册」，在 `Runner` 或在 Python 中在 `App` 上注册，其回调对该 Runner 管理的每个 Agent、工具和 LLM 调用都全局适用。插件允许您将相关的回调函数打包在一起，以在整个工作流中使用。这使插件成为实现跨整个 Agent 应用功能的理想解决方案。## 预构建插件

ADK 包含多个插件，您可以立即将它们添加到您的 Agent 工作流中：

* [**Reflect and Retry Tools**（官方英文）](https://adk.dev/integrations/reflect-and-retry/)：
  跟踪工具失败并智能地重试工具请求。
* [**BigQuery Analytics**（官方英文）](https://adk.dev/integrations/bigquery-agent-analytics/)：
  使 Agent 能够使用 BigQuery 进行日志记录和分析。
* [**Model Armor**（官方英文）](https://adk.dev/integrations/model-armor/)：
  根据 Google Cloud Model Armor 模板筛选用户输入和模型输出。
* [**Context Filter**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/context_filter_plugin.py)：
  过滤生成型 AI 的上下文以减小其大小。
* [**Global Instruction**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/global_instruction_plugin.py)：
  提供应用级全局指令功能的插件。
* [**Save Files as Artifacts**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/save_files_as_artifacts_plugin.py)：
  将用户消息中包含的文件保存为 Artifact。
* [**Auto Tracing**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/auto_tracing_plugin.py)：
  在 OpenTelemetry 跨度中包装 Agent 自身包中的函数。
* [**Multimodal Tool Results**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/multimodal_tool_results_plugin.py)：
  允许函数工具将内容部分直接返回给模型。
* [**Logging**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/logging_plugin.py)：
  在每个 Agent 工作流回调点记录重要信息。
* [**Debug Logging**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/debug_logging_plugin.py)：
  捕获每次调用的完整调试信息并保存到 YAML 文件中。
* [**Reflect and Retry Model**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/_reflect_retry_model_plugin.py)：
  当响应以错误结束（例如格式错误的函数调用）时，要求模型再次尝试。
* [**Tool Call Integrity**](https://github.com/google/adk-python/blob/main/src/google/adk/plugins/_tool_call_integrity_plugin.py)：
  使用密钥对会话中存储的每个函数调用进行签名，仅在调用签名验证通过时运行工具。作为工作流节点运行的工具不进行检查。

更多本地和第三方的 Agent 插件，请查看 [ADK Integrations（官方英文）](https://adk.dev/integrations/) 页面。

## 定义和注册插件 {#prebuilt-plugins}

本节解释如何定义插件类并将其注册为 Agent 工作流的一部分。完整代码示例，请参见仓库中的 [Plugin Basic](https://github.com/google/adk-python/tree/main/contributing/samples/plugins/plugin_basic)。

### 创建插件类 {#define-and-register-plugins}

首先扩展 `BasePlugin` 类，并添加一个或多个 `callback` 方法，如以下代码示例所示：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py title="count_plugin.py"
from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.plugins.base_plugin import BasePlugin

class CountInvocationPlugin(BasePlugin):
    """A custom plugin that counts agent and tool invocations."""

    def __init__(self) -> None:
        """Initialize the plugin with counters."""
        super().__init__(name="count_invocation")
        self.agent_count: int = 0
        self.tool_count: int = 0
        self.llm_request_count: int = 0

    async def before_agent_callback(
        self, *, agent: BaseAgent, callback_context: CallbackContext
    ) -> None:
        """Count agent runs."""
        self.agent_count += 1
        print(f"[Plugin] Agent run count: {self.agent_count}")

    async def before_model_callback(
        self, *, callback_context: CallbackContext, llm_request: LlmRequest
    ) -> None:
        """Count LLM requests."""
        self.llm_request_count += 1
        print(f"[Plugin] LLM request count: {self.llm_request_count}")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go title="count_plugin.go"
package main

import (
	"fmt"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/model"
	"google.golang.org/adk/v2/plugin"
    "google.golang.org/genai"
)

/**
 * A custom plugin that counts agent and tool invocations.
 */
type CountInvocationPlugin struct {
	AgentCount      int
	ToolCount       int
	LlmRequestCount int
}

func NewCountInvocationPlugin() (*plugin.Plugin, error) {
	p := &CountInvocationPlugin{}
	return plugin.New(plugin.Config{
		Name:                "count_invocation",
		BeforeAgentCallback: p.BeforeAgentCallback,
		BeforeModelCallback: p.BeforeModelCallback,
	})
}

/**
 * Count agent runs.
 */
func (p *CountInvocationPlugin) BeforeAgentCallback(ctx agent.Context) (*genai.Content, error) {
	p.AgentCount++
	fmt.Printf("[Plugin] Agent run count: %d\n", p.AgentCount)
	return nil, nil
}

/**
 * Count LLM requests.
 */
func (p *CountInvocationPlugin) BeforeModelCallback(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
	p.LlmRequestCount++
	fmt.Printf("[Plugin] LLM request count: %d\n", p.LlmRequestCount)
	return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
此示例代码实现了 `before_agent_callback` 和 `before_model_callback` 的回调，以在 Agent 生命周期中计算这些任务的执行次数。

### 注册插件类 {#create-plugin-class}

通过在 Agent 初始化期间将您的 Plugin 类注册为 `Runner` 类的一部分，或者在 Python 中作为 `App` 对象，使用 `plugins` 参数集成您的插件。您可以使用此参数指定多个插件。以下示例代码演示了如何在简单的 ADK Agent 中注册上一节定义的 `CountInvocationPlugin` 插件。

{{% alert context="info" %}}
**Python: 使用 `App(plugins=...)` 而不是 `Runner(plugins=...)`**

在 Python 中，`Runner` 和 `InMemoryRunner` 的 `plugins` 参数已被弃用，并会引发 `DeprecationWarning`。请在 [`App`](/docs/adk/components/app-management/) 上设置 `plugins` 并将该 `App` 传递给 Runner 作为 `InMemoryRunner(app=app)`。如果同时传递 `plugins` 和 `app`，将引发 `ValueError`。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.runners import InMemoryRunner
from google.adk import Agent
from google.adk.apps import App
from google.adk.tools.tool_context import ToolContext
from google.genai import types
import asyncio

# 导入插件。
from .count_plugin import CountInvocationPlugin

async def hello_world(tool_context: ToolContext, query: str):
    print(f'Hello world: query is [{query}]')

root_agent = Agent(
    model='gemini-flash-latest',
    name='hello_world',
    description='Prints hello world with user query.',
    instruction="""Use hello_world tool to print hello world and user query.
    """,
    tools=[hello_world],
)

app = App(
    name='test_app_with_plugin',
    root_agent=root_agent,

    # 在此添加您的插件。您可以添加多个插件。
    plugins=[CountInvocationPlugin()],
)

async def main():
    """Main entry point for the agent."""
    prompt = 'hello world'
    runner = InMemoryRunner(app=app)

    # 其余的操作与启动普通 ADK Runner 相同。
    session = await runner.session_service.create_session(
        user_id='user',
        app_name='test_app_with_plugin',
    )

    async for event in runner.run_async(
        user_id='user',
        session_id=session.id,
        new_message=types.Content(
            role='user', parts=[types.Part.from_text(text=prompt)]
        )
    ):
        print(f'** Got event from {event.author}')

if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
package main

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/plugin"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

type helloWorldArgs struct {
	Query string `json:"query"`
}

type helloWorldResult struct {
	Result string `json:"result"`
}

func helloWorld(ctx agent.Context, args helloWorldArgs) (helloWorldResult, error) {
	output := fmt.Sprintf("Hello world: query is [%s]", args.Query)
	fmt.Println(output)
	return helloWorldResult{Result: output}, nil
}

func main() {
	ctx := context.Background()
	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("failed to create model: %v", err)
	}

	helloWorldTool, err := functiontool.New(functiontool.Config{
		Name:        "hello_world",
		Description: "Prints hello world with user query.",
	}, helloWorld)
	if err != nil {
		log.Fatalf("failed to create tool: %v", err)
	}

	rootAgent, err := llmagent.New(llmagent.Config{
		Model:       model,
		Name:        "hello_world",
		Description: "Prints hello world with user query.",
		Instruction: "Use hello_world tool to print hello world and user query.",
		Tools:       []tool.Tool{helloWorldTool},
	})
	if err != nil {
		log.Fatalf("failed to create agent: %v", err)
	}

	// 创建你的插件。
	countPlugin, err := NewCountInvocationPlugin()
	if err != nil {
		log.Fatalf("failed to create plugin: %v", err)
	}

	sessionService := session.InMemoryService()
	// 在此添加您的插件。您可以添加多个插件。
	r, err := runner.New(runner.Config{
		AppName:        "test_app_with_plugin",
		Agent:          rootAgent,
		SessionService: sessionService,
		PluginConfig: runner.PluginConfig{
			Plugins: []*plugin.Plugin{countPlugin},
		},
	})
	if err != nil {
		log.Fatalf("failed to create runner: %v", err)
	}

	// 其余的操作与启动普通 ADK Runner 相同。
	sessResp, err := sessionService.Create(ctx, &session.CreateRequest{
		AppName: "test_app_with_plugin",
		UserID:  "user",
	})
	if err != nil {
		log.Fatalf("failed to create session: %v", err)
	}
	sess := sessResp.Session

	prompt := "hello world"
	input := genai.NewContentFromText(prompt, genai.RoleUser)

	for event, err := range r.Run(ctx, "user", sess.ID(), input, agent.RunConfig{}) {
		if err != nil {
			log.Printf("AGENT_ERROR: %v", err)
			continue
		}
		if event.Author != "" {
			fmt.Printf("** Got event from %s\n", event.Author)
		}
	}
}
```

{{% /tab %}}
{{< /tabs >}}
在 Python 中，你也可以在不更改 Agent 代码的情况下通过将其导入路径传递给 `adk web` 或 `adk api_server`，并使用 `--extra_plugins` 选项来加载插件。ADK 会在你的 `App` 注册的任何插件之后添加它。仅在类的构造函数接受 `name` 参数时传递类，否则，请传递在模块级定义的插件实例。重复使用该选项可以加载多个插件。

```shell
adk web --extra_plugins=google.adk.plugins.LoggingPlugin /path/to/agents
```

### 使用插件运行 Agent {#register-plugin-class}

像平常一样运行插件。以下显示如何运行命令行：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```sh
python3 -m path.to.main.py
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```sh
go run path/to/main.go
```

{{% /tab %}}
{{< /tabs >}}
之前描述的这个 Agent 的输出应该类似于以下内容：

```log
[Plugin] Agent run count: 1
[Plugin] LLM request count: 1
** Got event from hello_world
Hello world: query is [hello world]
** Got event from hello_world
[Plugin] LLM request count: 2
** Got event from hello_world
```

有关运行 ADK Agent 的更多信息，请参阅 [Agent Runtime](/docs/adk/run/agent-runtime/#ways-to-run-agents) 指南]。

## 使用插件构建工作流 {#run-the-agent-with-the-plugin}

插件回调钩子是一种实现逻辑的机制，它可以拦截、修改，甚至控制 Agent 的执行生命周期。每个钩子都是您在插件类中可以实现的特定方法，以便在关键时刻运行代码。您可以根据钩子的返回值选择两种操作模式：

- **用于观察：** 实现一个无返回值的钩子 (`None`)。这种方法适用于日志记录或收集指标等任务，因为它允许 Agent 的工作流继续执行到下一步而不会中断。例如，您可以在插件中使用 `after_tool_callback` 来记录每个工具的结果以便调试。
- **用于干预：** 实现一个钩子并返回一个值。这种方法会中断工作流。`Runner` 停止处理，跳过任何后续插件和原本计划的操作（如模型调用），并使用插件回调的返回值作为结果。一个常见的用例是实现 `before_model_callback` 来返回缓存的 `LlmResponse`，从而防止重复且高成本的 API 调用。
- **用于修改：** 实现一个钩子并修改 Context 对象。这种方法允许您修改模块的上下文数据而不会中断该模块的执行。例如，为模型对象执行添加额外的标准化提示文本。

**注意：** 插件回调函数优先于对象级的回调。这个行为意味着任何插件回调代码都会在任何 Agent、模型或工具对象的回调之前执行。此外，如果插件级别的 Agent 回调返回任何值，而不是空的 (`None`) 响应，则 Agent、模型或工具级别的回调将*不会执行*（被跳过）。

在 Python 中，当注册多个插件时，请记住以下行为：

- **顺序：** ADK 按插件在 `plugins` 列表中出现的顺序运行每个回调，并在遇到第一个返回非 `None` 值的插件时停止。
- **名称：** 每个插件需要一个唯一的 `name`。两个具有相同名称的插件在 `Runner` 被创建时会引发 `ValueError`，因此请为同一类的每个实例提供独立的名称。
- **异常：** 插件回调中引发的异常会以 `RuntimeError` 的形式传递给您的代码，原始异常作为其 `__cause__`。`on_agent_error_callback` 和 `on_run_error_callback` 钩子的行为不同：ADK 在每个插件上运行它们，并记录其中引发的异常，而不是抛出异常。插件设计建立了代码执行的层次结构，并将全局关注点与本地 Agent 逻辑分离。插件是您构建的有状态*模块*，例如 `PerformanceMonitoringPlugin`，而回调钩子则是该模块中被执行的特定*函数*。这种架构在以下关键方面与标准 Agent 回调有根本性的不同：

- **作用范围:** 插件钩子是*全局*的。您只需在 `Runner` 上注册一次插件，或在 Python 上的 `App` 注册，其钩子就适用于其管理的每个 Agent、模型和工具。相比之下，Agent 回调是*本地*的，需要在特定 Agent 实例上单独配置。
- **执行顺序:** 插件具有*优先权*。对于任何给定事件，插件钩子总是在任何相应的 Agent 回调之前运行。这种系统行为使得插件成为实现跨切面功能的正确架构选择，例如安全策略、通用缓存以及整个应用程序的一致日志记录。

### Agent 回调与插件 {#build-workflows-with-plugins}

如前一节所述，插件与 Agent 回调在功能上有一些相似之处。下表更详细地比较了插件与 Agent 回调之间的差异。<table>
  <thead>
    <tr>
      <th></th>
      <th><strong>Plugins</strong></th>
      <th><strong>Agent Callbacks</strong></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Scope</strong></td>
      <td><strong>Global</strong>：应用到所有 Agent/工具/大型语言模型
<code>Runner</code>.</td>
      <td><strong>Local</strong>：仅应用于特定 Agent 实例
它们被配置为开机。</td>
    </tr>
    <tr>
      <td><strong>Primary Use Case </strong></td>
      <td><strong>Horizontal 功能</strong>：日志、策略、监控，
全球缓存。</td>
      <td><strong> 特殊 Agent 逻辑</strong>：修改行为或
单一 Agent 的状态。</td>
    </tr>
    <tr>
      <td><strong>Configuration</strong></td>
      <td>Configure 曾在 <code>Runner</code> 上，或在 Python 上使用
<code>App</code>.</td>
      在每个<td>实例上单独进行图形化。</td>
    </tr>
    <tr>
      <td><strong>Execution Order</strong></td>
      <td>Plugin 回调在 </strong> Agent 回调之前运行 <strong>。</td>
      <td>gent 回调运行 <strong>after</strong> 插件回调。</td>
    </tr>
  </tbody>
</table>

## 插件回调钩子 {#agent-callbacks-and-plugins}

你用调用函数定义插件何时被调用，定义
你的插件类。当收到用户消息时，回调是可用的，
在一个`Runner`、`Agent`、`Model`或 `Tool`之前和之后，称为
`Events`，以及当发生`Model`或`Tool`错误时。在 Python 中，错误
回调也会在`Agent`提出异常和运行本身时运行
失败。这些回调包括并优先于任何回调
在你的 Agent、模型和工具类中定义。

下图展示了可以附加和运行的回调点
插件在你的 Agent 工作流程中的功能：![ADK 插件回调钩子](/images/adk/workflow-plugin-hooks.svg)
**图 1.** 带有插件回调钩子位置的 ADK Agent 工作流程示意图。

以下各节将更详细地描述插件可用的回调钩子。

-   [用户消息回调](#user-message-callbacks)
-   [Runner 启动回调](#runner-start-callbacks)
-   [Agent 执行回调](#agent-execution-callbacks)
-   [模型回调](#model-callbacks)
-   [工具回调](#tool-callbacks)
-   [事件回调](#event-callbacks)
-   [Runner 结束回调](#runner-end-callbacks)

### 用户消息回调 {#plugin-callback-hooks}

*用户消息回调*(`on_user_message_callback`)发生在用户发送消息时。`on_user_message_callback` 是第一个执行的钩子，提供您检查或修改初始输入的机会。

-   **执行时机：** 此回调在 `runner.run()` 之后立即发生，且在任何其他处理之前。
-   **目的：** 第一次机会检查或修改用户的原始输入。
-   **流程控制：** 返回 `types.Content` 对象以**替换**用户的原始消息。

以下代码示例显示了此回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def on_user_message_callback(
    self,
    *,
    invocation_context: InvocationContext,
    user_message: types.Content,
) -> Optional[types.Content]:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) OnUserMessageCallback(ctx agent.InvocationContext, msg *genai.Content) (*genai.Content, error) {
  // 你的实现在这里
  return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
### Runner 启动回调 {#user-message-callbacks}

*Runner 启动* 回调 (`before_run_callback`) 会在 `Runner` 对象获取可能已修改的用户消息并准备执行时发生。
这里会触发 `before_run_callback`，允许在任何 Agent 逻辑开始之前进行全局设置。

-   **运行时机：** 在 `on_user_message_callback` 之后，当 `Runner` 准备执行并在任何 Agent 逻辑开始之前。
-   **目的：** 在调用运行前进行全局设置或初始化。
-   **流程控制：** 返回 `types.Content` 对象以**停止执行**：
    `Runner` 会提前退出，并将该内容作为结果结束运行。
    在 Python 中，此提前退出适用于每个根 Agent，包括 `LlmAgent` 或 `Workflow`。
    返回 `None` 以正常进行。

以下代码示例显示了此回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def before_run_callback(
    self, *, invocation_context: InvocationContext
) -> Optional[types.Content]:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) BeforeRunCallback(ctx agent.InvocationContext) (*genai.Content, error) {
  // 你的实现在这里
  return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
### 特工执行回电 {#runner-start-callbacks}

*Agent 执行* 回调（`before_agent`，`after_agent`）发生在
`Runner`对象调用 Agent 人。`before_agent_callback`立即运行
在 Agent 人的主要工作开始之前。主要工作涵盖了 Agent 人的
整个处理请求的过程，可能涉及调用模型或
工具。当 Agent 完成所有步骤并准备结果后，
`after_agent_callback`运行。在 Python 中，如果 Agent 运行触发异常，
`on_agent_error_callback(*, agent, callback_context, error)` 运行，代替
`after_agent_callback`。那个回溯只观察失败：它的回归
值被忽略，原始例外依然被提出。

**注意：** 实现这些回调的插件是在
执行 Agent 级回调。此外，如果插件级 Agent
回调返回除`None`或空响应以外的任何信息，即 Agent 级
回调*未执行*（跳过）。

关于作为 Agent 对象一部分定义的 Agent 回调的更多信息，
参见
[回调类型](/docs/adk/components/app-management/callbacks/types-of-callbacks/#agent-lifecycle-callbacks)。

### 模特回归 {#agent-execution-callbacks}

模型回调**（`before_model`、`after_model`、`on_model_error`）**
在模型对象执行之前和之后，或模型调用失败时，分别为
详情如下：

- 如果 Agent 需要调用 AI 模型，`before_model_callback` 先运行。
- 如果模型调用成功，`after_model_callback` 接着运行。
- 如果模型调用失败且有例外，`on_model_error_callback`
    而是被触发，从而允许优雅的恢复。

**注意：** 实现**`before_model`**和**`after_model`**的插件
回调方法是在模型级回调执行之前执行的。
此外，如果插件级模型回调返回的不是
`None`或空响应，模型级回调*未执行*（跳过）。

#### 模型关于错误回调细节 {#model-callbacks}

模型对象的错误回调工作原理如下：

- **运行时：** 在模型调用过程中提出异常时。
- **常见用例：** 优雅的错误处理，记录特定
    错误，或返回后备响应，例如“AI服务是
    目前无法接听。”
- **流量控制：**
    - 返回一个`LlmResponse`对象以**抑制异常**
        并提供一个备用结果。
    - 返回`None`以允许提出原始例外。

**注意**：如果Model对象的执行返回`LlmResponse`，则
系统恢复执行流程，`after_model_callback`将被触发
通常如此。

以下代码示例展示了该回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def on_model_error_callback(
    self,
    *,
    callback_context: CallbackContext,
    llm_request: LlmRequest,
    error: Exception,
) -> Optional[LlmResponse]:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) OnModelErrorCallback(ctx agent.Context, req *model.LLMRequest, err error) (*model.LLMResponse, error) {
  // 你的实现在这里
  return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
### 工具回调 {#model-on-error-callback-details}

插件的工具回调 **(`before_tool`, `after_tool`, `on_tool_error`)** 会在工具执行之前或之后，或者在发生错误时触发，具体如下：

- 当 Agent 执行工具时，`before_tool_callback` 会首先运行。
- 如果工具执行成功，接下来运行 `after_tool_callback`。
- 如果工具引发异常，则触发 `on_tool_error_callback`，给您处理失败的机会。如果 `on_tool_error_callback` 返回一个字典，则 `after_tool_callback` 将正常触发。

**注意：** 实现这些回调的插件会在工具级回调执行之前运行。此外，如果插件级工具回调返回的内容不是 `None` 或 null 响应，则工具级回调 *不会执行*（被跳过）。

#### 工具错误回调详情 {#tool-callbacks}

工具对象的错误回调工作方式如下：

- **触发时机：** 当工具的 `run` 方法执行期间引发异常时。
- **目的：** 捕获特定工具异常（如 `APIError`）、记录失败，并向 LLM 提供用户友好的错误信息。
- **流程控制：** 返回 `dict` 以 **抑制异常** 并提供备用结果。返回 `None` 以允许原始异常被抛出。

**注意**：通过返回 `dict`，可恢复执行流程，并且 `after_tool_callback` 将正常触发。

以下代码示例展示了此回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def on_tool_error_callback(
    self,
    *,
    tool: BaseTool,
    tool_args: dict[str, Any],
    tool_context: ToolContext,
    error: Exception,
) -> Optional[dict]:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) OnToolErrorCallback(ctx agent.Context, t tool.Tool, args map[string]any, err error) (map[string]any, error) {
  // 你的实现在这里
  return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
### 事件回调 {#tool-on-error-callback-details}

*事件回调* (`on_event_callback`) 发生在 Agent 生成输出（例如文本响应或工具调用结果）时，它将这些输出作为 `Event` 对象返回。`on_event_callback` 会在每个事件发生时触发，允许你在事件被流式传输到客户端之前进行修改。

-   **运行时机:** 在 Agent 生成 `Event` 之后，但在发送给用户之前。一个 Agent 运行可能会生成多个事件。
-   **目的:** 可用于修改或丰富事件（例如添加元数据），或基于特定事件触发副作用。
-   **流程控制:** 返回 `Event` 对象以**覆盖**原始事件。在 Python 中，ADK 会将你的事件合并到原始事件上：仅应用你设置的字段，`id`、`invocation_id` 和 `timestamp` 始终取自原始事件。

以下代码示例展示了此回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def on_event_callback(
    self, *, invocation_context: InvocationContext, event: Event
) -> Optional[Event]:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) OnEventCallback(ctx agent.InvocationContext, event *session.Event) (*session.Event, error) {
  // 你的实现在这里
  return nil, nil
}
```

{{% /tab %}}
{{< /tabs >}}
### Runner 结束回调 {#event-callbacks}

*Runner 结束* 回调 **(`after_run_callback`)** 发生在 Agent 完成其整个过程并处理完所有事件后，`Runner` 完成其运行。`after_run_callback` 是最后的钩子，非常适合进行清理和最终报告。

-   **运行时间：** 在 `Runner` 完全执行请求之后。
-   **目的：** 非常适合全局清理任务，例如关闭连接或完成日志和指标数据的处理。
-   **流程控制：** 此回调仅用于拆解，不能更改最终结果。

以下代码示例展示了此回调的基本语法：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
async def after_run_callback(
    self, *, invocation_context: InvocationContext
) -> None:
    ...
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
func (p *MyPlugin) AfterRunCallback(ctx agent.InvocationContext) {
  // 你的实现在这里
}
```

{{% /tab %}}
{{< /tabs >}}
在 Python 中，ADK 会通知您的插件另外两个生命周期事件：

-   **`on_run_error_callback(*, invocation_context, error)`**：在运行因未处理的异常失败时替代 `after_run_callback` 执行。这个回调只观察失败：它的返回值会被忽略，原始异常仍然会被抛出。
-   **`close()`**：在每个插件关闭 `Runner` 时运行一次，而不是每次运行时运行。使用它来释放插件拥有的资源，例如 HTTP 客户端或指标导出器。每次 `close()` 调用都受到 Runner 的 `plugin_close_timeout` 限制，默认五秒。

在 Go 中，在 `plugin.Config` 中设置 `CloseFunc` 来释放插件拥有的资源，例如必须在进程退出前刷新缓冲区的导出器。`Runner` 不会帮您调用它：在应用程序关闭时调用插件的 `Close` 方法。ADK Go 不强制 `runner.PluginConfig.CloseTimeout`，因此任何耗时的清理都应在 `CloseFunc` 中自行限制。

```go
p, err := plugin.New(plugin.Config{
	Name: "my_plugin",
	CloseFunc: func() error {
		// 在这里刷新缓冲区并释放客户端。
		return nil
	},
})
if err != nil {
	log.Fatal(err)
}
defer p.Close()
```

## 下一步 {#runner-end-callbacks}

查看这些资源以开发和应用插件到您的 ADK 项目：

-   有关更多 ADK 插件代码示例，请参见 [ADK 示例库](https://github.com/google/adk-samples).
-   有关将插件用于安全目的的信息，请参见 [安全护栏的回调和插件](/docs/adk/run/safety-and-security/#callbacks-and-plugins-for-security-guardrails).

---

原文：[Plugins](https://adk.dev/plugins/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/plugins/index.md)
