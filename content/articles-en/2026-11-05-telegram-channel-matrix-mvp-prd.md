---
title: "Telegram Content Channel Matrix MVP PRD"
date: "2026-11-05"
summary: "Defines the positioning, content rules, automated publishing, and observation metrics for Telegram channels covering AI/software updates and Steam China deals."
category: "personal-projects"
published: true
---

# Telegram Content Channel Matrix MVP PRD

Version: v0.1  
Updated: 2026-11-05

## 1. Product goal

Start several Chinese-language vertical Telegram channels with a small set of reusable publishing capabilities, and learn whether each topic can consistently provide value to readers. The MVP aims to begin publishing and collect observable signals quickly. It does not aim to automate every source, build a unified brand, or prove revenue.

Each channel is an independent content product with a clear promise and scope. Source ingestion, content processing, publication records, email notifications, and observation capabilities should be reusable so that adding a channel mainly requires configuration and sources rather than rebuilding the common workflow.

## 2. Current decisions

| Area | MVP decision |
|---|---|
| Experimentation | Test multiple categories; operate each vertical channel separately |
| First channels | AI/software updates; PC game deals |
| Language | Simplified Chinese |
| Audience | Avoid a detailed fixed demographic profile; keep an adjustable reader hypothesis for each channel |
| Brand | No unified brand requirement; brand building is outside the MVP goal |
| Publishing | Publish automatically after validation; no per-item human approval |
| Unit of publication | One daily digest per channel containing multiple items, not one post per candidate |
| Collection cadence | One daily collection, screening, and compilation run; recheck Steam prices and validity before sending selected deals |
| Items per digest | Up to five in the first release, with no padding; fewer than three is acceptable, and no empty digest is sent |
| Notifications | Email reports delivery results and exceptions; it is not an approval step |
| Geography | AI/software content serves Chinese readers globally; game deals only guarantee Steam China pricing in the first release |
| Retirement rules | Keep a separate section in this PRD; discuss thresholds after observing data |

## 3. Reader assumptions and prompts

The audience need not be segmented by fixed traits such as age or occupation, but each channel still needs an actionable reader assumption. That assumption affects sources, selection, explanation depth, geographic labels, exclusions, and cadence, as well as prompts.

The MVP uses lightweight, adjustable assumptions:

- AI/software updates: Chinese readers who want to understand important changes in AI and software products quickly. Prefer updates with a clear impact, feature, or use case.
- PC game deals: Chinese users interested in Steam China PC discounts who want to quickly judge whether a deal is worth opening.

A prompt turns a channel's selection criteria and voice into copy; it does not replace channel positioning. Each channel maintains versioned prompts and content rules. Shared summary fields, source attribution, and safety constraints should be reused where possible.

## 4. MVP channel definitions

### 4.1 AI/software updates

Promise: select notable AI and software product updates in Simplified Chinese and explain what changed and why it matters.

Initial scope:

- Official releases of models, products, features, and developer tools.
- Major version or service changes with a clear impact on the intended readers.
- Important updates should explain what changed, who should care, and where readers can inspect the primary information.

Excluded for now:

- General AI industry news, opinion, and unverified rumors.
- Course promotions, pure marketing copy, duplicate releases, or items with only a changed headline.
- Items without a reliable primary source or a verifiable publication time.

Initial primary sources:

- OpenAI official News RSS.
- Google AI official Blog RSS.
- Hugging Face official Blog RSS.

GitHub Changelog may be a lower-priority supplemental source, favoring updates directly related to AI and developer tools. Product Hunt, Chinese technology media, and other aggregators will not be connected automatically for now. Reassess only if observation shows that primary sources consistently miss valuable content.

### 4.2 PC game deals

Promise: select representative Steam China PC discounts in Simplified Chinese, clearly stating the pricing region and promotion conditions.

Initial scope:

- Discounts in the Steam China store.
- Prefer meaningful discounts on games with explainable value while the offer is still valid.
- Each item states the game name, discounted price, discount, applicable store region, promotion end time when provided, and Steam store link.

Excluded for now:

- Cross-region price comparisons across other stores.
- "Free to claim" offers whose region, end time, or claim conditions cannot be verified.
- DLC, items, demos, free weekends, and permanently free games unless separate rules are defined later.

Initial primary source: Steam China store discount information, with the store page as the reader verification link.

GamerPower may be considered later for free claims, but current results often lack end times and include expired items, so it is not part of the automated MVP publishing path. Automated access to the Epic free games page encountered restrictions in this research, so it is not an initial dependency.

## 5. Source integration principles

Prefer primary sources and defer marginal sources. Source count is not a goal: a new source must add valid content missing from primary sources, with acceptable maintenance effort and terms of use.

Record for each candidate source:

- Name, owner, public entry point, and access method.
- Language, geography, update time, and expected cadence.
- Available fields, historical/current coverage, and reliability.
- Limits on citation, attribution, caching, commercial use, and republication.
- Incremental volume of qualifying content compared with existing sources, rather than total API results.

Link to the original announcement, release page, or store page whenever possible. Readability does not imply permission to copy full text or images or retain them indefinitely. Skip publication and notify by email when permissions are unclear, required fields are missing, or source status is abnormal.

