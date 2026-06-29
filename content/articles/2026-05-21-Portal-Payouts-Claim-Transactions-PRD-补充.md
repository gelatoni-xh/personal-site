---
title: "2026-05-21-Portal-Payouts-Claim-Transactions-PRD-补充"
date: "2026-05-21"
category: "StablePay"
tags: []
published: true
---

# Portal Payouts / Claim / Transactions PRD 补充

版本：v2\.0｜日期：2026\-05\-21｜范围：StablePay Portal Payouts / Claim / Transactions

|**本版更新摘要**<br>本版本根据最新 Figma Clean v2 原型更新：统一 StablePay Account 命名；Payout 主状态改为 paid / pending / in\_transit / canceled / failed；未注册 recipient 增加系统生成 claim code；安全校验使用 StablePay Portal account password；新增 claim poster、claim 错误态、transactions 账务流水页面。|
|---|



# 1\. 背景与目标

StablePay Portal 需要支持商户通过邮箱向 StablePay Account 发送稳定币。该能力区别于外部钱包地址出款：它不涉及链上 network、network fee 或 recipient wallet address。对于未注册 recipient，sender 可以先创建一笔待领取 payout，系统冻结 sender 的 source account 余额，并通过邮件、claim link 或 claim poster 引导 recipient 注册并领取。

## 1\.1 产品目标

- 支持 sender 通过 recipient email 向 StablePay Account 发送 USDC / USDT。

- 已注册且可收款 recipient：完成 sender 安全校验后，内部转账快速完成。

- 未注册 recipient：允许 sender 创建 payout，冻结资金，生成 claim link、claim poster 和系统 claim code。

- 通过 claim code \+ email OTP 降低邮件转发、误填邮箱导致错误领取的风险。

- 在 Payouts list 中只展示 Payout 主状态，不展示 claim status。

- 新增 Transactions 页面，解释 sender available / held balance、recipient credit、release 等账务记录。

## 1\.2 非目标

- 不设计返佣比例、奖励结算周期、代理商结算规则。当前仅保留 referral tracking 能力提示。

- 不改变外部 wallet address payout 的核心出款能力，仅在入口说明支持 batch。

- 不支持 recipient 通过链接直接领取到外部钱包。

- 不在本 PRD 重新设计 forgot password 流程，安全校验页仅提供入口。

- 不在 Payouts list 展示 claim status、invitation status 或账务流水明细。

# 2\. 术语与对象

|**术语 / 对象**|**定义**|
|---|---|
|StablePay Account|统一文案。用于统一指代商户侧内部稳定币账户。一个 StablePay Account 只绑定一个币种。|
|Source account|Sender 发起 payout 时选择的资金账户。账户本身决定 payout currency。|
|Payout|付款对象。主状态仅包括 paid、pending、in\_transit、canceled、failed。|
|Claim / Invitation|未注册 recipient 的领取对象。记录 claim link、claim poster、claim code、email OTP 验证与领取过程。|
|Claim code|系统在未注册 payout 创建成功后生成的 6 位数字码。Sender 需在邮件外单独分享给 recipient。|
|Held balance|为 pending claim payout 冻结的 sender 资金。取消、失败或过期时释放回 available balance。|
|Transactions|账务流水记录。展示 hold、debit、credit、release 等 balance\-affecting entries。|

# Figma 原型范围

Figma 文件：Payouts 模块 Clean v2。核心 frame 包括：

|**区域**|**Frame**|
|---|---|
|Payouts list|Clean v2 / 00 Payouts list，以及 00A\-00J 搜索、筛选、分页状态|
|Create payout|Clean v2 / 01\-06A，包括 select type、empty form、recipient lookup、review、pending claim success、share claim poster|
|Registered flow|Clean v2 / 07\-08，已注册 recipient review / success|
|Edge states|Clean v2 / 09\-15，amount over limit、cannot receive、pending/expired/canceled/succeeded detail、open invitation link|
|Claim flow|Claim v2 / 01\-05，包括 email、claim pending、validation error、registration、failed/succeeded、dashboard credited|
|Transactions|Clean v2 / 16 Transactions|
|Modals|Security verification、cancel payout、copy link/code、resend email、leave create payout|

# 4\. 入口与导航

## 4\.1 Payouts list

Payouts list 用于查看 Payout 对象，不展示 claim status。页面需要支持搜索、筛选和分页。

|**字段**|**说明**|
|---|---|
|Payout ID|展示单笔或批量 payout ID。|
|Recipient|StablePay Account payout 展示公司脱敏名或 recipient email；wallet payout 展示 wallet address 或 recipient count。|
|Type|仅两种：StablePay Account、Wallet address。|
|Amount|展示金额和币种，例如 500\.00 USDC。|
|Status|展示 Payout\.status：paid、pending、in\_transit、canceled、failed。|
|Status date|展示 Created / ETA / Paid / Canceled / Failed 等对应时间。|
|Actions|View。Pending claim payout 可在详情页提供 poster/link/resend/cancel。|

