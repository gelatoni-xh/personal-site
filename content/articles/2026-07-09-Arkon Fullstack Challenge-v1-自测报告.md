---
title: "2026-07-09 Arkon Fullstack Challenge V1 自测报告"
date: "2026-07-09"
category: "临时-Arkon Challenge"
tags: []
published: true
---

# Arkon Fullstack Challenge V1 自测报告


文档编号：`AFSC-QA-REPORT-V1`

## 1. 报告概览

- 日期：`2026-07-09`
- 范围：仅本地环境
- 本地地址：`http://127.0.0.1:3101/labs/arkon-challenge`
- 目标：在修复校验提示、子路径兼容、最终提交逻辑后，执行一轮完整本地回归

本轮重点验证内容如下：

- 子路径下的请求与跳转行为
- 友好的表单校验提示，而不是原始 schema 输出
- 刷新恢复与会话恢复
- 最终提交与结果页跳转
- 免费态与解锁态结果门控
- 60 条本地回归用例全量执行

## 2. 实际执行命令

- `npm run lint`
- `npm test`
- `NEXT_PUBLIC_BASE_PATH=/labs/arkon-challenge npm run build`
- `SMOKE_BASE_URL=http://127.0.0.1:3101/labs/arkon-challenge npm run smoke:e2e`
- `SMOKE_BASE_URL=http://127.0.0.1:3101/labs/arkon-challenge npm run selfcheck:full`

## 3. 执行结果汇总

| 项目 | 结果 |
|---|---|
| Lint | PASS |
| 单元测试 | PASS |
| 生产构建 | PASS |
| Playwright 冒烟测试 | PASS |
| 60 条全量自测 | PASS |

## 4. Playwright 冒烟结果摘要

```json
{
  "baseUrl": "http://127.0.0.1:3101/labs/arkon-challenge",
  "checks": [
    { "name": "friendly-validation-errors", "status": "passed" },
    { "name": "landing-render", "status": "passed" },
    { "name": "step-1-save", "status": "passed" },
    { "name": "step-2-save", "status": "passed" },
    { "name": "step-recovery-after-reload", "status": "passed" },
    { "name": "step-3-save", "status": "passed" },
    { "name": "submit-and-redirect", "status": "passed" },
    { "name": "free-result-redaction", "status": "passed" },
    { "name": "pay-unlock", "status": "passed" }
  ]
}
```

## 5. 60 条用例执行结果

