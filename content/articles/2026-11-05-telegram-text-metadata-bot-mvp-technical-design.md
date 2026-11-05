---
title: "Telegram 影片文本元数据 Bot：MVP 技术方案"
date: "2026-11-05"
summary: "Node.js、grammY 与 PostgreSQL 的影片文本查询架构，真实 JavInfo 契约、持久化收件箱、部署备份与验收边界。"
category: "personal-projects"
published: true
---

# Telegram 影片文本元数据 Bot：MVP 技术方案

对应 PRD：[MVP 产品需求文档](./2026-11-05-telegram-text-metadata-bot-mvp-prd.md)

版本：v0.2（博客发布版）。日期：2026-11-05。

> 发布说明：本版对照首次上线实现更新。设计要求、实际实现和待验收项分别说明；健康检查、自动化测试和少量真实 API 调用不能替代全部用户流程验收。

本文描述首版实现、部署、测试和接入验证方案。产品只返回影片文本元数据，不提供视频、预览流、磁力、torrent、下载地址或其他媒体访问能力。JavInfo 是首版唯一数据来源；其搜索、详情和账户接口已按当前文档及低额度真实调用核对，结果见第 5 节；筛选效果和来源展示条款仍需继续验证。

## 1. 技术选型与取舍

| 部分 | 方案 | 原因与边界 |
| --- | --- | --- |
| 应用 | Node.js 24、TypeScript、pnpm 10.32.1 | 与 Job Bot 保持一致，统一运行时和依赖管理 |
| Telegram | grammY、Webhook | 复用成熟客户端和现有 HTTPS 域名，避免轮询冲突 |
| HTTP | Fastify | 只提供健康检查和精确 webhook 路由 |
| 数据 | PostgreSQL 17、Prisma 7、pg adapter | 与现有服务器和 Job Bot 基线一致；保存用户偏好及短期查询状态 |
| 调度 | 应用内过期清理循环 | 没有订阅、同步和发送任务，不引入 Redis 或独立 worker |
| 上游 | JavInfo Provider Adapter | 首版只实现一个 provider；隔离供应商字段，不提前做多源聚合 |
| 部署 | Docker Compose、Nginx、GitHub Actions | 沿用现有可回滚、可复制的发布方式 |
| 备份 | 本项目独立数据库逻辑备份 | 用户语言、年龄确认和短期状态仍属于项目数据 |

一个常驻进程处理 webhook、Telegram 交互、JavInfo 请求和状态清理。数据库连接池上限 3，其中一个连接持有应用实例锁；不启动第二个常驻 worker。由于结果不作为历史资料库保存，首版不引入搜索引擎、对象存储、Redis 或独立缓存服务。

## 2. 资源与部署边界

应用部署到现有 Ubuntu-3，不新增服务器。使用独立 Compose project，宿主机只监听 `127.0.0.1:3051`，容器监听 3000，由现有 Nginx 精确转发 webhook 路径。

应用容器初始限制沿用 Job Bot 的小实例预算：192 MiB、0.5 CPU，V8 heap 96 MiB；迁移任务单独限制 192 MiB。上线后观察 JavInfo 响应大小、Telegram 消息长度、内存、重启和 OOM，再调整资源。健康检查通过不能代替真实双语查询验收。

数据库与现有 PostgreSQL 共用进程、网络及物理卷，独立使用：

- 数据库：`telegram_metadata`；
- 迁移账号：`telegram_metadata_owner`，拥有本库对象；
- 运行账号：`telegram_metadata_app`，仅应用表读写权限；
- 项目目录：`/opt/apps/telegram-metadata`；
- 独立 Compose project、配置文件、备份目录和部署镜像标签。

共享 PostgreSQL 是生命周期依赖。停止或下线本项目时不能删除仍被其他项目使用的数据库容器、网络和卷；迁出时只导出本项目数据库。

## 3. 仓库结构与配置

