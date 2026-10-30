---
title: "Tasuki Keifu Agent: Name Normalization Design"
date: "2026-10-20"
summary: "A name-first candidate and evidence workflow for duplicate-athlete detection, with a bounded LLM branch."
category: "personal-projects"
published: true
---

# Name Normalization Design

This document began as a directional design, not a fixed specification. It focused the next stage of `tasuki-keifu-agent` on candidate recall, explainable name rules, and a conditional evidence-gathering branch.

## Starting Point

The original `check_person_normalization_risk` node mainly detected `duplicate_normalized_name`: two `Person` records whose normalized `displayNameJa` values collided. That was useful, but narrower than the broader question of whether two athlete records represented the same person.

The next version would improve name-based candidate discovery without expanding immediately into a full entity-resolution system. Membership remained important, potentially as weak supporting evidence, but was outside the main scope of this round. The existing relation-cache check was also to be removed from the primary diagnosis path.

## Four-Part Direction

1. Recall more plausible name candidates.
2. Explain what kind of name collision or variant was found.
3. Gather outside evidence for uncertain cases.
4. Return a clearer normalization-risk result.

### Candidate Recall

Possible fields included original and normalized Japanese written names, kana readings, Romanized names, differences in spacing, character width, or case, common transliteration variants, and name fragments inferred from slugs. Recall remained **name-first**: a candidate is someone worth checking, not proof of identity.

### Name Assessment

The proposed first version did not need a heavy general scoring system. Explainable categories were more useful: exact written-name match, match after normalization, close kana or Romanization, a single-character difference resembling entry or OCR error, or a collision that could not be decided from the name alone. These were reasoning categories, not all implemented rules.

### External Evidence

An uncertain but relevant case could be escalated to official rosters, result pages, existing Tasuki Keifu sources, and LLM-supported assessment of collected evidence. Web search and LLM calls should not run on every diagnosis; they were reserved for a small number of ambiguous cases.

### Possible Outputs

The early draft considered clear normalized collisions, likely variants, unresolved collisions, insufficient evidence, and human review. These were placeholders rather than final finding codes.

## Conditional Graph Branch

The design considered splitting one thin node into candidate recall, risk assessment, evidence collection, and identity adjudication. The important behavior was conditional: no apparent risk would return to the main path; clear risk would record a finding and return; ambiguous risk would call the LLM and web-search branch before returning. This avoided search cost for ordinary people.

```text
Rule-based name check
  -> no apparent risk: continue
  -> clear risk: record finding, continue
  -> ambiguous risk: LLM and web research, then continue
```

This was a design direction, not a commitment to specific final node names.

## Membership Boundary

Membership might later provide weak supporting evidence, but this round would not let it drive normalization or assume the existing membership logic was wrong. A separate review of its real examples would determine whether it needed its own change.

## Confirmed Design Choices

The initial recall implementation would use `displayNameJa` and `displayNameKana`. Matching would cover exact and normalized equality, common whitespace, full-width/half-width and long-vowel differences, and normalization between hiragana and katakana for kana. A single-character difference resembling an input error was deliberately excluded from the first rule set.

The rule layer would classify **clear risk**, **ambiguous risk**, or **no apparent risk**. Only ambiguous risk would invoke an LLM plus web-search node. That node would return a human-readable evidence summary, judgment, confidence, sources, and recommendation; official or high-trust sources would be preferred, with limited other sources acceptable where public information was scarce. An uncertain result would become a finding while the graph continued.

Each graph run would still focus on one primary person. A person would normally have zero or one candidate, with at most three high-relevance candidates retained as a safety cap. More than three meant a high-risk anomaly, likely requiring investigation of recall rules or the import pipeline instead of more LLM search. Clear risk kept the existing `duplicate_normalized_name` finding code. When written-name and kana signals disagreed, the rule layer would favor the ambiguous branch over a premature decision.

## Development Sequence in the Plan

1. Keep the `check_person_normalization_risk` node name and graph position.
2. Add bounded candidate queries in `src/db/business-queries.ts`, searching written Japanese names and then kana.
3. Split `src/tools/person-tools.ts` behavior into rule assessment and a decision about whether research is needed.
4. Implement written-name spacing, width, and long-vowel normalization and kana script normalization.
5. Return the three risk classes and preserve `duplicate_normalized_name` for clear cases.
6. Add a separate LLM/web-search node for ambiguous cases, with a fixed evidence output.
7. Record uncertainty as a finding, then continue through summary and action planning.
8. Add graph branches, action mapping, and smoke samples, first protecting old cases and then adding an ambiguous one.
9. Remove `check_relation_cache_status` from the graph and its samples and diagrams.

## Implementation Status Recorded Later

The source later records rule-based recall and ambiguous-candidate detection as implemented. `research_name_identity` used a local Codex provider with `gpt-5.4`, first trying Responses API web search and falling back to Chat Completions when the intermediary did not support search. It returned `same`, `different`, or `uncertain`, with a summary, reasoning, and source pattern. `same` became `duplicate_normalized_name`, `different` left a note, and `uncertain` became a finding. LLM requests were separately visible in LangSmith as `research_name_identity_llm`; the API key was read at runtime from local Codex configuration rather than stored in the project.

The continuing principles were to keep identity work name-first, reuse established finding codes, avoid extra LLM cost for ordinary cases, treat unexpectedly broad candidate sets as a rule or import problem, and establish a small working loop before expanding the evidence system.
