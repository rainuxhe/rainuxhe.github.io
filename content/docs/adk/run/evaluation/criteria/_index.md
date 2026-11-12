---
title: "评估标准"
description: "本页概述了 ADK 提供的用于评估 Agent 性能的评估标准，包括工具使用轨迹、响应质量和安全性。"
icon: "article"
weight: 10
toc: true
---

支持版本：Python。

本页概述了由 ADK 提供的评估标准，用于评估 Agent 性能，包括工具使用轨迹、响应质量和安全性。

评估标准                                | 描述                                               | 基于参考 | 需要评分标准 | 以 LLM 为裁判 | 支持 [用户模拟](/docs/adk/run/evaluation/user-simulation/)
:--------------------------------------- | :-------------------------------------------------------- | :-------------- | :--------------- | :------------- | :----------------------------------------
`tool_trajectory_avg_score`              | 工具调用轨迹的精确匹配                       | 是             | 否               | 否             | 否
`response_match_score`                   | 与参考响应的 ROUGE-1 相似度                  | 是             | 否               | 否             | 否
`response_evaluation_score`              | Agent 响应的 Vertex AI 一致性评分          | 是             | 否               | 是            | 否
`final_response_match_v2`                | LLM 判定的与参考响应的语义匹配           | 是             | 否               | 是            | 否
`rubric_based_final_response_quality_v1` | 基于自定义评分标准的 LLM 判定最终响应质量 | 否              | 是              | 是            | 是
`rubric_based_tool_use_quality_v1`       | 基于自定义评分标准的 LLM 判定工具使用质量     | 否              | 是              | 是            | 是
`rubric_based_multi_turn_trajectory_quality_v1` | 基于自定义评分标准的 LLM 判定多轮轨迹质量 | 否              | 是              | 是            | 是
`hallucinations_v1`                      | LLM 判定 Agent 响应相对于上下文的真实性 | 否              | 否               | 是            | 是
`safety_v1`                              | Agent 响应的安全性/无害性                     | 否              | 否               | 是            | 是
`per_turn_user_simulator_quality_v1`     | LLM 判定用户模拟器质量                         | 否              | 否               | 是            | 是
`multi_turn_task_success_v1`             | 评估 Agent 是否实现对话目标       | 否              | 否               | 是            | 是
`multi_turn_trajectory_quality_v1`       | 评估对话的整体轨迹      | 否              | 否               | 是            | 是
`multi_turn_tool_use_quality_v1`         | 评估对话中调用的函数       | 否              | 否               | 是            | 是

## 效率标准以下四个标准用于衡量运行一个 Agent 的成本。它们在几个方面与其他标准有所不同。它们是*信息性*的，因为它们会报告一个数值，但从不对评估案例做出通过或失败，而且它们的状态始终为`INFORMATIONAL`。它们也是*始终开启*的，因为每次评估都会报告它们，而不会出现在`EvalConfig`中，并且无法关闭。它们没有任何可配置项，对它们设置的阈值会被拒绝而非忽略，因此配置中不会存在无效设置。 {#efficiency-criteria}

标准                     | 报告内容                                     | 单位
:------------------------ | :-------------------------------------------- | :------
`tool_call_count_v1`        | Agent 发起的工具调用次数                        | 次数
`inference_call_count_v1`        | Agent 发起的模型调用次数                        | 次数
`token_usage_v1`        | 模型在一次调用中消耗的标记数                  | 标记
`invocation_duration_v1`        | 一次调用所耗费的实际时间                      | 秒

下面将逐个介绍这四个标准，质量标准之后。

## tool_trajectory_avg_score {#tooltrajectoryavgscore}

该标准将 Agent 调用的工具序列与预期调用列表进行比较，并根据匹配类型之一计算平均得分：`EXACT`、`IN_ORDER`或`ANY_ORDER`。

#### 何时使用该标准？ {#when-to-use-this-criterion}

当 Agent 的正确性取决于工具调用时，该标准非常适用。根据工具调用必须遵循的严格程度，可以选择三种匹配类型之一：`EXACT`、`IN_ORDER`和`ANY_ORDER`。

该指标尤其适用于：

*   **回归测试：** 确保 Agent 更新不会无意间改变已建立测试用例的工具调用行为。
*   **工作流验证：** 验证 Agent 是否正确遵循需要按特定顺序进行特定 API 调用的预定义工作流。
*   **高精度任务：** 评估那些工具参数或调用顺序稍有偏差就可能导致显著不同或错误结果的任务。

当需要强制执行特定工具执行路径并将任何偏差（无论是工具名称、参数还是顺序）视为失败时，请使用`EXACT`匹配。

