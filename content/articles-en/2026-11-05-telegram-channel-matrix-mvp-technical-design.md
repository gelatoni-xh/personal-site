---
title: "Telegram Content Channel Matrix MVP Technical Design"
date: "2026-11-05"
summary: "A configurable batch system for collecting, screening, drafting, validating, and publishing content across multiple Telegram channels, with operational records."
category: "personal-projects"
published: true
---

# Telegram Content Channel Matrix MVP Technical Design

Product document: [Telegram Content Channel Matrix MVP PRD](./2026-11-05-telegram-channel-matrix-mvp-prd.md)

Version: v0.1  
Date: 2026-11-05

This design proposes implementation for the first AI/software updates and PC game deals channels. The goal is a reusable publishing system for multiple independent Telegram channels, while keeping sources, rules, prompts, and observation data isolated by channel.

## 1. Technical goals and boundaries

The system reliably fetches sources, normalizes and screens candidates, drafts summaries, validates rules, publishes to Telegram, sends run emails, and retains operational data. Each channel determines what to publish, when to publish, and how to explain it.

The first release does not build a reader-facing bot, admin console, unified brand site, complex queue platform, or local LLM service. The Telegram Bot is only the channel publishing identity: it sends messages to channels through the Bot API and offers no reader interaction.

Design goals:

- Add a channel mainly through configuration, source adapters, rules, and prompts rather than duplicating the task system.
- Make source, LLM, and publishing failures diagnosable from run records; one channel's failure must not block others.
- Apply deterministic rules and structural validation before automatic publishing; an LLM's own “pass” is not a safety guarantee.
- Trace every published item to its source, rule and prompt versions, model, validation result, and Telegram message ID.
- Persist deduplication and publication state so restarts and scheduled reruns do not publish duplicates.
- Start with a small, isolated deployment unit, validate real load, and use measured data to decide whether to move hosts.

## 2. Recommended architecture

Use a TypeScript/Node.js modular monolith in one repository, driven by channel configuration. A systemd timer on the instance starts an independent batch container at 09:00 China Standard Time daily. Do not deploy a separate service for each channel. Use PostgreSQL for run state and observation records instead of relying on process memory or logs.

```text
Schedule
  -> Source adapters
  -> Candidate normalization and deduplication
  -> Channel rules and eligibility checks
  -> LLM drafting
  -> Deterministic validation
  -> Telegram channel publisher
  -> Post-run email report

PostgreSQL: sources, candidates, runs, prompt/rule versions, publications, metrics
```

| Module | Responsibility |
|---|---|
| Scheduler | Create daily runs by channel time zone and window; do not depend on the host's local time |
| Source adapter | Read RSS, official APIs, or store data; standardize timeouts, rate limits, cursors, errors, and source-terms metadata |
| Normalizer | Map source fields into internal candidates while retaining source IDs, original URLs, publication times, and required fields |
| Deduplication | Deduplicate by stable source ID, canonical URL, and content fingerprint; retain source links across cross-source duplicates |
| Channel policy | Apply scope, geography, freshness, price/discount, exclusions, and required-field rules |
| LLM drafting | Generate constrained Chinese drafts from screened structured facts using a versioned prompt |
| Validator | Check fields, length, links, fact references, prices/expiration, and channel format; skip failures instead of inventing repairs |
| Publisher | Send through Telegram Bot API and maintain idempotency, retry boundaries, and message IDs |
| Reporter | Summarize source, screening, generation, publishing, skips, and exceptions for the operator email |
| Run reporting | Aggregate run state, stage counts, and exceptions for operational email |

Each channel has its own channel ID, language, run time zone, source list, collection cadence, content rules, prompt version, publishing window, and limit. Inject secrets only through the deployment environment; never write them to configuration or run records.

## 3. Source integration strategy

Implement small adapters by source type. Do not begin with a general crawler framework. Prefer official RSS and APIs. Treat web scraping as an explicit exception requiring separate checks for reliability, access restrictions, and republication terms.

### AI/software updates

- Initial sources: OpenAI News RSS, Google AI Blog RSS, and Hugging Face Blog RSS.
- GitHub Changelog is an optional lower-priority source and must pass channel rules.
- Store RSS item ID, original URL, title, publication and fetch times, and only the necessary summary text. Do not mirror full text or images by default.
- If RSS has no stable ID, derive a fingerprint from canonical URL and title/publication time, and version the algorithm for future correction.

