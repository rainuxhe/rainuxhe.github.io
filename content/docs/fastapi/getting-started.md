---
title: "快速开始"
description: "创建最小应用、启动开发服务器，并理解模块之间的关系。"
icon: "rocket_launch"
weight: 10
toc: true
---

## 安装依赖

演示使用 `uv` 管理项目依赖：

```shell
uv init bookstack-api
cd bookstack-api
uv add "fastapi[standard]"
```

`fastapi[standard]` 会一并安装开发服务器所需的 Uvicorn 等依赖。

## 创建应用

新建 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI(title="Bookstack API")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

启动开发服务器：

```shell
uv run fastapi dev main.py
```

访问 `http://127.0.0.1:8000/health`，应得到：

```json
{"status": "ok"}
```

## 阅读顺序

建议先看请求数据的声明与校验，再理解依赖注入如何复用认证、数据库连接等横切逻辑。涉及数据库调用时，务必确认同步驱动不会阻塞事件循环。

{{< alert context="info" text="FastAPI 的自动文档由 OpenAPI Schema 驱动。类型标注和响应模型既是运行时契约，也是接口文档来源。" />}}
