---
title: "自定义指标"
description: "如果您需要针对特定用例或领域的专用指标，而内置选项未涵盖这些指标，您可以定义自己的自定义指标。"
icon: "article"
weight: 40
toc: true
---

## 用于 Agent 评估的自定义指标 {#custom-metrics-for-agent-evaluation}

支持版本：Python v1.18.0。

如果您需要针对特定用例或领域的特殊指标，而内置选项无法覆盖，您可以定义自己的自定义指标。

## 定义自定义指标 {#define-a-custom-metric}

自定义指标是一个 Python 函数，用于评估 Agent 在给定评估案例中的表现，并返回一个 [`EvaluationResult`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/evaluator.py)。
该函数接收 [`EvalMetric`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_metrics.py)，Agent 在评估过程中生成的 [`Invocation`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_case.py) 对象列表，以及可选的预期调用列表或评估案例中定义的 [`ConversationScenario`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_case.py)。

每个 `Invocation` 对象表示用户与 Agent 之间交互的单轮信息，包含该轮的工具轨迹、中间响应以及最终响应等信息。

您的自定义指标函数必须具有以下签名：

```python
from typing import Optional
from google.adk.evaluation.eval_case import Invocation
from google.adk.evaluation.eval_metrics import EvalMetric
from google.adk.evaluation.conversation_scenarios import ConversationScenario
from google.adk.evaluation.evaluator import EvaluationResult

def my_custom_metric_function(
    eval_metric: EvalMetric,
    actual_invocations: list[Invocation],
    expected_invocations: Optional[list[Invocation]],
    conversation_scenario: Optional[ConversationScenario],
) -> EvaluationResult:
  ...
```

该函数应返回一个 `EvaluationResult` 对象，并填充 `overall_score`、`overall_eval_status` 和 `per_invocation_results` 字段。

### 示例 {#example}

这里是一个简单的自定义度量示例，用于检查 Agent 在每轮中的最终响应是否与预期的最终响应完全匹配。

```python
import statistics
from typing import Optional

from google.adk.evaluation.conversation_scenarios import ConversationScenario
from google.adk.evaluation.eval_case import Invocation
from google.adk.evaluation.eval_metrics import EvalMetric
from google.adk.evaluation.eval_metrics import EvalStatus
from google.adk.evaluation.evaluator import EvaluationResult, PerInvocationResult

def check_final_response_exact_match(
    eval_metric: EvalMetric,
    actual_invocations: list[Invocation],
    expected_invocations: Optional[list[Invocation]],
    conversation_scenario: Optional[ConversationScenario],
) -> EvaluationResult:
  """Checks if the final response of the first turn matches the expected
  response."""
  if not expected_invocations:
    return EvaluationResult(overall_score=0.0, overall_eval_status=EvalStatus.NOT_EVALUATED)

  per_invocation_results = []

  for actual, expected in zip(actual_invocations, expected_invocations):
    actual_final_response = "".join([part.text for part in actual.final_response.parts])
    expected_final_response = "".join([part.text for part in expected.final_response.parts])
    score = 1.0 if actual_final_response == expected_final_response else 0.0
    eval_status = EvalStatus.PASSED if score else EvalStatus.FAILED
    invocation_result = PerInvocationResult(
        actual_invocation=actual,
        expected_invocation=expected,
        score=score,
        eval_status=eval_status
    )
    per_invocation_results.append(invocation_result)

  average_score = statistics.mean(result.score for result in per_invocation_results)

  threshold = eval_metric.criterion.threshold
  overall_eval_status = (
    EvalStatus.PASSED if average_score >= threshold else EvalStatus.FAILED
  )
  return EvaluationResult(
      overall_score=average_score,
      overall_eval_status=overall_eval_status,
      per_invocation_results=per_invocation_results,
  )
```

#### 异步指标 {#async-metric}

如果您的自定义指标需要进行异步调用，例如调用 API，
您可以将其定义为 `async` 函数。

以下是一个自定义指标函数示例，它使用一个虚拟的异步
粗话检查器 API 来检查 Agent 响应是否包含粗话。

