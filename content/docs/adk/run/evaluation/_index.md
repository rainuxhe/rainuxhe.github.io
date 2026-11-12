---
title: "评估"
description: "在传统的软件开发中，单元测试和集成测试提供了代码按预期运行并在更改过程中保持稳定的信心。这些测试提供了明确的“通过/失败”信号，指导进一步的开发"
icon: "article"
weight: 40
toc: true
---

支持版本：Python。

在传统的软件开发中，单元测试和集成测试提供了代码按预期运行并在变更中保持稳定的信心。这些测试提供了明确的“通过/失败”信号，引导后续开发。然而，LLM Agent 引入了一定程度的变异，使传统测试方法不足以应对。

由于模型的概率性质，确定性的“通过/失败”断言通常不适合评估 Agent 性能。相反，我们需要对最终输出和 Agent 的轨迹——达到解决方案所采取的步骤序列——进行定性评估。这包括评估 Agent 决策的质量、其推理过程以及最终结果。

这似乎需要额外工作来设置，但自动化评估的投资很快就会得到回报。如果你打算从原型推进，这是一项高度推荐的最佳实践。

![intro_components.png](/images/adk/evaluate_agent.png)

## 准备 Agent 评估 {#prepare-for-agent-evaluations}

在自动化 Agent 评估之前，请明确目标和成功标准：

* **定义成功:** 什么样的结果被认为是 Agent 成功的标志？
* **识别关键任务:** Agent 必须完成哪些核心任务？
* **选择相关指标:** 你将跟踪哪些指标来衡量性能？

这些考虑将指导评估场景的创建，并在实际部署中有效监控 Agent 行为。

## 评估内容 {#what-to-evaluate}

为了弥合从概念验证到可生产的 AI Agent 的差距，建立一个健全且自动化的评估框架是必不可少的。与主要关注最终输出的生成模型评估不同，Agent 评估需要对决策过程有更深入的理解。Agent 评估可以分为两个组成部分：

1. **评估轨迹和工具使用:** 分析 Agent 为达到解决方案所采取的步骤，包括工具选择、策略和方法的效率。
2. **评估最终响应:** 评估 Agent 最终输出的质量、相关性和正确性。

轨迹只是 Agent 返回给用户之前所采取步骤的列表。我们可以将其与期望 Agent 采取的步骤列表进行比较。

### 评估轨迹和工具使用在响应用户之前，Agent 通常会执行一系列动作，我们称之为“轨迹”。它可能会将用户输入与会话历史进行比较以消除歧义，或查找政策文件、搜索知识库或调用 API 保存工单。我们称之为一系列动作的“轨迹”。评估 Agent 的性能需要将其实际轨迹与预期或理想轨迹进行比较。这种比较可以揭示 Agent 流程中的错误和低效。期望轨迹表示真实标准——即我们预期 Agent 应采取的步骤列表。 {#evaluate-trajectory-and-tool-use}

例如：

```python
# 轨迹评估将进行比较
expected_steps = ["determine_intent", "use_tool", "review_results", "report_generation"]
actual_steps = ["determine_intent", "use_tool", "review_results", "report_generation"]
```

