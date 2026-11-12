---
title: "LiteRT-LM"
description: "你可以使用 LiteRT-LM 库在各种计算设备上高效地本地运行语言模型，而无需像图形处理单元 (GPU) 或张量处理单元 (TPU) 这样的专用处理器。L"
icon: "article"
weight: 110
toc: true
---

支持版本：Python v0.1.0。

您可以使用 [LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM) 库在各种计算设备上高效地本地运行语言模型，而无需使用图形处理单元（GPU）或张量处理单元（TPU）等专用处理器。LiteRT-LM 支持多种模型，包括 Google Gemma 模型以及第三方模型。本指南提供了使用 ADK 设置 LiteRT-LM 的说明，适用于以下语言：

- [Python](#python)
- [Kotlin](#kotlin)

## Python {#python}

这些说明描述了如何在 Python 中使用 LiteRT-LM 服务器与 ADK，配合 Gemma 开放权重模型，包括使用 LiteRT-LM 本地托管模型服务器 `lit`。

### 安装资源 {#install-resources}

您需要下载一个模型以供 LiteRT-LM 使用，并使用 `lit` CLI 工具帮助您找到并下载模型。

#### 安装 `lit` CLI 工具 {#install-lit-cli-tool}

按照 LiteRT-LM GitHub 仓库中的 [说明](https://github.com/google-ai-edge/LiteRT-LM?tab=readme-ov-file#desktop-cli-lit) 下载并安装 `lit` CLI 工具。

#### 下载模型 {#download-a-model}

在启动服务器之前，您需要下载一个模型。使用 `lit` 下载 LiteRT-LM 模型时，需要 _Hugging Face_ 用户访问令牌。您可以在 _Hugging Face_ 网站获取 [访问令牌](https://huggingface.co/settings/tokens)。

要查看可供下载的模型列表，请使用 `lit list` 命令：

```bash
lit list --show_all
```

使用 `lit pull` 命令下载模型：

```bash
export HUGGING_FACE_HUB_TOKEN="**your Hugging Face token**"
lit pull gemma3n-e2b
```

### 配置您的 Agent {#configure-your-agent}

配置您的 Agent 以连接到 LiteRT-LM 和托管模型。
在使用 LiteRT-LM 运行 Gemma 模型时，您需要使用模型标识符和本地网络地址配置 `Gemini` 模型类。

要在 ADK 中使用 LiteRT-LM 和 Gemma 模型：

1. 将 `base_url` 设置为 LiteRT-LM 服务器 URL，包括协议，例如：`http://localhost:8001`。
2. 将 `model` 设置为 LiteRT-LM 模型名称，例如：`gemma3n-e2b`。

以下示例代码展示了如何配置 Agent 以连接到本地托管的 LiteRT-LM 实例，该实例提供上面描述的 Gemma 模型配置：

```py
from google.adk.agents import Agent
from google.adk.models import Gemini

root_agent = Agent(
    model=Gemini(
        model="gemma3n-e2b",
        base_url="http://localhost:8001",
    ),
    name="dice_agent",
    description=(
        "hello world agent that can roll a die of 8 sides and check prime"
        " numbers."
    ),
    instruction="""
      You roll dice and answer questions about the outcome of the dice rolls.
    """,
    tools=[
        roll_die,
        check_prime,
    ],
)
```

然后像平常一样运行 Agent：

```bash
adk web
```

### 运行 LiteRT-LM 服务器 {#running-the-litert-lm-server}

LiteRT-LM 服务器是一个独立的进程，用于服务 LiteRT-LM 模型。它由 LiteRT-LM 命令行工具 `lit` 启动。

#### 运行服务器 {#run-the-server}

在下载模型后，通过运行以下命令在本地启动 LiteRT-LM 服务器：

```bash
lit serve --port 8001
```

{{% alert context="success" %}}
**本地服务器端口号**

您可以为 LiteRT-LM 服务器选择任何端口号，只要它与您在 Agent 代码中的 `Gemini` 类中设置的 `base_url` 匹配。
{{% /alert %}}

#### 调试 {#debugging}

要查看发送到 LiteRT-LM 服务器的传入请求以及发送到模型的确切输入，请使用 `--verbose` 标志：

```bash
lit serve --port 8001 --verbose
```

## Kotlin {#kotlin}

这些说明描述了如何在 Kotlin 中使用 `com.google.adk.kt.litertlm` 包将 LiteRT-LM 与 ADK 一起使用。

### 安装资源 {#install-resources}

您需要下载一个模型以用于 LiteRT-LM，并使用 `litert-lm` CLI 工具帮助您查找并下载模型。

#### 安装 LiteRT-LM CLI {#install-litert-lm-cli}

先决条件：Python 3.10 或更高版本

要安装 CLI，请运行：

```bash
pip install --upgrade litert-lm
```

有关其他安装方法，例如使用 uv，请参见
[LiteRT-LM CLI 安装指南](https://developers.google.com/edge/litert-lm/cli/installation)。

#### 下载模型 {#download-a-model}

下载与 LiteRT-LM 兼容的模型以使用 `litert-lm` CLI 工具。
使用 `litert-lm` 从 Hugging Face 直接下载模型：

```bash
litert-lm import \
  --from-huggingface-repo litert-community/gemma-4-E2B-it-litert-lm \
  gemma-4-E2B-it.litertlm
```

下载后，模型会存储在本地于：

```
~/.litert-lm/models/gemma-4-E2B-it.litertlm/model.litertlm
```

有关 `litert-lm` 的更多详细信息，请参阅 [LiteRT-LM CLI 使用指南](https://developers.google.com/edge/litert-lm/cli/usage)。

### 添加依赖项 {#add-dependencies}

ADK Kotlin 通过一个适配器包 `com.google.adk:google-adk-kotlin-litertlm` 与 LiteRT-LM 协作。

在您的 `build.gradle.kts` 中，将 `com.google.adk:google-adk-kotlin-litertlm` 和 `com.google.ai.edge.litertlm:litertlm-jvm` 添加到您的依赖项中：

```kt
repositories {
    mavenCentral()
    google()
}

dependencies {
    implementation("com.google.adk:google-adk-kotlin-core:1.5.0")
    implementation("com.google.adk:google-adk-kotlin-litertlm:1.5.0")
    implementation("com.google.ai.edge.litertlm:litertlm-jvm:0.13.1")
    // other dependencies...
}
```

### 配置 Agent 模型 {#configure-agent-model}

通过将 `LiteRtLmModel` 对象作为 `LlmAgent` 对象的一部分进行配置，使用 LiteRT-LM 运行本地 Agent 模型。如果您尚未拥有 ADK Kotlin 项目，请按照 [Kotlin Quickstart for ADK（官方英文）](https://adk.dev/get-started/kotlin/) 开始指南]。以下代码示例展示了如何配置 `LlmAgent`，并将 `model` 参数设置为 `LiteRtLmModel`：

```kt
 object HelloTimeAgent {

    // Get model path from environment variable.
    private val modelPath: String by lazy {
        System.getenv("LITERT_LM_MODEL_PATH")
            ?: throw IllegalStateException(
                "LITERT_LM_MODEL_PATH environment variable must be set pointing to a .litertlm file."
            )
    }

    @JvmField
    val rootAgent =
        LlmAgent(
            name = "hello_time_agent",
            description = "Tells the current time in a specified city.",
            model =
                LiteRtLmModel.create(
                    EngineConfig(modelPath = modelPath, backend = Backend.CPU())
                ),
            instruction =
                Instruction(
                    "You are a helpful assistant that tells the current time in a city. " +
                        "Use the 'getCurrentTime' tool for this purpose."
                ),
            tools = TimeService().generatedTools(),
        )
}
```

在此示例中，LiteRT-LM 模型文件的路径是从环境变量 `LITERT_LM_MODEL_PATH` 中读取的。模型将在 CPU 上运行。您可以通过设置 `backend = Backend.GPU()` 来在 GPU 上运行模型。

当您运行 Agent 时，将 `LITERT_LM_MODEL_PATH` 设置为模型文件的位置，例如：`~/.litert-lm/models/gemma-4-E2B-it.litertlm/model.litertlm`。

### 运行您的 Agent {#run-your-agent}

如果您按照上述修改完成了 [Kotlin Quickstart for ADK（官方英文）](https://adk.dev/get-started/kotlin/)，您可以使用命令行 REPL 运行您的 ADK Agent，并将环境变量 `LITERT_LM_MODEL_PATH` 设置为模型文件的路径：

```bash
LITERT_LM_MODEL_PATH=~/.litert-lm/models/gemma-4-E2B-it.litertlm/model.litertlm ./gradlew run
```

示例互动：

```
Agent hello_time_agent is ready. Type 'exit' to quit.

You > what's your name?

hello_time_agent > I am Gemma 4, a Large Language Model developed by Google DeepMind.

You > what time is it in paris?

hello_time_agent > calls tool: getCurrentTime

hello_time_agent > The time in Paris is 10:30 am.
```

---

原文：[LiteRT-LM model host for ADK agents](https://adk.dev/agents/models/litert-lm/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/models/litert-lm.md)
