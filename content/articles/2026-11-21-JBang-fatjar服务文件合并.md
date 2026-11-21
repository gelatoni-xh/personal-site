---
title: "[Merged] JBang #2704：保留 fatjar 服务提供者之间的换行"
date: "2026-11-21"
summary: "修复服务配置文件拼接导致类名粘连的问题，用四种行尾输入验证提供者仍位于独立行。"
category: "open-source"
published: true
---

## 合并文件时丢失了逻辑边界

[JBang](https://github.com/jbangdev/jbang) 是运行 Java 脚本和应用的命令行工具。`jbang export fatjar` 可以把应用和依赖打包进一个 JAR；多个依赖中的同名 `META-INF/services/*` 文件需要合并，让 Java 的服务加载机制能够发现各个实现。

[Issue #2704](https://github.com/jbangdev/jbang/issues/2704) 的问题发生在这个合并步骤：原实现直接追加文件字节。如果前一个文件没有末尾换行，`com.example.Impl1` 与下一个文件的 `com.example.Impl2` 就会变成一行 `com.example.Impl1com.example.Impl2`。文件包含两个类名的文本，却不再包含两条有效的服务提供者记录。

## 在追加处保证分隔，而不是重写文件

修复在向已有服务文件追加内容之前写入一个换行。服务配置允许空行，因此已有 LF、CRLF 或 CR 行尾时，多出的空白不会增加提供者；缺少末尾换行时，这个分隔符则避免两条记录粘连。这个选择保留了原文件内容，也不需要为修复边界问题引入完整的服务文件解析和重写。

回归测试由单一示例改成参数化测试，覆盖没有末尾换行、LF、CRLF 和 CR 四种情况。断言也从“包含两个类名”改为“解析行后恰好得到两条独立记录”。这是关键区别：旧的子串断言即使面对粘连后的错误类名，也会通过。

## 验证与合并

修复前，无末尾换行的新增测试能够复现类名粘连。修复后，本地执行 `./gradlew test --tests 'dev.jbang.cli.TestExport' formatCheck`，29 项通过、3 项跳过，`git diff --check` 也通过。完整单元和集成测试没有在本地运行。

上游 CI 的格式检查、JVM 单元测试、多版本集成和 smoke 测试、三平台 native-image 测试以及 CodeQL 均成功。合并后另有 `cleanup-closed-pr` 清理任务失败，因此不把所有检查概括为全绿；这项失败不改变 PR 已合并的事实。

维护者 `maxandersen` 批准并于 2026 年 11 月 21 日合并了 [PR #2709](https://github.com/jbangdev/jbang/pull/2709)，关联 issue 随之关闭。实现和测试由 AI 协助完成。这次改动的沉淀是：拼接结构化文本时，字节追加必须保留记录边界，测试也应验证结构而不只是子串。
