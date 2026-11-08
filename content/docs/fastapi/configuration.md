---
title: "配置与环境变量"
description: "集中校验配置，避免业务代码读取散落的环境变量。"
icon: "settings"
weight: 50
toc: true
---

## 使用 Settings 对象

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env")

    database_url: str
    debug: bool = False
    jwt_secret: str


settings = Settings()
```

对应环境变量：

```shell
APP_DATABASE_URL=postgresql+asyncpg://localhost/app
APP_JWT_SECRET=change-me
```

## 启动即失败

配置在进程启动时一次性解析。缺少必填项或格式不合法时应立即失败，而不是等到第一次请求才发现问题。

## 注入而不是全局导入

小型项目可以直接导入 `settings`。涉及多个运行环境或测试覆盖时，更推荐把配置对象作为依赖注入，降低模块耦合。
