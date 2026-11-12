---
title: "回调模式"
description: "回调为 Agent 生命周期提供了强大的钩子。以下是一些常见的设计模式，说明如何在 ADK 中有效利用它们，随后是实现的最佳实践。"
icon: "article"
weight: 20
toc: true
---

回调提供了对 Agent 生命周期的强大挂钩。以下是展示如何在 ADK 中有效利用回调的常见设计模式，以及实现的最佳实践。

## 设计模式 {#design-patterns}

这些模式展示了使用回调增强或控制 Agent 行为的典型方法：

### 1. 安全策略与策略执行 { #guardrails-policy-enforcement } {#1-guardrails--policy-enforcement--guardrails-policy-enforcement}

**模式概述：**
在请求到达 LLM 或工具之前拦截请求以执行规则。

**实现方法：**
- 使用 `before_model_callback` 检查 `LlmRequest` 提示
- 使用 `before_tool_callback` 检查工具参数
- 如果检测到策略违规（例如禁止主题、脏话）：
  - 返回预定义响应（`LlmResponse` 或 `dict`/`Map`）以阻止操作
  - 可选择更新 `context.state` 来记录违规

**示例用例：**
一个 `before_model_callback` 检查 `llm_request.contents` 是否包含敏感关键字，如果发现则返回标准“无法处理此请求”`LlmResponse`，从而阻止 LLM 调用。

### 2. 动态状态管理 { #dynamic-state-management } {#2-dynamic-state-management--dynamic-state-management}

**模式概述：**
在回调中读取和写入会话状态，使 Agent 行为具有上下文感知能力，并在步骤之间传递数据。

**实现方法：**
- 访问 `callback_context.state` 或 `tool_context.state`
- 修改（`state['key'] = value`）会在后续 `Event.actions.state_delta` 中自动跟踪
- `SessionService` 会持久化更改

**示例用例：**
一个 `after_tool_callback` 将工具结果中的 `transaction_id` 保存到 `tool_context.state['last_transaction_id']`。稍后的 `before_agent_callback` 可能读取 `state['user_tier']` 来定制 Agent 的问候语。

### 3. 日志记录与监控 { #logging-and-monitoring } {#3-logging-and-monitoring--logging-and-monitoring}

**模式概述：**
在特定生命周期点添加详细日志，以便观察和调试。

**实现方法：**
- 实现回调（例如 `before_agent_callback`、`after_tool_callback`、`after_model_callback`）
- 打印或发送包含如下内容的结构化日志：
  - Agent 名称
  - 工具名称
  - 调用 ID
  - 来自上下文或参数的相关数据

**示例用例：**
记录类似 `INFO: [Invocation: e-123] Before Tool: search_api - Args: {'query': 'ADK'}` 的消息。

### 4. 缓存 { #caching } {#4-caching--caching}

**模式概述：**
通过缓存结果避免重复的 LLM 调用或工具执行。

**实现步骤：**
1. **操作前：**在 `before_model_callback` 或 `before_tool_callback` 中：
   - 根据请求/参数生成缓存键
   - 在 `context.state`（或外部缓存）中检查此键
   - 如果找到，直接返回缓存的 `LlmResponse` 或结果

2. **操作后：**如果发生缓存未命中：
   - 使用相应的 `after_` 回调将新结果存储到缓存中，使用该键**示例用例：**
`before_tool_callback` 用于`get_stock_price(symbol)`检查 `state[f"cache:stock:{symbol}"]`。如果存在，返回缓存价格;否则，允许 API 调用，`after_tool_callback` 将结果保存到状态键中。

### 5.请求/响应修改 { #request-response-modification } {#5-requestresponse-modification--request-response-modification}

**图案概述：**
在数据发送到 LLM/工具之前或刚收到后修改数据。

**实施选项：**
- **`before_model_callback`：** 修改`llm_request`（例如，基于`state`添加系统指令）
- **`after_model_callback`：** 修改返回的`LlmResponse`（例如，格式化文本、过滤内容）
- **`before_tool_callback`：** 修改工具`args`字典（或 Java 中的 Map）
- **`after_tool_callback`：** 修改`tool_response`，即工具的原始返回值（或在Java中的映射）

**示例用例：**
`before_model_callback` `context.state['lang'] == 'es'` `llm_request.config.system_instruction`后会加上“用户语言偏好：西班牙语”。

### 6.步骤条件跳跃 { #conditional-跳跃步骤} {#6-conditional-skipping-of-steps--conditional-skipping-of-steps}

**图案概述：**
基于特定条件，防止标准操作（Agent 运行、LLM 调用、工具执行）。

**实现：**
- 从`before_`回调中返回一个值，跳过正常执行：
  - `Content` `before_agent_callback`
  - `LlmResponse`来自`before_model_callback`
  - `dict` `before_tool_callback`