### 4\.1\.1 搜索、筛选与分页

- 搜索支持 payout ID、recipient email、公司名、wallet address。

- Status filter：All status、paid、pending、in\_transit、canceled、failed。

- Type filter：All payout types、StablePay Account、Wallet address。

- 列表底部提供 rows per page、结果区间、页码、上一页/下一页。

## 4\.2 Create payout type

点击 Create payout 后，展示两个未默认选中的选项。标题使用商户更容易理解的文案，例如 “How would you like to send funds?”。

|**选项**|**文案**|**说明**|
|---|---|---|
|Send to wallet address|Send stablecoins to an external crypto wallet\. Batch payouts are supported\.|进入外部钱包地址出款流程。|
|Send to StablePay Account|Send stablecoins by email\. Free when the recipient receives funds through a StablePay Account\.|带 Free badge。弱提示 referral tracking may apply。|

# Create Payout 表单规则

## 5\.1 Source account 与币种

|**核心规则**<br>StablePay 内部系统为一个 StablePay Account 绑定一个币种。因此 create payout 时不单独选择 payout currency，payout amount 后缀随 source account 显示，例如 “500\.00  USDC”。Change account 页面展示各账户名称、币种和 available balance。|
|---|



|**规则**|**说明**|
|---|---|
|账户币种|Source account 决定币种。示例：Operating Account \- USDC。|
|Amount 输入|输入框右侧固定展示当前账户币种 suffix，例如 USDC。|
|Network|StablePay Account 内部 payout 不涉及 network 选择、链上转账或 network fee。|
|Reserve balance|Create payout 流程不展示 reserve balance。|
|Change account|用户可切换 source account；切换后 amount currency 自动随账户变化。|

## 5\.2 表单字段

|**字段**|**要求**|
|---|---|
|Recipient email|必填；合法 email 后触发 lookup。|
|Source account|必填；默认 Operating Account \- USDC；可切换。|
|Amount|必填；金额后显示账户币种；不能超过 available balance；未注册 recipient 单笔限额 1,000 USD equivalent。|
|Memo optional|可选；需要在 review、detail、email、claim 页面中体现。|
|Fee|StablePay Account payout 显示 Free；标准外部 payout fee 可作为对比信息展示。|

# Recipient Lookup 状态

|**状态**|**条件**|**页面展示 / 处理**|
|---|---|---|
|A\. Account found|Email 已绑定且可收款 StablePay Account。|展示 “StablePay Account found”。不展示完整邮箱作为识别结果；展示脱敏公司名，例如 A\*\*\* T\*\*\*\*\* Ltd\.。可进入 review。|
|B\. Not registered|Email 未注册 StablePay Account。|展示 “Recipient is not registered yet”。说明将保留 payout、邮件邀请、需要 email verification \+ claim code。可进入 review。|
|C\. Cannot receive|Email 已有关联账户但 Business/合规/风控/地区/冻结状态不可收款。|阻止创建 payout。展示 “This recipient cannot receive payouts yet\.”，可 Notify recipient 或 Cancel。|

# Review 与安全校验

## 7\.1 Review unregistered payout

- Recipient email 在 review 页面完整展示，避免 sender 最后确认时看不到自己输入的邮箱。

- Limit 不在 review 作为主要提示展示；超过 1,000 USD equivalent 应在上一步金额输入阶段阻断。

- 右侧展示 invitation email preview，更直观地呈现 recipient 会收到什么。

- Claim code 提示只说明系统将在创建后生成，并需要 sender 在邮件外单独分享。

## 7\.2 Security verification modal

Confirm payout 时，registered 与 unregistered recipient 都需要 sender 安全校验。交互使用弹窗，不跳转到独立页面。

|**字段 / 控件**|**说明**|
|---|---|
|StablePay Portal account password|使用用户登录 StablePay Portal 的账户密码，不存在单独资金密码。|
|Forgot password?|提供入口，沿用既有忘记密码流程；本 PRD 不展开。|
|Email verification code|发送至 sender 登录邮箱或绑定安全邮箱。|
|Confirm|校验通过后创建/提交 payout。|
|Cancel|关闭弹窗，返回 review。|

# 8\. 未注册 Recipient Payout 规则

## 8\.1 创建成功后的 sender 页面

- 成功页标题：Invitation sent / Waiting for recipient to register and claim。

- 展示 amount、recipient、expiry。

- 主操作：Create poster。

- 次级操作：Resend email、Copy claim link、Cancel payout。

