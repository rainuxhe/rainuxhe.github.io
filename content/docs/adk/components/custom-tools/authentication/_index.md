---
title: "身份验证"
description: "您在 ADK Agent 中使用的工具和服务可能需要访问受保护的资源，例如电子邮件或日历应用中的用户数据，或数据库中的销售记录。获取这些资源的访问权限通常"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v0.1.0。

您在 ADK Agent 中使用的工具和服务可能需要访问受保护的资源，例如电子邮件或日历应用中的用户数据，或数据库中的销售记录。获取这些资源的访问权限通常需要一个身份验证过程，包括必须谨慎管理和保护的凭证和访问密钥。如果您是本地运行 Agent 或将其部署到托管服务，管理身份验证数据的要求也可能会发生变化。如果多个用户（可能具有不同的访问权限）与 Agent 交互，这将增加另一个身份验证管理要求的层级。

{{% alert context="danger" %}}
**警告：凭证存储和安全风险**

将访问令牌，尤其是刷新令牌等敏感凭证直接存储在会话状态中，可能存在安全风险，这取决于您的会话存储后端、您的***SessionService***实现以及整体应用程序安全状况。在将 ADK Agent 部署用于常规使用之前，请仔细考虑如何管理凭证。
{{% /alert %}}
## 身份验证和凭证管理 {#authentication-and-credential-management}

在 ADK Agent 中，有几种方法可以管理身份验证和凭证。每种方法都存在一定的风险，因此您应仔细考虑哪种方法最适合您的应用程序和客户。

### 推荐：身份验证管理服务 {#authentication-manager}

将 Agent 部署到生产托管环境后，Agent 正确认证受限工具和服务的能力变得更具挑战性，也更需要妥善管理。当您的 Agent 用户对受限工具和数据具有不同级别的访问权限时，这一身份验证挑战可能变得更加复杂。

