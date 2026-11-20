---
title: "[Merged] keycloak-config-cli #1669：修复工作流重启与取消配置映射"
date: "2026-11-20"
summary: "让根级 restart/cancel 配置映射到 Keycloak 实际读取的字段，同时保留旧输入兼容并修复空值序列化兼容。"
category: "open-source"
published: true
---

## 导入成功，但工作流设置没有生效

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) 将声明式配置导入 Keycloak。[Issue #1669](https://github.com/adorsys/keycloak-config-cli/issues/1669) 报告根级 `restartInProgress` 和 `cancelInProgress` 可以成功导入，却没有改变 Keycloak 中的工作流行为。原因是 Keycloak 实际读取 kebab-case 字段 `restart-in-progress` 和 `cancel-in-progress`。

## 映射字段并兼容既有配置

修复为 Java 属性增加 Keycloak 使用的 JSON 字段名，同时把 camelCase 保留为输入别名，让旧配置仍可读取。未设置的根级字段会省略；即使同时使用嵌套 `concurrency` 配置，也不会发送空的根级值。文档和序列化测试覆盖了字段映射，新增集成测试则在登录后检查 restart/cancel 是否实际改变调度状态。

集成验证还发现 Keycloak 26.6.4 会拒绝客户端发送的未知 `null` 对象属性。项目的 Jackson provider 因此调整为省略对象属性中的 null，同时保留 Map 中的 null 值，因为它们用于清除客户端认证流程绑定。相应回归测试覆盖两种不同语义。

## 验证与合并

本地 Keycloak 26.6.4 上，371 项单元测试和新增 workflow 集成测试通过，Checkstyle 通过。Keycloak 26.7.4 上，workflow 集成测试及四项 provider 测试通过；`ImportClientsIT` 有 36 项通过、10 项按条件跳过和 1 项 403 失败。该失败用未修改的上游 provider 也能复现，PR 将其记录为独立既有问题。完整 CI 版本矩阵未在本地运行。

协作者 Motouom 批准了 [PR #1745](https://github.com/adorsys/keycloak-config-cli/pull/1745)，并于 2026 年 11 月 20 日 11:48:41 UTC 合并。合并前同步 `main` 后，GitHub CI 全部通过。

这项修复连接了配置输入、JSON 序列化和 Keycloak 调度行为三个边界；兼容旧字段名的同时，也明确区分了对象 null 与 Map null 的用途。
