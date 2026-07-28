---
title: "2026-03-07-LLM-Router-成本控制方案"
date: "2026-03-07"
category: "AI实践"
published: true
---

# LLM Router 成本控制方案

## 背景与动机

当前 `pipeline.ask()` 支持 `model` 参数，由调用方（上层入口）决定用哪个模型。这是错误的职责分配：

- 上层不应该关心模型选择，它只关心"回答质量"
- 成本控制逻辑散落在调用方，难以统一管理
- API 来源多样（代理 API / 自购 API / 第三方 Router），需要统一抽象

**目标**：在 `pipeline.py` 和 `robot.py` 之间插入一层 `router.py`，由 Router 根据请求特征自动决策模型与 API 来源，上层完全不感知。

---

## 新架构

```
各入口（Telegram Bot / AI Assistant / ...）
    ↓
pipeline.ask(question, session_id)   ← 去掉 model 参数
    ├── memory.py           # 对话历史
    ├── router.classify_intent(question) → intent
    ├── retriever.search()  # 仅 kb_query / complex 时调用，chitchat 跳过
    └── router.route(question, context, intent=intent) → ModelConfig
            ↓
        robot.ask(question, history, model_config)
                ↓
            LLM API（按 ModelConfig 选择 endpoint + key）
```

---

## Router 职责

`router.py` 接收请求特征，返回 `ModelConfig`（包含 model name、base_url、api_key）。

### 路由策略

每个请求走两遍模型：

1. **第一遍**：`intent_classify`（minimax-m2.1）做意图分类，返回 `chitchat / kb_query / complex`
2. **第二遍**：根据意图选择目标模型回答

| 意图 | MODELS key | 选用模型 |
|------|-----------|----------|
| chitchat | `chitchat_reply` | minimax-m2.1 |
| kb_query | `kb_query_reply` | claude-haiku-4-5-20251001 |
| complex | `complex_reply` | claude-sonnet-4-6 |

### ModelConfig 结构

```python
@dataclass
class ModelConfig:
    model: str
    api_key: str
    base_url: str
```

---

## Embedding API 管理
 
Embedding 同样由 `router.py` 统一提供配置，通过 [`get_embed_config()`](../bot/router.py:64) 返回 `ModelConfig`，供 [`retriever.py`](../bot/retriever.py:10) 使用。

```python
# Embedding 配置（RAG 用）
EMBED_CONFIG = {
    "provider": "openrouter",
    "model":    "text-embedding-3-small",
}
```

- 不走意图分类流程，直接返回固定配置
- 切换 embedding 模型/Provider 只需改 `EMBED_CONFIG`，`retriever.py` 无需改动

---

## API 来源抽象

Router 管理多个 API Provider，每个 Provider 有独立的 key + base_url：

```python
PROVIDERS = {
    "proxy":    {"base_url": "...", "api_key": "PROXY_API_KEY"},
    "openai":   {"base_url": "https://api.openai.com/v1", "api_key": "OPENAI_API_KEY"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "api_key": "OPENROUTER_API_KEY"},
}
```

路由规则将模型映射到 Provider，新增 API 来源只需在 `PROVIDERS` 里加一条，路由规则不变。

---

## 与第三方 Router（如 OpenRouter）的关系

| 方案 | 适用场景 | 优缺点 |
|------|----------|--------|
| 自建 router.py | 当前阶段 | 完全可控，规则简单，无额外费用 |
| 接入 OpenRouter | API 来源多、需要自动 fallback | 省去自建路由逻辑，但多一层依赖和费用 |
| 混合：自建路由 + OpenRouter 作为一个 Provider | 推荐演进方向 | 自建控制粗粒度（场景路由），OpenRouter 控制细粒度（模型 fallback） |

当前建议：**先自建 `router.py`**，将 OpenRouter 作为一个普通 Provider 接入，后续可以把更多路由逻辑下沉给 OpenRouter。

---

## 环境变量设计

