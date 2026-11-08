---
title: "异步路由中的 SQL"
description: "避免在 async 路由中阻塞事件循环，并正确处理事务。"
icon: "database"
weight: 40
toc: true
---

## 关键原则

`async def` 路由运行在事件循环中。同步数据库驱动会阻塞整个工作线程，因此应使用异步驱动与异步 Session。

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine("postgresql+asyncpg://user:pass@db/app")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

```python
async def get_session():
    async with SessionLocal() as session:
        yield session
```

## 事务策略

不要让每个 repository 方法自行提交事务。一次业务操作通常需要多个写入，应把 commit 和 rollback 放在明确的用例边界。

```python
async with SessionLocal() as session:
    async with session.begin():
        await create_order(session, payload)
        await reserve_stock(session, payload)
```

{{< alert context="warning" text="在 async 函数里直接调用同步 ORM 会拖慢整个进程。若暂时只能使用同步驱动，应把阻塞调用放入线程池，并评估连接池上限。" />}}
