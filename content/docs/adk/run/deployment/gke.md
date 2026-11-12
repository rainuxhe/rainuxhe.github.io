---
title: "GKE"
description: "GKE 是 Google Cloud 托管的 Kubernetes 服务。它允许您使用 Kubernetes 部署和管理容器化的应用程序。"
icon: "article"
weight: 30
toc: true
---

支持版本：Python, Go。

[GKE](https://cloud.google.com/gke) 是 Google Cloud 托管的 Kubernetes 服务。它允许您使用 Kubernetes 部署和管理容器化应用程序。

要部署您的 Agent，您需要在 GKE 上运行一个 Kubernetes 集群。您可以使用 Google Cloud 控制台或 `gcloud` 命令行工具创建集群。

以下示例演示如何将一个简单的 Agent 部署到 GKE。Python Agent 是一个使用 `Gemini Flash` 作为 LLM 的 FastAPI 应用程序。Go Agent 使用 ADK 启动程序和最小化容器中的静态链接二进制文件。您可以使用 Agent Platform 或 AI Studio 作为 LLM 提供者，通过环境变量 `GOOGLE_GENAI_USE_ENTERPRISE` 配置。

## 设置环境变量 {#set-environment-variables}

按照 [Setup and Installation](/docs/adk/build/get-started/installation/) 指南中的说明设置变量。您还需要安装 `kubectl` 命令行工具。您可以在 [Google Kubernetes Engine Documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl) 中找到安装说明。

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id # Your GCP project ID
export GOOGLE_CLOUD_LOCATION=us-central1 # Or your preferred location
export GOOGLE_GENAI_USE_ENTERPRISE=true # Set to true if using Agent Platform
export GOOGLE_CLOUD_PROJECT_NUMBER=$(gcloud projects describe \
  --format json $GOOGLE_CLOUD_PROJECT | jq -r ".projectNumber")
```

如果你没有安装 jq，你可以使用以下命令来获取项目编号：

```bash
gcloud projects describe $GOOGLE_CLOUD_PROJECT
```

并从输出中复制项目编号。

```bash
export GOOGLE_CLOUD_PROJECT_NUMBER=YOUR_PROJECT_NUMBER
```

## 启用 API 和权限 {#enable-apis-and-permissions}

* 确保您已使用 Google Cloud 进行身份验证（`gcloud auth login` 和 `gcloud config set project <your-project-id>`）。
* 为您的项目启用必要的 API。您可以使用 `gcloud` 命令行工具来完成此操作。

```bash
gcloud services enable \
    container.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    aiplatform.googleapis.com
```

向默认计算引擎服务帐户授予 `gcloud builds submit` 命令所需的必要角色。

```bash
ROLES_TO_ASSIGN=(
    "roles/artifactregistry.writer"
    "roles/storage.objectViewer"
    "roles/logging.viewer"
    "roles/logging.logWriter"
)

for ROLE in "${ROLES_TO_ASSIGN[@]}"; do
    gcloud projects add-iam-policy-binding "${GOOGLE_CLOUD_PROJECT}" \
        --member="serviceAccount:${GOOGLE_CLOUD_PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="${ROLE}"
done
```

## 部署负载 {#payload}

当你将 ADK Agent 工作流部署到 Google Cloud GKE 时，以下内容会被上传到服务中：

* 你的 ADK Agent 代码
* 在你的 ADK Agent 代码中声明的任何依赖项
* 你的 Agent 使用的 ADK API 服务器代码版本

默认部署 *不* 包括 ADK Web 用户界面库，除非你在部署设置中指定，例如用于 `adk deploy gke` 命令的 `--with_ui` 选项。

## 部署选项 {#deployment-options}

你可以选择将 Agent 部署到 GKE，通过 **使用 Kubernetes 清单手动部署** 或 **使用 `adk deploy gke` 命令自动部署**。选择最适合你的工作流的方法。

## 选项 1：使用 gcloud 和 kubectl 手动部署 {#option-1-manual-deployment-using-gcloud-and-kubectl}

### 创建 GKE 集群 {#create-a-gke-cluster}

你可以使用 `gcloud` 命令行工具创建 GKE 集群。这个示例在 `us-central1` 区域创建了名为 `adk-cluster` 的 Autopilot 集群。

{{% alert context="info" %}}
**如果你正在创建 GKE Standard 集群**

确保 [工作负载身份 ](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) 已启用。工作负载身份在 Autopilot 集群中默认启用。
{{% /alert %}}

```bash
gcloud container clusters create-auto adk-cluster \
    --location=$GOOGLE_CLOUD_LOCATION \
    --project=$GOOGLE_CLOUD_PROJECT
```

在创建集群后，您需要使用 `kubectl` 连接到它。此命令配置 `kubectl` 使用您新集群的凭据。

```bash
gcloud container clusters get-credentials adk-cluster \
    --location=$GOOGLE_CLOUD_LOCATION \
    --project=$GOOGLE_CLOUD_PROJECT
```

### 创建你的 Agent {#create-your-agent}

以 [LLM agents](/docs/adk/build/agents/simple-agents/) 页面上定义的 `capital_agent` 示例为参考。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

按如下方式组织你的项目文件：

```txt
your-project-directory/
├── capital_agent/
│   ├── __init__.py
│   └── agent.py       # Your agent code
├── main.py            # FastAPI application entry point
├── requirements.txt   # Python dependencies
└── Dockerfile         # Container build instructions
```

{{% /tab %}}
{{% tab tabName="Go" %}}

按照以下方式整理你的项目文件：

```txt
your-project-directory/
├── main.go       # Agent code and launcher entry point
├── go.mod        # Go module definition
├── go.sum        # Go module checksums
└── Dockerfile    # Container build instructions
```

{{% /tab %}}
{{< /tabs >}}

### 代码文件 {#code-files}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

在 `your-project-directory/` 根目录下创建以下文件 (`main.py`, `requirements.txt`, `Dockerfile`, `capital_agent/agent.py`, `capital_agent/__init__.py`)。

1. 这是位于 `capital_agent` 目录中的 Capital Agent 示例

    ```python title="capital_agent/agent.py"
    from google.adk.agents import LlmAgent

    # 定义一个工具功能
    def get_capital_city(country: str) -> str:
      """Retrieves the capital city for a given country."""
      # 用实际逻辑替换（例如，API 调用，数据库查询）
      capitals = {"france": "Paris", "japan": "Tokyo", "canada": "Ottawa"}
      return capitals.get(country.lower(), f"Sorry, I don't know the capital of {country}.")

    # 将该工具添加到 Agent 中
    capital_agent = LlmAgent(
        model="gemini-flash-latest",
        name="capital_agent", #name of your agent
        description="Answers user questions about the capital city of a given country.",
        instruction="""You are an agent that provides the capital city of a country... (previous instruction text)""",
        tools=[get_capital_city] # Provide the function directly
    )

    # ADK 将发现 root_agent 实例
    root_agent = capital_agent
    ```

将你的目录标记为一个 Python 包

    ```python title="capital_agent/__init__.py"

    from . import agent
    ```

2. 该文件使用来自 ADK 的 `get_fast_api_app()` 设置 FastAPI 应用程序：

    ```python title="main.py"
    import os

    import uvicorn
    from fastapi import FastAPI
    from google.adk.cli.fast_api import get_fast_api_app

    # 获取 main.py 所在的目录
    AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
    # 示例会话服务 URI（例如，SQLite）
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

    if __name__ == "__main__":
        # 使用 Cloud Run 提供的 PORT 环境变量，默认为 8080
        uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
    ```

    *注意：我们将 `agent_dir` 指定到 `main.py` 所在的目录，并使用 `os.environ.get("PORT", 8080)` 以兼容 Cloud Run。*

3. 列出所需的 Python 包：

    ```txt title="requirements.txt"
    google-adk
    # Add any other dependencies your agent needs
    ```

4. 定义容器镜像：

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

{{% /tab %}}
{{% tab tabName="Go" %}}

在 `your-project-directory/` 的根目录中创建以下文件。

1. 定义 Agent 并嵌入 ADK 启动器。该启动器处理 `web`、
   `api` 和 `webui` 子命令，这些子命令用于启动 REST API 服务器和网页界面：

    ```go title="main.go"
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
        Country string `json:"country" jsonschema:"The country to look up."`
    }

    func getCapitalCity(_ agent.Context, args getCapitalCityArgs) (string, error) {
        capitals := map[string]string{
            "france":  "Paris",
            "japan":   "Tokyo",
            "canada":  "Ottawa",
        }
        capital, ok := capitals[strings.ToLower(args.Country)]
        if !ok {
            return "", fmt.Errorf("capital not found for %s", args.Country)
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
            log.Fatalf("Failed to create tool: %v", err)
        }

        capitalAgent, err := llmagent.New(llmagent.Config{
            Name:        "capital_agent",
            Model:       model,
            Description: "Answers questions about capital cities.",
            Instruction: "You are an agent that provides the capital city of a country.",
            Tools:       []tool.Tool{capitalTool},
        })
        if err != nil {
            log.Fatalf("Failed to create agent: %v", err)
        }

        config := &launcher.Config{
            AgentLoader: agent.NewSingleLoader(capitalAgent),
        }

        l := full.NewLauncher()
        if err = l.Execute(ctx, config, os.Args[1:]); err != nil {
            log.Fatalf("Run failed: %v\n\n%s", err, l.CommandLineSyntax())
        }
    }
    ```

    要使用 Agent 平台而不是 AI Studio，请设置 `genai.ClientConfig` 以使用
    Agent 平台后台：

    ```go
    model, err := gemini.NewModel(ctx, "gemini-flash-latest", &genai.ClientConfig{
        Backend:  genai.BackendVertexAI,
        Project:  os.Getenv("GOOGLE_CLOUD_PROJECT"),
        Location: os.Getenv("GOOGLE_CLOUD_LOCATION"),
    })
    ```

2. 定义容器镜像。Go 编译为自包含的静态二进制文件，因此容器使用最小的无发行版基础镜像——无需运行时依赖或包管理器：

    ```dockerfile title="Dockerfile"
    # Stage 1: Build the Go binary
    FROM golang:1.25 AS builder
    WORKDIR /app

    COPY go.mod go.sum ./
    RUN go mod download

    COPY . .
    # Compile a statically linked Linux/amd64 binary
    RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
        go build -ldflags="-s -w" -o capital_agent .

    # Stage 2: Copy the binary into a minimal runtime image
    FROM gcr.io/distroless/static-debian12
    COPY --from=builder /app/capital_agent /app/capital_agent
    EXPOSE 8080

    # Start the API server and web UI
    CMD ["/app/capital_agent", "web", "-port", "8080", "api", "webui"]
    ```

{{% /tab %}}
{{< /tabs >}}

### 构建容器镜像 {#build-the-container-image}

您需要创建一个 Google Artifact Registry 仓库来存储您的容器镜像。您可以使用 `gcloud` 命令行工具完成此操作。

```bash
gcloud artifacts repositories create adk-repo \
    --repository-format=docker \
    --location=$GOOGLE_CLOUD_LOCATION \
    --description="ADK repository"
