---
title: "2026-08-12-tasuki-keifu-agent-批处理优化记录"
date: "2026-08-12"
summary: "记录 tasuki-keifu-agent 真实批处理运行后的问题、优化与验证结果。"
category: "个人项目"
published: true
---

## tasuki-keifu-agent 批处理优化记录

这份文档记录真实 batch 运行后发现的问题和对应优化。后续每次有代表性运行结果时，按 Case 继续追加。

### Case 1：首轮小批量运行被 profile 缺失占满

#### 运行结果

- batchId：`03a417e1-ebe3-4a9b-9aea-5c52b67f2ea4`
- 模式：dry-run
- 人数：5
- 失败：0
- 归一化合并：0

5 个 `person` 都只命中 `profile_coverage_missing_fields`，缺少出生日期、出身地、国籍和日文读音。

#### 问题

1. profile 缺失是当前数据导入的常见状态，不等同于已有数据错误。
2. 原规则会把缺失 3 个以上字段标为 `high`，导致 batch 结果被低价值的缺失检查淹没。
3. 原规则会为每个 profile 缺失生成 `backfill_profile_fields`，即使没有可靠来源可以补。
4. 原 batch 会把这类停放结果当作最终治理，之后业务数据不更新时不会再次被选中。

#### 优化

1. `profile_coverage_missing_fields` 改为 `low`，定义为观察项。
2. 新增 `research_profile_wikipedia` 节点：
   - 只在 profile 有缺失时运行。
   - 只允许 Wikipedia 作为来源。
   - 只返回 Wikipedia 明确支持的缺失字段，不猜测、不扩大搜索范围。
3. Wikipedia 未找到或不可用时：保留 profile 缺失 finding，但不生成 action。
4. Wikipedia 找到明确字段时：追加 `profile_wikipedia_data_available` finding，才生成 `backfill_profile_from_wikipedia` action。
5. 只有 profile 缺失的治理结果不计入 batch 的最终治理时间，后续调整 profile 策略或接入写入规则后仍可再次被捞取。

#### 追加修正：Wikipedia 重定向安全边界

直接调用 MediaWiki API 后，需要防止同名消歧义、缺页或重定向到不同姓名页面时误补 profile。`sato-aoi` 的实际日文名是 `佐藤碧`，该页面命中属于合法结果。

因此补充规则：

- agent 使用 MediaWiki API，不再依赖 LLM web search。
- 网络出口优先使用标准代理环境变量；macOS 本地自动读取系统代理，因此会跟随 Clash Plus 的设置变化，不写死端口。
- API 最终页面标题必须与输入日文名在去空格、全半角统一后完全一致。
- 命中消歧义页、缺页或跳转到不同姓名页面时，一律不补全字段。

#### 验证重点

- 只有 profile 缺失、且 Wikipedia 无可用资料时，不应出现 `high` 风险或 `held`。
- Wikipedia 查到明确字段时会生成 profile 回填动作；在 profile 写执行器接入前，预期为 `medium / held`，且不写入业务库。
- 无 Wikipedia 资料时 action bundle 应为空。
- 有其他 finding 的 person 不受 profile 观察项影响。
- 后续 batch 仍能重新选中仅 profile 缺失的 person。

### Case 2：将内部异常从“只报告”收敛为保守写动作

#### 问题

membership 和 PB 的内部异常此前只会生成 review action，执行器无法处理；即使数据已明显不可信，也会继续保留为普通 `pending` 状态。

#### 优化

1. Wikipedia 节点在一次单人治理中同时读取 profile 与 PB；页面标题不严格匹配、消歧义、缺页或解析不明确时不写入。
2. Wikipedia profile 只回填空字段；Wikipedia PB 按项目新增或更新，并保留来源与审计。
3. membership 时间线异常不猜测正确组织或日期，统一标记相关记录为 `conflicting`。
4. 未被 Wikipedia 明确解决的 PB 冲突同样标记为 `conflicting`。
5. 所有低风险 action 都在执行前重新锁定目标记录，并写入业务 `AuditLog`；身份不确定的归一化仍按整组高风险停放。

#### 验证

- membership 异常样本 `鬼塚翔太` 已生成 `mark_memberships_conflicting`，风险为 `low / planned`。
- PB 冲突样本 `中野翔太` 已生成 `mark_personal_bests_conflicting`，风险为 `low / planned`。
- `limit=3` 的真实 batch dry-run 完成 3 人、失败 0、停放 0；该批未命中新动作。
- 当前 macOS 系统代理关闭时，Wikipedia 查询会返回 `unavailable` 并保留其他治理流程；不会生成猜测性写动作。