- 单独展示 claim code，例如 482913，并提供 Copy code。

## 8\.2 Claim code

|**规则**|**说明**|
|---|---|
|生成方式|系统在 payout 创建成功后生成 6 位数字 claim code。|
|分享方式|Sender 单独分享给 recipient，不放在 invitation email、claim link 或 QR code 中。|
|领取校验|Recipient 必须同时通过指定邮箱 OTP \+ claim code 才能继续注册/领取。|
|错误处理|Claim 页面展示 “Claim code is incorrect\. Ask the sender to share the latest code\.”|
|安全价值|降低 sender 误填邮箱或邮件被转发导致错误领取的风险。|

## 8\.3 Share claim poster

- Poster 用于微信、WhatsApp、Telegram、直接聊天等场景。

- Poster 上 recipient email 必须脱敏，例如 n\*\*\*\*\*\*\*@example\.com。

- Poster 只适用于特定 payout 和特定 email，不是开放邀请链接。

- 如果 sender 想直接分享开放注册链接，应使用顶部导航中的 Invite link / open invitation link。

# Claim Flow

## 9\.1 Email invitation

邮件内容要尽量简单，避免复杂布局在邮箱客户端展示失败。邮件中不包含 claim code。

|**邮件元素**|**内容**|
|---|---|
|Subject|Apex Trading Ltd\. sent you 500 USDC via StablePay|
|Body|Apex Trading Ltd\. sent you 500 USDC\. Claim before May 16, 2026\. Use this email to create or access a StablePay Account\.|
|CTA|Claim stablecoins|
|Memo|如果 sender 填写 memo，邮件中展示简短 memo。|
|Security note|You will need to verify this email and enter the claim code shared by the sender\.|

## 9\.2 Claim pending page

- 标题：Verify email to claim。

- 展示 amount、sender、脱敏 recipient email。

- 脱敏邮箱和 Send code 按钮在同一块区域。

- OTP helper 简短说明：Enter the 6\-digit code sent to n\*\*\*\*\*\*\*@example\.com。

- Claim code helper 简短说明：The sender shares this 6\-digit code separately\. It is not in the email or link。

- Email OTP 或 claim code 错误时，页面展示局部错误态，不进入复杂异常流程。

- 验证通过后跳转既有 StablePay Account 注册流程；注册完成后进入 Portal dashboard，看到资金到账/可提现。

# 10\. 状态机

## 10\.1 Payout\.status

|**状态**|**含义**|**可见位置**|
|---|---|---|
|pending|Payout 正在处理中；未注册场景中可能对应等待 recipient claim 的业务阶段，但列表不展示 claim status。|Payout list / detail|
|in\_transit|Payout 正在支付或银行/内部处理链路中传输。|Payout list / detail|
|paid|Payout 支付已完成。|Payout list / detail|
|canceled|Sender 主动取消，或系统取消。|Payout list / detail|
|failed|系统处理失败或风控/合规失败。|Payout list / detail|

## 10\.2 Claim / Invitation status

|**状态**|**含义**||
|---|---|---|
|pending|Invitation 已发送，等待 recipient 验证邮箱、输入 claim code、注册并领取。||
|verified|Recipient 已通过 email OTP 与 claim code，进入注册/登录流程。||
|claimed|Recipient 已完成 claim，系统后续推动 payout paid。||
|expired|超过有效期，claim link / poster 失效。||
|canceled|Sender 在 claim 前取消。||
|failed|Claim 过程失败或转人工审核。||
|**展示原则**<br>Payouts list 只展示 Payout\.status。Claim / Invitation status 仅在 payout detail、claim 页面或内部运营工具中展示，避免商户在列表里混淆 pending 的含义。|||



# 11\. 资金与 Transactions

## 11\.1 资金处理规则

|**场景**|**Sender available**|**Sender held**|**Recipient balance**|
|---|---|---|---|
|Create pending claim payout|\- amount|\+ amount|无变化|
|Payout paid|无变化|\- amount|\+ amount|
|Payout canceled|\+ amount|\- amount|无变化|
|Payout failed|\+ amount|\- amount|无变化|
|Payout expired|\+ amount|\- amount|无变化|

## 11\.2 Transactions 页面

Transactions 页面展示 balance\-affecting accounting entries，而不是事件日志。Email sent、poster copied 等非账务事件不进入 Transactions。

|**Transaction type**|**说明**|**示例**|
|---|---|---|
|hold|创建 pending claim payout 后，资金从 available 转入 held。|Available \-500 / Held \+500|
|debit|Payout paid 后，sender held funds 被实际扣减。|Held \-500 / Sender paid|
|credit|Recipient balance 增加。|Recipient \+500|
|release|Canceled / failed / expired 后，held funds 释放回 available。|Held \-500 / Available \+500|

