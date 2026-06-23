---
title: LearnLoop-AI的后端正常但前端提示“后端异常”问题
description: 踩坑日志：后端正常但前端提示“后端异常”
pubDate: 2026-06-25
category: 踩坑日志
---

# 踩坑日志：后端正常但前端提示“后端异常”

## 问题现象

启动项目后：

* FastAPI 后端正常运行
* 浏览器访问 `/docs` 正常
* Streamlit 前端启动成功
* 前端页面却一直提示：

```text
后端异常
```

初步怀疑是后端服务未启动或接口报错。

---

## 排查过程

### 1. 使用 curl 测试后端

```bash
curl -v http://localhost:8000/health
```

返回：

```json
{
  "status": "healthy",
  "llm_providers": [
    "deepseek",
    "openai"
  ],
  "agents": 6
}
```

状态码：

```text
HTTP/1.1 200 OK
```

说明：

* FastAPI 正常运行
* 接口正常返回
* 后端没有问题

---

### 2. 怀疑前端请求异常

由于 Streamlit 使用 Python 的 requests 库访问后端，于是在虚拟环境中模拟请求：

```bash
venv/Scripts/python.exe -c "
import requests
r = requests.get('http://localhost:8000/health', timeout=2)
print(r.status_code)
print(r.json())
"
```

结果：

```text
status: 502
JSONDecodeError
```

说明：

* requests 收到的不是 JSON
* 实际响应状态码为 502
* 与 curl 的 200 完全不同

---

### 3. 发现根因

Windows 环境下：

```text
localhost
```

可能同时解析为：

```text
::1         (IPv6)
127.0.0.1   (IPv4)
```

curl 会：

```text
优先尝试 IPv6
失败后自动回退 IPv4
```

因此最终得到：

```text
200 OK
```

而 Python requests：

```text
直接连接到 IPv6 地址
```

导致访问到错误服务或代理，返回：

```text
502 Bad Gateway
```

于是前端误判为：

```text
后端异常
```

---

## 解决方案

将所有：

```python
http://localhost:8000
```

修改为：

```python
http://127.0.0.1:8000
```

例如：

```python
BACKEND_URL = "http://127.0.0.1:8000"
```

修改后：

```python
requests.get("http://127.0.0.1:8000/health")
```

返回：

```text
200
```

前端恢复正常。

---

## 经验总结

当出现：

```text
curl 正常
浏览器正常
前端报错
```

时，不要只检查后端日志。

应同时验证：

```python
requests.get(...)
```

是否与前端运行环境一致。

特别是在 Windows 环境中：

```text
localhost ≠ 一定等于 127.0.0.1
```

IPv4 / IPv6 解析差异可能导致：

* curl 正常
* requests 异常
* 前端误报后端故障

因此本地开发环境推荐统一使用：

```text
127.0.0.1
```

避免此类问题。
