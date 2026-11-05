---
title: "Telegram Film Text Metadata Bot: MVP Technical Design"
date: "2026-11-05"
summary: "Node.js, grammY, PostgreSQL, the verified JavInfo contract, a durable webhook inbox, deployment, backups, and acceptance boundaries."
category: "personal-projects"
published: true
---

# Telegram Film Text Metadata Bot: MVP Technical Design

Version: v0.2, blog edition. Date: November 5, 2026.

Related document: [MVP product requirements](./2026-11-05-telegram-text-metadata-bot-mvp-prd.md).

> This edition reflects the initial deployed implementation and distinguishes requirements from verified behavior. Health checks, automated tests, and a few live supplier calls do not establish complete user acceptance.

The bot returns film text metadata only. It provides no video, previews, magnets, torrents, downloads, or media access. JavInfo is the only supplier. Search, detail, and account endpoints have been checked against current documentation and controlled live calls; filter effectiveness and source-display terms still require verification.

## 1. Technology choices

| Area | Choice | Reason and limit |
| --- | --- | --- |
| Application | Node.js 24, TypeScript, pnpm 10.32.1 | Shared baseline with the existing job bot |
| Telegram | grammY with webhook | Existing HTTPS entry point, no polling conflict |
| HTTP | Fastify | Health/readiness checks and exact webhook route only |
| Data | PostgreSQL 17, Prisma 7, pg adapter | Durable preferences and short-lived query state |
| Scheduling | In-process cleanup | No subscriptions or synchronization service |
| Supplier | JavInfo adapter | Explicit mapping without premature multi-source aggregation |
| Deployment | Docker Compose, Nginx, GitHub Actions | Repeatable releases and compatible rollback |
| Backup | Independent logical database backup | Language and age confirmation remain user data |

One resident process runs HTTP, Telegram interactions, supplier calls, inbox consumption, and cleanup. The pool limit is three, with one connection retaining the application instance lock. There is no separate worker process, Redis, search engine, object storage, or supplier-response cache service.

## 2. Resource and deployment boundaries

Use the existing Ubuntu-3 host and a separate Compose project. Bind host `127.0.0.1:3051` to container port 3000; Nginx forwards only the exact webhook path.

Initial application limits are 192 MiB, 0.5 CPU, and a 96 MiB V8 heap. Migration tasks have a separate 192 MiB limit. Observe response sizes, Telegram text lengths, memory, restarts, and OOM before changing the budget. Readiness is not a substitute for bilingual query acceptance.

Share the existing PostgreSQL process, network, and physical volume, but isolate the database and roles:

- Database: `telegram_metadata`.
- Migration owner: `telegram_metadata_owner`.
- Runtime role: `telegram_metadata_app`, application-table CRUD only.
- Deployment directory: `/opt/apps/telegram-metadata`.
- Independent Compose configuration, backup directory, and release image tags.

The shared PostgreSQL service is a lifecycle dependency. Disabling or moving this project must not remove a container, network, or volume still used by other applications. Export only this database when migrating.

## 3. Repository and configuration

```text
src/
  main.ts              Startup, instance lock, cleanup, shutdown
  http.ts              Health, webhook secret, durable admission
  inbox.ts             Sequential consumption and restart recovery
  commands.ts          User/admin command menu registration
  config.ts            Environment validation
  db.ts                Pool, database-name check, instance lock
  bot.ts               Commands, interactions, sessions, admin route
  ui.ts                Results, details, filters, buttons
  i18n.ts              Chinese/Japanese dictionaries
  provider.ts          Supplier calls, validation, mapping
  query.ts             Classification and filter validation
  content-policy.ts    Allowed text/content boundary
prisma/
  schema.prisma
  migrations/
infra/
  compose.yml
  compose.local.yml
  nginx-location.conf
scripts/
  deploy.sh
  backup.sh
  render-env.py
tests/
  *.test.ts
  integration/
docs/
  operations.md
  source.md
```

