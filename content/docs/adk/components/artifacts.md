---
title: "Artifact"
description: "在 ADK 中，**Artifact** 是管理与特定用户交互会话相关联或跨多次会话持久关联的命名版本二进制数据的关键机制。它们允许你"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v0.1.0, Go v0.1.0。

在 ADK 中，**Artifacts（Artifact）** 是管理与特定用户交互会话相关或跨多个会话持久关联的命名、版本化二进制数据的关键机制。它们允许你的 Agent 和工具处理超越简单文本字符串的数据，从而实现涉及文件、图像、音频和其他二进制格式的更丰富的交互。

{{% alert context="default" %}}
这些原语的具体参数或方法名称可能因 SDK 语言略有不同（例如在 Python 中为 `save_artifact`，在 Java 中为 `saveArtifact`）。详情请参阅特定语言的 API 文档。
{{% /alert %}}

## 什么是 Artifacts？ {#what-are-artifacts}

*   **定义：** Artifact 本质上是一段二进制数据（如文件内容），在特定作用域（会话或用户）内由唯一 `filename` 字符串标识。每次以相同文件名保存 Artifact 时，都会创建一个新版本。

*   **表示：** Artifacts 始终使用标准 `google.genai.types.Part` 对象表示。核心数据通常存储在 `Part` 的内联数据结构中（通过 `inline_data` 访问），其本身包含：
    *   `data`：作为字节的原始二进制内容。
    *   `mime_type`：表示数据类型的字符串（例如 `"image/png"`, `"application/pdf"`）。这对于后续正确解释数据至关重要。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
# 示例说明 Artifact 如何表示为 types.Part
import google.genai.types as types

# 假设 'image_bytes' 包含 PNG 图像的二进制数据
image_bytes = b'\x89PNG\r\n\x1a\n...' # Placeholder for actual image bytes

image_artifact = types.Part(
    inline_data=types.Blob(
        mime_type="image/png",
        data=image_bytes
    )
)

# 您也可以使用便捷构造函数：
# image_artifact_alt = types.Part.from_bytes(data=image_bytes, mime_type="image/png")

print(f"Artifact MIME Type: {image_artifact.inline_data.mime_type}")
print(f"Artifact Data (first 10 bytes): {image_artifact.inline_data.data[:10]}...")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "log"

  "google.golang.org/genai"
)

	// 用图像数据创建一个字节切片。
	imageBytes, err := os.ReadFile("image.png")
	if err != nil {
		log.Fatalf("Failed to read image file: %v", err)
	}

	// 用图像数据创建一个新的 Artifact。
	imageArtifact := &genai.Part{
		InlineData: &genai.Blob{
			MIMEType: "image/png",
			Data:     imageBytes,
		},
	}
	log.Printf("Artifact MIME Type: %s", imageArtifact.InlineData.MIMEType)
	log.Printf("Artifact Data (first 8 bytes): %x...", imageArtifact.InlineData.Data[:8])
