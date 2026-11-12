---
title: "迁移到 ADK"
description: "学习如何使用 Agents CLI 和编码助手将现有 Agent、自定义 Agent 循环和工作流迁移到 Agent Development Kit（ADK）。"
icon: "article"
weight: 90
toc: true
---

描述：学习如何使用 Agents CLI 和你的编码助手将现有的 AI Agent、自定义 Agent 循环和工作流迁移到 Google Agent Development Kit（ADK）。
本指南向你展示如何使用 Agents CLI 和你的编码 Agent 将现有 Agent 代码库迁移到 Agent Development Kit（ADK）。迁移到 ADK 可以让你在多种语言中标准化 Agent 架构，使用内置评估工具，并直接部署到 Google Cloud。

## 使用 Agents CLI 迁移 {#migrate-with-agents-cli}

你无需逐行手动重写状态对象、节点图和执行循环，可以使用 Agents CLI 和你的编码 Agent 来规划和执行迁移。

Agents CLI 会将 ADK 开发技能安装到诸如 Antigravity、Claude Code、Cursor 和 Codex 等编码 Agent 中。当你在现有项目中打开编码 Agent 时，它可以：

* 分析你当前的 Agent 结构、工具、状态和路由规则。
* 将现有组件映射到原生 ADK 类和图形工作流。
* 提出具有权衡的架构选项。
* 逐步转换工具、Agent 定义和会话处理。
* 生成评估数据集，以便在迁移前后验证行为。

有关使用 Agents CLI 的更多信息，请参见 [Agents CLI](https://google.github.io/agents-cli/) 文档]。

## 先决条件 {#prerequisites}

在开始迁移之前，请确保已安装以下内容：

* Python 3.11 或更高版本
* [`uv`](https://docs.astral.sh/uv/getting-started/installation/) 包管理器]
* 支持的编码 Agent

将 Agents CLI 及其 ADK 技能安装到你的编码 Agent 中：

```bash
uvx google-agents-cli setup
```

验证安装：

```bash
agents-cli info
```

## 迁移工作流程 {#migration-workflow}

按照以下流程将现有 Agent 迁移到 ADK：

1. 打开现有项目中的编码 Agent
2. 头脑风暴迁移计划
3. 将 Agent 模式映射到 ADK
4. 使用评估转换代码
5. 验证和评估

### 打开现有项目中的编码 Agent {#open-your-coding-agent-in-the-existing-project}

在现有 Agent 项目的根目录中打开终端或 IDE，并启动您的编码 Agent。确认 Agent 能够检测到由 Agents CLI 安装的 ADK 技能。

### 头脑风暴迁移计划 {#brainstorm-a-migration-plan}

请您的编码 Agent 检查当前的代码库并头脑风暴目标 ADK 架构。由于 Agent 通过 Agents CLI 加载了 ADK 技能，它了解 ADK 状态管理、图工作流和编排模式。在您的编码 Agent 中使用类似以下的提示语：

```text title="Code agent prompt"
I want to migrate this existing agent codebase to Google Agent Development Kit (ADK).
Please inspect our current files, state schema, tools, and control flow.
Propose 2-3 target ADK architecture options with trade-offs, and recommend the cleanest approach.
Include an evaluation plan to verify behavior using agents-cli eval.
```

您的编码 Agent 会分析以下内容：

* **执行流程：** 单工具调用循环、确定性图工作流程、动态路由器或多 Agent 团队。
* **工具：** 函数、参数签名、文档字符串和外部 API 调用。
* **记忆与检索：** 知识存储、向量搜索集成或会话记忆。
* **状态：** 跨回合追踪变量、临时键和会话存储。
* **目标职业：** 哪些 ADK 职业，如`Agent`或`Workflow`，最适合。
* **评估策略：** 如何将现有测试用例转换为评估数据集，以进行迁移 Agent 的基准测试。

在审查提出的方法后，批准符合你需求的架构。

### 将 Agent 模式映射到 ADK {#map-agent-patterns-to-adk}

ADK 用声明类和图工作流替代自定义调度循环和状态处理程序。迁移时请使用以下映射作为指导：

|现有图案 |ADK 对应型 |描述 |
|:--- |:--- |:--- |
|自定义工具模式或包装器 |原生 Python 函数或`FunctionTool` |带有类型提示和文档字符串的纯 Python 函数。ADK 自动派生工具声明。|
|自定义 Agent 循环或 Runner |`Agent` |声明式 Agent 定义，指定模型、指令、工具和子 Agent。|
|内存与检索 |`BaseMemoryService` 实现与检索工具 |内置内存服务（`InMemoryMemoryService`、`VertexAiMemoryBankService`、`VertexAiRagMemoryService`）以及用于会话和文档基础的检索工具。|
|状态字典或草稿 |通过`ToolContext` `session.state` |可在工具、回调和 Agent 指令中访问的共享、可变会话状态。|
|多 Agent 工作流程与流水线 |`google.adk.workflow.Workflow` |带有条件路由、循环和并行分支的显式图节点。|
|多 Agent 切换 |`Agent(sub_agents=[...])` |层级委托，协调 Agent 委托给专门的子 Agent。|
|远程 Agent 通信 |A2A 协议 |通过HTTP进行 Agent 间通信，采用 Agent 对 Agent 标准。|

### 带评估的代码转换 {#convert-code-with-evaluation}

可靠的迁移是测试驱动的。你的编码 Agent 可以在新的 ADK 代码旁边设置评估数据集和测试套件，以验证迁移 Agent 是否产生与原始实现相同的结果。

1. **设置评估测试用例：** 让你的编码 Agent 将现有测试用例或录音对话转换为评估用例，并按`eval/`方式进行。
2. **端口工具和 Agent 逻辑：** 用带类型化的 Python 函数和 ADK `Agent` 或 `Workflow` 替换自定义调度循环和工具包装器。

```python
# Agent.py
from google.adk.agents import Agent
from google.adk.tools import ToolContext

def lookup_customer(customer_id: str) -> str:
    """Retrieve account tier and status for a customer."""
    return "Tier: Premium, Status: Active"

def calculate_discount(amount: float, rate: float = 0.1) -> float:
    """Calculate discounted total for a transaction."""
    return amount * (1.0 - rate)

root_agent = Agent(
    name="customer_support_agent",
    model="gemini-flash-latest",
    instruction="Assist customers with account inquiries and discounts using your tools.",
    tools=[lookup_customer, calculate_discount],
)
```

### 验证和评估 {#verify-and-evaluate}

运行评估套件，将迁移后的 Agent 与您的基准测试用例进行比较：

```bash
agents-cli eval run
```

你也可以直接或以交互方式测试查询：

```bash
# Test a single prompt
agents-cli run "Look up customer cust_101 and apply a 10% discount on $100."

# Start the interactive web UI
agents-cli playground
```

## 下一步 {#next-steps}

* 阅读 [多工具 Agent 教程](/docs/adk/build/build-your-agent/multi-tool-agent/) 以了解更多关于 ADK 工具模式的信息。
* 探索 [图形工作流](/docs/adk/build/graph-workflows/) 以进行多 Agent 路由和状态协调。
* 使用 [部署指南](/docs/adk/run/deployment/) 部署您的 Agent。

---

原文：[Migrate existing agents to ADK](https://adk.dev/get-started/migrate/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/get-started/migrate.md)