Production credentials live in GitHub Actions Secrets and are injected into a mode-600 runtime environment file. Never commit them or bake them into an image. Configuration includes database/runtime identity, expected database name, bot token, webhook secret/URL, supplier key/base URL, administrator numeric ID, pool size, session TTL, and port.

Only `provider.ts` consumes supplier configuration. Endpoint paths, pagination, and result-count parameters must not spread into interaction logic.

## 4. Data model and retention

### User

A CUID identity, unique Telegram numeric user ID and private chat ID, `zh`/`ja` language, nullable age-confirmation timestamp, active session ID, and creation/update/last-seen timestamps. No avatar or username history. Administrator authority comes from configuration rather than a duplicated profile flag.

### QuerySession

Store an unpredictable CUID, owner, version, length-limited query text, code/keyword classification, separate applied/draft filters, current/previous page token, page number, optional total, normalized text summaries, view, expiry, and timestamps. The maximum query length is 200 characters.

Detail callbacks contain a session ID, state version, and result index. Resolve the exact supplier identifier on the server; do not embed full queries, supplier bodies, or credentials in callback data.

### ProviderCall

The planned diagnostic record contains provider, operation, status category, duration, internal error type, request correlation ID, and timestamp, with a proposed 30-day retention. It must exclude full URLs, keys, query text, responses, and media fields.

The table exists, but call-record writes and 30-day cleanup are not connected in the initial implementation. Do not describe it as complete observability.

### TelegramUpdate inbox

`updateId` is the primary key, with nullable payload, state, and creation time. Admission inserts `queued` with deduplication. An in-process consumer takes updates in ID order, marks `processing`, then `done` or `failed`, clearing payload immediately on completion.

At restart, queued updates remain available. Previously processing updates become `interrupted` and lose their payload without automatic replay: a supplier call may already have incurred a charge. This reduces duplicate processing but cannot guarantee exactly-once external calls or Telegram messages.

Retain processed deduplication records for seven days. Queued payloads are not automatically removed by that cleanup rule; operators must watch backlog.

### Cleanup

Query sessions have a default 30-minute TTL. Language and age confirmation persist with the user. Every ten minutes, the current implementation deletes expired sessions and non-queued inbox records older than seven days. Bounded deletion batches are not implemented and should be added before larger volumes. Index expiry/creation columns. Cleanup errors must not block query handling.

## 5. Supplier adapter and verified contract

The internal provider exposes search, detail, and account-status operations. Search input includes text, classification, supported filters, sort, page token, and page size. Unsupported parameters must not silently appear effective.

### Classification and mapping

Trim input and enforce length. Identifier-shaped input is classified as `code`; other input is `keyword`. Both currently call search with `q`. Details use the exact `dvdId`; there are not two distinct implemented search paths.

Validate raw response shapes before explicitly mapping identifier, title, release date, duration, cast, maker, label, series, director, and categories. Missing values stay absent. Preserve original entity names and source date semantics. Do not guess dates or duration.

Whitelist mapping discards cover/image/sample/video/stream/download/magnet/torrent fields, including `sampleUrl`, `gallery*`, and `.m3u8` access. Supplier URLs are not currently shown. Escape dynamic text before Telegram HTML rendering.

### Requests and failures

Use a default 20-second timeout. Map authentication, insufficient balance, rate limit, supplier 5xx, invalid response, and network timeout into internal categories. Respect the meaning of `Retry-After` if supplied without sleeping/retrying indefinitely in the user request. Automatic retries and source switching are disabled, including billable calls. Empty results are not schema errors.

### Verified endpoints