```

{{% /tab %}}
{{< /tabs >}}
*   **持久化与管理:** Artifact 不会直接存储在 Agent 或会话状态中。它们的存储与检索由专门的**Artifact 服务**管理（`BaseArtifactService` 的实现，定义在 `google.adk.artifacts` 中）。ADK 提供各种实现，例如：
    *   用于测试或临时存储的内存服务（例如 Python 中的 `InMemoryArtifactService`，定义在 `google.adk.artifacts.in_memory_artifact_service.py`）。
    *   使用 Google Cloud Storage (GCS) 的持久化存储服务（例如 Python 中的 `GcsArtifactService`，定义在 `google.adk.artifacts.gcs_artifact_service.py`）。
    *   将 Artifact 持久化到本地文件系统目录的服务，例如 Kotlin 中的 `FileArtifactService`，该服务以基目录作为唯一参数。
    所选择的服务实现会在保存数据时自动处理版本控制。

## 为什么使用 Artifact？ {#why-use-artifacts}

虽然会话 `state` 适合存储少量配置信息或对话上下文（如字符串、数字、布尔值或小型字典/列表），但 Artifact 设计用于处理二进制或大数据场景：

1. **处理非文本数据:** 轻松存储和检索图像、音频片段、视频片段、PDF、电子表格或与 Agent 功能相关的任何其他文件格式。
2. **持久化大数据:** 会话状态通常不适合存储大量数据。Artifact 提供了一种专门机制，以持久化较大的数据块而不会弄乱会话状态。
3. **用户文件管理:** 提供用户上传文件（可保存为 Artifact）、以及检索或下载 Agent 生成的文件（可从 Artifact 加载）的能力。
4. **共享输出:** 使工具或 Agent 能够生成二进制输出（如 PDF 报告或生成的图像），可通过 `save_artifact` 保存，并能被应用的其他部分或后续会话访问（如果使用用户命名空间）。
5. **缓存二进制数据:** 将生成二进制数据的高计算成本操作的结果（如渲染复杂图表图像）存储为 Artifact，以避免在后续请求中重新生成。

总之，每当您的 Agent 需要处理需要持久化、版本控制或共享的类文件二进制数据时，由 `ArtifactService` 管理的 Artifact 是 ADK 中的适当机制。

## 常见用例 {#common-use-cases}

Artifact 为在 ADK 应用中处理二进制数据提供了灵活的方法。

以下是一些典型场景，它们非常有用：

* **生成报告/文件:**
    * 工具或 Agent 生成报告（例如 PDF 分析、CSV 数据导出、图像图表）。

* **处理用户上传:**    * 用户通过前端界面上传文件（例如用于分析的图片，或用于摘要的文档）。

* **存储中间二进制结果：**

    * 一个 Agent 执行复杂的多步骤过程，其中一个步骤会生成中间二进制数据（例如音频合成、仿真结果）。

* **持久化用户数据：**

    * 存储特定用户的配置或数据，这不是简单的键值状态。

* **缓存生成的二进制内容：**

    * 一个 Agent 经常在某些输入下生成相同的二进制输出（例如公司标志图片、标准音频问候语）。

## 核心概念 {#core-concepts}

理解 Artifact（artifacts）涉及把握几个关键组成部分：管理它们的服务、用于存储它们的数据结构，以及它们的标识和版本管理方式。

### Artifact 服务（`BaseArtifactService`） {#artifact-service-baseartifactservice}

* **角色：** 负责 Artifact 实际存储和检索逻辑的核心组件。它定义了 Artifact 的*保存方式和位置*。

* **接口：** 由抽象基类 `BaseArtifactService` 定义。任何具体实现必须提供以下方法：

    * `Save Artifact`：存储 Artifact 数据并返回其分配的版本号。
    * `Load Artifact`：检索特定版本（或最新版本）的 Artifact。
    * `List Artifact keys`：列出给定范围内 Artifact 的唯一文件名。
    * `Delete Artifact`：移除 Artifact（根据实现，可能包括其所有版本）。
    * `List versions`：列出特定 Artifact 文件名的所有可用版本号。
    * `List artifact versions` 和 `Get artifact version`：在 Python 中，这些方法返回 `ArtifactVersion` 元数据，包括版本号、规范 URI、MIME 类型、创建时间和自定义元数据，而不是 Artifact 本身的内容。

* **配置：** 在初始化 `Runner` 时，需提供一个 Artifact 服务实例，例如 Kotlin 中的 `InMemoryArtifactService`、`GcsArtifactService` 或 `FileArtifactService`。然后 `Runner` 通过 `InvocationContext` 将该服务提供给 Agent 和工具使用。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```py
from google.adk.runners import Runner
from google.adk.artifacts import InMemoryArtifactService # Or GcsArtifactService
from google.adk.agents import LlmAgent # Any agent
from google.adk.sessions import InMemorySessionService

# 示例：使用 Artifact 服务配置 Runner
my_agent = LlmAgent(name="artifact_user_agent", model="gemini-flash-latest")
artifact_service = InMemoryArtifactService() # Choose an implementation
session_service = InMemorySessionService()

runner = Runner(
    agent=my_agent,
    app_name="my_artifact_app",
    session_service=session_service,
    artifact_service=artifact_service # Provide the service instance here
)
# 现在，由此 Runner 管理的运行中的上下文可以使用 Artifact 方法
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "context"
  "log"

  "google.golang.org/adk/v2/agent/llmagent"
  "google.golang.org/adk/v2/artifact"
  "google.golang.org/adk/v2/model/gemini"
  "google.golang.org/adk/v2/runner"
  "google.golang.org/adk/v2/session"
  "google.golang.org/genai"
)

// --8<-- [start:prerequisite]
// 创建一个新上下文。
ctx := context.Background()
// 设置应用名称。
const appName = "my_artifact_app"
// 创建一个新的 Gemini 模型。
model, err := gemini.NewModel(ctx, "gemini-2.5-flash", &genai.ClientConfig{})
if err != nil {
log.Fatalf("Failed to create model: %v", err)
}

// 创建一个新的 LLM Agent。
myAgent, err := llmagent.New(llmagent.Config{
Model:       model,
Name:        "artifact_user_agent",
Instruction: "You are an agent that describes images.",
BeforeModelCallbacks: []llmagent.BeforeModelCallback{
BeforeModelCallback,
},
})
if err != nil {
log.Fatalf("Failed to create agent: %v", err)
}

// 创建一个新的内存 Artifact 服务。
artifactService := artifact.InMemoryService()
// 创建一个新的内存会话服务。
sessionService := session.InMemoryService()

