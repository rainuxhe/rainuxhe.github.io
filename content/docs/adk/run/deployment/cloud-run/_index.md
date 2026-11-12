---
title: "Cloud Run"
description: "Cloud Run 是一个完全托管的平台，使您能够直接在谷歌可扩展的基础设施上运行您的代码。"
icon: "play_circle"
weight: 20
toc: true
---

支持版本：Python, Go。

[Cloud Run](https://cloud.google.com/run)
是一个完全托管的平台，使您能够直接在 Google 的可扩展基础设施上运行代码。

要部署您的 Agent，您可以使用 `adk deploy cloud_run` 命令（_推荐用于 Python_），或者通过 Cloud Run 使用 `gcloud run deploy` 命令。

## Agent 示例 {#agent-sample}

对于每个命令，我们将引用在 [LLM agent](/docs/adk/build/agents/simple-agents/) 页面定义的 `Capital Agent` 示例。我们假设它在一个目录中（例如：`capital_agent`）。

要继续，请确认您的 Agent 代码配置如下：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

1. Agent 代码位于 Agent 目录中的一个名为 `agent.py` 的文件中。
2. 您的 Agent 变量名为 `root_agent`。
3. `__init__.py` 位于您的 Agent 目录中，并且包含 `from . import agent`。
4. 您的 `requirements.txt` 文件存在于 Agent 目录中。
{{% /tab %}}
{{% tab tabName="Go" %}}

1. 您应用的入口点（main 包和 main() 函数）在一个单独的 Go 文件中。使用 main.go 是一个强烈推荐的惯例。
2. 您的 Agent 实例被传递给启动器配置，通常使用 agent.NewSingleLoader(yourAgent)。adkgo 工具使用此启动器以正确的服务启动您的 Agent。
3. 您的 go.mod 和 go.sum 文件存在于项目目录中以管理依赖项。

有关更多详细信息，请参阅以下部分。您还可以在 GitHub 仓库中找到 [示例应用](https://github.com/google/adk-docs/tree/main/examples/go/cloud-run)。
{{% /tab %}}
{{< /tabs >}}
## 环境变量 {#environment-variables}

按照 [安装和设置](/docs/adk/build/get-started/installation/) 指南中描述的方式设置您的环境变量。

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1 # Or your preferred location
export GOOGLE_GENAI_USE_ENTERPRISE=True
```

有关从 ADK Agent 连接到 Google Cloud 的更多信息，请参见 [连接到 Google Cloud 和 Agent 平台](/docs/adk/build/get-started/google-cloud/)。

## 前提条件 {#prerequisites}

您应该拥有一个 Google Cloud 项目。您需要知道您的：

  1. 项目名称，例如：“my-project”
  2. 项目位置，例如：“us-central1”
  3. 服务账户，例如：“1234567890-compute@developer.gserviceaccount.com”
  4. GOOGLE_API_KEY

您还必须安装 Google Cloud CLI (`gcloud`)。

## 密钥 {#secret}

确保您已创建一个服务账户可以读取的密钥。

### Cloud Build 权限 {#cloud-build-permissions}

由于 `adk deploy` 命令使用 Google Cloud Build 来自动化构建过程，您必须设置您的默认计算服务账户具有使用 Cloud Build 的权限。
以下命令示例显示了如何授予此权限：

```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"
```

### GOOGLE_API_KEY 密钥条目 {#entry-for-googleapikey-secret}

您可以手动创建您的密钥或使用命令行接口：

```bash
echo "<<put your GOOGLE_API_KEY here>>" | gcloud secrets create GOOGLE_API_KEY --project=my-project --data-file=-
```

### 读取权限 {#permissions-to-read}
您应该为您的服务账户授予适当的权限以读取此密钥。

```bash
gcloud secrets add-iam-policy-binding GOOGLE_API_KEY --member="serviceAccount:1234567890-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=my-project
```

## 部署负载 {#payload}

当您将 ADK Agent 工作流部署到 Google Cloud Run 时，以下内容会上传到服务：

- 您的 ADK Agent 代码
- 您的 ADK Agent 代码中声明的任何依赖项
- 您的 Agent 使用的 ADK API 服务器代码版本

默认部署*不*包含 ADK Web 用户界面库，除非您在部署设置中指定，例如 `--with_ui` 选项用于 `adk deploy cloud_run` 命令。

## 部署命令 {#deployment-commands}

{{< tabs tabTotal="3" >}}
{{% tab tabName="Python - adk CLI" %}}

### adk CLI {#test-your-agent}

`adk deploy cloud_run` 命令将您的 Agent 代码部署到 Google Cloud Run。

确保您已通过 Google Cloud 进行身份验证：`gcloud auth login` 和 `gcloud config set project <your-project-id>`。

#### 设置环境变量

可选但推荐：设置环境变量可以使部署命令更简洁。

```bash
# Set your Google Cloud Project ID
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"

# Set your desired Google Cloud Location
export GOOGLE_CLOUD_LOCATION="us-central1" # Example location

# Set the path to your agent code directory
export AGENT_PATH="./capital_agent" # Assuming capital_agent is in the current directory

# Set a name for your Cloud Run service (optional)
export SERVICE_NAME="capital-agent-service"

# Set an application name (optional)
export APP_NAME="capital_agent_app"
```

#### 命令使用

##### 最小命令

```bash
adk deploy cloud_run \
--project=$GOOGLE_CLOUD_PROJECT \
--region=$GOOGLE_CLOUD_LOCATION \
$AGENT_PATH
```

##### 带可选标志的完整命令

```bash
adk deploy cloud_run \
--project=$GOOGLE_CLOUD_PROJECT \
--region=$GOOGLE_CLOUD_LOCATION \
--service_name=$SERVICE_NAME \
--app_name=$APP_NAME \
--with_ui \
$AGENT_PATH
```

##### 论点

* `AGENT_PATH`：（必填）指定包含 Agent 源代码目录路径的位置参数，例如：`$AGENT_PATH` 或 `capital_agent/`。该目录至少包含一个`__init__.py`和你的主 Agent 文件，例如：`agent.py`。

##### 期权

* `--project TEXT`：（必填）您的 Google Cloud项目ID，例如：`$GOOGLE_CLOUD_PROJECT`。
* `--region TEXT`：（必填）部署时的 Google Cloud位置，例如：`$GOOGLE_CLOUD_LOCATION`、`us-central1`。
* `--allow_origins`：（可选）CORS（跨原点共享）的逗号分隔原点列表。为了实现正则表达式模式，原点前置`regex`。例如：`http://localhost:8000,regex:https://.*\.example\.com`。
* `--service_name TEXT`：（可选）云运行服务的名称，例如：`$SERVICE_NAME`，默认为`adk-default-service-name`。
* `--app_name TEXT`：（可选）ADK API 服务器的应用程序名称，例如：`$APP_NAME`。默认使用 `AGENT_PATH` 指定的目录名，例如：`capital_agent` 如果 `AGENT_PATH` 是 `./capital_agent`。
* `--session_service_uri TEXT`：（可选）会话服务的URI。如果你通过 Agent 运行时使用托管会话服务，请传递`agentengine://<agent_engine>`，其中`<agent_engine>`是资源ID或完整的`projects/*/locations/*/reasoningEngines/*`资源名称。其他支持的表单包括`memory://`和任何SQLAlchemy数据库URL，例如：`sqlite://<path>`。
* `--artifact_service_uri TEXT`：（可选）Artifact 服务的URI，例如：云存储、`file://<path>`或`memory://`的`gs://<bucket_name>`。
* `--memory_service_uri TEXT`：（可选）内存服务的URI，例如：`rag://<rag_corpus_id>`、`agentengine://<agent_engine>`或`memory://`。
* `--port INTEGER`：（可选）ADK API 服务器在容器内监听的端口号。默认为8000端口。
* `--with_ui`：（可选）如果包含，将 ADK 开发界面与 Agent API 服务器一同部署。默认情况下，仅部署 API 服务器。
* `--with_cloud_run_sandbox`：（可选）启用云运行沙盒进行代码执行。默认禁用。启用时，ADK 使用`gcloud beta run deploy`与 `--sandbox-launcher`。
* `--temp_folder TEXT`：（可选）指定一个目录用于存储部署过程中生成的中间文件。默认为系统临时目录中的带时间戳文件夹。*（注：除非有排查问题，否则通常不需要此选项）。*
* `--help`：显示帮助信息并退出。当未设置`--session_service_uri`和 `--artifact_service_uri`时，部署的容器会退回到内存会话和 Artifact 服务，且每当 Cloud Run 实例被回收时，会话和 Artifact 都会丢失。为任何必须保留这些数据的部署设置这两个选项。

##### 传递gcloud的CLI参数

要通过`adk deploy cloud_run`命令传递特定的gcloud标志，请在 ADK 参数后使用双破折号分隔符（`--`）。`--`之后的任何标志（除 ADK 管理的）都会直接传递给底层的gcloud命令。

###### 语法示例：

```bash
adk deploy cloud_run [ADK_FLAGS] -- [GCLOUD_FLAGS]
```

###### 示例：

```bash
adk deploy cloud_run --project=[PROJECT_ID] --region=[REGION] path/to/my_agent    -- --no-allow-unauthenticated --min-instances=2
```

##### 认证访问
在部署过程中，您可能会看到提示：`Allow unauthenticated invocations to [your-service-name] (y/N)?`。

* 输入 `y` 以允许对您的 Agent API 端点进行无认证的公共访问。
* 输入 `N`（或按 Enter 使用默认选项）以要求认证，例如：使用“测试您的 Agent”部分中所示的身份令牌。

命令执行成功后，会将您的 Agent 部署到 Cloud Run 并提供已部署服务的 URL。
{{% /tab %}}
{{% tab tabName="Python - gcloud CLI" %}}

### 用于 Python 的 gcloud CLI

或者，您可以使用标准的 `gcloud run deploy` 命令和 `Dockerfile` 来部署。这种方法相比 `adk` 命令需要更多手动设置，但提供了灵活性，特别是当您想将 Agent 嵌入自定义 [FastAPI](https://fastapi.tiangolo.com/) 应用时。

确保您已经完成 Google Cloud 的认证（`gcloud auth login` 和 `gcloud config set project <your-project-id>`）。

#### 项目结构

按如下方式组织您的项目文件：

```txt
your-project-directory/
├── capital_agent/
│   ├── __init__.py
│   └── agent.py       # Your agent code (see "Agent sample" tab)
├── main.py            # FastAPI application entry point
├── requirements.txt   # Python dependencies
└── Dockerfile         # Container build instructions
```

在 `your-project-directory/` 的根目录中创建以下文件（`main.py`、`requirements.txt`、`Dockerfile`）。

#### 代码文件

1. 该文件使用来自 ADK 的 `get_fast_api_app()` 设置 FastAPI 应用程序：

    ```python title="main.py"
    import os

    import uvicorn
    from fastapi import FastAPI
    from google.adk.cli.fast_api import get_fast_api_app

    # 获取 main.py 所在的目录
    AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
    # 示例会话服务 URI，例如 SQLite
    # 注意：请使用 'sqlite aiosqlite' 而不是 'sqlite'，因为 DatabaseSessionService 需要异步驱动
    SESSION_SERVICE_URI = "sqlite+aiosqlite:///./sessions.db"
    # 示例 CORS 允许的源
    ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]
    # 如果打算提供 Web 界面，请设置 web=True，否则设置为 False
    SERVE_WEB_INTERFACE = True

    # 调用该函数以获取 FastAPI 应用实例
    # 确保 Agent 目录名称（'capital_agent'）与您的 Agent 文件夹匹配
    app: FastAPI = get_fast_api_app(
        agents_dir=AGENT_DIR,
        session_service_uri=SESSION_SERVICE_URI,
        allow_origins=ALLOWED_ORIGINS,
        web=SERVE_WEB_INTERFACE,
    )

    # 如果需要，您可以在下面添加更多 FastAPI 路由或配置
    # 示例：
    # @app.get("/hello")
    # async def read_root():
    #     return {"Hello": "World"}

    if __name__ == "__main__":
        # 使用 Cloud Run 提供的 PORT 环境变量，默认为 8080
        uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
    ```

    *注意：我们将 `agent_dir` 指定到 `main.py` 所在的目录，并使用 `os.environ.get("PORT", 8080)` 以兼容 Cloud Run。*

2. 列出所需的 Python 包：

    ```txt title="requirements.txt"
    google-adk
    # Add any other dependencies your agent needs
    ```

3. 定义容器镜像：

    ```dockerfile title="Dockerfile"
    FROM python:3.13-slim
    WORKDIR /app

    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    RUN adduser --disabled-password --gecos "" myuser && \
        chown -R myuser:myuser /app

    COPY . .

    USER myuser

    ENV PATH="/home/myuser/.local/bin:$PATH"

    CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
    ```

#### 定义多个 Agent

您可以通过在 `your-project-directory/` 的根目录中创建单独的文件夹，在同一个 Cloud Run 实例中定义和部署多个 Agent。每个文件夹代表一个 Agent，并且必须在其配置中定义一个 `root_agent`。

示例结构：

```txt
your-project-directory/
├── capital_agent/
│   ├── __init__.py
│   └── agent.py       # contains `root_agent` definition
├── population_agent/
│   ├── __init__.py
│   └── agent.py       # contains `root_agent` definition
└── ...
```

#### 使用 `gcloud` 部署

在终端中导航到 `your-project-directory`。

```bash
gcloud run deploy capital-agent-service \
--source . \
--region $GOOGLE_CLOUD_LOCATION \
--project $GOOGLE_CLOUD_PROJECT \
--allow-unauthenticated \
--set-env-vars="GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION,GOOGLE_GENAI_USE_ENTERPRISE=$GOOGLE_GENAI_USE_ENTERPRISE"
# Add any other necessary environment variables your agent might need
```

* `capital-agent-service`：您想要为您的 Cloud Run 服务命名的名称。
* `--source .`：告诉 gcloud 从当前目录中的 Dockerfile 构建容器镜像。
* `--region`：指定部署区域。
* `--project`：指定 GCP 项目。
* `--allow-unauthenticated`：允许公众访问该服务。若为私有服务，请移除此标志。
* `--set-env-vars`：向正在运行的容器传递必要的环境变量。确保包含 ADK 和您的 Agent 所需的所有变量（如果不使用应用程序默认凭据，则包括 API 密钥）。

`gcloud` 将构建 Docker 镜像，将其推送到 Google Artifact Registry，并部署到 Cloud Run。完成后，它会输出已部署服务的 URL。

有关完整的部署选项列表，请参见 [`gcloud run deploy` 参考文档](https://cloud.google.com/sdk/gcloud/reference/run/deploy)。
{{% /tab %}}
{{% tab tabName="Go - adkgo CLI" %}}

### adk CLI

adkgo 命令位于 google/adk-go 仓库下的 cmd/adkgo。使用前，需要从 adk-go 仓库的根目录构建它：

`go build ./cmd/adkgo`

adkgo deploy cloudrun 命令可自动部署您的应用程序。您无需提供自己的 Dockerfile。

#### Agent 代码结构

使用 adkgo 工具时，您的 main.go 文件必须使用 launcher 框架。这是因为该工具会编译您的代码，然后使用特定的命令行参数（如 web、api、a2a）运行生成的可执行文件以启动所需的服务。launcher 设计用于正确解析这些参数。

您的 main.go 应如下所示：

```go title="main.go"
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// 除非遵守许可协议，否则您不得使用此文件。
// 您可以在以下位置获取许可副本
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// 除非适用法律要求或书面约定，否则根据许可协议分发的软件
// 按“原样”提供
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 请参阅许可协议以了解管理权限和
// limitations under the License.

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"google.golang.org/adk/v2/agent"
	"google.golang.org/adk/v2/agent/llmagent"
	"google.golang.org/adk/v2/cmd/launcher"
	"google.golang.org/adk/v2/cmd/launcher/full"
	"google.golang.org/adk/v2/model/gemini"
	"google.golang.org/adk/v2/tool"
	"google.golang.org/adk/v2/tool/functiontool"
	"google.golang.org/genai"
)

type getCapitalCityArgs struct {
	Country string `json:"country" jsonschema:"The country for which to find the capital city."`
}

func getCapitalCity(ctx agent.Context, args getCapitalCityArgs) (string, error) {
	capitals := map[string]string{
		"united states": "Washington, D.C.",
		"canada":        "Ottawa",
		"france":        "Paris",
		"japan":         "Tokyo",
	}
	capital, ok := capitals[strings.ToLower(args.Country)]
	if !ok {
		return "", fmt.Errorf("couldn't find the capital for %s", args.Country)
	}

	return capital, nil
}

func main() {
	ctx := context.Background()

	model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{
		APIKey: os.Getenv("GOOGLE_API_KEY"),
	})
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	capitalTool, err := functiontool.New(
		functiontool.Config{
			Name:        "get_capital_city",
			Description: "Retrieves the capital city for a given country.",
		},
		getCapitalCity,
	)
	if err != nil {
		log.Fatalf("Failed to create function tool: %v", err)
	}

	geoAgent, err := llmagent.New(llmagent.Config{
		Name:        "capital_agent",
		Model:       model,
		Description: "Agent to find the capital city of a country.",
		Instruction: "I can answer your questions about the capital city of a country.",
		Tools:       []tool.Tool{capitalTool},
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	config := &launcher.Config{
		AgentLoader: agent.NewSingleLoader(geoAgent),
	}

	l := full.NewLauncher()
	err = l.Execute(ctx, config, os.Args[1:])
	if err != nil {
		log.Fatalf("run failed: %v\n\n%s", err, l.CommandLineSyntax())
	}
}
```

#### 工作原理
1. adkgo 工具将你的 main.go 编译成适用于 Linux 的静态链接二进制文件。
2. 它生成一个 Dockerfile，将该二进制文件复制到一个最小化容器中。
3. 它使用 gcloud 构建并部署该容器到 Cloud Run。
4. 部署完成后，它会启动一个本地 Agent，安全地连接到你的新服务。

确保你已通过 Google Cloud（`gcloud auth login` 和 `gcloud config set project <your-project-id>`）完成身份验证。

#### 设置环境变量

可选但推荐：设置环境变量可以使部署命令更加简洁。

```bash
# Set your Google Cloud Project ID
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"

# Set your desired Google Cloud Location
export GOOGLE_CLOUD_LOCATION="us-central1"

# Set the path to your agent's main Go file
export AGENT_PATH="./examples/go/cloud-run/main.go"

# Set a name for your Cloud Run service
export SERVICE_NAME="capital-agent-service"
```

#### 命令用法

```bash
./adkgo deploy cloudrun \
    -p $GOOGLE_CLOUD_PROJECT \
    -r $GOOGLE_CLOUD_LOCATION \
    -s $SERVICE_NAME \
    --proxy_port=8081 \
    --server_port=8080 \
    -e $AGENT_PATH \
    --a2a --api --webui
```

##### 必填项

* `-p, --project_name`：您的 Google Cloud 项目 ID。
* `-r, --region`：部署的 Google Cloud 地点，例如：$GOOGLE_CLOUD_LOCATION, us-central1。
* `-s, --service_name`：Cloud Run 服务的名称，例如：$SERVICE_NAME。
* `-e, --entry_point_path`：包含您的 Agent 源代码的主要 Go 文件路径，例如：$AGENT_PATH。

##### 可选项

* `--proxy_port`：用于身份验证 Agent 监听的本地端口。默认值为 8081。
* `--server_port`：Cloud Run 容器内服务器监听的端口号。默认值为 8080。
* `--a2a`：如果包含，则启用 Agent2Agent 通信。默认启用。
* `--a2a_agent_url`：公开 Agent 卡上公告的 A2A Agent 卡 URL。此标志仅在与 --a2a 标志一起使用时有效。
* `--api`：如果包含，则部署 ADK API 服务器。默认启用。
* `--webui`：如果包含，则在 Agent API 服务器旁部署 ADK 开发 UI。默认启用。
* `--temp_dir`：构建产物的临时目录。默认值为 os.TempDir()。
* `--help`：显示帮助信息并退出。

##### 认证访问
该服务默认使用 --no-allow-unauthenticated 部署。

命令执行成功后，将您的 Agent 部署到 Cloud Run，并通过 Agent 提供本地 URL 以访问该服务。
{{% /tab %}}
{{< /tabs >}}

## 测试您的 Agent

一旦您的 Agent 部署到 Cloud Run，如果启用了 UI，您可以通过已部署的 UI 与其交互，或者使用 `curl` 等工具直接访问其 API 端点。您将需要部署后提供的服务 URL。

{{< tabs tabTotal="2" >}}
{{% tab tabName="UI Testing" %}}

### UI 测试

如果您启用了 UI 部署了 Agent：

*   **adk CLI:** 您在部署过程中包含了相应标志 (Go 中为 `--webui` 或 Python/TypeScript 中为 `--with_ui`)。
*   **gcloud CLI:** 您在 `main.py` 中设置了 `SERVE_WEB_INTERFACE = True`。

您可以通过在浏览器中访问部署后提供的 Cloud Run 服务 URL 来测试您的 Agent。

```bash
# Example URL format
# https://your-service-name-abc123xyz.a.run.app
```

ADK 开发者界面允许您直接在浏览器中与 Agent 进行交互、管理会话以及查看执行详情。

要验证您的 Agent 是否按预期工作，您可以：

1. 从下拉菜单中选择您的 Agent。
2. 输入一条消息，并验证您是否从 Agent 那里收到预期的响应。

如果您遇到任何意外行为，请检查 [Cloud Run](https://console.cloud.google.com/run) 控制台日志。
{{% /tab %}}
{{% tab tabName="API Testing (curl)" %}}

### API 测试 (curl)

您可以使用类似 `curl` 的工具与 Agent 的 API 端点进行交互。这对于编程交互或如果您在没有 UI 的情况下部署非常有用。

您需要在部署后提供的服务 URL，并且如果您的服务未设置为允许未认证访问，可能还需要身份令牌进行身份验证。

#### 设置应用程序 URL

将示例 URL 替换为您实际部署的 Cloud Run 服务的 URL。

```bash
export APP_URL="YOUR_CLOUD_RUN_SERVICE_URL"
# Example: export APP_URL="https://adk-default-service-name-abc123xyz.a.run.app"
```

#### 获取身份令牌（如有需要）

如果您的服务需要身份验证，例如，您没有将 `--allow-unauthenticated` 与 `gcloud` 一起使用，或在提示 `adk` 时回答了“否”，请获取身份令牌。

```bash
export TOKEN=$(gcloud auth print-identity-token)
```

*如果您的服务允许未认证访问，您可以在下面的 `curl` 命令中省略 `-H "Authorization: Bearer $TOKEN"` 头部。*

#### 列出可用的应用程序

验证已部署的应用程序名称。

```bash
curl -X GET -H "Authorization: Bearer $TOKEN" $APP_URL/list-apps
```

*根据此输出在以下命令中调整 `app_name`（如有需要）。默认通常是 Agent 目录名称，例如：`capital_agent`*。

#### 创建或更新会话

初始化或更新特定用户和会话的状态。如果应用名称不同，请将 `capital_agent` 替换为实际应用名称。值 `user_123` 和 `session_abc` 是示例标识符；您可以将它们替换为所需的用户和会话 ID。

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
    $APP_URL/apps/capital_agent/users/user_123/sessions/session_abc \
    -H "Content-Type: application/json" \
    -d '{"preferred_language": "English", "visit_count": 5}'
```

#### 运行 Agent

向您的 Agent 发送提示。将 `capital_agent` 替换为您的应用名称，并根据需要调整用户/会话 ID 和提示。

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
    $APP_URL/run_sse \
    -H "Content-Type: application/json" \
    -d '{
    "app_name": "capital_agent",
    "user_id": "user_123",
    "session_id": "session_abc",
    "new_message": {
        "role": "user",
        "parts": [{
        "text": "What is the capital of Canada?"
        }]
    },
    "streaming": false
    }'
```

* 如果您想接收服务器发送的事件（SSE），请设置 `"streaming": true`。
* 响应将包含 Agent 的执行事件，包括最终答案。
{{% /tab %}}
{{< /tabs >}}

---

原文：[Deploy to Cloud Run](https://adk.dev/deploy/cloud-run/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/cloud-run.md)
