---
title: "环境模拟"
description: "在评估依赖外部资源的 Agent（例如 API、数据库或第三方服务）时，实时运行这些工具进行测试可能会慢、成本高或不可靠。**环境模拟器**允许"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v1.24.0。

在评估依赖外部服务（如 API、数据库或第三方服务）的 Agent 时，在测试过程中实时运行这些工具可能会很慢、成本高或不可靠。**环境模拟器**允许您在 Agent 执行过程中安全地拦截这些工具调用，并用可控的、确定性的响应替换它们，而无需修改 Agent 本身。这种方法可以填补 Agent 改进循环中的关键空白，使您能够创建封闭的、离线的测试运行，从而隔离 Agent 逻辑以获得可靠的评分。

总体而言，此功能可以使您：

* 测试 Agent 如何处理 API 错误或边缘情况响应。
* 在离线情况下运行评估，无需访问实时后端。
* 使用大型语言模型（LLM）自动生成逼真的模拟响应。
* 通过设置随机注入种子生成可重复的测试运行。

环境模拟与 ADK 的工具执行管道集成，通过 [`before_tool_callback`](/docs/adk/components/app-management/callbacks/types-of-callbacks/#tool-execution-callbacks) hook] 或 [插件系统 ](/docs/adk/components/app-management/plugins/)，因此无需对您的 Agent 代码进行任何更改。

## 工作原理 {#how-it-works}

当 [用户模拟 ](/docs/adk/run/evaluation/user-simulation/) 推动对话进行时，环境模拟提供稳定的后端。从高层次来看，环境模拟器位于 Agent 与其工具之间。当 Agent 调用工具时，模拟器会拦截调用，并决定是返回合成响应（预定义注入或 LLM 生成的模拟响应）还是执行真实工具。

每个配置工具的决策逻辑遵循以下顺序：

1. **注入配置** 优先检查，按顺序进行。如果找到匹配的注入（基于参数匹配和概率），则立即返回其错误或响应。
2. **模拟策略** 如果没有符合条件的注入配置，则作为备用。模拟器调用 LLM 根据工具的模式和任何有状态上下文生成逼真的响应。
3. **无操作**（`None`）如果工具未在模拟器配置中，则允许真实工具正常执行。

## 集成 {#integration}

`EnvironmentSimulationFactory` 类提供两个集成点：

* `create_callback()` — 返回异步可调用对象，可用作任何 `LlmAgent` 上的 `before_tool_callback`。
* `create_plugin()` — 返回一个 `EnvironmentSimulationPlugin` 实例，可与 ADK 插件系统集成。

### 用作回调 {#using-as-a-callback}

以下示例展示了如何将环境模拟创建为 adk Agent 回调之一。

```python
from google.adk.agents import LlmAgent
from google.adk.tools.environment_simulation import EnvironmentSimulationFactory
from google.adk.tools.environment_simulation.environment_simulation_config import (
    EnvironmentSimulationConfig,
    InjectedError,
    InjectionConfig,
    ToolSimulationConfig,
)

config = EnvironmentSimulationConfig(
    tool_simulation_configs=[
        ToolSimulationConfig(
            tool_name="get_user_profile",
            injection_configs=[
                InjectionConfig(
                    injected_error=InjectedError(
                        injected_http_error_code=503,
                        error_message="Service temporarily unavailable.",
                    )
                )
            ],
        )
    ]
)

agent = LlmAgent(
    name="my_agent",
    model="gemini-flash-latest",
    tools=[get_user_profile],
    before_tool_callback=EnvironmentSimulationFactory.create_callback(config),
)
```

### 作为插件使用 {#using-as-a-plugin}

以下示例演示如何将环境模拟创建为 ADK Agent 插件。

```python
from google.adk.apps import App
from google.adk.tools.environment_simulation import EnvironmentSimulationFactory
from google.adk.tools.environment_simulation.environment_simulation_config import (
    EnvironmentSimulationConfig,
    MockStrategy,
    ToolSimulationConfig,
)

config = EnvironmentSimulationConfig(
    tool_simulation_configs=[
        ToolSimulationConfig(
            tool_name="search_products",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        )
    ]
)

app = App(
    name="my_app",
    root_agent=my_agent,
    plugins=[EnvironmentSimulationFactory.create_plugin(config)],
)
```

## 配置参考 {#configuration-reference}

您可以使用一组数据类来配置环境模拟器。以下各节提供每个配置对象的详细参考。

### `EnvironmentSimulationConfig` {#environmentsimulationconfig}

顶级配置对象。

字段                            | 类型                         | 默认值              | 描述
:------------------------------- | :--------------------------- | :------------------- | :----------
`tool_simulation_configs`        | `List[ToolSimulationConfig]` | 必填             | 每个要模拟的工具一条条目。不能为空，且工具名称必须唯一。
`simulation_model`               | `str`                        | `"gemini-flash-latest"` | 用于工具连接分析和模拟响应生成的 LLM。
`simulation_model_configuration` | `GenerateContentConfig`      | 启用思考     | 内部模拟器调用的 LLM 生成配置。
`environment_data`               | `str \| None`                | `None`               | 可选的环境上下文（例如，JSON数据库快照），传递给模拟策略以生成更真实的响应。
`tracing`                        | `str \| None`                | `None`               | 跟踪数据（例如，先前 Agent 运行的JSON字符串格式的跟踪）以提供历史上下文。

### `ToolSimulationConfig` {#toolsimulationconfig}

定义单个命名工具应如何模拟。

字段                | 类型                    | 默认值                     | 描述
:------------------- | :---------------------- | :-------------------------- | :----------
`tool_name`          | `str`                   | 必填                    | 必须与工具注册名称完全匹配。
`injection_configs`  | `List[InjectionConfig]` | `[]`                        | 零个或多个注入配置，在模拟策略之前按顺序检查。
`mock_strategy_type` | `MockStrategy`          | `MOCK_STRATEGY_UNSPECIFIED` | 当没有触发注入时的回退策略。

### `InjectionConfig` {#injectionconfig}

控制单个可注入到工具调用的合成响应。
`injected_error` 或 `injected_response` 必须设置且只能设置其中一个。字段                       | 类型                      | 默认值 | 描述
:------------------------- | :----------------------- | :------ | :----------
`injected_error`           | `InjectedError \| None`  | `None`  | 返回的错误（与 `injected_response` 互斥）。
`injected_response`        | `Dict[str, Any] \| None` | `None`  | 返回的固定响应字典（与 `injected_error` 互斥）。
`injection_probability`    | `float`                  | `1.0`   | `[0.0, 1.0]` 的概率，此注入是否触发。
`match_args`               | `Dict[str, Any] \| None` | `None`  | 如果设置，注入仅在工具的参数包含 `match_args` 中的所有键值对时才触发。
`injected_latency_seconds` | `float`                  | `0.0`   | 在返回注入结果之前添加的人工延迟（≤ 120 秒）。
`random_seed`              | `int \| None`            | `None`  | 概率检查的种子，使注入行为可确定。

### `InjectedError` {#injectederror}

定义 HTTP 风格的错误响应。

| 字段                       | 类型  | 描述                             |
| :------------------------- | :---- | :-------------------------------------- |
| `injected_http_error_code` | `int` | 在工具响应中显示为 `"error_code"` 的 HTTP 状态码 |
| `error_message`            | `str` | 在工具响应中显示为 `"error_message"` 的可读消息 |

### `MockStrategy` {#mockstrategy}

枚举控制在无注入触发时模拟器如何生成响应。

| 值                     | 描述                                     |
| :------------------------ | :---------------------------------------------- |
| `MOCK_STRATEGY_TOOL_SPEC` | 使用工具的模式和有状态上下文提示 LLM 生成真实响应 |
| `MOCK_STRATEGY_TRACING`   | *(已弃用)* 请使用 `MOCK_STRATEGY_TOOL_SPEC` 并带跟踪输入 |

## 注入模式 {#injection-mode}

使用注入配置测试特定的失败或边缘情况场景。注入按列表顺序评估；第一个满足 `match_args` 条件（且概率检查通过）的注入将被应用。

### 注入错误 {#injecting-errors}

以下示例演示如何向 Agent 注入具有特定错误代码和错误消息的错误。

```python
from google.adk.tools.environment_simulation.environment_simulation_config import (
    InjectedError,
    InjectionConfig,
    ToolSimulationConfig,
)

ToolSimulationConfig(
    tool_name="charge_payment",
    injection_configs=[
        InjectionConfig(
            injected_error=InjectedError(
                injected_http_error_code=402,
                error_message="Payment declined.",
            )
        )
    ],
)
```

Agent 将收到 `{"error_code": 402, "error_message": "Payment
declined."}`，而不是真实的工具结果，这允许您评估 Agent 如何处理支付失败。

### 注入固定响应 {#injecting-fixed-responses}

使用以下 InjectionConfig 来指定具有固定响应负载的成功响应。

```python
InjectionConfig(
    injected_response={"status": "ok", "order_id": "ORD-9999"}
)
```

### 带参数匹配的条件注入 {#conditional-injection-with-argument-matching}

仅在传递特定参数时使用 `match_args` 注入。

```python
InjectionConfig(
    match_args={"item_id": "ITEM-404"},
    injected_error=InjectedError(
        injected_http_error_code=404,
        error_message="Item not found.",
    ),
)
```

这里，错误仅在工具被调用时以 `item_id="ITEM-404"` 注入。所有其他调用则传递到下一个注入配置或模拟策略。

### 概率注入 {#probabilistic-injection}

将 `injection_probability` 设置为 `0.0` 和 `1.0` 之间的值，以模拟不稳定的行为。对于可复现的测试运行，请使用 `random_seed` 固定随机结果。

```python
InjectionConfig(
    injection_probability=0.3,
    random_seed=42,
    injected_error=InjectedError(
        injected_http_error_code=500,
        error_message="Internal server error.",
    ),
)
```

### 注入延迟 {#injecting-latency}

使用 `injected_latency_seconds` 模拟慢速后端响应，这对于测试超时处理或在性能降低条件下的用户体验非常有用。

```python
InjectionConfig(
    injected_latency_seconds=5.0,
    injected_response={"result": "slow but successful"},
)
```

### 组合多个注入配置 {#combining-multiple-injection-configs}

单个工具上的多个注入配置会按顺序检查。你可以将它们组合起来测试多种场景：

```python
ToolSimulationConfig(
    tool_name="get_inventory",
    injection_configs=[
        # 总是因特定缺货商品失败
        InjectionConfig(
            match_args={"sku": "OOS-001"},
            injected_response={"quantity": 0, "available": False},
        ),
        # 其他所有商品有20%的几率随机失败
        InjectionConfig(
            injection_probability=0.2,
            random_seed=7,
            injected_error=InjectedError(
                injected_http_error_code=503,
                error_message="Inventory service unavailable.",
            ),
        ),
    ],
)
```

## 模拟策略模式 {#mock-strategy-mode}

当你希望模拟器自动生成合理的响应，而不是返回手工制作的值时——使用 `MOCK_STRATEGY_TOOL_SPEC`。

模拟器使用大语言模型 (LLM) 来：

1. 分析 Agent 可以访问的所有工具的模式，并识别它们之间的*有状态依赖*（例如，一个 `create_order` 工具生成 `order_id`，而 `get_order` 使用它）。
2. 跟踪会话期间创建的 ID 和资源的**状态存储**。
3. 生成与工具模式和当前状态一致的响应——如果使用工具请求从未创建的资源，则返回类似 404 的错误。

```python
from google.adk.tools.environment_simulation.environment_simulation_config import (
    EnvironmentSimulationConfig,
    MockStrategy,
    ToolSimulationConfig,
)

config = EnvironmentSimulationConfig(
    tool_simulation_configs=[
        ToolSimulationConfig(
            tool_name="create_order",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        ),
        ToolSimulationConfig(
            tool_name="get_order",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        ),
        ToolSimulationConfig(
            tool_name="cancel_order",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        ),
    ]
)
```

使用此配置，当 `create_order` 被模拟时，模拟器将自动生成一个 `order_id`，并在随后调用 `get_order` 或 `cancel_order` 时，使用它返回一致的结果（或未找到错误）。

### 提供环境数据 {#providing-environment-data}

通过 `environment_data` 传递特定领域的上下文，使模拟响应更真实。这可以是表示数据库快照的 JSON 字符串，或任何 LLM 在生成响应时应使用的结构化上下文。

```python
import json

db_snapshot = {
    "products": [
        {"id": "P-001", "name": "Wireless Headphones", "price": 79.99, "stock": 12},
        {"id": "P-002", "name": "USB-C Hub", "price": 34.99, "stock": 0},
    ],
    "warehouse_location": "US-WEST-2",
}

config = EnvironmentSimulationConfig(
    tool_simulation_configs=[
        ToolSimulationConfig(
            tool_name="search_products",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        ),
    ],
    environment_data=json.dumps(db_snapshot),
)
```

LLM 将使用这些数据返回符合您领域的产品名称、价格和库存水平，而不是生成任意的占位值。

### 提供追踪数据 {#providing-tracing-data}

通过 `tracing` 提供在 Agent 中生成的追踪数据以进行模拟，以使模拟响应更真实。

```python
import json

agent_traces = [
    {
        "invocation_id": "inv-001",
        "user_content": {"role": "user", "parts": [{"text": "Search for high-end headphones"}]},
        "intermediate_data": {
            "tool_uses": [
                {
                    "name": "search_products",
                    "args": {"query": "high-end headphones"},
                    "response": {"products": [{"id": "P-123", "name": "Premium Wireless ANC Headphones"}]}
                }
            ]
        }
    }
]

config = EnvironmentSimulationConfig(
    tool_simulation_configs=[
        ToolSimulationConfig(
            tool_name="search_products",
            mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
        ),
    ],
    tracing=json.dumps(agent_traces),
)
```

大型语言模型将使用这些数据返回与您的领域匹配的产品名称、价格和库存水平，而不是生成任意的占位符值。

## 混合注入和模拟策略 {#mixing-injections-and-mock-strategy}

注入配置和模拟策略可以在同一工具上组合使用。注入总是首先被检查；只有在没有适用的注入时，模拟策略才会生效。

```python
ToolSimulationConfig(
    tool_name="send_notification",
    injection_configs=[
        # 始终对已知无效的收件人失败
        InjectionConfig(
            match_args={"recipient_id": "INVALID"},
            injected_error=InjectedError(
                injected_http_error_code=400,
                error_message="Invalid recipient.",
            ),
        ),
    ],
    # 对于所有其他收件人，生成一个合理的成功响应
    mock_strategy_type=MockStrategy.MOCK_STRATEGY_TOOL_SPEC,
)
```

---

原文：[Environment simulation for evaluations](https://adk.dev/evaluate/environment_simulation/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/evaluate/environment_simulation.md)
