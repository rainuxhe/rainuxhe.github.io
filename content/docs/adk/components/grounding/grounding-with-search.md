---
title: "使用搜索进行基础支持"
description: "Agent Search 是 Agent Development Kit（Agent Development Kit, ADK）中的一个强大工具，使 AI Agent 能够访问您的私人企业文档和数据存储中的信息。通过将您的 Agent 连接到已索引的企业"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v0.1.0。

[Agent Search（官方英文）] ](https://adk.dev/integrations/agent-search/) 是一个功能强大的工具，用于 Agent Development Kit（ADK），它使 AI Agent 能够访问您的企业私有文档和数据存储库中的信息。通过将您的 Agent 连接到已索引的企业内容，您可以为用户提供基于组织知识库的答案。

此功能对于需要从内部文档、政策、研究论文或任何已在 [Agent Search](https://cloud.google.com/enterprise-search) 数据存储中索引的专有内容中获取信息的企业特定查询特别有价值。当您的 Agent 确定需要从知识库获取信息时，它会自动搜索已索引的文档，并在响应中正确引用结果。

## 准备 Agent Search {#preparing-agent-search}

在创建基础 Agent 之前，您必须已经有一个现有的 Agent Search 数据存储。如果没有，请按照 [开始使用自定义搜索](https://cloud.google.com/generative-ai-app-builder/docs/try-enterprise-search#unstructured-data) 的说明创建一个。您需要您的 `Data store ID`（例如 `projects/YOUR_PROJECT_ID/locations/global/collections/default_collection/dataStores/YOUR_DATASTORE_ID`）来配置 Agent。

## 身份验证设置 {#authentication-setup}

Agent Search 需要您的 ADK Agent 连接到 Google Cloud 项目的身份验证。使用此工具时，您不能使用 Google AI Studio 的 Gemini API Key。有关将 ADK Agent 连接到 Google Cloud 项目的更多信息，请参阅 [连接到 Google Cloud](/docs/adk/build/get-started/google-cloud/) 指南。

* 设置 [gcloud CLI](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#setup-local)
* 从终端通过运行 `gcloud auth login` 来认证 Google Cloud。
* 对于 Python，请打开 **`.env`** 文件并指定您的项目 ID 和位置。
* 对于 Java 和 Kotlin，请确保您的应用环境已配置 Google Cloud 默认凭据（`GOOGLE_APPLICATION_CREDENTIALS`），并在同一环境中设置以下变量，而不是在 `.env` 文件中设置。

```env title=".env"
GOOGLE_GENAI_USE_ENTERPRISE=TRUE
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=LOCATION
```

有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见
[连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/)(#)。

## 创建一个有根 Agent {#creating-a-grounded-agent}

要启用带搜索的基础功能，您需要在 Agent 定义中包含搜索工具，并提供 `data_store_id`。

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.agents import Agent
from google.adk.tools import VertexAiSearchTool

# 配置
DATASTORE_ID = "projects/YOUR_PROJECT_ID/locations/global/collections/default_collection/dataStores/YOUR_DATASTORE_ID"

root_agent = Agent(
    name="vertex_search_agent",
    model="gemini-flash-latest",
    instruction="Answer questions using Agent Search to find information from internal documents. Always cite sources when available.",
    description="Enterprise document search assistant with Agent Search capabilities",
    tools=[VertexAiSearchTool(data_store_id=DATASTORE_ID)]
)
```

{{% /tab %}}
{{< /tabs >}}

## 搜索接地原理 {#how-grounding-with-search-works}

搜索接地是将您的 Agent 与组织的索引文档和数据连接的过程，使其能够基于企业私有内容生成准确的响应。当用户的提示需要来自内部知识库的信息时，Agent 的底层大语言模型（LLM）会智能地决定调用 `VertexAiSearchTool` 从您的索引文档中查找相关事实。

### 数据流程图 {#data-flow-diagram}

此图展示了用户查询如何生成接地响应的逐步过程。

![搜索接地数据流程](/images/adk/grounding-with-search-data-flow.png)

### 详细说明 {#detailed-description}

接地 Agent 使用图中描述的数据流程来检索、处理并将企业信息纳入最终呈现给用户的答案中。

1. **用户查询**：最终用户通过提问关于内部文档或企业数据的问题与您的 Agent 交互。
2. **ADK 协同**：Agent Development Kit（Agent Development Kit）协调 Agent 的行为，并将用户的消息传递给 Agent 核心。
3. **LLM 分析与工具调用**：Agent 的 LLM（例如 Gemini 模型）分析提示内容。如果判断需要来自索引文档的信息，它会通过调用 `VertexAiSearchTool` 触发接地机制。这对于回答公司政策、技术文档或专有研究相关查询非常理想。
4. **Vertex AI 搜索服务交互**：`VertexAiSearchTool` 与您配置的 Agent 搜索数据存储交互，该存储包含索引好的企业文档。该服务针对您的私有内容构建并执行搜索查询。
5. **文档检索与排序**：Agent 搜索根据语义相似性和相关性评分，从数据存储中检索并排序最相关的文档片段。
6. **上下文注入**：搜索服务在生成最终响应之前，将检索到的文档片段整合到模型的上下文中。这一步至关重要，使模型能够基于组织的实际数据进行“推理”。
7. **生成接地响应**：LLM 在获取相关企业内容的情况下，生成包含从文档中检索信息的响应。
8. **带来源的响应呈现**：ADK 接收最终的接地响应，其中包括必要的源文档引用和 `groundingMetadata`，并将其呈现给用户并标注来源。这使最终用户能够对照企业来源验证信息。

## 理解搜索接地响应当 Agent 使用 Agent Search 进行响应落地时，它会返回详细信息，包括最终文本答案以及生成该答案所使用文档的元数据。这些元数据对于验证响应和为您的企业来源提供归属至关重要。 {#understanding-grounding-with-search-response}

### 落地响应示例 {#example-of-a-grounded-response}

以下示例显示了在针对企业文档进行落地查询后，模型返回的内容对象。

**最终答案文本：**

```text
"Developing models for a medical scribe presents several significant challenges, primarily due to the complex nature of medical documentation, the sensitive data involved, and the demanding requirements of clinical workflows. Key challenges include: **Accuracy and Reliability:** Medical documentation requires extremely high levels of accuracy, as errors can lead to misdiagnoses, incorrect treatments, and legal repercussions. Ensuring that AI models can reliably capture nuanced medical language, distinguish between subjective and objective information, and accurately transcribe physician-patient interactions is a major hurdle. **Natural Language Understanding (NLU) and Speech Recognition:** Medical conversations are often rapid, involve highly specialized jargon, acronyms, and abbreviations, and can be spoken by individuals with diverse accents or speech patterns... [response continues with detailed analysis of privacy, integration, and technical challenges]"
```

**基础元数据片段：**

```json
{
  "groundingMetadata": {
    "groundingChunks": [
      {
        "retrievedContext": {
          "title": "AI in Medical Scribing: Technical Challenges",
          "uri": "https://storage.googleapis.com/your-bucket/doc-medical-scribe-ai-tech-challenges.pdf",
          "documentName": "projects/your-project/locations/global/collections/default_collection/dataStores/your-datastore-id/branches/0/documents/doc-medical-scribe-ai-tech-challenges",
          "text": "Medical documentation requires extremely high levels of accuracy, as errors can lead to misdiagnoses..."
        }
      },
      {
        "retrievedContext": {
          "title": "Regulatory and Ethical Hurdles for AI in Healthcare",
          "uri": "https://storage.googleapis.com/your-bucket/doc-ai-healthcare-ethics.pdf",
          "documentName": "projects/your-project/locations/global/collections/default_collection/dataStores/your-datastore-id/branches/0/documents/doc-ai-healthcare-ethics",
          "text": "HIPAA compliance imposes strict requirements on how patient data may be stored and processed..."
        }
      }
    ],
    "groundingSupports": [
      {
        "groundingChunkIndices": [0, 1],
        "segment": {
          "endIndex": 637,
          "startIndex": 433,
          "text": "Ensuring that AI models can reliably capture nuanced medical language..."
        }
      }
    ],
    "retrievalQueries": [
      "challenges in natural language processing medical domain",
      "AI medical scribe challenges",
      "difficulties in developing AI for medical scribes"
    ]
  }
}
```

### 如何解读响应 {#how-to-interpret-the-response}

元数据提供了模型生成文本与支持该文本的企业文档之间的链接。以下是逐步解析：

- **groundingChunks**：这是模型参考的企业文档列表。从您的数据存储检索的每个片段都包含一个 `retrievedContext` 对象，该对象持有文档 `title`、其 `uri`，文档的完整 Agent 搜索资源名 `documentName`，以及被检索到的 `text`。
- **groundingSupports**：此列表将最终答案中的特定句子与 `groundingChunks` 联系起来。
- **segment**：该对象标识最终文本答案的特定部分，由其 `startIndex`、`endIndex` 和 `text` 本身定义。
- **groundingChunkIndices**：该数组包含与 `groundingChunks` 所列来源对应的索引号。例如，关于“HIPAA 合规性”的文本由索引为 1 的 `groundingChunks`（“监管和道德障碍”文档）提供支持。
- **retrievalQueries**：该数组显示了针对您的数据存储执行的具体搜索查询，以查找相关信息。

## 如何显示带有搜索支持的响应 {#how-to-display-responses-with-grounding-with-search}

与 Google 搜索支持不同，带搜索支持的 Grounding 不需要特定的显示组件。然而，显示引用和文档参考可以建立信任，并允许用户根据组织的权威来源验证信息。

### 可选引用显示 {#optional-citation-display}

由于提供了 Grounding 元数据，您可以根据应用需求选择实现引用显示：

**简单文本显示（最小实现）：**

{{< tabs tabTotal="1" >}}
{{% tab tabName="Python" %}}

```python
for event in events:
    if event.is_final_response() and event.content and event.content.parts:
        print(event.content.parts[0].text)

        # 可选：显示来源计数
        if event.grounding_metadata and event.grounding_metadata.grounding_chunks:
            print(f"\nBased on {len(event.grounding_metadata.grounding_chunks)} documents")
```

{{% /tab %}}
{{< /tabs >}}
**增强引用显示（可选）：** 您可以实现交互式引用，显示每个陈述由哪些文档支持。基础元数据提供了将文本片段映射到源文档所需的所有信息。

### 实施注意事项 {#implementation-considerations}

在实现带搜索显示的基础功能时：

1. **文档访问**：验证用户对引用文档的权限
2. **简单集成**：基本文本输出不需要额外的显示逻辑
3. **可选增强**：仅当用例需要来源归属时添加引用
4. **文档链接**：在需要时将文档 URI 转换为可访问的内部链接
5. **搜索查询**：`retrievalQueries` 数组显示了针对您的数据存储执行的搜索

---

原文：[Grounding with Search for agents](https://adk.dev/grounding/grounding_with_search/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/grounding/grounding_with_search.md)
