---
title: "索引与执行计划"
description: "使用 EXPLAIN 和合适的索引解决真实查询瓶颈。"
icon: "manage_search"
weight: 40
toc: true
---

## 先看计划

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title
FROM books
WHERE lower(title) = lower('database design');
```

`ANALYZE` 会实际执行查询。对写操作使用 `EXPLAIN (ANALYZE)` 前应先开启事务并回滚，避免误改数据。

## 表达式索引

上面的条件无法直接使用普通 `title` B-tree 索引，可以建立表达式索引：

```sql
CREATE INDEX books_title_lower_idx
ON books (lower(title));
```

对于数组包含查询，可以考虑 GIN：

```sql
CREATE INDEX books_tags_gin_idx
ON books USING gin (tags);
```

## 常见误判

索引不是越多越好。每个索引都会增加写入成本、磁盘占用和 VACUUM 工作量。应优先根据慢查询和实际执行计划决定索引，而不是给每个过滤字段都建索引。