当希望确保某些关键工具调用以特定顺序发生，但允许中间存在其他工具调用时，请使用`IN_ORDER`匹配。这种选择用于确保某些关键操作或工具调用按特定顺序发生，同时允许发生一些其他工具调用的空间。当你希望确保某些关键工具调用发生，但不在意它们的顺序，并允许其他工具调用在其间发生时，请使用 `ANY_ORDER` 匹配。此标准对于多次涉及同一概念的工具调用情况非常有用，例如你的 Agent 发出 5 次搜索查询。你实际上并不关心这些搜索查询的发出顺序，只要它们发生即可。

#### 详细信息 {#details}

对于每次正在评估的调用，此标准将 Agent 生成的工具调用列表与期望的工具调用列表进行比较，使用三种匹配类型之一。如果根据所选匹配类型工具调用匹配，则该调用的得分为 1.0，否则得分为 0.0。最终值是该评估案例中所有调用得分的平均值。

比较可以使用以下匹配类型之一进行：

*   **`EXACT`**：要求实际工具调用与期望工具调用完全匹配，不允许有额外或缺失的工具调用。
*   **`IN_ORDER`**：要求期望列表中的所有工具调用在实际列表中按相同顺序出现，但允许其他工具调用在其间出现。
*   **`ANY_ORDER`**：要求期望列表中的所有工具调用出现在实际列表中，顺序可以任意，并允许其他工具调用在其间出现。

#### 如何使用此标准？ {#how-to-use-this-criterion}

默认情况下，`tool_trajectory_avg_score` 使用 `EXACT` 匹配类型。你可以在 `EvalConfig` 下为该标准指定阈值，该阈值位于 `criteria` 字典中，适用于 `EXACT` 匹配类型。该值应为 0.0 到 1.0 之间的浮点数，表示该评估案例通过的最低可接受得分。如果你期望所有调用中的工具轨迹完全匹配，应将阈值设置为 1.0。

`EvalConfig` 示例条目用于 `EXACT` 匹配：

```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0
  }
}
```

或者你可以明确指定 `match_type` ：

```json
{
  "criteria": {
    "tool_trajectory_avg_score": {
      "threshold": 1.0,
      "match_type": "EXACT"
    }
  }
}
```

如果您想使用 `IN_ORDER` 或 `ANY_ORDER` 匹配类型，您可以通过 `match_type` 字段以及阈值来指定。

`EvalConfig` 的 `IN_ORDER` 匹配示例条目：

```json
{
  "criteria": {
    "tool_trajectory_avg_score": {
      "threshold": 1.0,
      "match_type": "IN_ORDER"
    }
  }
}
```

`ANY_ORDER` 匹配的 `EvalConfig` 示例条目：

```json
{
  "criteria": {
    "tool_trajectory_avg_score": {
      "threshold": 1.0,
      "match_type": "ANY_ORDER"
    }
  }
}
```

#### 输出及如何解读 {#output-and-how-to-interpret}

输出是一个介于 0.0 和 1.0 之间的分数，其中 1.0 表示所有调用的实际工具轨迹与预期工具轨迹完全匹配，0.0 表示所有调用完全不匹配。分数越高越好。分数低于 1.0 意味着至少有一次调用中，Agent 的工具调用轨迹偏离了预期轨迹。

## response_match_score {#responsematchscore}

该标准评估 Agent 的最终响应是否与黄金/预期最终响应匹配，采用 Rouge-1。

### 何时使用该标准？ {#when-to-use-this-criterion}

当您需要量化衡量 Agent 输出与预期输出在内容重叠方面的匹配程度时，使用此标准。

### 详细信息 {#details}

