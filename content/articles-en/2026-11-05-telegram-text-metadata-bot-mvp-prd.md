---
title: "Telegram Film Text Metadata Bot: MVP Product Requirements"
date: "2026-11-05"
summary: "Product scope, Chinese and Japanese interactions, filters, pagination, privacy, and verified integration status for a text metadata bot."
category: "personal-projects"
published: true
---

# Telegram Film Text Metadata Bot: MVP Product Requirements

Version: v0.5, blog edition. Date: November 5, 2026.

Related document: [MVP technical design](./2026-11-05-telegram-text-metadata-bot-mvp-technical-design.md).

> Release status: [JAVIndexBot](https://t.me/JAVIndexBot) is deployed. This document defines requirements; deployment does not establish that every acceptance scenario has passed. Controlled live search, detail, and account calls, plus a real start and age confirmation, have been verified. Complete Chinese and Japanese client journeys and live filter behavior remain subject to acceptance checks.

## 1. Goals and scope

A user sends a film identifier or keyword in a private Telegram chat and receives readable text results. The user can narrow the results with a few common filters, open a record, return to the same filters and page, and switch between Chinese and Japanese interfaces with a saved language preference.

The MVP evaluates a query interface, supplier data mapping, and Telegram interaction. It does not evaluate acquisition, monetization, advertising, or a self-collected data asset.

### Content boundary

Only explicitly mapped text fields may be displayed: identifier, title, release date, duration, cast, maker, label, series, director, and categories. Remove supplier media fields during server-side mapping.

Do not return video files, playback URLs, preview streams, cover images, magnets, torrents, download or cloud-drive links, access-control bypass instructions, unrelated recommendations, promotions, or external group invitations. The bot indexes text; it does not distribute the underlying media.

A public text source-record link may eventually be offered after checking the supplier's display terms. It must not become a download entry point. Source URLs are not currently exposed while that check remains pending.

### Exclusions

No registration, membership, payments, advertising, favorites, query history, subscriptions, rankings, recommendations, bulk exports, group chats, Mini App, self-managed collection, historical catalog, multiple-source merging or deduplication, alias normalization, complex full-text search, or autocomplete dictionary.

## 2. Users, languages, and confirmed decisions

The product serves individuals looking up text records in private Telegram chats. Users do not need their own supplier account or API key.

| Situation | Language rule |
| --- | --- |
| First `/start` | Select Chinese or Japanese from Telegram `language_code`; default to Chinese otherwise |
| Manual selection | `/language` offers 中文 and 日本語 |
| Saved preference | Takes priority over the language of an individual message |
| Search text and filters | Preserve user input; do not translate names or keywords |
| Supplier content | Preserve original titles and entity names |
| Interface | Translate labels, help, errors, and buttons into the selected language |
| Administration | Use the administrator's language; internal error identifiers remain English |

Japanese copy requires its own review of button lengths, dates, help, and error wording.

| Decision | MVP choice |
| --- | --- |
| Product | Native Telegram bot, private text input and inline buttons |
| Supplier | JavInfo only, bounded by verified capabilities |
| Storage | Query on demand; no historical film catalog |
| Results | Text list, text details, inline pagination |
| Page size | Five records |
| Details | Requested only when opened |
| Failure handling | Understandable error, manual user retry |
| Administrator | Numeric Telegram user ID allowlist |
| Monetization | No payment, advertising, or quota sales |
| Age confirmation | Confirm age 18 or older before querying; retain confirmation |

## 3. Commands, menus, and access

| Command | Access | Behavior |
| --- | --- | --- |
| `/start` | Everyone | Create or restore profile and show the home/age-confirmation screen |
| `/help` | Everyone | Explain queries, filters, details, back navigation, and failures |
| `/language` | Everyone | Choose Chinese or Japanese |
| `/cancel` | Everyone | End the current interaction and return home |
| `/privacy` | Everyone | Explain data/content boundaries and offer age-confirmation reset |
| `/status` | Administrator | Read current supplier balance, paid status, rate limit, and account connectivity |

Ordinary command menus omit `/status`. The server still checks authorization, including private-chat context, when executing it. Unauthorized users receive a localized permission error without operational details.

The home screen offers search, help, language, privacy/content information, and cancellation. It does not expose balance, billing, API keys, internal supplier names, or operations information. An administrator may see a private status entry.

Account status includes retrieval time and fields actually returned by the supplier. A successful account call establishes account-endpoint connectivity only. On failure, display a failure message rather than a stale balance. Recharging is outside scope.

## 4. Main journeys and interaction requirements

### First visit

`/start` creates or restores the profile, chooses the interface language, and explains the text-only scope. Before querying, the user must confirm being at least 18. Refusal or cancellation must not save confirmation. Saved confirmation applies to subsequent sessions and can be cleared through `/privacy`.

Users may send an identifier or keyword directly, or first open help or language settings. Server checks must enforce age confirmation independently of button visibility.

### Query

1. Trim the input. Empty input shows a localized example without calling the supplier.
2. Show a loading state promptly.
3. Submit the query through the provider adapter.
4. Display one result message with summaries and inline actions.
5. Let the user open details, filter, paginate, or begin a new query.
6. New text creates a new query context; an obsolete response must not overwrite the current view.

Identifier-shaped input is classified as a code query; other text is classified as a keyword query. The current adapter submits both through search. Opening a detail record makes a separate request using the exact film identifier. There is no automatic correction, translation, semantic expansion, or promised fuzzy matching.

### Result list

Show five entries per page: position, film identifier, text title, release date, and maker when present. Omit absent fields rather than printing `null`, `undefined`, or empty labels.

Offer record details, filters, previous/next page, new search, and home/cancel actions. Hide Previous on the first page. Show only the current page number when a reliable total is unavailable. If a next-page request is empty, retain the previous results and explain that there are no more records.

Shorten summaries to fit Telegram limits; keep fuller text for details. Review Chinese and Japanese button lengths independently.

### Details and return

Group available fields into basic information, related entities, categories, and source information. Hide empty groups. Never pass supplier-specific media or unverified fields directly into a message.

Back to results restores the query, applied filters, and page; it does not promise to restore the Telegram client's scroll position. Use ordinary, copyable text for identifiers and formatted metadata. Inline buttons do not promise clipboard access.

## 5. Search, filters, and pagination

| Field | Input and behavior |
| --- | --- |
| Actress/cast | Text, using supported supplier matching |
| Maker and label | Text, only where supported |
| Series | Text |
| Release range | Explicit start/end dates; inclusive end date is a requirement requiring live boundary verification |
| Duration range | Minimum/maximum minutes, for records with duration |
| Version flags | Not exposed: no verified reliable mapping |

No nested filter tree, multiple values per field, arbitrary expressions, cast exclusions, category intersections, or automatic vocabulary normalization.

Keep filters collapsed until opened. Show a summary and Apply, Reset, and Cancel actions. Editing changes a draft only. Apply commits the filters and restarts at page one; Reset clears the draft while preserving the keyword; Cancel returns to the prior results. Returning from a field editor preserves the draft. Sorting offers relevance or release date, with the supplier's default relevance/stable order otherwise.

Unavailable fields must be explained before application, never silently represented as effective. Matching semantics depend on the supplier and still require live checks.

Pagination uses the supplier's page number or cursor. Callback data carries short identifiers; query conditions stay in a server-side session. Validate owner, active session, version, expiry, and record index. Source updates may change subsequent pages; historical page snapshots are outside scope.

## 6. Source and field mapping

Verify authentication, limits, billing, nullable fields, pagination, and errors against current documentation and controlled live calls. Do not turn unverified capabilities into promises.

Each allowed product field needs an explicit source/type/nullability/display mapping. Omit missing values instead of guessing. Preserve source date semantics, normalize duration to minutes, and retain original category and organization names.

Allowlist mapping must discard `sampleUrl`, `gallery*`, videos, `.m3u8`, magnets, torrents, downloads, and equivalent media access fields. Do not log their complete values.

A future source button may link only to a verified public text record after terms review. No hidden redirect, download proxy, shortened access route, or media extraction. An absent or unavailable source must not break the remaining text fields.

## 7. States, errors, and retries

| State | Chinese | Japanese | Behavior |
| --- | --- | --- | --- |
| Loading | 正在查询… | 検索中… | Prevent duplicate submission |
| No results | 没有找到匹配记录，请修改关键词或筛选条件 | 条件に一致する情報が見つかりません。検索条件を変更してください | Preserve input for editing |
| Empty next page | 已经没有更多结果了 | これ以上の結果はありません | Keep current page |
| Missing detail | 这条记录暂时无法查看 | この情報は現在表示できません | Return to results |
| Rate limit | 请求较多，请稍后再试 | リクエストが多いため、しばらくしてから再試行してください | User retries later |
| Insufficient balance | 查询服务暂时不可用，请稍后再试 | 検索サービスを一時的に利用できません。後でもう一度お試しください | Hide billing/recharge details from ordinary users |
| Timeout/unknown error | 查询失败，请重试 | 検索に失敗しました。もう一度お試しください | Retry/back actions |
| Expired session | 此操作已过期，请重新发送关键词 | この操作は期限切れです。キーワードを再送信してください | Do not execute stale actions |

Default supplier timeout is 20 seconds. End the loading state on failure. Do not automatically repeat potentially billable calls. HTTP 200 with an empty result is not a successful match.

No background query-retry queue, automatic source switching, complex circuit breaker, repair workflow, or public service-status page is required for the MVP.

## 8. Sessions, privacy, and retention

Query text, current page, identifiers, and view state live in a short-lived server session with a default TTL of 30 minutes. These are navigation state, not a user-visible history. Language and age confirmation belong to the durable profile and do not expire with the query.

Sessions are scoped to a user/private chat. Database persistence allows valid sessions to survive an application restart; cancelled, obsolete, or expired actions must not launch unknown queries. Buttons contain no full query, API key, or supplier response.

Webhook updates are temporarily stored in a database inbox to acknowledge delivery promptly and deduplicate updates. Processing clears the payload, while deduplication IDs remain for seven days. Queued updates may survive a restart. This temporary storage needs to be disclosed in privacy copy.

Do not retain a full query history or supplier catalog. Logs should contain minimal operational categories, timing, counts, and request correlation, excluding credentials, complete input, supplier bodies, and media URLs.

`/cancel` ends the interaction. `/privacy` can clear age confirmation and query sessions; it does not delete the entire profile or saved language. Full profile deletion remains an outstanding capability. No complex export/deletion administration system is included.

## 9. Operations requirements

Distinguish user errors, supplier failures, and internal failures. Bound request duration and rate, avoid duplicate charges, and keep callbacks from accumulating. Keep API keys in server-side configuration, outside Git, images, logs, callbacks, and messages.

Only authorized numeric IDs may execute `/status`. Health checks establish process/database readiness, not the health of every supplier source. Recent supplier success/failure diagnostics are required operationally, but complete persistent diagnostics and automatic retention cleanup are not yet implemented.

No public HTTP administration UI, business dashboard, complex alerting, automatic scaling, or multiple-instance scheduling is required.

## 10. Acceptance scenarios

1. Chinese and Japanese users can start, confirm age, search, browse results, open details, return, and begin another query with correctly localized controls.
2. Unconfirmed users cannot query; resetting confirmation requires it again.
3. Language switching does not allow an old response to overwrite the current interaction.
4. Detail return preserves query, filters, and page.
5. New searches and cancellation prevent stale view updates.
6. Results contain only permitted text; missing fields, long titles, special characters, and Japanese/Chinese text remain readable and safe.
7. Unsupported filters have visible degradation and cannot silently appear effective.
8. API keys never enter messages, callback data, or logs.
9. Empty results/pages, missing details, rate limits, balance failures, timeouts, and unknown errors have appropriate recovery.
10. Failures leave loading state and do not create unbounded automatic billing.
11. Ordinary users cannot inspect account balance or rate limits; admin checks remain server-side.
12. Stale, expired, and cross-user actions do not execute queries.

## 11. Explicit MVP exclusions

Acquisition, ads, payments, membership, recharge, subscriptions, favorites, history, recommendations, rankings, group chats, Mini App, bulk export, historical storage or crawling, multi-source merging/deduplication, aliases, keyword translation, complex query syntax, and media access remain outside scope.

## 12. Integration verification and remaining acceptance work

As of November 5, 2026, current [JavInfo documentation](https://docs.javinfo.dev/) and controlled calls establish:

| Item | Verified contract | Qualification |
| --- | --- | --- |
| Authentication | `https://api.javinfo.dev`, header `x-javinfo-key` | Server-side only |
| Search | `POST /query`, `q`, `num`, one-based `page` | Bot uses five entries; numeric totals in one sample do not prove reliability for every source |
| Detail | `POST /movie`, exact `dvdId`, wrapped `result` | Extra on-demand call; search `id` is not interchangeable with `dvdId` |
| Account | Free `GET /profile`: `balance`, `hasPaid`, `rpm` | Administrator only |
| Pricing | Documented $0.0004/search at num 1–10; $0.0008/detail | Documentation describes successful HTTP 200 billing; empty-result edge cases follow actual supplier rules |
| Fields | Search `results[]` differs from detail `result`; text may be nested in `extra` | Explicit mapping discards media |
| Failures | Documented 401, 402, 429, and 503 | Not all error conditions were triggered live; no automatic retry |

Deployment, webhook, health checks, and runtime database permissions passed checks. A real user sent `/start` and confirmed age. Sixteen unit tests and one PostgreSQL integration test passed; the integration test uses a real database with mocked Telegram and supplier interfaces, covering bilingual flows, deduplication, filters/sorting, pagination, details, and privacy.

Outstanding work includes complete real-client Chinese/Japanese journeys and layout checks; multiple live filter/sort combinations, date boundaries and pagination stability; longer-term cost/limit observations; source-link terms; caching/display/user-scale terms; full profile clearing; and persistent minimal diagnostics with retention cleanup. These remain acceptance work rather than completed product claims.
