---
title: "[Merged] Curvine #2318: Keep mkdir and touch status messages off stdout"
date: "2026-11-21"
summary: "Move filesystem command success messages to stderr and add subprocess regression coverage for failure and success paths."
category: "open-source"
published: true
---

## Status messages entered a script's data stream

[Curvine](https://github.com/CurvineIO/curvine) is a distributed caching filesystem written in Rust. Its `cv fs` interface creates directories and files. [Issue #2318](https://github.com/CurvineIO/curvine/issues/2318) reported that `mkdir` and `touch` wrote status messages to standard output, so scripts capturing stdout also received that text.

The fix removes the debug message printed before `mkdir` performs its operation and changes the success messages for directory creation, file creation, and timestamp updates from `println!` to `eprintln!`. Terminal feedback remains available without adding these messages to stdout. Filesystem operations and error propagation retain their existing behavior; failed operations do not print success messages.

## Extend failure coverage to successful commands

The initial subprocess regression tests point the commands at an unavailable master and assert a nonzero exit code, empty stdout, and no success status. This protects the failure path, but cannot verify which stream receives successful status messages.

Copilot review identified the gap: changing the success messages back to stdout would still pass those tests. A follow-up therefore adds a persistent MiniCluster-backed subprocess test for `mkdir`, new-file `touch`, and existing-file `touch`, asserting a successful exit, empty stdout, and the expected status on stderr.

## Verification scope and upstream acceptance

The initial revision passed `cargo test -p curvine-cli --tests` and focused CLI Clippy checks. Its upstream compile and smoke-test workflow also passed. The full-workspace `make format` command was blocked by an existing macOS FUSE compilation error, so these results do not establish full-workspace validation.

By the time the MiniCluster regression was added, the local Rust toolchain and build artifacts had been removed. The new test was therefore not compiled, run, or checked with Rust formatting tools locally. This limitation was disclosed in the PR description and review reply. DCO, title-check, and compile workflows triggered by the latest revision showed failures, but their failure logs could not be retrieved during inspection. We cannot identify those results as confirmed code-test failures or count the earlier revision's passing checks as verification of the latest revision.

Maintainer `lzjqsdd` approved and merged [PR #2329](https://github.com/CurvineIO/curvine/pull/2329) on November 21, 2026, closing the linked issue. AI assisted with this contribution. The merge establishes upstream acceptance; it does not remove the verification limitations of the added success-path test.
