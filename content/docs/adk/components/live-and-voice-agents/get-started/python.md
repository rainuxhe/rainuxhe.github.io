---
title: "Python"
description: "通过本快速入门，您将学习如何创建一个简单的 Agent，并使用 ADK 流媒体实现与其的低延迟双向语音和视频通信。我们将安装 ADK，设置一个基本的“Google 搜索”"
icon: "article"
weight: 10
toc: true
---

通过这个快速入门，您将学习如何创建一个简单的 Agent，并使用 ADK Streaming 实现与其进行低延迟、双向的语音和视频通信。我们将安装 ADK，设置一个基础的“Google 搜索”Agent，尝试使用 `adk web` 工具通过 Streaming 运行 Agent，然后解释如何使用 ADK Streaming 和 [FastAPI](https://fastapi.tiangolo.com/) 自行构建一个简单的异步 Web 应用。

**注意：** 本指南假设您有在 Windows、Mac 和 Linux 环境下使用终端的经验。

## 支持语音/视频流的模型 {#supported-models}

语音和视频流需要支持 Live API 的 Gemini 模型。您可以在文档中找到支持该功能的 **模型 ID**：

- [Google AI Studio: Gemini Live API](https://ai.google.dev/gemini-api/docs/models#live-api)
- [Agent Platform: Gemini Live API](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api)

## 1. 设置环境并安装 ADK {#setup-environment-install-adk}

创建并激活虚拟环境（推荐）：

```bash
# Create
python3 -m venv .venv
# Activate (each new terminal)
# macOS/Linux: source .venv/bin/activate
# Windows CMD: .venv\Scripts\activate.bat
# Windows PowerShell: .venv\Scripts\Activate.ps1
```

安装 ADK：

```bash
pip install google-adk
```

## 2. 项目结构 {#project-structure}

创建以下文件夹结构，并包含空文件：

```console
adk-streaming/  # Project folder
└── app/ # the web app folder
    ├── .env # Gemini API key
    └── google_search_agent/ # Agent folder
        ├── __init__.py # Python package
        └── agent.py # Agent definition
```

### agent.py {#agentpy}

将以下代码块复制粘贴到 `agent.py` 文件中。

对于 `model`，请按照前面 [Models section](#supported-models) 中的描述仔细检查模型 ID。

```py
from google.adk.agents import Agent
from google.adk.tools import google_search  # Import the tool

root_agent = Agent(
   # Agent 的独特名称。
   name="basic_search_agent",
   # Agent 将使用的大型语言模型（LLM）。
   # 请填写支持实时功能的最新模型ID。
   # https://adk.dev/live/get-started/streaming-python/#supported-models
   model="...",
   # Agent 用途的简短描述。
   description="Agent to answer questions using Google Search.",
   # 设置 Agent 行为的说明。
   instruction="You are an expert researcher. You always stick to the facts.",
   # 添加 google_search 工具以通过 Google 搜索执行信息获取。
   tools=[google_search]
)
```

`agent.py` 是存储你所有 Agent 逻辑的地方，并且你必须定义一个 `root_agent`。

注意你是如何轻松地将 [Google Search](https://ai.google.dev/gemini-api/docs/grounding?lang=python#configure-search) 功能] 与基础集成的。`Agent` 类和 `google_search` 工具处理了与 LLM 和搜索 API 的复杂交互，使你能够专注于 Agent 的*目的*和*行为*。

![intro_components.png](/images/adk/quickstart-streaming-tool.png)

将以下代码块复制粘贴到 `__init__.py` 文件中。

```py title="__init__.py"
from . import agent
```

## 3\. 设置平台 {#set-up-the-platform}

要运行 Agent，请从 Google AI Studio 或 Google Cloud Agent Platform 中选择一个平台：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Gemini - Google AI Studio" %}}
1. 从 [Google AI Studio](https://aistudio.google.com/apikey) 获取 API 密钥。
2. 打开位于 (`app/`) 内的 **`.env`** 文件，并复制粘贴以下代码。

    ```env title=".env"
    GOOGLE_GENAI_USE_ENTERPRISE=FALSE
    GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_API_KEY_HERE
    ```

3. 用您实际的 `API KEY` 替换 `PASTE_YOUR_ACTUAL_API_KEY_HERE`。
{{% /tab %}}
{{% tab tabName="Gemini - Google Cloud Agent Platform" %}}
1. 您需要一个现有的 [Google Cloud](https://cloud.google.com/?e=48754805&hl=en) 账户和一个项目。
   * 设置一个 [Google Cloud 项目](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start)
   * 设置 [gcloud CLI ](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start)
   * 在终端通过运行 `gcloud auth login` 验证 Google Cloud 身份。
   * [启用 Agent Platform API ](https://console.cloud.google.com/flows/enableapi?apiid=aiplatform.googleapis.com)。
2. 打开位于 (`app/`) 内的 **`.env`** 文件。复制粘贴以下代码并更新项目 ID 和位置。

    ```env title=".env"
    GOOGLE_GENAI_USE_ENTERPRISE=TRUE
    GOOGLE_CLOUD_PROJECT=PASTE_YOUR_ACTUAL_PROJECT_ID
    GOOGLE_CLOUD_LOCATION=us-central1
    ```

{{% /tab %}}
{{< /tabs >}}
有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见
[连接到 Google Cloud 和 Agent 平台 ](/docs/adk/build/get-started/google-cloud/)。

## 4. 使用 `adk web` 尝试 Agent {#try-the-agent-with-adk-web}

现在可以尝试 Agent 了。运行以下命令以启动 **开发界面**。首先，确保将当前目录设置为 `app`：

```shell
cd app
```

另外，使用以下命令设置 `SSL_CERT_FILE` 变量。这对于后续的语音和视频测试是必需的。

{{< tabs tabTotal="2" >}}
{{% tab tabName="OS X & Linux" %}}

```bash
export SSL_CERT_FILE=$(python3 -m certifi)
```

{{% /tab %}}
{{% tab tabName="Windows" %}}

```powershell
$env:SSL_CERT_FILE = (python3 -m certifi)
```

{{% /tab %}}
{{< /tabs >}}
然后，运行开发者界面：

```shell
adk web
```

{{% alert context="info" %}}
**Windows 用户注意事项**

在点击 `_make_subprocess_transport NotImplementedError` 时，考虑使用 `adk web --no-reload` 来代替。
{{% /alert %}}
{{% alert context="warning" %}}
**注意：ADK Web 仅用于开发**

ADK Web ***不适用于生产部署***。您应仅将 ADK Web 用于开发和调试目的。
{{% /alert %}}
在浏览器中**直接打开提供的 URL**（通常是 `http://localhost:8000` 或 `http://127.0.0.1:8000`）。此连接完全在您的本地机器上进行。选择 `google_search_agent`。

### 尝试语音和视频 {#try-with-voice-and-video}

要尝试语音，请重新加载浏览器，点击麦克风按钮启用语音输入，并用语音提出以下问题。Agent 将使用 google_search 工具获取最新信息以回答这些问题。您将实时听到语音回答。

* 纽约的天气如何？
* 纽约现在几点？
* 巴黎的天气如何？
* 巴黎现在几点？

要尝试视频，请重新加载浏览器，点击摄像头按钮启用视频输入，并提出类似“你看见什么？”的问题。Agent 将回答视频输入中看到的内容。

#### 注意事项 {#caveat}

- 您无法使用文字聊天与 native-audio 模型。当在 `adk web` 输入文本消息时，您将看到错误。

### 停止工具 {#stop-the-tool}

按 `Ctrl-C` 来停止控制台上的 `adk web`。

### ADK 流媒体说明 {#note-on-adk-streaming}

模型回调（`before_model_callback` 和 `after_model_callback`）不会在流媒体路径上调用；ADK 仅在 `run_async` 路径上执行它们。Agent 回调（`before_agent_callback`、`after_agent_callback`）和工具回调（`before_tool_callback`、`after_tool_callback`）在流媒体过程中会执行，`LongRunningFunctionTool` 和 `ExampleTool` 也会执行。在工作流 Agent 中，仅 `SequentialAgent` 支持流媒体：`LoopAgent` 和 `ParallelAgent` 会引发 `NotImplementedError`。

恭喜！您已成功创建并与 ADK 的第一个流媒体 Agent 互动！

## 下一步：构建自定义流媒体应用 {#next-steps-build-custom-streaming-app}

[构建自定义服务器](/docs/adk/components/live-and-voice-agents/production/build-a-custom-server/) 讲解了使用 ADK 构建自定义异步 Web 应用的服务器端和客户端代码，实现实时双向音频和文本通信。从那里，[会话与流媒体循环](/docs/adk/components/live-and-voice-agents/building/sessions/) 深入涵盖了应用程序生命周期，[事件](/docs/adk/components/live-and-voice-agents/building/events/) 涵盖了一切，`run_live()` 回传给您。

---

原文：[Build live streaming agent with Python](https://adk.dev/live/get-started/streaming-python/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/get-started/streaming-python.md)