// 创建一个新的 Runner。
r, err := runner.New(runner.Config{
Agent:           myAgent,
AppName:         appName,
SessionService:  sessionService,
ArtifactService: artifactService, // Provide the service instance here
})
if err != nil {
log.Fatalf("Failed to create runner: %v", err)
}
log.Printf("Runner created successfully: %v", r)
// --8<-- [end:prerequisite]
```

{{% /tab %}}
{{< /tabs >}}

### Artifact 数据 {#artifact-data}

* **标准表示形式：** Artifact 内容通常使用 `google.genai.types.Part` 对象表示，这与 LLM 消息的部分结构相同。

* **关键属性 (`inline_data`)：** 对于 Artifact 来说，最相关的属性是 `inline_data`，它是一个 `google.genai.types.Blob` 对象，包含：

    * `data` (`bytes`)：Artifact 的原始二进制内容。
    * `mime_type` (`str`)：标准 MIME 类型字符串（例如 `'application/pdf'`、`'image/png'`、`'audio/mpeg'`），用于描述二进制数据的性质。**在加载 Artifact 时正确解释此信息至关重要。**

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
import google.genai.types as types

# 示例：从原始字节创建 Artifact 部件
pdf_bytes = b'%PDF-1.4...' # Your raw PDF data
pdf_mime_type = "application/pdf"

# 使用构造函数
pdf_artifact_py = types.Part(
    inline_data=types.Blob(data=pdf_bytes, mime_type=pdf_mime_type)
)

# 使用便利类方法（等效）
pdf_artifact_alt_py = types.Part.from_bytes(data=pdf_bytes, mime_type=pdf_mime_type)

print(f"Created Python artifact with MIME type: {pdf_artifact_py.inline_data.mime_type}")
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "log"
  "os"

  "google.golang.org/genai"
)

	// 从文件中加载 imageBytes
	imageBytes, err := os.ReadFile("image.png")
	if err != nil {
		log.Fatalf("Failed to read image file: %v", err)
	}

	// genai.NewPartFromBytes 是一个方便函数，它是以下操作的简写：
	// 创建一个 &genai.Part 并填充 InlineData 字段。
	// 从图像数据创建一个新的 Artifact。
	imageArtifact := genai.NewPartFromBytes([]byte(imageBytes), "image/png")

	log.Printf("Artifact MIME Type: %s", imageArtifact.InlineData.MIMEType)
```

{{% /tab %}}
{{< /tabs >}}

### 文件名 {#filename}

* **标识符:** 一个简单的字符串，用于在其特定命名空间内命名和检索 Artifact。
* **唯一性:** 文件名在其作用域内（会话或用户命名空间）必须唯一。
* **最佳实践:** 使用描述性名称，可能包括文件扩展名（例如 `"monthly_report.pdf"`, `"user_avatar.jpg"`），尽管扩展名本身不决定行为 – `mime_type`除外。

### 版本控制 {#versioning}

* **自动版本控制:** Artifact 服务会自动处理版本。当你调用 `save_artifact` 时，服务会为该特定文件名和作用域确定下一个可用版本号（通常从 0 开始递增）。
* **由 `save_artifact` 返回:** `save_artifact` 方法返回分配给新保存 Artifact 的整数版本号。
* **检索:**
  * `load_artifact(..., version=None)`（默认）: 检索 Artifact 的*最新*可用版本。
  * `load_artifact(..., version=N)`: 检索特定版本 `N`。
* **列出版本:** `list_versions` 方法（在服务端，而非上下文）可用于查找 Artifact 的所有现有版本号。对于 ADK Go，请在 `artifact.Service` 上调用 `Versions`。

### 命名空间（会话 vs. 用户） {#namespacing-session-vs-user}

* **概念:** Artifact 可以限定在特定会话内，或者更广泛地限定到用户在应用中的所有会话。此作用域由 `filename` 格式决定，并由 `ArtifactService` 内部处理。

* **默认（会话作用域）:** 如果使用普通文件名如 `"report.pdf"`，Artifact 将与特定 `app_name`, `user_id` 以及 `session_id` 关联。它仅在该精确会话上下文中可访问。

* **用户作用域（`"user:"` 前缀）:** 如果在文件名前加 `"user:"` 前缀，如 `"user:profile.png"`，Artifact 仅与 `app_name` 和 `user_id` 关联。它可以从该用户在应用中的*任何*会话访问或更新。

* **列出行为:** 在 Python 中，从会话内列出 Artifact 会返回会话作用域的文件名*以及*该用户的用户作用域文件名，`"user:"` 前缀保留，例如 `["summary.txt", "user:settings.json"]`。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
# 示例说明命名空间的差异（概念性）

# 会话特定的 Artifact 文件名
session_report_filename = "summary.txt"

# 用户特定的 Artifact 文件名
user_config_filename = "user:settings.json"

# 通过 context.save_artifact 保存 'summary.txt' 时，
# 它与当前的 app_name、user_id 和 session_id 关联。