### PC game deals

- Query or parse Steam China store discounts specifically. Retain App ID, store link, currency/region, current and original prices, discount, and promotion end time only when actually supplied.
- Do not depend on GamerPower or Epic page scraping in the initial publishing path.
- Before Steam integration, verify the available API, regional pricing, and store-data terms. Do not publish automatically if region, price, or discount validity cannot be confirmed reliably.
- Timestamp price data. If a duplicate candidate's price or discount changes materially, apply a rule to update the post or internal record; the first release should not repost the same promotion.

Each adapter reports run start/end, successful pages or item counts, HTTP status category, retry count, and error class. A source returning zero items is different from an unavailable source; the daily report must not describe a failure as “nothing new today.”

## 4. Daily run

1. The scheduler creates a unique run record for each channel's local operating date.
2. Fetch independent sources concurrently while enforcing global and per-source concurrency, timeouts, and retry limits.
3. Normalize and persist source results, then deduplicate by unique keys and content fingerprints.
4. Apply deterministic channel rules. Skip candidates missing required fields, source trust, freshness, region, or permission conditions, and record the reason.
5. Call the LLM for eligible candidates. Bind each call to prompt version, model ID, parameters, input-summary hash, and response status. Do not pass unrelated user or channel history.
6. Parse structured output and validate deterministically. Every factual claim in AI/software copy must map to a source field or source text. Fill game price, region, discount, and promotion period from collected data; never let the LLM rewrite these values.
7. Assemble validated items into one daily digest per channel, up to five items, without padding. Send no empty digest. Before publishing, recheck expiry, prior publication, and Steam price validity; then check target channel, message length, HTML escaping, and source links. If over limit, remove complete lower-priority items rather than truncating paragraphs or HTML; do not split by default.
8. After Telegram confirms success, save `message_id`, send time, and publication state. Mark network timeouts with uncertain delivery as `uncertain`; do not blindly retry indefinitely.
9. Send a run report with per-channel/source state, candidate and dedup counts, eligible counts, skip reasons, LLM errors, publication count, failures, and uncertain sends.

Automatic publishing has no per-item approval. Collect, screen, and compile once daily per channel. The publication unit is one multi-item daily digest, not individual candidates. The targeted Steam price recheck before sending is not a second full collection. Limit each channel to one digest per day; retain and explain overflow candidates rather than sending unlimited follow-ups.

## 5. Prompt and content contract

Version prompts independently by channel. The shared prompt portion defines output structure and general factual constraints; do not mix the two verticals' selection rules into one long prompt. Persist the prompt version and model ID for every run.

Use an explicit allowlist of LLM input fields, such as source title, source summary or permitted text excerpt, original link, publication time, source name, structured business fields, and a summary of channel rules. Require JSON Schema or an equivalent structure with at least:

- `decision`: `publish` or `skip`, an advisory signal that does not override the rules engine.
- `title` and `body`: Simplified Chinese copy in the channel's format.
- `claims`: factual claims and their supporting source fields or excerpts.
- `uncertainties`: fields or restrictions that could not be confirmed.
- `reason`: short editorial rationale for observation and debugging, not shown to readers.

The validator checks traceable facts, geography, time, format, prohibited content, required fields, and Telegram length. It cannot decide whether copy is compelling or whether the source itself is true. Those depend on source reliability and may later be supplemented with spot checks and reader feedback. The first release does not let the model search or add facts beyond its inputs.

Prompt A/B testing is outside the MVP. Store versions and make published content traceable to the prompt actually used. Consider experiments only after there is enough content and growth signal to define a valid comparison.

## 6. Core data and idempotency

| Entity | Key fields and purpose |
|---|---|
| Channel | Stable ID, target chat ID, language, time zone, enabled state, config version |
| Source | Source type, config reference, terms notes, last success/failure |
| ChannelSource | Channel/source relation, priority, enabled state, source-specific rules |
| Candidate | Source ID, canonical URL, JSON fields, publication time, fingerprint, status |
| CandidateSource | Each source and evidence link when candidates duplicate across sources |
| ContentDraft | Candidate, channel, rule/prompt versions, model, structured copy, validation status |
| Run | Channel, operating date, start/end, stage counts, final state, error summary |
| Publication | Candidate/draft, channel, idempotency key, status, Telegram message ID, sent time |
| PromptVersion | Channel, version, body hash, creation time, enabled state |

