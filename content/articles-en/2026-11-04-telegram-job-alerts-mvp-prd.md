---
title: "Telegram Job Alerts MVP — Product Requirements"
date: "2026-11-04"
summary: "A single-source Telegram MVP for job search, filter-based subscriptions, and daily alerts, with matching rules, delivery reliability, and acceptance criteria."
category: "personal-projects"
published: true
---

# Telegram Job Alerts MVP — Product Requirements

Version: v0.1, pending review. Date: November 4, 2026.

This document records the confirmed product decisions and proposes defaults for routine interactions. Items described as defaults remain open for review; they have not each been explicitly approved. The MVP is assessed against a complete, usable user journey rather than a development-hour budget.

## 1. Goal and boundaries

Provide English-speaking remote job seekers with job search, filter-based subscriptions, and daily digests inside Telegram. Users should be able to find jobs, understand why they match, visit the source to read the full description and apply, and edit, pause, or delete subscriptions at any time.

Jobicy is the candidate data source for the first release. Verify its current API and usage rules before implementation. The interface and product messages are in English. All countries and occupations represented by the source remain available, including those with few listings. Regional labels such as Europe, APAC, and Anywhere must map to understandable matching rules. Results represent the current source's coverage, not the entire job market.

The MVP is free. Advertising is the preferred potential business model, but payments, memberships, and advertising features are outside this release. Additional sources are a future possibility. Decide on interface abstractions, category normalization, and deduplication across sources when a second or third source is actually introduced. Aggregation across multiple sources is not a current product promise.

## 2. Confirmed decisions

| Area | Decision |
|---|---|
| Audience | English-speaking remote job seekers; match by country of residence |
| Coverage | All occupations and countries offered by the source; small and empty result sets are valid outcomes |
| Entry point | Buttons inside a Telegram bot; keywords entered as a message |
| Search and subscriptions | Share the same filters; preview results before subscribing |
| Countries and occupations | Both support multiple selections and an Any option |
| Filter logic | OR within each group; AND between country, occupation, and keyword groups |
| Keywords | Optional; case-insensitive matching in title and description, with a matching text snippet |
| Geography | Include broader regions that clearly cover a selected country; explicit restrictions in the description take precedence; retain the original label |
| Subscriptions | Multiple subscriptions sharing one daily delivery time per user |
| Delivery | Daily digest; no message when there are no new matches |
| Merging | Show each job once even if it matches multiple subscriptions; identify those subscriptions |
| Presentation | A short digest with pagination inside the bot; full descriptions and applications remain on the source site |
| Ordering | Most recently published first, using the source timestamp |
| Talent pools | No dedicated filtering or exclusion mechanism in this release; retain source information |
| Monetization | Free; no monetization features in the MVP |

## 3. Core user journeys

### 3.1 First visit and search

When a user starts the bot, explain its purpose, current source, and coverage boundaries. Offer `Find jobs`, `My subscriptions`, and `Settings`.

`Find jobs` takes the user through country selection, occupation selection, and an optional keyword, followed by a filter summary and search. Selection lists support pagination, visible selection state, back navigation, and confirmation. By default, both country and occupation start at Any. Selecting Any clears specific choices in that group; choosing a specific item deselects Any.

Selections persist while paging. As a default, long lists offer a name lookup within the selection list. This helps users choose a country or occupation and does not change the job keyword filter.

Results show the total match count, filter summary, job list, and `Subscribe`, `Edit filters`, and `Next/Previous` buttons. The proposed default is five jobs per page, adjustable as a presentation parameter.

For an empty result set, show “No jobs found in our current listings.” Users can edit filters or subscribe anyway. Do not imply that a country has no jobs simply because this source has no matches.

### 3.2 Creating a subscription

From the result list, the user selects `Subscribe`, confirms the filters, and saves. The first subscription requires a local delivery time and time zone; subsequent subscriptions share that schedule.

The proposed default is a searchable city/time-zone list and a button-based time picker. Confirm the local time, time-zone name, and next delivery time. Telegram does not provide a reliable user time zone; do not silently use the server's time zone. Follow daylight-saving changes for the selected zone to preserve the chosen local delivery time.

After saving, show the subscription summary with edit, pause, and delete controls. Generate a name from its filters by default rather than adding a required naming step. For an identical active subscription, show “Already subscribed” and open the existing one. Different filters may coexist. The MVP has no arbitrary product limit on subscription count, although basic request rate limits are still necessary.

The initial search already exposes existing listings. Subsequent digests cover newly discovered matches, rather than sending the full existing inventory again on the next day.

### 3.3 Daily digest

At the user's chosen local time, collect newly discovered jobs matching any active subscription since the previous processing checkpoint.

