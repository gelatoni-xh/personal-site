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

### Case 3：真实写动作样本暴露解析与幂等边界

#### 运行结果

- 单人样本 `阿部陽樹`：Wikipedia 明确返回国籍和 6 项 PB，生成 PB 写入与 profile 回填两个低风险动作。
- 单人样本 `中野翔太`：已有 3 条 PB 已是 `conflicting`，保留 findings，但不再生成重复的冲突标记动作。
- 单人样本 `木付琳`：4 条当前企业队 membership 同时有效，聚合为 1 个 `mark_memberships_conflicting` 动作。

#### 问题

1. Wikipedia 的国籍字段可能是 `{{JPN}}` 这类模板；如果按普通文本保存，会把模板语法写进业务数据。
2. 已标记 `conflicting` 的 PB 每次治理都重复生成写动作，会制造无效审计记录，也浪费批处理配额。
3. 同一人的多个 membership 异常属于同一组治理意图，应聚合成一个写动作，而不是按 finding 重复写入。

#### 优化

1. 解析 Wikipedia 国籍时识别 `{{JPN}}`、`{{国籍|JPN}}`、`{{flagicon|JPN}}`，统一提取为 `JPN`。
2. 只有重复 PB 等“尚未处置”的内部冲突才生成 `mark_personal_bests_conflicting`；已经是 `conflicting` 的记录只保留 finding。
3. membership 冲突按 person 聚合成一个动作；动作执行顺序固定为：归一化、membership、PB、profile。
4. 更新 smoke 样本，使其覆盖“membership 聚合写入”和“已冲突 PB 不重复写入”两个回归边界。

#### 验证

- `nakano-shota` 诊断结果：3 条高优先级 PB findings，action bundle 为空。
- `abe-haruki` 诊断结果：动作顺序为 Wikipedia PB 写入，再回填国籍；`{{JPN}}` 被规范为 `JPN`。
- `kitsuki-rin` 诊断结果：4 条异常 membership 合并为 1 个低风险 planned action。

### Case 4：小批量候选仍被低价值观察项占据

#### 运行结果

- batchId：`2a862684-ef1c-4ac1-b348-96ccfa032e46`
- 模式：dry-run
- 人数：10
- 完成：10
- 失败：0
- 停放：0
- 写动作：0

这 10 人均完成诊断，但都没有可安全执行的动作，主要是 profile 缺失且 Wikipedia 无可用补充。

#### 问题

当前 batch 按业务更新时间从早到晚选人。对于首次大范围治理，历史较早、且只有 profile 观察项的人会持续排在前面，导致小批量很难覆盖 membership、PB 或归一化等更有治理价值的样本。

#### 决策与优化

采用“已知异常优先”策略。是否需要重新治理仍由业务侧最大更新时间与最近治理时间决定；只有同一轮候选的排序发生变化：

1. 归一化精确重名。
2. 当前多重 membership。
3. 尚未标记 `conflicting` 的重复 PB。
4. 其他 person，包括仅 profile 缺失的人。

这只使用业务库能够直接确认的规则信号，不把 LLM 判断带入候选 SQL。低价值 profile 观察项不会消失，只是不会继续挤占小批量的前排。

### Case 5：归一化优先后，同一重名组重复占据批次

#### 运行结果

- batchId：`2c6ac43d-d993-49cf-ad69-182c77b24175`
- 模式：dry-run
- 人数：5
- 完成：0
- 停放：5
- 失败：0

新的排序正确把 5 个高风险归一化候选排到前面。但其中 `桑原大地` 的多条记录属于同一个精确重名组，逐条进入 graph 后都只会得到同一组的归一化 findings。

#### 优化

对于优先级最高的精确重名候选，以标准化日文名作为组键，每个 batch 只选该组的一条 person。单人 graph 的归一化节点已经会回查并带出同组候选，因此这不会丢失判断信息；它只是避免同一批重复调用 LLM 和重复生成高风险停放记录。

membership、PB 和普通 person 仍以单个 person 为粒度，不做跨人去重。

### Case 6：已治理候选被过滤后，浅窗口会错误得到空 batch

候选是否需要重新治理要在 agent 库中判断。原实现只从业务库取 `limit * 4` 个候选；当前排优先候选刚完成治理后，它们会被过滤掉，但窗口之外仍有未治理 person，最终可能得到空 batch。

已将候选扫描窗口扩大到 `limit * 20`，最多 400 人。优先级和重新治理规则不变，只确保过滤后仍能填满合理的小批量。

### Case 7：首条真实治理写入

#### 运行结果

- batchId：`3e557a1a-f295-4e88-882f-2e4a2d567466`
- 模式：单人受控执行，`dryRun=false`
- 选手：`木付琳`（`kitsuki-rin`）
- 动作：`mark_memberships_conflicting`
- 结果：成功将 4 条同时有效的企业队 membership 从 `pending` 标记为 `conflicting`

agent 审计侧记录该 action 为 `succeeded`；业务库按每条 membership 写入了 4 条 `AuditLog`，没有删除记录、没有猜测正确组织或日期。

#### 发现与优化

首次真实写入发现：原生 SQL 的 `UPDATE` 不会自动触发 Prisma 的 `@updatedAt` 语义，状态已经变更但 `updatedAt` 仍停在旧时间，会使后续 batch 的“业务最后更新时间”失真。

已统一为执行器的 `Person`、`Membership`、`PersonalBest` 更新语句显式写入 `updatedAt = NOW()`，并校正本次 4 条 membership 的更新时间。

写后复跑还确认：检测 finding 会保留，便于看到历史异常；但当相关 membership 已全部是 `conflicting` 时，action plan 不再重复生成冲突标记动作，不再依赖执行器末端的幂等跳过。

### Case 8：同读音异汉字不应阻塞事实回填

`阿部陽樹` 因候选 `阿部陽葵` 读音相同，被归一化节点错误升级为身份不确定，导致 Wikipedia 已明确支持的 PB 和国籍动作被整组停放。

归一化规则调整为：汉字日文名必须在规范化后完全一致，才进入候选与 LLM 判断；读音只作为同汉字名候选的辅助证据。仅同读音、汉字不同默认视为不同 person，不再产生 `name_identity_uncertain`，也不阻塞 profile/PB 的低风险事实写入。

#### 验证

- `佐藤碧` 已从同名 Wikipedia 页面回填出生日期 `1997-09-25` 与出身地 `大分県`。
- `阿部陽樹` 已从同名 Wikipedia 页面回填国籍 `JPN`，并新增或校验 6 项 PB；读音相同的 `阿部陽葵` 不再阻塞这组事实写入。
