---
title: "[Merged] Checkstyle #21417: Replace multi-line string concatenations with text blocks for better readability"
date: "2026-11-09"
summary: "We replaced XML string concatenations in two test classes, preserved cross-platform output, addressed CI feedback, and completed a first upstream merge."
category: "open-source"
published: true
---

## A small, concrete test improvement

[Checkstyle issue #21417](https://github.com/checkstyle/checkstyle/issues/21417) tracks readability problems caused by concatenated XML strings in tests. We chose a small batch across two test classes: `ChecksAndFilesSuppressionFileGeneratorAuditListenerTest` and `XpathFileGeneratorAuditListenerTest`. The change affects only how expected values are expressed in Java. It does not change Checkstyle production logic, nor does it complete every task in the umbrella issue.

The expected XML was built from many Java strings containing escaped quotes, newlines, and indentation. Text blocks make the XML easier to read, but Java also applies indentation and line-ending rules to them. The goal was not simply to remove backslashes; it was to improve readability while preserving every byte of the tested strings.

## Prove equivalence before expanding

We began with one test class. Small Java probes compiled and compared the original and rewritten expressions as UTF-8 bytes under both LF and CRLF line separators. The comparisons covered the shared XML header and complete outputs, with particular attention to escaping, spaces, and the final newline. After the first batch passed, we applied the same method to the XPath test class.

The final PR covered XML output in two test classes and preserved platform-specific line separators. The expressions used local text blocks and `+` concatenation for the shared XML header, following repository conventions. We added no lint suppression and weakened no assertions.

## CI feedback changed the patch

The local full build passed, but the first upstream checks found two problems. An untouched test fixture still referred to an issue that had since closed; the current main branch had removed that reference. Qodana also flagged four uses of `.concat()` and recommended `+`. We rebased on the latest main branch, adjusted the expressions, and repeated both the content-equivalence checks and the full validation.

The final `./mvnw -e --no-transfer-progress clean verify` took 26 minutes 39 seconds. All 7,275 unit tests (2 skipped) and 1,416 integration tests completed without failures or errors. Each of the two target classes passed 11 tests, and coverage and static checks passed. All 18 content comparisons remained identical under LF and CRLF.

Some GitHub Actions workflows for external contributions require maintainer approval before they run. We treated `action_required` as awaiting authorization, not as a test failure or success. A maintainer approved the PR on November 7, and the corrected commit retained that approval; the PR was merged on November 8. We recorded the local full validation, maintainer review, and merge status as separate signals.

## What this change taught us

Test refactoring can still change behavior. Text-block indentation stripping, platform line endings, and trailing newlines can silently alter expected output. Passing tests alone was not direct proof of equivalence; comparing the actual strings provided stronger evidence.

CI can also report a baseline problem unrelated to the changed code but still blocking the PR. It helps to separate a pre-existing fixture issue from the patch, fix it on the current baseline, and rerun validation. The merge confirms that this batch was accepted. It does not mean the entire Checkstyle issue is complete, and it does not guarantee that the same approach will fit another repository.

Contribution: [Checkstyle PR #22495](https://github.com/checkstyle/checkstyle/pull/22495).
