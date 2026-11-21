---
title: "[Merged] JBang #2704: Preserve provider boundaries when merging fatjar service files"
date: "2026-11-21"
summary: "Prevent concatenated service provider names and verify separate records across four line-ending variants."
category: "open-source"
published: true
---

## File concatenation lost a record boundary

[JBang](https://github.com/jbangdev/jbang) is a command-line tool for running Java scripts and applications. `jbang export fatjar` packages an application and its dependencies into one JAR. Duplicate `META-INF/services/*` files from dependencies must be merged so Java's service-loading mechanism can discover their implementations.

[Issue #2704](https://github.com/jbangdev/jbang/issues/2704) concerned that merge step. The implementation appended bytes directly. If the first file lacked a trailing newline, its `com.example.Impl1` and the next file's `com.example.Impl2` became one line: `com.example.Impl1com.example.Impl2`. Both names remained present as text, but they no longer formed two valid provider records.

## Guarantee separation at the append point

The fix writes a newline before appending another service file to an existing one. Blank lines are valid in service configuration files: an existing LF, CRLF, or CR ending therefore does not introduce another provider, while the missing-newline case gains the necessary separator. This preserves the original contents without introducing a full parser and rewrite for a boundary fix.

The regression test now uses four parameterized inputs: no trailing newline, LF, CRLF, and CR. Its assertion also changes from checking that both class names occur to checking that splitting into lines yields exactly two independent records. The distinction matters because the old substring assertions also passed for the invalid concatenated name.

## Verification and merge

Before the fix, the added missing-newline case reproduced the concatenation. Afterward, the local command `./gradlew test --tests 'dev.jbang.cli.TestExport' formatCheck` passed with 29 tests passing and 3 skipped. `git diff --check` also passed. The full unit and integration suites were not run locally.

Upstream CI passed formatting, JVM unit tests, integration and smoke tests across multiple Java versions, native-image tests on three platforms, and CodeQL. A separate post-merge `cleanup-closed-pr` job failed, so the complete check list is not described as entirely green. That failure does not change the merged state of the PR.

Maintainer `maxandersen` approved and merged [PR #2709](https://github.com/jbangdev/jbang/pull/2709) on November 21, 2026, closing the linked issue. AI assisted with the implementation and tests. The lesson is that appending structured text must preserve record boundaries, and regression assertions should validate that structure rather than only matching substrings.
