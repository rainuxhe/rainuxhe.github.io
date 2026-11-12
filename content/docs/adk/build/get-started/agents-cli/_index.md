---
title: "Agents CLI"
description: "本指南向您展示如何使用 Agents CLI 快速上手 Agent 开发工具包（ADK）。您可以将 Agents CLI 工具集与 Antigravity、Claude Code 和 Codex 等编码 Agent 一起使用，以构建、评估和开发 Agent。"
icon: "smart_toy"
weight: 60
toc: true
---

本指南向您展示如何使用 Agents CLI 入门并运行 Agent Development Kit (ADK)。您可以使用 Agents CLI 工具集与编程 Agent（如 Antigravity、Claude Code 和 Codex）一起构建、评估和部署 ADK Agent。更多信息，请参阅 [Agents CLI ](https://google.github.io/agents-cli/) 文档](#)。

在开始之前，请确保已安装以下内容：

*   Python 3.11 或更高版本：Agents CLI 支持 Python 中的 ADK Agent
*   用于管理环境和依赖项的 [`uv` ](https://docs.astral.sh/uv/getting-started/installation/) 工具
*   用于安装技能的 [Node.js ](https://nodejs.org/en/download)
*   编程 Agent，如 [Antigravity ](https://antigravity.google/)、[Claude Code ](https://docs.anthropic.com/en/docs/claude-code) 或 [Codex ](https://github.com/openai/codex)

如果您想将 ADK Agent 部署到像 Google Cloud 这样的服务，请确保还安装了以下工具：

*   [Google Cloud CLI ](https://cloud.google.com/sdk/docs/install)
*   [Terraform ](https://developer.hashicorp.com/terraform/downloads)

## 安装 {#installation}

运行以下命令安装 Agents CLI。此步骤会将 `agents-cli` 命令、ADK Python 包以及 ADK 技能安装到您计算机上已有的任何编程 Agent 中：

```shell
uvx google-agents-cli setup
```

<details>
<summary>替代安装方法</summary>

**pipx:**

```shell
pipx install google-agents-cli && agents-cli setup
```

**pip:**

```shell
pip install google-agents-cli && agents-cli setup
```

**仅限技能：**

```shell
npx skills add google/agents-cli
```

</details>
安装命令是唯一需要你自己运行的命令。安装完成后，你可以使用你的编码 Agent 来构建和运行 ADK Agent。

## 认证 {#authenticate}

Agents CLI 需要生成式 AI API 的凭证才能运行你的 Agent。最简单的选项是来自 Google AI Studio 的 Gemini API 密钥。在[API Keys](https://aistudio.google.com/app/apikey) 页面创建密钥，然后在下一步创建项目脚手架后，打开其 `.env` 文件并设置：

```env title="Update: .env"
GEMINI_API_KEY=YOUR_API_KEY
```

在同一个文件中将三行 `GOOGLE_CLOUD_*` 注释掉，以便 SDK 使用你的密钥而不是 Vertex AI。

<details>
<summary> 使用 Google 云 Agent 平台代替 </summary>

如果你已经有一个 Google 云项目，Agents CLI 会使用你的默认应用凭据：

```shell
gcloud auth application-default login
```

确保在生成的 `.env` 文件中 `GOOGLE_CLOUD_*` 行未被注释，并将其设置为您的项目标识符。有关使用 ADK 连接 Google Cloud 服务和项目的更多信息，请参阅 ADK 的 [Google Cloud 设置指南](/docs/adk/build/get-started/google-cloud/)。

</details>
## 构建您的 Agent {#build-your-agent}

打开您的编码 Agent 并确认它可以看到技能：

{{< tabs tabTotal="3" >}}
{{% tab tabName="Antigravity" %}}

```shell
antigravity            # launch from your IDE or terminal
# then verify the Agents CLI skills are listed in your environment
```

{{% /tab %}}
{{% tab tabName="Claude Code" %}}

```shell
claude
/skills                # expect google-agents-cli-* entries in the list
```

{{% /tab %}}
{{% tab tabName="Codex" %}}

```shell
codex
/skills                # expect google-agents-cli-* entries in the list
```

{{% /tab %}}
{{< /tabs >}}
<details>
<summary>使用其他编码 Agent</summary>

Agents CLI 可与任何支持 [skills](https://agentskills.io/what-are-skills) 的编码 Agent 一起使用。大多数 Agent 通过 `/skills` 命令或设置面板列出它们。

</details>
然后告诉编码 Agent 你想要构建的内容：

```shell title="Coding agent prompt"
Use agents-cli to build an agent that turns long text into short
bullet-point summaries
```

您的编码 Agent 激活 `google-agents-cli-workflow` 和 `google-agents-cli-scaffold` 技能，询问有关您的 Agent 调用的工具、您期望的输入和输出以及用于评估的成功标准的澄清问题，然后构建项目。

接下来，您的编码 Agent 使用 `google-agents-cli-adk-code` 技能将您的 Agent 写入 `app/agent.py`。最终，您将得到一个工作项目，包含 Agent 代码、测试和评估数据集，文件结构如下：

```none
my-agent/
    app/
        agent.py                # main agent code
        fast_api_app.py         # server, telemetry, and routes
        app_utils/              # session and artifact services
    tests/
        eval/                   # evaluation datasets and metrics
        integration/            # end-to-end agent tests
        unit/
    pyproject.toml              # project config and dependencies
    agents-cli-manifest.yaml    # Agents CLI configuration
    Dockerfile                  # container image for deployment
    GEMINI.md                   # project guidance for coding agents
    .env                        # API keys or project IDs
```

当你计划测试、评估和部署 Agent 时，请使用此项目结构。
如果你想创建用于学习 ADK 的单文件 Agent，请使用 `adk create` 命令。

## 运行你的 Agent {#run-your-agent}

请让你的编码 Agent 启动本地游戏区，或者你自己运行它：

```console
agents-cli playground
```

此命令启动带有热重载的 ADK 网络界面，因此您在编辑项目时所做的更改会立即反映在项目中。您可以访问游乐场 (http://localhost:8080)。在左上角选择 Agent，并粘贴几段文本。Agent 会以简短的要点总结进行回复。

## 接下来：评估并部署您的 Agent {#next-evaluate-and-deploy-your-agent}

现在您已经安装了 Agents CLI 并运行了第一个 Agent，您可以根据以下说明使用您的编码 Agent 对其进行评估和部署：

*   ***“为此 Agent 编写评估并运行”*** 以根据您在规划时设定的成功标准评估您的 Agent。您的编码 Agent 会对结果打分，将失败按原因分组，并调整 Agent 的指令，直到其通过。
*   ***“将此部署到 Cloud Run”*** 以将您的 Agent 部署到 Agent Runtime、Cloud Run 或 GKE。
*   ***“为我的 Agent 设置可观察性基础设施”*** 以添加提示-响应日志和内容日志。

有关完整演练，包括评估、部署和可观察性，请参见 Agents CLI [教程：构建您的第一个 Agent]。

---

原文：[Agents CLI Quickstart for ADK](https://adk.dev/get-started/agents-cli/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/agents-cli.md)