Based on [JavInfo documentation](https://docs.javinfo.dev/) and controlled calls on November 5, 2026:

| Endpoint | Contract | Pricing/boundary |
| --- | --- | --- |
| Base/auth | `https://api.javinfo.dev`, `x-javinfo-key` header | Key stays server-side |
| `POST /query` | `{ q, num, page, filter?, sort? }`; `results[]`, `count`, `total` | Bot uses five records; documented num 1–50, $0.0004/call at 1–10 |
| `POST /movie` | `{ q: exactDvdId }`; wrapped `result` | $0.0008/call; 404 means unavailable detail |
| `GET /profile` | `balance`, `hasPaid`, `rpm` | Free; admin only |

Search `id` and `dvdId` are not interchangeable. Search may nest duration, maker, cast, and categories in `extra`; detail commonly returns `titleEn`, `titleJa`, `runtimeMins`, `makers[]`, `directors[]`, `categories[]`, and `actresses[]`. Validate the two shapes independently.

`filter` and `sort` are sibling top-level parameters. Supported filter inputs include cast, maker, label, series, release bounds, and duration bounds. Version flags remain hidden. Validate actual calendar dates and range order; validate finite duration values and minimum/maximum order. Editing, returning, or resetting a filter draft does not call the supplier. Apply starts a new first-page request.

Documentation defines 401, 402, 429, and 503 and successful HTTP 200 billing. Controlled live search, detail, and account calls succeeded; not every error was deliberately triggered. Multiple live filter/sort combinations, date boundaries, and source-link terms remain unverified. Keep verification notes in `docs/source.md`, excluding credentials and raw supplier records.

## 6. Telegram consistency and interaction

### Webhook admission

Expose the exact webhook route, `/healthz`, and `/readyz`. Compare the Telegram secret header in constant time, bound the body size, validate update ID, and deduplicate into the inbox. Return 200 only after the database commit. Return 503 on database failure so Telegram can retry. Private-chat and user authorization checks run during consumption.

A single in-process consumer processes updates globally in sequence. Version checks still protect asynchronous result/detail rendering. This controls concurrency on a small instance, but a slow supplier call blocks later interactions, including other users. Scaling requires partitioning by chat while preserving per-chat ordering and charge protection.

### First start and age confirmation

`/start` creates/restores a user and chooses the interface. Unconfirmed users see localized confirmation rather than an active search interface. Confirmation saves a timestamp; refusal/cancellation does not. `/privacy` can clear it and the current sessions. Every search, detail request, and filter application must enforce confirmation server-side. This is a product gate, not a legal eligibility determination.

### Results, filters, and details

Render five summaries with localized controls. Keep query, applied filters, page tokens, and normalized summaries in the database. Validate callback sender, active session, version, expiry, and index before requesting detail.

Returning restores the server-side page, not the client's exact scroll position. New input creates a new context; cancel invalidates the old context without deleting the profile. Empty next pages retain the previous result page. Clear absent pagination tokens explicitly so stale tokens cannot survive.

Filters keep `draft` separate from `applied`. A field editor returns to the draft; Cancel discards it; Apply queries page one. An asynchronous detail response must recheck state before changing the UI.

### Localization

Use typed Chinese/Japanese dictionaries for fixed copy. Preserve original supplier titles/names. Translate interface labels, dates, errors, and buttons; escape all dynamic HTML values. Button labels are plain text and need independent length review in both languages.

## 7. Commands and administrator status

Implement `/start`, `/help`, `/language`, `/cancel`, `/privacy`, and admin-only `/status`. Ordinary menus omit the admin command; handlers still require a private chat and the configured sender ID.

Read live account status sequentially and show retrieval time, connectivity, balance, paid status, and rate information when present. Do not display a key or use stale balance on failure. Ordinary messages and forged callbacks must not reveal these fields.

A new bot cannot always register a chat-specific admin menu before the administrator opens the private chat. Defer that optional menu registration rather than failing service startup; retry after the administrator's `/start`.

## 8. Security and content boundaries

- Inject bot tokens, supplier keys, and database credentials through protected configuration and GitHub Secrets.
- Keep full input, identity data, and credentials out of callbacks.
- Check session ownership on the server.
- Escape Telegram HTML and allowlist supplier fields.
- Exclude full query text, supplier bodies, access URLs, and credential patterns from logs.
- Record startup error types rather than complete credential-bearing exception strings.
- Do not proxy downloads, scrape source sites, or store media binaries.
- Do not process public group queries.

## 9. Development, tests, and CI

Use Node.js 24 and pnpm 10.32.1. Local PostgreSQL 17 runs through the development Compose file. Test database names must end in `_test` and must never point to production.

Generate the Prisma client, apply migrations, typecheck, test, and build. CI uses temporary PostgreSQL to verify migrations and integration behavior and builds the deployment image.

Required coverage includes query classification, explicit text mapping/media rejection, both languages, age confirmation/reset, language switching, expiry, pagination, detail return, stale/cross-user buttons, rate limits, insufficient balance, timeouts, empty HTTP 200 responses, and administrator access.

Use sanitized fixed fixtures for supplier tests and keep production credentials outside test configuration. Controlled live acceptance is separate from deterministic automated tests.

## 10. Release and deployment

1. GitHub Actions validates migrations, types, tests, build, and Docker image.
2. Tag the image with the full commit SHA; upload the archive and SHA256.
3. Verify the archive on the host, load it, and run the project's deployment script.
4. Back up the target database and check its expected name.
5. Migrate with the owner role; run the application with restricted credentials and verify grants.
6. Update release configuration and recreate only this project's app.
7. Require readiness; retain the current and previous project images and remove older project-specific tags.
8. Do not automatically reverse database migrations after failure. Check schema compatibility before code rollback.

Use the existing TLS domain and exact `/bots/telegram-metadata/webhook` route. Preserve the job bot, blog, and other routes. Verify registration, secret enforcement, pending updates, and Telegram errors.

## 11. Backup, recovery, and retirement

Back up only this database in custom/no-owner format. Write a temporary file, verify nonempty output and `pg_restore --list`, then publish atomically. Retain fourteen days and use the existing off-host pull policy.

Before recovery, stop application/webhook writes. Restore into a temporary database, verify schema, tables, users, and valid sessions before switching production. Language and age confirmation remain user data even though query sessions are short-lived.

Retirement removes this project's webhook, containers, images, and project resources without touching shared PostgreSQL, network, or volumes. Deleting databases, roles, and off-host backups is a separate irreversible operation.

## 12. Operations and acceptance

The proposed `doctor` command is not implemented. Current operations use health/readiness, admin `/status`, container state, and controlled database inspection. Persistent provider-call diagnostics and last-success/failure aggregation remain outstanding. Container logs have rotation/size limits.

Acceptance requires real Chinese and Japanese start-to-search journeys, age-reset enforcement, filters, pagination, detail return, failures, media rejection, admin isolation, stale/cross-user/expired actions, secret enforcement, database grants, backups, and rollback artifacts. A controlled billing/limit observation must precede broader capability claims.

### Initial deployment verification

Release baseline: `94ba98b8d96a546c358f69757bb737c914e9c57a`. Actions completed migrations, typecheck, tests, build, and deployment. Sixteen unit tests and one PostgreSQL integration test passed. The integration test uses mocked Telegram and supplier interfaces; it does not establish real bilingual end-to-end acceptance.

Verified observations:

- Healthy application; registered webhook matches, with no pending updates or Telegram error. Public requests without the secret return 403.
- Deferred chat-specific admin menu registration prevents a new-bot Telegram 400 from blocking startup.
- A real user started the bot and confirmed age. Controlled production calls exercised search, detail, and free account status.
- Runtime credentials can read/write app tables but cannot create schema objects or write migration history.
- Custom-format backup passed listing and temporary-database restore. That sample was the initial empty database with three migrations, not a recovery drill with populated business data.
- Initial memory observation was approximately 70 MiB out of 192 MiB, with no restart/OOM; this is a small-traffic observation only.
- Daily backup is scheduled at 03:35 UTC with up to ten minutes of random delay, retaining fourteen days. Local hourly pulls verify SHA256 and run only while the computer is awake and online.

Remaining work includes complete real-client bilingual flows, live filter/sort acceptance, longer cost observations, and the explicitly documented gaps in ProviderCall diagnostics, full profile clearing, and the diagnostic command. Successful deployment and tests do not close every product acceptance item.