# 通过 context.save_artifact 保存 'user:settings.json' 时，
# ArtifactService 的实现应识别 "user:" 前缀，
# 并将其范围限制在 app_name 和 user_id 内，使其在该用户的各个会话中可访问。
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "log"
)

	// 注意：仅在使用 GCS ArtifactService 实现时才支持命名空间。
	// 会话范围的 Artifact 仅在当前会话中可用。
	sessionReportFilename := "summary.txt"
	// 用户范围的 Artifact 在当前用户的所有会话中都可用。
	userConfigFilename := "user:settings.json"

	// 通过 ctx.Artifacts().Save 保存 'summary.txt' 时，
	// 它与当前的 app_name、user_id 和 session_id 关联。
	// ctx.Artifacts().Save(sessionReportFilename, *artifact);

	// 通过 ctx.Artifacts().Save 保存 'user:settings.json' 时，
	// ArtifactService 的实现应识别 "user:" 前缀，
	// 并将其范围限制在 app_name 和 user_id 内，使其在该用户的各个会话中可访问。
	// ctx.Artifacts().Save(userConfigFilename, *artifact);
```

{{% /tab %}}
{{< /tabs >}}
这些核心概念协同工作，以在 ADK 框架内提供一个灵活的二进制数据管理系统。

## 通过上下文对象与 Artifact 交互 {#interacting-with-artifacts-via-context-objects}

与 Artifact 交互的主要方式（特别是在回调或工具中）是通过 `CallbackContext` 和 `ToolContext` 对象提供的方法。这些方法抽象了由 `ArtifactService` 管理的底层存储细节。

*(注意：在 Python 和 TypeScript 中，`CallbackContext` 和 `ToolContext` 被统一为一个 `Context` 类型，并且在 Python 中两个名称仍然可以作为它的别名使用。)*

### 前提条件：配置 `ArtifactService` {#prerequisite-configuring-the-artifactservice}

在通过上下文对象使用任何 Artifact 方法之前，你**必须**在初始化 `Runner` 时提供一个 [`BaseArtifactService` 实现](#available-implementations)（例如 [`InMemoryArtifactService`](#inmemoryartifactservice) 或 [`GcsArtifactService`](#gcsartifactservice)）。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 Python 中，你需要在初始化 `Runner` 时提供该实例。

```python
from google.adk.runners import Runner
from google.adk.artifacts import InMemoryArtifactService # Or GcsArtifactService
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService

# 你的 Agent 定义
agent = LlmAgent(name="my_agent", model="gemini-flash-latest")

# 实例化所需的 Artifact 服务
artifact_service = InMemoryArtifactService()

# 将其提供给 Runner
runner = Runner(
    agent=agent,
    app_name="artifact_app",
    session_service=InMemorySessionService(),
    artifact_service=artifact_service # Service must be provided here
)
```

如果在 `InvocationContext` 中未配置 `artifact_service`（如果未传递给 `Runner` 就会发生这种情况），在上下文对象上调用 `save_artifact`、`load_artifact` 或 `list_artifacts` 将引发 `ValueError`。
{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "context"
  "log"

  "google.golang.org/adk/v2/agent/llmagent"
  "google.golang.org/adk/v2/artifact"
  "google.golang.org/adk/v2/model/gemini"
  "google.golang.org/adk/v2/runner"
  "google.golang.org/adk/v2/session"
  "google.golang.org/genai"
)

	// 创建一个新上下文。
	ctx := context.Background()
	// 设置应用名称。
	const appName = "my_artifact_app"
	// 创建一个新的 Gemini 模型。
	model, err := gemini.NewModel(ctx, "gemini-2.5-flash", &genai.ClientConfig{})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	// 创建一个新的 LLM Agent。
	myAgent, err := llmagent.New(llmagent.Config{
		Model:       model,
		Name:        "artifact_user_agent",
		Instruction: "You are an agent that describes images.",
		BeforeModelCallbacks: []llmagent.BeforeModelCallback{
			BeforeModelCallback,
		},
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// 创建一个新的内存 Artifact 服务。
	artifactService := artifact.InMemoryService()
	// 创建一个新的内存会话服务。
	sessionService := session.InMemoryService()

	// 创建一个新的 Runner。
	r, err := runner.New(runner.Config{
		Agent:           myAgent,
		AppName:         appName,
		SessionService:  sessionService,
		ArtifactService: artifactService, // Provide the service instance here
	})
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}
	log.Printf("Runner created successfully: %v", r)
```

{{% /tab %}}
{{< /tabs >}}

### 访问方法 {#accessing-methods}

该 Artifact 交互方法可直接用于 `CallbackContext` 实例（传递给 Agent 和模型回调）和 `ToolContext` 实例（传递给工具回调）在 Go 和 Java 中，并在 Python 和 TypeScript 中可以通过统一的 `Context` 使用。

#### 保存 Artifact {#saving-artifacts}

