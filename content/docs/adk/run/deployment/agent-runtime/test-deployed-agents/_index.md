---
title: "测试已部署的 Agent"
description: "在 ADK Python Go v1.2.0 中受支持"
icon: "article"
weight: 30
toc: true
---

支持版本：Python, Go v1.2.0。

这些说明解释了如何测试部署到 [Agent Runtime](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) 运行时环境中的 ADK Agent。在使用这些说明之前，您需要已通过 [可用方法](/docs/adk/run/deployment/agent-runtime/) 将您的 Agent 部署到 Agent 运行时环境。本指南将向您展示如何通过 Google Cloud Console 查看、交互和测试已部署的 Agent，以及如何使用 REST API 调用或 Python 的 Agent 平台 SDK 与 Agent 进行交互。

## 在 Cloud Console 中查看已部署 Agent {#view-deployed-agent-in-cloud-console}

要在 Cloud Console 中查看已部署的 Agent：

-   导航到 Google Cloud Console 中的 Agent Runtime 页面：[https://console.cloud.google.com/vertex-ai/agents/agent-engines](https://console.cloud.google.com/vertex-ai/agents/agent-engines)

此页面列出了您当前选定的 Google Cloud 项目中的所有已部署 Agent。如果未看到您的 Agent，请确保在 Google Cloud Console 中选择了目标项目。有关选择现有 Google Cloud 项目的更多信息，请参阅 [创建和管理项目](https://cloud.google.com/resource-manager/docs/creating-managing-projects#identifying_projects)。

## 查找 Google Cloud 项目信息 {#find-google-cloud-project-information}

要测试部署，您需要项目的地址和资源识别信息 (`PROJECT_ID`, `LOCATION_ID`, `RESOURCE_ID`)。您可以使用 Cloud Console 或 `gcloud` 命令行工具查找此信息。

<details>
<summary> Agent 平台快速模式 API 密钥 </summary>

如果您使用 Agent 平台快速模式，可以跳过此步骤并使用您的 API 密钥。

</details>

使用 Google Cloud Console 查找项目信息：

1.  在 Google Cloud Console 中，导航到 Agent Runtime 页面：[https://console.cloud.google.com/vertex-ai/agents/agent-engines](https://console.cloud.google.com/vertex-ai/agents/agent-engines)

2.  选择您要查看的实例。

3.  在页面顶部选择 **复制查询 URL**，其格式应为：

        https://$(LOCATION_ID)-aiplatform.googleapis.com/v1/projects/$(PROJECT_ID)/locations/$(LOCATION_ID)/reasoningEngines/$(RESOURCE_ID):query

使用 `gcloud` 命令行工具查找项目信息：

1.  在您的开发环境中，确保已通过 Google Cloud 进行身份验证，然后运行以下命令列出您的项目：

    ```shell
    gcloud projects list
    ```

1. 使用您部署时使用的项目ID，运行此命令以获取更多详细信息：

    ```shell
    gcloud asset search-all-resources \
        --scope=projects/$(PROJECT_ID) \
        --asset-types='aiplatform.googleapis.com/ReasoningEngine' \
        --format="table(name,assetType,location,reasoning_engine_id)"
    ```

## 使用 REST 调用进行测试 {#test-using-rest-calls}

与在 Agent Runtime 中部署的 Agent 交互的一种简单方法是使用 `curl` 工具进行 REST 调用。本节描述如何检查与 Agent 的连接，以及如何测试部署 Agent 对请求的处理。

### 检查与 Agent 的连接 {#check-connection-to-agent}

你可以使用 Cloud Console 中 Agent Runtime 部分提供的 **Query URL** 来检查与正在运行 Agent 的连接。此检查不会执行已部署的 Agent，但会返回有关该 Agent 的信息。

要发送 REST 调用并从已部署的 Agent 获取响应：

- 在开发环境的终端窗口中，构建一个请求并执行它：

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Google Cloud Project" %}}

    ```shell
    curl -X GET \
        -H "Authorization: Bearer $(gcloud auth print-access-token)" \
        "https://$(LOCATION_ID)-aiplatform.googleapis.com/v1/projects/$(PROJECT_ID)/locations/$(LOCATION_ID)/reasoningEngines"
    ```

    {{% /tab %}}
    {{% tab tabName="Agent Platform express mode" %}}

    ```shell
    curl -X GET \
        -H "x-goog-api-key:YOUR-EXPRESS-MODE-API-KEY" \
        "https://aiplatform.googleapis.com/v1/reasoningEngines"
    ```

    {{% /tab %}}
    {{< /tabs >}}
如果您的部署成功，此请求将返回有效请求列表和预期的数据格式。

{{% alert context="success" %}}
**删除连接 URL 的 `:query` 参数**

如果您使用云控制台 Agent Runtime 部分提供的 **Query URL**，请确保从地址末尾删除 `:query` 参数。
{{% /alert %}}
{{% alert context="success" %}}
**Agent 连接访问**

此连接测试要求调用用户拥有已部署 Agent 的有效访问令牌。在其他环境中测试时，请确保调用用户有权连接到您 Google Cloud 项目中的 Agent。
{{% /alert %}}
### 发送 Agent 请求 {#send-an-agent-request}

在从您的 Agent 项目获取响应时，必须先创建会话，接收会话 ID，然后使用该会话 ID 发送请求。此流程在以下说明中描述。

通过 REST 测试与已部署 Agent 的交互：

1.  在开发环境的终端窗口中，使用此模板构建请求以创建会话：

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Google Cloud Project" %}}

    ```shell
    curl \
        -H "Authorization: Bearer $(gcloud auth print-access-token)" \
        -H "Content-Type: application/json" \
        https://$(LOCATION_ID)-aiplatform.googleapis.com/v1/projects/$(PROJECT_ID)/locations/$(LOCATION_ID)/reasoningEngines/$(RESOURCE_ID):query \
        -d '{"class_method": "async_create_session", "input": {"user_id": "u_123"},}'
    ```

    {{% /tab %}}
    {{% tab tabName="Agent Platform express mode" %}}

    ```shell
    curl \
        -H "x-goog-api-key:YOUR-EXPRESS-MODE-API-KEY" \
        -H "Content-Type: application/json" \
        https://aiplatform.googleapis.com/v1/reasoningEngines/$(RESOURCE_ID):query \
        -d '{"class_method": "async_create_session", "input": {"user_id": "u_123"},}'
    ```

    {{% /tab %}}
    {{< /tabs >}}
1. 在前一个命令的响应中，从 **id** 字段中提取创建的 **会话 ID**：

    ```json
    {
        "output": {
            "userId": "u_123",
            "lastUpdateTime": 1757690426.337745,
            "state": {},
            "id": "4857885913439920384", # Session ID
            "appName": "9888888855577777776",
            "events": []
        }
    }
    ```

1. 在开发环境的终端窗口中，通过使用本模板和上一步创建的会话ID构建请求，向您的 Agent 发送消息：

    {{< tabs tabTotal="2" >}}
    {{% tab tabName="Google Cloud Project" %}}

    ```shell
    curl \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    https://$(LOCATION_ID)-aiplatform.googleapis.com/v1/projects/$(PROJECT_ID)/locations/$(LOCATION_ID)/reasoningEngines/$(RESOURCE_ID):streamQuery?alt=sse -d '{
    "class_method": "async_stream_query",
    "input": {
        "user_id": "u_123",
        "session_id": "4857885913439920384",
        "message": "Hey whats the weather in new york today?",
    }
    }'
    ```

    {{% /tab %}}
    {{% tab tabName="Agent Platform express mode" %}}

    ```shell
    curl \
    -H "x-goog-api-key:YOUR-EXPRESS-MODE-API-KEY" \
    -H "Content-Type: application/json" \
    https://aiplatform.googleapis.com/v1/reasoningEngines/$(RESOURCE_ID):streamQuery?alt=sse -d '{
    "class_method": "async_stream_query",
    "input": {
        "user_id": "u_123",
        "session_id": "4857885913439920384",
        "message": "Hey whats the weather in new york today?",
    }
    }'
    ```

{{% /tab %}}
{{< /tabs >}}
该请求应生成来自您已部署的 Agent 代码的 JSON 格式响应。有关使用 REST 调用在 Agent 运行时与已部署的 ADK Agent 进行交互的更多信息，请参阅
[管理已部署的 Agent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/manage/overview#console)
和
[使用 Agent Development KitAgent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/adk)
在 Agent 运行时文档中。

## 使用 Python 进行测试 {#test-using-python}

您可以使用 Python 代码对在 Agent 运行时部署的 Agent 进行更复杂且可重复的测试。这些说明描述了如何创建与已部署 Agent 的会话，然后向 Agent 发送请求进行处理。

### 创建远程会话 {#create-a-remote-session}

使用 `remote_app` 对象创建到已部署远程 Agent 的连接：

```py
# 如果您在一个新脚本中或使用 ADK CLI 部署，您可以这样连接：
# remote_app = agent_engines.get("your-agent-resource-name")
remote_session = await remote_app.async_create_session(user_id="u_456")
print(remote_session)
```

`create_session`（远程）的预期输出：

```console
{'events': [],
'user_id': 'u_456',
'state': {},
'id': '7543472750996750336',
'app_name': '7917477678498709504',
'last_update_time': 1743683353.030133}
```

`id` 值是会话 ID，`app_name` 是在 Agent 运行时部署的 Agent 的资源 ID。

#### 向远程 Agent 发送查询 {#send-queries-to-your-remote-agent}

```py
async for event in remote_app.async_stream_query(
    user_id="u_456",
    session_id=remote_session["id"],
    message="whats the weather in new york",
):
    print(event)
```

`async_stream_query`（远程）的预期输出：

```console
{'parts': [{'function_call': {'id': 'af-f1906423-a531-4ecf-a1ef-723b05e85321', 'args': {'city': 'new york'}, 'name': 'get_weather'}}], 'role': 'model'}
{'parts': [{'function_response': {'id': 'af-f1906423-a531-4ecf-a1ef-723b05e85321', 'name': 'get_weather', 'response': {'status': 'success', 'report': 'The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit).'}}}], 'role': 'user'}
{'parts': [{'text': 'The weather in New York is sunny with a temperature of 25 degrees Celsius (41 degrees Fahrenheit).'}], 'role': 'model'}
```

有关在 Agent Runtime中与已部署的 ADKAgent 交互的更多信息，请参阅
[管理已部署的 Agent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/manage/overview) 和
[使用 Agent Development KitAgent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/adk)
在 Agent Runtime文档中。

### 发送多模态查询 {#sending-multimodal-queries}

要向您的 Agent 发送多模态查询（例如，包括图像），您可以使用由`async_stream_query`构建的`message`参数，其中包含`types.Part`对象的列表。每个部分可以是文本或图像。

要包含图像，您可以使用`types.Part.from_uri`，提供图像的 Google Cloud Storage (GCS) URI。

```python
from google.genai import types

image_part = types.Part.from_uri(
    file_uri="gs://cloud-samples-data/generative-ai/image/scones.jpg",
    mime_type="image/jpeg",
)
text_part = types.Part.from_text(
    text="What is in this image?",
)

async for event in remote_app.async_stream_query(
    user_id="u_456",
    session_id=remote_session["id"],
    message=[text_part, image_part],
):
    print(event)
```

{{% alert context="info" %}}
虽然与模型的底层通信可能涉及图像的 Base64 编码，但向在 Agent Runtime 上部署的 Agent 发送图像数据的推荐和支持的方法是提供 GCS URI。
{{% /alert %}}
## 清理部署 {#clean-up-deployments}

如果您进行了测试性部署，完成后清理您的云资源是一个好习惯。您可以删除已部署的 Agent Runtime 实例，以避免对您的 Google Cloud 账户产生任何意外费用。

```python
remote_app.delete(force=True)
```

`force=True` 参数还会删除从已部署的 Agent 生成的任何子资源，例如会话。您还可以通过 Google Cloud 上的 [Agent Runtime UI](https://console.cloud.google.com/vertex-ai/agents/agent-engines) 删除已部署的 Agent。

---

原文：[Test deployed agents in Agent Runtime](https://adk.dev/deploy/agent-runtime/test/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/agent-runtime/test.md)