Use `channel_id + operating_date + daily_digest` as the publication idempotency key with a database uniqueness constraint. A join table records candidates, drafts, and item order for each digest. Keep candidate-level cross-day deduplication separate. Publication states include `prepared`, `sending`, `sent`, `failed`, and `uncertain`.

Persist `sending` before calling Telegram. Retry a clear API rejection a limited number of times. If the connection drops and receipt is unknown, mark `uncertain` and resolve through inspection or an explicit operator command. Do not claim strict exactly-once delivery; the Bot API does not provide it.

Retain only the data needed for deduplication, review, and observation. If source terms prohibit storing text, keep minimal metadata, short-lived processing text, or a content hash and define a cleanup period. Never store bot tokens, LLM API keys, or SMTP passwords in the database.

## 7. MVP run records

Record only what is needed to operate and troubleshoot automation. Do not build channel growth analytics or reader feedback collection. Daily email shows run state, source status, candidate and dedup counts, skips and reasons, drafts, publications, and send exceptions. These indicate whether the job completed; they do not measure channel growth.

Persistent records retain sources, rule and prompt versions, model ID, Telegram message IDs, stage counts, and error classes for deduplication, retries, and diagnosis. LLM usage/cost can be checked in provider billing; the MVP has no in-product budget cap, spend gate, or automatic shutdown at a quota.

Post views, subscriber changes, forwards, external clicks, prompt A/B analysis, and channel investment/retirement analysis are outside the MVP. Discuss collection methods and metrics after there is meaningful growth or content supply. Until then, do not build a view collector, tracking short links, or analytics export.

## 8. Deployment and cost

### Recommended phases

1. For the initial run, reuse Ubuntu-3 with an isolated application container, Compose project, database, and account. Run low-concurrency scheduled batches and use an external LLM API. Measure real CPU/memory peaks, source reliability, per-item LLM cost, and publication volume.
2. Move to a small dedicated instance or managed container when channel volume, run density, host headroom, or fault-isolation needs warrant it. Keep image, migration, backup, and configuration boundaries portable so business logic is not tied to the current host.

The current inventory describes Ubuntu-3 as 2 vCPU and 2 GB RAM, with about 750 MB available and no swap at the time of inspection; it already runs several projects and PostgreSQL. Channel jobs are intermittent and lightweight, so a new machine may not be necessary initially, but headroom is limited and must be checked during full runs. Before trial operation, recheck production resources, container limits, logs, and backup space, then set conservative container limits that do not squeeze existing services. Use a separate host if adequate headroom cannot be preserved; do not treat an OOM event followed by migration as the plan.

### Isolation

- Separate working directory, Compose project, application container, release image, environment file, and log limits.
- Use a separate database and least-privilege account. The PostgreSQL service may initially be shared; do not add Redis. A dedicated database instance is unnecessary while load and table volume are low.
- Expose no public application port. Batch jobs need outbound access to sources, Telegram, the LLM, and SMTP. Direct HTTPS to the Bot API needs no webhook route.
- Keep per-channel and per-source switches. Deployment or migration must not modify other projects' containers, networks, volumes, firewall, or Nginx routes.
- Build images in CI, not on the 2 GB server.

### Cost controls

- Send only candidates that pass source and deterministic checks to the LLM. Limit input length and failure retries; do not create retry loops. The MVP sets no spend cap or spend-triggered shutdown.
- Batch candidates within a run while preserving per-candidate validation and failure isolation. Record model IDs.
- Poll RSS and free public APIs at low frequency within their terms and limits; use ETag/Last-Modified, cursors, and caching.
- Do not buy a queue, analytics platform, proxy pool, or crawler service initially; evaluate only after a concrete coverage gap appears.
- Review monthly LLM, email, incremental host resources, and manual review time. Separate existing fixed host costs from marginal project costs.

## 9. Failure handling and security

