---
title: "谷歌搜索基础"
description: "谷歌搜索基础工具是 Agent Development Kit（ADK）中的一个强大功能，它可以将你的 AI Agent 直接连接到谷歌搜索。通过让你的 Agent 访问实时、权威的信息"
icon: "article"
weight: 10
toc: true
---

支持版本：Python v0.1.0。

[Google 搜索落地工具（官方英文）](https://adk.dev/integrations/google-search/) 是 Agent Development Kit（ADK）中的一个强大功能，它可以将您的 AI Agent 直接连接到 Google 搜索。通过为您的 Agent 提供来自网络的实时权威信息访问权限，它们可以回答关于近期事件、当前天气、股票价格或任何其他超出模型训练窗口的动态数据的问题。Agent 会自动决定何时进行搜索，并将结果无缝地结合到其响应中，同时提供适当的引用。

## 创建一个落地 Agent {#creating-a-grounded-agent}

要启用 Google 搜索落地功能，您需要在 Agent 定义中包含该搜索工具。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="google_search_agent",
    model="gemini-flash-latest",
    instruction="Answer questions using Google Search when needed. Always cite sources.",
    description="Professional search assistant with Google Search capabilities",
    tools=[google_search]
)
```

{{% /tab %}}
{{< /tabs >}}
## 使用 Google 搜索进行信息落地的工作原理 {#how-grounding-with-google-search-works}

信息落地是将你的 Agent 与来自网络的实时信息连接的过程，使其能够生成更准确、更新的回答。当用户的提示需要模型未经过训练的信息或时效性强的信息时，Agent 的底层大型语言模型会智能地决定调用 `google_search` 工具以查找相关事实。

### 数据流程图 {#data-flow-diagram}

该图展示了用户查询如何一步步生成落地回应的过程。

![Google 搜索落地数据流](/images/adk/google_search_grd_dataflow.png)

### 详细说明 {#detailed-description}

落地 Agent 使用图中描述的数据流程来检索、处理并将外部信息整合到最终呈现给用户的答案中。

1. **用户查询**：最终用户通过提问或下达指令与 Agent 交互。
2. **ADK 编排**：Agent Development Kit协调 Agent 行为，并将用户信息传递给 Agent 核心。
3. **LLM 分析与工具调用**：Agent 的 LLM（例如 Gemini 模型）分析提示语。如果判断需要外部、最新信息，它会通过调用 `google search` 工具触发落地机制。这对于回答近期新闻、天气或不在模型训练数据中的事实查询特别适用。
4. **落地服务交互**：`google search` 工具与内部落地服务交互，生成并发送一个或多个查询到 Google 搜索索引。
5. **上下文注入**：落地服务检索相关网页和摘要，然后在生成最终回答前将这些搜索结果整合到模型上下文中。这一步至关重要，使模型能够对真实、实时的数据进行“推理”。
6. **基于落地信息生成回答**：LLM 在最新搜索结果的辅助下，生成包含检索信息的回答。
7. **带来源的回答呈现**：ADK 接收最终落地回答，包括必要的来源 URL 和 `groundingMetadata`，并向用户展示。这样最终用户可以验证信息，并增强对 Agent 回答的信任。

### 理解错误响应和落地元数据 {#understanding-the-error-response-and-grounding-metadata}

当 Agent 使用 Google 搜索进行信息落地时，它会返回一套详细信息，不仅包含最终文本答案，还包含用于生成该答案的来源。这些元数据对于核实回答以及为原始来源提供引用极为关键。

#### 落地回答示例 {#example-of-a-grounded-response}
以下是模型在有基础查询后返回的内容对象示例。

**最终答案文本：**

```text
"Yes, Inter Miami won their last game in the FIFA Club World Cup. They defeated FC Porto 2-1 in their second group stage match. Their first game in the tournament was a 0-0 draw against Al Ahly FC. Inter Miami is scheduled to play their third group stage match against Palmeiras on Monday, June 23, 2025."
```

**基础元数据片段：**

```json
"groundingMetadata": {
  "groundingChunks": [
    { "web": { "title": "mlssoccer.com", "uri": "..." } },
    { "web": { "title": "intermiamicf.com", "uri": "..." } },
    { "web": { "title": "mlssoccer.com", "uri": "..." } }
  ],
  "groundingSupports": [
    {
      "groundingChunkIndices": [0, 1],
      "segment": {
        "startIndex": 65,
        "endIndex": 126,
        "text": "They defeated FC Porto 2-1 in their second group stage match."
      }
    },
    {
      "groundingChunkIndices": [1],
      "segment": {
        "startIndex": 127,
        "endIndex": 196,
        "text": "Their first game in the tournament was a 0-0 draw against Al Ahly FC."
      }
    },
    {
      "groundingChunkIndices": [0, 2],
      "segment": {
        "startIndex": 197,
        "endIndex": 303,
        "text": "Inter Miami is scheduled to play their third group stage match against Palmeiras on Monday, June 23, 2025."
      }
    }
  ],
  "searchEntryPoint": { ... }
}
```

#### 如何解读响应 {#how-to-interpret-the-response}

元数据提供了模型生成文本与支持该文本的来源之间的链接。以下是逐步的解析：

1. **groundingChunks**：这是模型参考的网页列表。每个块包含网页的标题和一个 `uri`，用于链接到来源。
2. **groundingSupports**：此列表将最终答案中的特定句子连接回 `groundingChunks`。
   * **segment**：此对象用于标识最终文本答案的特定部分，由其 `startIndex`、`endIndex` 以及文本本身定义。
   * **groundingChunkIndices**：此数组包含对应 `groundingChunks` 中列出的来源的索引号。例如，句子“他们以 2-1 战胜波尔图俱乐部……”由 `groundingChunks` 在索引 0 和 1 的信息支持。

### 如何使用 Google 搜索显示落地响应 {#how-to-display-grounding-responses-with-google-search}

使用落地功能的关键部分是正确显示信息，包括引用和搜索建议，以建立用户信任并允许用户验证信息。

#### 显示搜索建议 {#displaying-search-suggestions}

`searchEntryPoint` 对象在 `groundingMetadata` 中包含用于显示搜索查询建议的预格式化 HTML。这些通常以可点击的标签形式呈现，允许用户探索相关主题。

**来自 searchEntryPoint 渲染的 HTML：** 元数据提供了渲染搜索建议栏所需的 HTML 和 CSS，其中包括 Google 标志和相关查询的标签。将此 HTML 直接集成到应用程序前端即可按预期显示建议。

如需更多信息，请参阅 [Agent 平台文档中使用 Google 搜索建议 ](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-search-suggestions).

---

原文：[Google Search Grounding for agents](https://adk.dev/grounding/google_search_grounding/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/grounding/google_search_grounding.md)
