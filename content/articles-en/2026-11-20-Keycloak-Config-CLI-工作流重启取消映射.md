---
title: "[Merged] keycloak-config-cli #1669: Fix workflow restart and cancel field mapping"
date: "2026-11-20"
summary: "Map root restart/cancel settings to the fields Keycloak reads, preserve legacy input names, and handle null serialization compatibly."
category: "open-source"
published: true
---

## Imported settings that did not take effect

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) imports declarative configuration into Keycloak. [Issue #1669](https://github.com/adorsys/keycloak-config-cli/issues/1669) reported that root-level `restartInProgress` and `cancelInProgress` imported successfully but did not change workflow behavior. Keycloak reads the kebab-case fields `restart-in-progress` and `cancel-in-progress` instead.

## Map the fields and preserve existing inputs

The fix maps the Java properties to the JSON field names used by Keycloak and keeps camelCase as input aliases so existing configuration remains readable. Unset root fields are omitted, including when nested `concurrency` configuration is used. Serialization tests cover the field mapping, and a new integration test checks whether restart and cancel actually change scheduling after login.

Integration testing also exposed Keycloak 26.6.4 rejecting unknown object properties sent with null values. The Jackson provider now omits null object properties while preserving null Map values, which are needed to clear client authentication-flow bindings. Regression tests cover both behaviors.

## Verification and merge

On Keycloak 26.6.4, 371 unit tests and the new workflow integration test passed locally, along with Checkstyle. On Keycloak 26.7.4, the workflow integration test and four provider tests passed. `ImportClientsIT` had 36 passes, 10 condition-based skips, and one 403 failure. The same failure reproduced with the unmodified upstream provider, so the PR records it as an independent pre-existing issue. The full CI version matrix was not run locally.

Collaborator Motouom approved [PR #1745](https://github.com/adorsys/keycloak-config-cli/pull/1745), which was merged on November 20, 2026 at 11:48:41 UTC. GitHub CI passed after `main` was merged into the branch.

This fix connects the configuration input, JSON serialization, and Keycloak scheduling boundaries. It preserves the legacy field names while distinguishing the purpose of null object properties from null Map values.
