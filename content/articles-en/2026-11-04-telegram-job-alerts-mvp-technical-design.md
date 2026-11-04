---
title: "Remote Job Radar: MVP Technical Design and Operations Guide"
date: "2026-11-04"
summary: "Architecture, data and delivery flows, administrator monitoring, portable deployment, backup and recovery, and retirement procedures for Remote Job Radar."
category: "personal-projects"
published: true
---

# Remote Job Radar: MVP Technical Design and Operations Guide

For English-speaking remote job seekers, the bot searches jobs, saves filters, and sends daily alerts in the user's local time. Jobicy is the first source. Every country and occupation supplied by the source remains selectable, including low-supply categories.

Repository: [gelatoni-xh/telegram-job-alerts](https://github.com/gelatoni-xh/telegram-job-alerts). Bot: [Remote Job Radar](https://t.me/GelatoniJobRadarBot). Webhook: `https://gelatoni.uk/bots/telegram-job-alerts/webhook`.

This document describes the implementation and repeatable operating procedures. Account values, passwords, tokens, SSH private keys, server addresses, chat contents, and production configuration are excluded.

## 1. Technology choices

| Area | Choice | Reason and cost |
| --- | --- | --- |
| Application | Node.js 24, TypeScript, pnpm 10.32.1 | One runtime and deployment unit with locked dependencies |
| Telegram | grammY and webhooks | Mature TypeScript client; reuses the existing HTTPS domain |
| HTTP | Fastify | Health checks and webhook only; no separate web application |
| Data | PostgreSQL 17, Prisma 7, pg adapter | Reuses the existing server instance while keeping a separate database and roles |
| Scheduling | PostgreSQL-backed tasks and an in-process scheduler | Avoids Redis; leases and recovery are maintained by the application |
| Deployment | Docker Compose, Nginx, GitHub Actions | Reproducible image/configuration and straightforward migration or shutdown |
| Source | Jobicy public API | Native pagination and status checks; seven-day feed window and source delay apply |
| Backups | Per-database logical dump, server timer, local scheduled pull | No additional paid infrastructure; off-host copies lag while the local computer is offline |

One resident process handles webhooks, interaction tasks, synchronization, scheduling, and delivery. The database pool is capped at three connections; one holds the application-instance lock. No second resident worker is started.

Redis, a dedicated search engine, payments, advertising, and an admin web console are out of scope. A multi-source interface should be designed when a second real source is integrated; until then, records retain the source name and stable external ID.

## 2. Resource and deployment boundaries

The application runs on the existing Ubuntu-3 host without opening another server. It uses an independent Compose project. The host binds port 3050 on loopback, the container listens on 3000, and the existing Nginx forwards only the exact webhook path.

The app container is limited to 192 MiB and 0.5 CPU, with a 96 MiB V8 heap. Migration tasks have a separate 192 MiB limit. Management commands run one at a time in temporary containers with `docker compose --env-file release.env run --rm --no-deps app node dist/src/cli.js <command>` so they do not compete for the live app container's memory. Images are built in GitHub CI, not on the small host.

These limits are a measured operating budget, not proof of capacity. Verify full pagination, status checks, real interactions, and digest delivery while observing RSS, restarts, OOMs, database connections, and existing applications. A successful health check alone is insufficient.

The project shares the existing PostgreSQL process, Docker network, and volume but owns a separate database and roles:

- Database: `telegram_job_alerts`.
- Migration role: `telegram_job_alerts_owner`, owner of this database's objects.
- Runtime role: `telegram_job_alerts_app`, limited to application-table access.
- Project-owned configuration, deletion journal, backups, image tags, and deployment key.

The shared PostgreSQL container/network/volume is a lifecycle dependency. Shutting down the original application must not remove resources still used here. Migration exports this database only and restores it to a new PostgreSQL instance.

## 3. Repository and configuration

```text
src/
  bot.ts              Telegram menus, search, subscriptions, settings
  http.ts             Webhook validation and durable receipt
  jobs.ts             Jobicy sync, normalization, status, search
  rules.ts            Country matching, keywords, local time
  ui.ts               Copy formatting, job cards, timezone candidates
  subscriptions.ts    Subscription boundaries and revisions
  tasks.ts            Claims, leases, retries
  digests.ts          Digest generation, backlog merge, delivery
  privacy.ts          Deletion and restore replay
  maintenance.ts      Retention cleanup and doctor
  main.ts             Single process and scheduler
  cli.ts              Administrative commands
prisma/               Schema and versioned migrations
infra/                Compose, Nginx fragment, backup timer
scripts/              Deployment, backup, grants, off-host pull
tests/                Rules and PostgreSQL integration tests
docs/                 Operations and source documentation
```

Configuration is injected through environment variables. `.env.example` contains placeholders only. Production secrets stay in protected files with mode 600; the app and migration use separate `.env.production` and `.env.migration` files.

Key variables include `DATABASE_URL`, `EXPECTED_DATABASE`, `BOT_TOKEN`, `WEBHOOK_SECRET`, `WEBHOOK_URL`, `DATABASE_POOL_MAX`, and `DELETION_JOURNAL_PATH`.

`SOURCE_SYNC_ENABLED`, `SCHEDULER_ENABLED`, and `DELIVERY_ENABLED` default to false. Disabling source sync stops sync/status task consumption; disabling scheduling stops digest task creation; disabling delivery stops the sender. Webhook receipt remains active. Stop the whole application when a migration or restore requires all writes to stop.

Startup, CLI, and deployment validate the target database name. A session advisory lock prevents two app instances from processing work concurrently. The process exits if its lock connection is lost; only one active instance is supported.

## 4. Source synchronization and matching

Jobicy's public documentation permits standard commercial integration, storage, and display without separate application. Preserve source attribution and the original Jobicy link returned by the API. Recheck the current terms during future changes.

1. Begin a traversal with `/api/jobs?count=100` and follow `nextCursor` strictly, keeping filters unchanged.
2. Start an automated traversal at most once per hour. Cursors remain valid for 24 hours; restart after 23 hours.
3. The public feed covers only the latest seven days and has an approximately three-hour publishing delay. Do not claim real-time or complete-market coverage.
4. Parse and sanitize each page, then commit it with its progress in one transaction. On error, do not commit a partial page; retries resume from the saved cursor.
5. Use `jobicy:<id>` as the stable identity. Updating the same ID does not create a new discovery sequence.
6. Disappearance from the seven-day feed does not mean a job is closed. Use `/api/jobs/status?ids=...`, at most 100 IDs per request.
7. `active` may be shown; only explicit `closed` confirms closure. Hide `unknown` jobs and check them again. Routine checks are hourly or less frequent per ID.
8. A source failure must not close a batch of jobs. Honor `Retry-After` for HTTP 429. Keep parse errors visible and do not advance an invalid boundary.

All ISO countries remain available. Matching accepts explicit country labels, Worldwide/Anywhere, Europe, and a limited set of clear residence or exclusion statements. Preserve ambiguous labels such as APAC, EMEA, and LATAM without guessing their coverage.

This is not full natural-language eligibility analysis. Some eligible roles may be missed; visa, employment, tax, and work-right status are never confirmed. Show source geography and the original listing.

Country choices use OR, occupation choices use OR, and groups combine with AND. Keywords are case-insensitive literal phrases in title and description; `%` and `_` are not SQL wildcards. Choosing Any removes that group's restriction.

Occupation choices include the base list and all source labels already present in the database, so a new source category does not need a manual feature flag. Search displays five jobs per page and allows users to save an empty result as an alert.

## 5. Consistency, subscriptions, and daily alerts

The data model includes User, Subscription, Job, SyncRun, InboxUpdate, Task, Digest, DigestItem, Delivery, DeferredMatch, Event, and a committed-discovery counter.

Webhook receipt validates and persists updates without waiting for business processing:

1. Validate the exact route, request size, and Telegram secret header using a timing-safe comparison.
2. Accept private chats only and deduplicate by `update_id`.
3. Insert the inbox row and interaction task in one transaction. Return success after commit; return 503 on database failure so Telegram retries.
4. Return 429 when a chat exceeds 60 accepted requests per minute. Never acknowledge and silently drop an update.
5. Process tasks for each chat in receipt order. Buttons carry a state version; stale buttons notify the user without changing filters or page state.

Job writes and subscription watermarks share the committed discovery boundary. A new subscription begins after the current inventory, so it does not alert on jobs already shown in the initial search. Updating an ID does not make it new again.

Editing, pausing, and resuming updates subscription revisions and watermarks and clears old candidates. Global pause does not override each subscription's own pause. Jobs missed during a deliberate pause are not sent later; users can search current listings.

Users choose an IANA timezone and local delivery time before saving the first alert. The scheduler scans due users every 30 seconds and creates at most one digest per user and local date. A nonexistent daylight-saving time advances to the first valid minute; a repeated time uses its first occurrence.

Digest generation stores the advanced watermark, complete membership, matched subscription revisions, and delivery record in one transaction. A job matching several subscriptions appears once. Candidates without confirmed status go to DeferredMatch so an advanced watermark cannot lose them permanently. Empty digests mark the date processed without sending a message.

The notification previews three jobs; the full persisted list uses pages of five. Membership and order remain fixed after generation. Before sending, validate subscription revisions, user status, and job status; refresh status when needed and filter closed or unknown jobs. If refresh fails, jobs confirmed within the last 24 hours may be sent with a delay notice; older candidates remain pending recheck.

Tasks use short `FOR UPDATE SKIP LOCKED` claims, a 90-second lease renewed every 20 seconds, and lease-token validation on completion. Ordinary failures retry up to eight times with exponential backoff and jitter, then become `failed` for inspection and manual retry.

Persist `sending` before the Telegram call and `message_id` after success. On restart, a `sending` row becomes `uncertain`. Telegram 403 marks the user unreachable and stops reminders; a new user interaction can restore reachability. Telegram 429 is delayed. A network timeout cannot prove whether Telegram accepted a message, so a retry can duplicate it; strict exactly-once delivery is not promised.

Backlogs combine into one recovery digest instead of a message per missed day. Pausing, deletion, or edits invalidate candidates for the old revision. An external message already accepted by Telegram cannot be recalled.

Country and occupation options are sorted by the count of active jobs satisfying the other filters, descending, with English-name tie breaks. A job counts once within each option; counts across options cannot be summed. Current selections do not skew the displayed supply. Zero-count options remain visible. Page callbacks use the option IDs rendered on that page so concurrent data changes do not select the wrong item.

The interaction forms a loop among Home, Search, Results, Job details, and Alerts. Dynamic text is escaped and formatted with Telegram-supported HTML; button labels are plain text.

- Home shows active job count, source freshness, search/alert entry points, and global pause status. Existing filters can be resumed.
- Search exposes country, occupation, keyword, and current matching count. Each group can be edited independently; existing alerts are unchanged until saved.
- Country and occupation selectors mark selections with check states, allow cross-page multi-select and name search, and provide recovery for no matches. Name search does not clear selected items.
- Results use five jobs per page with title, company, location, salary, and a short summary. Job details return to the same search or digest page. The original Jobicy application link remains separate.
- Empty results explain how to broaden filters and allow a keyword retry; users may still save an alert.
- Alert lists use pages of eight and distinguish active, individually paused, and globally paused states. Browsing results does not change watermarks. Duplicate saves open the existing alert. Deletion has a separate confirmation.
- The first saved alert asks for timezone and delivery time. Suggested zones are offered without assuming the user's location; the full IANA list and search remain available.
- Timezone, time, and keyword inputs provide a cancel/back path. Invalid input preserves context and shows an example. Home preserves filters; stale buttons do not reset a new flow.
- Daily notifications use one consistent card. The preview is limited to three, while every persisted match remains available; job details return to the same digest.

`/start` and `/menu` open Home, `/cancel` leaves an input step while preserving filters, `/help` explains use, and `/privacy` opens data controls.

## 6. Retention, telemetry, and administrator monitoring

Processed inbox payloads are cleared after seven days; deduplication IDs after 30 days; interaction state expires after 24 hours; events and completed digest history are retained for 90 days. Incomplete tasks and unresolved deliveries are not removed as ordinary expired history.

Jobs retain current normalized fields and stable source IDs, not unbounded raw API responses. Job identity records are not automatically deleted, preventing a reappearing role from being misclassified as new.

Events use idempotency keys and record search dimensions, keyword presence, zero results, subscription actions, digest generation/delivery, pagination, and job-open intent. Chat transcripts are not collected. A click on an original application link is not proof of an application.

### `/stats` and `/activity`

The bot provides two read-only, administrator-only commands in the private chat. `ADMIN_TELEGRAM_ID` is the numeric Telegram identity allowlist; when unset, both commands are disabled. No additional secret or public HTTP analytics endpoint is required. The public command menu is unchanged, while the administrator's chat-scoped menu includes `/stats` and `/activity`. Both commands check the sender and private-chat context at execution time, preserve the user's current search, and return no report in a group.

`/stats` excludes the administrator. It shows yesterday, the day before, their absolute and percentage differences, today's partial count, daily trends for the latest seven complete days, comparison with the preceding seven days for new users and interactions, and current registered/enabled-alert user totals. User and activity numbers reflect retained accounts; deletion can revise history. Active users are distinct within each interval. Interactions are processed private-chat updates deduplicated by Telegram update ID; pending updates and automatic digests do not count. Enabled-alert users have an unpaused subscription and are neither globally paused nor unreachable.

`/activity` includes the administrator and separates three columns: all users, everyone except the administrator, and the administrator. It reports today so far and the last seven complete Asia/Shanghai days, grouped by instrumented event type. Existing categories include start, completed search, result-page view, zero results, job opened, and subscription creation/edit/pause/resume/deletion. It is a product-event breakdown, not every Telegram message or button update. It contains no user IDs, per-user rows, or chat text. Events are retained 90 days and removed with the associated account.

The public profile and daily email use a separate allowlist and continue to exclude the administrator. A daily, silent pinned JSON aggregate in the administrator's private chat is read by the profile workflow using Telegram Bot API `getChat`. It exists because the Bot API cannot retrieve arbitrary historical messages. The snapshot contains only the aggregate fields needed by the public report; it does **not** include `/activity` event categories. Codex can read the allowed fields in the pinned snapshot, but cannot read an `/activity` command reply or arbitrary chat history. To make event categories available to an automated reader later, explicitly extend and validate the pinned snapshot schema; do not forward an administrator command reply to public output.

The profile workflow calls Telegram and Cloudflare APIs only. It does not read server files or databases and must not use `getUpdates`, which conflicts with the active webhook. A missing, replaced, stale, or invalid snapshot fails before publishing; it is never changed to fake zeroes. The public README and email continue to show only the running site and Telegram metrics. Telegram counts exclude the administrator. Website counts use Cloudflare browser analytics. These sources and units are not interchangeable.

Zero means no event was recorded; it does not prove that a service is healthy. Active and historical counts can change following delayed processing or account deletion. Bot API read receipts are unavailable, so successful delivery is not treated as a read.

## 7. Local development and GitHub repository

1. Install Node.js 24 and pnpm 10.32.1, then create a dedicated project directory.
2. Initialize Git, README, AGENTS.md, `.gitignore`, and `.dockerignore`. Exclude real environment files, keys, logs, database backups, and image archives.
3. For a new public repository, use `gh repo create <owner>/<repo> --public --source=. --remote=origin`. If it already exists, connect the existing remote instead of recreating it.
4. Configure package metadata, lockfile, TypeScript, Prisma schema, and migrations. Run `pnpm install --frozen-lockfile` and `pnpm db:generate`.
5. Start an isolated local PostgreSQL 17 with `docker compose -f infra/compose.local.yml up -d`.
6. Point `DATABASE_URL` and `TEST_DATABASE_URL` to a database ending in `_test`; tests clear application tables and must never connect to production.
7. Run `pnpm db:migrate`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; review `git diff --check` and staged files for credentials.
8. Commit and push `main`. CI runs migrations, type checking, database integration tests, and image build against temporary PostgreSQL.
9. Tests cover discovery boundaries, duplicate IDs, literal matching, pause/resume, unknown status, complete pagination, lease contention, chat ordering, webhook deduplication, daylight-saving changes, delivery timeouts, Telegram 429/403, backlog merging, and deletion replay.

## 8. Server bootstrap and first deployment

### 8.1 Isolated resources

1. Check memory, disk, existing containers and health, PostgreSQL version, Docker networks, and port availability.
2. Create `/opt/apps/telegram-job-alerts` with `state`, `backups`, `releases`, `scripts`, and `infra`. Restrict directory access to the deployment user; make `state` writable by container UID 1000.
3. In the existing PostgreSQL, create separate owner and app LOGIN roles with `NOSUPERUSER`, `NOCREATEDB`, and `NOCREATEROLE`; limit each to five connections and generate separate passwords.
4. Create a dedicated database owned by the migration role. Revoke PUBLIC privileges on the database and public schema. Grant the app role only CONNECT, USAGE, and application-object access.
5. Configure default grants for future owner-created tables. After migration, run `scripts/grant-runtime.sh` and verify the app role cannot access `_prisma_migrations`.
6. Create two protected environment files with all three feature switches disabled initially. `.ops.conf` contains database container/name addressing only.
7. Connect the Compose project to the existing database network. Never expose PostgreSQL publicly or change firewall rules/open a public port for this app.

### 8.2 CI and image

1. Create a GitHub production environment and configure an independently revocable SSH deployment key plus verified known_hosts.
2. Store only deployment access in GitHub Secrets; keep bot and database credentials on the server, outside images and build logs.
3. Use repository variable `DEPLOY_ENABLED` as the deployment gate. Pull requests check but do not deploy.
4. CI builds an image tagged with the full commit SHA, archives it with SHA256, and uploads it to `releases/<sha>`.
5. The host verifies and loads the archive, then runs `scripts/deploy.sh <sha>`. GitHub concurrency and a server-side flock serialize deployment.
6. The script backs up this database, verifies identity, deploys migrations and grants, switches `release.env`, and recreates only this app.
7. A failed readiness check fails deployment. Inspect logs and schema compatibility; do not reverse database changes automatically.

### 8.3 First data load and webhook

1. After migration, verify the app role can use application tables but cannot create tables, access migrations, or become owner.
2. With scheduling disabled, run `node dist/src/cli.js sync` in a temporary CLI container for the initial inventory.
3. Add the repository's exact webhook Nginx location to the existing TLS server, back up the old config, run `nginx -t`, then reload.
4. A public webhook request with an invalid secret must return 403; existing blog and other domains must remain healthy.
5. Enable source sync, scheduling, and delivery; recreate this app and run `node dist/src/cli.js webhook` to register HTTPS and the secret without dropping pending updates.
6. Verify webhook URL, pending count, and Telegram errors. Cloudflare must not cache this path or require an interactive challenge.
7. Test search, subscriptions, timezone, pause/resume, and deletion with the real bot. Use a controlled subscriber for delivery tests; simulations do not replace Telegram acceptance tests.
8. During full sync and interactions, check RSS, OOMs, restarts, database connections, and existing services. Health checks are only one part of acceptance.

## 9. Backup and restore

1. Install `infra/telegram-job-alerts-backup.service` and timer. It runs daily in UTC with `Persistent=true` to catch missed executions.
2. `scripts/backup.sh` dumps this database only, in custom format with `--no-owner`. Write to a temporary file, verify it is nonempty and readable by `pg_restore --list`, then publish atomically.
3. Record backup start time and checksum, and copy the deletion journal at that time. Capture the time before the dump so deletions during the backup are not omitted.
4. The local `scripts/pull-backups.py` uses the existing SSH path to fetch this project's backups and latest deletion journal, verifies each dump, then writes `last-success.json`.
5. Local scheduling runs only while the computer is awake and connected. The server continues backing up while it is offline, but the off-host copy becomes stale; inspect the last successful pull.
6. Retain 14 days locally and on the host only after successful off-host verification. On transfer failure keep the previous copies. Never clean another project's backups.
7. Restore drills use a separate temporary database, same-version `pg_restore`, `--no-owner`, and `--no-acl`, creating objects as owner. Compare tables, rows, constraints, and representative records.
8. For production recovery, isolate the webhook and stop the app, restore into a new database, recreate runtime grants, and verify schema and database identity.
9. Replay the newest independent deletion journal with `replay-deletions <backup-start-time>` before resuming. A copy of the journal embedded in an older backup is insufficient.
10. Verify users, subscriptions, watermarks, pending digests, and leases; review uncertain deliveries. Sends after the backup may be repeated because external Telegram messages cannot be rolled back.

A daily logical backup normally implies up to about one day of recovery-point loss; failures increase that window. Measure recovery duration through drills instead of promising a fixed time.

## 10. Release, migration, and retirement

Routine releases use a SHA image, pre-deployment backup, migration, runtime grants, switch, and health check. Before code rollback, verify the old version remains compatible with the current schema. Stop the app, restore `previous-release.env`, restart, and inspect. Rolling code back does not restore the database.

To migrate to a dedicated server:

1. Prepare matching PostgreSQL, image, and protected configuration with all switches disabled and ingress isolated.
2. Restore a recent backup in a drill and verify runtime permissions and resource use.
3. Remove the old webhook without dropping pending updates, stop the old app and CLI writers, confirm there are no consumers, then take a final backup.
4. Transfer and verify, restore, replay the latest deletion journal, and compare schema, row counts, watermarks, revisions, tasks, and pending digests.
5. Keep the same bot token and public URL where possible; switch proxy/DNS and update CI, backups, and pull targets.
6. Start only the new app, register the webhook, and test controlled interactions and delivery. Telegram retains pending updates for a limited period.
7. If reverting after the new server has written data, stop it and bring that state back first. Never start the old pre-migration snapshot as if no writes occurred.

To retire this project independently:

1. Disable this project's CI deployment, remove its webhook, and stop the app, backup timer, and local pull schedule.
2. Remove only the exact webhook Nginx location, validate, reload, and check other services.
3. Make a final backup, confirm an off-host copy, set retention/deletion dates, and revoke this project's SSH deployment key.
4. Remove only this project's containers and confirmed obsolete images/archive; do not run a global Docker prune.
5. Keep the shared PostgreSQL container, network, and volume. Database/role deletion and backup destruction are separate irreversible operations requiring a fresh dependency and retention review.

For command references and incident handling, see [operations.md](https://github.com/gelatoni-xh/telegram-job-alerts/blob/main/docs/operations.md) and [source.md](https://github.com/gelatoni-xh/telegram-job-alerts/blob/main/docs/source.md).