## 6. Content and publishing requirements

### 6.1 General

- Publish in Simplified Chinese. Keep proper names in their original form and add a short explanation where useful.
- Each item includes a title, original short summary, primary source link, and source time.
- State only facts supported by the source; do not add unverified inferences.
- Deduplicate the same fact or product across sources, preferring the more authoritative and timely source.
- Do not publish expired, duplicate, unsourced, incomplete, or invalid candidates.
- Record the source, generation time, channel rule and prompt versions, validation result, and Telegram message ID for audit and observation.

### 6.2 AI/software digest format

The digest title is “AI Product Radar · Daily Picks,” with the operating date and actual item count. Publish one Telegram message per digest. Number each item and include:

1. A short update title.
2. One or two Chinese sentences explaining what happened and, where clear, its impact. Do not guess when the impact is unknown.
3. The item's own original release link, source, and publication time; do not substitute one generic link for all items.

### 6.3 Game deal digest format

The title is “Steam Deal Watch · Daily Picks,” with the operating date and actual item count. Number each game and include:

1. Game name and necessary platform/edition details.
2. China-region current price, struck-through original price, and discount prominently.
3. A brief one- or two-sentence game description.
4. Promotion end time. Do not invent one when absent or unverifiable; skip or label unknown according to the rules.
5. The game's Steam store link. Label the digest as China region / CNY.

Keep the digest within Telegram's single-message limit. If it is too long, remove lower-priority items from the end while preserving complete paragraphs and sources; do not split by default. Keep candidate, copy, and validation records per item. Use channel + operating date + daily digest as the publication and deduplication unit, recording the candidates included. The deployment instance starts at 09:00 China Standard Time daily; sending occurs after collection, screening, and drafting finish. The start time is not a delivery-time guarantee.

## 7. Automated publishing and exceptions

There is no per-item human approval in this phase. Automatic publishing is conditional: publish only after source, freshness, duplication, and required-field checks pass. Record skipped candidates in the run log.

System requirements:

- Check sources, organize and deduplicate candidates, write Chinese summaries, validate rules, and publish daily.
- If one source fails, continue with other available primary sources. Record the failure; do not present missing-source data as “no new content.”
- Scheduled runs and Codex reruns share the same daily publication record. Each channel may publish at most one digest per China Standard Time calendar day. A Telegram rejection may be retried through the same entry point. Never resend when delivery succeeded or is uncertain; provide no manual publishing UI. Deleting a Telegram message does not release that day's slot.
- Prevent duplicate publication when a task is rerun.
- Skip and report low-confidence items, source conflicts, unclear expiration, or inconsistent key price/eligibility fields.

Email reports include the run date, source success/failure, candidate and publication counts, skipped counts and reasons, send failures, and exceptions requiring attention. Email provides operational visibility; recipients do not approve later publishing.

## 8. Observation metrics

The MVP first creates usable records and sets no retirement threshold before launch. Initial screening effort is observational data for understanding categories and sources, not an automatic stop condition.

Where practical, record per item and daily run:

- Candidate, deduplicated, validated, published counts, and skip reasons.
- Source availability, expiration/error details, and corrections.
- Telegram views at comparable post ages, with publication and sampling times.
- Unique qualifying content contributed by each source.
- Manual review or curation effort, if any, as learning data only.
- External-link clicks only if compliant, maintainable tracking is later added; a click is not a purchase or game claim.

Compare channels or content types by post age, language, geography, and type. Missing measurements are unknown, not zero. MVP results help decide what is worth observing further; they do not prove demand, growth, or revenue.

## 9. Extensibility

Describe new channels through independent configuration rather than copying a dedicated pipeline. Each channel defines at least:

- Its promise and provisional reader assumption.
- Allowed/excluded content and geography/language rules.
- Primary sources, priorities, and fallback behavior.
- Content fields, summary format, prompt version, and validation rules.
- Expiration and deduplication policies, and handling of low confidence.
- Publishing frequency and channel-specific metrics.

Shared capabilities cover source registration and checks, normalized candidates, deduplication, drafting, validation, publication idempotency, records, email reports, and metrics collection. Extend channel-specific fields or rules through configuration/adapters rather than rewriting the pipeline for each category.

Possible later channel areas include cybersecurity, scholarships/competitions/applications, job picks, travel deals, books and culture, other game stores, and free claims. Being a candidate does not mean launch approval; first assess source coverage and usage terms.

## 10. Retirement and investment rules (to be discussed)

Keep this section but set no thresholds in the first release. After collecting enough data on source coverage, published content, views at comparable post ages, and maintenance cost, discuss when to pause, expand, or split channels. Do not retire a category based only on subscriber totals, one viral post, or one source outage.

## 11. Topics for later discussion

- Daily collection and one digest are decided: run in `Asia/Shanghai` at 09:00 and send after processing.
- Minimum discount/price criteria for game deals and the definition of a “representative” game.
- Importance tiers for AI/software updates.
- Email summary time and exception severity levels.
- Whether to enable click tracking in the MVP.
- Audience acquisition and promotion; do not assume new channels will grow organically.
- Server isolation, deployment, API integration, and operating costs.
- Retirement and investment thresholds.
