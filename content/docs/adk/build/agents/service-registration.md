---
title: "服务注册"
description: "通过为会话、Artifact、内存和 Agent2Agent (A2A) 任务存储注册自定义服务，扩展 ADK 运行时功能。注册自定义服务允许您集成自己的后端系统和存储。"
icon: "article"
weight: 30
toc: true
---

支持版本：Python v1.34.0。

通过为会话、Artifact、内存和 Agent2Agent（A2A）任务存储注册自定义服务来扩展 ADK 运行时功能。注册自定义服务允许您将自己的后端系统和存储提供集成到您的 Agent 中。

使用以下任一方法注册自定义服务：

* **`services.yaml`**：用于使用简单构造函数实例化的服务的YAML配置文件。
* **`services.py`**：用于需要自定义初始化或复杂逻辑的服务的 Python 脚本。

## 使用`services.yaml`注册服务 {#register-services-with-servicesyaml}

使用`services.yaml`或`services.yml`文件注册使用简单构造函数实例化的服务（例如，`MyService(uri="...")`）。将此文件放置在 Agent 目录（用于`adk run`）或 Agent 根目录（用于`adk web`和`adk api_server`）。

在`services.yaml`中定义您的自定义服务：

```yaml
services:
  - scheme: mysession
    type: session
    class: my_custom_package.modules.MyCustomSessionService
  - scheme: myartifact
    type: artifact
    class: my_custom_package.storage.MyCustomArtifactService
  - scheme: mymemory
    type: memory
    class: my_custom_package.modules.MyCustomMemoryService
  - scheme: mytaskstore
    type: task_store
    class: my_custom_package.tasks.MyCustomTaskStore
```

`services.yaml` 文件支持以下属性：

* `scheme`：触发自定义服务的 URI 方案（例如，`mysession://`）。
* `type`：服务的类型，可以是 `session`、`artifact`、`memory` 或 `task_store`。
* `class`：服务实现的完全限定类名。

## 使用 `services.py` 注册服务 {#register-services-with-servicespy}

在以下情况下使用 `services.py` 文件，并将其放置在与 `services.yaml` 相同的位置：复杂初始化或当您需要对服务创建过程有更多控制时。

在 `services.py` 中注册自定义 `session`、`artifact` 和 `memory` 服务：

```python
from google.adk.cli.service_registry import get_service_registry
from my_custom_package.modules import MyCustomSessionService
from my_custom_package.storage import MyCustomArtifactService
from my_custom_package.memory import MyCustomMemoryService

def my_session_factory(uri: str, **kwargs):
    # 在此处添加您的自定义逻辑。
    return MyCustomSessionService(uri=uri, **kwargs)

def my_artifact_factory(uri: str, **kwargs):
    """Factory function to instantiate a custom artifact service."""
    return MyCustomArtifactService(uri=uri, **kwargs)

def my_memory_factory(uri: str, **kwargs):
    """Factory function to instantiate a custom memory service."""
    return MyCustomMemoryService(uri=uri, **kwargs)

# 检索注册表。
registry = get_service_registry()

# 注册会话、Artifact 和内存服务。
registry.register_session_service("mysession", my_session_factory)
registry.register_artifact_service("myartifact", my_artifact_factory)
registry.register_memory_service("mymemory", my_memory_factory)
```

示例脚本执行以下任务：

1. 导入 `get_service_registry` 以获取服务注册实例。
2. 定义工厂函数（例如 `my_session_factory`），这些函数接受 URI 和关键字参数，并返回自定义服务的实例。
3. 使用 `register_session_service`、`register_artifact_service` 和 `register_memory_service` 将工厂函数注册到所需的方案（例如 `mysession`）。

## 加载服务 {#load-services}

当您使用 ADK 命令行工具（`adk run`、`adk web` 或 `adk api_server`）运行 Agent 时，ADK 会自动从 `services.yaml`（或 `services.yml`）和 `services.py` 发现并加载自定义服务。

### 发现位置 {#discovery-locations}

ADK 根据您运行的命令定位配置文件：

*   **`adk run`**：在 Agent 目录中发现服务文件。
*   **`adk web` 和 `adk api_server`**：在传递给命令的 Agent 根目录中发现服务文件。

### 加载顺序和优先级 {#loading-order-and-precedence}

当目标目录中同时存在 `services.yaml` 和 `services.py` 时：

1.  **加载顺序**：ADK 先加载 `services.yaml`，然后加载 `services.py`。
2.  **优先级**：如果在两个文件中都定义了相同方案的服务，则 `services.py` 中的定义优先。

---

原文：[Service registration](https://adk.dev/agents/service-registration/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/agents/service-registration.md)
