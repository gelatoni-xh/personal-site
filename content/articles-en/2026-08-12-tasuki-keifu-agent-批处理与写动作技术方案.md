---
title: "Tasuki Keifu Agent: Batch and Write-Action Design"
date: "2026-10-27"
summary: "The first batch runner, person-level action bundles, risk gates, audit trail, and controlled business writes."
category: "个人项目"
published: true
---

# Batch Processing and Write Actions

This document defined a first workable framework for the next stage of `tasuki-keifu-agent`. It did not attempt to settle every governance rule at once; real cases would drive later revisions.

## 1. What This Version Needed to Solve

`person_diagnosis` already diagnosed one person, performed read-only checks, and suggested actions. The next stage needed an external `batch runner` to find people requiring governance and a write-action framework able to make corrections when risk was low or medium.

The scope stayed focused on identity normalization. The single-person graph would remain single-person. Batch selection and scheduling belonged outside it. The graph would produce an action bundle, evaluate its risk, and execute supported writes. A high-risk person would hold that person's entire bundle without stopping the batch.

## 2. Why Batch Scheduling Stayed Outside the Graph

Putting many people in the same graph state would mix batch scheduling, individual diagnosis, and aggregation. Checkpoints, retries, and failure isolation would become harder to understand. A person's trace would be buried inside the batch, and later concurrency or rate-limit changes would be less flexible. The graph therefore remained a worker for one person, with the runner orchestrating workers.

```text
Batch runner
  -> select people needing governance
  -> call person_diagnosis for each person
  -> collect findings and an action bundle
  -> assess risk for the person's whole bundle
  -> execute supported low- or medium-risk actions
  -> hold the entire bundle for high risk
  -> record execution audit
```

## 3. Selecting Candidates

The first selector looked for people whose business data had changed since their last governance run, rather than everyone with an incomplete profile. It compared the maximum `updatedAt` of a person's business records with that person's most recent completed governance time in the agent database. Never-governed people were eligible.

Completion included a run with no required action and a run held because of high risk or an unsupported executor. A held case was not a failure and did not need to recur in every batch unless business data changed. An exception applied to results containing only `profile_coverage_missing_fields`: profile completeness was an observation that could be rechecked when policy changed, so it did not count as final governance.

The first version inspected `Person`, `Membership`, and `PersonalBest`. It deliberately excluded `Organization.updatedAt` to keep the dependency scope manageable. No cross-database join was needed: the agent fetched business-side candidates and their latest timestamps, fetched completed governance times from its own database, then compared them in the agent process.

## 4. Changes to the Single-Person Graph

The early checks changed as little as possible: profile coverage, membership timeline, identity-normalization risk, identity research, and PB consistency. The main changes were after diagnosis: summarizing findings, building a structured action bundle, and evaluating bundle-level risk. The source says `build_action_plan` already generated an auditable bundle, and executors had been connected for duplicate merges, Wikipedia profile/PB facts, and membership/PB conflict marking.

## 5. Controlled Single-Person Execution

To verify one real low-risk write before enabling batch-wide writes, the CLI accepted a person slug:

```bash
npm run governance:batch -- --person-slug kitsuki-rin
npm run governance:batch -- --person-slug kitsuki-rin --execute
```

Specifying `personSlug` bypassed only the recent-governance candidate filter for repeat idempotency checks. It did not bypass the write flag, write database connection, or high-risk hold rule.

## 6. Bundle-Level Risk

The agent collected all findings for one person, built a complete ordered bundle, and evaluated that bundle before any action ran. Risk belonged to the person, not the whole batch. A high-risk bundle recorded findings, actions, and the risk result but performed no write. Medium risk allowed execution through a more conservative order and complete audit; low risk allowed automatic execution when the write gates were open.

## 7. Write Boundaries

### Confirmed Duplicate Merge

`merge_person_duplicate` required exactly one candidate, an LLM research result of `same`, exactly matching normalized Japanese written names, and an unambiguous non-temporary record to retain based on the slugs. Before execution, it re-read and locked both `Person` rows and rechecked slugs and normalized names.

One transaction moved memberships, PBs, race results, and source mappings; kept name variants; cleared relationship caches; wrote business `AuditLog`; and then deleted the duplicate. Related records were moved, **not** semantically deduplicated. Uncertain identity or unexpected candidates held the entire person's bundle.

### Wikipedia-Backed Facts

For a uniquely matched person, the graph queried the MediaWiki API once for profile fields and clear PB facts. It used standard HTTP proxy variables and, on local macOS, the system proxy. Profile backfill filled only empty fields. Wikipedia PBs could be inserted or updated; when several existing PB records for the same event were present, a new Wiki PB was added instead of overwriting a stage-specific record.

### Internal Conflicts

The agent did not guess the correct organization, date, or result for unresolved membership and PB anomalies. It marked the affected records `conflicting`, retaining the records for review.

## 8. Idempotency and Isolation

The first version avoided recording the same action twice within one batch and used a stable idempotency key to recognize actions that succeeded in earlier batches. Failure for one person did not stop other people. Failure of one action stopped later actions for the current person.

LangSmith captured graph traces, node paths, LLM inputs and outputs, and exceptions. The agent audit database recorded batches, person-level governance results, findings, bundles, risk, action statuses, and the latest completed governance time. Together they supported batch review and rule tuning.

## 9. Status Recorded in the Source

The source records an initial framework as implemented by 2026-08-12: an external CLI runner, timestamp-based selection across the three business models, structured bundles, whole-bundle risk assessment, agent-side batch and action auditing, dry-run as the default, and person-level holds for high risk or missing executors.

By 2026-08-16, the notes record low-risk executors for Wikipedia profile backfill, Wikipedia PB insert/update, membership conflict marking, and PB conflict marking. They re-locked target records and wrote business `AuditLog`. Writes required three independent gates: `--execute`, `TASUKI_AGENT_WRITE_ENABLED=true`, and a separate `TASUKI_KEIFU_BUSINESS_WRITE_DATABASE_URL`. Without all three, the batch remained a dry run.

The notes also record a first controlled low-risk write: four conflicting memberships for `kitsuki-rin` were marked `conflicting`, and both the business audit and agent action record were checked. Raw SQL updates were changed to set `updatedAt` explicitly so future selection used the actual business change time.

Two Wikipedia-backed fact writes were also checked: `sato-aoi` received birth date and birthplace, while `abe-haruki` received nationality and six PB values were inserted or verified. Identity candidates then required exactly matching normalized Japanese written names; a matching reading with different characters no longer blocked these low-risk sourced facts.