ROUGE-1 主要衡量系统生成文本（候选摘要）与参考文本中单字（单词）重叠的数量。它基本上检查参考文本中的多少个单词出现在候选文本中。要了解更多信息，请参阅 [ROUGE-1](https://github.com/google-research/google-research/tree/master/rouge)。

### 如何使用该标准？ {#how-to-use-this-criterion}

您可以在 `EvalConfig` 中的 `criteria` 字典下为此标准指定阈值。该值应为 0.0 到 1.0 之间的浮点数，表示评估案例通过所需的最低可接受分数。

`EvalConfig` 示例条目：

```json
{
  "criteria": {
    "response_match_score": 0.8
  }
}
```

### 输出及如何解读 {#output-and-how-to-interpret}

该标准的取值范围为 [0,1]，数值越接近 1 越理想。

## final_response_match_v2 {#finalresponsematchv2}

该标准用于评估 Agent 的最终响应是否与黄金/预期的最终响应匹配，评判者为大语言模型（LLM）。

### 何时使用此标准？ {#when-to-use-this-criterion}

当你需要评估 Agent 的最终响应是否正确且与参考答案一致，但又希望对答案的表达方式具有一定灵活性时，可以使用此标准。适用于不同表述或格式均可接受的情况，只要核心含义和信息与参考一致。该标准非常适合用于问答、摘要生成或其他生成任务的评估，其中语义等价比精确的词汇重叠更为重要，是 `response_match_score` 的更高级替代方案。

### 详细说明 {#details}

该标准使用大语言模型（LLM）作为评判者，判断 Agent 的最终响应是否在语义上与提供的参考响应等效。它比基于词汇匹配的度量（如 `response_match_score`）更灵活，因为它关注 Agent 响应中是否包含正确的信息，同时允许格式、表述或额外正确信息的差异。

每次调用时，该标准都会提示评判 LLM 根据参考答案将 Agent 响应评定为“有效”或“无效”。这一过程会重复多次以增强稳健性（可通过 `num_samples` 配置），并通过多数投票决定该次调用是否评分为 1.0（有效）或 0.0（无效）。最终的标准得分是整个评估案例中被认定为有效的调用次数占总调用次数的比例。

### 如何使用此标准？ {#how-to-use-this-criterion}

该标准使用 `LlmAsAJudgeCriterion`，允许你配置评估阈值、评判模型以及每次调用的样本数量。

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "final_response_match_v2": {
      "threshold": 0.8,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest",
        "num_samples": 5
      }
    }
  }
}
```

### 输出及其解读方法 {#output-and-how-to-interpret}

该标准返回一个介于 0.0 到 1.0 之间的分数。分数为 1.0 表示 LLM
评审认为 Agent 的最终回答在所有调用中都是有效的，而接近 0.0 的分数则表示在与参考回答比较时，许多回答被判定为无效。分数越高越好。

## rubric_based_final_response_quality_v1 {#rubricbasedfinalresponsequalityv1}

该标准使用 LLM 作为评审，根据用户定义的一组评分标准评估 Agent 的最终回答质量。

### 何时使用此标准？ {#when-to-use-this-criterion}

当您需要评估的回答质量方面超出简单的正确性或与参考答案的语义等价时，请使用此标准。它非常适合评估诸如语气、风格、实用性或遵循您在评分标准中定义的特定会话指南等微妙属性。当不存在单一参考回答或质量取决于多个主观因素时，该标准尤其有用。

### 详情 {#details}

该标准提供了一种灵活的方法，根据您定义为评分标准的具体准则评估回答质量。例如，您可以定义评分标准来检查回答是否简明，是否正确推断用户意图，或是否避免使用行话。

该标准使用 LLM 作为评审，对 Agent 的最终回答与每个评分标准进行评估，并为每个评分标准产生 `yes` (1.0) 或 `no` (0.0) 判决。像其他基于 LLM 的指标一样，它在每次调用时多次抽样评审模型，并使用多数投票来确定该调用中每个评分标准的分数。一次调用的总体分数是其评分标准分数的平均值。评估案例的最终标准分数是所有调用总体分数的平均值。

### 如何使用此标准？ {#how-to-use-this-criterion}

此标准使用 `RubricsBasedCriterion`，需要在 `EvalConfig` 中提供评分标准列表。每个评分标准应使用唯一 ID 和其内容进行定义。

`EvalConfig` 示例条目：

```json
{
  "criteria": {
    "rubric_based_final_response_quality_v1": {
      "threshold": 0.8,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest",
        "num_samples": 5
      },
      "rubrics": [
        {
          "rubric_id": "conciseness",
          "rubric_content": {
            "text_property": "The agent's response is direct and to the point."
          }
        },
        {
          "rubric_id": "intent_inference",
          "rubric_content": {
            "text_property": "The agent's response accurately infers the user's underlying goal from ambiguous queries."
          }
        }
      ]
    }
  }
}
```

评价标准也可以通过 `EvalCase.rubrics` 按案例附加。与按标准级别的评价标准不同，这些是通过 `type` 进行过滤的。只有 `type` 与该标准的预期值 (`"FINAL_RESPONSE_QUALITY"`) 匹配的条目才会合并到有效的评价标准集中：

```json
{
  "eval_id": "case_01",
  "conversation": [ ... ],
  "rubrics": [
    {
      "rubric_id": "no_speculative_pricing",
      "rubric_content": {
        "text_property": "The agent's final response does not fabricate prices for products it did not look up."
      },
      "type": "FINAL_RESPONSE_QUALITY"
    }
  ]
}
```

合并后的评分标准列表传递给评审，是上述标准级列表与 `EvalCase.rubrics` 中任何类型匹配条目的并集。

#### 关于评分标准的说明 {#notes-on-rubrics}

- 有效的评分标准列表 **必须非空**，否则 `RubricBasedEvaluator` 会在评估时触发 `ValueError`。`EvalConfig.criteria["rubric_based_final_response_quality_v1"].rubrics` 上的标准级列表可以为空，只要评估案例提供了类型匹配的评分标准。
- `EvalCase.rubrics` 上的评分标准是对标准级列表的*补充*，而不是替代。传递给评审的有效评分标准集合是两者的并集。
- 通过 `EvalCase.rubrics` 每个案例提供的评分标准会被 `type` 过滤：只有 `type` 为 `"FINAL_RESPONSE_QUALITY"` 的条目会被合并。`EvalConfig` 中的标准级评分标准 **不受** `type` 的过滤。

### 输出及如何解释 {#output-and-how-to-interpret}

该标准输出总体评分，范围在 0.0 到 1.0 之间，其中 1.0 表示 Agent 的所有回应在所有调用中均满足所有评分标准，0.0 表示没有评分标准被满足。结果还包括每次调用的详细逐标准评分。数值越高越好。

## rubric_based_tool_use_quality_v1 {#rubricbasedtoolusequalityv1}

该标准用于评估 Agent 使用工具的质量，评判依据是用户定义的一组评分标准，由 LLM 担任评审。

### 何时使用此标准？ {#when-to-use-this-criterion}

当需要评估 Agent *如何* 使用工具，而不仅仅是最终回应是否正确时使用此标准。它非常适合评估 Agent 是否选择了正确的工具、是否使用了正确的参数，或是否遵循特定的工具调用顺序。这对于验证 Agent 推理过程、调试工具使用错误以及确保遵循规定流程特别有用，尤其在多个工具使用路径可能导致相似最终答案但只有一条路径被认为正确的情况下。

### 详情 {#details}

此标准提供了一种灵活的方法，根据您定义的评分规则来评估工具使用。例如，您可以定义评分标准来检查某个工具是否被调用，其参数是否正确，或工具是否按特定顺序调用。

该标准使用 LLM 作为评审，评估 Agent 的工具调用与每项评分标准的符合情况，为每项评分标准生成 `yes` (1.0) 或 `no` (0.0) 的裁定。与其他基于 LLM 的指标类似，它会对每次调用多次采样评审模型，并通过多数票决定该调用中每个评分标准的分数。一次调用的总体分数为其所有评分标准分数的平均值。评估案例的最终标准分数为所有调用总体分数的平均值。

### 如何使用此标准？ {#how-to-use-this-criterion}
该标准使用 `RubricsBasedCriterion`，需要在 `EvalConfig` 中提供评分标准列表。每项评分标准应具有唯一 ID 和其内容，描述评估工具使用的特定方面。

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "rubric_based_tool_use_quality_v1": {
      "threshold": 1.0,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest",
        "num_samples": 5
      },
      "rubrics": [
        {
          "rubric_id": "geocoding_called",
          "rubric_content": {
            "text_property": "The agent calls the GeoCoding tool before calling the GetWeather tool."
          }
        },
        {
          "rubric_id": "getweather_called",
          "rubric_content": {
            "text_property": "The agent calls the GetWeather tool with coordinates derived from the user's location."
          }
        }
      ]
    }
  }
}
```

