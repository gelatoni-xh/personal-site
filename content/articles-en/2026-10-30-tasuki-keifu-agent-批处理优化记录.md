---
title: "Tasuki Keifu Agent: Batch Optimization Log"
date: "2026-10-30"
summary: "Eight real batch cases covering missing profiles, conservative writes, idempotency, candidate ranking, and a controlled production update."
category: "personal-projects"
published: true
---

# Tasuki Keifu Agent: Batch Optimization Log

This log records problems found during real batch runs and the changes made in response. Each case is tied to a specific run or diagnostic result where the source notes provide one.

## Case 1: Missing Profiles Dominated the First Small Batch

The first five-person dry run (`03a417e1-ebe3-4a9b-9aea-5c52b67f2ea4`) had no failures or identity merges. Every person produced only `profile_coverage_missing_fields` for missing birth date, birthplace, nationality, or Japanese name reading.

Missing profile fields were common after import and did not, by themselves, mean the existing data was wrong. The old rule classified three or more missing fields as `high`, generated a `backfill_profile_fields` action even when there was no reliable source, and treated the parked result as final governance. That prevented future selection if the business data did not change.

The rule was changed to a `low` observation. A new `research_profile_wikipedia` node ran only when fields were missing, used Wikipedia as its sole source, and returned only fields explicitly supported by that page. If Wikipedia had no usable data, the finding remained but there was no action. If it had clear data, the agent added `profile_wikipedia_data_available` and proposed `backfill_profile_from_wikipedia`. A result containing only missing-profile observations did not advance the final governance timestamp, allowing it to be selected again after policy or write rules changed.

### Wikipedia Identity Boundary

Using the MediaWiki API required strict checks against disambiguation pages, missing pages, and redirects to a different person. The final page title had to exactly match the input Japanese name after whitespace and character-width normalization. The agent used the API instead of LLM web search. Network access followed standard proxy environment variables; on local macOS it also followed the system proxy rather than a hard-coded port. The `sato-aoi` page for `佐藤碧` was a legitimate same-name match in the test notes.

The checks focused on preventing a high-risk or held result when only an unsourced profile gap existed, producing a profile action only for sourced fields, leaving the action bundle empty without a source, preserving other findings, and allowing a later batch to revisit the person. Before the profile write executor was connected, a sourced backfill was expected to be `medium / held` with no business-database write.

## Case 2: Internal Anomalies Became Conservative Write Actions

Previously, membership and personal-best (PB) anomalies produced review actions that the executor could not handle, leaving suspect data in an ordinary `pending` state. The change made Wikipedia lookup cover both profile and PB data in one person run. It would write nothing when the page title, disambiguation status, or parsing was uncertain. Profile writes filled only empty fields; PB writes added or updated event records while keeping source and audit information.

For membership timeline anomalies, the agent did not guess the right organization or dates. It proposed marking the related records `conflicting`. Unresolved PB conflicts were treated similarly. Before low-risk actions executed, the target rows were locked again and business `AuditLog` entries were written. Uncertain identity normalization still parked the entire group as high risk.

Diagnostic samples produced `mark_memberships_conflicting` for `鬼塚翔太` and `mark_personal_bests_conflicting` for `中野翔太`, each at `low / planned`. A real `limit=3` dry run completed three people with zero failures and zero held results, though that particular batch did not hit the new actions. With the local macOS proxy disabled, Wikipedia returned `unavailable`; the rest of governance continued without speculative writes.

## Case 3: Real Write Candidates Exposed Parsing and Idempotency Boundaries

For `阿部陽樹`, Wikipedia clearly supplied nationality and six PB values, producing PB and profile actions. Three existing PB records for `中野翔太` were already `conflicting`, so the agent kept findings without proposing the same write again. Four simultaneously active corporate-team memberships for `木付琳` were combined into one `mark_memberships_conflicting` action.

Wikipedia nationality can appear as template syntax such as `{{JPN}}`. Saving that raw text would corrupt the business value. The parser was updated to recognize `{{JPN}}`, `{{国籍|JPN}}`, and `{{flagicon|JPN}}` and normalize them to `JPN`. Only unresolved duplicate PBs now generated a conflict-marking action. Membership conflicts were grouped per person, and action order was fixed as normalization, membership, PB, then profile. Smoke samples were updated to cover grouped membership writes and no repeat write for already-conflicting PBs.

