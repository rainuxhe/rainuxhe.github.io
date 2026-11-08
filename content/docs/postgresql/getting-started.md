---
title: "快速开始"
description: "连接数据库、创建对象并检查当前会话状态。"
icon: "rocket_launch"
weight: 10
toc: true
---

## 连接数据库

```shell
psql "postgresql://bookstack:secret@127.0.0.1:5432/bookstack"
```

成功连接后，可以检查版本和当前数据库：

```sql
SELECT version();
SELECT current_database(), current_user;
```

## 创建示例表

```sql
CREATE TABLE books (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
```

`timestamptz` 保存绝对时间点，适合绝大多数业务时间字段。数组类型减少了简单标签关系所需的额外表。

## 插入与查询

```sql
INSERT INTO books (title, tags)
VALUES ('Database Design', ARRAY['database', 'design'])
RETURNING id, created_at;

SELECT id, title
FROM books
WHERE tags @> ARRAY['database'];
```

{{< alert context="info" text="生产连接串应通过环境变量或密钥管理服务注入，不要提交到 Git。" />}}