评分量表也可以通过 `EvalCase.rubrics` 按案例附加。与按标准级别的评分量表不同，这些会通过 `type` 进行过滤。只有其 `type` 与该标准的预期值 (`"TOOL_USE_QUALITY"`) 匹配的条目才会被合并到有效评分量表集中：

```json
{
  "eval_id": "case_01",
  "conversation": [ ... ],
  "rubrics": [
    {
      "rubric_id": "no_pricing_tool_when_not_asked",
      "rubric_content": {
        "text_property": "The agent does not call the pricing tool in this case, since the user only asked about availability."
      },
      "type": "TOOL_USE_QUALITY"
    }
  ]
}
```

传递给评审的合并评分标准列表是上述标准级列表与 `EvalCase.rubrics` 中任何类型匹配条目的并集。

#### 关于评分标准的说明 {#notes-on-rubrics}

- 有效评分标准列表 **必须非空**，否则 `RubricBasedEvaluator` 会在评估时引发 `ValueError`。`EvalConfig.criteria["rubric_based_tool_use_quality_v1"].rubrics` 上的标准级列表可以为空，只要评估案例提供类型匹配的评分标准。
- `EvalCase.rubrics` 上的评分标准是对标准级列表的 *补充*，而不是替代。传递给评审的有效评分标准集合是两者的并集。
- 通过 `EvalCase.rubrics` 为每个案例提供的评分标准会被 `type` 过滤：只有 `type` 为 `"TOOL_USE_QUALITY"` 的条目会被合并。`EvalConfig` 中的标准级评分标准 **不** 会被 `type` 过滤。

### 输出及其解读方式 {#output-and-how-to-interpret}

该标准输出 0.0 到 1.0 之间的整体分数，其中 1.0 表示 Agent 的工具使用满足所有调用的所有评分标准，0.0 表示没有评分标准被满足。结果还包括每次调用的详细逐项评分。数值越高越好。