- Source failure: other sources and channels continue; mark the source failed and do not claim there were no updates.
- RSS/API limits: follow `Retry-After`; use bounded backoff for timeouts and 5xx; quarantine malformed data and do not advance a bad cursor.
- LLM timeout, refusal, or invalid JSON: retry once at most, then skip and retain the error type and candidate; do not loop rewriting.
- Validation failure: do not publish; record the deterministic rule. Include a concise email report when useful, without emailing sensitive raw stacks.
- Telegram 429: follow `retry_after`. Stop and alert on explicit permission/channel errors. Mark uncertain receipt as `uncertain`.
- Email failure: use a separate alert log and bounded retry; do not alter a successful publication or misreport it as a channel publishing failure.
- Minimize outbound network access, use HTTPS, and filter tokens, full connection strings, API keys, and unnecessary source text from logs.
- Give the Telegram bot posting rights only in target channels, not administrator rights. Explicitly verify each channel ID to avoid sending test content to production.
- Validate message length and HTML escaping before publishing; show original source links clearly.

## 10. Testing and launch acceptance

Use fixed source fixtures and mocked LLM/Telegram APIs for repeatable local tests. CI covers migrations, type checks, unit and integration tests, and container builds. Keep test and production databases separate.

Key test areas:

- Source pagination, conditional requests, rate limits, timeouts, malformed items, and distinction between empty and failed results.
- Repeated fetches, cross-source duplicates, and independent filtering by channel rules.
- Invalid prompt structure, unsupported factual claims, missing region/price/end-time fields, and expired candidates.
- Telegram formatting, length, HTML escaping, 429, permission failures, and uncertain delivery.
- Same-day reruns, recovery after interruption, unique publication keys, and prompt-version traceability.
- Success/failure email summaries and proof that email failure does not alter Telegram publication records.
- Isolation when both channels run concurrently, per-channel switches, and continued processing after one channel fails.

Before opening real channels: verify source terms and key fields; test bot posting rights and formatting in a test channel; test LLM output and cost on a small candidate batch; verify email delivery; and observe several complete scheduled cycles for source state, RSS/price validity, resource use, and view-data availability. Automatic publishing may be enabled after rule checks pass, but begin with a low daily limit.

## 11. Implementation order and open items

Suggested order:

1. Set repository, runtime, and secret-management boundaries; create the database schema and common run records.
2. Implement official AI/software RSS adapters first and verify deduplication, rules, drafting, a Telegram test channel, and the email loop.
3. Add the Steam China price adapter and price/offer validation. Do not automate deal publishing until reliability passes acceptance.
4. Accept run email and records; defer reader-performance collection until after the MVP.
5. Store prompt versions and the version used by each item; defer prompt A/B analysis.
6. Decide on host migration and worker separation using peak resources, recovery behavior, and incremental costs.

Parameters to confirm before implementation:

- Recipient email and SMTP/email service.
- Confirmed: run at 09:00 in `Asia/Shanghai`; at most one digest per channel per day, sent after processing.
- LLM provider, model candidates, and secret handling.
- Recheck terms for initial sources, especially a stable way to obtain Steam China discount fields.
- Bot and target-channel permissions.
- Latest Ubuntu-3 peak resource usage and acceptable minimum headroom.

The proposed architecture and data boundaries can serve as the implementation baseline. The operational parameters above can be completed before implementation without blocking construction of the common pipeline with test fixtures.

## 12. Confirmed instance run and rerun rules (2026-11-05)

The user authorized deployment and one actual online run. The production entry point does not accept date or force overrides; scheduled runs and Codex reruns call the same service and database. The systemd timer uses `OnCalendar=*-*-* 09:00:00 Asia/Shanghai` and `Persistent=true`. After downtime, it runs for the actual recovery date and does not backfill historical posts. The application batch exits when complete and exposes no public service port.

Production PostgreSQL enforces one daily send with a `channel + operating_date + daily_digest` primary key, and an advisory lock serializes the full run. Before sending, a transaction persists `sending`, the complete payload, and selected candidates. Mark `sent` only after a successful Telegram response contains the matching channel and a reliable `message_id`. Unknown send outcomes become `uncertain`; an interrupted database write remains `sending`. Neither state permits automatic or ordinary-command resending. An explicit API rejection is `failed` and may be rerun through the same entry point. Deleting a channel message does not delete send history or free the day's slot. Check bot and channel permissions before sending.

Local receipt files are only for historical connectivity and layout samples; they are not production send records. Production images remove those historical test-send entry points. There is no manual posting UI. A normal manual rerun is initiated by Codex on the instance with `systemctl start telegram-channel-matrix.service`.