```bash
# Compatible API（当前主力 - 所有任务都用这个）
COMPATIBLE_BASE_URL=...
COMPATIBLE_API_KEY=...

# 路由阈值
ROUTER_COMPLEX_TOKEN_THRESHOLD=2000

# 日志目录（可选，默认 ./logs）
ROUTER_LOG_DIR=./logs
```

### 模型配置

所有模型都来自 Compatible API，按场景命名：

| MODELS key | 场景 | 模型 | 成本 |
|-----------|------|------|------|
| `intent_classify` | 意图分类 | minimax-m2.1 | 最低 |
| `chitchat_reply` | 闲聊回答 | minimax-m2.1 | 最低 |
| `kb_query_reply` | 知识库问答 | claude-haiku-4-5-20251001 | 低 |
| `complex_reply` | 复杂推理 | claude-sonnet-4-6 | 中等 |
| `command_reply` | 指令处理 | claude-haiku-4-5-20251001 | 低 |
| `kb_extract` | 知识沉淀 Step1 提炼 | minimax-m2.1 | 最低 |
| `kb_locate` | 知识沉淀 Step3 决策 | claude-haiku-4-5-20251001 | 低 |
| `kb_merge` | 知识沉淀 Step4 合并 | minimax-m2.1 | 最低 |

---

## 日志查询

### 日志格式

每次路由决策都会记录到 `./logs/router_YYYYMMDD.jsonl`，JSONL 格式（每行一条 JSON 记录）。

```json
{
  "timestamp": "2026-03-06T19:53:00+08:00",
  "question": "什么是 JVM？",
  "context_length": 1024,
  "history_length": 2,
  "model": "claude-haiku-4-5-20251001",
  "provider": "compatible",
  "reason": "知识库问答 (有 context)"
}
```

### 查询 API

```bash
# 查询最近 1 天的日志
GET /internal/router-logs?days=1

# 查询最近 7 天的日志
GET /internal/router-logs?days=7
```

响应格式：

```json
{
  "logs": [
    { "timestamp": "...", "model": "...", ... },
    ...
  ],
  "total": 42
}
```

---

## 采购清单

| API 来源 | 状态 | 用途 | 优先级 |
|---------|------|------|--------|
| **Compatible API** | ✅ 已有 | 所有任务 | P0 |

**无需额外采购**，所有模型都通过 Compatible API 提供。

---

## 实现状态

### ✅ Step 1：建立 router.py，pipeline 去掉 model 参数（已完成）

- [`router.py`](../bot/router.py)：规则路由，支持多 Provider
- [`pipeline.py`](../bot/pipeline.py)：去掉 model 参数，自动调用 router
- [`robot.py`](../bot/robot.py)：接收 ModelConfig，支持动态 endpoint

### Step 2：多 Provider 支持（已完成）

所有模型都通过 Compatible API 提供。

### ✅ Step 3：路由日志记录（已完成）

- [`router_logger.py`](../bot/router_logger.py)：记录每次路由决策
- 日志格式：JSONL，每行一条记录
- 日志位置：`./logs/router_YYYYMMDD.jsonl`
- 日志内容：timestamp、question、context_length、history_length、model、provider、reason
- 查询 API：`GET /internal/router-logs?days=1`

### Step 4：Fallback 机制

调用失败时自动切换到备用 Provider，`robot.py` 捕获异常后通知 router 重试。

### Step 5：成本统计

基于日志数据，定期汇总推送到 TG，可视化成本趋势。

---

## 对现有架构的影响

| 文件 | 变更 | 状态 |
|------|------|------|
| `pipeline.py` | 去掉 `model` 参数，调用 `router.route()` 获取 `ModelConfig` | ✅ 已完成 |
| `robot.py` | 接收 `ModelConfig` 替代 `model` 字符串，支持动态 base_url / api_key | ✅ 已完成 |
| `router.py` | **新增**，路由逻辑集中在此 | ✅ 已完成 |
| `config.py` | 新增多 Provider 环境变量 | - |
| `main.py` | 无需改动 | - |
| 前端 / Java | 无需改动（去掉 model 字段透传） | - |
