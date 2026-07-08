---
title: "2026-07-09 Arkon Fullstack Challenge V1 技术方案"
date: "2026-07-09"
category: "临时-Arkon Challenge"
tags: []
published: true
---

# Arkon Fullstack Challenge V1 技术方案

文档编号：`AFSC-TECH-V1`

日期：2026-07-09

关联文档：

- [2026-07-09-Arkon Fullstack Challenge-v1-PRD.md](./2026-07-09-Arkon%20Fullstack%20Challenge-v1-PRD.md)
- [2026-07-09-Arkon Fullstack Challenge-v1-自测计划.md](./2026-07-09-Arkon%20Fullstack%20Challenge-v1-%E8%87%AA%E6%B5%8B%E8%AE%A1%E5%88%92.md)
- [2026-07-09-Arkon Fullstack Challenge-v1-自测报告.md](./2026-07-09-Arkon%20Fullstack%20Challenge-v1-%E8%87%AA%E6%B5%8B%E6%8A%A5%E5%91%8A.md)

## 1. 方案目标

本方案用于落地 `Arkon Fullstack Challenge V1`。

本方案的目标不是构建一个大型健康平台，而是在尽量小的代码范围内实现一个完整、稳定、可部署、可回归的评估漏斗闭环。

本方案固定解决以下问题：

1. 如何自动创建和恢复会话
2. 如何按步骤保存问卷草稿
3. 如何在服务端计算结果并做门控
4. 如何兼容 `/labs/arkon-challenge` 子路径部署
5. 如何在本地完成稳定自动化自测

## 2. 项目背景与现状判断

当前项目的交付目标非常明确：

1. 面试评审只需要一个小而完整的产品链路
2. 评审更关心工程质量而不是复杂业务规模
3. 产品必须能够本地演示，也能挂在已有站点域名下的子路径

因此技术方案不能走“做大系统”的路径，而应优先满足：

1. 结构清晰
2. 状态稳定
3. 回归容易
4. 部署简单
5. 清理方便

## 3. 技术设计原则

本方案固定采用以下原则：

### 3.1 单体应用优先

前端与后端都放在同一个 Next.js 应用内，不拆独立前台仓库和独立 API 仓库。

原因：

1. 交付目标小
2. 链路短
3. 便于本地启动、部署和清理

### 3.2 会话优先于账号

本版本不引入登录体系，而是通过公开 session ID + 本地存储完成恢复能力。

原因：

1. 登录不是本题重点
2. 会话恢复已经足够体现状态管理能力
3. 可以显著降低实现成本

### 3.3 分步保存优先于最终一次性提交

每一步都独立持久化，最终提交只负责：

1. 补保存最后一步
2. 校验整体完整性
3. 触发服务端计算

原因：

1. 更符合“可恢复”的产品目标
2. 更容易验证中途中断和刷新恢复
3. 更容易通过自动化脚本复现状态流

### 3.4 服务端计算优先于前端拼装

评估结果必须在服务端生成。

原因：

1. 更符合“后端能力展示”的交付方向
2. 可以清晰体现服务层职责
3. 有利于结果门控和后续真实业务扩展

### 3.5 子路径兼容作为强约束

本项目部署目标不是站点根路径，而是既有域名下的子路径。

因此技术实现必须从一开始就考虑：

1. fetch 请求路径
2. 结果页跳转路径
3. 页面内 Link
4. 静态资源路径

### 3.6 自动化回归作为交付组成部分

本版本不把“能手点通”视为完成标准，而是把自动化回归作为交付的一部分。

## 4. 总体技术架构

整体架构固定为四层：

1. 页面层
2. API 路由层
3. 服务层
4. 仓储层

### 4.1 页面层

负责：

1. 用户输入
2. 页面状态切换
3. 字段级错误提示
4. 与 API 的交互

页面层不负责：

1. 结果计算
2. 最终业务校验闭环
3. 数据存储策略

### 4.2 API 路由层

负责：

1. 接收请求
2. 做入参解析
3. 调用服务层
4. 返回结构化 JSON

API 路由层不负责：

1. 写复杂业务逻辑
2. 直接操作页面状态

### 4.3 服务层

负责：

1. 编排会话创建、保存、提交、解锁
2. 提交前完整性校验
3. 服务端结果计算调用
4. 免费态与解锁态结果转换

### 4.4 仓储层

负责：

1. 提供统一的会话读写接口
2. 屏蔽内存态与 Prisma/Postgres 的差异

仓储层分为两种实现：

1. `MemorySessionRepository`
2. `PrismaSessionRepository`

## 5. 技术栈选型说明

### 5.1 前后端主框架

- `Next.js 16`
- `React 19`

选择理由：

