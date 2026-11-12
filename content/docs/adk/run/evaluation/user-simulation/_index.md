---
title: "用户模拟"
description: "在评估对话 Agent 时，使用固定的一组用户提示并不总是可行的，因为对话可能以意想不到的方式进行。例如，如果 Agent 需要用户提供两个值给 p"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v1.18.0。

在评估对话 Agent 时，使用固定的用户提示集并不总是实际的，因为对话可能会以意想不到的方式进行。例如，如果 Agent 需要用户提供两个值来执行任务，它可能会一次请求这些值中的一个，或者同时请求两个值。为了解决这个问题，ADK 可以使用生成式 AI 模型动态生成用户提示。

要使用此功能，您必须指定一个 [`ConversationScenario`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/conversation_scenarios.py)，该项规定了用户在与 Agent 对话中的目标。您还可以指定预期用户应遵循的用户角色。

一个 `ConversationScenario` 由以下组件组成：

* `starting_prompt`：用户应使用的固定初始提示，以开始与 Agent 的对话。
* `conversation_plan`：用户必须实现的目标的高级指南。
* `user_persona`：用户特征的定义，例如技术专长或语言风格。

以下是 [`hello_world`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) Agent 的示例对话场景：

```json
{
  "starting_prompt": "What can you do for me?",
  "conversation_plan": "Ask the agent to roll a 20-sided die. After you get the result, ask the agent to check if it is prime."
}
```

该大型语言模型使用 `conversation_plan` 以及对话历史来动态生成用户提示。

您还可以通过以下方式指定预先构建的 `user_persona`：

```json
{
  "starting_prompt": "What can you do for me?",
  "conversation_plan": "Ask the agent to roll a 20-sided die. After you get the result, ask the agent to check if it is prime.",
  "user_persona": "NOVICE"
}
```

虽然对话计划规定了必须完成的内容，但用户角色决定了模型如何措辞其查询以及如何回应 Agent 的回复。

## 用户角色 {#user-personas}

支持版本：Python v1.26.0。

用户角色是模拟用户在对话中扮演的角色。它由一组**行为**定义，这些行为决定了用户如何与 Agent 互动，例如其交流风格、提供信息的方式以及对错误的反应。

一个 `UserPersona` 包含以下字段：

* `id`：角色的唯一标识符。
* `description`：用户的高级描述以及他们如何与 Agent 互动。
* `behaviors`：`UserBehavior` 对象列表，用于定义具体特征。

每个 `UserBehavior` 包括：

* `name`：行为名称。
* `description`：预期行为的摘要。
* `behavior_instructions`：给模拟用户（LLM）的具体操作说明。
* `violation_rubrics`：供评估者判断用户是否遵循此行为使用。如果**任何**这些评估标准被**满足**，评估者应判断行为**未被遵循**。

## 预设角色 {#pre-built-personas}

ADK 提供了一组由常见行为组成的预设角色。下表总结了每个角色的行为：

| 行为 | **专家** 角色 | **新手** 角色 | **评估者** 角色 |
| :--- | :--- | :--- | :--- |
| **提前提供信息** | 注重细节（主动提供详细信息） | 以目标为导向（等待被询问细节） | 注重细节 |
| **回答问题** | 仅相关问题 | 回答所有问题 | 仅相关问题 |
| **纠正 Agent 错误** | 是 | 否 | 否 |
| **排查 Agent 错误** | 一次 | 从不 | 从不 |
| **语气** | 专业 | 轻松对话风格 | 轻松对话风格 |

## 示例：使用对话场景评估 [`hello_world`](https://github.com/google/adk-python/tree/main/contributing/samples/core/hello_world) Agent {#example-evaluate-the-helloworldhttpsgithubcomgoogleadk-pythontreemaincontributingsamplescorehelloworld-agent-with-conversation-scenarios}

要向新的或现有的 [`EvalSet`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_set.py) ] 添加包含对话场景的评估用例，您首先需要创建一个用于测试 Agent 的对话场景列表。

尝试将以下内容保存到 `contributing/samples/core/hello_world/conversation_scenarios.json`：

```json
{
  "scenarios": [
    {
      "starting_prompt": "What can you do for me?",
      "conversation_plan": "Ask the agent to roll a 20-sided die. After you get the result, ask the agent to check if it is prime.",
      "user_persona": "NOVICE"
    },
    {
      "starting_prompt": "Hi, I'm running a tabletop RPG in which prime numbers are bad!",
      "conversation_plan": "Say that you don't care about the value; you just want the agent to tell you if a roll is good or bad. Once the agent agrees, ask it to roll a 6-sided die. Finally, ask the agent to do the same with 2 20-sided dice.",
      "user_persona": "EXPERT"
    }
  ]
}
```

