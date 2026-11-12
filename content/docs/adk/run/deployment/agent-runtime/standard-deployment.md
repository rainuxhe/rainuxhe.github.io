---
title: "标准部署"
description: "在 ADK Python Go v1.2.0 中受支持"
icon: "article"
weight: 10
toc: true
---

支持版本：Python, Go v1.2.0。

本部署流程描述了如何将 ADKAgent 代码标准化部署到 Google Cloud [Agent Runtime](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)。
如果您已有现有的 Google Cloud项目，并希望谨慎管理将 ADKAgent 部署到 Agent Runtime环境，应遵循此部署路径。这些说明使用Cloud Console、gcloud命令行界面以及 ADK 命令行界面（ADK CLI）。建议已经熟悉配置 Google Cloud项目的用户以及准备进行生产部署的用户使用此路径。

这些说明描述了如何将 ADK 项目部署到 Google Cloud Agent Runtime环境，包括以下阶段：

* [设置 Google Cloud项目](#setup-cloud-project)
* [准备 Agent 项目文件夹](#define-your-agent)
* [部署 Agent](#deploy-agent)

## 设置 Google Cloud项目 {#setup-cloud-project}

要将 Agent 部署到 Agent Runtime，您需要一个 Google Cloud项目：

1. **登录 Google Cloud**：
    * 如果您是**现有用户**：
        * 通过 [https://console.cloud.google.com](https://console.cloud.google.com) 登录
        * 如果您之前使用的免费试用期已过期，可能需要升级到 [付费计费账户](https://docs.cloud.google.com/free/docs/free-cloud-features#how-to-upgrade)。
    * 如果您是**新用户**：
        * 可以注册 [免费试用计划](https://docs.cloud.google.com/free/docs/free-cloud-features)。
          免费试用提供$300欢迎信用额度，可在91天内用于各种 [Google Cloud产品](https://docs.cloud.google.com/free/docs/free-cloud-features#during-free-trial)，且不会产生费用。在免费试用期间，您还可使用 [Google Cloud免费套餐](https://docs.cloud.google.com/free/docs/free-cloud-features#free-tier)，该套餐允许对指定产品的免费使用达到每月限制，并可使用特定产品的免费试用。

2. **创建 Google Cloud项目**
    * 如果您已有现有 Google Cloud项目，可以继续使用，但请注意此过程可能会向项目中添加新的服务。
    * 如果希望创建新的 Google Cloud项目，可以在 [创建项目](https://console.cloud.google.com/projectcreate) 页面上创建。

3. **获取您的 Google Cloud项目ID**
    * 您需要获取 Google Cloud项目ID，可在GCP首页找到。请务必记下项目ID（字母数字加连字符），_而不是_ 项目编号（数字）。

    ![Google Cloud项目ID](/images/adk/project-id.png)

4. **在项目中启用 Agent 平台**
    * 要使用 Agent Runtime，您需要 [启用 Agent 平台 API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)。点击“启用”按钮以启用 API。启用后，应显示“API 已启用”。5. **在您的项目中启用云资源管理器 API**
    * 要使用 Agent 运行时，您需要[启用云资源管理器 API](https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview)。点击“启用”按钮以启用该 API。启用后，应显示“API 已启用”。

## 设置您的编码环境 {#prerequisites-coding-env}

既然您已经准备好了 Google Cloud 项目，可以返回到您的编码环境。这些步骤需要在您的编码环境中访问终端以运行命令行指令。

### 使用 Google Cloud 认证您的编码环境 {#authenticate-your-coding-environment-with-google-cloud}

*   您需要认证您的编码环境，以便您和您的代码可以与 Google Cloud 进行交互。为此，您需要 gcloud CLI。
    如果您从未使用过 gcloud CLI，您需要先[下载并安装它](https://docs.cloud.google.com/sdk/docs/install-sdk)，然后再继续下面的步骤。

*   在终端中运行以下命令，以用户身份访问您的 Google Cloud 项目：

    ```shell
    gcloud auth login
    ```

    认证后，你应该会看到消息
    `You are now authenticated with the gcloud CLI!`。

*   运行以下命令以验证你的代码，使其能够与
    Google Cloud 一起使用：

    ```shell
    gcloud auth application-default login
    ```

    认证后，您应该会看到消息
    `You are now authenticated with the gcloud CLI!`。

*   （可选）如果您需要在 gcloud 中设置或更改默认项目，您可以使用：

    ```shell
    gcloud config set project MY-PROJECT-ID
    ```

### 定义您的 Agent {#define-your-agent}

在准备好您的 Google Cloud 和编码环境后，您就可以部署您的 Agent 了。
说明假设您已经有一个 Agent 项目文件夹，例如：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
multi_tool_agent/
├── .env
├── __init__.py
└── agent.py
```

有关项目文件和格式的更多详细信息，请参阅
[multi_tool_agent](https://github.com/google/adk-docs/tree/main/examples/python/snippets/get-started/multi_tool_agent)
代码示例。
{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
multi_tool_agent/
├── go.mod
├── go.sum
└── main.go
```

您的 `main.go` 必须使用 `google.golang.org/adk/v2/cmd/launcher/agentengine` 包中的启动器来运行您的 Agent，而不是 `full.NewLauncher()`，并传递来自 `GOOGLE_CLOUD_AGENT_ENGINE_ID` 环境变量的 Agent 运行时资源 ID：

```go
import "google.golang.org/adk/v2/cmd/launcher/agentengine"

// ...

l := agentengine.NewLauncher(os.Getenv("GOOGLE_CLOUD_AGENT_ENGINE_ID"))
if err = l.Execute(ctx, config, os.Args[1:]); err != nil {
    log.Fatalf("Run failed: %v\n\n%s", err, l.CommandLineSyntax())
}
```

有关完整示例，请参见
[examples/agentengine](https://github.com/google/adk-go/tree/v2.5.0/examples/agentengine)
在 ADK Go 仓库中。
{{% /tab %}}
{{< /tabs >}}

## 部署 Agent {#deploy-agent}

您可以使用 `adk deploy` 命令行工具从终端进行部署。此过程会将您的代码打包，构建为容器，并部署到托管的 Agent 运行时服务中。此过程可能需要几分钟时间。

以下示例部署命令使用 `multi_tool_agent` 示例代码作为要部署的项目：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
PROJECT_ID=my-project-id
LOCATION_ID=us-central1

adk deploy agent_engine \
        --project=$PROJECT_ID \
        --region=$LOCATION_ID \
        --display_name="My First Agent" \
        multi_tool_agent
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
PROJECT_ID=my-project-id
LOCATION_ID=us-central1

adkgo deploy agentengine \
    -e ./main.go \
    -s "multi_tool_agent" \
    -p $PROJECT_ID \
    -r $LOCATION_ID \
    -d .
```

{{% /tab %}}
{{< /tabs >}}
对于 `region`，您可以在 [Agent Builder 位置页面](https://docs.cloud.google.com/agent-builder/locations#supported-regions-agent-engine) 上找到支持的地区列表。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

要了解 `adk deploy agent_engine` 命令的 CLI 选项，请参阅 [ADK CLI Reference（官方英文）](https://adk.dev/api-reference/cli/#adk-deploy-agent-engine)。
{{% /tab %}}
{{% tab tabName="Go" %}}

要了解 `adkgo deploy agentengine` 命令的 CLI 选项，您可以运行 `adkgo help deploy agentengine`，它将显示可用选项。最重要的有:

```shell
-e, --entry_point_path string   Path to an entry point (go 'main')
-s, --name string               Agent Engine name
-p, --project_name string       GCP Project Name
-r, --region string             GCP Region
-d, --source_dir string         Directory to archive, defaults to current working directory
    --agent_engine_id string    ID of the Agent Engine instance to update if it exists
```

要重新部署到现有的 Agent 运行时实例而不是创建新的实例，请将其 `RESOURCE_ID` 与 `--agent_engine_id` 一起传递。
{{% /tab %}}
{{< /tabs >}}

### 部署命令输出 {#deploy-command-output}

一旦成功部署，您应该会看到以下输出：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```shell
Creating AgentEngine
Create AgentEngine backing LRO: projects/123456789/locations/us-central1/reasoningEngines/751619551677906944/operations/2356952072064073728
View progress and logs at https://console.cloud.google.com/logs/query?project=hopeful-sunset-478017-q0
AgentEngine created. Resource name: projects/123456789/locations/us-central1/reasoningEngines/751619551677906944
To use this AgentEngine in another session:
agent_engine = vertexai.agent_engines.get('projects/123456789/locations/us-central1/reasoningEngines/751619551677906944')
Cleaning up the temp folder: /var/folders/k5/pv70z5m92s30k0n7hfkxszfr00mz24/T/agent_engine_deploy_src/20251219_134245
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```shell
Computing flags & preparing temp : Starting

...

    >  [Deployed Reasoning Engine: projects/887748635400/locations/us-central1/reasoningEngines/751619551677906944]
    >  [Display Name: simpleText]

Deploying to Agent Engine : Finished successfully
Cleaning temp : Starting
    >  [Clean temp starting with /tmp/agentEngine_20260424_141040__2470352066]

Cleaning temp : Finished successfully
```

{{% /tab %}}
{{< /tabs >}}
请注意，您现在有一个 `RESOURCE_ID`，其中您的 Agent 已部署（在上面的示例中为 `751619551677906944`）。您需要这个 ID 号码以及其他值才能在 Agent Runtime 上使用您的 Agent。

## 在 Agent Runtime 上使用 Agent {#using-an-agent-on-agent-runtime}

完成 ADK 项目的部署后，您可以使用 Agent Platform SDK、Python requests 库或 REST API 客户端来查询 Agent。本节介绍了与 Agent 交互所需的信息以及如何构建 URL 以访问 Agent 的 REST API。

要在 Agent Runtime 上与您的 Agent 交互，您需要以下内容：

* **PROJECT_ID**（示例：“my-project-id”），您可以在您的 [项目详情页](https://console.cloud.google.com/iam-admin/settings) 找到
* **LOCATION_ID**（示例：“us-central1”），用于部署您的 Agent
* **RESOURCE_ID**（示例：“751619551677906944”），您可以在 [Agent Runtime UI](https://console.cloud.google.com/vertex-ai/agents/agent-engines) 找到

查询 URL 的结构如下：

```shell
https://$(LOCATION_ID)-aiplatform.googleapis.com/v1/projects/$(PROJECT_ID)/locations/$(LOCATION_ID)/reasoningEngines/$(RESOURCE_ID):query
```

您可以使用此 URL 结构向您的 Agent 发出请求。有关如何发出请求的更多信息，请参阅 Agent 运行时文档中的说明 [使用 Agent Development Kit agent](https://docs.cloud.google.com/agent-builder/agent-engine/use/adk#rest-api)。
您还可以查看 Agent 运行时文档，以了解如何管理您部署的 Agent [deployed agent](https://docs.cloud.google.com/agent-builder/agent-engine/manage/overview)。
有关测试和与已部署 Agent 交互的更多信息，请参阅 [在 Agent 运行时测试已部署的 Agent](/docs/adk/run/deployment/agent-runtime/test-deployed-agents/)。

### 监控和验证 {#monitoring-and-verification}

* 您可以在 Google Cloud 控制台中的 [Agent 运行时 UI](https://console.cloud.google.com/vertex-ai/agents/agent-engines) 监控部署状态。
* 欲了解更多详细信息，您可以访问 Agent 运行时文档，了解 [部署 Agent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/deploy) 和 [管理已部署 Agent](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/manage/overview)。

## 测试已部署的 Agent {#test-deployed-agents}

在完成 ADK Agent 的部署后，您应在其新的托管环境中测试工作流。有关测试部署到 Agent 运行时的 ADK Agent 的更多信息，请参阅 [在 Agent 运行时测试已部署的 Agent](/docs/adk/run/deployment/agent-runtime/test-deployed-agents/)。

---

原文：[Deploy to Agent Runtime](https://adk.dev/deploy/agent-runtime/deploy/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/agent-runtime/deploy.md)