*   **代码示例：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    import google.genai.types as types
    from google.adk.agents.callback_context import CallbackContext # Or ToolContext

    async def save_generated_report_py(context: CallbackContext, report_bytes: bytes):
        """Saves generated PDF report bytes as an artifact."""
        report_artifact = types.Part.from_bytes(
            data=report_bytes,
            mime_type="application/pdf"
        )
        filename = "generated_report.pdf"

        try:
            version = await context.save_artifact(filename=filename, artifact=report_artifact)
            print(f"Successfully saved Python artifact '{filename}' as version {version}.")
            # 该回调生成的事件将包含：
            # event.actions.artifact_delta == {"generated_report.pdf": version}
        except ValueError as e:
            print(f"Error saving Python artifact: {e}. Is ArtifactService configured in Runner?")
        except Exception as e:
            # 处理潜在的存储错误（例如，GCS 权限）
            print(f"An unexpected error occurred during Python artifact save: {e}")

    # --- 示例用法概念（Python） ---
    # async def main_py():
    #   callback_context: CallbackContext = ... # 获取上下文
    #   report_data = b'...' # 假设这里存储的是 PDF 字节数据
    #   await save_generated_report_py(callback_context, report_data)
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
      "log"

      "google.golang.org/adk/v2/agent"
      "google.golang.org/adk/v2/model"
      "google.golang.org/genai"
    )

    // saveReportCallback 是一个 BeforeModel 回调函数，用于从会话状态中保存报告。
    func saveReportCallback(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
    	// 从会话状态中获取报告数据。
    	reportData, err := ctx.State().Get("report_bytes")
    	if err != nil {
    		log.Printf("No report data found in session state: %v", err)
    		return nil, nil // No report to save, continue normally.
    	}

    	// 检查报告数据是否符合预期格式。
    	reportBytes, ok := reportData.([]byte)
    	if !ok {
    		log.Printf("Report data in session state was not in the expected byte format.")
    		return nil, nil
    	}

    	// 使用报告数据创建一个新的 Artifact。
    	reportArtifact := &genai.Part{
    		InlineData: &genai.Blob{
    			MIMEType: "application/pdf",
    			Data:     reportBytes,
    		},
    	}
    	// 为 Artifact 设置文件名。
    	filename := "generated_report.pdf"
    	// 将 Artifact 保存到 Artifact 服务中。
    	_, err = ctx.Artifacts().Save(ctx, filename, reportArtifact)
    	if err != nil {
    		log.Printf("An unexpected error occurred during Go artifact save: %v", err)
    		// 根据需求，您可能希望向用户返回一个错误。
    		return nil, nil
    	}
    	log.Printf("Successfully saved Go artifact '%s'.", filename)
    	// 返回 nil 以继续到下一个回调或模型。
    	return nil, nil
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}

#### 加载 Artifact {#loading-artifacts}

*   **代码示例：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    import google.genai.types as types
    from google.adk.agents.callback_context import CallbackContext # Or ToolContext

    async def process_latest_report_py(context: CallbackContext):
        """Loads the latest report artifact and processes its data."""
        filename = "generated_report.pdf"
        try:
            # 加载最新版本
            report_artifact = await context.load_artifact(filename=filename)

            if report_artifact and report_artifact.inline_data:
                print(f"Successfully loaded latest Python artifact '{filename}'.")
                print(f"MIME Type: {report_artifact.inline_data.mime_type}")
                # 处理 report_artifact.inline_data.data（字节）
                pdf_bytes = report_artifact.inline_data.data
                print(f"Report size: {len(pdf_bytes)} bytes.")
                # ... 进一步处理 ...
            else:
                print(f"Python artifact '{filename}' not found.")

            # 示例：加载特定版本（如果版本 0 存在）
            # specific_version_artifact = await context.load_artifact(filename=filename, version=0)
            # 如果 specific_version_artifact:
            #     print(f"已加载 '{filename}' 的版本 0。")

        except ValueError as e:
            print(f"Error loading Python artifact: {e}. Is ArtifactService configured?")
        except Exception as e:
            # 处理潜在的存储错误
            print(f"An unexpected error occurred during Python artifact load: {e}")

    # --- 示例用法概念（Python） ---
    # async def main_py():
    #   callback_context: CallbackContext = ... # 获取上下文
    #   await process_latest_report_py(callback_context)
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
      "log"

      "google.golang.org/adk/v2/agent"
      "google.golang.org/adk/v2/model"
    )

    // loadArtifactsCallback 是一个 BeforeModel 回调，用于加载特定的 Artifact
    // 并将其内容添加到 LLM 请求中。
    func loadArtifactsCallback(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
    	log.Println("[Callback] loadArtifactsCallback triggered.")
    	// 在实际应用中，你需要解析用户的请求以找到文件名。
    	// 在此示例中，我们将硬编码一个文件名进行演示。
    	const filenameToLoad = "generated_report.pdf"

    	// 从 Artifact 服务中加载 Artifact。
    	loadedPartResponse, err := ctx.Artifacts().Load(ctx, filenameToLoad)
    	if err != nil {
    		log.Printf("Callback could not load artifact '%s': %v", filenameToLoad, err)
    		return nil, nil // File not found or error, continue to model.
    	}

    	loadedPart := loadedPartResponse.Part

    	log.Printf("Callback successfully loaded artifact '%s'.", filenameToLoad)

    	// 确保请求中至少有一个内容可供附加。
    	if len(req.Contents) == 0 {
    		req.Contents = []*genai.Content{{Parts: []*genai.Part{
    			genai.NewPartFromText("SYSTEM: The following file is provided for context:\n"),
    		}}}
    	}

    	// 将加载的 Artifact 添加到模型请求中。
    	lastContent := req.Contents[len(req.Contents)-1]
    	lastContent.Parts = append(lastContent.Parts, loadedPart)
    	log.Printf("Added artifact '%s' to LLM request.", filenameToLoad)

    	// 返回 nil 以继续到下一个回调或模型。
    	return nil, nil // Continue to next callback or LLM call
    }
    ```

    {{% /tab %}}
    {{< /tabs >}}

#### 使用 `LoadArtifactsTool` {#using-loadartifactstool}

当模型需要决定在回答前加载哪些可用的 Artifact 时，你可以添加 `LoadArtifactsTool`。当用户对上传的文件或生成的大型输出（这些输出作为 Artifact 存储而不是保存在对话上下文中）提出后续问题时，这非常有用。

`LoadArtifactsTool` 在模型指令中列出可用的 Artifact。当模型调用 `load_artifacts` 工具时，ADK 会暂时将选定的 Artifact 内容附加到该请求中，以便模型可以在上下文中使用文件内容进行回答。加载的 Artifact 内容不会永久保存回会话历史，因此模型在以后需要相同 Artifact 时应再次调用该工具。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import LlmAgent
from google.adk.tools.load_artifacts_tool import LoadArtifactsTool

root_agent = LlmAgent(
    name="artifact_reader",
    model="gemini-flash-latest",
    instruction=(
        "Answer questions about available user files. "
        "Call load_artifacts before answering when you need file contents."
    ),
    tools=[
        LoadArtifactsTool(),
    ],
)
```

