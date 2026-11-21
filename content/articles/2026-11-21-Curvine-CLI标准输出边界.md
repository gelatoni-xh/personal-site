---
title: "[Merged] Curvine #2318：让 mkdir 和 touch 的状态提示离开 stdout"
date: "2026-11-21"
summary: "清理文件操作命令的标准输出，将成功提示移到 stderr，并补充失败与成功路径的子进程回归测试。"
category: "open-source"
published: true
---

## 状态提示进入了脚本的数据流

[Curvine](https://github.com/CurvineIO/curvine) 是基于 Rust 的分布式缓存文件系统。它的 `cv fs` 命令行接口可以创建目录和文件。[Issue #2318](https://github.com/CurvineIO/curvine/issues/2318) 指出，`mkdir` 和 `touch` 会把状态提示写到标准输出，脚本捕获 stdout 时也会拿到这些文本。

修复删除了 `mkdir` 在执行操作前打印的调试信息，并把目录创建、文件创建及已有文件时间戳更新后的成功提示从 `println!` 改为 `eprintln!`。终端仍能看到反馈，stdout 则不再混入这些状态文本。文件系统操作和错误传播保持原有行为；操作失败时不会打印成功提示。

## 从失败路径补到成功路径

最初的子进程回归测试把命令指向不可用的 master，检查非零退出码、空 stdout 和不存在成功提示。这能保护失败路径，却不能验证成功提示是否写到了正确的输出流。

Copilot review 指出了这个缺口：即使把成功提示改回 stdout，这组失败测试仍然能通过。后续因此增加了 MiniCluster 支持的持久化子进程测试，分别覆盖 `mkdir`、新文件 `touch` 和已有文件 `touch`，断言成功退出、stdout 为空，以及 stderr 包含预期提示。

## 验证范围与上游接纳

初版提交的 `cargo test -p curvine-cli --tests` 和 CLI 定向 Clippy 检查通过，初版上游编译及 smoke test 也通过。全工作区 `make format` 则受既有 macOS FUSE 编译错误阻碍，不能将局部验证概括为完整工作区验证通过。

补充 MiniCluster 回归测试时，本地 Rust 工具链及构建产物已经移除，因此新增测试没有在本地编译、运行或执行 Rust 格式检查。这项限制已写入 PR 描述和 review 回复。最新提交触发的 DCO、标题检查及编译工作流显示失败，但查询时无法取得失败日志，因此没有把它们解释为确定的代码测试失败，也没有将旧提交的绿灯算作最新提交通过。

维护者 `lzjqsdd` 于 2026 年 11 月 21 日批准并合并了 [PR #2329](https://github.com/CurvineIO/curvine/pull/2329)，关联 issue 随之关闭。这次贡献由 AI 协助完成；上游合并代表补丁获得接纳，新增成功路径测试仍保留上述未验证限制。
