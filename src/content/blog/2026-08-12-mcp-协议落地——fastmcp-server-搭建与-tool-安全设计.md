---
title: MCP 协议落地——FastMCP Server 搭建与 Tool 安全设计
pubDate: 2026-08-12
category: AI技术
---

# MCP 协议落地——FastMCP Server 搭建与 Tool 安全设计

> **系列**：云平台智能客服系统技术深度解析


---

## 一、MCP 解决了什么问题？

在 MCP 出现之前，将业务数据暴露给 LLM Agent 的做法五花八门——有人写自定义 Tool 类，有人调 API Gateway，有人直接用 Function Calling + 数据库连接。

**MCP（Model Context Protocol）** 提供了标准化的答案：定义 LLM 与外部工具/数据源之间的通信协议，包括工具发现、调用格式、错误处理等。

```python
from fastmcp import FastMCP

mcp = FastMCP(
    name="cloud-platform-mcp",
    description="云平台业务系统——订单、实例、费用等工具",
    version="1.0.0",
)
```

---

## 二、Tool 定义的安全约定

核心原则：**user_id 不由 LLM 决定**。

每个 Tool 将 `user_id` 作为第一个参数，但 description 明确标注"由系统自动注入"：

```python
@mcp.tool()
async def query_orders(
    user_id: str = Field(description="用户ID——由系统自动注入，请勿手动传递"),
    start_date: Optional[str] = Field(None, description="起始日期 YYYY-MM-DD"),
    end_date: Optional[str] = Field(None, description="结束日期 YYYY-MM-DD"),
    order_status: Optional[str] = Field(None, description="订单状态：paid/pending/cancelled"),
    limit: int = Field(20, description="返回数量上限")
) -> dict:
    """查询用户的云平台订单记录。

    适用场景：用户询问"我最近的订单"、查询特定时间段消费
    安全检查：user_id 由系统注入，确保只能查询自己的订单。
    """
    query = """
        SELECT order_id, product_name, amount, status, created_at
        FROM orders
        WHERE user_id = %s
    """
    params = [user_id]

    if start_date:
        query += " AND created_at >= %s"; params.append(start_date)
    if end_date:
        query += " AND created_at <= %s"; params.append(end_date)
    if order_status:
        query += " AND status = %s"; params.append(order_status)

    query += " ORDER BY created_at DESC LIMIT %s"; params.append(limit)
    rows = await db_execute(query, params)

    return {
        "total": len(rows),
        "orders": [{"order_id": r[0], "product_name": r[1],
                     "amount": float(r[2]), "status": r[3]} for r in rows]
    }


@mcp.tool()
async def query_instances(
    user_id: str = Field(description="用户ID——由系统自动注入"),
    region: Optional[str] = Field(None),
    status: Optional[str] = Field(None, description="running/stopped/terminated"),
) -> dict:
    """查询用户的云服务器实例列表。

    适用场景：用户询问"我有哪些ECS实例"、检查特定实例状态
    """
    query = """
        SELECT instance_id, instance_name, instance_type, region, status
        FROM instances
        WHERE user_id = %s
    """
    params = [user_id]
    if region:
        query += " AND region = %s"; params.append(region)
    if status:
        query += " AND status = %s"; params.append(status)

    rows = await db_execute(query, params)
    return {"total": len(rows), "instances": [
        {"instance_id": r[0], "instance_name": r[1],
         "instance_type": r[2], "region": r[3], "status": r[4]}
        for r in rows
    ]}
```

---

## 三、三个关键设计决策

**1. `user_id` 参数对 LLM 可见但不鼓励使用**

Tool description 告诉 LLM 这个参数"由系统自动注入"。LLM 看到它但理解不需要自己填——这是约定优于配置的设计。

**2. SQL 参数化查询——100% 防止注入**

`WHERE user_id = %s` 配合参数列表 `[user_id]`，无论 user_id 的值是什么都不会产生 SQL 注入。

**3. 所有查询默认 LIMIT**

防止 LLM 生成无限制的 `SELECT *` 导致全表扫描。

---

## 四、Agent 侧加载 MCP Tools

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_tools_for_user(user_id: str) -> list:
    token = generate_service_token(user_id)  # JWT

    client = MultiServerMCPClient({
        "cloud_platform": {
            "url": "http://mcp-server:8080",
            "transport": "sse",
            "headers": {"Authorization": f"Bearer {token}"}
        }
    })

    tools = await client.get_tools()
    return tools
```

Agent 创建时动态加载针对该用户的 Tools——每个 Token 携带不同的 user_id，MCP Server 侧的拦截器根据 Token 注入 user_id。

---

## 核心要点

1. **MCP 标准化了 LLM 与外部工具的通信**——工具发现、调用、错误处理都有统一规范；
2. **user_id 的"系统注入"约定是整个安全方案的基础**——对 LLM 可见但不让其填写；
3. **每个 Tool 的 SQL 都包含 `WHERE user_id = %s`**——行级安全从查询层面保障。

---