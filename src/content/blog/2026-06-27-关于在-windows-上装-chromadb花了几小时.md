---
title: 关于在 Windows 上装 ChromaDB花了几小时
pubDate: 2026-06-27
category: 踩坑日志
---

# 在 Windows 上装 ChromaDB，花了我一个下午

事情是这样的：我想给学习助手加个 RAG 功能，选 ChromaDB 做向量数据库，理由很简单——轻量、零配置、Python 原生。

然后 `pip install chromadb` 跑了 3 分钟，挂了。

## 报错长这样

```
error: Microsoft Visual C++ 14.0 or greater is required
...
chroma-hnswlib build failed
```

`chroma-hnswlib` 是个 C++ 扩展，需要本地编译。而我的 Windows 机器上没装 MSVC。

## 不是所有版本都要编译

翻了一圈 GitHub Issues，发现 ChromaDB 从某个版本开始给 Windows 提供了预编译的 wheel。但最新版有时候没有，或者依赖没对齐。

最后试出来的可行方案：

```bash
# 先单独装 ChromaDB，用有预编译轮子的版本
pip install chromadb==0.6.3

# 然后再装其他依赖
pip install -r requirements.txt
```

`0.6.3` 这个版本号不是随便选的——我试了 0.5.x（太老，API 变了）、0.6.x 最新（回退到需要编译），最后钉在这个版本上。

## 教训

1. **Windows + Python C 扩展 = 永远的痛。** 下次遇到类似问题，先去 PyPI 看有没有预编译的 wheel，别死磕 MSVC。
2. **锁版本号。** 这就是为什么 README 里写死了 `chromadb==0.6.3`。换个版本可能又炸了。
3. **轻量工具不一定"轻安装"。** ChromaDB 本身确实轻，但它的底层依赖 hnswlib 是 C++ 写的。

下次直接照上面的命令来，省得浪费时间。