```text
src/
  main.ts              启动、实例锁、清理循环与安全退出
  http.ts              健康检查、secret 校验、持久化 webhook
  inbox.ts             收件箱顺序消费与重启恢复
  commands.ts          普通/管理员命令菜单注册
  config.ts            环境配置校验
  db.ts                连接池、目标库校验、实例锁
  bot.ts               命令、交互、会话和管理员路由
  ui.ts                列表、详情、筛选和按钮
  i18n.ts              中文/日文字典
  provider.ts          JavInfo 请求、响应校验与字段映射
  query.ts             查询分类、筛选值及范围校验
  content-policy.ts    文本与媒体访问边界
prisma/
  schema.prisma
  migrations/
infra/
  compose.yml
  compose.local.yml
  nginx-location.conf
scripts/
  deploy.sh
  backup.sh
  render-env.py
tests/
  *.test.ts
  integration/
docs/
  operations.md
  source.md
```

生产凭据保存在 GitHub Actions Secrets，通过发布流程注入服务器运行环境文件；运行文件权限为 600，不提交到 Git 或镜像。至少包含：`DATABASE_URL`、`EXPECTED_DATABASE`、`BOT_TOKEN`、`WEBHOOK_SECRET`、`WEBHOOK_URL`、`JAVINFO_API_KEY`、`JAVINFO_BASE_URL`、`ADMIN_TELEGRAM_ID`、`DATABASE_POOL_MAX`、`QUERY_SESSION_TTL_SECONDS` 和 `PORT`。

`JAVINFO_BASE_URL`、路径、分页参数和 `num` 等调用参数不能散落在业务代码中。只有 `provider.ts` 读取供应商配置，其他模块依赖内部 Provider 接口。

## 4. 数据模型与留存

首版不保存影片历史存量。数据库只保存用户资料、短期查询状态和最低限度的运维记录：

### 4.1 User

- `id`：内部 CUID；
- `telegramUserId`：唯一 Telegram 数字用户 ID；
- `chatId`：当前私聊 ID；
- `language`：`zh` 或 `ja`；
- `ageConfirmedAt`：首次确认时间，可被 `/privacy` 清除；
- `createdAt`、`updatedAt`、`lastSeenAt`。

不保存用户头像、用户名历史或完整聊天内容。管理员通过环境变量数字 ID 判断，不在 User 表中额外复制权限标记。

### 4.2 QuerySession

- `id`：不可预测的短期会话 ID；
- `userId`；
- `stateVersion`：防止旧按钮覆盖新流程；
- `queryText`：经过长度限制的原始查询文本；
- `queryKind`：`code` 或 `keyword`；
- `filtersJson`：分别保存 `applied` 与 `draft`，仅允许已校验的筛选值；
- `pageToken`：供应商游标或页码；
- `pageNumber`；
- `itemsJson`：当前页已归一化的文本摘要和 provider ID，不保存完整原始响应；
- `expiresAt`、`createdAt`、`updatedAt`。

详情按钮只携带 QuerySession ID、stateVersion 和条目索引。点击时从服务端读取 provider ID，再按需请求详情，不把完整条件、API Key 或来源响应塞入 callback data。

### 4.3 ProviderCall

只记录最低限度的内部诊断：provider、操作类型、HTTP 状态类别、耗时、错误类型、请求关联 ID、创建时间。禁止保存完整 URL、API Key、完整查询文本、完整响应和媒体字段。设计保留 30 天后清理；如果实际计费争议需要更长留存，另行修改 PRD 和隐私说明。当前只建立了表结构，调用记录写入与 30 天清理尚未接入，不能据此声称已有完整上游诊断。

### 4.4 TelegramUpdate 持久化收件箱

`updateId` 为主键，保存可空 `payload`、`state`、`createdAt`。Webhook 将更新以 `queued` 状态去重写入，提交后立即确认。应用内单个消费者按 update ID 全局顺序取出，标记 `processing`，完成后标记 `done` 或 `failed` 并清除正文。

重启时保留尚未认领的 queued 更新继续执行；原 processing 更新标记为 interrupted，清除正文且不自动重放，因为上游请求可能已经计费。该方案减少重复执行，不保证 Telegram 发消息或供应商调用严格恰好一次。处理后的去重记录保留七天；queued 正文不会随该清理任务自动删除，积压需运维关注。

### 4.5 清理策略

查询会话默认 TTL 为 30 分钟；用户语言与年龄确认随用户资料长期保留。当前每 10 分钟清理过期会话及七天前非 queued 收件箱记录；尚未实现有限批次删除，数据量增长时需补齐。ProviderCall 30 天留存属于待接入设计。数据库索引覆盖 `expiresAt` 和 `createdAt`，避免全表扫描。

## 5. JavInfo Provider Adapter

