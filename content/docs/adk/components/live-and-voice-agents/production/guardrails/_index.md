---
title: "护栏"
description: "护栏管理现场语音 Agent 在生产环境中的行为，保持对话主题相关、符合政策并且安全。在实时连接中，音频会连续传输，模型会实时开始发言。ADK 提供"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v2.8.0。

Guardrails 管理实时语音 Agent 在生产环境中的行为，保持对话主题明确、符合策略且安全。在实时连接中，音频会持续流式传输，模型会实时开始说话。ADK 提供多层保护，这些保护协同工作，在对话延迟影响有限的情况下确保对话安全。

有关一般回调机制和插件注册，请参阅 [Types of callbacks](/docs/adk/components/app-management/callbacks/types-of-callbacks/) 和 [Plugins](/docs/adk/components/app-management/plugins/)。

## Guardrail 层 {#guardrail-layers}

| 层 | 功能 | 保护重点 | 延迟影响 |
| :--- | :--- | :--- | :--- |
| 系统指令 | 形成语气、对话规则和界限 | 行为指导 | 不增加应用延迟 |
| 安全设置 | 执行平台内容安全阈值 | 平台安全过滤 | 不增加应用延迟 |
| 输入验证 | 检查提示注入和禁止主题 | 用户输入验证 | 极小（每轮运行） |
| 响应验证 | 根据业务策略筛选 Agent 响应 | Agent 响应验证 | 取决于检查 |
| 工具护栏 | 拦截工具执行并验证参数 | 工具执行安全 | 极小（每次工具调用运行） |

这些层协同工作，以提供深度防御。系统指令塑造自然的对话流程，平台安全过滤执行基础的伤害界限，应用验证器独立验证输入、响应和工具调用。将明确的指令与独立验证结合，可以确保如果某一层漏过了边缘情况，另一层能够捕获它。

## 指令和安全设置 {#instructions-and-safety-settings}

指令和安全设置为整个会话建立基线行为。两个设置都属于 Agent，在创建会话时进行配置：

```python
from google.adk.agents import Agent
from google.genai import types

root_agent = Agent(
    model='gemini-live-2.5-flash-native-audio',
    name='support_agent',
    instruction=(
        'You help customers with billing questions. '
        'Never quote a price; offer to transfer to sales instead. '
        'Never discuss a competitor.'
    ),
    generate_content_config=types.GenerateContentConfig(
        safety_settings=[
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
        ]
    ),
)
```

该模型会在每一轮对话中评估系统指令，随着对话上下文的积累。当为实时 Agent 设计指令时，应按顺序定义角色、对话规则和对话护栏。对于严格的约束，需要明确给出在触及边界时的处理规则，例如提供替代方案或转接呼叫者。

安全设置适用于实时会话。当模型生成内容超过配置的阈值时，平台会终止生成。

实时连接在启动时会建立这些设置，因此在会话期间保持不变。会话状态插入的指令字符串在会话开始时渲染一次，恢复连接时会重复使用该渲染的指令。

## 对话验证 {#conversation-validation}

对话验证独立评估用户的发言以及 Agent 的回应。对于受管理的企业策略，Model Armor 插件会根据 Google Cloud 模板筛查提示注入、敏感数据和策略违规。你也可以使用 ADK 模型回调实现自定义验证。

### 用户输入验证 {#user-input-validation}

`before_model_callback` 钩子会拦截用户输入。回调会在文本到达模型之前评估输入，因此阻止操作可以在保持连接开的情况下防止消息进入上下文。对于语音音频，回调会检查已经转录的发言内容，这时模型已接收到音频；此处的阻止会重启实时会话以放弃已经传输的回复。

当检查识别出策略违规时，返回 `LlmResponse` 会用安全的备用响应替换用户的发言：

```python
from typing import Optional

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

def block_input(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> Optional[LlmResponse]:
  """Blocks a user turn that mentions a competitor."""
  text = ''.join(
      part.text or ''
      for content in llm_request.contents
      for part in content.parts or []
  )

  if 'competitor' not in text.lower():
    return None

  return LlmResponse(
      content=types.Content(
          role='model',
          parts=[types.Part(text="I can't discuss that.")],
      )
  )
```

### Agent 响应验证 {#agent-response-validation}

`after_model_callback` 钩子在向用户提供响应之前或过程中验证模型响应。验证可以在语音回合过程中实时检查转录，以便及早发现违规行为，也可以评估完整回合的转录内容。

```python
def block_output(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> Optional[LlmResponse]:
  """Replaces the response when the answer quotes a price."""
  transcription = llm_response.output_transcription
  text = transcription.text if transcription else ''

  if '$' not in text:
    return None

  return LlmResponse(
      content=types.Content(
          role='model',
          parts=[types.Part(text='Let me connect you with sales.')],
      )
  )
```

从输出回调立即返回 `LlmResponse` 会立即停止模型生成，并将您的替换消息传递给用户。对于模型已经开始处理输入的语音轮次，ADK 会清除当前轮次，以避免拒绝的内容保留在对话上下文中。在 [级联架构](/docs/adk/components/live-and-voice-agents/architectures/cascade/#custom-speech-transforms)(https://example.com) 中，您还可以在语音合成运行之前过滤或编辑流式文本。

## 工具防护措施 {#tool-guardrails}

工具回调保护外部系统并验证操作。`before_tool_callback` 钩子在工具执行之前检查参数，使您可以拒绝未经授权的参数或执行业务逻辑。`after_tool_callback` 钩子在结果返回模型之前编辑敏感信息：

```python
from typing import Any, Optional

from google.adk.tools import BaseTool
from google.adk.tools import ToolContext

def validate_refund(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
) -> Optional[dict[str, Any]]:
  """Prevents unauthorized refunds above a threshold."""
  if tool.name == 'issue_refund' and args.get('amount', 0) > 100:
    return {'error': 'Refund exceeds automatic approval limit.'}
  return None
```

从工具回调返回结果会绕过工具执行，并将返回值直接提供给模型。请参见［工具执行回调](/docs/adk/components/app-management/callbacks/types-of-callbacks/#tool-execution-callbacks)］。

实时音频流无法暂停等待互动式人工确认。当实时 Agent 使用需要提升权限的工具时，应在回调中自动验证参数或将请求转交给人工处理。

## 要求和最佳实践 {#requirements-and-best-practices}

- **确保转录保持激活**：基于文本的对话验证依赖语音转录。`RunConfig.input_audio_transcription`和`RunConfig.output_audio_transcription`默认启用。将任一设置为`None`会禁用相应的筛查层。
- **保持验证器轻量化**：实时接收循环中的回调与音频处理同步运行。快速的本地检查可以保持对话的响应性。对于较重的检查，应评估完整的回合转录或将长时间运行的分析异步外包。
- **在 Agent 间应用策略**：注册插件例如［Model Armor（官方英文）](https://adk.dev/integrations/model-armor/)］在`App`上应用一致的安全规则，适用于应用程序中的每个 Agent，而无需重复编写回调代码。

## 其他资源 {#additional-resources}

- [Model Armor 插件（官方英文）](https://adk.dev/integrations/model-armor/)
- [回调类型](/docs/adk/components/app-management/callbacks/types-of-callbacks/)
- [插件](/docs/adk/components/app-management/plugins/)
- [配置安全过滤器](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/configure-safety-filters)

---

原文：[Guardrails for live agents](https://adk.dev/live/guardrails/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/live/guardrails.md)
