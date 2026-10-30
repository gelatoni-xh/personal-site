---
title: "Layering an LLM Application"
date: "2026-07-29"
category: "AI实践"
summary: "An application boundary for shared Q&A and knowledge capture across Telegram and web entry points."
published: true
---

# LLM Application Layering

## Core Principle

FastAPI should handle protocol concerns, not LLM logic. Every entry point should call the same `pipeline.ask()` for question answering. Knowledge capture has a separate `pipeline.capture()` entry point.

## Architecture

```text
Telegram bot / AI assistant / other entry points
  -> FastAPI: authentication, routing, serialization
       -> pipeline.ask(question, session_id)
       -> pipeline.capture(content, source_type)

pipeline.ask()
  -> memory.py: session history
  -> router.classify_intent(question)
  -> retriever.search(): kb_query and complex only
  -> router.route(question, context, intent): ModelConfig
  -> robot.ask(question, history, model_config)
  -> LLM API selected by ModelConfig

pipeline.capture()
  -> Step 1: extract a structured summary; skipped for manual content
  -> Step 2: locate related documents with RAG
  -> Step 3: decide update, create, or skip
  -> Step 3.5: Telegram human confirmation
  -> Step 4: merge content and rebuild the index
```

In the architecture diagram from the source, RAG document location was marked complete, while steps 3 through 4 were marked pending. A later status section in the same document describes further progress. These labels reflect different moments in the design notes.

## Layer Responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Protocol | `main.py` | HTTP routes and authentication; calls only `pipeline.ask()` or `pipeline.capture()` |
| Application | `pipeline.py` | Orchestrates question answering and knowledge capture |
| Configuration | `config.py` | Central settings for providers, models, and retrieval |
| Memory | `memory.py` | Conversation history by `session_id` |
| Retrieval | `retriever.py` | Replaceable search implementation, from keywords to RAG |
| Routing | `router.py` | Chooses model and API endpoint based on the request |
| Model | `robot.py` | Builds prompts from the question, history, and context and calls the chosen LLM |

## Model Choice

`router.py` chooses the model internally; callers no longer pass a model argument. A request first uses `intent_classify`, then calls a model selected for chitchat, knowledge-base questions, or complex questions.

| Intent | Configuration key | Model in the notes |
|---|---|---|
| Chitchat | `chitchat_reply` | `minimax-m2.1` |
| Knowledge-base question | `kb_query_reply` | `claude-haiku-4-5-20251001` |
| Complex question | `complex_reply` | `claude-sonnet-4-6` |

The capture pipeline used separate settings: `intent_classify`, `command_reply`, `kb_extract`, `kb_locate`, and `kb_merge`. These allow each stage to choose a model appropriate for its task and cost.

## Evolution Recorded in the Source

### Step 1: Establish the Application Boundary

`main.py` was changed to call `pipeline.ask()` rather than import the model-calling module directly. The source marked this complete.

### Step 2: Add Conversation Memory

`pipeline.py` maintained history by `session_id` and included that history in LLM messages. Redis persistence had a seven-day TTL, with an in-memory fallback. This was marked complete.

### Step 3: Make the Model Selectable

As an intermediate stage, `pipeline.ask()` accepted a model argument and passed it through to `robot.ask()`. This was marked complete at the time, but was superseded by the router in step 4.

### Step 4: Introduce the LLM Router

The model argument was removed. `router.py` chose the model and Compatible API endpoint from request characteristics. The source marked this complete.

### Step 5: Replace Keyword Search with RAG

Only the `retriever.py` implementation changed: keyword matching became LlamaIndex and ChromaDB vector search. `pipeline.py` kept the same interface. Embedding settings moved into `router.py` as `EMBED_CONFIG`, using an OpenRouter embedding API. Deployment rebuilt the full index at `/srv/kb_index` with `python3 retriever.py`. This was marked complete.

## Status and Future Options

The source described `pipeline.py` as the shared application layer, router-driven model selection, LlamaIndex and ChromaDB retrieval, and Redis memory with a seven-day TTL as current. Proposed later work included more RAG or agent capabilities, provider fallback, and colder long-term conversation storage.

The implementation choices listed in the notes were LlamaIndex for Markdown retrieval, ChromaDB for a local file-backed vector store, and LangChain as a possible tool-calling framework for a later agent stage. The last item was a selection note, not an implemented component of this architecture.
