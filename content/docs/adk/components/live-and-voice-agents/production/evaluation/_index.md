---
title: "评估"
description: "你可以通过实际使用的方式来评估一个实时 Agent：模拟用户以音频形式说出其轮次，你的 Agent 在真实的双向会话中回答，然后你对它的回答进行评分。评估集、标准以及"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v2.6.0。

你可以以实际使用方式评估一个实时 Agent：模拟用户以音频形式说出自己的轮次，你的 Agent 通过真实的双向会话进行回答，然后你对它的回答进行评分。评估集、标准以及 `adk eval` 循环与您已经用于文本 Agent 的相同，详见 [Evaluate agents](/docs/adk/run/evaluation/)。

## 用语音驱动 Agent {#drive-the-agent-with-speech}

`llm_audio` 用户模拟器使用文本到语音模型合成每个模拟用户轮次，并将其作为音频流传输给你的 Agent。这会完整模拟用户的操作路径：语音输入、语音活动检测、轮次切换、语音输出、转录。向语音 Agent 提供文本会跳过所有这些步骤。

```json
{
  "user_simulator_config": {
    "type": "llm_audio",
    "model": "gemini-3.7-flash",
    "max_allowed_invocations": 10,
    "audio_model": "gemini-3.1-flash-tts-preview",
    "audio_model_configuration": {
      "response_modalities": ["AUDIO"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": { "voice_name": "Kore" }
        },
        "language_code": "en-US"
      }
    }
  }
}
```

这里有两个模型执行不同的任务。`model` 决定模拟用户接下来说什么，而 `audio_model` 将其转化为语音。更改 `voice_name` 和 `language_code` 是测试 Agent 在不同声音和口音下表现的方法，这是文本评估无法捕捉的回归情况。

你的评估案例保持不变。相同的对话场景或固定对话驱动文本运行或语音运行，所以你可以重用已有的测试套件。有关完整的架构、角色以及如何编写场景，请参见 [Audio user simulation](/docs/adk/run/evaluation/user-simulation/#audio-user-simulation-for-live-agents)。

## 使用评分标准评分 {#score-with-rubrics}

口语回答有多种不同的措辞，因此与参考字符串进行比较的标准会导致正确答案评判失败。基于评分标准的评审允许你用自然语言一次性写出意图，并将其应用于套件中的每个对话：

| 评判标准 | 分数 |
|---|---|
| [`rubric_based_final_response_quality_v1`](/docs/adk/run/evaluation/criteria/#rubric_based_final_response_quality_v1) | 单轮回复 |
| [`rubric_based_tool_use_quality_v1`](/docs/adk/run/evaluation/criteria/#rubric_based_tool_use_quality_v1) | 工具是否正确调用 |
| [`rubric_based_multi_turn_trajectory_quality_v1`](/docs/adk/run/evaluation/criteria/#rubric_based_multi_turn_trajectory_quality_v1) | 整段对话 |

```json
{
  "criteria": {
    "rubric_based_multi_turn_trajectory_quality_v1": {
      "threshold": 0.7,
      "judge_model_options": { "judge_model": "gemini-3.7-flash" },
      "rubrics": [
        {
          "rubric_id": "verifies_identity_first",
          "rubric_content": {
            "text_property": "Across the call, the agent confirms the caller's name and validates their date of birth before disclosing any appointment details."
          }
        }
      ]
    }
  }
}
```

使用[workflows](/docs/adk/components/live-and-voice-agents/building/workflows/)达到轨迹标准，其中重要的是 Agent 按顺序运行并且交接顺利，而不是任何单次交互的内容。当答案是真正固定的时，[`tool_trajectory_avg_score`](/docs/adk/run/evaluation/criteria/#tool_trajectory_avg_score)仍然检查工具调用的确切顺序，并完全忽略措辞。

## 进行评估 {#run-an-eval}

将`live_model_config`块添加到`test_config.json`中。这会将评估置于实时模式，并且对于[Live models](/docs/adk/components/live-and-voice-agents/supported-models/#live-models)是必需的，这些模型不是通过文本评估所使用的单一`generateContent`端点提供服务的。

```json
{
  "live_model_config": {
    "timeout_seconds": 300
  }
}
```

`timeout_seconds`（默认 300）限制了 ADK 等待一个回合完成的时间。如果你的 Agent 叙述较长的工具调用，可以提高这个值；如果希望更快地让卡住的会话失败，可以降低这个值。

```shell
adk eval path/to/your_agent \
  path/to/your_agent/live.evalset.json \
  --config_file_path path/to/your_agent/test_config.json
```

这需要评估额外组件 (`pip install "google-adk[eval]"`) 和 Live API 的凭证，以及 TTS 模型。相同的运行可以通过 `AgentEvaluator` 获取，这就是你在 CI 中放置语音评估的方法。

在 `adk web` 中，评估对话有一个 **标准 | 直播** 切换，可显示输入方式以及模拟用户的语音和语言。当运行结束时，ADK 会将音频重新组装成带有每轮可播放片段的文字记录，这样你就可以听到 Agent 的声音，而不仅仅是阅读它说了什么。

## 示例 {#sample}

[`workflow` sample](https://github.com/google/adk-python/tree/main/contributing/samples/live/workflow) 是一个完整的语音评估示例，你可以运行：在图形工作流中三个在线 Agent，中间有一次工具调用，以及一个评估集和 `test_config.json` 与所有三个评分标准连接起来。

---

原文：[Evaluation for live agents](https://adk.dev/live/evaluation/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/evaluation.md)
