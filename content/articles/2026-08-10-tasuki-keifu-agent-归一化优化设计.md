---
title: "2026-08-10-tasuki-keifu-agent-归一化优化设计"
date: "2026-08-10"
summary: "围绕 tasuki-keifu-agent 的选手归一化能力做第一轮正式设计，先聚焦名字候选召回、规则判断和 LLM 搜索分支。"
category: "个人项目"
published: true
---

# tasuki-keifu-agent 归一化优化设计

这份文档先只做方向性记录，不追求写得很细。
目的不是现在就把方案定死，而是先把下一阶段的重点收拢出来，后面再通过问答把设计逐步明确。

## 当前现状

当前 agent 里和归一化最相关的检查比较窄，核心还是这一条：

- 节点：`check_person_normalization_risk`
- 主要问题码：`duplicate_normalized_name`
- 主要判断信号：`displayNameJa` 归一化后的重名冲突

也就是说，现阶段它主要回答的是：

- 某个选手的日文名在做过规范化之后，是否和其他 `Person` 行发生了重名碰撞

这个能力有价值，但对于我们真正关心的“选手归一化”来说，范围还是偏小。

## 这一版的重点

下一阶段先把重点放在归一化上。

当前的工作目标可以先简单理解成：

- 提升基于人名的疑似重复识别能力
- 仍然坚持以名字为中心
- 先不要一下子膨胀成完整的实体解析系统

membership 后面也很重要，但这一轮先不让它主导设计。
我们后面可以再单独看当前 membership 检查的现状，再决定是否要并行改造。

另外，这一轮会顺手把现有 graph 里的 `relation cache` 检查节点移除。
这部分暂时不继续放在当前主诊断链路中处理。

## 总体方向

归一化这一块，后面大概率不应该继续只保留一个很薄的检查节点，而是逐步变成一个稍微完整一点的小流程。

目前可以先粗略理解成四步：

1. 扩大候选召回范围
2. 判断这类名字冲突或名字变体属于什么类型
3. 对不确定 case 再补充外部证据
4. 输出更清楚的归一化风险结果

## 候选召回

下一版应该先把候选召回做强，不要只停留在当前的 `displayNameJaSearch` 重复查询上。

可以考虑的召回面包括：

- 原始 `displayNameJa`
- 规范化后的 `displayNameJa`
- `displayNameKana`
- `displayNameRoman`
- 常见空格差异、全半角差异、大小写差异
- 常见转写变体
- 可能从 slug 中反推出的人名片段

这一层仍然要坚持 name-first。
它的目的还不是直接证明“是同一个人”，而是尽量不要漏掉名字层面上值得继续看的候选。

## 名字判断

这一版不一定需要一个很重的通用打分系统。

更适合的是先加一个更轻一点、以名字为中心的判断层，例如：

- 完全同名
- 规范化后同名
- kana 很接近
- romanization 很接近
- 单字差异看起来像录入误差
- 单字差异看起来像 OCR 误差
- 看起来像同名，但仅凭名字还不能下结论

这一层最好保持可解释、可讨论，不要太黑盒。

## 外部证据

对于高风险但不够确定的 case，后面可能需要一个升级路径。

可能会用到的输入包括：

- 面向官方 roster、结果页的 web search
- tasuki-keifu 当前已经使用的数据来源页面
- 基于已收集名字证据的 LLM 辅助判断

这里有一个原则先记下来：

- web search 和 LLM 不应该成为每次运行都走的默认路径
- 更适合作为少量模糊 case 的升级工具

## 可能的输出形态

下一版可能不应该只输出 `duplicate_normalized_name` 这一种结果。

后面也许需要更宽一点的归一化结果类型，例如：

- 明确的规范化碰撞
- 高概率是同一人的名字变体
- 有碰撞但仍然模糊
- 仅凭现有证据不足以下结论
- 需要人工复核

这些名字现在都只是占位，不是最终 code。

## Graph 形态

一个可能的方向是，把当前单个归一化节点拆成几个小节点。

例如：

- `recall_name_candidates`
- `assess_name_normalization_risk`
- `collect_name_evidence`
- `adjudicate_name_identity_risk`

其中，LLM + web search 不应该作为所有 run 都经过的串联节点。
更适合做成归一化检查内部的条件分支：

- 没有明显归一化风险：直接回到主链路
- 明确风险：记录 finding，直接回到主链路
- 模糊风险：进入 LLM + web search，再回到主链路

粗略结构可以理解为：

```text
规则归一化检查
  ├─ 无明显风险 ─────────────┐
  ├─ 明确风险，记录 finding ──┤
  └─ 模糊风险 -> LLM + web search ┘
                    |
                    v
              回到主诊断链路
```