```

构建容器镜像并将其推送到 Artifact Registry：

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

使用 Cloud Build 直接从您的源代码目录构建并推送镜像：

```bash
gcloud builds submit \
    --tag $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo/adk-agent:latest \
    --project=$GOOGLE_CLOUD_PROJECT \
    .
```

{{% /tab %}}
{{% tab tabName="Go" %}}

多阶段 Dockerfile 在构建器阶段处理编译，因此您可以使用 Cloud Build，而无需本地 Go 工具链：

```bash
gcloud builds submit \
    --tag $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo/adk-agent:latest \
    --project=$GOOGLE_CLOUD_PROJECT \
    .
```

或者，在本地编译二进制文件，并在没有多阶段 Dockerfile 的情况下构建较小的镜像——如果你已经安装了 Go，这很有用：

```bash
# Cross-compile for linux/amd64
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o capital_agent .

# Build and push the image
docker build -t $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo/adk-agent:latest .
docker push $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo/adk-agent:latest
```

{{% /tab %}}
{{< /tabs >}}
验证镜像是否已构建并推送到 Artifact 注册表：

```bash
gcloud artifacts docker images list \
  $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo \
  --project=$GOOGLE_CLOUD_PROJECT
```

### 为 Agent 平台配置 Kubernetes 服务账户 {#configure-kubernetes-service-account-for-agent-platform}

如果您的 Agent 使用 Agent 平台，您需要创建一个具有必要权限的 Kubernetes 服务账户。此示例创建一个名为 `adk-agent-sa` 的服务账户，并将其绑定到 `Agent Platform User` 角色。

{{% alert context="info" %}}
**如果使用 AI Studio，可跳过**

如果您正在使用 AI Studio 并通过 API 密钥访问模型，则可以跳过此步骤。
{{% /alert %}}

```bash
kubectl create serviceaccount adk-agent-sa
```

```bash
PROJECT_ID=${GOOGLE_CLOUD_PROJECT}
PROJECT_NUM=${GOOGLE_CLOUD_PROJECT_NUMBER}
IAM_URL="principal://[iam.googleapis.com/projects/$](https://iam.googleapis.com/projects/$){PROJECT_NUM}"
WIP="locations/global/workloadIdentityPools/${PROJECT_ID}.svc.id.goog"
SA="subject/ns/default/sa/adk-agent-sa"