1. 前后端同构，适合小型全栈交付
2. 页面与 API 可在同仓内管理
3. 构建、部署、子路径处理相对统一

### 5.2 数据层

- `Prisma`
- `Postgres`

选择理由：

1. 数据模型表达清晰
2. 本地与部署态都容易落地
3. 面试场景下可读性较好

### 5.3 校验层

- `zod`

选择理由：

1. 前后端边界清晰
2. 错误结构易于转换为字段级提示
3. 适合问卷式输入场景

### 5.4 测试层

- `Vitest`
- `Playwright`

选择理由：

1. `Vitest` 适合服务层快速单测
2. `Playwright` 适合验证用户真实点击链路

## 6. 代码结构与职责划分

### 6.1 页面文件

- `src/app/page.tsx`
- `src/app/result/[sessionId]/page.tsx`

职责：

1. 漏斗页面交互
2. 结果页展示与解锁交互

### 6.2 API 路由

- `src/app/api/session/route.ts`
- `src/app/api/session/[sessionId]/route.ts`
- `src/app/api/session/[sessionId]/progress/route.ts`
- `src/app/api/session/[sessionId]/submit/route.ts`
- `src/app/api/session/[sessionId]/result/route.ts`
- `src/app/api/pay/route.ts`

职责：

1. 会话创建
2. 会话读取
3. 分步保存
4. 最终提交
5. 结果读取
6. 支付解锁

### 6.3 领域与服务

- `src/lib/domain.ts`
- `src/lib/service.ts`
- `src/lib/calculations.ts`
- `src/lib/validation.ts`

职责：

1. 定义业务类型
2. 定义服务层行为
3. 定义结果计算逻辑
4. 定义输入校验规则

### 6.4 数据访问

- `src/lib/repository.ts`

职责：

1. 统一封装仓储接口
2. 提供内存仓储实现
3. 提供 Prisma 仓储实现

## 7. 数据模型设计

### 7.1 AssessmentSession

核心字段包括：

1. `publicId`
2. `currentStep`
3. `status`
4. `subscriptionStatus`
5. `sex`
6. `age`
7. `heightCm`
8. `weightKg`
9. `goal`
10. `targetWeightKg`
11. `activityLevel`

作用：

- 承载问卷草稿与整体状态

### 7.2 AssessmentResult

核心字段包括：

1. `bmi`
2. `bmiCategory`
3. `recommendedKcal`
4. `weeklyDeltaKg`
5. `targetDateIso`
6. `narrative`

作用：

- 存放服务端评估产出

### 7.3 PaymentEvent

核心字段包括：

1. `providerRef`
2. `amountCents`
3. `status`

作用：

- 记录模拟支付事件

## 8. 会话与恢复机制设计

### 8.1 本地会话标识

使用固定 localStorage key：

- `arkon-fullstack-challenge-session`

作用：

1. 保存当前公开 session ID
2. 支持刷新恢复
3. 支持浏览器内中断后继续

### 8.2 公开 session ID

不暴露数据库主键，使用 `aq_` 前缀的公开 ID。

原因：

1. 更适合作为结果页 URL 的公开标识
2. 与内部数据库主键职责隔离

## 9. 分步保存设计

### 9.1 关键策略

每一步提交时，只上传当前步骤所需字段，而不是整份草稿。

例如：

- 第一步只传 `sex`
- 第二步只传 `age`、`heightCm`、`weightKg`
- 第三步只传 `goal`、`targetWeightKg`
- 第四步只传 `activityLevel`

这样做的原因：

1. 减少无关字段校验冲突
2. 更符合分步业务语义
3. 更容易定位错误来源

### 9.2 仓储合并策略

仓储层收到 payload 后，不是整体覆盖草稿，而是按字段合并。

好处：

1. 中途返回修改不会丢掉其他已保存字段
2. 更适合恢复场景

## 10. 输入校验与错误处理设计

### 10.1 前端校验

前端负责最贴近用户体验的校验：

1. 必填项校验
2. 数值范围校验
3. 目标体重特殊规则校验
4. 字段级提示展示

前端校验的目标是：

- 尽量让用户在发请求前就看到清晰提示

### 10.2 服务端校验

服务端通过 `zod` 进行兜底校验。

服务端校验的目标是：

1. 防止无效输入真正进入业务层
2. 确保 API 具有基本边界
3. 生成结构化错误信息

### 10.3 错误返回策略

`progress` 接口在校验失败时返回：

1. `error`
2. `fieldErrors`

前端根据 `fieldErrors` 展示到对应字段附近，而不是直接把 `ZodError` 文本渲染到页面。

## 11. 结果计算设计

结果计算在 `src/lib/calculations.ts` 中完成。

输入：

1. age
2. heightCm
3. weightKg
4. targetWeightKg
5. activityLevel
6. goal
7. sex

