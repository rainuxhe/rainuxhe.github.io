---
title: "备份与恢复"
description: "用逻辑备份完成可验证的数据库恢复演练。"
icon: "backup"
weight: 50
toc: true
---

## 逻辑备份

```shell
pg_dump \
  --format=custom \
  --file=bookstack.dump \
  "$DATABASE_URL"
```

自定义格式压缩率好，并支持使用 `pg_restore` 选择对象或并行恢复。

## 恢复到新数据库

先创建空数据库，再恢复：

```shell
createdb -h 127.0.0.1 -U postgres bookstack_restore
pg_restore \
  --dbname=bookstack_restore \
  --no-owner \
  --no-privileges \
  bookstack.dump
```

## 验证

备份成功不等于恢复可用。至少验证：

1. `pg_restore --list` 能读取归档目录。
2. 恢复过程返回码为 0。
3. 关键表数量、最新记录和序列值符合预期。
4. 应用能以只读或测试模式连接恢复后的数据库。

定期自动备份之外，还应定期在隔离环境执行恢复演练。
