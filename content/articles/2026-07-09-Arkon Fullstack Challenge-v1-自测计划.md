---
title: "2026-07-09 Arkon Fullstack Challenge V1 自测计划"
date: "2026-07-09"
category: "临时-Arkon Challenge"
tags: []
published: true
---

# Arkon Fullstack Challenge V1 自测计划


文档编号：`AFSC-QA-PLAN-V1`

## 1. 编写目的

本计划用于定义该评估漏斗项目的本地回归验证范围，目标是在交付前覆盖工程正确性与演示观感两类风险，重点包括：

- 表单校验行为
- 进度恢复行为
- 子路径兼容行为
- 免费态与解锁态结果门控行为
- 本地自动化可重复执行能力

## 2. 测试环境说明

- 项目路径：`/Users/xuhuan/workspace_new/project/arkon-fullstack-challenge`
- 本地访问地址：`http://127.0.0.1:3101/labs/arkon-challenge`
- Node 版本：`v20.19.6`
- 浏览器自动化工具：Playwright Chromium
- 子路径配置：`NEXT_PUBLIC_BASE_PATH=/labs/arkon-challenge`

## 3. 准入与准出条件

### 3.1 准入条件

- 依赖已安装完成
- 本地会话存储可正常使用
- 项目可以正常构建

### 3.2 准出条件

- 核心链路自动化检查通过
- 页面中不出现原始校验 payload 泄漏
- 四步流程不存在阻断级问题

## 4. 测试策略

- 静态质量门：`lint`、单元测试、生产构建
- 浏览器门禁：Playwright 全流程验证
- 交互重点：错误提示、刷新恢复、结果门控、支付解锁
- 回归规模：保留 60 条本地回归用例，并要求本轮全量执行

## 5. 执行命令

- `npm run lint`
- `npm test`
- `NEXT_PUBLIC_BASE_PATH=/labs/arkon-challenge npm run build`
- `NEXT_PUBLIC_BASE_PATH=/labs/arkon-challenge npm run dev -- --hostname 127.0.0.1 --port 3101`
- `SMOKE_BASE_URL=http://127.0.0.1:3101/labs/arkon-challenge npm run smoke:e2e`
- `SMOKE_BASE_URL=http://127.0.0.1:3101/labs/arkon-challenge npm run selfcheck:full`

## 6. 回归测试用例矩阵

### A. 启动与会话类用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T001 | 首页 Hero 标题正常渲染 | P0 | Playwright |
| T002 | 首次访问自动创建会话 | P0 | Playwright |
| T003 | 会话创建后本地写入 localStorage | P1 | 自动化/浏览器 |
| T004 | 已有会话在刷新后恢复已保存草稿 | P0 | Playwright |
| T005 | 已有会话恢复后当前步骤正确 | P1 | Playwright |
| T006 | 本地残留失效 session 时自动清理并重建 | P1 | Playwright/API |
| T007 | 会话创建完成前，“当前结果页”链接为占位态 | P2 | Playwright |
| T008 | 会话创建完成后，“当前结果页”链接指向当前 session | P1 | Playwright |

### B. 第一步身份信息用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T009 | 第一步初始状态下未默认选中性别 | P2 | Playwright |
| T010 | 选择 Female 后按钮高亮正确 | P2 | Playwright |
| T011 | 选择 Male 后按钮高亮正确 | P2 | Playwright |
| T012 | 未选性别不能继续下一步 | P0 | Playwright |
| T013 | 未选性别时显示可读错误提示 | P0 | Playwright |
| T014 | 第一步保存后性别值被持久化 | P0 | Playwright |
| T015 | 第一步成功后进入第二步 | P0 | Playwright |