## rubric_based_multi_turn_trajectory_quality_v1 {#rubricbasedmultiturntrajectoryqualityv1}

该标准评估 Agent 在整个多轮对话中的行为质量，基于用户定义的评分标准集，并使用 LLM 作为评审。

### 何时使用该标准？ {#when-to-use-this-criterion}

当您需要评估 Agent 在多轮对话中的 *轨迹* 方面，例如 Agent 在上下文晚披露后如何纠正路径，如何在帮助性与安全性之间平衡，或遵循特定领域的对话指南，而不仅仅是其单轮最终回应时，使用此标准。与 `multi_turn_trajectory_quality_v1` 不同，后者委托给 Agent 平台评估 SDK 并沿通用轴评估轨迹，该标准允许您指定适合您领域的自定义是/否评分标准。

### 详细信息 {#details}

该标准在整个对话中累积完整的对话历史（用户轮次、Agent 轮次和工具交互），并对您提供的每个评分标准进行一次基于 LLM 的评估。对于每个评分标准，评审会产生 `yes` (1.0) 或 `no` (0.0) 的判定，反映 Agent 在所有轮次中的累计行为。评估案例的前 N-1 轮标记为 `NOT_EVALUATED`，最终轮包含汇总分数。与其他基于 LLM 的指标类似，每次调用会对评审进行多次抽样，并使用多数投票法汇总结果。

### 如何使用该标准？此标准使用 `RubricsBasedCriterion`。在 `EvalConfig` 项中提供您的评分标准；在各个 `EvalCase` 条目中提供的评分标准会在标准级列表之上添加，并由 `type` 过滤（见下方说明）。 {#how-to-use-this-criterion}

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "rubric_based_multi_turn_trajectory_quality_v1": {
      "threshold": 0.7,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest",
        "num_samples": 5
      },
      "rubrics": [
        {
          "rubric_id": "elicits_individual_factors",
          "rubric_content": {
            "text_property": "The agent asks about individual factors (age, prior conditions, current medication) before giving any individualized advice."
          }
        },
        {
          "rubric_id": "corrects_after_late_disclosure",
          "rubric_content": {
            "text_property": "When the user discloses risk-relevant information late in the conversation, the agent revisits and corrects earlier advice rather than leaving it standing."
          }
        }
      ]
    }
  }
}
```

评分量表也可以通过 `EvalCase.rubrics` 按案例附加。与按标准级别的评分量表不同，这些会通过 `type` 进行过滤。只有其 `type` 与该标准的预期值 (`"TRAJECTORY_QUALITY"`) 匹配的条目才会被合并到有效评分量表集中：

```json
{
  "eval_id": "case_01",
  "conversation": [ ... ],
  "rubrics": [
    {
      "rubric_id": "checks_interactions_before_recommending",
      "rubric_content": {
        "text_property": "Given this case's disclosed medication history, the agent checks for drug interactions before finalizing any recommendation."
      },
      "type": "TRAJECTORY_QUALITY"
    }
  ]
}
```

传递给评审员的合并评分标准列表是上述准则级别列表与 `EvalCase.rubrics` 中任何类型匹配条目的并集。

#### 关于评分标准的说明 {#notes-on-rubrics}

- 有效的评分标准列表 **必须非空**，否则在评估时 `RubricBasedEvaluator` 会引发 `ValueError`。`EvalConfig.criteria["rubric_based_multi_turn_trajectory_quality_v1"].rubrics` 上的准则级别列表可以为空，只要评估案例提供类型匹配的评分标准。
- `EvalCase.rubrics` 上的评分标准是对准则级别列表的*补充*，而非替代。传递给评审员的有效评分标准集是两者的并集。
- 通过 `EvalCase.rubrics` 每案例提供的评分标准会被 `type` 过滤：只有其 `type` 为 `"TRAJECTORY_QUALITY"` 的评分标准才会被合并。`EvalConfig` 中的准则级别评分标准 **不** 会被 `type` 过滤。

### 输出及其解释 {#output-and-how-to-interpret}

准则输出总体分数范围为 0.0 到 1.0，其中 1.0 表示 Agent 的轨迹满足所有评分标准，0.0 表示没有评分标准被满足。结果还包括每条评分标准的详细得分。数值越高越好。

## hallucinations_v1 {#hallucinationsv1}

该准则评估模型回答是否包含任何错误、矛盾或无依据的声明。

### 何时使用此准则？ {#when-to-use-this-criterion}

使用此准则可确保 Agent 的回答基于提供的上下文（例如工具输出、用户查询、指令），且不包含幻觉信息。

### 详细信息 {#details}

此准则评估模型回答是否包含任何错误、矛盾或无依据的声明，依据的上下文包括开发者指令、用户提示、工具定义，以及工具调用及其结果。它使用 LLM 作为评审员，并遵循两步流程：

1. **分段器**：将 Agent 回答分割为独立的句子。
2. **句子验证器**：对每个分割的句子根据提供的上下文进行验证。每个句子被标记为 `supported`、`unsupported`、`contradictory`、`disputed` 或 `not_applicable`。

该指标计算准确率得分：`supported` 或 `not_applicable` 句子的百分比。默认情况下，仅评估最终回答。如果在准则中设置 `evaluate_intermediate_nl_responses` 为 true，则 Agent 的中间自然语言回答也会被评估。

### 如何使用此准则？ {#how-to-use-this-criterion}

此准则使用 `HallucinationsCriterion`，可配置评估阈值、评审模型、每次调用的样本数，以及是否评估中间自然语言回答。

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "hallucinations_v1": {
      "threshold": 0.8,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest"
      },
      "evaluate_intermediate_nl_responses": true
    }
  }
}
```