### 5.1 内部接口

```ts
interface MetadataProvider {
  search(input: SearchInput): Promise<SearchPage>;
  detail(providerId: string): Promise<MetadataDetail | null>;
  accountStatus(): Promise<AccountStatus>;
}
```

`SearchInput` 只允许产品支持的字段：查询文本、查询类型、演员、制作方/厂牌、系列、日期范围、时长范围、版本标记、排序、页码/游标和结果数量。未被 JavInfo 支持的字段不能静默发送或伪装成已生效。

### 5.2 查询分流

查询文本先去除首尾空白并限制长度。符合已定义影片编号格式时设置 `queryKind=code`，其他文本设置 `queryKind=keyword`。当前二者均使用 `POST /query` 的 `q` 搜索；打开详情时使用准确 `dvdId` 调用 `POST /movie`，不能把查询分类理解为两条已实现搜索路径。格式判断放在 `query.ts`，供应商参数转换放在 `provider.ts`。

不做自动翻译、错别字纠正、语义扩展或供应商间别名归一化。所有动态文本在 UI 层统一转义后使用 Telegram HTML 格式。

### 5.3 响应映射

JavInfo 原始响应先经过 schema 校验，再映射为内部结构：

- `providerId`、`code`、`title`、`releaseDate`、`durationMinutes`；
- `actors`、`maker`、`label`、`series`、`director`、`genres`；
- 可选 `sourceUrl`；
- 不允许媒体字段进入内部结构。

映射函数只保留显式白名单，拒绝或丢弃 `sampleUrl`、`gallery*`、视频地址、`.m3u8`、磁力、torrent、下载链接及同类字段。字段缺失返回 `undefined`，不使用猜测值。日期和时长按来源语义校验，不因解析失败伪造日期。

### 5.4 请求、限速和错误

每次上游调用设置连接和总超时，默认总等待不超过 20 秒。HTTP 429 读取 `Retry-After`（若有），当前用户请求直接返回限速提示，不在请求线程中无限重试。余额不足、鉴权失败、上游 5xx、响应校验失败和网络超时映射为内部错误类型。

首版不自动切换来源、不实现后台重试队列，不把 HTTP 200 空数组当作异常。当前不自动重试可计费请求；后续改变策略前必须评估重复计费。

### 5.5 已核验的供应商契约

