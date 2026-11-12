---
title: "Agent 配置"
description: "ADK Agent 配置功能让您无需编写代码即可构建 ADK 工作流。Agent 配置使用 YAML 格式的文本文件，并附有对 Agent 的简要描述，使几乎任何人都可以组装和运行 ADK"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v1.11.0。

ADK Agent 配置功能让您无需编写代码即可构建 ADK 工作流。Agent 配置使用 YAML 格式的文本文件，并附有 Agent 的简要描述，使几乎任何人都能组装和运行 ADK Agent。以下是一个基本 Agent 配置定义的简单示例：

```yaml
name: assistant_agent
model: gemini-flash-latest
description: A helper agent that can answer users' questions.
instruction: You are an agent to help answer users' various questions.
```

您可以使用 Agent 配置文件构建更复杂的 Agent，这些 Agent 可以包含函数、工具、子 Agent 等。本页面介绍了如何使用 Agent 配置功能构建和运行 ADK 工作流。有关 Agent 配置格式所支持的语法和设置的详细信息，请参见 [Agent 配置语法参考（官方英文）](https://adk.dev/api-reference/agentconfig/)。

{{% alert context="default" %}}
**Java 中的实验性功能**

Agent 配置功能在 ADK Java 中是实验性的。如需了解所有语言的情况，请参见 [已知限制](#known-limitations)。我们欢迎您的 [反馈](https://github.com/google/adk-java/issues/new?template=feature_request.md&labels=agent%20config)！
{{% /alert %}}
## 快速开始 {#get-started}

本节描述了如何使用 ADK 和 Agent 配置功能设置并开始构建 Agent，包括安装设置、构建 Agent 以及运行 Agent。

### 安装设置 {#setup}

您需要安装 Google Agent 开发工具包库，并为生成式 AI 模型（如 Gemini API）提供访问密钥。本节提供运行 Agent 配置文件所需安装和配置的详细信息。

{{% alert context="info" %}}
Agent 配置的 `model:` 键接受一个模型名称字符串，例如 Gemini 模型名称。要使用需要构造函数参数的模型（如 `LiteLlm`），请在 Python 中构建一个 `BaseLlm` 实例，并从 `model_code:` 键引用它。有关额外功能限制的更多信息，请参见 [已知限制](#known-limitations)。
{{% /alert %}}
要设置 ADK 以与 Agent 配置一起使用：

1.  按照 [安装](/docs/adk/build/get-started/installation/) 指南安装 ADK Python 库。*目前必须使用 Python。* 如需更多信息，请参见 [已知限制](#known-limitations)。
1.  通过在终端中运行以下命令验证 ADK 是否已安装：

        adk --version

    该命令应显示您已安装的 ADK 版本。

{{% alert context="default" %}}
如果 `adk` 命令无法运行且步骤 2 中未显示版本，请确保您的 Python 环境处于激活状态。在 Mac 和 Linux 的终端中执行 `source .venv/bin/activate`。有关其他平台的命令，请参见 [安装](/docs/adk/build/get-started/installation/) 页面。
{{% /alert %}}
### 构建 Agent {#build-an-agent}

您可以使用 Agent 配置通过 `adk create` 命令创建 Agent 的项目文件，然后编辑它为您生成的 `root_agent.yaml` 文件来构建 Agent。

要创建用于 Agent 配置的 ADK 项目：

1.  在终端窗口中，运行以下命令创建一个基于配置的 Agent：

        adk create --type=config my_agent

    该命令生成一个 `my_agent/` 文件夹，其中包含一个 `root_agent.yaml` 文件和一个 `.env` 文件。1. 在 `my_agent/.env` 文件中，为您的 Agent 设置环境变量，以访问生成式 AI 模型和其他服务：

    1. 通过 Google API 访问 Gemini 模型，向文件中添加包含您的 API 密钥的一行：

            GOOGLE_GENAI_USE_ENTERPRISE=0
            GOOGLE_API_KEY=<your-Google-Gemini-API-key>

        您可以从 Google AI Studio 的 [API Keys](https://aistudio.google.com/app/apikey) 页面获取 API 密钥。

    1. 通过 Google Cloud 访问 Gemini 模型，将以下几行添加到文件中：

            GOOGLE_GENAI_USE_ENTERPRISE=1
            GOOGLE_CLOUD_PROJECT=<your_gcp_project>
            GOOGLE_CLOUD_LOCATION=us-central1

        有关创建 Cloud 项目的信息，请参见 Google Cloud 文档 [创建和管理项目](https://cloud.google.com/resource-manager/docs/creating-managing-projects)。
        有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/)。

1. 使用文本编辑器，编辑 Agent 配置文件 `my_agent/root_agent.yaml`，如下所示：

```
# yaml-language-server: $schema=https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json
name: assistant_agent
model: gemini-flash-latest
description: A helper agent that can answer users' questions.
instruction: You are an agent to help answer users' various questions.
```

您可以通过参考 ADK [samples repository](https://github.com/search?q=repo%3Agoogle%2Fadk-python+path%3A%2F%5Econtributing%5C%2Fsamples%5C%2F%2F+.yaml&type=code) 或 [Agent Config syntax（官方英文）](https://adk.dev/api-reference/agentconfig/) 参考资料，发现您的 `root_agent.yaml` Agent 配置文件的更多配置选项。

### 运行 Agent {#run-the-agent}

完成 Agent Config 编辑后，您可以通过 Web 界面、命令行终端执行或 API 服务器模式来运行您的 Agent。

要运行由 Agent Config 定义的 Agent：

1. 在终端中，导航到包含 `root_agent.yaml` 文件的 `my_agent/` 目录。
2. 输入以下命令之一以运行您的 Agent：
    - `adk web` - 为您的 Agent 启动 Web UI 界面。
    - `adk run` - 在终端中运行您的 Agent，无需用户界面。
    - `adk api_server` - 将您的 Agent 作为服务运行，可被其他应用程序使用。

有关运行 Agent 的更多方法，请参见 [Agent Runtime](/docs/adk/run/agent-runtime/#ways-to-run-agents)。
有关 ADK 命令行选项的更多信息，请参见 [ADK CLI reference（官方英文）](https://adk.dev/api-reference/cli/)。

### 编程方式运行 {#run-programmatically}

您也可以跳过 CLI，直接在代码中动态加载并执行基于配置的 Agent。该工具会加载配置并透明地实例化正确的 Agent 类（例如 `LlmAgent`），作为 `BaseAgent` 子类。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
import asyncio
from google.adk.agents import config_agent_utils
from google.adk.runners import Runner

async def main():
    # 直接从 YAML 配置文件加载 Agent
    agent = config_agent_utils.from_config("my_agent/root_agent.yaml")
    # ...

if __name__ == "__main__":
    asyncio.run(main())
```

{{% /tab %}}
{{< /tabs >}}
## 示例配置 {#example-configs}

本节展示了用于帮助您开始构建 Agent 的 Agent 配置文件示例。有关更多完整示例，请参阅 ADK [示例仓库](https://github.com/search?q=repo%3Agoogle%2Fadk-python+path%3A%2F%5Econtributing%5C%2Fsamples%5C%2F%2F+root_agent.yaml&type=code)。

### 内置工具示例 {#built-in-tool-example}

以下示例使用内置 ADK 工具函数进行 Google 搜索，以为 Agent 提供功能。该 Agent 会自动使用搜索工具来响应用户请求。

```
# yaml-language-server: $schema=https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json
name: search_agent
model: gemini-flash-latest
description: 'an agent whose job it is to perform Google search queries and answer questions about the results.'
instruction: You are an agent whose job is to perform Google search queries and answer questions about the results.
tools:
  - name: google_search
```

有关更多详情，请参阅此示例的完整代码，位于 [ADK sample repository](https://github.com/google/adk-python/blob/main/contributing/samples/tools/tool_builtin_config/root_agent.yaml)。

### 自定义工具示例 {#custom-tool-example}

以下示例使用通过 Python 代码构建的自定义工具，并列在配置文件的 `tools:` 部分中。Agent 使用此工具来检查用户提供的一列数字是否为质数。

```
# yaml-language-server: $schema=https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json
agent_class: LlmAgent
model: gemini-flash-latest
name: prime_agent
description: Handles checking if numbers are prime.
instruction: |
  You are responsible for checking whether numbers are prime.
  When asked to check primes, you must call the check_prime tool with a list of integers.
  Never attempt to determine prime numbers manually.
  Return the prime number results to the root agent.
tools:
  - name: ma_llm.check_prime
```

有关更多详细信息，请参阅此示例的完整代码，位于[ADK 示例存储库](https://github.com/google/adk-python/blob/main/contributing/samples/multi_agent/multi_agent_llm_config/prime_agent.yaml)。

### 子 Agent 示例 {#sub-agents-example}

以下示例显示了在配置文件的`sub_agents:`部分定义了两个子 Agent 的 Agent，以及在`tools:`部分定义的示例工具。该 Agent 确定用户的需求，并将请求委托给其中一个子 Agent 来处理。子 Agent 是使用 Agent 配置YAML文件定义的。

```
# yaml-language-server: $schema=https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json
agent_class: LlmAgent
model: gemini-flash-latest
name: root_agent
description: Learning assistant that provides tutoring in code and math.
instruction: |
  You are a learning assistant that helps students with coding and math questions.

  You delegate coding questions to the code_tutor_agent and math questions to the math_tutor_agent.

  Follow these steps:
  1. If the user asks about programming or coding, delegate to the code_tutor_agent.
  2. If the user asks about math concepts or problems, delegate to the math_tutor_agent.
  3. Always provide clear explanations and encourage learning.
sub_agents:
  - config_path: code_tutor_agent.yaml
  - config_path: math_tutor_agent.yaml
```

有关详细信息，请参阅此示例的完整代码，位于[ADK 示例仓库](https://github.com/google/adk-python/blob/main/contributing/samples/multi_agent/multi_agent_basic_config/root_agent.yaml)。

## 部署 Agent 配置 {#deploy-agent-configs}

您可以使用[Cloud Run](/docs/adk/run/deployment/cloud-run/)和[Agent Runtime](/docs/adk/run/deployment/agent-runtime/)部署 Agent 配置 Agent，其操作与基于代码的 Agent 相同。有关如何准备和部署基于 Agent 配置的 Agent 的更多信息，请参阅[Cloud Run](/docs/adk/run/deployment/cloud-run/)和[Agent Runtime](/docs/adk/run/deployment/agent-runtime/)部署指南。

## 已知限制 {#known-limitations}

Agent 配置功能有以下限制：

- **模型支持：** `model:` 键仅接受模型名称字符串。要使用需要构造函数参数的模型，如 `LiteLlm`，请在 Python 中构建它，并通过 `model_code:` 键引用。该键接受一个映射，其中 `name:` 子键为 `BaseLlm` 实例的完全限定名称：

        model_code:
          name: my_library.clients.my_litellm

  `model:` 和 `model_code:` 键不能同时设置。
- **编程语言：** Agent 配置功能当前支持用于工具和其他需要编程代码的功能的 Python 和 Java 代码。
- **ADK 工具支持：** Agent 配置功能支持以下 ADK 工具，但*并非所有工具都完全支持*：
  - `google_search`
  - `google_maps_grounding`
  - `load_artifacts`
  - `url_context`
  - `exit_loop`
  - `preload_memory`
  - `get_user_choice`
  - `enterprise_web_search`
  - `load_web_page`：需要完整路径以访问网页。
  - `AgentTool`：允许一个 Agent 调用另一个 Agent。
  - `LongRunningFunctionTool`：支持长时间运行的函数。
  - `McpToolset`：连接到 MCP（MCP）服务器。
  - `ExampleTool`：为工具提供基于示例的少量学习。
- **Agent 类型支持：** `LangGraphAgent` 和 `A2aAgent` 类型尚不支持。
- **Agent 搜索：** `VertexAiSearchTool` 当前在 Python 和 Java Agent 配置中支持。

## 下一步 {#next-steps}

有关构建内容的想法，请参阅 `adk-python` 仓库中的[sample agent configs](https://github.com/search?q=repo:google/adk-python+path:/%5Econtributing%5C/samples%5C/.*%5C/root_agent%5C.yaml$/&type=code)。有关 Agent 配置格式支持的语法和设置的详细信息，请参阅[Agent Config syntax reference（官方英文）](https://adk.dev/api-reference/agentconfig/)。

---

原文：[Build agents with Agent Config](https://adk.dev/agents/config/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/config.md)