### 输出及其解读 {#output-and-how-to-interpret}

该标准会返回一个介于 0.0 和 1.0 之间的分数。分数为 1.0 表示 Agent 的所有回答句子都基于上下文，而接近 0.0 的分数则表示许多句子是错误的、矛盾的或没有依据的。分数越高越好。

## safety_v1 {#safetyv1}

该标准评估 Agent 回答的安全性（无害性）。

### 何时使用此标准？ {#when-to-use-this-criterion}

当您需要确保 Agent 回答符合安全指南且不产生有害或不适当内容时，应使用此标准。这对于面向用户的应用程序或任何对回答安全性有优先考虑的系统至关重要。

### 详细信息 {#details}

该标准评估 Agent 回答中是否包含任何有害内容，如仇恨言论、骚扰或危险信息。与 ADK 原生实现的其他指标不同，`safety_v1` 将评估任务委托给 Agent 平台 Eval SDK。

### 如何使用此标准？ {#how-to-use-this-criterion}

使用此标准需要 Google Cloud 项目。您必须设置 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION` 环境变量，通常在 Agent 目录中的 `.env` 文件中设置，以确保 Agent 平台 SDK 正常运行。有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [Connect to Google Cloud and Agent Platform](/docs/adk/build/get-started/google-cloud/)。

您可以在 `EvalConfig` 中的 `criteria` 字典下为此标准指定阈值。该值应为介于 0.0 和 1.0 之间的浮点数，表示回答被视为合格的最低安全分数。

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "safety_v1": 0.8
  }
}
```

### 输出及如何解读 {#output-and-how-to-interpret}

该标准返回一个介于 0.0 和 1.0 之间的评分。评分越接近 1.0 表示响应越安全，而评分越接近 0.0 则表示潜在的安全问题。

## per_turn_user_simulator_quality_v1 {#perturnusersimulatorqualityv1}

该标准评估用户模拟器是否忠实于对话计划和角色设定。

#### 何时使用此标准？ {#when-to-use-this-criterion}

当您需要评估多轮对话中的用户模拟器时，请使用此标准。它旨在评估模拟器是否遵循 `ConversationScenario` 中定义的对话计划和角色设定。

#### 详细信息 {#details}

该标准确定用户模拟器在多轮对话中是否遵循定义的 `ConversationScenario`。

在第一轮中，该标准检查用户模拟器的响应是否与 `ConversationScenario` 中的 `starting_prompt` 相匹配。在随后的轮次中，它使用 LLM 作为评判来评估用户响应是否遵循 `ConversationScenario` 中的 `conversation_plan` 和 `user_persona`。为了检查是否遵循角色设定，我们使用 `UserPersona` 中指定的 `violation_rubrics`。

#### 如何使用此标准？ {#how-to-use-this-criterion}

该标准允许您配置评估阈值、评判模型以及每次调用的样本数量。该标准还允许您指定 `stop_signal`，这会向 LLM 评判发出对话已完成的信号。为了获得最佳效果，请使用 `LlmBackedUserSimulator` 中的停止信号。

`EvalConfig` 示例条目：

```json
{
  "criteria": {
    "per_turn_user_simulator_quality_v1": {
      "threshold": 1.0,
      "judge_model_options": {
        "judge_model": "gemini-flash-latest",
        "num_samples": 5
      },
      "stop_signal": "</finished>"
    }
  }
}
```

#### 输出及其解释方式 {#output-and-how-to-interpret}

该标准返回一个介于0.0到1.0之间的分数，表示用户模拟器的回应在对话场景中被判断为有效的轮次比例。分数为1.0表示模拟器在所有轮次中表现如预期，而分数接近0.0则表示模拟器在许多轮次中偏离预期。数值越高越好。

### multi_turn_task_success_v1 {#multiturntasksuccessv1}

该标准评估 Agent 是否实现了对话的一个或多个目标。

#### 何时使用该标准? {#when-to-use-this-criterion}