ADK 提供了基于真实数据（groundtruth）和基于评分标准（rubric）的工具使用评估指标。要为您的 Agent 选择适合其具体需求和目标的指标，请参阅我们的[recommendations](#recommendations-on-criteria)。

## ADK 的评估工作原理 {#how-evaluation-works-with-adk}

ADK 提供了两种方法来根据预定义的数据集和评估标准评估 Agent 性能。虽然在概念上相似，但它们在可处理的数据量上有所不同，这通常决定了每种方法的适用场景。

### 使用测试文件进行评估 {#evaluate-with-test-files}

此方法涉及创建单独的测试文件，每个文件表示一个简单的 Agent 模型交互（一个会话）。在 Agent 开发过程中，这种方法最为有效，起到单元测试的作用。这些测试设计为快速执行，并应专注于简单的会话复杂度。每个测试文件包含一个会话，该会话可能包括多个轮次。轮次表示用户与 Agent 之间的单次交互。每个轮次包括

- `User Content`：用户发出的查询。
- `Expected Intermediate Tool Use Trajectory`：Agent 为正确回应用户查询所应调用的工具。
- `Expected Intermediate Agent Responses`：这是 Agent（或子 Agent）在生成最终答案过程中生成的自然语言响应。这些自然语言响应通常是多 Agent 系统的产物，您的根 Agent 依赖子 Agent 来达成目标。这些中间响应可能对最终用户不感兴趣，但对于系统的开发者/所有者来说非常重要，因为它们提供了信心，确认 Agent 按照正确路径生成最终响应。
- `Final Response`：Agent 预期的最终响应。

您可以随意为文件命名，例如 `evaluation.test.json`。框架只检查 `.test.json` 后缀，文件名前的部分不受限制。测试文件由正式的 Pydantic 数据模型支持。两个关键的模式文件是 [Eval Set](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_set.py) 和 [Eval Case](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_case.py)。

下面是一个包含若干示例的测试文件：

{{% alert context="info" %}}

注释用于说明，需在 JSON 生效前删除。
{{% /alert %}}

```json
# Do note that some fields are removed for sake of making this doc readable.
{
  "eval_set_id": "home_automation_agent_light_on_off_set",
  "name": "",
  "description": "This is an eval set that is used for unit testing `x` behavior of the Agent",
  "eval_cases": [
    {
      "eval_id": "eval_case_id",
      "conversation": [
        {
          "invocation_id": "b7982664-0ab6-47cc-ab13-326656afdf75", # Unique identifier for the invocation.
          "user_content": { # Content provided by the user in this invocation. This is the query.
            "parts": [
              {
                "text": "Turn off device_2 in the Bedroom."
              }
            ],
            "role": "user"
          },
          "final_response": { # Final response from the agent that acts as a reference of benchmark.
            "parts": [
              {
                "text": "I have set the device_2 status to off."
              }
            ],
            "role": "model"
          },
          "intermediate_data": {
            "tool_uses": [ # Tool use trajectory in chronological order.
              {
                "args": {
                  "location": "Bedroom",
                  "device_id": "device_2",
                  "status": "OFF"
                },
                "name": "set_device_info"
              }
            ],
            "intermediate_responses": [] # Any intermediate sub-agent responses.
          }
        }
      ],
      "session_input": { # Initial session input.
        "app_name": "home_automation_agent",
        "user_id": "test_user",
        "state": {}
      }
    }
  ]
}
```

测试文件可以组织到文件夹中。可选地，文件夹也可以包含一个 `test_config.json` 文件，用于指定评估标准。

#### 如何迁移不符合 Pydantic 模式的测试文件？ {#how-to-migrate-test-files-not-backed-by-the-pydantic-schema}

{{% alert context="info" %}}

如果您的测试文件不符合 [EvalSet](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_set.py) 模式文件，那么本节内容与您相关。
{{% /alert %}}
请使用 `AgentEvaluator.migrate_eval_data_to_new_schema` 将现有的 `*.test.json` 文件迁移到基于 Pydantic 的模式。

该工具会读取您当前的测试数据文件和可选的初始会话文件，并生成一个以新格式序列化数据的单一输出 JSON 文件。由于新模式更加一致，旧的测试数据文件和初始会话文件可以忽略（或删除）。

### 使用 Evalset 文件进行评估 {#evaluate-with-an-evalset-file}

evalset 方法利用一个专门的数据集，称为“evalset”，用于评估 Agent-模型的交互。类似于测试文件，evalset 包含示例交互。但 evalset 可以包含多个可能较长的会话，非常适合模拟复杂的多轮对话。由于其能够表示复杂会话，evalset 非常适合进行集成测试。由于集成测试内容更广泛，通常比单元测试运行得更少。

一个 evalset 文件包含多个“eval”，每个代表一个独立会话。每个 eval 包含一个或多个“轮次”，包括用户查询、预期工具使用、预期中间 Agent 响应和参考响应。这些字段与测试文件方法中的含义相同。或者，一个 eval 可以定义一个*对话场景*，用于 [动态模拟](/docs/adk/run/evaluation/user-simulation/) 用户与 Agent 的交互。每个 eval 由唯一名称标识。此外，每个 eval 包含关联的初始会话状态。

手动创建 evalsets 可能很复杂，因此提供了 UI 工具来帮助捕获相关会话，并轻松将其转换为 evalset 中的 eval。下面了解更多关于使用 Web UI 进行评估的信息。下面是一个包含两个会话的 evalset 示例。evalset 文件由正式的 Pydantic 数据模型支持。两个关键的模式文件是 [Eval Set](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_set.py) 和 [Eval Case](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_case.py)。

{{% alert context="info" %}}

注释仅用于说明目的，为了 JSON 有效应删除。
{{% /alert %}}

```json
# Do note that some fields are removed for sake of making this doc readable.
{
  "eval_set_id": "eval_set_example_with_multiple_sessions",
  "name": "Eval set with multiple sessions",
  "description": "This eval set is an example that shows that an eval set can have more than one session.",
  "eval_cases": [
    {
      "eval_id": "session_01",
      "conversation": [
        {
          "invocation_id": "e-0067f6c4-ac27-4f24-81d7-3ab994c28768",
          "user_content": {
            "parts": [
              {
                "text": "What can you do?"
              }
            ],
            "role": "user"
          },
          "final_response": {
            "parts": [
              {

                "text": "I can roll dice of different sizes and check if numbers are prime."
              }
            ],
            "role": null
          },
          "intermediate_data": {
            "tool_uses": [],
            "intermediate_responses": []
          }
        }
      ],
      "session_input": {
        "app_name": "hello_world",
        "user_id": "user",
        "state": {}
      }
    },
    {
      "eval_id": "session_02",
      "conversation": [
        {
          "invocation_id": "e-92d34c6d-0a1b-452a-ba90-33af2838647a",
          "user_content": {
            "parts": [
              {
                "text": "Roll a 19 sided dice"
              }
            ],
            "role": "user"
          },
          "final_response": {
            "parts": [
              {
                "text": "I rolled a 17."
              }
            ],
            "role": null
          },
          "intermediate_data": {
            "tool_uses": [],
            "intermediate_responses": []
          }
        },
        {
          "invocation_id": "e-bf8549a1-2a61-4ecc-a4ee-4efbbf25a8ea",
          "user_content": {
            "parts": [
              {
                "text": "Roll a 10 sided dice twice and then check if 9 is a prime or not"
              }
            ],
            "role": "user"
          },
          "final_response": {
            "parts": [
              {
                "text": "I got 4 and 7 from the dice roll, and 9 is not a prime number.\n"
              }
            ],
            "role": null
          },
          "intermediate_data": {
            "tool_uses": [
              {
                "id": "adk-1a3f5a01-1782-4530-949f-07cf53fc6f05",
                "args": {
                  "sides": 10
                },
                "name": "roll_die"
              },
              {
                "id": "adk-52fc3269-caaf-41c3-833d-511e454c7058",
                "args": {
                  "sides": 10
                },
                "name": "roll_die"
              },
              {
                "id": "adk-5274768e-9ec5-4915-b6cf-f5d7f0387056",
                "args": {
                  "nums": [
                    9
                  ]
                },
                "name": "check_prime"
              }
            ],
            "intermediate_responses": [
              [
                "data_processing_agent",
                [
                  {
                    "text": "I have rolled a 10 sided die twice. The first roll is 5 and the second roll is 3.\n"
                  }
                ]
              ]
            ]
          }
        }
      ],
      "session_input": {
        "app_name": "hello_world",
        "user_id": "user",
        "state": {}
      }
    }
  ]
}
```

#### 如何迁移未遵循 Pydantic 模式的评估集文件？ {#how-to-migrate-eval-set-files-not-backed-by-the-pydantic-schema}

{{% alert context="info" %}}

如果您的评估集文件不符合 [EvalSet](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_set.py) 模式文件，那么本节内容与您相关。
{{% /alert %}}
根据谁在维护评估集数据，有两条路线：

1.  **由 ADK UI 维护的评估集数据** 如果您使用 ADK UI 来维护您的
    评估集数据，则 *无需您采取任何操作*。

2.  **由人工手动开发和维护并在 ADK eval CLI 中使用的评估集数据**
    一个迁移工具正在开发中，在此之前，ADK eval CLI 命令将
    继续支持旧格式的数据。

### 使用一致性测试进行评估 {#evaluate-with-conformance-testing}

`adk conformance test` 命令验证您的 AI Agent 随时间的一致行为。它通过将当前 Agent 输出与基线数据进行验证，确保代码库或模型更新不会引入回归。

#### 前提条件和设置 {#prerequisites-and-setup}

在 `adk conformance` 命令执行有意义的回归测试之前，您必须建立一个最佳的“黄金基线”。一致性测试通过将实时 Agent 行为与先前记录和验证的交互进行比较来运行。

按照以下工作流程准备您的环境：

##### 创建测试目录层次结构 {#create-the-test-directory-hierarchy}

一致性测试依赖严格的文件布局来自动发现和映射测试用例。
使用以下结构初始化您的测试目录：

```
tests
└── category_name/
    └── test_case_name/
        ├── spec.yaml                  # Test case specification
        ├── generated-recordings.yaml   # Baseline recorded interactions
        └── generated-session.yaml      # Baseline session data
```

{{% alert context="info" %}}

如果您的 Agent 使用服务器发送事件（SSE），测试框架还会在同一文件夹中查找 `generated-recordings-sse.yaml` 和 `generated-session-sse.yaml`。
{{% /alert %}}

##### 定义测试规范 (spec.yaml) {#define-the-test-specification-specyaml}

在目标测试文件夹中，创建一个 `spec.yaml` 文件。该文件概述了 Agent 在基线记录和后续一致性运行期间将执行的初始条件、配置和用户提示。确保您的文件符合以下基础模式，此处仅为示例：

```yaml
# Example spec.yaml for a Weather Agent.
# The test case name and category are inferred from the folder structure.
description: "Verifies the agent correctly identifies location and calls the weather tool."
agent: "weather_agent"
user_messages:
  - text: "What's the temperature in San Francisco right now?"
```

#### 自动化基线 {#automate-the-baseline}

由于背景数据（如 LLM 请求和工具调用）很复杂，你不应尝试手动编写或保存基线文件。相反，应让 ADK 为你生成它们。

1. 启动带有录制插件的 ADK 网页服务器：

    ```shell
    adk web -v --extra_plugins=google.adk.cli.plugins.recordings_plugin.RecordingsPlugin /path/to/agents
    ```

2. 接下来，打开一个新的终端窗口，并告诉 ADK 根据你的 spec.yaml 创建基线文件：

    ```shell
    adk conformance record tests/category/test_name none
    ```

需要尾随流媒体模式参数。使用`none`录制`generated-recordings.yaml`和`generated-session.yaml`，或使用`sse`录制`generated-recordings-sse.yaml`和`generated-session-sse.yaml`。`bidi`模式不支持录制。

它会自动运行场景，记录所有交互，并将 genated-recordings.yaml 和 generated-session.yaml 文件精确保存在需要的位置。

一旦这些基线文件锁定，你的设置就完成了，目录就可以在**重放**或**Live**模式下被`adk conformance`定位。

#### 工作原理 {#how-it-works}

* **回放模式（默认）:** 该工具运行您的 Agent，直接将其实时 LLM 请求、响应和工具调用与您之前录制的互动进行比较，以发现意外偏差。
* **实时模式：** 基于评估的验证对活跃环境进行 *（注：该模式仍在开发中）*。

### 评估标准 {#evaluation-criteria}

ADK 提供了多个内置的评估 Agent 绩效标准，范围包括
从工具轨迹匹配到基于 LLM 的反应质量评估。对于
详细的可用标准列表及使用指南，详见相关内容
[评估标准](/docs/adk/run/evaluation/criteria/)。

以下是所有可用标准的总结：

* **tool_trajectory_avg_score**：工具呼叫轨迹的精确匹配。
* **response_match_score**：ROUGE-1与参考响应的相似性。
* **final_response_match_v2**：LLM 判定语义匹配到引用
    回应。
* **rubric_based_final_response_quality_v1**：LLM 评判的最终回应
    质量基于自定义评分标准。
* **rubric_based_tool_use_quality_v1**：基于
    自定义评分标准。
* **rubric_based_multi_turn_trajectory_quality_v1**：大型语言模型判定的多回合
    轨迹质量基于自定义评分标准。
* **hallucinations_v1**：经 LLM 判断的 Agent 人回应的根基性
    背景。
* **safety_v1**：Agent 人反应的安全性/无害性。
* **per_turn_user_simulator_quality_v1**：LLM 评判的用户模拟器质量。
* **multi_turn_task_success_v1**：评估 Agent 人是否实现了
    对话。
* **multi_turn_trajectory_quality_v1**：评估整体发展轨迹
    对话。
* **multi_turn_tool_use_quality_v1**：评估在
    对话。

以下是*效率*标准。它们报告了一个数值，但从未通过或
如果评估失败，每次评估都会被报告，但不会被列入
`EvalConfig`：* **tool_call_count_v1**：工具调用次数。
* **inference_call_count_v1**：模型调用次数。
* **token_usage_v1**：消耗的令牌数，并按类型进行细分，同时报告总数。
* **invocation_duration_v1**：Agent 运行时消耗的实际秒数。

{{% alert context="info" %}}

某些标准（如响应质量、安全性和多轮对话质量）需要使用 [Vertex Gen AI Evaluation Service API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/evaluation)。
要使用它们，请通过设置 `GOOGLE_API_KEY` 环境变量进行身份验证，或使用 Google Cloud 项目凭据（`GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION` 以及应用程序默认凭据）。
{{% /alert %}}
如果未提供评估标准，将使用以下默认配置：

* `tool_trajectory_avg_score`：默认值为 1.0，要求工具使用路径完全匹配 100%。
* `response_match_score`：默认值为 0.8，允许 Agent 的自然语言响应有小幅误差。

以下是一个指定自定义评估标准的 `test_config.json` 文件示例：

```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,
    "response_match_score": 0.8
  }
}
```

#### 关于评估标准的建议 {#recommendations-on-criteria}

根据你的评估目标选择标准：

*   **在 CI/CD 管道或回归测试中启用测试：** 使用 `tool_trajectory_avg_score` 和 `response_match_score`。这些标准快速、可预测，适合频繁的自动化检查。
*   **评估可信参考响应：** 使用 `final_response_match_v2` 来评估语义等效性。基于 LLM 的检查比完全匹配更灵活，更能捕捉 Agent 的响应是否与参考响应表达相同的意思。
*   **在没有参考响应的情况下评估响应质量：** 使用 `rubric_based_final_response_quality_v1`。当你没有可信参考时，这很有用，但你可以定义良好响应的属性（例如，“响应简明”，“响应具有帮助性的语气”）。
*   **评估工具使用的正确性：** 使用 `rubric_based_tool_use_quality_v1`。这允许你通过检查特定工具是否被调用或工具调用顺序是否正确（例如，“工具 A 必须在工具 B 之前调用”）来验证 Agent 的推理过程。
*   **检查响应是否基于上下文：** 使用 `hallucinations_v1` 来检测 Agent 是否提出与其可用信息（例如工具输出）不支持或矛盾的声明。
*   **检查有害内容：** 使用 `safety_v1` 以确保 Agent 响应安全且不违反安全策略。
*   **评估多轮目标完成情况：** 使用 `multi_turn_task_success_v1` 测量多轮对话在实现其预期目标方面的总体成功率。
*   **评估整体对话轨迹：** 使用 `multi_turn_trajectory_quality_v1` 评估对话过程中采取步骤的效率、有效性和逻辑性。
*   **评估多轮工作流中的工具使用：** 使用 `multi_turn_tool_use_quality_v1` 评估跨多轮调用的工具或功能调用的质量、相关性和正确性。
*   **跟踪 Agent 的成本高低：** 效率标准（`tool_call_count_v1`、`inference_call_count_v1`、`token_usage_v1`、`invocation_duration_v1`）会自动报告，无需配置，也无需额外的模型调用。在不同运行之间进行比较，可以发现质量不变但令牌使用量增加一倍的变化。它们从不会导致评估失败，因此不会给 CI/CD 运行增加新的失败模式。

此外，需要预期 Agent 工具使用和/或响应信息的标准不支持与 [User Simulation](/docs/adk/run/evaluation/user-simulation/) 结合使用。受影响的标准包括 `tool_trajectory_avg_score`、`response_match_score` 和 `final_response_match_v2`。对用户模拟的支持在 [Evaluation Criteria](/docs/adk/run/evaluation/criteria/) 的支持栏中按标准列出。### 用户模拟

在评估对话 Agent 时，使用固定的一组用户提示并不总是可行的，因为对话可能会以意想不到的方式进行。
例如，如果 Agent 需要用户提供两个值来执行任务，它可能会一次请求一个值或同时请求两个值。
为了解决这个问题，ADK 允许您在特定的*对话场景*中测试 Agent 的行为，用户提示由 AI 模型动态生成。
有关如何设置带有用户模拟的评估的详细信息，请参见 [User Simulation](/docs/adk/run/evaluation/user-simulation/)。

## 使用 ADK 运行评估 {#user-simulation}

作为开发者，您可以通过以下方式使用 ADK 评估您的 Agent：

- **基于 Web 的界面** (`adk web`)：通过基于 Web 的界面进行交互式 Agent 评估。
- **编程方式** (`pytest`)：使用 `pytest` 和测试文件将评估集成到测试流水线中。
- **命令行界面** (`adk eval`)：直接从命令行运行现有评估集文件上的评估。
- **一致性测试** (`adk conformance`)：针对基线文件执行自动化测试，以检测意外偏差或回退。

### 通过 Web UI 运行评估 {#how-to-run-evaluation-with-adk}

Web UI 提供了一种交互式的方法来评估 Agent、生成评估数据集，并详细检查 Agent 行为。

#### 第 1 步：创建并保存测试用例 {#run-evaluations-via-the-web-ui}

1. 通过运行 `adk web <path_to_your_agents_folder>` 启动 Web 服务器。
2. 在 Web 界面中选择 Agent 并与之互动以创建会话。
3. 导航到界面右侧的 **Eval** 标签。
4. 创建新的评估集或选择现有的评估集。
5. 点击 **"Add current session"** 将当前会话保存为新的评估用例。

#### 第 2 步：查看和编辑测试用例 {#step-1-create-and-save-a-test-case}

保存用例后，您可以点击列表中的 ID 来查看它。要进行修改，点击 **Edit current eval case** 图标（铅笔）。该交互视图允许您：

* **修改**Agent 文本回复以优化测试场景。
* **删除**对话中的单条 Agent 消息。
* 如果不再需要，**删除**整个评估用例。

![adk-eval-case.gif](/images/adk/adk-eval-case.gif)

#### 第 3 步：使用自定义指标运行评估 {#step-2-view-and-edit-your-test-case}

1. 从评估集中选择一个或多个测试用例。
2. 点击 **Run Evaluation**。将弹出 **EVALUATION METRIC** 对话框。
3. 在对话框中，使用滑块配置以下阈值：
    * **工具轨迹平均分**
    * **响应匹配分数**
4. 点击 **Start** 使用自定义标准运行评估。评估历史将记录每次运行使用的指标。

![adk-eval-config.gif](/images/adk/adk-eval-config.gif)

#### 第 4 步：分析结果 {#step-3-run-the-evaluation-with-custom-metrics}

运行完成后，您可以分析结果：* **分析运行失败**：点击任何 **通过** 或 **失败** 的结果。对于失败，可以将鼠标悬停在 `Fail` 标签上，以查看 **实际输出与期望输出** 的并排比较以及导致失败的评分。

### 使用跟踪视图进行调试 {#step-4-analyze-results}

ADK Web UI 包含一个强大的 **跟踪（Trace）** 选项卡，用于调试 Agent 行为。此功能适用于任何 Agent 会话，而不仅仅是在评估期间。

**跟踪** 选项卡提供了一种详细且交互式的方式来检查 Agent 的执行流程。跟踪内容会自动按用户消息分组，使得跟踪事件链条变得容易。

每个跟踪行都是交互式的：

* **悬停** 在跟踪行上会高亮显示聊天窗口中对应的消息。
* **点击** 跟踪行会打开一个包含四个选项卡的详细检查面板：
    * **事件（Event）**：原始事件数据。
    * **请求（Request）**：发送给模型的请求。
    * **响应（Response）**：模型返回的响应。
    * **图表（Graph）**：工具调用和 Agent 逻辑流程的可视化表示。

![adk-trace1.gif](/images/adk/adk-trace1.gif)

![adk-trace2.gif](/images/adk/adk-trace2.gif)

跟踪视图中的蓝色行表示该互动生成了事件。点击这些蓝色行将打开下方的事件详细面板，提供对 Agent 执行流程的更深入了解。

### 以编程方式运行测试 {#debugging-with-the-trace-view}

你也可以使用 **`pytest`** 将测试文件作为集成测试的一部分运行。

#### 示例命令 {#run-tests-programmatically}

```shell
pytest tests/integration/
```

#### 示例测试代码 {#example-command}

下面是一个运行单个测试文件的 `pytest` 测试用例示例：

```py
from google.adk.evaluation.agent_evaluator import AgentEvaluator
import pytest

@pytest.mark.asyncio
async def test_with_single_test_file():
    """Test the agent's basic ability via a session file."""
    await AgentEvaluator.evaluate(
        agent_module="home_automation_agent",
        eval_dataset_file_path_or_dir="tests/integration/fixture/home_automation_agent/simple_test.test.json",
    )
```

这种方法允许你将 Agent 评估集成到你的 CI/CD 管道或更大的测试套件中。如果你想为测试指定初始会话状态，可以通过将会话详情存储在文件中，并将其传递给 `AgentEvaluator.evaluate` 方法来实现。

### 通过 CLI 运行评估 {#example-test-code}

你也可以通过命令行界面（CLI）运行评估集文件。这会运行与 UI 上相同的评估，但有助于自动化，例如你可以将此命令作为常规构建生成和验证过程的一部分。

命令如下：

```shell
adk eval \
    <AGENT_MODULE_FILE_PATH> \
    <EVAL_SET_FILE_PATH_OR_ID>... \
    [--config_file_path=<PATH_TO_TEST_JSON_CONFIG_FILE>] \
    [--print_detailed_results]
```

例如：

```shell
adk eval \
    samples_for_testing/hello_world \
    samples_for_testing/hello_world/hello_world_eval_set_001.evalset.json
```

以下是每个命令行参数的详细信息：

* `AGENT_MODULE_FILE_PATH`：Agent 目录的路径，而不是文件，其 `__init__.py` 公开了名为“agent”的模块。“agent”模块包含一个 `root_agent`。
* `EVAL_SET_FILE_PATH_OR_ID`：评估文件的路径，或者由 ADK 管理并通过 `adk eval_set create` 创建的评估集的 ID。您可以指定一个或多个其中之一，但在同一个命令中不能混合使用文件路径和评估集 ID。对于每个评估集，默认运行所有评估。如果您只想运行评估集中的特定评估，请先创建一个以逗号分隔的评估名称列表，然后将其作为后缀添加到评估集文件名或 ID，使用冒号 `:` 进行分隔。
* 例如：`sample_eval_set_file.json:eval_1,eval_2,eval_3`
  `This will only run eval_1, eval_2 and eval_3 from sample_eval_set_file.json`
* `CONFIG_FILE_PATH`：配置文件的路径。
* `PRINT_DETAILED_RESULTS`：在控制台上打印详细结果。

### 运行一致性测试 {#run-evaluations-via-the-cli}

您可以一次运行所有测试，运行特定测试，或者创建摘要报告。

#### 运行所有测试 {#run-conformance-tests}

如果您没有输入特定的文件夹路径，工具会自动在工作区中查找 tests/ 文件夹并运行其中的所有内容：

```
adk conformance test
```

#### 运行特定的测试组或单个用例 {#run-all-tests}

传递一个或多个文件夹路径以缩小执行的测试范围：

```

# Test an entire category of tests
adk conformance test tests/core

# Test one specific case
adk conformance test tests/core/description_001
```

#### 生成 Markdown 测试报告 {#run-specific-test-groups-or-individual-cases}

添加 `--generate_report` 标志以生成干净的测试概要报告。您可以选择使用 `--report_dir parameter` 指定保存位置：

```
# Save the report in a specific folder
adk conformance test --generate_report --report_dir=reports
```

#### 使用 CI/CD 自动化 {#generate-markdown-test-reports}
因为 adk 一致性测试是一个命令行工具，如果内容不匹配就会失败，所以它对 CI/CD 管道非常有用。你可以设置它在有人提出拉取请求时自动运行，如果更改了 Agent 的预期行为，它会阻止任何代码合并。

---

原文：[Why evaluate agents](https://adk.dev/evaluate/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/evaluate/index.md)
