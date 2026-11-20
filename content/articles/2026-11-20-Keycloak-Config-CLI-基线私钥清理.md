---
title: "[Merged] keycloak-config-cli #1743：清理规范化基线中的占位私钥"
date: "2026-11-20"
summary: "移除随 JAR 发布的 realm 基线中的占位 privateKey，补充回归保护和基线清理工具，并由维护者合并。"
category: "open-source"
published: true
---

## 基线文件里包含无用的私钥字段

[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) 使用随项目发布的 realm 基线辅助配置归一化。[Issue #1743](https://github.com/adorsys/keycloak-config-cli/issues/1743) 关注到其中有多个 `privateKey` 字段只是导出基线中的占位值。这些字段随 JAR 一起发布，也会进入静态分析范围，但并不代表需要保留的配置。

项目已有的 `NormalizationConfiguration` 会在 JaVers 比较中排除 component 的 `config` 字段，因此清理基线不需要改动生产归一化逻辑。关键是只删除目标字段，并确认其他基线数据及自定义 component 配置不受影响。

## 清理数据并防止回归

改动从 10 个受影响的 realm 基线中删除了 20 个 `privateKey` 字段，同时移除了对整个基线文件的 SonarCloud 排除，让这些资源重新接受分析。测试使用项目实际配置的 JaVers 实例，验证默认 component 在清理前后的比较行为，并覆盖变更或自定义 component 及其导出字段仍会保留的情况。另有资源测试检查所有内置基线，防止 `privateKey` 字段再次进入。

为后续准备基线新增了一个小型 `jq` 清理脚本和文档说明。脚本只处理准备发布的基线，不会修改用户导入或导出的数据。提交前还逐一解析 22 个基线 JSON，并确认差异只包含目标字段删除。

## 验证与合并

本地在 macOS x86_64、Zulu JDK 21.0.13 和 Maven Wrapper 3.9.6 环境中运行了相关 Maven 测试与 Checkstyle：132 项测试通过，Checkstyle 无违规。脚本通过 `sh -n` 和 ShellCheck，并验证了顶层及嵌套字段、其他数据保留、输入文件不变、参数错误和非法 JSON 等情况；`git diff --check` 也通过。

全量 Docker/Testcontainers 集成测试和实时 Sonar 扫描没有运行；历史 Sonar 告警仍需维护者单独评估，脚本也不负责清理其他类型的敏感字段。维护者 Motouom 批准并合并了 [PR #1744](https://github.com/adorsys/keycloak-config-cli/pull/1744)，该 PR 关联 [Issue #1743](https://github.com/adorsys/keycloak-config-cli/issues/1743)。

这次贡献主要是一次有边界的数据清理：删除确定无用的占位字段，同时用 JaVers 行为测试和资源级检查约束清理范围，避免把基线维护问题误改成生产逻辑变化。
