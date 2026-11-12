---
title: "优化"
description: "ADK 提供了一个可扩展的框架，用于基于评估结果的自动化 Agent 优化。开箱即用，您可以使用 `adk optimize` 命令根据 ADK 评估结果快速优化简单 Agent"
icon: "article"
weight: 50
toc: true
---

支持版本：Python v1.24.0。

ADK 提供了一个可扩展框架，用于基于评估结果对自动化 Agent 进行优化。
开箱即用，你可以使用 `adk optimize` 命令，利用默认优化器，快速基于 ADK 评估结果优化简单 Agent。
对于更复杂的用例，你可以开发使用自定义评估数据的采样器，或者实现新的优化策略。

### 定义 {#definitions}

* **采样器**：采样器允许 Agent 优化器评估候选的优化 Agent。 当请求时，采样器会向优化器提供详细的评估结果，这些结果对基于评估的 Agent 优化很有用。
* **Agent 优化器**：Agent 优化器会查看采样器的评估结果，并利用这些结果改进 Agent。

## 示例 - 使用 `adk optimize` 优化简单 Agent {#example}

在此示例中，我们将使用 `adk optimize` 命令，根据小型评估集上的评估结果，更新 [`hello_world`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) 示例 Agent 的指令。

### 步骤 1：指定示例数据集 {#exampledataset}

默认的 `hello_world` Agent 指令描述了如何判断一个数字是否为质数。
此示例的评估集增加了 Agent 未包含指令的另一个方面：数字可以根据其质数性质分为“好”或“坏”。
优化器需要从中推导出这一新规则并将其添加到 Agent 指令中。

在 [`contributing/samples/core/hello_world/`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) 中创建一个文件 `train_eval_set.evalset.json`，并包含以下内容：

```json
{
  "eval_set_id": "train_eval_set",
  "name": "train_eval_set",
  "eval_cases": [
    {
      "eval_id": "simple",
      "conversation": [
        {
          "invocation_id": "inv1",
          "user_content": {
            "parts": [ {"text": "Is 7 prime?"} ],
            "role": "user"
          },
          "final_response": {
            "parts": [ {"text": "7 is a prime number."} ],
            "role": "model"
          }
        }
      ],
      "session_input": {
        "app_name": "hello_world",
        "user_id": "user"
      }
    },
    {
      "eval_id": "is_good",
      "conversation": [
        {
          "invocation_id": "inv1",
          "user_content": {
            "parts": [ {"text": "Is 4 a bad number?"} ],
            "role": "user"
          },
          "final_response": {
            "parts": [ {"text": "4 is not prime so it is a good number."} ],
            "role": "model"
          }
        }
      ],
      "session_input": {
        "app_name": "hello_world",
        "user_id": "user"
      }
    },
    {
      "eval_id": "is_bad",
      "conversation": [
        {
          "invocation_id": "inv1",
          "user_content": {
            "parts": [ {"text": "Is 5 a bad number?"} ],
            "role": "user"
          },
          "final_response": {
            "parts": [ {"text": "5 is prime so it is a bad number."} ],
            "role": "model"
          }
        }
      ],
      "session_input": {
        "app_name": "hello_world",
        "user_id": "user"
      }
    }
  ]
}
```

### 第2步：定义采样器配置 {#step-2-define-a-sampler-config}

采样器配置控制评估候选优化 Agent 的过程。例如，它指定 Agent 输出的正确性标准，并且还指定用于优化 Agent 的评估集。