这样没有归一化问题的 case 不会承担额外的搜索和 LLM 成本。
这只是当前的设计方向，不表示现在就要锁死最终节点名称。

## Membership

membership 后面依然很重要，因为它未来可能会作为归一化判断的弱辅助信号。

但这一轮先记住三点：

- 不要让 membership 主导归一化改造
- 不先假设当前 membership 逻辑就是错的
- 等我们后面看过现状和样例，再决定 membership 是否需要单独重做

## 近期意图

近期先做这些：

- 保持当前 V1 行为继续可用
- 先通过后续问答把归一化子流程逐步聊清楚
- membership 改造先暂缓，等我们看完当前状态再决定

## 已确认的设计方向

目前已经确认：

- 第一版候选召回先使用 `displayNameJa` 和 `displayNameKana`
- 匹配范围先采用中等强度：
  - 完全相同
  - 规范化后相同
  - 常见空格、全半角、长音等差异
  - `displayNameKana` 默认做平假名 / 片假名统一
- 对名字存在歧义的 case，增加一个独立的 LLM + web search node
- 这个 node 可以输出面向人的证据摘要、判断结果、置信度和来源
- web search 来源不做过度硬编码，prompt 中提示优先参考官方或高可信来源
- 允许在选手公开信息较少时使用有限的非官方来源辅助判断
- 这个 node 只在少量模糊 case 中触发，可以接受较长执行时间
- LLM 无法确定时，不中断主 graph：
  - 将“不确定”写入 findings
  - 继续执行 summary 和 action plan
- 规则层先将候选分成三档：
  - `明确风险`
  - `模糊风险`
  - `无明显风险`
- 只有 `模糊风险` 才触发 LLM + web search node
- LLM node 第一版固定输出：
  - `judgement`
  - `confidence`
  - `summary`
  - `evidence`
  - `sources`
  - `recommendation`
- 每次 graph 只处理一个主 `person`
- 单个 `person` 的归一化候选通常应为 `0` 或 `1`
- 第一版技术上最多保留 `3` 个高相关候选，主要作为保险上限
- 如果候选数超过 `3`：
  - 直接视为高风险异常
  - 不继续扩大 LLM 搜索
  - 优先怀疑规则召回过宽或导入链路存在系统性问题
  - 不让 graph 承担修复这类系统性问题的职责
- 当规则层判定为明确风险时，第一版继续沿用现有 finding code：
  - `duplicate_normalized_name`
- 第一版不加入“单字差异但疑似录入误差”的规则
- 当 `displayNameJa` 和 `displayNameKana` 给出不一致信号时：
  - 宁可进入 `模糊风险`
  - 再交给 LLM + web search 分支处理

## 开发步骤

按这个顺序直接做，不需要每步返厂讨论：

1. 先保留现有 `check_person_normalization_risk` 的节点名和 graph 位置不变
2. 在 `src/db/business-queries.ts` 里补一层归一化候选召回函数
   - 先查 `displayNameJa`
   - 再查 `displayNameKana`
   - 只返回少量候选
3. 在 `src/tools/person-tools.ts` 里把现有归一化检查改成两段
   - 先做规则判断
   - 再决定是否进入 LLM 分支
4. 规则层先落地这些匹配
   - `displayNameJa`：空格去除、全半角统一、长音差异
   - `displayNameKana`：平假名 / 片假名统一
5. 规则层先分三档
   - `明确风险`
   - `模糊风险`
   - `无明显风险`
6. `明确风险` 先继续沿用 `duplicate_normalized_name`
7. `模糊风险` 再进入新的 LLM + web search node
8. 这个 node 只输出摘要、来源、置信度和判断结果
9. `不确定` 进入 findings，主 graph 继续执行
10. 补 graph 分支和 action mapping
11. 最后补 smoke / sample case
   - 先保证老样例不回退
   - 再补一个模糊归一化样例
12. 同步把当前主 graph 中的 `check_relation_cache_status` 节点移除
   - 从 graph 链路中删除
   - 从 node smoke 和 sample case 中删除
   - 从 graph 结构文档中同步删除

## 开发原则

- 先做 name-first，不把归一化做成全实体解析
- 先复用现有 finding code，减少第一版改动面
- 没有归一化问题的 case 不要额外付出搜索和 LLM 成本
- 如果候选数量异常偏多，优先怀疑规则或导入链路，而不是让 graph 去“修复”
- 先实现可跑的最小闭环，再考虑扩展候选规则和更复杂证据