gcloud projects add-iam-policy-binding projects/${PROJECT_ID} \
    --role=roles/aiplatform.user \
    --member="${IAM_URL}/${WIP}/${SA}" \
    --condition=None
```

### 创建 Kubernetes 清单文件 {#create-the-kubernetes-manifest-files}

在您的项目目录中创建一个名为 `deployment.yaml` 的 Kubernetes 部署清单文件。该文件定义了如何在 GKE 上部署您的应用程序。

```yaml title="deployment.yaml"
cat <<  EOF > deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adk-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: adk-agent
  template:
    metadata:
      labels:
        app: adk-agent
    spec:
      serviceAccount: adk-agent-sa
      containers:
      - name: adk-agent
        imagePullPolicy: Always
        image: $GOOGLE_CLOUD_LOCATION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/adk-repo/adk-agent:latest
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
            ephemeral-storage: "128Mi"
          requests:
            memory: "128Mi"
            cpu: "500m"
            ephemeral-storage: "128Mi"
        ports:
        - containerPort: 8080
        env:
          - name: PORT
            value: "8080"
          - name: GOOGLE_CLOUD_PROJECT
            value: $GOOGLE_CLOUD_PROJECT
          - name: GOOGLE_CLOUD_LOCATION
            value: $GOOGLE_CLOUD_LOCATION
          - name: GOOGLE_GENAI_USE_ENTERPRISE
            value: "$GOOGLE_GENAI_USE_ENTERPRISE"
          # If using AI Studio, set GOOGLE_GENAI_USE_ENTERPRISE to false and set the following:
          # - name: GOOGLE_API_KEY
          #   value: $GOOGLE_API_KEY
          # Add any other necessary environment variables your agent might need