完整的配置选项列表可在[below](#localevalsampler); 这里暂时，只需在[`contributing/samples/core/hello_world/`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) 中创建一个文件 `sampler_config.json` 并包含以下内容:

```json
{
  "eval_config": {
    "criteria": {
      "response_match_score": 0.75
    }
  },
  "app_name": "hello_world",
  "train_eval_set": "train_eval_set"
}
```

### 第3步：运行优化任务 {#step-3-run-the-optimization-job}

运行 `adk optimize` 命令，指向 `hello_world` Agent 的目录，并传入上面创建的配置文件。

```bash
adk optimize contributing/samples/core/hello_world \
--sampler_config_file_path contributing/samples/core/hello_world/sampler_config.json
```

最终输出会有所不同，但可能类似于以下内容：

```text
<logs and intermediate output>
================================================================================
Optimized root agent instructions:
--------------------------------------------------------------------------------
<existing unmodified instructions omitted for brevity>

**Special Rules for "Good" and "Bad" Numbers:**
*   A "bad number" is defined as a prime number.
*   A "good number" is defined as a non-prime number (i.e., a composite number or 1).
*   If a user asks if a number is "good" or "bad", you must always use the `check_prime` tool to determine its primality first.
*   After determining primality with the tool, respond according to the definitions above. Questions about "good" or "bad" numbers, when referring to primality, are objective and you are fully capable of answering them. Do not state you cannot answer such questions.
================================================================================
```

## 使用 `adk optimize` 命令 {#using-the-adk-optimize-command}

```bash
adk optimize [OPTIONS] AGENT_MODULE_FILE_PATH
```

* `AGENT_MODULE_FILE_PATH`：指向 Agent 目录的路径，而非文件，其
`__init__.py` 暴露了一个名为 `agent` 的模块。
`agent`模块必须包含一个`root_agent`。
作为有效设置的示例，可以查看
[`hello_world`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world)
特工。
* `--sampler_config_file_path PATH`：采样器配置路径。
描述了采样器实现和配置格式
[见](#localevalsampler)。
* `--optimizer_config_file_path PATH`（可选）：配置路径
Agent 优化器。
如果没有提供，将使用默认配置。
描述了优化器的实现、配置格式和默认配置
[下文](#geparootagentpromptoptimizer)。
* `--print_detailed_results`（可选）：支持打印一些详细指标
由 Agent 优化器测量。
* `--log_level`（可选）：设置日志等级。
默认是`INFO`。
有效的选项有`DEBUG`、`INFO`、`WARNING`、`ERROR`和`CRITICAL`。

## 可用采样器和 Agent 优化器 {#available-samplers-and-agent-optimizers}

ADK 提供了多个采样器和 Agent 优化器，您可以使用 `adk optimize` 命令行运行。可用的选项如下：

### `LocalEvalSampler` {#localevalsampler}

该
[`LocalEvalSampler`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/local_eval_sampler.py)
利用 ADK 评估候选 Agent 人
[`LocalEvalService`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/local_eval_service.py)。
它作为[]`UnstructuredSamplingResult`](#sampler-results)提供评估结果。
你可以用一个`LocalEvalSamplerConfig`配置`LocalEvalSampler`
包含以下字段：

* `eval_config`：An
[`EvalConfig`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_config.py)
该系统提供了评估标准和用户仿真选项。
* `app_name`：用于评估的应用名称。
* `train_eval_set`：用于优化的评估集名称。
* `train_eval_case_ids`（可选）：用于评估案例（示例）的IDS
为了优化。
如果未提供，则使用`train_eval_set`中的所有评估案例。
* `validation_eval_set`（可选）：用于的评估集名称
验证优化后的 Agent。
如果没有提供，`train_eval_set`会被重复使用。
* `validation_eval_case_ids`（可选）：评估案例（示例）的ids为
用于验证优化的 Agent。
如果没有提供，`validation_eval_set`中的所有评估案例都将被使用。
如果也没有提供`validation_eval_set`，有效的训练评估案例
被重复使用。

在初始化`LocalEvalSampler`时，你还必须提供
[`EvalSetsManager`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_sets_manager.py)
能够访问列车和验证评估集，这些集合由
`LocalEvalSamplerConfig`。

### `GEPARootAgentPromptOptimizer` {#geparootagentpromptoptimizer}该
[`GEPARootAgentPromptOptimizer`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/gepa_root_agent_prompt_optimizer.py)
改进根 Agent 的指令
使用[GEPA](https://gepa-ai.github.io/gepa/)优化器]。
它期望采样器提供评估结果，作为
[`UnstructuredSamplingResult`](#sampler-results)。
其输出是 [`OptimizerResult`](#agent-optimizer-results) 的一个子类，其中
指定了[评分](#agent-optimizer-results)和的优化 Agent 人列表
优化过程中收集的额外指标。

注意：`GEPARootAgentPromptOptimizer`不提升任何子 Agent，Agent
工具、技能，或根 Agent 的其他任何方面。

注意：`GEPARootAgentPromptOptimizer`是实验性的。
在构建时会发出警告，其 API 可能会更改或被移除
毫无预警。

你可以`GEPARootAgentPromptOptimizer`用
`GEPARootAgentPromptOptimizerConfig`包含以下字段：

* `optimizer_model`（可选）：用于分析评估结果的模型
优化 Agent。
* `model_configuration`（可选）：优化器模型的配置。
默认配置是1万代币的思考预算。
* `max_metric_calls`（可选）：在该阶段可执行的最大评估次数
优化。
默认是100。
* `reflection_minibatch_size`（可选）：在 上应使用实例数量
是时候更新 Agent 说明了。
默认是3。
* `run_dir`（可选）：用于保存中间和最终的目录
如果需要优化结果。
有助于温暖的起步。

### `GEPARootAgentOptimizer` {#geparootagentoptimizer}

该
[`GEPARootAgentOptimizer`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/gepa_root_agent_optimizer.py)
改进根 Agent 的指令和技能的指令
通过
[`SkillToolset`](https://github.com/google/adk-python/blob/main/src/google/adk/tools/skill_toolset.py)
使用[GEPA](https://gepa-ai.github.io/gepa/)优化器]。
在许多方面，它可以被视为
[`GEPARootAgentPromptOptimizer`](#geparootagentpromptoptimizer)。
它期望采样器提供评估结果，作为
[`UnstructuredSamplingResult`](#sampler-results)。
其输出是[`OptimizerResult`](#agent-optimizer-results)的子类，其中
指定了[评分](#agent-optimizer-results)和
优化过程中收集的额外指标。

注意：`GEPARootAgentOptimizer`不提升任何子 Agent 或 Agent
工具。

注：本 `GEPARootAgentOptimizer` 是实验性的。
在构建时会发出警告，其 API 可能会更改或被移除
毫无预警。

你可以`GEPARootAgentOptimizer`用
`GEPARootAgentOptimizerConfig`包含以下字段：* `optimizer_model`（可选）：用于分析评估结果并优化 Agent 的模型。
* `model_configuration`（可选）：优化器模型的配置。
默认配置为 `ThinkingLevel` 为 `HIGH` 的配置。
* `max_metric_calls`（可选）：优化过程中要运行的最大评估次数。
默认值为 100。
* `reflection_minibatch_size`（可选）：每次用于更新指令的示例数量。
默认值为 3。
* `run_dir`（可选）：如果需要，可保存中间和最终优化结果的目录。
便于热启动。

### `SimplePromptOptimizer` {#simplepromptoptimizer}

`SimplePromptOptimizer` 是一个自动化的、迭代的提示调优组件，旨在使用经验评估数据系统地改进 Agent 的根系统指令。
与维持多个候选 Agent 多样化帕累托前沿的基于 GEPA 的优化器不同，`SimplePromptOptimizer` 执行一个直接的、顺序的优化循环，完全专注于在一系列指定迭代中优化单一主提示。

该优化器会自动执行一个异步的四阶段反馈循环：

1. **执行：** 目标 Agent 处理由 `Sampler` 类实现管理的一批特定评估任务。
2. **评估：** 采样器根据你的评估数据集对 Agent 的输出进行打分，并返回结构化的 `SamplingResult`。
3. **批判：** 底层优化大型语言模型（LLM）分析历史评估分数以及当前提示，以识别特定的行为弱点或差距。
4. **重写：** 优化模型生成针对发现的弱点的系统提示更新版本。然后将该新提示直接输入下一次迭代。

**注意：** 优化循环不会直接改变你最初的 Agent 实例。完成后，它会返回一个 `OptimizerResult`，其中包含在过程中提取的评分最高的 Agent 变体。

#### 配置 {#configuration}

通过将 `SimplePromptOptimizerConfig` 实例传递给优化器来配置循环行为。

| 参数 | 类型 | 默认值 | 描述 |
| :---- | :---- | :---- | :---- |
| `num_iterations` | int | `10` | 要执行的总优化轮数。 |
| `batch_size` | int | `5` | 采样器在每次单独迭代中处理的评估示例数量。 |
| `optimizer_model` | str | `"gemini-2.5-flash"` | 用于批判当前提示并生成下一个提示的模型。 |
| `model_configuration` | GenerateContentConfig | 10K 令牌的思考预算 | 优化器模型的配置。 |

#### 实现示例 {#implementation-example}
一旦定义了配置，运行优化：

```python
from google.adk.optimization.simple_prompt_optimizer import SimplePromptOptimizer
from google.adk.optimization.simple_prompt_optimizer import SimplePromptOptimizerConfig

# 首先定义你的 Agent 和采样器...

# 配置优化器
config = SimplePromptOptimizerConfig(
    num_iterations=5,
    batch_size=10
)

# 运行优化
optimizer = SimplePromptOptimizer(config=config)
optimized_result = await optimizer.optimize(agent, sampler)
```

## 关键数据类型 {#key-data-types}

ADK 定义了若干基础数据类型
[`optimization/data_types.py`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/data_types.py)
调控采样器向优化器传输的评估数据，以及
优化器的输出。
这些数据类型设计为可扩展性，以支持自定义评估和
优化策略。

### 样本结果 {#sampler-results}

* [`SamplingResult`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/data_types.py)：
采样器输出的基础类。
  * 必须包含一个将示例UID映射到 Agent 的 `scores`字典
  那个例子的总体得分。
* [`UnstructuredSamplingResult`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/data_types.py)：
`SamplingResult` 的内置子类，可添加可选的`data`字段
存储非结构化、如示例可序列化的可序列化的评估数据（例如
轨迹、中间输出和子度量）。

大多数用例都可以用`UnstructuredSamplingResult`。
或者，你也可以创建自己的子类来回归`SamplingResult`
以更结构化格式的额外评估数据。
不过，你必须确保采样器和优化器都支持你的
格式。

### Agent 优化器结果 {#agent-优化器-结果}

* [`AgentWithScores`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/data_types.py)：
表示单个优化 Agent 及其整体得分。
  * 必须包含`optimized_agent`（更新版）
  [`Agent`](https://github.com/google/adk-python/blob/main/src/google/adk/agents/llm_agent.py)
  目的）。
  * 可以包含 Agent 人的`overall_score`（通常出现在验证中）
  set）。
* [`OptimizerResult`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/data_types.py)：
表示优化过程的最终输出。
  * 必须包含一个`optimized_agents`列表（这些是 的对象）
  `AgentWithScores`或其子职业）。
  在多指标上测量 Agent 最优性时，多个条目可能存在
  需要代表帕累托边界。

你可以自己创建`AgentWithScores`子类来暴露细粒度
关于候选优化 Agent 的指标。
例如，你可能想单独给经纪人打分，比如准确性、安全性等。
阵营等等。
同样，你也可以创建自己的子`OptimizerResult`类来暴露
关于优化过程的整体指标（数量
评估候选人、总评估次数等）。

## 创建和使用新的采样器和 Agent 优化器 {#creating-and-using-new-samplers-and-agent-optimizers}

如果你的用例需要复杂的采样和评估逻辑，或者需要自定义
Agent 优化策略，你可以创建定制的实现
下面将介绍`Sampler`和`AgentOptimizer`抽象类。
通过遵循该 API，你可以自由搭配 ADK 提供的采样器和 Agent
用你的自定义实现优化器。

### 制作一个新的采样器要创建用于自定义评估的新采样器，您必须创建一个继承自[`Sampler`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/sampler.py)基类的类。您还必须指定您的采样器将用于返回评估结果的[`SamplingResult`](#sampler-results)子类。采样器必须实现以下抽象方法： {#creating-a-new-sampler}

* `get_train_example_ids(self)`：返回用于优化的示例 UID 列表。
* `get_validation_example_ids(self)`：返回用于验证优化 Agent 的示例 UID 列表。

* `sample_and_score(self, candidate, example_set, batch, capture_full_eval_data)`：在指定的`example_set`（`"train"` 或 `"validation"`）中的一组示例上评估 `candidate` Agent。它应返回一个 [`SamplingResult`](#sampler-results) 子类，包含每个示例的计算得分，并且如果 `capture_full_eval_data` 为 `True`，则包含评估引导 Agent 优化所需的任何附加数据。您可以根据需要通过子类化 `SamplingResult` 来选择附加评估数据的格式。然而，Agent 优化器也必须支持相同的 `SamplingResult` 子类。[`UnstructuredSamplingResult`](#sampler-results) 实现了最简单的情况，其中附加数据存储在每个示例的非结构化字典中。

### 创建新的 Agent 优化器 {#creating-a-new-agent-optimizer}

要创建自定义 Agent 优化器，您必须创建一个继承自[`AgentOptimizer`](https://github.com/google/adk-python/blob/main/src/google/adk/optimization/agent_optimizer.py)基类的类。您还必须指定它将接收评估结果的 [`SamplingResult`](#sampler-results) 子类，以及将用于表示每个优化 Agent 及其分数/指标的 [`AgentWithScores`](#agent-optimizer-results) 子类。优化器必须实现以下抽象方法：

* `optimize(self, initial_agent, sampler)`：此方法负责组织优化过程。它接受一个 `initial_agent` 进行改进，以及一个 `sampler` 用于评估候选者。它应返回一个 [`OptimizerResult`](#agent-optimizer-results) 子类，包含候选优化 Agent 列表以及它们的分数/指标和与优化过程相关的任何总体指标。您可以通过子类化 `AgentWithScores` 根据需要选择每个候选分数/指标的格式。或者，您也可以简单使用 `AgentWithScores`，它允许为每个候选优化 Agent 指定单个总体分数。

### 以编程方式优化 Agent`adk optimize` 命令使用 [`LocalEvalSampler`](#localevalsampler) 和 [`GEPARootAgentPromptOptimizer`](#geparootagentpromptoptimizer)。使用自定义采样器和 Agent 优化器时，您必须以编程方式优化 Agent。以下参考代码复制了 `adk optimize` 命令在上述 [example](#example) 的功能。要使用它，请按照示例中的方式创建 [dataset](#exampledataset) 并从 Python 脚本在 [same directory](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) 内运行此代码。 {#optimizing-an-agent-programmatically}

```python
import asyncio
import logging
import os

import agent  # the hello_world agent
from google.adk.cli.utils import envs
from google.adk.cli.utils import logs
from google.adk.evaluation.eval_config import EvalConfig
from google.adk.evaluation.local_eval_sets_manager import LocalEvalSetsManager
from google.adk.optimization.gepa_root_agent_prompt_optimizer import GEPARootAgentPromptOptimizer
from google.adk.optimization.gepa_root_agent_prompt_optimizer import GEPARootAgentPromptOptimizerConfig
from google.adk.optimization.local_eval_sampler import LocalEvalSampler
from google.adk.optimization.local_eval_sampler import LocalEvalSamplerConfig

# 设置环境变量（API 密钥等）和日志
envs.load_dotenv_for_agent(".", ".")
logs.setup_adk_logger(logging.INFO)

# 创建采样器
sampler_config = LocalEvalSamplerConfig(
    eval_config=EvalConfig(criteria={"response_match_score": 0.75}),
    app_name="hello_world",  # typically the name of the directory containing the agent
    train_eval_set="train_eval_set",  # from the example
)
eval_sets_manager = LocalEvalSetsManager(
    agents_dir=os.path.dirname(os.getcwd()),
)
sampler = LocalEvalSampler(sampler_config, eval_sets_manager)

# 创建优化器
opt_config = GEPARootAgentPromptOptimizerConfig()
optimizer = GEPARootAgentPromptOptimizer(config=opt_config)

# 优化根 Agent
initial_agent = agent.root_agent
result = asyncio.run(
    optimizer.optimize(initial_agent, sampler)
)

# 显示结果
best_idx = result.gepa_result["best_idx"]
print(
    "Validation score:",
    result.optimized_agents[best_idx].overall_score,
    "Optimized prompt:",
    result.optimized_agents[best_idx].optimized_agent.instruction,
    "GEPA metrics:",
    result.gepa_result,
    sep="\n",
)
```

---

原文：[Optimize agents](https://adk.dev/optimize/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/optimize/index.md)