```python
import asyncio
import statistics
from typing import Optional

from google.adk.evaluation.conversation_scenarios import ConversationScenario
from google.adk.evaluation.eval_case import Invocation
from google.adk.evaluation.eval_metrics import EvalMetric
from google.adk.evaluation.eval_metrics import EvalStatus
from google.adk.evaluation.evaluator import EvaluationResult, PerInvocationResult

class ProfanityChecker:
  """A fake profanity checker that mimics an async API."""

  async def check(self, text: str) -> bool:
    """Returns True if profanity is detected, False otherwise."""
    await asyncio.sleep(0.01)
    return "profanity" in text.lower()

profanity_checker = ProfanityChecker()

async def check_for_profanity(
    eval_metric: EvalMetric,
    actual_invocations: list[Invocation],
    expected_invocations: Optional[list[Invocation]],
    conversation_scenario: Optional[ConversationScenario],
) -> EvaluationResult:
  """Checks if the agent response contains profanity using a fake async API."""
  per_invocation_results = []

  for invocation in actual_invocations:
    agent_response = "".join(part.text for part in invocation.final_response.parts)
    has_profanity = await profanity_checker.check(agent_response)
    score = 0.0 if has_profanity else 1.0
    eval_status = EvalStatus.FAILED if has_profanity else EvalStatus.PASSED

    invocation_result = PerInvocationResult(
        actual_invocation=invocation,
        score=score,
        eval_status=eval_status
    )
    per_invocation_results.append(invocation_result)

  scores = [
      result.score
      for result in per_invocation_results
      if result.eval_status != EvalStatus.NOT_EVALUATED
  ]

  average_score = statistics.mean(scores)

  threshold = eval_metric.criterion.threshold
  overall_eval_status = (
      EvalStatus.PASSED if average_score >= threshold else EvalStatus.FAILED
  )
  return EvaluationResult(
      overall_score=average_score,
      overall_eval_status=overall_eval_status,
      per_invocation_results=per_invocation_results,
  )
```

## 使用自定义指标 {#use-a-custom-metric}

要在 `adk eval` 的评估运行中使用自定义指标，你需要在 `EvalConfig` JSON 文件中指定它。

1. 将你的自定义指标添加为评估 `criteria` 的一部分。键是你的指标名称，值是通过阈值。
2. 向 `EvalConfig` 添加一个 `custom_metrics` 对象。在此对象中，为每个自定义指标添加一个条目，其中键是指标名称（与 `criteria` 中匹配），值是包含 `code_config` 的对象。
3. `code_config` 对象应包含一个 `name` 字段，其值为表示你自定义指标函数的 Python 导入路径的字符串，格式为 `my.module.my_function`。

### 示例 `EvalConfig` {#example-evalconfig}

假设你的 `check_final_response_exact_match` 函数定义在 `my_agent.metrics.py` 中，你的 `EvalConfig` 可能如下所示：

```json
{
  "criteria": {
    "my_check_final_response_exact_match": {
      "threshold": 0.8
    },
    "tool_trajectory_avg_score": {
      "threshold": 1.0
    }
  },
  "custom_metrics": {
    "my_check_final_response_exact_match": {
      "code_config": {
        "name": "my_agent.metrics.check_final_response_exact_match"
      }
    }
  }
}
```

通过这种配置，当你运行
`adk eval --config_file_path=<path_to_this_config>` 时，ADK 将为每个评估案例执行
`check_final_response_exact_match`，并检查返回的分数是否 >= 0.8 来标记 `my_check_final_response_exact_match` 标准是否通过。

### 提供指标信息 {#providing-metric-information}

你可以选择提供关于自定义指标的元数据，例如其描述和取值范围，通过在 `EvalConfig` 的自定义指标定义中添加 [`MetricInfo`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_metrics.py#L369) 对象。如果未提供 `metric_info`，ADK 将使用默认值（`min_value`=0.0，`max_value`=1.0）。

这些信息可被 ADK 工具用于显示和结果汇总。

以下是提供 `metric_info` 的示例，适用于返回分数在 -1.0 到 1.0 之间的自定义指标：

```json
{
  "criteria": {
    "my_metric": {
      "threshold": 0.5
    }
  },
  "custom_metrics": {
    "my_metric": {
      "code_config": {
        "name": "my_agent.metrics.my_metric_function"
      },
      "metric_info": {
        "metric_name": "my_metric",
        "description": "This metric evaluates XYZ and returns a score between -1.0 and 1.0.",
        "metric_value_info": {
          "interval": {
            "min_value": -1.0,
            "max_value": 1.0
          }
        }
      }
    }
  }
}
```

---

原文：[Custom Metrics](https://adk.dev/evaluate/custom_metrics/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/evaluate/custom_metrics.md)
