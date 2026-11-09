---
title: "Checkstyle #21417：将多行字符串拼接替换为文本块以提升可读性"
date: "2026-11-09"
summary: "将两个测试类中的 XML 字符串拼接改为 Java 文本块，在保留跨平台输出的同时处理 CI 反馈，并完成首次上游合并。"
category: "open-source"
published: true
---

## 从一个小而具体的测试改进入手

[Checkstyle issue #21417](https://github.com/checkstyle/checkstyle/issues/21417) 汇总了测试代码中 XML 字符串拼接可读性的问题。我们选择其中两个测试类作为一个小批次：`ChecksAndFilesSuppressionFileGeneratorAuditListenerTest` 和 `XpathFileGeneratorAuditListenerTest`。改动只涉及测试预期值的 Java 表达方式，不修改 Checkstyle 的生产逻辑，也不代表整个 issue 的所有工作都已完成。

XML 预期值由许多带转义引号、换行符和缩进的 Java 字符串组成。文本块能更直接地呈现 XML，但也会改变 Java 对缩进和行尾的处理方式。目标不是简单减少反斜杠，而是在改善可读性的同时保证被测字符串逐字节相同。

## 先验证等价，再扩大范围

第一批只改一个测试类。我们编译执行改写前后的 Java 表达式，并分别使用 LF 和 CRLF 行分隔符比较 UTF-8 字节。验证覆盖公共 XML 头以及多个完整输出，重点检查转义、空格和最后一个换行符。确认第一批测试通过后，再把同样方法用于 XPath 测试类。

最终 PR 涉及两个测试类中的 XML 输出，保持平台行分隔符。转换表达式时按仓库格式使用局部文本块和 `+` 拼接公共 XML 头，没有增加 lint 抑制，也没有放宽测试断言。

## CI 反馈改变了补丁

本地完整构建通过后，首轮上游检查发现两件事。一个未修改的测试夹具仍引用已关闭的 issue，最新主分支已经移除了该引用；Qodana 还指出四处 `.concat()` 应替换为 `+`。我们先将补丁 rebase 到最新主分支，再按静态检查意见改写表达式，并重新运行内容等价比较和完整验证。

修正后的完整 `./mvnw -e --no-transfer-progress clean verify` 用时 26 分 39 秒。7,275 项单元测试（2 项跳过）和 1,416 项集成测试均无失败或错误；两个目标测试类各 11 项通过，覆盖率及静态检查通过。LF/CRLF 下的 18 组内容比较保持一致。

GitHub Actions 对外部贡献的部分工作流需要维护者授权才会运行。我们把 `action_required` 当作等待批准，而不是测试失败或成功。维护者在 11 月 7 日批准了 PR，修正后的提交保留了批准；随后 PR 于 11 月 8 日合并。最终结果以本地完整验证、维护者 review 和 PR 合并状态分别记录。

## 这次改动教会我们的事

测试重构也有行为风险。Java 文本块的缩进剥离、平台行尾和结尾换行都可能让预期输出悄悄变化，因此只看测试仍然通过并不足以证明改动等价；独立比较实际字符串给了更直接的证据。

另一个收获是，CI 反馈会包含与本次代码无关、但会阻塞 PR 的基线问题。处理时应先区分既有夹具问题和本次改动，再在最新基线上修正并重跑验证。最终合并说明这批改动被接受，不意味着 Checkstyle 的完整 issue 已全部解决，也不保证相同做法适用于其他代码库。

本次贡献：[Checkstyle PR #22495](https://github.com/checkstyle/checkstyle/pull/22495)。
