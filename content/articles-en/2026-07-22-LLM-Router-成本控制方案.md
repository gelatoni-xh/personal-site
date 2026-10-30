---
title: "LLM Routing and Cost Control"
date: "2026-07-22"
category: "ai-practice"
summary: "Moving model choice behind an application-level router, with intent-based routing and decision logs."
published: true
---

# LLM Router: A Cost-Control Design

## Background

Originally, `pipeline.ask()` accepted a `model` argument, leaving the calling interface to choose a model. That put the responsibility in the wrong place: the caller wanted an answer of suitable quality, cost rules were scattered across callers, and several possible API sources needed a common abstraction.

The design introduced `router.py` between `pipeline.py` and `robot.py`. The router chooses a model and API provider from request characteristics without exposing that choice to the caller.

## Architecture

```text
Telegram bot / AI assistant / other entry points
  -> pipeline.ask(question, session_id)
       -> memory.py: conversation history
       -> router.classify_intent(question): intent
       -> retriever.search(): only for kb_query or complex
       -> router.route(question, context, intent): ModelConfig
  -> robot.ask(question, history, model_config)
  -> selected LLM API endpoint
```

`pipeline.ask()` no longer needs a `model` argument. Chitchat can skip retrieval.

## Router Responsibilities

The router returns a `ModelConfig` with a model name, base URL, and API key. Each request makes two model calls: a low-cost intent-classification call, then an answer call selected by intent.

| Intent | Configuration key | Selected model in the design |
|---|---|---|
| Chitchat | `chitchat_reply` | `minimax-m2.1` |
| Knowledge-base query | `kb_query_reply` | `claude-haiku-4-5-20251001` |
| Complex question | `complex_reply` | `claude-sonnet-4-6` |

```python
@dataclass
class ModelConfig:
    model: str
    api_key: str
    base_url: str
```

## Embedding Configuration

The same router exposes embedding configuration through `get_embed_config()` for use by `retriever.py`. Embedding does not go through intent classification; it uses a fixed configuration. Changing its model or provider should not require a retrieval-code change.

The design example used `text-embedding-3-small` through OpenRouter. A later RAG design note records a move to `qwen/qwen3-embedding-8b`; these are snapshots from different stages, not simultaneous production settings.

## API Provider Abstraction

Each provider has its own key and base URL. The proposed `PROVIDERS` mapping included a proxy, OpenAI, and OpenRouter. Routing rules map a model to a provider, so adding a source can be a configuration change rather than a rewrite of request handling.

The design considered three options: a local `router.py` with simple, fully controlled rules; delegating routing to a third-party service such as OpenRouter for broader provider support and fallback; or keeping high-level scenario rules locally while using a provider service for finer-grained fallback. The proposed starting point was the local router, with OpenRouter treated as a normal provider.

## Environment and Model Settings

The working configuration used `COMPATIBLE_BASE_URL` and `COMPATIBLE_API_KEY`. The design also named `ROUTER_COMPLEX_TOKEN_THRESHOLD=2000` and an optional `ROUTER_LOG_DIR`, defaulting to `./logs`.

| Configuration key | Purpose | Model |
|---|---|---|
| `intent_classify` | Intent classification | `minimax-m2.1` |
| `chitchat_reply` | Chitchat | `minimax-m2.1` |
| `kb_query_reply` | Knowledge-base answers | `claude-haiku-4-5-20251001` |
| `complex_reply` | Complex reasoning | `claude-sonnet-4-6` |
| `command_reply` | Command handling | `claude-haiku-4-5-20251001` |
| `kb_extract` | Capture step 1 | `minimax-m2.1` |
| `kb_locate` | Capture step 3 | `claude-haiku-4-5-20251001` |
| `kb_merge` | Capture step 4 | `minimax-m2.1` |

The original notes said the available Compatible API supplied these models, so no additional API purchase was needed at that stage.

## Decision Logs

Each routing decision was recorded as a JSON line in `./logs/router_YYYYMMDD.jsonl`. The fields included timestamp, question, context length, history length, selected model, provider, and reason. An internal endpoint, `GET /internal/router-logs?days=1`, could retrieve recent decisions; a seven-day query used `days=7`.

This logging made the routing policy inspectable instead of leaving model choice implicit inside a call.

## Implementation Status Recorded in the Notes

The original implementation table marked these as complete: adding `router.py`, removing the caller-provided model argument, passing `ModelConfig` to `robot.py`, using the Compatible API as the provider, and recording routing decisions with `router_logger.py` and an internal query endpoint.

Two items were still follow-up work: retrying a failed request through a fallback provider, and aggregating logged usage into cost reports sent to Telegram. The source described them as proposed steps, not verified delivered capabilities.
