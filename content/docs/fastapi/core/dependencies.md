---
title: "依赖注入"
description: "用可测试的依赖组织认证、数据库会话和共享参数。"
icon: "account_tree"
weight: 30
toc: true
---

## 声明依赖

依赖可以是一个函数，也可以是一个可调用对象。FastAPI 会解析其参数并复用同一请求内缓存的结果。

```python
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
```

在路由中使用：

```python
@app.get("/items")
async def list_items(session: SessionDep) -> list[dict[str, object]]:
    return repository.list_items(session)
```

## 作用域

默认依赖按请求缓存。多次声明同一个依赖不会重复调用，但不同请求之间不会共享结果。数据库会话应在请求结束时关闭，避免连接泄漏。

## 测试

应用级覆盖依赖可以隔离真实数据库或外部认证服务：

```python
app.dependency_overrides[get_session] = get_test_session
```

测试结束后调用 `app.dependency_overrides.clear()`，防止测试之间互相污染。
