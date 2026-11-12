---
title: "上下文压缩"
description: "当一个 ADKAgent 运行时，它会收集*上下文*信息，包括用户指令、检索的数据、工具响应和生成的内容。随着这些上下文数据的规模增大，Agent 的处理时间通常也会增加"
icon: "article"
weight: 60
toc: true
---

支持版本：Python v1.16.0, Go v2.3.0。

作为 ADK Agent 运行时，它会收集*上下文*信息，包括用户指令、检索的数据、工具响应和生成的内容。随着这些上下文数据的增多，Agent 的处理时间通常也会增加。越来越多的数据被发送到 Agent 使用的生成式 AI 模型，从而增加处理时间并减慢响应速度。ADK 上下文压缩功能旨在在 Agent 运行时通过总结较旧的会话历史（包括指令、输入和模型响应）来减小上下文的大小。通过保持紧凑的上下文窗口，这一过程**优化延迟并降低成本**，同时确保 Agent 仍能访问重要的近期交互。

压缩功能直接集成在 SingleFlow 中，通过 `CompactionRequestProcessor`，允许基于您在 `EventsCompactionConfig` 中设置的规则自动进行事件压缩。

## 选择您的策略 {#choose-your-strategy}

您可以在 `EventsCompactionConfig` 中使用以下策略管理会话数据：

- **基于令牌（主要）**：根据实际消耗的令牌量触发清理。这作为绝对的安全网，适用于不可预测的工作负载，例如用户粘贴大量代码块或上传大文件时。
- **滑动窗口（基于轮次）**：在固定数量的对话轮次后触发清理。这适用于规律、可预测的文本聊天。

如果您同时配置了两种压缩策略，系统会优先执行基于令牌的压缩。当会话长度超过您定义的令牌阈值时，系统将触发基于令牌的压缩，并跳过该轮次的滑动窗口压缩。

## 基于令牌的压缩 {#token-based-compaction}

基于令牌的压缩是根据令牌或数据的数量来触发上下文管理，而不是根据事件或轮次的数量。

### 配置设置 {#configuration-settings}

通过向 App 对象添加 `EventsCompactionConfig` 设置，将基于令牌的压缩添加到您的 Agent 工作流中。您必须指定以下内容：

- **`token_threshold`**：达到此令牌数量上限时，会自动触发尾部保留压缩的安全限制。
- **`event_retention_size`**：压缩触发时保留的最近事件/交互的“原始”未压缩格式数量。这样可以保持即时的对话上下文和代词解析。

要在项目中实现此功能，请使用以下配置：

```python
# 1. 更正导入路径以使用 google.adk 命名空间
from google.adk.apps.app import App, EventsCompactionConfig
from google.adk.agents import Agent

# 2. 初始化您的根 Agent（应用配置所必需）
root_agent = Agent(
    name="my_root_agent",
    description="Main coordinating agent for the workflow."
)

# 3. 基于令牌的配置：激活优先/预调用层
compaction_config = EventsCompactionConfig(
    token_threshold=4000,     # Triggers compaction when actual token count exceeds this
    event_retention_size=5    # Number of recent raw events to keep intact when token limit is hit
)

# 4. 使用必需的 name 和 root_agent 字段以及配置对象进行注册
app = App(
    name="my_compacting_agent_app",
    root_agent=root_agent,
    events_compaction_config=compaction_config
)
```

## 滑动窗口压缩 {#sliding-window-compaction}

上下文压缩功能使用*滑动窗口*方法来收集和汇总 Agent 工作流事件数据，位于[Session](/docs/adk/components/agent-context/sessions/)中。当您在 Agent 中配置此功能时，一旦达到特定数量的工作流事件或当前会话的调用次数阈值，它就会汇总较旧事件的数据。

```python
# （可选）基于事件的滑动窗口作为补充设置
compaction_config = EventsCompactionConfig(
    compaction_interval=10,   # Number of turns between standard compactions
    overlap_size=2            # Number of events to retain as overlapping context
)
```

## 配置上下文压缩 {#configure-context-compaction}

通过向 App 对象添加事件压缩配置（Python/Java/Kotlin）、在 `LlmAgent` 上配置 `contextCompactors`（TypeScript），或在 Runner 配置中设置 `Compaction`（Go），将上下文压缩添加到您的 Agent 工作流程。作为配置的一部分，您必须指定压缩间隔和重叠大小（Python/Java）、压缩间隔以及可选的重叠大小（Go），或令牌阈值和事件保留大小（TypeScript/Kotlin/Go），如下列示例代码所示：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.apps.app import App
from google.adk.apps.app import EventsCompactionConfig