apiVersion: v1
kind: Service
metadata:
  name: adk-agent
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: adk-agent
EOF
```

### 部署应用程序 {#deploy-the-application}

使用 `kubectl` 命令行工具部署应用程序。此命令将部署和服务清单文件应用到您的 GKE 集群。

```bash
kubectl apply -f deployment.yaml
```

几分钟后，你可以使用以下命令检查部署状态：

```bash
kubectl get pods -l=app=adk-agent
```

此命令列出与您的部署相关的 Pod。您应该看到一个状态为 `Running` 的 Pod。

一旦 Pod 正在运行，您可以使用以下命令检查服务的状态：

```bash
kubectl get service adk-agent
```

如果输出显示 `External IP`，这意味着您的服务可以从互联网访问。外部 IP 分配可能需要几分钟时间。
您可以使用以下方法获取服务的外部 IP 地址：

```bash
kubectl get svc adk-agent -o=jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## 选项2：使用`adk deploy gke`自动部署 {#option-2-automated-deployment-using-adk-deploy-gke}

{{% alert context="info" %}}
**仅 Python**

`adk deploy gke`命令仅适用于 Python。Go 没有
一个等效的CLI命令。GoAgent 必须按照手册部署
方法详见[选项1](#option-1-manual-deployment-using-gcloud-and-kubectl)。
{{% /alert %}}
ADK 提供了一个 CLI 命令以简化 GKE 部署。这避免了这种需求
手动构建镜像、编写Kubernetes清单，或推送到 Artifact。
登记处。

#### 先决条件 {#prerequisites}

在开始之前，请确保你已经准备好以下内容：

1. **运行中的GKE集群：** 你需要在 Google Cloud上有一个活跃的Kubernetes集群。

2. ** 必需的 CLI：**
    * **`gcloud` CLI：** Google Cloud CLI 必须安装、认证并配置以使用您的目标项目。运行 `gcloud auth login` 并`gcloud config set project [YOUR_PROJECT_ID]`。
    * **kubectl：** 必须安装KubernetesCLI才能将应用部署到你的集群。

3. **启用 Google Cloud API：** 确保在您的 Google Cloud项目中启用以下 API：
    * Kubernetes Engine API（`container.googleapis.com`）
    * Cloud Build API（`cloudbuild.googleapis.com`）
    * 容器注册表 API（`containerregistry.googleapis.com`）

4. ** 要求的 IAM 权限：** 运行该命令的用户或 Compute Engine 默认服务账户至少需要以下角色：

   * **Kubernetes Engine Developer**（`roles/container.developer`）：用于与 GKE 集互。

   * **存储对象查看器**（`roles/storage.objectViewer`）：允许Cloud Build从Cloud Storage桶下载源代码，gcloud builds提交时上传。

   * **在推送写器上创建 Artifact 注册表**（`roles/artifactregistry.createOnPushWriter`）：允许云构建将构建的容器镜像推送到 Artifact 注册表。该角色还允许在首次推送时即时在 Artifact 注册表内创建特殊的 gcr.io 仓库。

   * **Logs Writer**（`roles/logging.logWriter`）：允许Cloud Build向Cloud Logging写入构建日志。

### 配置 Agent 平台工作负载身份 {#configure-workload-identity-for-agent-platform}

如果你的 Agent 使用 Agent Platform，集群中运行的工作负载需要权限才能调用 Agent Platform API。与手动路径不同，`adk deploy gke` 生成一个清单，使用 `default` 命名空间中的 `default` Kubernetes 服务账户。通过工作负载身份赋予该服务账户 `Agent Platform User` 角色，使 Agent 能够访问如 Gemini 等模型。

{{% alert context="success" %}}
**如果用的是AI Studio，请跳过**

如果你用的是 AI Studio，并且用 API 密钥访问模型，可以跳过这一步。
{{% /alert %}}

```bash
gcloud projects add-iam-policy-binding projects/${GOOGLE_CLOUD_PROJECT} \
    --role=roles/aiplatform.user \
    --member=principal://iam.googleapis.com/projects/${GOOGLE_CLOUD_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GOOGLE_CLOUD_PROJECT}.svc.id.goog/subject/ns/default/sa/default \
    --condition=None
```

如果您正在使用 Google Cloud 项目并跳过此步骤，Agent 的 pod 将成功启动，但在验证部署时，对模型的请求将会失败，并显示 `403 PERMISSION_DENIED` 错误。

### `deploy gke` 命令 {#the-deploy-gke-command}

该命令接受 Agent 的路径以及指定目标 GKE 集群的参数。

#### 语法 {#syntax}

```bash
adk deploy gke [OPTIONS] AGENT_PATH
```

### 参数与选项 {#arguments--options}

| 参数    | 描述 | 是否必需 |
| -------- | ------- | ------  |
| AGENT_PATH  | 您的 Agent 根目录的本地文件路径。    | 是 |
| --project | 您的 GKE 集群所在的 Google Cloud 项目 ID。     | 是 |
| --cluster_name   | 您的 GKE 集群名称。    | 是 |
| --region    | 集群所在的 Google Cloud 区域（例如，us-central1）。    | 是 |
| --service_type | 要创建的 Kubernetes 服务类型。可接受 `ClusterIP`（默认）或 `LoadBalancer`。 | 否 |
| --with_ui   | 部署 Agent 的后端 API 以及配套的前端用户界面。    | 否 |
| --log_level   | 设置部署过程的日志级别。选项：debug、info、warning、error、critical。     | 否 |

### 工作原理 {#how-it-works}
当您运行 `adk deploy gke` 命令时，ADK 会自动执行以下步骤：

* **容器化：** 从您的 Agent 源代码构建 Docker 容器镜像。
* **镜像推送：** 为容器镜像打标签并将其推送到您的项目 Artifact 注册表（Artifact Registry）。
* **清单生成：** 动态生成所需的 Kubernetes 清单文件（`Deployment` 和 `Service`）。
* **集群部署：** 将这些清单应用到您指定的 GKE 集群，这将触发以下操作：

`Deployment` 指示 GKE 从 Artifact 注册表中拉取容器镜像并在一个或多个 Pod 中运行。

`Service` 为您的 Agent 创建一个稳定的网络端点。默认情况下，它为 `ClusterIP` 服务，仅在集群内可访问。要使用公共 IP 地址将 Agent 暴露到互联网，必须指定 `--service_type=LoadBalancer`。

### 使用示例 {#example-of-use}
以下是一个将位于 `~/agents/multi_tool_agent/` 的 Agent 部署到名为 test 的 GKE 集群的实际示例。

```bash
adk deploy gke \
    --project myproject \
    --cluster_name test \
    --region us-central1 \
    --with_ui \
    --log_level info \
    ~/agents/multi_tool_agent/
```

### 验证你的部署 {#verify-your-deployment}
如果你使用了 `adk deploy gke`，请使用 `kubectl` 验证部署：

* **检查 Pods：** 确保你的 Agent Pod 处于运行状态。

```bash
kubectl get pods
```

你应该在默认命名空间中看到类似 `adk-default-service-name-xxxx-xxxx ... 1/1 Running` 的输出。

* **查找外部 IP：** 获取你的 Agent 服务的公共 IP 地址。

```bash
kubectl get service
```

默认情况下，服务类型是 `ClusterIP`，`EXTERNAL-IP` 是 `<none>`。

```bash
NAME                       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
adk-default-service-name   ClusterIP   10.12.1.2       <none>        80/TCP    2m
```

要测试您的 Agent，您可以使用端口转发：

```bash
kubectl port-forward svc/adk-default-service-name 8080:80
```

然后，您可以通过 `http://localhost:8080` 访问您的 Agent。

如果您使用 `--service_type=LoadBalancer` 部署，可能需要几分钟才能分配到外部 IP。
一旦 `EXTERNAL-IP` 可用，您可以导航到它以与您的 Agent 进行交互。

![alt text](/images/adk/agent-gke-deployment.png)

## 测试您的 Agent {#test-your-agent}

一旦您的 Agent 部署到 GKE，您可以通过已部署的 UI（如果启用）与 Agent 交互，或使用 `curl` 等工具直接访问其 API 端点。
您需要使用部署后提供的服务 URL。

{{< tabs tabTotal="2" >}}
{{% tab tabName="UI Testing" %}}

### UI 测试 {#troubleshooting}

如果您启用了 UI 部署了您的 Agent：

您可以通过在 Web 浏览器中导航到 Kubernetes 服务 URL 来测试您的 Agent。

ADK 开发 UI 允许您直接在浏览器中与 Agent 交互，管理会话，并查看执行详情。

要验证您的 Agent 是否按预期工作，您可以：

1. 从下拉菜单中选择您的 Agent。
2. 输入一条消息，并验证您是否从 Agent 收到预期的响应。

如果遇到任何意外行为，请使用以下命令检查 Agent 的 pod 日志：

```bash
kubectl logs -l app=adk-agent
```

{{% /tab %}}
{{% tab tabName="API Testing (curl)" %}}

### API 测试（curl） {#403-permission-denied-for-geminis-models}

你可以使用像 `curl` 这样的工具与 Agent 的 API 端点进行交互。这对于程序化交互或在未部署 UI 的情况下非常有用。

#### 设置应用程序 URL {#404-or-not-found-response}

```bash
export APP_URL=$(kubectl get service adk-agent -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

{{% alert context="info" %}}
**Go：API 路径前缀**

Go ADK 服务器默认在 `/api` 路径前缀下提供所有 REST 端点。在测试 Go 部署时，请在下面示例中的每个路径前添加 `/api`。例如：

| Python | Go |
|---|---|
| `$APP_URL/list-apps` | `$APP_URL/api/list-apps` |
| `$APP_URL/apps/…` | `$APP_URL/api/apps/…` |
| `$APP_URL/run_sse` | `$APP_URL/api/run_sse` |

可以在启动时通过 `-path_prefix` 修改前缀，在 `api` 子命令上，例如 `CMD ["/app/capital_agent", "web", "-port", "8080", "api", "-path_prefix", ""]` 可以完全移除前缀。
{{% /alert %}}

#### 列出可用应用程序 {#attempt-to-write-a-readonly-database}

验证已部署的应用程序名称。

```bash
curl -X GET $APP_URL/list-apps
```

*(根据需要，在下面的命令中调整 `app_name`。默认通常是 Agent 目录名称，例如 `capital_agent`)*。

#### 创建或更新会话 {#insufficient-permission-to-stream-logs-error-gcloudbuildssubmit}

为特定用户和会话初始化或更新状态。如果不同，请将 `capital_agent` 替换为您的实际应用名称。

```bash
curl -X POST \
    $APP_URL/apps/capital_agent/users/user_123/sessions/session_abc \
    -H "Content-Type: application/json" \
    -d '{"preferred_language": "English", "visit_count": 5}'
```

#### 运行 Agent {#gemini-models-not-supported-in-live-api}

向你的 Agent 发送提示。将 `capital_agent` 替换为你的应用名称，并根据需要调整用户/会话 ID 和提示。

{{% alert context="info" %}}
**Go：JSON 字段名称使用驼峰式**

Python ADK REST API 在 JSON 请求体中使用 `snake_case` 字段名称（例如 `app_name`、`user_id`、`new_message`）。Go ADK REST API 使用 `camelCase`（例如 `appName`、`userId`、`newMessage`）。请使用适用于你部署语言的正确格式。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```bash
curl -X POST $APP_URL/run_sse \
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

{{% /tab %}}
{{% tab tabName="Go" %}}

```bash
curl -X POST $APP_URL/api/run_sse \
    -H "Content-Type: application/json" \
    -d '{
    "appName": "capital_agent",
    "userId": "user_123",
    "sessionId": "session_abc",
    "newMessage": {
        "role": "user",
        "parts": [{
        "text": "What is the capital of Canada?"
        }]
    },
    "streaming": false
    }'
```

{{% /tab %}}
{{< /tabs >}}
* 如果您想接收服务器发送事件（SSE），请设置 `"streaming": true`。
* 响应将包含 Agent 的执行事件，包括最终答案。
{{% /tab %}}
{{< /tabs >}}

## 故障排除 {#cleanup}

在将 Agent 部署到 GKE 时，您可能会遇到以下常见问题：

### Gemini 模型的 403 权限被拒绝

这通常意味着 Kubernetes 服务账号没有访问 Agent 平台 API 所需的权限。请确保您已创建服务账号并将其绑定到 `Agent Platform User` 角色，如 [配置 Agent 平台的 Kubernetes 服务账号](#configure-kubernetes-service-account-for-agent-platform) 部分所述。
如果您使用 `adk deploy gke` 部署，请绑定 `default` 服务账号，如 [配置 Agent 平台的工作负载身份](#configure-workload-identity-for-agent-platform) 部分所述。如果您使用 AI Studio，请确保在部署清单中设置了 `GOOGLE_API_KEY` 环境变量，并且其有效。

### 404 或 未找到 响应

这通常意味着您的请求有误。检查应用日志以诊断问题。

```bash

export POD_NAME=$(kubectl get pod -l app=adk-agent -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD_NAME
```

### 尝试写入只读数据库

{{% alert context="info" %}}
**仅限 Python**

此错误适用于使用 SQLite 进行会话存储的 Python 部署。
Go 部署默认使用内存中的会话服务，因此不受此问题影响。
{{% /alert %}}
你可能会发现 UI 中没有创建会话 ID，并且 Agent 不会响应任何消息。通常这是由于 SQLite 数据库为只读状态导致的。如果你在本地运行 Agent，然后创建包含 SQLite 数据库的容器镜像，可能会出现这种情况。数据库在容器中就是只读的。

```bash
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) attempt to write a readonly database
[SQL: UPDATE app_states SET state=?, update_time=CURRENT_TIMESTAMP WHERE app_states.app_name = ?]
```

要解决此问题，您可以选择：

在构建容器镜像之前，从本地计算机上删除 SQLite 数据库文件。这样在启动容器时会创建一个新的 SQLite 数据库。

```bash
rm -f sessions.db
```

或者（推荐）你可以在项目目录中添加一个 `.dockerignore` 文件，以将 SQLite 数据库排除在复制到容器镜像之外。

```txt title=".dockerignore"
sessions.db
```

再次构建容器镜像并部署应用程序。

### 日志流权限不足 `ERROR: (gcloud.builds.submit)`

当您没有足够的权限来流式传输构建日志，或者您的 VPC-SC 安全策略限制访问默认日志存储桶时，可能会出现此错误。要检查构建进度，请按照错误消息中提供的链接，或导航至 Google Cloud 控制台中的 Cloud Build 页面。

您还可以使用 [Build the container image](#build-the-container-image) 部分] 下的命令，验证镜像是否已构建并推送到 Artifact Registry。

### Gemini 模型在实时 API 中不受支持

在使用部署 Agent 的 ADK Dev UI 时，文本聊天功能可用，但语音功能（如点击麦克风按钮）会失败。您可能会在 Pod 日志中看到 `websockets.exceptions.ConnectionClosedError`，表明您的模型“在实时 API 中不受支持”。

此错误的发生是因为 Agent 配置的模型（例如示例中的 `gemini-flash-latest`）不支持 Gemini 实时 API。实时 API 用于音频和视频的实时双向流传输。

## 清理

要删除 GKE 集群及所有关联资源，请运行：

```bash
gcloud container clusters delete adk-cluster \
    --location=$GOOGLE_CLOUD_LOCATION \
    --project=$GOOGLE_CLOUD_PROJECT
```

要删除 Artifact Registry 存储库，请运行：

```bash
gcloud artifacts repositories delete adk-repo \
    --location=$GOOGLE_CLOUD_LOCATION \
    --project=$GOOGLE_CLOUD_PROJECT
```

如果您不再需要该项目，也可以删除它。这将删除与该项目相关的所有资源，包括 GKE 集群、Artifact Registry 仓库以及您创建的任何其他资源。

```bash
gcloud projects delete $GOOGLE_CLOUD_PROJECT
```

---

原文：[Deploy to Google Kubernetes Engine (GKE)](https://adk.dev/deploy/gke/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/deploy/gke.md)