### C. 第二步身体数据用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T016 | 年龄为空时阻止继续 | P0 | Playwright |
| T017 | 身高为空时阻止继续 | P0 | Playwright |
| T018 | 当前体重为空时阻止继续 | P0 | Playwright |
| T019 | 年龄小于 18 时显示友好提示 | P0 | Playwright |
| T020 | 年龄大于 80 时显示友好提示 | P1 | Playwright |
| T021 | 身高小于 130 时显示友好提示 | P0 | Playwright |
| T022 | 身高大于 230 时显示友好提示 | P1 | Playwright |
| T023 | 体重小于 35 时显示友好提示 | P0 | Playwright |
| T024 | 体重大于 250 时显示友好提示 | P1 | Playwright |
| T025 | 第二步校验失败时页面不出现原始 schema JSON | P0 | Playwright |
| T026 | 第二步合法输入可正常保存 | P0 | Playwright |
| T027 | 第二步点击返回可回到第一步且内存态不丢失 | P2 | Playwright |

### D. 第三步目标设置用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T028 | 未选择目标时不能继续 | P0 | Playwright |
| T029 | 目标体重为空时不能继续 | P0 | Playwright |
| T030 | 目标体重小于 35 时显示友好提示 | P1 | Playwright |
| T031 | 目标体重大于 250 时显示友好提示 | P1 | Playwright |
| T032 | 目标体重高于当前体重 20kg 以上时被拒绝 | P0 | Playwright |
| T033 | 目标选项按钮高亮正确 | P2 | Playwright |
| T034 | 第三步合法输入可正常保存 | P0 | Playwright |
| T035 | 第三步点击返回可回到第二步 | P2 | Playwright |
| T036 | 从第二步再次进入第三步后，之前输入的目标数据仍保留 | P1 | Playwright |

### E. 第四步活动水平与提交用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T037 | 未选活动水平时不能提交 | P0 | Playwright |
| T038 | 未选活动水平时显示友好提示 | P0 | Playwright |
| T039 | 活动水平按钮高亮正确 | P2 | Playwright |
| T040 | 最终提交前会先保存第四步活动水平 | P0 | Playwright/请求观察 |
| T041 | 关键字段缺失时服务端拒绝提交 | P0 | 单元测试/API |
| T042 | 合法提交后跳转到结果页 | P0 | Playwright |
| T043 | 合法提交后不会卡在第四步原地不动 | P0 | Playwright |

### F. 结果门控用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T044 | 提交成功后结果页正常加载 | P0 | Playwright |
| T045 | 免费态显示预览标识 | P0 | Playwright |
| T046 | 免费态隐藏热量建议值 | P0 | Playwright |
| T047 | 免费态隐藏每周节奏值 | P1 | Playwright |
| T048 | 免费态隐藏目标日期值 | P1 | Playwright |
| T049 | 免费态 `hiddenFields` 数量与内容正确 | P1 | API |
| T050 | 结果页返回漏斗入口链接在子路径下正确 | P1 | Playwright |

### G. 支付模拟与解锁用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T051 | 免费态结果页可成功触发模拟支付回调 | P0 | Playwright/API |
| T052 | 支付后状态切换为解锁态 | P0 | Playwright/API |
| T053 | 支付后热量建议字段可见 | P0 | Playwright/API |
| T054 | 支付后每周节奏字段可见 | P1 | Playwright/API |
| T055 | 支付后目标日期字段可见 | P1 | Playwright/API |
| T056 | 解锁后刷新页面，结果仍保持解锁态 | P1 | Playwright |

### H. 技术与部署安全用例

| 编号 | 用例说明 | 优先级 | 执行方式 |
|---|---|---|---|
| T057 | 所有客户端请求在 base path 下可正常工作 | P0 | Playwright |
| T058 | 所有客户端跳转在 base path 下可正常工作 | P0 | Playwright |
| T059 | 本地 `lint`、单元测试、生产构建均通过 | P0 | CLI |
| T060 | 本地 Playwright 全量自测可无人值守执行完成 | P0 | CLI |

## 7. 本轮执行策略

本轮要求对 `T001-T060` 全量执行，不留“仅库存未执行”项。

执行分组如下：

- A 组：启动、恢复、本地存储相关行为
- B 组：第一步到第四步输入校验、导航、返回行为
- C 组：结果页门控、支付解锁、刷新保持状态
- D 组：CLI 质量门，包括 `lint`、`test`、`build`

## 8. 暂不覆盖范围

- 多浏览器兼容性验证（Safari、Firefox）
- 生产环境真实 PostgreSQL 压测或并发竞争测试
- 完整无障碍专项测试
- 真实支付网关联调
