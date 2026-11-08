---
title: "事务与隔离"
description: "通过显式事务保持数据一致性，并识别常见并发异常。"
icon: "sync_alt"
weight: 30
toc: true
---

## 基本事务

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
```

任意语句失败后，当前事务会进入 aborted 状态。继续执行前应先 `ROLLBACK`，或者使用 `SAVEPOINT` 精确回退。

## 隔离级别

PostgreSQL 默认使用 `READ COMMITTED`。每条语句都能看到查询开始前已提交的数据。

对于先读后写的业务约束，可以考虑 `REPEATABLE READ`：

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

更高隔离级别可能产生序列化失败，应用必须准备重试整个事务。

{{< alert context="warning" text="不要用进程内锁保护跨实例数据一致性。数据库约束、行锁和幂等设计才是可扩展的一致性基础。" />}}
