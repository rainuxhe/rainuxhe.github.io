---
title: "迁移会话"
description: "如果您正在使用 `DatabaseSessionService` 并升级到 ADK Python 版本 v1.22.0 或更高版本，您应将数据库迁移到新的会话数据库架构。从 ADK Python 版本 v1.22.0 开始，数据库"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v1.22.1。

如果您正在使用 `DatabaseSessionService` 并升级到 ADK Python 版本 v1.22.0 或更高版本，您应将数据库迁移到新的会话数据库模式。从 ADK Python 版本 v1.22.0 开始，`DatabaseSessionService` 的数据库模式已从基于 pickle 序列化的 `v0` 更新为使用基于 JSON 序列化的 `v1`。先前的 `v0` 会话模式数据库将在 ADK Python v1.22.0 及更高版本中继续工作，但未来版本可能需要 `v1` 模式。

## 迁移会话数据库 {#migrate-session-database}

提供了一个迁移脚本以便于迁移过程。该脚本从您现有的数据库中读取数据，将其转换为新格式，并写入新数据库。您可以使用 ADK 命令行界面（CLI） `migrate session` 命令运行迁移，如下例所示：

{{% alert context="warning" %}}
**要求：ADK Python v1.22.1 或更高版本**

此过程需要 ADK Python v1.22.1，因为它包含迁移命令行接口功能及支持会话数据库模式更改的错误修复。
{{% /alert %}}
{{< tabs tabTotal="2" >}}
{{% tab tabName="SQLite" %}}

```bash
adk migrate session \
  --source_db_url=sqlite:///source.db \
  --dest_db_url=sqlite:///dest.db
```

{{% /tab %}}
{{% tab tabName="PostgreSQL" %}}

```bash
adk migrate session \
  --source_db_url=postgresql://localhost:5432/v0 \
  --dest_db_url=postgresql://localhost:5432/v1
```

{{% /tab %}}
{{< /tabs >}}
在运行迁移后，更新您的 `DatabaseSessionService` 配置以使用您为 `dest_db_url` 指定的新数据库 URL。

---

原文：[Session database schema migration](https://adk.dev/sessions/session/migrate/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/sessions/session/migrate.md)