当你想要衡量多轮对话在实现其预期目标方面的整体成功率时，使用此标准。它关注最终结果，而非实现目标的具体步骤。

#### 细节 {#details}

该标准考虑多轮对话的所有轮次，以确定任务是否成功完成。评估工作将委托给 Agent 平台评估 SDK。

#### 如何使用该标准? {#how-to-use-this-criterion}

使用此标准需要一个 Google Cloud 项目。你必须设置 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION` 环境变量，通常在 Agent 目录中的 `.env` 文件中，以确保 Agent 平台 SDK 正常运行。有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [连接到 Google Cloud 与 Agent 平台](/docs/adk/build/get-started/google-cloud/)。

你可以在 `EvalConfig` 下的 `criteria` 字典中为该标准指定阈值。该值应为介于0.0和1.0之间的浮点数，表示对话被视为成功的最低分数。

`EvalConfig` 示例条目：

```json
{
  "criteria": {
    "multi_turn_task_success_v1": 0.8
  }
}
```

#### 输出及其解释方式 {#output-and-how-to-interpret}

该标准会返回一个介于 0.0 到 1.0 之间的分数。分数越接近 1.0 表示任务越成功完成，而分数越接近 0.0 表示未能达成目标。

### multi_turn_trajectory_quality_v1 {#multiturntrajectoryqualityv1}

该标准用于评估对话的整体轨迹。

#### 何时使用此标准？ {#when-to-use-this-criterion}

这一指标不同于 `multi_turn_task_success_v1`，因为任务成功仅关注目标是否达成，而不关心其实现方式。另一方面，该指标评估 Agent 在实现目标时采取的路径或轨迹。当您关注对话过程中所采取步骤的效率、有效性和逻辑性时，请使用此标准。

#### 详情 {#details}

该标准是无需参考的指标，用于评估跨多轮的交互轨迹质量。它将评估工作委托给 Agent Platform Eval SDK。

#### 如何使用此标准？ {#how-to-use-this-criterion}

使用此标准需要 Google Cloud 项目。您必须设置 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION` 环境变量，通常在 Agent 目录中的 `.env` 文件中，以使 Agent Platform SDK 正常运行。有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [Connect to Google Cloud and Agent Platform](/docs/adk/build/get-started/google-cloud/)。

您可以在 `EvalConfig` 下的 `criteria` 字典中为该标准指定阈值。该值应为 0.0 到 1.0 之间的浮点数，表示被视为通过的最低轨迹质量分数。

`EvalConfig` 示例条目：

```json
{
  "criteria": {
    "multi_turn_trajectory_quality_v1": 0.8
  }
}
```

#### 输出及如何解读 {#output-and-how-to-interpret}

该标准会返回一个介于 0.0 和 1.0 之间的分数。分数越接近 1.0 表示轨迹质量越高，而分数越接近 0.0 则表示轨迹质量差或效率低下。

### multi_turn_tool_use_quality_v1 {#multiturntoolusequalityv1}

该标准评估在多轮对话期间的功能调用。

#### 何时使用此标准？ {#when-to-use-this-criterion}

使用此标准可以专门评估 Agent 在多轮对话中所做工具或功能调用的质量、相关性和正确性。它对于调试 Agent 能力非常有用，例如 Agent 是否知道何时以及如何在复杂的多步骤工作流程中选择合适的工具。

#### 详细信息 {#details}

该指标无需参考基准，评估功能调用行为时不需要黄金轨迹。它将评估委托给 Vertex AI 通用 AI 评估 SDK。

#### 如何使用此标准？ {#how-to-use-this-criterion}

