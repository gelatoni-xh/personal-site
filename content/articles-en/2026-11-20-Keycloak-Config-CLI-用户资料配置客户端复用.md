---
title: "[Merged] keycloak-config-cli #1680: Reuse the configured client for user profile updates"
date: "2026-11-20"
summary: "Route user-profile PUT requests through the KeycloakProvider-managed client so proxy, TLS, timeout, and authentication settings apply consistently."
category: "open-source"
published: true
---

## A user-profile request bypassed shared network settings

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) applies identity configuration through the Keycloak Admin API. [Issue #1680](https://github.com/adorsys/keycloak-config-cli/issues/1680) reported that user-profile updates created a separate HTTP client and therefore skipped the configured proxy, TLS, timeout, and authentication settings. In deployments that require a proxy or custom certificates, this request could behave differently from the other requests in the same import.

## Reuse the client and preserve raw JSON

The fix routes the update through the client managed by `KeycloakProvider`, so it uses the shared connection configuration and authentication. The request body remains raw JSON to avoid dropping newer fields such as `defaultValue` through an older strongly typed model. The response is closed after the request, while the provider retains ownership of the shared client.

## Verification and merge

The local `UserProfileRepositoryTest` and `ResteasyUtilTest` passed 12 tests. `ImportUserProfileIT` against Keycloak 26.7.4 passed 7 tests with 2 skipped by existing version conditions. Checkstyle and `git diff --check` passed. The latest GitHub CI passed before merge; SonarCloud's Quality Gate passed while reporting one new issue.

Collaborator Motouom approved [PR #1746](https://github.com/adorsys/keycloak-config-cli/pull/1746), which was merged on November 20, 2026 at 11:55:46 UTC, addressing [Issue #1680](https://github.com/adorsys/keycloak-config-cli/issues/1680).

The change is about shared-client configuration and resource ownership: network policy is applied consistently, the raw request body needed for compatibility is retained, and the repository does not accidentally close a shared client.