依据 [JavInfo 文档](https://docs.javinfo.dev/) 与 2026-11-05 受控真实调用：

| 接口 | 请求与响应 | 计费及边界 |
| --- | --- | --- |
| 基础配置 | `https://api.javinfo.dev`；鉴权头 `x-javinfo-key` | 凭据不出现在文档、按钮或日志 |
| `POST /query` | `{ q, num, page, filter?, sort? }`；`results[]`、`count`、`total` | Bot 固定每页 5 条；文档 num 范围 1–50，1–10 档每次 $0.0004 |
| `POST /movie` | `{ q: exactDvdId }`；返回 `{ result: ... }` | 每次 $0.0008；404 作为详情缺失 |
| `GET /profile` | `balance`、`hasPaid`、`rpm` | 免费，仅管理员入口使用 |

搜索条目的 `id` 和 `dvdId` 不能混用；详情请求选用 `dvdId`。列表可能将时长、制作方、演员等文本放在 `extra`；详情常见 `titleEn`、`titleJa`、`runtimeMins`、`makers[]`、`directors[]`、`categories[]`、`actresses[]`。适配器分别校验和归一化，不假设两类响应同构。

`filter` 与 `sort` 是顶层并列参数。筛选包含演员、制作方、厂牌、系列、发行起止和时长范围；版本标记尚无可靠映射，不开放。日期校验真实日历日期与前后范围，时长校验有限数值和最短/最长关系。筛选草稿编辑、返回、重置不调用供应商；应用后从第一页查询。

文档定义 401 鉴权失败、402 余额不足、429 限速、503 来源不可用，并说明成功 HTTP 200 计费。实际完成搜索、详情、账户少量真实调用；没有主动触发所有异常，也未完成多组真实筛选排序效果验收。来源链接条款未核验前不展示 URL。验证记录保存在项目 `docs/source.md`，不保存原始响应或密钥。

## 6. Telegram 交互与会话一致性

### 6.1 Webhook 接收

Fastify 只开放精确 webhook 路径和 `/healthz`、`/readyz`。Webhook 使用恒定时间比较校验 Telegram secret header，限制请求体，校验 update ID，以主键去重写入收件箱；数据库提交后立即返回 200，数据库失败返回 503，允许 Telegram 重试。私聊和用户权限在消费阶段校验。

单个应用内消费者顺序执行更新，详情等异步返回仍检查会话版本。该策略控制低资源实例的并发和重复计费，但慢上游会阻塞后续用户操作；不是多用户并行处理方案。后续若扩大规模，需要按聊天分区并保持每个聊天的顺序及计费保护。

### 6.2 首次进入和年龄确认

`/start` 创建或恢复 User，选择语言，展示内容边界。没有 `ageConfirmedAt` 时只显示中文或日文年龄确认页面。确认按钮写入时间；拒绝或取消不写入，查询入口保持关闭。`/privacy` 展示隐私和内容边界，并可清除确认时间。

年龄确认是产品门槛，不是法律资格判断。服务端在每次查询、详情和筛选应用前再次检查确认状态，不能只依赖界面按钮隐藏。

### 6.3 结果和详情

结果页由 `ui.ts` 根据当前语言渲染，默认 5 条。页面保存当前条件、筛选、页码、游标和归一化摘要。详情按钮验证：发送者 Telegram ID、会话未过期、stateVersion、条目索引均匹配后，按 provider ID 请求详情。

上一页/下一页使用短 callback data；完整条件留在 QuerySession。详情返回原会话页，不承诺客户端滚动位置。新文本输入创建新 stateVersion；取消使旧会话失效但不删除用户资料。

### 6.4 双语文案

所有固定文案使用类型安全的 `zh`/`ja` 字典，禁止在业务分支中散落硬编码。上游标题、演员和制作方名称保留原文；日期、字段标签、错误提示和按钮按语言字典渲染。每个动态值先转义，按钮文本不使用 HTML。

## 7. 命令与管理员状态

实现 `/start`、`/help`、`/language`、`/cancel`、`/privacy` 和管理员 `/status`。Bot 命令菜单对普通用户不展示 `/status`，但处理函数仍检查：私聊、发送者 ID 等于 `ADMIN_TELEGRAM_ID`。

`/status` 顺序读取 JavInfo 账户状态接口，返回查询时间、连通性、余额、充值/可用状态和限速（供应商提供时）。不得读取或显示 API Key。普通用户不能通过按钮、伪造 callback 或直接消息读取这些字段。状态失败显示当前语言的失败提示，不返回旧余额。

## 8. 安全与内容边界

- API Key、Bot Token、数据库 URL 只通过受保护环境注入；
- callback data 不放完整查询文本、用户标识或凭据；
- 用户只能读取自己的 QuerySession；
- Telegram HTML 动态内容统一转义；
- 来源响应采用显式字段白名单，媒体字段在映射层拒绝；
- 日志去除 URL 查询参数、凭据模式、完整用户输入和媒体地址；
- 不做代理下载、不抓取来源站、不保存封面和视频二进制；
- 不在群聊处理查询，避免公开扩散查询内容。

## 9. 本地开发、测试与 CI

1. 使用 Node.js 24、pnpm 10.32.1，初始化独立仓库和 `.env.example`。
2. 使用 `docker compose -f infra/compose.local.yml up -d` 启动独立 PostgreSQL 17。
3. 测试数据库名必须以 `_test` 结尾，测试不得连接生产数据库。
4. 执行 `pnpm db:generate`、`pnpm db:migrate`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
5. CI 使用临时 PostgreSQL 验证迁移、类型检查、测试和 Docker build。
6. 测试覆盖影片编号/关键词分流、字段白名单、媒体字段剔除、中文/日文文案、年龄确认、语言切换、短期会话过期、分页、详情返回、旧按钮、跨用户按钮、429、余额不足、超时、HTTP 200 空结果和管理员权限。
7. 真实 API 测试使用受控低额度凭据，不把生产 API Key 放入 CI；没有可用凭据时使用固定脱敏 fixture，并把真实接入验收作为发布前步骤。

## 10. 发布与部署

沿用 Job Bot 的发布模板：

1. GitHub Actions 执行迁移、类型检查、测试、构建和 Docker build。
2. 镜像使用完整 commit SHA 标签，上传归档和 SHA256。
3. 服务器核对归档后 `docker load`，执行项目自己的 `deploy.sh`。
4. 发布前备份 `telegram_metadata` 数据库，核对目标数据库名称。
5. migration 使用 owner 账号，应用使用 app 账号；迁移后校验运行权限。
6. 更新 `release.env`，只重建本项目 app，不触碰共享 PostgreSQL 和其他 Compose project。
7. `/readyz` 通过后发布成功；保留当前和上一版本镜像，清理更早的本项目 SHA 镜像。
8. 发布失败不自动回滚数据库迁移；代码回滚前确认 schema 兼容性。

Webhook 使用现有 TLS 域名下的精确路径，例如 `/bots/telegram-metadata/webhook`，不得覆盖 Job Bot、博客或其他路径。注册 webhook 时校验 secret、pending updates 和 Telegram 错误。

## 11. 备份、恢复与下线

备份只导出本项目数据库，custom 格式、no-owner，写临时文件后校验非空及 `pg_restore --list`，再原子发布。默认保留 14 天，并遵循现有服务器异地拉取策略。

恢复先停止 webhook 写入和应用，恢复到临时数据库进行 schema、表数、用户和未过期会话核对，再切换生产连接。年龄确认和语言偏好属于用户数据，不能因“查询状态短期”而跳过备份。

下线时删除本项目 webhook、应用容器、项目镜像和项目备份；保留共享 PostgreSQL、网络和卷。删除数据库、角色和异地备份属于单独的不可逆操作，不随普通下线执行。

## 12. 运维与验收

设计中的 `doctor` 诊断入口尚未实现；当前通过健康接口、管理员 `/status`、容器状态和受控数据库检查运维。ProviderCall 写入及最近上游成功/失败聚合仍待补齐，不能将其列为已有能力。容器日志限制大小和文件数量，启动失败只记录错误类型，避免敏感内容进入日志。

首轮上线验收：

1. 使用中文用户完成年龄确认、影片编号查询、关键词查询、筛选、翻页、详情和返回。
2. 使用日文用户完成同一流程，检查所有固定文案、日期和按钮布局。
3. 验证未确认用户、清除确认后的用户不能查询。
4. 验证上游空结果、429、余额不足、5xx、超时和畸形字段的用户提示。
5. 验证详情和列表中没有视频、预览流、磁力、torrent 或下载地址。
6. 验证普通用户无法调用 `/status`，管理员可看到实时账户状态。
7. 验证旧按钮、跨用户按钮、过期会话不会执行请求。
8. 验证 `/readyz`、Webhook secret、数据库权限、备份和回滚文件。
9. 观察至少一轮真实低额度调用的计费、限速和响应字段，再决定是否开放更多筛选字段。

### 12.1 首次上线核验记录

发布基线为 `94ba98b8d96a546c358f69757bb737c914e9c57a`。GitHub Actions 完成迁移、类型检查、测试、构建与 Docker 发布。16 个单元测试和 1 个 PostgreSQL 集成测试通过；集成测试的 Telegram 与供应商均为模拟接口，不能代替真实双语端到端验收。

已经核验：

- 应用健康，Webhook 地址匹配、无 pending updates 或 Telegram 错误；公网缺少 secret 的请求返回 403；
- 管理员尚未主动打开新 Bot 私聊时，专属菜单注册可延后，避免 Telegram 400 导致整个服务无法启动；管理员 `/start` 后重设菜单；
- 用户真实 `/start` 与年龄确认已到达服务；生产受控调用完成搜索、详情、免费账户读取；
- 运行账号可读写应用表，不能创建 schema 对象或写迁移历史；
- custom 格式备份经 `pg_restore --list` 及临时库恢复校验；该恢复样本为首次部署空库与三条迁移，尚非有真实业务数据的恢复演练；
- 初始观察中应用约占用 70 MiB / 192 MiB，无重启或 OOM；仅代表当时小流量样本；
- 每日备份计划为 UTC 03:35 并附带最多 10 分钟随机延迟，保留 14 天；本机每小时尝试拉取并校验 SHA256，仅在电脑唤醒且联网时执行。

仍需继续完成中文/日文真实客户端完整链路、真实筛选排序与长期成本观察，以及 ProviderCall、资料清除、诊断入口等明确列出的缺项。部署成功和测试通过不等同于所有产品要求已验收。
