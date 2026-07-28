---
title: "2026-03-24-LLM-Application-分层方案"
date: "2026-03-24"
category: "AI实践"
published: true
---

# LLM Application 分层方案

## 核心原则

FastAPI 只处理协议，不感知 LLM 逻辑。所有入口共用同一个 `pipeline.ask()`。

---

## 架构

```
各入口（Telegram Bot / AI Assistant / ...）
    ↓
FastAPI（协议层：鉴权、路由、序列化）
    ├── pipeline.ask(question, session_id)        ← 问答入口
    └── pipeline.capture(content, source_type)    ← 知识沉淀入口

pipeline.ask()
    ├── memory.py           # 对话历史（按 session_id）
    ├── router.classify_intent(question) → intent
    ├── retriever.search()  # 仅 kb_query / complex 时调用，chitchat 跳过
    └── router.route(question, context, intent=intent) → ModelConfig
            ↓
        robot.ask(question, history, model_config)
                ↓
            LLM API（按 ModelConfig 动态选择 endpoint + key）

pipeline.capture()
    ├── Step 1：_extract_summary()   # LLM 提炼结构化摘要（manual 跳过）
    ├── Step 2：retriever.search_with_sources()   # RAG 寻址相关文档 ✅
    ├── Step 3：LLM 决策写入位置     # update / create / skip（待实现）
    ├── Step 3.5：TG 人工确认        # inline button（待实现）
    └── Step 4：LLM 合并写入 + 索引重建（待实现）
```

---

## 分层说明

| 层 | 文件 | 职责 |
|---|---|---|
| 协议层 | `main.py` | HTTP 路由、鉴权，只调 `pipeline.ask()` / `pipeline.capture()` |
| 应用层 | `pipeline.py` | 问答入口 `ask()` + 沉淀入口 `capture()`，编排各层 |
| 配置层 | `config.py` | 集中管理所有配置（Provider、Model、Retrieval 等） |
| 记忆层 | `memory.py` | 按 session_id 维护对话历史 |
| 检索层 | `retriever.py` | 检索抽象，实现可替换（关键词 → RAG） |
| 路由层 | `router.py` | 根据请求特征选择模型与 API endpoint，成本控制核心 |
| 模型层 | `robot.py` | LLM 调用，接收 ModelConfig，组装 prompt + history + context |

---

## 模型选择

模型选择由 `router.py` 在内部自动完成，上层调用方不传 `model` 参数。

```python
# 唯一调用方式，router 内部决策模型
pipeline.ask(question, session_id)
```

### 路由策略

每个请求走两遍模型：`intent_classify` 先做意图分类，再由目标模型回答。

| 意图 | MODELS key | 目标模型 |
|------|-----------|----------|
| chitchat | `chitchat_reply` | minimax-m2.1 |
| kb_query | `kb_query_reply` | claude-haiku-4-5-20251001 |
| complex | `complex_reply` | claude-sonnet-4-6 |

知识沉淀 Pipeline 各步骤模型：

| 步骤 | MODELS key | 模型 |
|------|-----------|------|
| 意图分类 | `intent_classify` | minimax-m2.1 |
| 指令处理 | `command_reply` | claude-haiku-4-5-20251001 |
| Step1 提炼 | `kb_extract` | minimax-m2.1 |
| Step3 决策 | `kb_locate` | claude-haiku-4-5-20251001 |
| Step4 合并 | `kb_merge` | minimax-m2.1 |

详见 [`LLM Router 成本控制方案.md`](LLM Router 成本控制方案.md)。

---

## 演进路径

### Step 1：建立 LLM Application 层边界 ✅

`main.py` 只调 `pipeline.ask()`，不直接 import `robot`。

### Step 2：对话记忆 ✅

`pipeline.py` 按 `session_id` 维护历史，传给 LLM 的 `messages` 带上历史。Redis 持久化，7 天 TTL，支持 fallback 到内存存储。

### Step 3：模型可选 ✅

`pipeline.ask()` 增加 `model` 参数，透传至 `robot.ask()`，调用方可按需指定模型。

### Step 4：LLM Router（成本控制）✅

新增 `router.py`，`pipeline.ask()` 去掉 `model` 参数，由 Router 根据请求特征自动选择模型与 API endpoint。所有模型通过 Compatible API 提供。

### Step 5：RAG（替换检索层）✅

只换 `retriever.py` 的 `search()` 实现，`pipeline.py` 不变。
 
```
retriever.py: 关键词匹配 → LlamaIndex + chromadb 向量检索
```

embedding 配置集中在 `router.py` 的 `EMBED_CONFIG`，使用 OpenRouter embedding API（`OPENROUTER_API_KEY`）。
部署时执行 `python3 retriever.py` 全量构建索引到 `/srv/kb_index`。

---

## 当前状态

| | 当前 | 目标 |
|---|---|---|
| LLM 层 | `pipeline.py` 统一管理 ✅ | 继续扩展 RAG / Agent |
| 模型路由 | `router.py` 内部自动路由 ✅ | 支持 fallback 机制 |
| 检索 | RAG（LlamaIndex + chromadb）✅ | 支持语义检索 |
| 记忆 | Redis 持久化（7 天 TTL）✅ | 数据库冷存储 |

---

## 开源选型速查

| 需求 | 推荐 | 说明 |
|------|------|------|
| RAG 检索 | **LlamaIndex** | 直接读 md 文件，替换成本最低 |
| 向量库 | **chromadb** | 零运维，本地文件存储 |
| Agent 阶段 | **LangChain** | Tool calling 生态完整 |
