---
title: "[Merged] keycloak-config-cli #1743: Remove placeholder private keys from normalization baselines"
date: "2026-11-20"
summary: "Remove placeholder privateKey fields from bundled realm baselines, add regression guards and a baseline sanitizer, and merge the change upstream."
category: "open-source"
published: true
---

## Unneeded private-key fields in bundled baselines

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) ships realm baselines used during configuration normalization. [Issue #1743](https://github.com/adorsys/keycloak-config-cli/issues/1743) identified `privateKey` fields in several baselines that were only placeholders. The fields were packaged in the JAR and included in static analysis, but were not configuration that needed to be retained.

The existing `NormalizationConfiguration` already excludes component `config` from JaVers comparison, so removing the baseline keys did not require a change to production normalization logic. The important boundary was to remove only the target fields while preserving all other baseline data and custom component configuration.

## Clean the resources and guard against regressions

The change removes 20 `privateKey` fields from 10 affected realm baselines and removes the blanket SonarCloud exclusion for baseline files so they can be analyzed again. Tests use the real configured JaVers instance to check default components before and after cleanup, and verify that changed or custom components and their exported keys remain intact. A resource test checks every bundled baseline to prevent `privateKey` fields from returning.

A small `jq` sanitizer and documentation were added for preparing future baselines. The script only sanitizes prepared baselines; it does not modify user imports or exports. Before submission, all 22 baseline JSON files were parsed and compared to confirm that the only data changes were the targeted key removals.

## Verification and merge

On macOS x86_64 with Zulu JDK 21.0.13 and Maven Wrapper 3.9.6, the focused Maven tests and Checkstyle passed: 132 tests passed with no Checkstyle violations. The script passed `sh -n` and ShellCheck and was exercised for top-level and nested fields, preservation of other data and the input file, missing arguments, and invalid JSON. `git diff --check` also passed.

The full Docker/Testcontainers integration suite and a live Sonar scan were not run. Historical Sonar findings still require maintainer review, and the sanitizer does not remove other kinds of sensitive fields. Maintainer Motouom approved and merged [PR #1744](https://github.com/adorsys/keycloak-config-cli/pull/1744), which addressed [Issue #1743](https://github.com/adorsys/keycloak-config-cli/issues/1743).

This contribution was a bounded data cleanup: remove known placeholder fields while using JaVers behavior tests and a resource-level guard to keep the change from turning into an unnecessary production-logic modification.
