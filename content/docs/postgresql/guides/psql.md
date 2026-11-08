---
title: "psql 实用命令"
description: "查看结构、执行文件并理解常用元命令。"
icon: "terminal"
weight: 20
toc: true
---

## 元命令

`psql` 的元命令以反斜杠开头：

```text
\l                 查看数据库
\dt                查看当前 schema 的表
\d+ table_name     查看表结构、索引和存储信息
\df                查看函数
\timing            开启查询耗时统计
\x auto            列较多时自动切换纵向显示
```

## 执行 SQL 文件

```shell
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file migrations/001-init.sql
```

`ON_ERROR_STOP=1` 让脚本遇到首个错误就终止，避免后续语句在错误状态下继续执行。

## 检查活动会话

```sql
SELECT pid, usename, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start;
```

排查锁等待时，`wait_event_type = 'Lock'` 通常意味着会话正在等待其他事务释放锁。
