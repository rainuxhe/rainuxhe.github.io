---
title: "可视化构建器"
description: "ADK 可视化构建器是 ADK 网络界面的一项功能，提供了一个可视化工作流设计环境，用于创建和管理 Agent。可视化构建器允许您在一个开始的环境中设计、构建和测试 Agent。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v1.18.0。

ADK 可视化构建器是 ADK Web 界面的一项功能，提供了用于创建和管理 Agent 的可视化工作流设计环境。可视化构建器允许您在适合初学者的图形界面中设计、构建和测试 Agent，并包含由 AI 提供支持的助手来帮助您构建 Agent。

![Visual Agent Builder](/images/adk/visual-builder.png)

{{% alert context="default" %}}
**实验性**

可视化构建器功能是一个实验性发布。我们欢迎您的[反馈](https://github.com/google/adk-python/issues/new?template=feature_request.md)!
{{% /alert %}}

## 创建 Agent {#create-an-agent}

要使用可视化构建器，请启动 ADK Web 界面：

```console
adk web
```

然后按照以下步骤创建一个 Agent。

<details>
<summary>提示：从代码开发目录运行</summary>

Visual Builder 工具会将项目文件写入新子目录，这些子目录位于运行 ADK Web 的目录中。确保从具有写入权限的开发者目录位置运行此命令。

</details>

![Visual Agent Builder start](/images/adk/visual-builder-start.png)

**图 1:** 启动 Visual Builder 工具的 ADK Web 控件。

使用 Visual Builder 创建 Agent 的方法：

1. 在 Web UI 的左上角，选择 ** **（加号），如 *图 1* 所示，开始创建 Agent。
2. 输入 Agent 应用程序的名称，然后选择 **创建**。
3. 通过以下任意方式编辑 Agent：
    - 在左侧面板中，编辑 Agent 组件的值。
    - 在中央面板中，添加新的 Agent 组件。
    - 在右侧面板中，使用提示来修改 Agent 或获取帮助。
4. 在左下角，选择 **保存** 以保存 Agent。
5. 与新 Agent 互动以进行测试。
6. 在 Web UI 的左上角，选择铅笔图标，如 *图 1* 所示，继续编辑 Agent。

使用 Visual Builder 时需要注意以下几点：

- **创建 Agent 并保存：** 创建 Agent 时，确保在退出编辑界面之前选择 **保存**，否则新 Agent 可能无法编辑。
- **Agent 编辑：** Agent 的编辑（铅笔图标）仅适用于使用 Visual Builder 创建的 Agent。
- **添加工具：** 将现有自定义工具添加到 Visual Builder Agent 时，请指定完整限定的 Python 函数名称。

<details>
<summary>尝试使用 Visual Builder 助手输入此提示</summary>

```none
Help me add a dice roll tool to my current agent.
Use the default model if you need to configure that.
```

</details>

## 支持的组件 {#supported-components}

Visual Builder 工具提供了一个拖放式用户界面来构建 Agent，以及一个 AI 驱动的开发助手，它可以回答问题并编辑你的 Agent 工作流。该工具支持构建 ADK Agent 工作流所需的所有基本组件，包括：

- **Agent**
    - **根 Agent**：工作流的主要控制 Agent。ADK Agent 工作流中的所有其他 Agent 都被视为子 Agent。
    - [**LLM Agent：**](/docs/adk/build/agents/simple-agents/)
      由生成式 AI 模型驱动的 Agent。
    - [**顺序 Agent：**](/docs/adk/build/multi-agent-workflows/template-workflows/sequential-workflow/)
      执行一系列子 Agent 的工作流 Agent。
    - [**循环 Agent：**](/docs/adk/build/multi-agent-workflows/template-workflows/loop-workflow/)
      重复执行子 Agent，直到满足特定条件的工作流 Agent。
    - [**并行 Agent：**](/docs/adk/build/multi-agent-workflows/template-workflows/parallel-workflow/)
      同时执行多个子 Agent 的工作流 Agent。
- **工具**
    - [**预建工具：**（官方英文）](https://adk.dev/integrations/)
      可以将 ADK 提供的有限工具集添加到 Agent 中。
    - [**自定义工具：**](/docs/adk/components/custom-tools/)
      你可以构建并将自定义工具添加到工作流中。
- **组件**
    - [**回调**](/docs/adk/components/app-management/callbacks/)
      一种流程控制组件，允许你在 Agent 工作流事件的开始和结束时修改 Agent 的行为。

由于 Agent Config 功能的限制，Visual Builder 无法支持一些高级 ADK 功能。更多信息，请参见 Agent 配置 [已知限制] ](/docs/adk/build/build-your-agent/agent-config/#known-limitations)。

## 生成的项目结构 {#generated-project-structure}

Visual Builder 工具以 [Agent Config] ](/docs/adk/build/build-your-agent/agent-config/) 格式生成代码，使用 `.yaml` 配置文件创建 Agent，并为自定义工具生成 Python 代码。这些文件会生成在你运行 ADK 网页界面的目录下的子文件夹中。以下示例展示了 DiceAgent 项目的布局示例：

```text
DiceAgent/
    root_agent.yaml    # main agent code
    sub_agent_1.yaml   # sub agents (if any)
    tools/             # tools directory
        __init__.py
        dice_tool.py   # tool code
```

{{% alert context="info" %}}
**编辑生成的 Agent**

您可以在开发环境中编辑生成的文件。然而，
某些更改可能与 Visual Builder 不兼容。
{{% /alert %}}
有关 Visual Builder 使用的 Agent 配置代码格式的更多信息，请参见
[Agent Config](/docs/adk/build/build-your-agent/agent-config/) 和 [Agent Config YAML schema（官方英文）](https://adk.dev/api-reference/agentconfig/)。

## 安全性和部署 {#security-and-deployment}

Visual Builder 通过本地 API 端点将 Agent 配置文件保存到您的项目目录中。出于安全原因，这些端点仅在 Web UI 提供服务时可用（例如，`adk web`）。在无界面或仅 API 部署中，例如默认的 `adk deploy cloud_run`，这些端点未注册，从而防止未经授权的文件写入。

{{% alert context="info" %}}
**文件上传限制**

为了防止任意文件写入，通过 Visual Builder 上传的文件仅接受具有 `.yaml` 和 `.yml` 扩展名的文件。服务器会自动拒绝绝对路径、路径遍历序列（`..`）以及包含被阻止键（例如 `args`）且可能执行任意代码的 YAML 文件。
{{% /alert %}}

---

原文：[Use the Visual Builder](https://adk.dev/visual-builder/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/visual-builder/index.md)