- Merge by the source's stable job ID. Show each job once and identify the subscriptions it matches.
- Sort by source publication time, newest first; use a stable ID to break ties. When publication time is unavailable, use discovery time and label the timestamp accordingly.
- Show the new-match count and the first three jobs, with `View all` opening the full result set in the bot, five jobs per page.
- Make every result accessible. The digest preview must not discard matches beyond its display limit. Paginate a fixed result set for each digest so that live changes do not reorder pages while users browse.
- Send nothing when there are no new matches.
- If a job has closed by the time a user opens it, label it as closed rather than presenting it as confirmed open.

Three preview entries and five entries per page are proposed display defaults. Messages must respect Telegram's actual text and button limits.

### 3.4 Subscription management and settings

`My subscriptions` lists each subscription's filters and active/paused status. Users can edit, pause, resume, or delete it. Show one confirmation identifying the subscription before deletion to prevent accidental removal.

`Settings` lets users change their daily delivery time and time zone, and pause or resume all alerts. Resuming all alerts must not reactivate subscriptions that were individually paused beforehand. Provide controls to stop alerts and delete personal subscription data.

Default behavior: after a filter edit, offer current results immediately. Existing inventory newly covered by an edited filter is not automatically treated as new for alerts. Resuming a paused subscription does not trigger a backlog of all jobs from the paused period; offer “View current matches” instead. Delivery failures and recovery are handled separately from intentional pauses.

## 4. Matching rules

### 4.1 Boolean logic

Example: countries UK and Germany; occupations Marketing and Sales; keyword SaaS.

The condition is `(applicable to UK OR Germany) AND (Marketing OR Sales) AND (title OR description contains SaaS)`.

Any removes that group's restriction. With Any country, listings with unspecified geography may appear and must be labeled accordingly. When a specific country is selected, unclear geography must not automatically count as applicable.

### 4.2 Geography

Match explicit country labels and broader regions that clearly include the country, such as UK, Europe, or Anywhere. Preserve the original label and explain that geographic matching does not confirm work authorization or visa eligibility. Explicit exclusions in the description take precedence.

Implementation needs a mapping for the regional labels actually present in the current source. Do not use text containment alone. For ambiguous labels such as APAC or EMEA, follow the source's definitions. If coverage cannot be established, label it conservatively rather than assuming inclusion.

Giving description restrictions priority is the product goal, not a promise that software can detect every limitation in free text. Use explicit fields, explainable rules, and recognized restrictions in the MVP. Leave unresolved eligibility information unknown and show relevant source text. Country filtering must not be described as an eligibility review.

### 4.3 Occupations and keywords

Use the current source's occupation categories. A job matches if it belongs to any selected category. Records without a category may appear under Any occupation and are labeled Uncategorized. Do not introduce an occupation taxonomy for multiple sources in advance.

The proposed keyword default is a single optional text phrase. Trim leading and trailing whitespace, strip HTML from descriptions, and perform case-insensitive literal phrase matching. An empty value means no keyword filter. The first release has no complex search syntax, semantic expansion, or automatic synonyms. Show one snippet around a match and handle HTML safely. Revisit tokenization and relevance using actual search feedback.

### 4.4 Edits, duplicates, and republication

Use the source's stable ID as the job identity. Edits, changed publication timestamps, or republication under the same ID do not trigger repeated new-job alerts by default. Duplicate postings under different source IDs may still appear. Keep this as a known quality limitation rather than promising complete semantic deduplication in the MVP.

## 5. Job information and source links

The main list and preview fields are title, company, original geography label, source publication time, and salary when available. Missing salary is labeled Not specified rather than inferred. Display currency and pay period; do not compare hourly and annual figures as if they were equivalent.

For subscription results, identify matching subscriptions. When a keyword was provided, show a matching text snippet. Attribute the source and include the original URL, which opens the source page for the complete description and application. The free Jobicy API sends users to Jobicy first; do not describe those links as direct employer application links.

Retain source-provided talent-pool information without adding a dedicated feature for it. A bot preview does not replace the complete requirements in the original description.

## 6. Data updates and availability

The current Jobicy documentation describes a seven-day feed, an approximately three-hour delay, no more than one new synchronization pass per hour, sequential cursor pagination within each pass, and batch status checks for stored IDs. Recheck these rules during implementation. The proposed default is hourly synchronization and status checks within the published limits. Do not promise real-time delivery or a fixed maximum delay.

Treat the first import as initial inventory. Record both source publication time and the product's first discovery time. A job disappearing beyond the seven-day feed window is not necessarily closed. Manage saved jobs through status checks rather than deleting all missing records. Explicitly closed jobs leave active search results and new digests. Mark unknown records as unconfirmed and do not push them as confirmed-open jobs.

Persist synchronization progress. A failed pass must not mark existing jobs closed in bulk. Resume processing after recovery; do not advance cursors or delivery checkpoints in ways that permanently lose records. Missing fields and source status changes require graceful presentation and error recording.

