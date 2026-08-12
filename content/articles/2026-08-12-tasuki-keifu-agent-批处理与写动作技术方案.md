---
title: "2026-08-12-tasuki-keifu-agent-批处理与写动作技术方案"
date: "2026-08-12"
summary: "记录 tasuki-keifu-agent 批处理、action bundle、风险停放与审计闭环的第一版技术方案和当前实现边界。"
category: "个人项目"
published: true
---

## tasuki-keifu-agent 批处理与写动作技术方案

这份文档用于承接下一阶段开发。

目标不是一次把所有规则定死，而是先把第一版可落地的运行框架定出来，后续通过真实 case 持续迭代。

### 这一版要解决什么

当前 `person_diagnosis` 已经能做单人诊断，但还停留在：

- 单人触发
- 只读检查
- 只生成建议动作

下一阶段要补两件事：

- 增加外层 `batch runner`，能批量捞出需要治理的 `person`
- 增加真实写动作框架，让 graph 不只报问题，也能在中低风险下执行修正

### 基本判断

这一版有几个前提已经明确：

- 当前先继续围绕“归一化”推进，不扩展成 membership 专题改造
- 单人 graph 不改成多人 graph
- 多人处理放在 graph 外层，由 `batch runner` 负责
- graph 里先补 action bundle、风险评估和写动作执行
- 高风险不是停整个 batch，而是停当前 `person` 的整组动作

### 为什么 batch 不放进当前 graph

如果把多人处理直接塞进当前 graph，会带来几个问题：

- graph state 会从“单人诊断”膨胀成“批次调度 + 单人诊断 + 聚合结果”
- checkpoint、重试、失败隔离会更难读
- 单个 `person` 的 trace 会被一整个 batch 淹掉
- 后面调限流、并发、补跑时不够灵活

所以第一版更合适的做法是：

- graph 继续只做单人 worker
- batch 作为 graph 外层 orchestrator

### 总体结构

```text
batch runner
  -> 筛出需要治理的人
  -> 逐个调用 person_diagnosis graph
  -> graph 生成 findings + action bundle
  -> 统一评估当前 person 的整组风险
  -> 中低风险执行写动作
  -> 高风险整组停掉
  -> 记录执行审计
```

### 筛人规则

第一版筛人的目标不是“找所有数据不完整的人”，而是找“自上次治理后发生了变化的人”。

筛人规则先定为：

- 业务侧取该 `person` 相关模型的最大 `updatedAt`
- agent 侧取该 `person` 最近一次已完成治理时间
- 如果业务侧最大更新时间晚于最近一次已完成治理时间，则进入本轮 batch
- 如果从未完成过治理，也进入本轮 batch

这里的“已完成”包括两类最终结果：

- 已完成且没有需要执行的动作
- 已完成诊断但因高风险或未实现执行规则而停放

停放不代表失败。没有新业务数据时，不需要每个 batch 重复跑同一个高风险 case。

第一版业务侧先看三类模型：

- `Person`
- `Membership`
- `PersonalBest`

当前先不把 `Organization.updatedAt` 纳入筛选范围，避免把依赖范围扩得过大。

### 数据获取方式

这部分先不做跨库 join。

第一版由 agent 分两步完成：

1. 从业务库取候选 `person` 及其业务侧最大 `updatedAt`
2. 从 agent 库取这些 `person` 的最近完成治理时间
3. 在 agent 进程内比较，得出需要治理的人

### 单人 graph 的职责变化

当前 graph 的前半段检查链路先尽量少动：

- `check_profile_coverage`
- `check_membership_timeline`
- `check_person_normalization_risk`
- `research_name_identity`
- `check_personal_best_consistency`

这一版重点改 graph 后半段：

- `summarize_findings`
- `build_action_plan`
- `evaluate_action_bundle_risk`

其中 `build_action_plan` 已输出可审计的 `action bundle`；受严格条件保护的归一化合并已接入真实写入，其他动作仍停放。

### Action Bundle 与风险评估

第一版不要把每个 finding 都立刻单独执行。

更合理的做法是：

- 先把当前 `person` 的全部 findings 收拢
- 生成这一人的完整 `action bundle`
- 对整组动作统一做风险评估
- 再决定是否执行

风险判断以 `person` 为边界，不以整批为边界：

- 某个 `person` 命中高风险，停掉的是这个人的整组动作
- 不影响同一批里的其他人继续跑

第一版分三档：

- `high`
- `medium`
- `low`

执行规则：

- `high`：不执行任何写动作，只保留 findings、action bundle 和风险评估结果
- `medium`：允许自动执行，但要走更保守的执行顺序和完整审计
- `low`：自动执行

### 当前写动作边界

归一化已经接入第一条真实写动作：`merge_person_duplicate`。

- 只有一个候选、LLM 研究结果为 `same`、两条日文名的规范化结果完全一致，并且能从 slug 明确选出非临时保留记录时，才会生成合并动作
- 执行前会重新读取并锁定两条 `Person`，确认 slug 与规范化姓名未变化
- 单个事务会迁移 membership、PB、比赛成绩、来源映射，保留名称变体，清关系缓存，写入业务 `AuditLog`，再删除重复记录
- 关联记录目前只迁移，不做 membership、PB 或比赛成绩的语义去重
- membership、PB、profile 的动作仍只记录和停放，尚未接入写入规则

### 幂等与失败隔离

这一版已落最小幂等与隔离规则：

- 同一批次的同一 action 不重复记录
- 跨批次已成功的 action 可通过稳定幂等键识别
- 某个 `person` 执行失败，不影响其他 `person`
- 单个 action 失败后，当前 `person` 后续动作会停止

### 审计与可观测

LangSmith 用于看 graph trace、node 路径、LLM 输入输出和异常路径。

agent 审计库用于记录：

- batch
- `person` 治理结果
- findings
- action bundle
- 风险等级
- action 执行状态
- 最后一次完成治理时间

这两层共同用于后续批量复盘和规则调优。

### 当前实现状态

截至 2026-08-12，第一版框架已经落地：

- `batch runner` 已作为 graph 外层 CLI 落地
- 筛人逻辑已按 `Person`、`Membership`、`PersonalBest` 的最大 `updatedAt` 与最近完成治理时间比较
- `person_diagnosis` 已输出结构化 action bundle
- graph 已增加整组 action 风险评估
- agent 数据库已增加 batch、person 治理记录和 action 执行审计
- batch 默认 `dry-run`，可以完整跑筛人、诊断、动作规划、风险评估和审计记录
- 高风险或当前未实现写入规则的动作会按 person 单独停放，不影响同一批其他人

### 真实写入开关

真实写入必须同时满足：

- batch 通过 `--execute` 启动
- `TASUKI_AGENT_WRITE_ENABLED=true`
- 配置独立的 `TASUKI_KEIFU_BUSINESS_WRITE_DATABASE_URL`

未同时满足时，batch 一律维持 dry-run。