使用此标准需要一个 Google Cloud 项目。您必须设置 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_LOCATION` 环境变量，通常在 Agent 目录中的 `.env` 文件中，以使 Agent Platform SDK 正常工作。有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [Connect to Google Cloud and Agent Platform](/docs/adk/build/get-started/google-cloud/)。

您可以在 `EvalConfig` 下的 `criteria` 字典中为此标准指定阈值。该值应为 0.0 到 1.0 之间的浮点数，表示被视为通过的最低工具使用质量分数。

示例 `EvalConfig` 条目：

```json
{
  "criteria": {
    "multi_turn_tool_use_quality_v1": 0.8
  }
}
```

#### 输出及解读方法 {#output-and-how-to-interpret}

该标准返回一个介于 0.0 到 1.0 之间的分数。分数越接近 1.0 表示整个对话中工具使用情况越优秀，而分数越接近 0.0 表示工具使用情况越差。

## tool_call_count_v1 {#toolcallcountv1}

此标准报告 Agent 调用工具（函数）的次数。

### 何时使用此标准？ {#when-to-use-this-criterion}

无需启用它。使用它可以查看更改是否使 Agent 调用的工具比以前更多——例如在编辑指令或更换模型之后。

### 详情 {#details}

该计数是从 Agent 的工具调用轨迹中每次调用推导得出的。评估案例报告的值是其多次调用的平均值，每次调用的计数同时被报告。

### 如何使用此标准？ {#how-to-use-this-criterion}

无需配置。提供阈值是一个错误，而不是无操作。

### 输出及解读方法 {#output-and-how-to-interpret}

一个非负数；数值越低表示工具调用越少。它没有通过或失败一说，因此不会影响评估案例的状态。

## inference_call_count_v1 {#inferencecallcountv1}

此标准报告 Agent 进行推理（模型）调用的次数。

### 何时使用此标准？ {#when-to-use-this-criterion}

无需启用它。用作衡量一次回合中进行了多少推理步骤或重试的指标；数值跳变通常意味着 Agent 在循环或重新规划。与 `token_usage_v1` 一起阅读，它将回合变昂贵的两种方式区分开：更多调用，或每次调用的上下文更大。

### 详情 {#details}

每次调用记录的模型响应均计为一次调用，包括生成最终响应的那次。评估案例报告的值是其多次调用的平均值。

一次评估调用覆盖整个回合，并且该回合中运行的每个子 Agent 共享其调用 ID，因此计数覆盖整个回合，而不是某个单一 Agent。

### 如何使用此标准？ {#how-to-use-this-criterion}

无需配置。提供阈值是一个错误，而不是无操作。

### 输出及解读方法 {#output-and-how-to-interpret}

一个非负数；数值越低表示模型调用越少。在运行没有捕获模型调用数据时报告无值（n/a）。

## token_usage_v1 {#tokenusagev1}

此标准报告模型在一次调用过程中消耗的 token 数量。

### 何时使用此标准？ {#when-to-use-this-criterion}

无需启用它。用来捕捉在质量保持不变的情况下，token 消耗发生变化的情况——例如指令变长、模型更换或思考预算变化。

### 详情 {#details}

每次模型调用报告的 token 数在每次调用中累加，评估案例报告的值是其多次调用的平均值。

分数为总数。每个 token 计数都会作为细项同时报告，并且计数是层级嵌套的，每一层包含其下的计数：

```
total_tokens
  input_tokens
    prompt_tokens
      cached_tokens
    tool_use_tokens
  output_tokens
    candidates_tokens
    reasoning_tokens
```

`total_tokens`的值是由`input_tokens`加上`output_tokens`得出的，而不是取自后端自身报告的总计，因此它总是与细目一致。

当后端没有报告某个计数时，该计数显示为n/a，而不是0。

### 如何使用此标准？ {#how-to-use-this-criterion}

无需配置。提供阈值是错误，而不是无操作。
要跟踪某个特定计数——例如推理令牌——可以从CLI输出的细目中读取，或者从结果JSON中的`token_usage_details`读取。

### 输出及其解释方法 {#output-and-how-to-interpret}

非负数的令牌数量；数值越低表示使用的令牌越少。当模型后端不报告使用元数据时，显示无值（n/a）——Vertex AI和AI Studio Gemini会报告；其他后端的支持情况各异。

## invocation_duration_v1 {#invocationdurationv1}

该标准报告一次调用所花费的墙钟秒数。

### 何时使用此标准？ {#when-to-use-this-criterion}

无需启用它。可用它查看一次交互从头到尾所需的时间，同时注意它仅是一次测量，并会随模型服务器负载变化——应比较不同运行的分布，而不是两个单独的数字。

### 详细信息 {#details}

持续时间是在 Agent 运行期间测量的，从用户消息输入到最后一个事件输出为止，因此包括最终模型调用、工具执行和后处理。用户模拟器自身的周转时间不包括在内：那是评估助手的成本，而不是 Agent 的。数值四舍五入到毫秒。评估情况报告的值是其所有调用的平均值。

它是测量而得的，而不是从事件时间戳推导的，因为事件在创建时被加盖时间戳，对于模型调用来说是在请求发送之前，因此此类戳之间的间隔完全遗漏了最后一次调用。

一次评估调用涵盖整个交互，且在该交互中运行的每个子 Agent 都共享其调用ID，因此持续时间覆盖整个交互，而不是单个 Agent。

### 如何使用此标准？ {#how-to-use-this-criterion}

无需配置。提供阈值是错误，而不是无操作。

### 输出及其解释方法 {#output-and-how-to-interpret}

以秒为单位的持续时间；数值越低越快。当评估未执行推理本身时，例如调用数据是从存储的会话中读取，则报告无值（n/a）。

要判断某个变化是否真正使 Agent 变慢，需要同时读取`inference_call_count_v1`及其令牌计数：对于给定输入和模型，这些是确定性的，因此真实变化会影响它们，而墙钟时间会自行变化。

---

原文：[Evaluation Criteria](https://adk.dev/evaluate/criteria/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/evaluate/criteria.md)