Users can inspect the last successful synchronization time. If the scheduled synchronization is overdue, show “Updates delayed” rather than claiming there are no new jobs. If a source is unavailable at delivery time but valid new jobs have already been collected, a digest may include the data timestamp. With no usable new jobs, do not broadcast empty messages; expose the issue through status controls and internal alerts.

## 7. Delivery reliability

Persist subscriptions and delivery state. Rerunning a digest task should not create another normal digest for the same user and date. Retry failed delivery according to recorded state; never mark an unsuccessful send as delivered in advance.

Respect Telegram's retry instructions for HTTP 429. Stop futile retries when a user has blocked the bot, and record the unreachable state. After an outage, the default is to merge undelivered jobs into a recovery digest, excluding closed records, rather than sending many separate daily backlogs.

A Telegram request can time out after the message has already been accepted. Absolute exactly-once delivery cannot be guaranteed. Preserve task state, retry cautiously, and record anomalies to reduce duplicate delivery.

Internal operations need basic visibility into synchronization failures, digest failures, and queue backlogs. A complex administration console is unnecessary for the MVP.

## 8. Analytics and evaluation

| Event | Main fields or purpose |
|---|---|
| start | Entry attribution when available |
| search_completed | Countries, occupations, keyword presence, and result count; identify demand and supply gaps |
| zero_results | Linked to search_completed to avoid double counting |
| subscription_created/edited/paused/deleted | Filters and status; observe sustained interest |
| digest_generated/sent/failed | User, digest ID, match count, deduplicated count, and delivery status |
| result_page_viewed | Search or digest context and page number |
| job_open_clicked | Job ID, source, and subscription/search context; observe application intent |
| delivery_unreachable | Explicit delivery unavailability, distinct from silent inactivity |

Click measurement must preserve attribution and source links. The proposed default is a Telegram callback associated with a job, recording the interaction before offering a clearly labeled source URL button. The Bot API cannot observe clicks on ordinary URL buttons directly. During implementation, verify whether a single callback can open the external link; if it cannot, account explicitly for the additional button action. Do not introduce an invisible redirect-tracking domain.

For keyword-demand analysis, retain only necessary, sanitized statistics by default, not full chat transcripts. Do not require additional contact details. Support deletion of personal subscriptions and associated identifiable event data.

Observe start-to-search-to-subscription conversion, zero-result rate, search demand versus supply by country and occupation, the share of users receiving nonempty digests, job clicks, active use after 7 and 14 days, and pause/delete/unreachable events. The Bot API does not expose private-chat message read rates. Successful delivery is not a read receipt. Users may stop because they found work, so departure alone does not establish product failure.

Do not invent mandatory growth targets. Keep low-supply segments accessible and use their demand signals to guide future source research. Actual demand and cost should determine expansion.

## 9. MVP acceptance scenarios

1. A new user can select multiple countries and occupations through English buttons, skip the keyword, and keep selections while paging.
2. OR within groups and AND between groups work correctly. Any cannot coexist with specific items. Users can edit or subscribe to an empty search.
3. Search and subscriptions use consistent matching rules. Both title and description can produce keyword matches with visible snippets.
4. Defined regional mappings correctly match countries, recognized explicit exclusions apply, and unknown information is not presented as confirmed eligibility.
5. Users can create different subscriptions and edit, pause, resume, or delete them. They can confirm and change their schedule and time zone.
6. Initial inventory is available in search, and the first daily digest does not resend all jobs that existed when the subscription was created.
7. Jobs matching multiple subscriptions appear once, with subscription names; results follow publication-time ordering.
8. The digest total agrees with its complete paginated result set. All matches are accessible; no matches means no message.
9. Subscriptions and pending deliveries survive restarts. Failures can be retried; source outages do not clear data, and rate limiting does not discard messages.
10. Leaving the feed window does not count as closure. Closed jobs leave active results; old digests do not falsely confirm that a job is still open.
11. Stopping alerts, pausing subscriptions, and deleting personal data take effect. Application links lead back to the source with attribution intact.
12. Analytics distinguish absent supply, available supply without clicks, and delivery failure. They do not fabricate message reads or completed applications on external sites.

## 10. Implementation checks still needed

These are implementation investigations, not reasons to reopen confirmed scope as more multiple-choice questions:

- Current Jobicy licensing, rate limits, fields, and status semantics, plus observed additions and failures over consecutive days.
- Actual country/region labels and occupation categories, especially ambiguous regional mappings and the scope of description-restriction detection.
- Telegram interaction checks for long messages, buttons, persistent multiple selection, time-zone selection, and click recording.
- Deployment, bot identity, data-retention periods, and internal failure notification channels, chosen against the actual implementation environment.

References: [Jobicy API documentation](https://jobicy.com/jobs-rss-feed) and [Telegram Bot FAQ](https://core.telegram.org/bots/faq). The source research was sampled on November 4, 2026, Beijing time. Recheck interfaces and usage rules during implementation.
