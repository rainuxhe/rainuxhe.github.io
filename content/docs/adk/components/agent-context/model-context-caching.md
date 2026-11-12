---
title: "模型上下文缓存"
description: "在使用 Agent 完成任务时，您可能希望在多个 Agent 请求之间重用扩展指令或大量数据。对于每个 Agent 请求重新发送这些数据会很慢，i"
icon: "article"
weight: 70
toc: true
---

支持版本：Python v1.15.0。

在使用 Agent 完成任务时，您可能希望在多个 Agent 请求生成式 AI 模型时重复使用扩展指令或大量数据。每次 Agent 请求都重新发送这些数据会很慢、效率低下，并且可能成本高昂。在生成式 AI 模型中使用上下文缓存功能可以显著加快响应速度并减少每次请求发送到模型的令牌数量。

ADK 上下文缓存功能允许您将请求数据缓存到支持此功能的生成式 AI 模型中，包括 Gemini 2.0 及更高版本模型。本文档解释了如何配置和使用此功能。

## 配置上下文缓存 {#configure-context-caching}

您可以在包装 Agent 的 ADK `App` 对象级别配置上下文缓存功能。使用 `ContextCacheConfig` 类配置这些设置，如以下代码示例所示：

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk import Agent
from google.adk.apps.app import App
from google.adk.agents.context_cache_config import ContextCacheConfig

root_agent = Agent(
  name='my_caching_agent',
  # 使用 Gemini 2.0 或更高版本配置 Agent
)

# 创建具有上下文缓存配置的应用程序
app = App(
    name='my-caching-agent-app',
    root_agent=root_agent,
    context_cache_config=ContextCacheConfig(
        min_tokens=2048,    # Minimum tokens to trigger caching
        ttl_seconds=600,    # Store for up to 10 minutes
        cache_intervals=5,  # Refresh after 5 uses
    ),
)
```

{{% /tab %}}
{{< /tabs >}}

## 配置设置 {#configuration-settings}

`ContextCacheConfig` 类具有以下设置，用于控制你的 Agent 的缓存工作方式。当你配置这些设置时，它们会应用于应用中的所有 Agent。

-   **`min_tokens`** (int)：启用缓存所需的请求中最小 token 数量。此设置允许你避免在非常小的请求上进行缓存的开销，因为性能提升甚微。默认值为 `0`。
-   **`ttl_seconds`** (int)：缓存的生存时间（TTL），以秒为单位。该设置决定了缓存内容在刷新前存储的时间。默认值为 `1800`（30 分钟）。
-   **`cache_intervals`** (int)：同一缓存内容在过期前可使用的最大次数。此设置允许你控制即使 TTL 尚未到期，缓存更新的频率。默认值为 `10`。
-   **`create_http_options`** (HttpOptions)：缓存创建调用的 HTTP 选项，允许你设置超时时间。如果调用超时，调用失败且请求将不使用缓存继续进行。可用于 Python 和 Kotlin；默认值为空。

## 检查缓存是否正在使用 {#check-whether-the-cache-is-being-used}

当前 Python/Go 版本暂不支持此功能。

启用缓存时，由 LLM 响应支持的事件可以携带 `CacheMetadata` 来报告缓存对该调用所做的事情。当缓存被禁用或调用没有产生缓存信息时，它为 null，因此在读取前请检查它。存在时它有两种状态：**活跃缓存**，`cacheName`、`expireTime` 和 `invocationsUsed` 都被设置；以及 **仅指纹** 状态，三者均为 null。

> 官方此示例仅提供 kotlin 版本；本套文档仅保留 Python 和 Go 示例。

`expireSoon` 表示缓存将在约两分钟内过期，或已过期。这是为你自己的代码提供的信号，而非 ADK 执行的操作：ADK 会一直重用缓存，直到其实际超过 `expireTime`、已运行过 `cacheIntervals` 或其缓存前缀发生变化。

Token 数量不在 `CacheMetadata` 上；请从 `LlmResponse.usageMetadata` 获取。

## 下一步 {#next-steps}

如需完整实现上下文缓存功能的使用和测试，请参阅以下示例：

-   [`cache_analysis`](https://github.com/google/adk-python/tree/main/contributing/samples/context_management/cache_analysis)：
    一个代码示例，演示如何分析上下文缓存的性能。

如果你的使用场景需要在整个会话中提供指令，请考虑为 Agent 使用 `static_instruction` 参数，它允许你修改生成模型的系统指令。更多详情，请参阅此示例代码：-   [`static_instruction`](https://github.com/google/adk-python/tree/main/contributing/samples/context_management/static_instruction)：
    使用静态指令实现的数字宠物 Agent。

---

原文：[Context caching with Gemini](https://adk.dev/context/caching/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/context/caching.md)