app = App(
    name='my-agent',
    root_agent=root_agent,
    events_compaction_config=EventsCompactionConfig(
        compaction_interval=3,  # Trigger compaction every 3 new invocations.
        overlap_size=1          # Include last invocation from the previous window.
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session/compaction"
)

// 压实设置在 Runner 上，而不是在应用程序对象上。
r, err := runner.New(runner.Config{
	AppName:        "my-agent",
	Agent:          rootAgent,
	SessionService: sessionService,
	Compaction: &compaction.Config{
		CompactionInterval: 3, // Trigger compaction every 3 new invocations.
		OverlapSize:        1, // Include last invocation from the previous window.
	},
})
```

{{% /tab %}}
{{< /tabs >}}
配置完成后，每次会话达到间隔时，ADK `Runner` 会在后台处理压缩过程。

## 上下文压缩示例 {#example-of-context-compaction}

如果将 `compaction_interval` 设置为 3，将 `overlap_size` 设置为 1，则在完成第 3、6、9 个事件时进行事件数据压缩。重叠设置会增加第二次摘要压缩的大小，以及之后每次摘要的大小，如图 1 所示。

![上下文压缩示例插图](/images/adk/context-compaction.svg)

**图 1.** 事件压缩配置示意，间隔为 3，重叠为 1。

使用此配置示例，上下文压缩任务的发生如下：

1.  **事件 3 完成**：将全部 3 个事件压缩为摘要
1.  **事件 6 完成**：压缩事件 3 到 6，包括前 1 个事件的重叠
1.  **事件 9 完成**：压缩事件 6 到 9，包括前 1 个事件的重叠

## 配置设置 {#configuration-settings}

此功能的配置设置控制事件数据压缩的频率以及在 Agent 工作流运行时保留的数据量。您还可以选择配置压缩器对象。

*   **`compaction_interval`**：设置完成多少事件触发先前事件数据的压缩。
*   **`overlap_size`**：设置在新压缩上下文集中包含之前已压缩的事件数。
*   **`summarizer`**： (可选) 定义一个摘要器对象，包括用于摘要的特定 AI 模型。更多信息请参见 [定义摘要器](#define-summarizer)。

### 定义摘要器 {#define-summarizer}

通过定义摘要器，您可以自定义上下文压缩流程。`LlmEventSummarizer`（Python、Java 和 Kotlin）、`LlmSummarizer`（TypeScript）或 `LLMSummarizer`（Go）类允许您为摘要指定特定模型。以下代码示例演示了如何定义和配置自定义摘要器：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.apps.app import App, EventsCompactionConfig
from google.adk.apps.llm_event_summarizer import LlmEventSummarizer
from google.adk.models import Gemini

# 定义用于摘要的 AI 模型：
summarization_llm = Gemini(model="gemini-flash-latest")

# 使用自定义模型创建摘要器：
my_summarizer = LlmEventSummarizer(llm=summarization_llm)

# 使用自定义摘要器和压缩设置配置应用程序：
app = App(
    name='my-agent',
    root_agent=root_agent,
    events_compaction_config=EventsCompactionConfig(
        compaction_interval=3,
        overlap_size=1,
        summarizer=my_summarizer,
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/runner"
	"google.golang.org/adk/v2/session/compaction"
)

// 定义用于摘要的 AI 模型：
summarizationLLM, err := gemini.NewModel(ctx, "gemini-flash-latest", nil)

// 使用自定义模型创建摘要器：
mySummarizer, err := compaction.NewLLMSummarizer(compaction.LLMSummarizerConfig{
	Model: summarizationLLM,
})

// 使用自定义摘要器和压缩设置配置 Runner：
r, err := runner.New(runner.Config{
	AppName:        "my-agent",
	Agent:          rootAgent,
	SessionService: sessionService,
	Compaction: &compaction.Config{
		CompactionInterval: 3,
		OverlapSize:        1,
		Summarizer:         mySummarizer,
	},
})
```

{{% /tab %}}
{{< /tabs >}}
您可以通过修改其摘要器进一步优化压缩器。在 Python、Java 和 Kotlin 中，自定义 `LlmEventSummarizer` 上的提示模板——该属性在 Python 中为 `prompt_template`，在 Java 和 Kotlin 中为 `promptTemplate`。在 TypeScript 中，自定义 `LlmSummarizer` 上的 `prompt`。在 Go 中，在 `LLMSummarizerConfig` 上设置 `PromptTemplate`；它必须包含 `{conversation_history}` 占位符。
更多详情，请参见
[`LlmEventSummarizer` 代码](https://github.com/google/adk-python/blob/main/src/google/adk/apps/llm_event_summarizer.py#L60) 或 [`LlmSummarizer` 代码](https://github.com/google/adk-js/blob/main/core/src/context/summarizers/llm_summarizer.ts)。

---

原文：[Compress agent context for performance](https://adk.dev/context/compaction/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/context/compaction.md)