确保为此 Agent 配置 `Runner`，并使用 `artifact_service`；否则，Artifact 列表和加载将失败。如果您的 Artifact 需要人类可读的摘要，请对子类 `LoadArtifactsTool` 并在加载所选 Artifact 内容之前自定义其请求指令。

**解析电子表格 Artifact（仅限 Python）：**

默认情况下，模型无法内联读取电子表格文件（`.xlsx`, `.xls`）。在 Python 中，您可以设置 `enable_spreadsheet_parsing=True` 将它们解析为 Markdown 表格：

```python
tools=[
    LoadArtifactsTool(enable_spreadsheet_parsing=True),
]
```

- 每个工作表都作为一个单独的 Markdown 表格显示，并使用工作表标题。
- 为避免超过上下文窗口限制，每个工作表的表格输出限制为前 100 行。
{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
  "google.golang.org/adk/v2/agent/llmagent"
  "google.golang.org/adk/v2/tool"
  "google.golang.org/adk/v2/tool/loadartifactstool"
)

agent, err := llmagent.New(llmagent.Config{
    Name:        "artifact_reader",
    Model:       model,
    Instruction: "Answer questions about available user files. " +
        "When user asks about artifacts, load them and describe them.",
    Tools: []tool.Tool{
        loadartifactstool.New(),
    },
})
```

确保此 Agent 的 `runner.Config` 包含 `ArtifactService`；否则 Artifact 列出和加载将失败。
{{% /tab %}}
{{< /tabs >}}

#### 列出 Artifact 文件名 {#listing-artifact-filenames}

*   **代码示例:**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    from google.adk.tools.tool_context import ToolContext

    async def list_user_files_py(tool_context: ToolContext) -> str:
        """Tool to list available artifacts for the user."""
        try:
            available_files = await tool_context.list_artifacts()
            if not available_files:
                return "You have no saved artifacts."
            else:
                # 为用户/大型语言模型格式化列表
                file_list_str = "\n".join([f"- {fname}" for fname in available_files])
                return f"Here are your available Python artifacts:\n{file_list_str}"
        except ValueError as e:
            print(f"Error listing Python artifacts: {e}. Is ArtifactService configured?")
            return "Error: Could not list Python artifacts."
        except Exception as e:
            print(f"An unexpected error occurred during Python artifact list: {e}")
            return "Error: An unexpected error occurred while listing Python artifacts."

    # 此功能通常会被封装在 FunctionTool 中
    # from google.adk.tools import FunctionTool
    # list_files_tool = FunctionTool(func=list_user_files_py)
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
      "fmt"
      "log"
      "strings"

      "google.golang.org/adk/v2/agent"
      "google.golang.org/adk/v2/model"
      "google.golang.org/genai"
    )

    // listUserFilesCallback 是一个 BeforeModel 回调，用于列出可用的 Artifact
    // 并将列表作为上下文添加到 LLM 请求中。
    func listUserFilesCallback(ctx agent.Context, req *model.LLMRequest) (*model.LLMResponse, error) {
    	log.Println("[Callback] listUserFilesCallback triggered.")
    	// 从 Artifact 服务中列出可用的 Artifact。
    	listResponse, err := ctx.Artifacts().List(ctx)
    	if err != nil {
    		log.Printf("An unexpected error occurred during Go artifact list: %v", err)
    		return nil, nil // Continue, but log the error.
    	}

    	availableFiles := listResponse.FileNames

    	log.Printf("Found %d available files.", len(availableFiles))

    	// 如果有可用的文件，将它们添加到 LLM 请求中。
    	if len(availableFiles) > 0 {
    		var fileListStr strings.Builder
    		fileListStr.WriteString("SYSTEM: The following files are available:\n")
    		for _, fname := range availableFiles {
    			fileListStr.WriteString(fmt.Sprintf("- %s\n", fname))
    		}
    		// 将此信息添加到用户的模型请求之前。
    		if len(req.Contents) > 0 {
    			lastContent := req.Contents[len(req.Contents)-1]
    			if len(lastContent.Parts) > 0 {
    				fileListStr.WriteString("\n") // Add a newline for separation.
    				lastContent.Parts[0] = genai.NewPartFromText(fileListStr.String() + lastContent.Parts[0].Text)
    				log.Println("Added file list to LLM request context.")
    			}
    		}
    		log.Printf("Available files:\n%s", fileListStr.String())
    	} else {
    		log.Println("No available files found to list.")
    	}

    	// 返回 nil 以继续到下一个回调或模型。
    	return nil, nil // Continue to next callback or LLM call
    }
    ```