- 框架将返回的值解释为该步骤的结果

**示例用例：**
`before_tool_callback`检查`tool_context.state['api_quota_exceeded']`。如果`True`，它会返回`{'error': 'API quota exceeded'}`，阻止实际的工具功能运行。

### 7.工具特定动作（认证与汇总控制） { #tool-特定动作-认证-摘要-控制 } {#7-tool-specific-actions-authentication--summarization-control--tool-specific-actions-authentication-summarization-control}

**图案概述：**
处理工具生命周期中特定的操作，主要是认证和控制工具结果的 LLM 汇总。

**实现：**
在工具回调中使用`ToolContext`（`before_tool_callback`，`after_tool_callback`）：

- **认证：** 如果需要凭证但未找到（例如通过`tool_context.get_auth_response`或状态检查），呼叫`before_tool_callback` `tool_context.request_credential(auth_config)`。这会启动认证流程。
- **摘要：** 设置`tool_context.actions.skip_summarization = True`工具的原始字典输出是否应返回 LLM 或直接显示，绕过默认 LLM 摘要步骤。

**示例用例：**
安全 API 的`before_tool_callback`会检查认证令牌处于状态;如果缺少，则调用`request_credential`。返回结构化JSON的工具`after_tool_callback`可能会设置`skip_summarization = True`。

### 8.Artifact 处理 { #artifact-处理 } {#8-artifact-handling--artifact-handling}

**图案概述：**
在 Agent 生命周期内保存或加载会话相关文件或大型数据块。**实现：**
- **保存：** 使用 S `await callback_context.save_artifact` / `await tool_context.save_artifact` 存储数据：
  - 生成报告
  - 日志
  - 中间数据
- **加载：** 使用 `await callback_context.load_artifact` / `await tool_context.load_artifact` 检索之前存储的文物
- **跟踪：** 变更通过`Event.actions.artifact_delta`跟踪

**示例用例：**
“generate_report”工具的`after_tool_callback`会用`await tool_context.save_artifact("report.pdf", report_part)`保存输出文件。`before_agent_callback`可能会用`await callback_context.load_artifact("agent_config.json")`加载配置 Artifact。

## 回电的最佳实践 {#best-practices-for-callbacks}

### 设计原则 {#design-principles}

**保持专注：**
每个回调设计时，应有明确的单一用途（例如，仅日志记录，仅用于验证）。避免单一回调。

**心灵表现：**
回调在 Agent 的处理循环中内联执行，循环等待每个回调结束。在 Python 中，当回调必须`await`某事时，声明回调`async def`，比如 `save_artifact`;ADK 等待它。无论哪种方式，避免长时间运行或阻塞操作，如网络调用或繁重计算。必要时卸载，但需注意这会增加复杂性。

### 错误处理 {#error-handling}

**优雅处理错误：**
- 在回调函数中使用`try...except/catch`块
- 适当记录错误
- 决定 Agent 调用应停止还是尝试恢复
- 不要让回调错误导致整个进程崩溃

### 州管理 {#state-management}

**谨慎管理状态：**
- 在阅读和写作时要有意识地阅读和写作`context.state`
- 变更在_current_调用中立即可见，并在事件处理结束时保持
- 使用特定的状态键，而非修改广泛的结构，以避免意外副作用
- 考虑使用状态前缀（`State.APP_PREFIX`、`State.USER_PREFIX`、`State.TEMP_PREFIX`）以求清晰，尤其是在持久`SessionService`实现时

### 可靠性 {#reliability}

**考虑幂性：**
如果回调执行的操作带有外部副作用（例如增加外部计数器），尽可能设计为幂等式（安全多次运行相同输入），以应对框架或应用中的潜在重试。

### 测试与文档 {#testing--documentation}

**彻底测试：**
- 使用模拟上下文对象对回调函数进行单元测试
- 执行集成测试，确保回调在完整的 Agent 流程中正常运行

**确保清晰：**
- 为回调函数使用描述性名称
- 添加明确的文档说明其用途、运行时间及任何副作用（尤其是状态修改）**请使用正确的上下文类型：**
使用你SDK文档中的上下文类型来表示你要实现的钩子。在 Python 中，统一的`Context`类型取代`CallbackContext`和`ToolContext`，因此新代码优先使用`Context`;旧名称保留以保证向后兼容，你可能在现有代码中仍会遇到。完整上下文类型请参见[Context objects](/docs/adk/components/agent-context/)。

通过应用这些模式和最佳实践，你可以有效地利用回调在 ADK 中创建更稳健、可观察且更定制的 Agent 行为。

---

原文：[Design Patterns and Best Practices for Callbacks](https://adk.dev/callbacks/design-patterns-and-best-practices/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/callbacks/design-patterns-and-best-practices.md)
