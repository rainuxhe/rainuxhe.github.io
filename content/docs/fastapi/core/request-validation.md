---
title: "请求数据与校验"
description: "区分路径、查询、请求体和表单数据，并用类型系统表达约束。"
icon: "rule_settings"
weight: 20
toc: true
---

## 数据来源

FastAPI 根据参数位置和类型推断数据来自哪里：

- 路径参数：`item_id: int`
- 查询参数：普通函数参数，或用 `Query` 声明额外约束
- JSON 请求体：Pydantic 模型
- 表单与文件：`Form`、`File`

```python
from fastapi import FastAPI, Path, Query
from pydantic import BaseModel, Field

app = FastAPI()


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=1, le=999)


@app.post("/items/{item_id}")
async def create_item(
    item_id: int = Path(ge=1),
    notify: bool = Query(default=False),
    item: ItemCreate = ...,
) -> dict[str, object]:
    return {"id": item_id, "item": item, "notify": notify}
```

## 校验边界

Pydantic 负责字段级类型与约束，业务规则仍应放在 service 层。数据库唯一性、权限和跨字段一致性通常无法仅靠请求模型保证。

{{< alert context="warning" text="不要把数据库模型直接当作公开请求模型。数据库结构变化会意外改变 API 契约，敏感字段也更容易泄露。" />}}