你还需要一个会话输入文件，其中包含在评估过程中使用的信息。
尝试将以下内容保存到
`contributing/samples/core/hello_world/session_input.json`：

```json
{
  "app_name": "hello_world",
  "user_id": "user"
}
```

然后，您可以将对话场景添加到 `EvalSet`：

```bash
# (optional) create a new EvalSet
adk eval_set create \
  contributing/samples/core/hello_world \
  eval_set_with_scenarios

# add conversation scenarios to the EvalSet as new eval cases
adk eval_set add_eval_case \
  contributing/samples/core/hello_world \
  eval_set_with_scenarios \
  --scenarios_file contributing/samples/core/hello_world/conversation_scenarios.json \
  --session_input_file contributing/samples/core/hello_world/session_input.json
```

默认情况下，ADK 使用需要指定 Agent 预期响应的指标来运行评估。由于动态对话场景不符合这一条件，我们将使用一个[`EvalConfig`](https://github.com/google/adk-python/blob/main/src/google/adk/evaluation/eval_config.py)，并配合一些其他支持的指标。试着将以下内容保存到 `contributing/samples/core/hello_world/eval_config.json`：

```json
{
  "criteria": {
    "hallucinations_v1": {
      "threshold": 0.5,
      "evaluate_intermediate_nl_responses": true
    },
    "safety_v1": {
      "threshold": 0.8
    }
  }
}
```

最后，你可以使用 `adk eval` 命令来运行评估：

```bash
adk eval \
    contributing/samples/core/hello_world \
    --config_file_path contributing/samples/core/hello_world/eval_config.json \
    eval_set_with_scenarios \
    --print_detailed_results
```

## 用户模拟器配置 {#user-simulator-configuration}

您可以覆盖默认的用户模拟器配置，以更改模型、内部模型行为以及用户 Agent 交互的最大次数。以下 `EvalConfig` 显示了默认的用户模拟器配置：

```json
{
  "criteria": {
    # same as before
  },
  "user_simulator_config": {
    "model": "gemini-flash-latest",
    "model_configuration": {
      "thinking_config": {
        "include_thoughts": true,
        "thinking_budget": 10240
      }
    },
    "max_allowed_invocations": 20,
    "include_function_calls": false
  }
}
```

* `model`：支持用户模拟器的模型。
* `model_configuration`：一个
    [`GenerateContentConfig`](https://github.com/googleapis/python-genai/blob/6196b1b4251007e33661bb5d7dc27bafee3feefe/google/genai/types.py#L4295)
    用于控制模型行为。
* `max_allowed_invocations`：允许的最大用户 Agent 交互次数
    在对话被强制终止之前。此值应设置为大于你在
    `EvalSet` 中合理的最长用户 Agent 交互次数。初始固定提示被计为一次调用。将此
    值设置为 `-1` 将移除交互限制，不建议这样做。
* `include_function_calls`：可选。是否在提供给用户模拟器的对话历史提示中包含函数调用和响应。
    默认为 `false`。
* `custom_instructions`：可选。覆盖用户模拟器的默认指令。指令字符串必须包含以下格式占位符，使用
    [Jinja](https://jinja.palletsprojects.com/en/stable/templates/#) 语法 (*不要提前替换值！*)]：
    * `{{ stop_signal }}`：当用户模拟器决定对话结束时要生成的文本。
    * `{{ conversation_plan }}`：用户模拟器必须遵循的整个对话计划。
    * `{{ conversation_history }}`：到目前为止用户和 Agent 之间的对话。
    * 你还可以通过 `{{ persona }}` 占位符访问 `UserPersona` 对象。

## 自定义角色 {#custom-personas}

你可以通过在 `ConversationScenario` 中提供一个 `UserPersona` 对象来定义你自己的自定义角色。

自定义角色定义示例：

```json
{
  "starting_prompt": "I need help with my account.",
  "conversation_plan": "Ask the agent to reset your password.",
  "user_persona": {
    "id": "IMPATIENT_USER",
    "description": "A user who is in a rush and gets easily frustrated.",
    "behaviors": [
      {
        "name": "Short responses",
        "description": "The user should provide very short, sometimes incomplete responses.",
        "behavior_instructions": [
            "Keep your responses under 10 words.",
            "Omit polite phrases."
        ],
        "violation_rubrics": [
            "The user response is over 10 words.",
            "The user response is overly polite."
        ]
      }
    ]
  }
}
```

## 通过用户模拟生成评估案例 {#generate-evaluation-cases-via-user-simulation}

手动编写评估案例可能耗时，而且可能无法涵盖所有潜在的失败模式。ADK 提供了一个命令，可以使用 Agent Platform Eval SDK 根据您的 Agent 定义自动生成多样且真实的对话场景。

{{% alert context="warning" %}}
**前提条件：Agent 平台凭据**

生成评估案例使用 [Vertex Gen AI Evaluation Service API]](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)。您必须拥有启用了 Agent 平台 API 的 Google Cloud 项目，并在环境中配置了有效的应用默认凭据（ADC）。
{{% /alert %}}
### 命令语法 {#command-syntax}

```bash
adk eval_set generate_eval_cases \
    <AGENT_MODULE_FILE_PATH> \
    <EVAL_SET_ID> \
    --user_simulation_config_file=<PATH_TO_CONFIG_FILE>
```

### 配置文件格式 {#configuration-file-format}

`--user_simulation_config_file` 期望一个符合 `ConversationGenerationConfig` 模式的 JSON 文件：

```json
{
  "count": 5,
  "generation_instruction": "Generate scenarios where the user asks to control home devices under different conditions.",
  "environment_context": "Available devices: device_1 (Light), device_2 (Thermostat).",
  "model_name": "gemini-flash-latest"
}
```

### 配置字段 {#configuration-fields}

*   **`count`**（必填）：要生成的对话场景数量。
*   **`generation_instruction`**（可选）：自然语言提示，用于指导你想要测试的特定类型的场景或目标。
*   **`environment_context`**（可选）：描述 Agent 工具可访问的后端数据或状态的上下文。这有助于生成器创建基于真实数据的查询（例如，有效的设备 ID）。
*   **`model_name`**（必填）：用于生成的 Gemini 模型（例如 `gemini-flash-latest`）。

## 现场智能客服的音频用户模拟 {#audio-user-simulation-for-live-agents}

用户模拟器独立于被测试的 Agent 是否为实时（语音）Agent，因此相同的 `ConversationScenario`（或固定对话）可以驱动文本和实时评估。对于实时 Agent，模拟用户的轮次可以合成为**音频**并流式传输给 Agent。

这通过你评估配置中的 `llm_audio` 用户模拟器进行配置（`test_config.json`）。它封装了标准文本模拟器，并使用语音合成模型将每个生成的用户轮次转换为音频。默认情况下，它使用 Google Cloud Text-to-Speech（`cloud_tts`）；也可以使用 Gemini TTS 模型名称。

```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,
    "response_match_score": 0.5
  },
  "live_model_config": {
    "timeout_seconds": 300
  },
  "user_simulator_config": {
    "type": "llm_audio",
    "model": "gemini-2.5-flash",
    "audio_model": "cloud_tts",
    "audio_model_configuration": {
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": { "voice_name": "en-US-Studio-O" }
        },
        "language_code": "en-US"
      }
    },
    "include_text_with_audio": true
  }
}
```

关键字段：

* `type`：`"llm_audio"` 选择音频用户模拟器。
* `audio_model`：`"cloud_tts"` 用于 Google Cloud 文本转语音（Text-to-Speech），或 Gemini TTS 模型名称（例如 `"gemini-2.5-flash-preview-tts"`）。
* `audio_model_configuration.speech_config`：选择语音和语言。
* `include_text_with_audio`：用户回合是否同时携带文本部分以及生成的音频。

{{% alert context="info" %}}
**实时模型需要实时推理**

评估实时 Agent 需要实时（双向流）推理，这不是默认设置。通过在配置文件中添加 `live_model_config` 块来启用它。实时 API 模型（例如 `gemini-*-live-*`）不会通过非实时评估使用的一元 `generateContent` 端点提供服务，因此在没有实时模式的情况下运行它们会失败。

`use_live` 是从 `live_model_config` 设置的内部字段；将其放入配置文件没有效果。

使用 `cloud_tts` 需要 `google-cloud-texttospeech` 软件包（包含在 `google-adk[eval]` 扩展中）并访问 Cloud 文本转语音 API。
{{% /alert %}}
请参阅示例
[`contributing/samples/live/non_blocking_tool_agent`](https://github.com/google/adk-python/tree/main/contributing/samples/live/non_blocking_tool_agent)，以获取完整的、可运行的实时评估配置。

---

原文：[User simulation](https://adk.dev/evaluate/user-sim/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/evaluate/user-sim.md)
