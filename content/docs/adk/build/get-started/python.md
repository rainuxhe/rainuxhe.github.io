---
title: "Python 快速开始"
description: "使用 Python 和 Agent Development Kit（ADK）在几分钟内创建并运行第一个 Agent。"
icon: "article"
weight: 10
toc: true
---

本指南向您展示如何使用 Python 的 Agent Development Kit（ADK）快速启动。在开始之前，请确保您已安装以下内容：

* Python 3.10 或更高版本
* `pip` 用于安装软件包

## 安装 {#installation}

通过运行以下命令来安装 ADK：

```shell
pip install google-adk
```

<details>
<summary>建议：创建并激活一个 Python 虚拟环境</summary>

创建一个 Python 虚拟环境：

```shell
python3 -m venv .venv
```

激活 Python 虚拟环境：

{{< tabs tabTotal="3" >}}
{{% tab tabName="Windows Command Prompt" %}}

```console
.venv\Scripts\activate.bat
```

{{% /tab %}}
{{% tab tabName="Windows PowerShell" %}}

```console
.venv\Scripts\Activate.ps1
```

{{% /tab %}}
{{% tab tabName="MacOS / Linux" %}}

```bash
source .venv/bin/activate
```

{{% /tab %}}
{{< /tabs >}}
</details>

## 创建一个 Agent 项目 {#create-an-agent-project}

运行 `adk create` 命令以启动一个新的 Agent 项目。

```shell
adk create my_agent
```

### 探索 Agent 项目 {#explore-the-agent-project}

创建的 Agent 项目具有以下结构，其中 `agent.py` 文件包含 Agent 的主要控制代码。

```none
my_agent/
    agent.py      # main agent code
    .env          # API keys or project IDs
    __init__.py
```

## 更新您的 Agent 项目 {#update-your-agent-project}

`agent.py` 文件包含一个 `root_agent` 定义，这是 ADK Agent 的唯一必要元素。您还可以为 Agent 定义要使用的工具。更新生成的 `agent.py` 代码以包含一个 `get_current_time` 工具供 Agent 使用，如以下代码所示：

```python
from google.adk.agents.llm_agent import Agent

# 模拟工具实现
def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city."""
    return {"status": "success", "city": city, "time": "10:30 AM"}

root_agent = Agent(
    model='gemini-flash-latest',
    name='root_agent',
    description="Tells the current time in a specified city.",
    instruction="You are a helpful assistant that tells the current time in cities. Use the 'get_current_time' tool for this purpose.",
    tools=[get_current_time],
)
```

### 设置您的 API 密钥 {#set-your-api-key}

该项目使用 Gemini API，这需要一个 API 密钥。如果您还没有 Gemini API 密钥，请在 Google AI Studio 的 [API Keys](https://aistudio.google.com/app/apikey) 页面](#) 创建一个密钥。

在终端窗口中，将您的 API 密钥写入 `.env` 文件作为环境变量：

{{< tabs tabTotal="3" >}}
{{% tab tabName="MacOS / Linux" %}}

```bash title="Update: my_agent/.env"
echo 'GOOGLE_API_KEY="YOUR_API_KEY"' > .env
```

{{% /tab %}}
{{% tab tabName="Windows PowerShell" %}}

```console title="Update: my_agent/.env"
echo 'GOOGLE_API_KEY="YOUR_API_KEY"' > .env
```

{{% /tab %}}
{{% tab tabName="Windows Command Prompt" %}}

```console title="Update: my_agent/.env"
echo GOOGLE_API_KEY="YOUR_API_KEY" > .env
```

{{% /tab %}}
{{< /tabs >}}
<details>
<summary>使用其他 AI 模型与 ADK</summary>

ADK 支持使用许多生成式 AI 模型。有关在 ADK Agent 中配置其他模型的更多信息，请参见
[模型 & 身份验证](/docs/adk/build/models-for-agents/)。

</details>

## 运行您的 Agent {#run-your-agent}

您可以使用交互式命令行界面运行您的 ADK Agent，使用
`adk run` 命令或 ADK 提供的 ADK Web 用户界面，通过
`adk web` 命令。 这两种选项都允许您测试和与您的
Agent 进行交互。

### 使用命令行界面运行 {#run-with-command-line-interface}

使用 `adk run` 命令行工具运行您的 Agent。

```console
adk run my_agent
```

![adk-run.png](/images/adk/adk-run.png)

### 使用网页界面运行 {#run-with-web-interface}

ADK 框架提供了网页界面，您可以用它来测试和与您的 Agent 互动。您可以使用以下命令启动网页界面：

```console
adk web --port 8000
```

{{% alert context="info" %}}

从包含您的`my_agent/`文件夹的**父目录**运行此命令。例如，如果您的 Agent 位于`agents/my_agent/`中，请从`agents/`目录运行`adk web`。
{{% /alert %}}
此命令启动一个带有聊天界面的Web服务器以供您的 Agent 使用。您可以在`http://localhost:8000`访问Web界面。在左上角选择 Agent 并输入请求。

![adk-web-dev-ui-chat.png](/images/adk/adk-web-dev-ui-chat.png)

{{% alert context="warning" %}}
**注意：ADK Web仅用于开发**

ADK Web***不适用于生产部署***。您应仅将 ADK Web用于开发和调试目的。
{{% /alert %}}

## 下一步：构建您的 Agent {#next-build-your-agent}

现在您已经安装了 ADK 并运行了第一个 Agent，尝试按照我们的构建指南构建您自己的 Agent：

*  [构建您的 Agent](/docs/adk/build/build-your-agent/)

---

原文：[Python Quickstart for ADK](https://adk.dev/get-started/python/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/python.md)