# Detail 页面与操作

|**页面 / 状态**|**关键展示与操作**|
|---|---|
|Pending claim detail|展示 pending claim 信息、claim code、poster、resend email、copy claim link、cancel payout。Cancel payout 需要确认弹窗，不需要 password 校验。|
|Succeeded payout detail|展示 paid 信息、amount、recipient、source account、memo、timeline。不提供 download receipt。|
|Expired payout detail|展示资金已退回 sender available balance。Claim link 无效。|
|Canceled payout detail|展示 sender 已取消，资金已退回。|
|Open invitation link|用于开放注册邀请，不锁定资金，不指定 email。和 payout poster 区分清楚。|

# 13\. 风控与限制

|**规则**|**建议值 / 说明**|
|---|---|
|未注册 recipient 单笔限额|1,000 USD equivalent。超过时在 amount 步骤阻断。|
|默认过期时间|7 days。过期后自动 release held funds。|
|最大过期时间|v1 不开放给 sender 修改；后台可配置 max 14 days。|
|Sender 每日未注册 payout 数量|建议 10 笔。|
|Recipient email 每日邀请次数|建议 3 次。|
|Resend email 间隔|建议 10 分钟。|
|OTP 尝试次数|建议 5 次。|
|Claim code 尝试次数|超过阈值进入风控或人工审核。|
|接近限额 / 短时间大量邀请|进入 pending review 或人工审核。|

# 14\. 通知模板

|**触发**|**收件人**|**内容摘要**|
|---|---|---|
|Invitation email|Recipient|Sender sent you \{amount\} \{asset\}\. Claim before \{expiry\}\. Verify this email and enter the claim code shared by sender\.|
|Payout invitation sent|Sender|Recipient、amount、claim before、claim code、可取消提示。|
|Payout claimed / paid|Sender|Recipient、amount、status paid。|
|Payout expired|Sender|Locked amount has been returned to available balance。|
|Payout canceled|Recipient optional|The payout invitation from \{sender\_name\} has been canceled。|

# 15\. 后端与数据要求

## 15\.1 查询与校验

- Recipient lookup API 需要返回 found / not\_registered / cannot\_receive，以及 privacy\-safe display name。

- Create payout API 必须校验 source account ownership、currency、available balance、recipient limit、risk rules。

- Security verification API 使用 StablePay Portal account password \+ email OTP。

- Claim API 必须校验 claim token、recipient email OTP、claim code、account eligibility、payout not canceled/failed/expired。

## 15\.2 数据字段建议

|**对象**|**关键字段**|
|---|---|
|Payout|id, sender\_account\_id, recipient\_email, recipient\_account\_id, source\_account\_id, currency, amount, fee, status, type, memo, created\_at, paid\_at, canceled\_at, failed\_at|
|PayoutClaim|id, payout\_id, recipient\_email, claim\_token\_hash, claim\_code\_hash, status, expires\_at, verified\_at, claimed\_at, failed\_attempts|
|Transaction|id, account\_id, payout\_id, type, currency, amount, direction, balance\_bucket, counterparty, created\_at, description|
|Notification|id, payout\_id, template, recipient, channel, status, sent\_at|

# 16\. 验收标准

1. Create payout type 不默认选择，用户必须选择 wallet address 或 StablePay Account。

2. StablePay Account payout 表单不展示 network / network fee；amount 输入框显示 source account currency suffix。

3. Recipient found 状态不暴露完整 business 信息；展示脱敏公司名。

4. Unregistered recipient 可创建 payout；创建后 sender funds 进入 held balance。

5. 未注册 payout 创建成功后生成 claim link、claim poster、claim code；claim code 不在邮件、链接或 poster 中展示。

6. Claim 页面必须先验证指定邮箱 OTP，再输入 sender 分享的 claim code。

7. Payout list 状态仅为 paid、pending、in\_transit、canceled、failed；不展示 claim status。

8. Payout list 支持搜索、status/type 筛选和分页。

9. Cancel pending claim payout 需要确认弹窗，但不需要 StablePay Portal password 校验。

10. Security verification 使用 StablePay Portal account password，提供 Forgot password? 入口。

11. Succeeded payout detail 不提供 download receipt。

12. Transactions 页面只展示影响 balance 的 accounting entries。

# Open Questions

- 未注册 payout 的 claim code 有效期是否与 claim link 完全一致，还是支持单独刷新？

- Recipient 完成注册后，资金是自动 credit 还是需要最后点击 Claim to my StablePay Account？当前交互倾向保留明确 claim 动作。

- Transactions 页面是否需要支持导出 CSV，以及是否展示 recipient\-side credit 给 sender。

- Payout failed 的失败原因展示粒度：是否区分风控、合规、系统失败、余额异常。