{{% /tab %}}
    {{< /tabs >}}
这些保存、加载和列出的方法为管理 ADK 中的二进制数据持久性提供了便捷且一致的方式，无论你是通过传递给回调和工具的上下文对象，还是直接与`BaseArtifactService`交互，无论选择哪种后端存储实现。

## 可用实现 {#available-implementations}

ADK 提供了`BaseArtifactService`接口的具体实现，提供了适合不同开发阶段和部署需求的存储后端。这些实现处理基于 `app_name`、`user_id`、`session_id` 和 `filename`（包括 `user:` 命名空间前缀）的存储、版本管理和检索 Artifact 数据的细节。

### 记忆文物服务 {#inmemoryartifactservice}

* **存储机制：**
    * Python：使用应用内存中的 Python 字典（`self.artifacts`）。字典键代表 Artifact 路径，值为条目列表，每个列表元素包含 `types.Part` 有效载荷及其 `ArtifactVersion` 元数据的版本。
    * Java：使用嵌套的`HashMap`实例（`private final Map<String, Map<String, Map<String, Map<String, List<Part>>>>> artifacts;`）存储在内存中。每个层级的键分别为`appName`、`userId`、`sessionId`和`filename`。最内层`List<Part>`存储 Artifact 的版本，其中列表索引对应版本号。
* **主要功能：**
    * **简易性：** 无需外部设置或除核心 ADK 库外的依赖。
    * **速度：** 操作通常非常快，因为它们涉及内存中的映射/字典查找和列表操作。
    * **Ephemeral：** 当应用进程终止时，所有存储的 Artifact 都会**丢失**。数据不会在应用重启之间持久存在。
* ** 使用场景：**
    * 适合本地开发和测试，无需持久化。
    * 适用于短暂演示或在应用单次运行中 Artifact 数据纯暂时的场景。
* **实例化：**

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Python" %}}

    ```python
    from google.adk.artifacts import InMemoryArtifactService

    # 只需实例化类
    in_memory_service_py = InMemoryArtifactService()

    # 然后将它传递给 Runner
    # runner = Runner(..., artifact_service=in_memory_service_py)
    ```

    {{% /tab %}}
    {{% tab tabName="Go" %}}

    ```go
    import (
      "google.golang.org/adk/v2/artifact"
    )

    	// 只需实例化服务
    	artifactService := artifact.InMemoryService()
    	log.Printf("InMemoryArtifactService (Go) instantiated: %T", artifactService)

    	// 在你的 Runner 中使用服务
    	// r, _ := runner.New(runner.Config{
    	// 	Agent:           agent,
    	// 	AppName:         "my_app",
    	// 	SessionService:  sessionService,
    	// 	ArtifactService: artifactService,
    	// })
    ```

    {{% /tab %}}
    {{< /tabs >}}

### GcsArtifactService {#gcsartifactservice}