The recorded checks showed an empty action bundle for `nakano-shota` despite three high-priority PB findings, PB action before nationality backfill for `abe-haruki`, and one planned low-risk membership action for four records belonging to `kitsuki-rin`.

## Case 4: Low-Value Observations Filled Small Batches

A ten-person dry run (`2a862684-ef1c-4ac1-b348-96ccfa032e46`) completed all ten, with no failures, held results, or writes. Most had missing profiles and no useful Wikipedia data. The old candidate order started with the earliest business update. In an initial broad governance pass, older people with only profile observations could therefore fill a small batch before membership, PB, or identity cases were reached.

The candidate query adopted an **existing-anomaly-first** order: exact duplicate names for normalization, concurrent memberships, duplicate PBs not yet marked `conflicting`, then everyone else. The rule for whether a person needed governance still compared the latest business update with the latest governance time; only ranking within the current candidate set changed. These signals were directly checkable in the business database, without adding LLM judgments to SQL.

## Case 5: One Duplicate-Name Group Filled the Batch Repeatedly

After the ranking change, a five-person dry run (`2c6ac43d-d993-49cf-ad69-182c77b24175`) placed five high-risk normalization candidates first. All five were held, with no failures. Several records for `桑原大地` belonged to the same exact-name group and each graph run rediscovered the same group findings.

The candidate selector began grouping the highest-priority exact-name candidates by normalized Japanese name and selecting only one person per group in a batch. The single-person graph already looked up other candidates in the same group, so the change avoided repeat LLM calls and duplicate held records without discarding the evidence. Membership, PB, and ordinary candidates remained person-level.

## Case 6: A Shallow Candidate Window Could Produce an Empty Batch

Whether a candidate needed to run again was checked in the agent database. Previously, the business query fetched only `limit * 4` candidates. If the highest-ranked people had just been governed, they were filtered out even when eligible people existed just beyond that window. The scan window was expanded to `limit * 20`, capped at 400 people. Ranking and re-governance rules stayed the same; the larger window helped fill reasonable small batches after filtering.

## Case 7: First Controlled Real Governance Write

A one-person controlled run (`3e557a1a-f295-4e88-882f-2e4a2d567466`) used `dryRun=false` for `木付琳` (`kitsuki-rin`). Its `mark_memberships_conflicting` action succeeded, changing four simultaneously active corporate-team memberships from `pending` to `conflicting`. The agent audit recorded the action as `succeeded`; the business database recorded four `AuditLog` entries. No records were deleted, and the agent did not infer which organization or dates were correct.

This first real write revealed that a raw SQL `UPDATE` does not trigger Prisma's `@updatedAt` behavior. The status had changed but `updatedAt` had not, which could distort the batch selector's latest-business-update check. Executor updates for `Person`, `Membership`, and `PersonalBest` were changed to set `updatedAt = NOW()` explicitly, and the four affected membership timestamps were corrected.

A repeat diagnostic still retained the anomaly findings for visibility, but stopped proposing another conflict-marking action once all related memberships were already `conflicting`. Idempotency was addressed during planning rather than relying only on a skip at the executor.

## Case 8: Similar Readings Must Not Block Supported Facts

`阿部陽樹` was incorrectly treated as an uncertain identity because `阿部陽葵` had the same name reading. That parked Wikipedia-supported PB and nationality actions for the whole group. The normalization rule changed: candidates reach identity review only when their Japanese names match exactly after normalization. A matching reading can support a same-written-name comparison, but the same reading with different characters is treated as a different person by default. It no longer generates `name_identity_uncertain` or blocks low-risk sourced facts.

The recorded checks showed `佐藤碧` receiving a birth date of `1997-09-25` and birthplace `大分県` from a same-name Wikipedia page. `阿部陽樹` received nationality `JPN` and six PB values were added or checked; `阿部陽葵` no longer blocked those actions merely because of the matching reading.