| 编号 | 用例说明 | 结果 | 备注 |
|---|---|---|---|
| T001 | 首页 Hero 标题正常渲染 | PASS |  |
| T007 | 会话创建完成前，“当前结果页”链接为占位态 | PASS |  |
| T002 | 首次访问自动创建会话 | PASS | `aq_5057f3e963db4c4d` |
| T003 | 会话创建后本地写入 localStorage | PASS | `aq_5057f3e963db4c4d` |
| T008 | 会话创建完成后，“当前结果页”链接指向当前 session | PASS | `/labs/arkon-challenge/result/aq_5057f3e963db4c4d` |
| T009 | 第一步初始状态下未默认选中性别 | PASS |  |
| T010 | 选择 Female 后按钮高亮正确 | PASS |  |
| T011 | 选择 Male 后按钮高亮正确 | PASS |  |
| T012 | 未选性别不能继续下一步 | PASS |  |
| T013 | 未选性别时显示可读错误提示 | PASS |  |
| T006 | 本地残留失效 session 时自动清理并重建 | PASS | `aq_e3eb4b26f8644e3e` |
| T014 | 第一步保存后性别值被持久化 | PASS |  |
| T015 | 第一步成功后进入第二步 | PASS |  |
| T027 | 第二步点击返回可回到第一步且内存态不丢失 | PASS |  |
| T016 | 年龄为空时阻止继续 | PASS |  |
| T017 | 身高为空时阻止继续 | PASS |  |
| T018 | 当前体重为空时阻止继续 | PASS |  |
| T019 | 年龄小于 18 时显示友好提示 | PASS |  |
| T020 | 年龄大于 80 时显示友好提示 | PASS |  |
| T021 | 身高小于 130 时显示友好提示 | PASS |  |
| T022 | 身高大于 230 时显示友好提示 | PASS |  |
| T023 | 体重小于 35 时显示友好提示 | PASS |  |
| T024 | 体重大于 250 时显示友好提示 | PASS |  |
| T025 | 第二步校验失败时页面不出现原始 schema JSON | PASS |  |
| T026 | 第二步合法输入可正常保存 | PASS |  |
| T028 | 未选择目标时不能继续 | PASS |  |
| T029 | 目标体重为空时不能继续 | PASS |  |
| T030 | 目标体重小于 35 时显示友好提示 | PASS |  |
| T031 | 目标体重大于 250 时显示友好提示 | PASS |  |
| T032 | 目标体重高于当前体重 20kg 以上时被拒绝 | PASS |  |
| T033 | 目标选项按钮高亮正确 | PASS |  |
| T035 | 第三步点击返回可回到第二步 | PASS |  |
| T036 | 从第二步再次进入第三步后，之前输入的目标数据仍保留 | PASS |  |
| T034 | 第三步合法输入可正常保存 | PASS |  |
| T037 | 未选活动水平时不能提交 | PASS |  |
| T038 | 未选活动水平时显示友好提示 | PASS |  |
| T039 | 活动水平按钮高亮正确 | PASS |  |
| T040 | 最终提交前会先保存第四步活动水平 | PASS | `PATCH /labs/arkon-challenge/api/session/aq_6c954f66edf84847/progress | POST /labs/arkon-challenge/api/session/aq_6c954f66edf84847/submit | GET /labs/arkon-challenge/api/session/aq_6c954f66edf84847/result` |
| T042 | 合法提交后跳转到结果页 | PASS | `http://127.0.0.1:3101/labs/arkon-challenge/result/aq_6c954f66edf84847` |
| T043 | 合法提交后不会卡在第四步原地不动 | PASS |  |
| T044 | 提交成功后结果页正常加载 | PASS |  |
| T045 | 免费态显示预览标识 | PASS |  |
| T046 | 免费态隐藏热量建议值 | PASS |  |
| T047 | 免费态隐藏每周节奏值 | PASS |  |
| T048 | 免费态隐藏目标日期值 | PASS |  |
| T050 | 结果页返回漏斗入口链接在子路径下正确 | PASS |  |
| T041 | 关键字段缺失时服务端拒绝提交 | PASS |  |
| T005 | 已有会话恢复后当前步骤正确 | PASS |  |
| T004 | 已有会话在刷新后恢复已保存草稿 | PASS |  |
| T049 | 免费态 `hiddenFields` 数量与内容正确 | PASS | `["recommendedKcal","weeklyDeltaKg","targetDateIso"]` |
| T051 | 免费态结果页可成功触发模拟支付回调 | PASS |  |
| T052 | 支付后状态切换为解锁态 | PASS |  |
| T053 | 支付后热量建议字段可见 | PASS | `2359` |
| T054 | 支付后每周节奏字段可见 | PASS | `0.7` |
| T055 | 支付后目标日期字段可见 | PASS | `2026-10-07` |
| T056 | 解锁后刷新页面，结果仍保持解锁态 | PASS |  |
| T057 | 所有客户端请求在 base path 下可正常工作 | PASS | `/labs/arkon-challenge` |
| T058 | 所有客户端跳转在 base path 下可正常工作 | PASS | `/labs/arkon-challenge` |
| T059 | 本地 `lint`、单元测试、生产构建均通过 | PASS | `verified in CLI phase` |
| T060 | 本地 Playwright 全量自测可无人值守执行完成 | PASS | `verified in CLI phase` |

完整 JSON 结果文件同步输出到：

- `/Users/xuhuan/workspace_new/document/2026-07-09-arkon-fullstack-challenge/全量自测结果.json`

## 6. 本轮确认修复项

本轮本地回归确认以下问题已在最终状态中被覆盖并验证通过：

- 客户端请求、跳转、链接已统一兼容子路径
- 每一步保存采用步骤级 payload，不再把完整草稿一次性提交给进度接口
- 最终提交前会补保存第四步活动水平
- 校验失败已改为可读的字段级提示，不再直接展示原始 schema 错误内容

## 7. 剩余风险

- 本轮仅验证 Chromium，未覆盖 Safari 与 Firefox
- 本地验证不能替代重新部署后的线上浏览器复核
- 当前支付逻辑仍为模拟支付，不包含真实支付链路

## 8. 结论

当前版本在本地环境下已达到可交付状态。此前通过手工点击暴露出的主要问题，即“原始校验错误直接展示到页面上”和“最后一步提交链路不稳定”，现已纳入自动化验证并在本轮回归中全部通过。