输出：

1. BMI
2. BMI 分类
3. 推荐热量
4. 每周节奏
5. 目标日期
6. 说明性 narrative

该逻辑必须只在服务端运行，页面层不直接参与计算。

## 12. 结果门控与展示策略

### 12.1 免费态

免费态返回：

1. BMI
2. BMI 分类
3. narrative

并隐藏：

1. `recommendedKcal`
2. `weeklyDeltaKg`
3. `targetDateIso`

### 12.2 解锁态

解锁态返回完整结果字段。

### 12.3 实现位置

结果门控逻辑在服务层 `readPublicResult` 中统一处理，而不是在页面层通过硬编码字段裁切。

## 13. 模拟支付设计

### 13.1 为什么使用模拟支付

因为本题重点是：

1. 结果门控
2. 状态切换
3. 工程结构

而不是第三方支付接入。

### 13.2 模拟支付行为

`POST /api/pay` 负责：

1. 校验 `sessionId`
2. 更新订阅状态为 `ACTIVE`
3. 写入一条模拟 `PaymentEvent`

### 13.3 页面行为

结果页点击 `Simulate pay callback` 后：

1. 调用 `/api/pay`
2. 支付成功后重新拉取结果
3. 页面切换到解锁态

## 14. 子路径部署兼容方案

### 14.1 约束来源

项目最终部署目标不是根路径，而是：

- `/labs/arkon-challenge`

### 14.2 实现方式

通过：

- `NEXT_PUBLIC_BASE_PATH`
- `next.config.ts` 中 `basePath`

统一控制：

1. 客户端 fetch 路径
2. 跳转路径
3. 页面内 Link
4. 结果页返回路径

### 14.3 已规避的问题

本方案已明确规避以下常见错误：

1. `fetch("/api/...")` 在子路径下误打根路径
2. `window.location.href="/result/..."` 在子路径下跳错
3. `Link` 手动再拼一次 base path 导致双前缀

## 15. 本地开发与测试方案

### 15.1 单元测试

服务层使用 `MemorySessionRepository` 做单元测试。

原因：

1. 更快
2. 不依赖真实数据库
3. 更适合验证服务层规则

### 15.2 浏览器回归

Playwright 覆盖：

1. 首次访问
2. 分步填写
3. 非法输入提示
4. 刷新恢复
5. 提交跳转
6. 免费态结果
7. 支付解锁

### 15.3 全量本地回归

补充 `selfcheck:full` 脚本，完成 `T001-T060` 的全量本地验证。

## 16. 部署方案

### 16.1 部署位置

部署在既有 Ubuntu 主机的独立目录：

- `/opt/apps/arkon-fullstack-challenge`

### 16.2 运行方式

使用独立 Docker Compose 项目运行：

1. 独立应用容器
2. 独立 Postgres 容器
3. 独立本地端口

### 16.3 反向代理

在既有 Nginx 站点中增加一个子路径 `location`：

- `/labs/arkon-challenge`

好处：

1. 不影响现有主站根路径结构
2. 清理成本低
3. 风险隔离更清楚

## 17. 清理与回收设计

本方案刻意保持清理简单。

清理目标只包括：

1. 一个应用目录
2. 一个 compose 项目
3. 一个本地端口
4. 一个 nginx 子路径配置
5. 一个数据库 volume

这样即使项目后续下线，也不会影响主站主体结构。

## 18. 风险与应对

### 18.1 子路径兼容风险

风险：

- 页面在本地正常，部署到子路径后请求和跳转异常

应对：

- 所有客户端路径统一走 base path
- Playwright 本地回归使用子路径地址执行

### 18.2 分步保存与提交不一致风险

风险：

- 用户看似填写完成，但服务端提交缺少最后一步数据

应对：

- 提交前补保存第四步
- 单元测试和浏览器测试双重覆盖

### 18.3 错误提示粗糙风险

风险：

- 原始 schema 输出直接暴露在页面，影响交付观感

应对：

- 前端做分步友好校验
- 服务端返回 `fieldErrors`

### 18.4 演示链路不稳定风险

风险：

- 靠手工点能通，但自动化不稳定

应对：

- 保持状态流简单
- 通过 Playwright 和全量本地自测持续约束

## 19. 结论

本方案采用 `Next.js 单体应用 + Prisma/Postgres + 分层服务 + 子路径兼容 + Playwright 回归` 的实现路线，目的是在最小系统规模下，完成一个交付质量明确、链路完整、状态稳定、可本地证明的全栈 Demo。

它不是一个大而全的产品方案，但足够支撑面试交付中最关键的问题：

1. 你是否能把一个小产品做完整
2. 你是否考虑了恢复、校验、门控和部署边界
3. 你是否用工程化方式证明它已经被验证过
