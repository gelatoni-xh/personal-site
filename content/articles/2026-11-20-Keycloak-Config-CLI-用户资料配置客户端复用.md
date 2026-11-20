---
title: "[Merged] keycloak-config-cli #1680：用户资料更新复用已配置客户端"
date: "2026-11-20"
summary: "让用户资料 PUT 请求复用 KeycloakProvider 管理的 HTTP 客户端，使代理、TLS、超时和认证配置一致生效。"
category: "open-source"
published: true
---

## 用户资料请求绕过了统一网络配置

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) 通过 Keycloak Admin API 应用身份配置。[Issue #1680](https://github.com/adorsys/keycloak-config-cli/issues/1680) 指出，用户资料更新单独创建 HTTP 客户端，因此没有继承项目中配置的代理、TLS、超时和认证设置。部署环境需要代理或自定义证书时，这个请求可能与同一导入中的其他请求行为不一致。

## 复用客户端，同时保留原始 JSON

修复将更新请求改为经由 `KeycloakProvider` 管理的客户端发送，使其沿用统一的连接配置和认证。请求体仍作为原始 JSON 传递，避免旧版强类型模型丢弃 `defaultValue` 等新字段；响应在请求完成后关闭，但共享客户端仍由 provider 管理，不在 repository 中关闭。

## 验证与合并

本地 `UserProfileRepositoryTest` 与 `ResteasyUtilTest` 共 12 项通过；Keycloak 26.7.4 上的 `ImportUserProfileIT` 有 7 项通过、2 项按现有版本条件跳过。Checkstyle 和 `git diff --check` 通过。合并前最新 GitHub CI 全部通过；SonarCloud Quality Gate 通过，同时报告 1 个新 issue。

协作者 Motouom 批准了 [PR #1746](https://github.com/adorsys/keycloak-config-cli/pull/1746)，并于 2026 年 11 月 20 日 11:55:46 UTC 合并，关联 [Issue #1680](https://github.com/adorsys/keycloak-config-cli/issues/1680)。

这项改动的边界在于共享客户端配置和资源所有权：网络策略集中沿用，兼容性所需的原始请求体保留，生命周期也不误关共享客户端。