*   **存储机制：** 利用 Google 云存储 (GCS) 进行持久化 Artifact 存储。每个版本的 Artifact 都作为单独的对象（Blob）存储在指定的 GCS 桶中。
*   **对象命名规则：** 使用层级路径结构构建 GCS 对象名称（Blob 名称）。
*   **主要特性：**
    *   **持久性：** 存储在 GCS 中的 Artifact 在应用重启和部署后依然存在。
    *   **可扩展性：** 利用 Google 云存储的可扩展性和耐久性。
    *   **版本控制：** 每个版本显式地作为独立的 GCS 对象存储。在 Python 中，`save_artifact` 会分配下一个版本号，从 `0` 开始，而不是覆盖现有对象。
    *   **所需权限：** 应用环境需要适当的凭据（例如，应用默认凭据）和 IAM 权限，以读取和写入指定的 GCS 桶。
*   **使用场景：**
    *   需要持久化 Artifact 存储的生产环境。
    *   需要在不同应用实例或服务之间共享 Artifact 的场景（通过访问相同的 GCS 桶）。
    *   需要长期存储和检索用户或会话数据的应用。
*   **实例化：**

    {{< tabs tabTotal="1" >}}
    {{% tab tabName="Python" %}}

    ```python
    from google.adk.artifacts import GcsArtifactService

    # 指定 GCS 存储桶名称
    gcs_bucket_name_py = "your-gcs-bucket-for-adk-artifacts" # Replace with your bucket name

    try:
        gcs_service_py = GcsArtifactService(bucket_name=gcs_bucket_name_py)
        print(f"Python GcsArtifactService initialized for bucket: {gcs_bucket_name_py}")
        # 确保您的环境具备访问此存储桶的凭据。
        # 例如，通过应用程序默认凭据 (ADC)

        # 然后将它传递给 Runner
        # runner = Runner(..., artifact_service=gcs_service_py)

    except Exception as e:
        # 在 GCS 客户端初始化期间捕获潜在错误（例如，身份验证问题）
        print(f"Error initializing Python GcsArtifactService: {e}")
        # 适当处理错误 - 可能回退到 InMemory 或抛出异常
    ```

    {{% /tab %}}
    {{< /tabs >}}
选择合适的 `ArtifactService` 实现取决于您的应用程序对数据持久性、可扩展性和操作环境的要求。

## 最佳实践 {#best-practices}

为了有效且可维护地使用 Artifact：
* **选择合适的服务：** 对于快速原型设计、测试以及不需要持久性的场景，请使用 `InMemoryArtifactService`。对于需要数据持久性和可扩展性的生产环境，请使用 `GcsArtifactService`（或为其他后端实现自己的 `BaseArtifactService`）。
* **有意义的文件名：** 使用清晰、描述性的文件名。包含相关扩展名（`.pdf`、`.png`、`.wav`）有助于人类理解内容，尽管 `mime_type` 决定了程序的处理方式。为临时 Artifact 与持久 Artifact 建立命名约定。
* **指定正确的 MIME 类型：** 在为 `save_artifact` 创建 `types.Part` 时，总是提供准确的 `mime_type`。这对于后来需要 `load_artifact` 来正确解释 `bytes` 数据的应用或工具至关重要。在可能的情况下，使用标准 IANA MIME 类型。
* **理解版本控制：** 请记住，`load_artifact()` 在没有指定 `version` 参数时会检索*最新版*。如果您的逻辑依赖于 Artifact 的特定历史版本，请在加载时提供整数版本号。
* **有意使用命名空间 (`user:`)：** 仅在数据确实属于用户且应在其所有会话中访问时，才为文件名使用 `"user:"` 前缀。对于特定于单个对话或会话的数据，请使用没有前缀的常规文件名。
* **错误处理：**
    * 在调用上下文方法（`save_artifact`、`load_artifact`、`list_artifacts`）之前，始终检查 `artifact_service` 是否已配置——如果服务 `None`，它们将抛出 `ValueError`。
    * 检查 `load_artifact` 的返回值，如果 Artifact 或版本不存在，它将返回 `None`。不要假设它总是返回 `Part`。
    * 准备处理底层存储服务的异常，尤其是使用 `GcsArtifactService`，例如权限问题的 `google.api_core.exceptions.Forbidden`，存储桶不存在的 `NotFound`，以及网络错误。
* **大小考虑：** Artifact 适合典型文件大小，但对于极大的文件，尤其是在云存储中，要注意潜在的成本和性能影响。`InMemoryArtifactService` 如果存储许多大 Artifact 可能会消耗大量内存。评估是否非常大的数据通过直接 GCS 链接或其他专用存储解决方案处理，而不是在内存中传递整个字节数组，可能更为合适。
* **清理策略：** 对于持久存储如 `GcsArtifactService`，Artifact 将保持直到被显式删除。如果 Artifact 表示临时数据或寿命有限，请实施清理策略。注意事项：
    * 在存储桶上使用 GCS 生命周期策略。
    * 构建使用 `artifact_service.delete_artifact` 方法的特定工具或管理功能（注意：出于安全考虑，删除操作 *不会* 通过上下文对象暴露）。
    * 仔细管理文件名，以在需要时允许基于模式的删除。

---

原文：[Artifacts](https://adk.dev/artifacts/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/artifacts/index.md)