与其为 Agent 使用的各种工具编写代码来处理身份验证过程和凭证管理，不如使用一个*身份验证管理器*服务来统一管理。这项服务应负责密钥和秘密的存储，以及 OAuth 访问或刷新令牌的获取、管理和存储。了解有关 [Agent 身份集成（官方英文）](https://adk.dev/integrations/agent-identity/) 与 ADK 的更多信息]。

### 自行管理身份验证 {#self-managed-authentication}

如果您决定使用 ADK 辅助功能和自己的代码自行管理身份验证过程，请考虑以下建议：*   **API 密钥和客户端密钥：** 对于在 ADK 代码中使用的任何 API 密钥和客户端密钥，在本地计算环境中运行时，请使用不在版本控制中的本地 `.env` 文件。当您的 Agent 托管或位于生产环境中时，请使用机密管理器。有关机密管理器的更多详细信息，请参见[下一节](#secrets-manager)。
*   **交互式认证：** 使用交互式三方授权 (3LO) OAuth 或 OpenID Connect (OIDC) 对工具进行身份验证时，请在客户端应用程序上编写服务以获取、管理访问令牌并刷新令牌。确保将这些令牌存储在加密数据库中，并与经过身份验证的用户标识符关联。

### 机密管理服务 {#secrets-manager}

对于生产环境，如果您没有使用[身份验证管理器](#authentication-manager)服务，您应将凭据存储在专用的机密管理服务中以保护数据。通过这种方法，机密管理器会根据需要安全存储 Agent 访问的任何工具或服务的凭据，并且这些机密不会常驻于 Agent 的操作内存中。例如，使用此方法的自定义 ADK 工具在会话内存中只会有短期有效的访问令牌或安全引用，需要时从机密管理器检索长期有效的刷新令牌。在选择机密管理器时，请考虑来自成熟提供商的服务，例如[Google Cloud Secret Manager](https://cloud.google.com/security/products/secret-manager)或其他机密管理服务。

### 本地加密机密存储 {#local-encrypted-secrets-storage}

对于安全性要求较低的 Agent 应用，将凭据保存在本地加密存储中是一种可行选项。考虑使用专用的本地机密存储系统，或使用强大的加密库对本地数据库中的数据进行加密，然后通过密钥管理服务安全管理加密密钥。注意仅在操作内存中保留短期有效的访问令牌，仅在需要时从加密本地存储中访问长期凭据和刷新令牌。

### 内存中机密 {#in-memory-secrets}

此方法*仅应在 Agent 的早期开发*和测试中使用。通过这种方法，凭据存储在当前***InMemorySessionService***实例中。数据仅存在于会话内存中，并不会被持久化。然而，应根据 Agent 会话可能持续的时间、谁可以访问 Agent 以及 Agent 运行环境的安全性，谨慎考虑使用此方法的风险。

## 框架组件 {#framework-components}

在 ADK 框架中，***AuthScheme***、***AuthCredential*** 和 ***BaseCredentialService*** 是处理身份验证方法和管理凭据数据的关键组件：* ***AuthScheme***：定义了 API 如何期望获得认证凭证，
    例如头部中的 API 密钥或OAuth 2.0承载令牌。ADK 支持
    与 OpenAPI 3.0 相同的认证方案类型，并使用
    用于凭证类型的类，包括 ***APIKey***， ***HTTPBearer***，
    OAuth2***，以及 ***OpenIdConnectWithConfig***。前三个是
    从`fastapi.openapi.models`导入的OpenAPI 模型;仅
    OpenIdConnectWithConfig*** 由 ADK 在 `google.adk.auth` 中定义。对于
    关于每种 OpenAPI 凭据类型的更多细节，请参见
    [OpenAPI 文档：Authentication](https://swagger.io/docs/specification/v3_0/authentication/).

* ***AuthCredential***：存储启动
    认证过程，例如您的应用程序的 OAuth 客户端 ID 或
    Secret，或 API 键值。该类的实例包括
    **auth_type**，如 `API_KEY`、`OAUTH2`、`SERVICE_ACCOUNT`，具体说明
    证书类型。

* ***BaseCredentialService***：控制 ADK 存储一次凭证的位置
    它已经被交换了。将实现传递给运行者，用
    `Runner(credential_service=...)`;ADK 提供`InMemoryCredentialService`
    `google.adk.auth.credential_service.in_memory_credential_service` 和
    `SessionStateCredentialService`
    `google.adk.auth.credential_service.session_state_credential_service`。
    如果你把凭据存储在会话状态，确保你的会话存储
    静止时是加密的，不会暴露给不受信任的客户端。该组件
    属于实验性，未来版本可能会有所变化。

一般的认证流程包括在
配置一个工具。ADK 随后尝试自动交换初始字母
在工具调用 API 之前，先有资格证书，例如访问令牌。对于
需要用户交互的流程，包括OAuth同意，ADK 会触发
与你的***Agent 客户***应用进行特定的互动流程。

### 支持的初始凭证类型 {#supported-initial-credential-types}

* **API\_KEY：** 提供简单的键值认证，通常
    无需身份验证交换。
* **HTTP：** 提供不推荐且可能不被推荐的基本认证
    支持交换，或已获得持有人代币。持有人代币支持
    不需要身份验证交换。
* **OAuth 2：** 提供标准 OAuth 2.0 认证流程，并要求
    配置中包含客户端ID、secret和作用域。这种方法通常
    触发交互式流程以获取用户同意。
* **OPEN\_ID\_CONNECT：** 基于 OpenID Connect 提供认证。
    类似于OAuth2，这种类型通常需要配置和用户
    互动。
* **SERVICE\_ACCOUNT：** 提供 Google Cloud Service 账户凭证作为
    JSON 密钥或应用默认凭证。这种类型通常交换
    持有者令牌。

## 工具与集成快速指南以下是关键 ADK 工具集认证的快速指南： {#tools-and-integrations-quick-guide}

*   [***RestApiTool***](/docs/adk/components/custom-tools/openapi-tools/)：
    在初始化时设置 `auth_scheme` 和 `auth_credential`
*   [***OpenAPIToolset***](/docs/adk/components/custom-tools/openapi-tools/)：
    在初始化时设置 `auth_scheme` 和 `auth_credential`
*   [***APIHubToolset***（官方英文）](https://adk.dev/integrations/apigee-api-hub/)：
    在初始化时设置 `auth_scheme` 和 `auth_credential`，*如果* API
    需要认证。
*   [***ApplicationIntegrationToolset***（官方英文）](https://adk.dev/integrations/application-integration/)：
    在初始化时设置 `auth_scheme` 和 `auth_credential`，*如果* API
    需要认证。
*   [***Google Apps Toolset***（官方英文）](https://adk.dev/integrations/google-api-toolsets/)：
    使用此工具集的特定认证方法。

有关其他预构建工具和集成的更多认证详情，请参阅 [ADK Integrations（官方英文）](https://adk.dev/integrations/) 目录。

## 使用已认证工具构建智能 Agent 应用 {#build-agentic-applications-with-authenticated-tools}

本节重点介绍在您的智能 Agent 应用中使用需要认证的预存在工具（如 `RestApiTool/ OpenAPIToolset`、`APIHubToolset`、`Google Apps Toolset`）。您的主要职责是配置工具并处理交互式认证流程的客户端部分（如果工具需要）。

### 配置具有认证的工具 {#configure-tools-with-authentication}

将已认证的工具添加到您的 Agent 时，您需要提供其所需的 `AuthScheme` 以及您应用的初始 `AuthCredential`。

根据工具集类型（基于 OpenAPI 或 Google API 的工具集）以及由 Cloud IAM 保护的服务是否需要 ID 令牌而不是访问令牌，您可以以不同方式配置认证。以下小节涵盖每种情况。

#### 使用基于 OpenAPI 的工具集 {#use-openapi-based-toolsets}

在工具集初始化时传递方案和凭据。工具集会将其应用到所有生成的工具。以下是在 ADK 中创建具有认证的工具的几种方法。

{{< tabs tabTotal="5" >}}
{{% tab tabName="API Key" %}}

  创建一个需要 API 密钥的工具，用于无需令牌交换的简单认证：

  ```py
  from google.adk.tools.openapi_tool.auth.auth_helpers import token_to_scheme_credential
  from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

  auth_scheme, auth_credential = token_to_scheme_credential(
      "apikey", "query", "apikey", "YOUR_API_KEY_STRING"
  )
  sample_api_toolset = OpenAPIToolset(
      spec_str="...",  # Fill this with an OpenAPI spec string
      spec_str_type="yaml",
      auth_scheme=auth_scheme,
      auth_credential=auth_credential,
  )
  ```

{{% /tab %}}
{{% tab tabName="OAuth2 (Authorization Code)" %}}

创建一个工具，要求使用 OAuth 2.0 授权码流，以便代表人类用户进行交互式认证：

  ```py
  from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset
  from fastapi.openapi.models import OAuth2
  from fastapi.openapi.models import OAuthFlowAuthorizationCode
  from fastapi.openapi.models import OAuthFlows
  from google.adk.auth import AuthCredential
  from google.adk.auth import AuthCredentialTypes
  from google.adk.auth import OAuth2Auth

  auth_scheme = OAuth2(
      flows=OAuthFlows(
          authorizationCode=OAuthFlowAuthorizationCode(
              authorizationUrl="https://accounts.google.com/o/oauth2/auth",
              tokenUrl="https://oauth2.googleapis.com/token",
              scopes={
                  "https://www.googleapis.com/auth/calendar": "calendar scope"
              },
          )
      )
  )
  auth_credential = AuthCredential(
      auth_type=AuthCredentialTypes.OAUTH2,
      oauth2=OAuth2Auth(
          client_id=YOUR_OAUTH_CLIENT_ID,
          client_secret=YOUR_OAUTH_CLIENT_SECRET
      ),
  )

  calendar_api_toolset = OpenAPIToolset(
      spec_str=google_calendar_openapi_spec_str, # Fill this with an openapi spec
      spec_str_type='yaml',
      auth_scheme=auth_scheme,
      auth_credential=auth_credential,
  )
  ```

{{% /tab %}}
{{% tab tabName="OAuth2 (Client Credentials)" %}}

创建一个工具，使用 OAuth 2.0 客户端凭证授权类型进行非交互式的机器对机器认证。提供 `client_id` 和 `client_secret` 以获取访问令牌：

  ```python
  from fastapi.openapi.models import (
      OAuth2,
      OAuthFlowClientCredentials,
      OAuthFlows,
  )
  from google.adk.auth import (
      AuthCredential,
      AuthCredentialTypes,
      OAuth2Auth,
  )
  from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import (
      OpenAPIToolset,
  )

  # 使用客户端凭据流程定义 OAuth2 方案。
  flows = OAuthFlows(
      clientCredentials=OAuthFlowClientCredentials(
          tokenUrl="https://example.com/token",  # Replace with your authorization server's token endpoint.
          scopes={"read:weather": "Read weather data"},
      )
  )
  auth_scheme = OAuth2(flows=flows)

  # 使用客户端 ID 和客户端密钥定义 AuthCredential。
  # 不要硬编码密钥：在本地从 .env 文件加载，或在生产环境中从秘密管理器加载。
  # 参见上文的“自管理身份验证”。
  auth_credential = AuthCredential(
      auth_type=AuthCredentialTypes.OAUTH2,
      oauth2=OAuth2Auth(
          client_id="YOUR_CLIENT_ID",
          client_secret="YOUR_CLIENT_SECRET",
      ),
  )

  weather_toolset = OpenAPIToolset(
      spec_str="...",  # Pass your OpenAPI specification YAML string here.
      spec_str_type="yaml",
      auth_scheme=auth_scheme,
      auth_credential=auth_credential,
  )
  ```

{{% /tab %}}
{{% tab tabName="Service Account" %}}

  创建一个工具，使用服务账户 JSON 密钥或应用默认凭据以非人类身份进行身份验证：

  ```py
  from google.adk.tools.openapi_tool.auth.auth_helpers import service_account_dict_to_scheme_credential
  from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

  service_account_cred = json.loads(service_account_json_str)
  auth_scheme, auth_credential = service_account_dict_to_scheme_credential(
      config=service_account_cred,
      scopes=["https://www.googleapis.com/auth/cloud-platform"],
  )
  sample_toolset = OpenAPIToolset(
      spec_str=sa_openapi_spec_str, # Fill this with an openapi spec
      spec_str_type='json',
      auth_scheme=auth_scheme,
      auth_credential=auth_credential,
  )
  ```

{{% /tab %}}
{{% tab tabName="OpenID Connect" %}}

  创建一个工具，要求通过授权服务器使用 OpenID Connect 来验证用户身份：

  ```py
  from google.adk.auth.auth_schemes import OpenIdConnectWithConfig
  from google.adk.auth.auth_credential import AuthCredential, AuthCredentialTypes, OAuth2Auth
  from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

  auth_scheme = OpenIdConnectWithConfig(
      authorization_endpoint=OAUTH2_AUTH_ENDPOINT_URL,
      token_endpoint=OAUTH2_TOKEN_ENDPOINT_URL,
      scopes=['openid', 'YOUR_OAUTH_SCOPES']
  )
  auth_credential = AuthCredential(
      auth_type=AuthCredentialTypes.OPEN_ID_CONNECT,
      oauth2=OAuth2Auth(
          client_id="...",
          client_secret="...",
      )
  )

  userinfo_toolset = OpenAPIToolset(
      spec_str=content, # Fill in an actual spec
      spec_str_type='yaml',
      auth_scheme=auth_scheme,
      auth_credential=auth_credential,
  )
  ```

{{% /tab %}}
{{< /tabs >}}
#### 使用 Google API 工具集 {#use-google-api-toolsets}

这些工具集通常具有专门的配置方法。

提示：有关如何创建 Google OAuth 客户端 ID 和密钥，请参阅本指南：[获取您的 Google API 客户端 ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#get_your_google_api_client_id)

```py
# 示例：配置谷歌日历工具
from google.adk.tools.google_api_tool import CalendarToolset

client_id = "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
client_secret = "YOUR_GOOGLE_OAUTH_CLIENT_SECRET"

calendar_toolset = CalendarToolset()

# 对这种工具集类型使用特定的配置方法
calendar_toolset.configure_auth(
    client_id=client_id, client_secret=client_secret
)

# agent = LlmAgent(..., tools=[calendar_toolset])
```

#### 使用 ID 令牌 {#use-id-token}

如果你的 Agent 调用受限服务，例如私有的 Cloud Run 或 Cloud Function，Agent 需要证明你的身份，而不仅仅是权限。如果你调用的服务通过 Cloud IAM 访问，则应使用 ID 令牌。

* **访问令牌（默认）**：它调用 Google API（Drive, BigQuery）。可以把它当作你的门禁卡。

* **ID 令牌**：它调用由 IAM 保护的你自己的服务。可以把它当作你的护照。

##### 配置 {#configuration}

要实现 ID 令牌认证，请按照以下参数配置你的服务账户，并确保将目标服务的 URL 指定为 `audience`。

```python
from google.adk.auth.auth_credential import ServiceAccount
from google.adk.tools.openapi_tool.auth.auth_helpers import service_account_scheme_credential
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

# 配置 ServiceAccount 以使用 ID 令牌身份验证。
# 将 <YOUR_AUDIENCE_URL> 替换为您要调用的服务的 URL。
sa_config = ServiceAccount(
    use_default_credential=True,
    use_id_token=True,
    audience="<YOUR_AUDIENCE_URL>",
)

auth_scheme, auth_credential = service_account_scheme_credential(sa_config)

sample_toolset = OpenAPIToolset(
    spec_str=sa_openapi_spec_str, # Fill this with an OpenAPI spec
    spec_str_type="json",
    auth_scheme=auth_scheme,
    auth_credential=auth_credential,
)
```

{{% alert context="success" %}}
**故障排除身份验证错误**

如果您收到身份验证错误，请验证您的服务账户在目标服务上是否具有“Cloud Run Invoker”或同等角色。
{{% /alert %}}
##### 关键要点 {#key-takeaways}

* **受众要求**：`audience` 是一个安全功能，将令牌绑定到特定目标，防止令牌被“重放”到其他服务。

* **不自动刷新**：与标准 OAuth2 用户访问令牌不同，服务账户 ID 令牌是在请求时获取的。它们不会在后台定时自动刷新。

* **流程**：您定义意图，ADK 处理握手，从 Google 的身份验证服务器获取令牌，并将其注入到您的出站 HTTP 头中。

##### ServiceAccount 配置参数 {#serviceaccount-configuration-parameters}

* `service_account_credential` 提供 `ServiceAccountCredential` 对象，或持有服务账户 JSON 密钥文件内容的字典。若您在本地或 Google Cloud 外运行，请使用此设置。除非 `use_default_credential` 设置为 `True`，否则此项为必需。

* `use_default_credential`（可选）：设置为 True 可使用应用程序默认凭据（ADC）。如果您的 Agent 已在 Google Cloud 内运行（例如在 Cloud Run 或 Cloud Functions 上），建议使用此方法，因为无需本地密钥文件。

* `use_id_token`（IAM 必需）：设置为 True 来启用基于 ID 令牌的身份验证。这会将 ADK 从为 Google API 请求访问令牌切换为为您自己的 IAM 受保护服务请求 ID 令牌。

* `audience`（use_id_token=True 时必需）：您要调用的服务的 URL，例如 `https://my-service.run.app`。这是一个安全绑定，确保令牌仅对该特定目标有效。

* `scopes`：在请求 Google Cloud API（如 Drive 或 BigQuery）的访问令牌时使用。请求含 `service_account_credential` 的访问令牌时必需。如果您使用 ID 令牌进行私有服务身份验证，则无需设置此项。配合 `use_default_credential=True`，`scopes` 默认为广泛的 `cloud-platform` 范围；在生产部署中，仅设置工具所需的范围。

{{% alert context="warning" %}}
**将 `use_id_token` 与 `audience` 配合使用**

始终将 `use_id_token=True` 和 `audience` 一起使用。如果设置了 `use_id_token=True` 而没有 `audience`，ADK 会抛出错误。如果单独设置 `audience`，ADK 会静默忽略 `audience` 的安全绑定，并请求访问令牌而不是 ID 令牌。
{{% /alert %}}
#### 使用外部访问令牌`external_access_token_key` 功能允许您的 Agent 使用运行时环境提供的现有访问令牌，例如前端应用提供的令牌，而不是启动新的认证流程。配置后，凭证管理器会跳过标准的 OAuth 流程。相反，它会在 Agent 的 `tool_context.state` 中检索密钥，并直接使用该令牌进行身份验证。 {#use-external-access-tokens}
请在 Google 服务工具集的凭证配置中设置此字段，例如 `BigQueryCredentialsConfig`、`SpannerCredentialsConfig`、`PubSubCredentialsConfig` 或 `GCSCredentialsConfig`。
该配置参数的使用是互斥的，且在同一配置块中不能包含 `credentials`、`client_id`、`client_secret` 或 scopes 参数。
请在所使用工具集的凭证配置中设置密钥。以下示例使用 BigQuery：

```python
from google.adk.integrations.bigquery import BigQueryCredentialsConfig
from google.adk.integrations.bigquery import BigQueryToolset

# 配置工具集以在会话状态中查找 "my_frontend_token"
credentials_config = BigQueryCredentialsConfig(
    # 不要在生产代码中硬编码认证密钥
    external_access_token_key="my_frontend_token"
)
bigquery_toolset = BigQueryToolset(credentials_config=credentials_config)
```

#### 身份验证请求流程 {#authentication-request-flow}

此图展示了端到端的身份验证握手流程，追踪从初始用户查询到 ADK 捕获凭据请求、处理重定向流程并在授权后重试工具调用的路径。

![Authentication](/images/adk/auth_part1.svg)

### 在工具集级别进行身份验证 {#authenticate-at-a-toolset-level}

支持版本：Python v1.24.0。

与其单独验证每个工具，不如一次性在工具集级别验证整个工具套件。
在后台，`BaseLlmFlow` 会在列出或执行任何工具之前自动检查你的 `BaseToolset` 的身份验证要求；它通过检查工具集的 `get_auth_config()` 方法来实现这一点。
如果你的工具集返回 `AuthConfig` 对象且会话中尚未拥有所需凭据，ADK 框架将执行以下步骤：

1. **暂停执行：** 安全地中止当前流程。
2. **请求凭据：** 向客户端发出 `adk_request_credential` 事件，类似于 [处理交互式 OAuth/OIDC 流程](#handle-the-interactive-oauthoidc-flow-client-side) 所描述的交互流程。

这种方法为一组相关工具提供了一个集中定义身份验证要求的地方。框架处理身份验证程序，确保在 Agent 访问工具集中的工具之前解决必要的凭据。

#### 如何启用 {#how-to-enable-it}

要进行设置，请在自定义的 `BaseToolset` 子类中覆盖 `get_auth_config()` 方法：

```python
from google.adk.auth import AuthConfig
from google.adk.tools.base_toolset import BaseToolset

class MyAuthenticatedToolset(BaseToolset):
  async def get_tools(
      self, readonly_context: Optional[ReadonlyContext] = None
  ) -> list[BaseTool]:
    # ADK 在调用这个之前会从 get_auth_config() 获取凭证，
    # ，所以你在这里返回的工具可以依赖它。
    return []  # Replace with the tools in your toolset.

    return AuthConfig(
        auth_scheme=auth_scheme,
        raw_auth_credential=auth_credential,
    )
```

### 处理交互式 OAuth/OIDC 流程（客户端） {#handle-the-interactive-oauthoidc-flow-client-side}

如果一个工具需要用户登录/同意（通常是 OAuth 2.0 或 OIDC），ADK 框架会暂停执行并向您的 ***Agent Client*** 应用程序发送信号。有两种情况：

* ***Agent Client*** 应用程序直接在同一进程中运行 Agent（通过 `runner.run_async`），例如 UI 后端、CLI 应用或 Spark 作业等。
* ***Agent Client*** 应用程序通过 `/run` 或 `/run_sse` 端点与 ADK 的 fastapi 服务器交互。ADK 的 fastapi 服务器可以设置在与 ***Agent Client*** 应用程序相同的服务器或不同服务器上。

第二种情况是第一种情况的特殊情况，因为 `/run` 或 `/run_sse` 端点也会调用 `runner.run_async`。唯一的区别是：

* 是调用 Python 函数运行 Agent（第一种情况）还是调用服务端点运行 Agent（第二种情况）。
* 结果事件是内存对象（第一种情况）还是 HTTP 响应中的序列化 JSON 字符串（第二种情况）。

下面的部分重点介绍第一种情况，您应该能够非常直接地将其映射到第二种情况。如果必要，我们也会描述第二种情况需要处理的一些差异。

以下是您的客户端应用程序的逐步流程：

**步骤 1：运行 Agent 并检测授权请求**

* 使用 `runner.run_async` 启动 Agent 交互。
* 遍历生成的事件。
* 查找具有特殊名称 `adk_request_credential` 的函数调用事件。此事件表示需要用户交互。您可以使用辅助函数来识别该事件并提取必要信息。（对于第二种情况，逻辑类似。您可以从 HTTP 响应中反序列化事件）。

```python

# runner = Runner(...)
# session = await session_service.create_session(...)
# content = types.Content(...) # 用户的初始查询

print("\nRunning agent...")
events_async = runner.run_async(
    session_id=session.id, user_id='user', new_message=content
)

auth_request_function_call_id, auth_config = None, None

async for event in events_async:
    # 使用助手检查特定的授权请求事件
    if (auth_request_function_call := get_auth_request_function_call(event)):
        print("--> Authentication required by agent.")
        # 存储稍后响应所需的 ID
        if not (auth_request_function_call_id := auth_request_function_call.id):
            raise ValueError(f'Cannot get function call id from function call: {auth_request_function_call}')
        # 获取包含 auth_uri 等的 AuthConfig
        auth_config = get_auth_config(auth_request_function_call)
        break # Stop processing events for now, need user interaction

if not auth_request_function_call_id:
    print("\nAuth not required or agent finished.")
    # return # 或在接收到最终响应时处理
```

*辅助函数 `helpers.py`:*

```py
from google.adk.events import Event
from google.adk.auth import AuthConfig # Import necessary type
from google.genai import types

def get_auth_request_function_call(event: Event) -> types.FunctionCall:
    # 从事件中获取特殊的认证请求函数调用
    if not event.content or not event.content.parts:
        return
    for part in event.content.parts:
        if (
            part
            and part.function_call
            and part.function_call.name == 'adk_request_credential'
            and event.long_running_tool_ids
            and part.function_call.id in event.long_running_tool_ids
        ):

            return part.function_call

def get_auth_config(auth_request_function_call: types.FunctionCall) -> AuthConfig:
    # 从认证请求函数调用的参数中提取 AuthConfig 对象
    if not auth_request_function_call.args or not (auth_config := auth_request_function_call.args.get('authConfig')):
        raise ValueError(f'Cannot get auth config from function call: {auth_request_function_call}')
    if isinstance(auth_config, dict):
        auth_config = AuthConfig.model_validate(auth_config)
    elif not isinstance(auth_config, AuthConfig):
        raise ValueError(f'Cannot get auth config {auth_config} is not an instance of AuthConfig.')
    return auth_config
```

**步骤 2：重定向用户进行授权**

* 从上一步提取的 `auth_config` 中获取授权 URL（`auth_uri`）。
* **关键是，将您的应用程序** 的 redirect_uri 作为查询参数附加到此 `auth_uri`。此 `redirect_uri` 必须事先在您的 OAuth 提供商处注册（例如，[Google Cloud 控制台](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)，[Okta 管理面板](https://developer.okta.com/docs/guides/sign-into-web-app-redirect/spring-boot/main/#create-an-app-integration-in-the-admin-console))。
* 将用户引导到该完整 URL（例如，在他们的浏览器中打开）。

```py
# (在检测到需要认证后继续)

if auth_request_function_call_id and auth_config:
    # 从 AuthConfig 获取基本授权 URL
    base_auth_uri = auth_config.exchanged_auth_credential.oauth2.auth_uri

    if base_auth_uri:
        redirect_uri = 'http://localhost:8000/callback' # MUST match your OAuth client app config
        # 附加 redirect_uri（生产环境中使用 urlencode）
        auth_request_uri = base_auth_uri + f'&redirect_uri={redirect_uri}'
        # 现在你需要将最终用户重定向到这个 auth_request_uri，或者让他们在浏览器中打开这个 auth_request_uri
        # 这个 auth_request_uri 应由相应的授权提供者提供，最终用户需要登录并授权你的应用访问他们的数据
        # 然后授权提供者会将最终用户重定向到你提供的 redirect_uri
        # 下一步：从用户（或你的 Web 服务器处理程序）获取这个回调 URL
    else:
         print("ERROR: Auth URI not found in auth_config.")
         # 处理错误
```

**步骤 3. 处理重定向回调（客户端）：**

* 您的应用程序必须有一个机制（例如，在 `redirect_uri` 上的网络服务器路由）来接收用户在使用提供方授权应用程序后返回。
* 提供方将用户重定向到您的 `redirect_uri`，并在 URL 中以查询参数附加 `authorization_code`（以及可能的 `state`、`scope`）。
* 捕获来自此传入请求的**完整回调 URL**。
* （此步骤发生在主 Agent 执行循环之外，在您的网络服务器或等效的回调处理器中。）

**步骤 4. 将认证结果发送回 ADK（客户端）：**

* 一旦您拥有完整的回调 URL（包含授权码），检索在客户端步骤 1 中保存的 `auth_request_function_call_id` 和 `auth_config` 对象。
* 将捕获的回调 URL 设置到 `exchanged_auth_credential.oauth2.auth_response_uri` 字段。同时确保 `exchanged_auth_credential.oauth2.redirect_uri` 包含您使用的重定向 URI。
* 创建一个 `types.Content` 对象，其中包含一个 `types.Part`，对应一个 `types.FunctionResponse`。
      * 将 `name` 设置为 `"adk_request_credential"`。（注意：这是 ADK 用于继续认证的特殊名称。不要使用其他名称。）
      * 将 `id` 设置为您保存的 `auth_request_function_call_id`。
      * 将 `response` 设置为*序列化后的*（例如 `.model_dump()`）更新的 `AuthConfig` 对象。
* 对同一个会话 **再次** 调用 `runner.run_async`，传递此 `FunctionResponse` 内容作为 `new_message`。

```py
# (在用户交互后继续)

    # 模拟获取回调 URL（例如，从用户粘贴或网页处理程序）
    auth_response_uri = await get_user_input(
        f'Paste the full callback URL here:\n> '
    )
    auth_response_uri = auth_response_uri.strip() # Clean input

    if not auth_response_uri:
        print("Callback URL not provided. Aborting.")
        return

    # 使用回调详细信息更新收到的 AuthConfig
    auth_config.exchanged_auth_credential.oauth2.auth_response_uri = auth_response_uri
    # 还要包括使用的 redirect_uri，因为令牌交换可能需要它
    auth_config.exchanged_auth_credential.oauth2.redirect_uri = redirect_uri

    # 构建 FunctionResponse 内容对象
    auth_content = types.Content(
        role='user', # Role can be 'user' when sending a FunctionResponse
        parts=[
            types.Part(
                function_response=types.FunctionResponse(
                    id=auth_request_function_call_id,       # Link to the original request
                    name='adk_request_credential', # Special framework function name
                    response=auth_config.model_dump() # Send back the *updated* AuthConfig
                )
            )
        ],
    )

    # --- 恢复执行 ---
    print("\nSubmitting authentication details back to the agent...")
    events_async_after_auth = runner.run_async(
        session_id=session.id,
        user_id='user',
        new_message=auth_content, # Send the FunctionResponse back
    )

    # --- 处理最终 Agent 输出 ---
    print("\n--- Agent Response after Authentication ---")
    async for event in events_async_after_auth:
        # 正常处理事件，现在预计工具调用会成功
        print(event) # Print the full event for inspection
```

{{% alert context="info" %}}
**注意：带恢复功能的授权响应**

如果您的 ADK Agent 工作流配置了 [Resume](/docs/adk/run/agent-runtime/resume-agents/) 功能，您还必须在授权响应中包含 Invocation ID (`invocation_id`) 参数。您提供的 Invocation ID 必须与生成授权请求的调用相同，否则系统会使用授权响应启动一个新的调用。如果您的 Agent 使用恢复功能，建议在授权请求中将 Invocation ID 作为参数包含，以便可以在授权响应中包含它。有关使用恢复功能的更多详细信息，请参阅 [Resume stopped agents](/docs/adk/run/agent-runtime/resume-agents/)。
{{% /alert %}}
**第 5 步：ADK 处理令牌交换与工具重试并获取工具结果**

* ADK 收到用于 `adk_request_credential` 的 `FunctionResponse`。
* 它使用更新后的 `AuthConfig` 中的信息（包括包含代码的回调 URL）与提供商的令牌端点执行 OAuth **令牌交换**，获取访问令牌（可能还包括刷新令牌）。
* ADK 在内部通过将这些令牌设置在会话状态中来使其可用。
* ADK **自动重试**原始工具调用（即由于缺少授权而最初失败的调用）。
* 这一次，工具通过 `tool_context.get_auth_response(auth_config)` 找到有效令牌，并成功执行经过身份验证的 API 调用。
* Agent 从工具接收实际结果并生成最终的用户响应。
授权响应流的序列图，其中 ***Agent Client*** 返回授权响应并且 ADK 重试工具，如下所示：

![Authentication](/images/adk/auth_part2.svg)

## 构建需要身份验证的自定义工具 (`FunctionTool`) {#build-custom-tools-functiontool-requiring-authentication}

本节重点是在创建新的 ADK 工具时，在自定义 Python 函数 *内部* 实现身份验证逻辑。我们将以 `FunctionTool` 为例进行实现。

{{% alert context="success" %}}
**自动凭据处理**

实验性的 `AuthenticatedFunctionTool` 在 `google.adk.tools.authenticated_function_tool` 中接收 `AuthConfig` 并将可直接使用的凭据作为 `credential` 参数传递给您的函数。
{{% /alert %}}
### 前提条件 {#prerequisites}

您的函数签名 *必须* 包含 [`tool_context: ToolContext`](/docs/adk/components/custom-tools/#tool-context)。ADK 会自动注入此对象，提供对状态和身份验证机制的访问。

```py
from google.adk.tools import FunctionTool, ToolContext
from typing import Dict

def my_authenticated_tool_function(param1: str, tool_context: ToolContext) -> dict:
    # ... 你的逻辑 ...
    pass

my_tool = FunctionTool(func=my_authenticated_tool_function)
```

### 工具功能中的认证逻辑 {#authentication-logic-within-the-tool-function}

在你的函数中实现以下步骤：

**步骤1：检查缓存的有效凭证：**

在你的工具函数中，首先检查是否已有有效的凭证（例如访问令牌或刷新令牌）从该会话的先前运行中存储。将当前会话的凭证存储在 `tool_context.state`（一个状态字典）中。通过 `tool_context.state.get(credential_name, None)` 检查现有的凭证。

```py
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# 在你的工具功能内部
TOKEN_CACHE_KEY = "my_tool_tokens" # Choose a unique key
SCOPES = ["scope1", "scope2"] # Define required scopes

creds = None
cached_token_info = tool_context.state.get(TOKEN_CACHE_KEY)
if cached_token_info:
    try:
        creds = Credentials.from_authorized_user_info(cached_token_info, SCOPES)
        if not creds.valid and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            tool_context.state[TOKEN_CACHE_KEY] = json.loads(creds.to_json()) # Update cache
        elif not creds.valid:
            creds = None # Invalid, needs re-auth
            tool_context.state[TOKEN_CACHE_KEY] = None
    except Exception as e:
        print(f"Error loading/refreshing cached creds: {e}")
        creds = None
        tool_context.state[TOKEN_CACHE_KEY] = None

if creds and creds.valid:
    # 跳到步骤5：进行认证的 API 调用
    pass
else:
    # 继续到步骤2...
    pass
```

**步骤 2：检查客户端的认证响应**

* 如果步骤 1 没有生成有效凭证，请检查客户端是否刚通过调用 `exchanged_credential = tool_context.get_auth_response(auth_config)` 完成了交互流程。
* 这会返回客户端发送回的更新后的 `exchanged_credential` 对象（其中包含 `auth_response_uri` 中的回调 URL）。

```py
# 使用工具中配置的 auth_scheme 和 auth_credential。
# exchanged_credential: AuthCredential | None

exchanged_credential = tool_context.get_auth_response(AuthConfig(
  auth_scheme=auth_scheme,
  raw_auth_credential=auth_credential,
))
# 如果 exchanged_credential 不为 None，则表示已经从身份验证响应中获得了交换凭证。
if exchanged_credential:
   # ADK 已经为我们交换了访问令牌
        access_token = exchanged_credential.oauth2.access_token
        refresh_token = exchanged_credential.oauth2.refresh_token
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=auth_scheme.flows.authorizationCode.tokenUrl,
            client_id=auth_credential.oauth2.client_id,
            client_secret=auth_credential.oauth2.client_secret,
            scopes=list(auth_scheme.flows.authorizationCode.scopes.keys()),
        )
    # 将令牌缓存到会话状态中并调用 API，跳到步骤 5
```

**步骤3：启动身份验证请求**

如果未找到有效的凭据（步骤1）且未找到身份验证响应（步骤2），工具需要启动OAuth流程。定义AuthScheme和初始AuthCredential，并调用`tool_context.request_credential()`。返回指示需要授权的响应。

```py
# 使用工具中配置的 auth_scheme 和 auth_credential。

def my_authenticated_tool_function(tool_context: ToolContext) -> dict:
    tool_context.request_credential(AuthConfig(
        auth_scheme=auth_scheme,
        raw_auth_credential=auth_credential,
    ))
    return {'pending': True, 'message': 'Awaiting user authentication.'}

# 通过设置 request_credential，ADK 会检测到一个待处理的身份验证事件。它会暂停执行并要求最终用户登录。
```

**步骤4：用授权码交换令牌**

ADK 会自动生成 OAuth 授权 URL 并将其提供给你的 ***Agent Client*** 应用程序。你的 ***Agent Client*** 应用程序应按照 [使用经过身份验证的工具构建智能 Agent 应用程序](#build-agentic-applications-with-authenticated-tools) 中描述的方法，将用户重定向到授权 URL（附加 `redirect_uri`）。一旦用户完成登录流程，ADK 会从 ***Agent Client*** 应用程序中提取身份验证回调 URL，自动解析授权码，并生成授权令牌。在下一次工具调用中，第 2 步中的 `tool_context.get_auth_response` 将包含可在后续 API 调用中使用的有效凭证。

**步骤5：缓存获取的凭证**

在成功从 ADK 获取令牌（第 2 步）或令牌仍然有效（第 1 步）后，**立即将新的 `Credentials` 对象存储** 在 `tool_context.state` 中（序列化，例如，作为 JSON），使用你的缓存键。

```py
# 在你的工具函数内，在获取到“creds”（无论是刷新过的还是新交换的）之后
# 缓存新的/刷新的令牌
tool_context.state[TOKEN_CACHE_KEY] = json.loads(creds.to_json())
print(f"DEBUG: Cached/updated tokens under key: {TOKEN_CACHE_KEY}")
# 继续进行第6步（发起 API 调用）
```

**第6步：进行已认证的 API 调用**

* 一旦你拥有一个有效的`Credentials`对象（来自步骤1或步骤4的`creds`），使用它通过适当的客户端库（例如`googleapiclient`、`requests`）进行对受保护 API 的实际调用。传递`credentials=creds`参数。
* 包括错误处理，尤其是`HttpError` 401/403，这可能意味着令牌在调用之间已过期或被撤销。如果遇到此类错误，考虑清除缓存的令牌（`tool_context.state.pop(...)`），并可能再次返回`auth_required`状态以强制重新认证。

```py
# 在你的工具函数内，使用有效的 'creds' 对象
# 在继续之前确保 creds 有效
if not creds or not creds.valid:
   return {"status": "error", "error_message": "Cannot proceed without valid credentials."}

try:
   service = build("calendar", "v3", credentials=creds) # Example
   api_result = service.events().list(...).execute()
   # 继续到步骤 7
except Exception as e:
   # 处理 API 错误（例如，检查 401/403，可能需要清除缓存并重新请求认证）
   print(f"ERROR: API call failed: {e}")
   return {"status": "error", "error_message": f"API call failed: {e}"}
```

**步骤7：返回工具结果**

* 在 API 调用成功后，将结果处理为对 LLM 有用的字典格式。
* **关键是，必须包括一个** `status` 字段及其数据。

```py
# 在你的工具函数中，API 调用成功后
    processed_result = [...] # Process api_result for the LLM
    return {"status": "success", "data": processed_result}
```

<details>
<summary>完整代码</summary>

{{< tabs tabTotal="4" >}}
{{% tab tabName="Tools and Agent" %}}

 ```py title="tools_and_agent.py"
 # Copyright 2026 Google LLC
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # 除非遵守许可协议，否则您不得使用此文件。
 # 您可以在以下位置获取许可副本
 #
 #     http://www.apache.org/licenses/LICENSE-2.0
 #
 # 除非适用法律要求或书面约定，否则根据许可协议分发的软件
 # 按“原样”提供
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # 请参阅许可协议以了解管理权限和
 # limitations under the License.

 import os

 from google.adk.auth.auth_schemes import OpenIdConnectWithConfig
 from google.adk.auth.auth_credential import AuthCredential, AuthCredentialTypes, OAuth2Auth
 from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset
 from google.adk.agents.llm_agent import LlmAgent

 # --- 认证配置---
 # 本节配置 Agent 如何使用OpenID Connect（OIDC）进行身份验证，
 # 通常叠加在 OAuth 2.0 之上。

 # 使用 OpenID Connect 定义认证方案。
 # 该对象告诉 ADK*如何*执行OIDC/OAuth2流程。
 # 它需要针对你的身份提供者（IDP）提供特定信息，比如 Google OAuth、Okta、Auth0等。
 # 注意：将示例Okta的URL和凭证替换为你的实际IDP信息。
 # 以下所有字段均为必填，且可从您的IDP处获取。
 auth_scheme = OpenIdConnectWithConfig(
     # IDP授权端点的URL，用户被重定向登录。
     authorization_endpoint="https://your-endpoint.okta.com/oauth2/v1/authorize",
     # IDP的令牌端点的URL，授权码交换令牌。
     token_endpoint="https://your-token-endpoint.okta.com/oauth2/v1/token",
     # 你的应用请求的权限范围（权限）。
     # “openid”是OIDC的标准配置。“个人资料”和“邮件”请求用户个人资料信息。
     scopes=['openid', 'profile', "email"]
 )

 # 为你的具体应用定义认证凭证。
 # 该对象保存着你的应用程序所使用的客户端标识符和秘密信息
 # 在 OAuth2 流中向 IDP 识别自己。
 # !!安全警告：避免在生产代码中硬编码秘密。!!
 # !!建议使用环境变量或秘密管理系统。!!
 auth_credential = AuthCredential(
   auth_type=AuthCredentialTypes.OPEN_ID_CONNECT,
   oauth2=OAuth2Auth(
     client_id="CLIENT_ID",
     client_secret="CLIENT_SECRET",
   )
 )

 # --- OpenAPI Specification --- 工具集配置
 # 本节定义了 Agent 可用的一组示例工具，配置为认证
 # 从楼上看。
 # 这组示例工具使用了由 Okta 保护的端点，并要求 OpenID Connect 流程
 # 获取终端用户凭证。
 with open(os.path.join(os.path.dirname(__file__), 'spec.yaml'), 'r') as f:
     spec_content = f.read()

 userinfo_toolset = OpenAPIToolset(
    spec_str=spec_content,
    spec_str_type='yaml',
    # ** 关键是，将认证方案和凭证与这些工具关联起来。**
    # 这告诉 ADK，这些工具需要定义的OIDC/OAuth2流程。
    auth_scheme=auth_scheme,
    auth_credential=auth_credential,
 )

 # --- Agent 配置---
 # 配置并创建主 LLMAgent。
 root_agent = LlmAgent(
     model='gemini-2.0-flash',
     name='enterprise_assistant',
     instruction='Help user integrate with multiple enterprise systems, including retrieving user information which may require authentication.',
     tools=[userinfo_toolset],
 )

 # --- 准备使用---
 # “root_agent”现在配置了受OIDC/OAuth2认证保护的工具。
 # 当 Agent 尝试使用这些工具时，ADK 框架会自动
 # 触发由“auth_scheme”和“auth_credential”定义的认证流程
 # 如果会话中没有有效的凭证。
 # 后续的交互流程将引导用户完成登录流程和处理
 # 令牌交换，并自动将交换的令牌附加到定义的端点
 # 工具。
 ```

{{% /tab %}}
{{% tab tabName="Agents CLI" %}}

 ```py title="agent_cli.py"
 # Copyright 2026 Google LLC
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # 除非遵守许可协议，否则您不得使用此文件。
 # 您可以在以下位置获取许可副本
 #
 #     http://www.apache.org/licenses/LICENSE-2.0
 #
 # 除非适用法律要求或书面约定，否则根据许可协议分发的软件
 # 按“原样”提供
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # 请参阅许可协议以了解管理权限和
 # limitations under the License.

 import asyncio
 from dotenv import load_dotenv
 from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
 from google.adk.runners import Runner
 from google.adk.sessions import InMemorySessionService
 from google.genai import types

 from .helpers import is_pending_auth_event, get_function_call_id, get_function_call_auth_config, get_user_input
 from .tools_and_agent import root_agent

 load_dotenv()

 agent = root_agent

 async def async_main():
   """
   Main asynchronous function orchestrating the agent interaction and authentication flow.
   """
   # --- 步骤1：服务初始化---
   # 使用内存内服务进行会话和 Artifact 存储（适合演示/测试）。
   session_service = InMemorySessionService()
   artifacts_service = InMemoryArtifactService()

   # 创建一个新用户会话以维持对话状态。
   session = await session_service.create_session(
       state={},  # Optional state dictionary for session-specific data
       app_name='my_app', # Application identifier
       user_id='user' # User identifier
   )

   # --- 第二步：初始用户查询---
   # 定义用户的初始请求。
   query = 'Show me my user info'
   print(f"user: {query}")

   # 将查询格式化为 ADK 运行者预期的内容结构。
   content = types.Content(role='user', parts=[types.Part(text=query)])

   # 初始化 ADKRunner
   runner = Runner(
       app_name='my_app',
       agent=agent,
       artifact_service=artifacts_service,
       session_service=session_service,
   )

   # --- 步骤3：发送查询并处理潜在的授权请求---
   print("\nRunning agent with initial query...")
   events_async = runner.run_async(
       session_id=session.id, user_id='user', new_message=content
   )

   # 变量用于在发生认证请求时存储详细信息。
   auth_request_event_id, auth_config = None, None

   # 遍历第一次运行时产生的事件。
   async for event in events_async:
     # 检查这个事件是否是特定的“adk_request_credential”函数调用。
     if is_pending_auth_event(event):
       print("--> Authentication required by agent.")
       auth_request_event_id = get_function_call_id(event)
       auth_config = get_function_call_auth_config(event)
       # 一旦找到并处理了认证请求，就退出这个循环。
       # 我们需要暂停执行，以便获取用户输入以进行认证。
       break

   # 如果处理完所有事件后未检测到认证请求，则退出。
   if not auth_request_event_id or not auth_config:
       print("\nAuthentication not required for this query or processing finished.")
       return # Exit the main function

   # --- 步骤4：手动认证步骤（模拟OAuth 2.0流程）---
   # 本节模拟了 OAuth 2.0 流程中的用户交互部分。
   # 在真实的网页应用中，这涉及浏览器重定向。

   # 定义重定向URI。这个URI*必须*匹配注册的URI
   # 与你的应用的OAuth提供者一起。提供者将用户发送给
   # 他们批准请求后再回来。
   redirect_uri = 'http://localhost:8000/dev-ui' # Example for local development

   # 构建用户必须访问的授权URL。
   # 这通常包括提供者的授权端点URL，
   # 客户端ID、请求的范围、响应类型（例如“代码”）以及重定向URI。
   # 这里，我们从 ADK 提供的AuthConfig中获取基础授权URI
   # 并附上redirect_uri。
   # 注意：一个稳健的实现会使用 urlencode，并可能添加状态、作用域等。
   auth_request_uri = (
       auth_config.exchanged_auth_credential.oauth2.auth_uri
       + f'&redirect_uri={redirect_uri}' # Simple concatenation; ensure correct query param format
   )

   print("\n--- User Action Required ---")
   # 提示用户访问授权URL，登录，授予权限，
   # 然后粘贴它们被重定向的*完整*URL（包含认证码）。
   auth_response_uri = await get_user_input(
       f'1. Please open this URL in your browser to log in:\n   {auth_request_uri}\n\n'
       f'2. After successful login and authorization, your browser will be redirected.\n'
       f'   Copy the *entire* URL from the browser\'s address bar.\n\n'
       f'3. Paste the copied URL here and press Enter:\n\n> '
   )

   # --- 步骤5：为 Agent 准备认证响应---
   # 用用户收集的信息更新 AuthConfig 对象。
   # ADK 框架需要完整的响应URI（包含代码）
   # 以及原始重定向URI以完成OAuth代币交换过程。
   auth_config.exchanged_auth_credential.oauth2.auth_response_uri = auth_response_uri
   auth_config.exchanged_auth_credential.oauth2.redirect_uri = redirect_uri

   # 构建一个 FunctionResponse Content 对象，发送回 Agent/运行者。
   # 该响应明确针对“adk_request_credential”函数调用
   # 此前通过其身份识别。
   auth_content = types.Content(
       role='user',
       parts=[
           types.Part(
               function_response=types.FunctionResponse(
                   # 关键是，使用保存的ID将此响应链接到原始请求。
                   id=auth_request_event_id,
                   # 我们正在响应的函数调用的特殊名称。
                   name='adk_request_credential',
                   # 包含所有必要认证信息的负载。
                   response=auth_config.model_dump(),
               )
           )
       ],
   )

   # --- 第6步：使用认证恢复执行 ---
   print("\nSubmitting authentication details back to the agent...")
   # 再次运行 Agent，这次提供 `auth_content`（FunctionResponse）。
   # ADK Runner 会拦截此请求，处理 'adk_request_credential' 响应
   # （执行令牌交换，存储凭证），然后允许 Agent
   # 重试原本需要身份验证的工具调用，现在成功使用
   # 嵌入的有效访问令牌。
   events_async = runner.run_async(
       session_id=session.id,
       user_id='user',
       new_message=auth_content, # Provide the prepared auth response
   )

   # 处理并打印 Agent 完成认证后的最终事件。
   # 此流现在包含工具的实际结果（例如用户信息）。
   print("\n--- Agent Response after Authentication ---")
   async for event in events_async:
     print(event)

 if __name__ == '__main__':
   asyncio.run(async_main())
 ```

{{% /tab %}}
{{% tab tabName="Helper" %}}

 ```py title="helpers.py"
 # Copyright 2025 Google LLC
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # 除非遵守许可协议，否则您不得使用此文件。
 # 您可以在以下位置获取许可副本
 #
 #     http://www.apache.org/licenses/LICENSE-2.0
 #
 # 除非适用法律要求或书面约定，否则根据许可协议分发的软件
 # 按“原样”提供
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # 请参阅许可协议以了解管理权限和
 # limitations under the License.

 from google.adk.auth import AuthConfig
 from google.adk.events import Event
 import asyncio

 # --- 辅助函数 ---
 async def get_user_input(prompt: str) -> str:
   """
   Asynchronously prompts the user for input in the console.

   Uses asyncio's event loop and run_in_executor to avoid blocking the main
   asynchronous execution thread while waiting for synchronous `input()`.

   Args:
     prompt: The message to display to the user.

   Returns:
     The string entered by the user.
   """
   loop = asyncio.get_event_loop()
   # 在由执行器管理的单独线程中运行阻塞的 `input()` 函数。
   return await loop.run_in_executor(None, input, prompt)

 def is_pending_auth_event(event: Event) -> bool:
   """
   Checks if an ADK Event represents a request for user authentication credentials.

   The ADK framework emits a specific function call ('adk_request_credential')
   when a tool requires authentication that hasn't been previously satisfied.

   Args:
     event: The ADK Event object to inspect.

   Returns:
     True if the event is an 'adk_request_credential' function call, False otherwise.
   """
   # 安全地检查嵌套属性，以避免在事件结构不完整时出错。
   return (
       event.content
       and event.content.parts
       and event.content.parts[0] # Assuming the function call is in the first part
       and event.content.parts[0].function_call
       # 指示来自 ADK 框架的身份验证请求的具体函数名称。
       and event.content.parts[0].function_call.name == 'adk_request_credential'
   )

 def get_function_call_id(event: Event) -> str:
   """
   Extracts the unique ID of the function call from an ADK Event.

   This ID is crucial for correlating a function *response* back to the specific
   function *call* that the agent initiated to request for auth credentials.

   Args:
     event: The ADK Event object containing the function call.

   Returns:
     The unique identifier string of the function call.

   Raises:
     ValueError: If the function call ID cannot be found in the event structure.
                 (Corrected typo from `contents` to `content` below)
   """
   # 浏览事件结构以查找函数调用 ID。
   if (
       event
       and event.content
       and event.content.parts
       and event.content.parts[0] # Use content, not contents
       and event.content.parts[0].function_call
       and event.content.parts[0].function_call.id
   ):
     return event.content.parts[0].function_call.id
   # 如果 ID 缺失，抛出错误以指示事件格式异常。
   raise ValueError(f'Cannot get function call id from event {event}')

 def get_function_call_auth_config(event: Event) -> AuthConfig:
   """
   Extracts the authentication configuration details from an 'adk_request_credential' event.

   Client should use this AuthConfig to necessary authentication details (like OAuth codes and state)
   and sent it back to the ADK to continue OAuth token exchanging.

   Args:
     event: The ADK Event object containing the 'adk_request_credential' call.

   Returns:
     An AuthConfig object populated with details from the function call arguments.

   Raises:
     ValueError: If the 'auth_config' argument cannot be found in the event.
                 (Corrected typo from `contents` to `content` below)
   """
   if (
       event
       and event.content
       and event.content.parts
       and event.content.parts[0] # Use content, not contents
       and event.content.parts[0].function_call
       and event.content.parts[0].function_call.args
       and event.content.parts[0].function_call.args.get('auth_config')
   ):
     # 使用参数中提供的字典重建 AuthConfig 对象。
     # ** 运算符将字典解包为构造函数的关键字参数。
     return AuthConfig(
           **event.content.parts[0].function_call.args.get('auth_config')
       )
   raise ValueError(f'Cannot get auth config from event {event}')
 ```

{{% /tab %}}
{{% tab tabName="Spec" %}}

 ```yaml
 openapi: 3.0.1
 info:
 title: Okta User Info API
 version: 1.0.0
 description: |-
    API to retrieve user profile information based on a valid Okta OIDC Access Token.
    Authentication is handled via OpenID Connect with Okta.
 contact:
    name: API Support
    email: support@example.com # Replace with actual contact if available
 servers:
 - url: <substitute with your server name>
    description: Production Environment
 paths:
 /okta-jwt-user-api:
    get:
       summary: Get Authenticated User Info
       description: |-
       Fetches profile details for the user
       operationId: getUserInfo
       tags:
       - User Profile
       security:
       - okta_oidc:
             - openid
             - email
             - profile
       responses:
       '200':
          description: Successfully retrieved user information.
          content:
             application/json:
             schema:
                type: object
                properties:
                   sub:
                   type: string
                   description: Subject identifier for the user.
                   example: "abcdefg"
                   name:
                   type: string
                   description: Full name of the user.
                   example: "Example LastName"
                   locale:
                   type: string
                   description: User's locale, e.g., en-US or en_US.
                   example: "en_US"
                   email:
                   type: string
                   format: email
                   description: User's primary email address.
                   example: "username@example.com"
                   preferred_username:
                   type: string
                   description: Preferred username of the user (often the email).
                   example: "username@example.com"
                   given_name:
                   type: string
                   description: Given name (first name) of the user.
                   example: "Example"
                   family_name:
                   type: string
                   description: Family name (last name) of the user.
                   example: "LastName"
                   zoneinfo:
                   type: string
                   description: User's timezone, e.g., America/Los_Angeles.
                   example: "America/Los_Angeles"
                   updated_at:
                   type: integer
                   format: int64 # Using int64 for Unix timestamp
                   description: Timestamp when the user's profile was last updated (Unix epoch time).
                   example: 1743617719
                   email_verified:
                   type: boolean
                   description: Indicates if the user's email address has been verified.
                   example: true
                required:
                   - sub
                   - name
                   - locale
                   - email
                   - preferred_username
                   - given_name
                   - family_name
                   - zoneinfo
                   - updated_at
                   - email_verified
       '401':
          description: Unauthorized. The provided Bearer token is missing, invalid, or expired.
          content:
             application/json:
             schema:
                $ref: '#/components/schemas/Error'
       '403':
          description: Forbidden. The provided token does not have the required scopes or permissions to access this resource.
          content:
             application/json:
             schema:
                $ref: '#/components/schemas/Error'
 components:
 securitySchemes:
    okta_oidc:
       type: openIdConnect
       description: Authentication via Okta using OpenID Connect. Requires a Bearer Access Token.
       openIdConnectUrl: https://your-endpoint.okta.com/.well-known/openid-configuration
 schemas:
    Error:
       type: object
       properties:
       code:
          type: string
          description: An error code.
       message:
          type: string
          description: A human-readable error message.
       required:
          - code
          - message
 ```

{{% /tab %}}
{{< /tabs >}}
</details>

---

原文：[Authenticating with tools](https://adk.dev/tools-custom/authentication/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/authentication.md)
