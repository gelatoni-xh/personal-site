---
title: "2026-05-21-Portal-Create-Payout-to-StablePay-Account-PRD-v2.2"
date: "2026-05-21"
category: "StablePay"
published: true
---

# Portal \- Create Payout to StablePay Account PRD v2\.2

# Portal \- Create Payout to StablePay Account PRD

v2\.2｜Account No 转账 \+ Claim Code 拆分 \+ Payout 主状态更新版

|**本版更新摘要**<br>本版本基于最新 Figma Clean v2 原型更新：StablePay Account 统一命名；新增 8 位 Account No 转账；source account 决定 payout currency；未注册邮箱领取流程拆分为 email OTP / 登录注册 / dashboard pending claim / claim code 验证；Payout 主状态使用 completed，不再使用 paid；批量部分成功通过 Result 展示，不新增主状态。|
|---|

# 1\. 背景

当前 StablePay 商户可以通过 Payouts 向外部 wallet address 发起稳定币出款。为了提升 StablePay Account 之间的资金流转效率，需要支持商户向另一个 StablePay Account 发送 stablecoins。

本能力支持两类 recipient identifier：recipient email 与 8 位 StablePay Account No\.。如果 recipient 已经有可收款 StablePay Account，系统完成内部账户转账；如果 recipient email 未注册，系统允许 sender 先创建待领取 payout，冻结资金，并通过邮件、claim link、poster 与独立 claim code 引导 recipient 注册并领取。

本 PRD 还需要兼容历史 wallet address / batch payout。Portal 的 Payouts list 使用统一 Payout 主对象展示，不直接暴露 claim status、invite status、batch item status 或旧批量执行状态。

# 2\. 产品目标与非目标

## 2\.1 产品目标

- 支持 sender 通过 recipient email 或 8 位 StablePay Account No\. 向 StablePay Account 发送 USDC / USDT。

- Source account 与币种绑定，一个 StablePay Account 只对应一个 currency；payout amount 后缀随 source account currency 展示。

- 已注册且可收款 recipient：免费、即时、内部入账，不涉及 blockchain network 或 network fee。

- 未注册 recipient：允许创建 pending claim payout，冻结 sender 资金，发送邀请，并要求 recipient 完成 email OTP、登录/注册、claim code 验证后领取。

- 降低误填邮箱、邮件转发、链接泄露导致错误领取的风险：claim link 只是入口，claim code 由 sender 在邮件外单独分享。

- Payouts list 仅展示 Payout 主状态；批量部分成功/失败通过 Result 字段和详情页展示。

## 2\.2 非目标

- 不设计返佣比例、佣金结算、代理商结算等规则；仅保留 referral tracking / invite incentive 的弱提示。

- 不改变外部 wallet address payout 的链上执行逻辑；旧 batch / item 状态继续保留在执行层。

- 不支持未注册 recipient 直接领取到外部钱包。

- 不在本 PRD 重画 forgot password 流程；涉及 StablePay Portal account password 的校验页只提供 Forgot password 入口。

- 不在 Payouts list 展示 network、network fee、claim code、claim status、invite status、batch item status 或账务流水。

- Succeeded payout detail 不提供 download receipt 能力。

# 3\. 术语与对象

|**术语**|**说明**|
|---|---|
|StablePay Account|商户在 StablePay 内部的资金账户。每个 account 有独立 8 位 Account No\.，且只绑定一个 currency：USDC 或 USDT。|
|Source account|Sender 创建 payout 时选择的出款账户。Payout currency 由 source account currency 决定。|
|Account No\.|StablePay Account 的 8 位数字编号，例如 00000022。可作为已注册 recipient 的转账识别方式。|
|Recipient identifier|Sender 输入的收款标识。带 @ 或字母按 email 处理；纯数字按 Account No\. 处理。|
|Payout|统一主对象，用于 Portal list、detail、filter、export、webhook 等对外口径。|
|PayoutClaim|未注册邮箱场景的领取对象，记录 claim status、claim code hash、验证尝试等。|
|PayoutInvite|未注册邮箱场景的邀请码 / 邮件 / claim link / poster 对象。|
|Transaction|影响 balance 的账务流水，不记录 email sent、copy link、poster copied 等非账务事件。|

# 4\. 产品与数据模型

## 4\.1 统一 Payout 主对象

新增统一 payouts 主对象承载 Portal 对外展示，StablePay Account payout 与历史 wallet address / batch payout 均映射到该对象。子流程状态留在各自子对象中。

payouts

├── stablepay\_account\_payouts / payout\_claims / payout\_invites

└── payout\_batches / payout\_items  // legacy wallet address / batch execution layer

## 4\.2 Payout Object 建议字段

\{

"id": "po\_xxx",

"object": "payout",

"merchant\_id": "xxx",

"type": "stablepay\_account \| wallet\_address",

"mode": "single \| batch \| claim",

"status": "pending \| in\_transit \| completed \| canceled \| failed",

"status\_reason": "waiting\_for\_recipient\_claim \| sender\_canceled \| expired \| risk\_rejected \| partial\_success \| null",

"result\_summary": "optional, e\.g\. 8 completed, 2 failed",

"recipient\_identifier\_type": "email \| account\_no \| wallet\_address \| batch",

"recipient\_identifier": "new\.user@example\.com \| 00000022 \| 0x8f3\.\.\.91c2 \| 120 recipients",

"recipient\_display": "A\*\*\* Trading Ltd\. \| new\.user@example\.com \| 120 recipients \| 0x8f3\.\.\.91c2",

"recipient\_email": "optional",

"recipient\_account\_no": "optional",

"recipient\_account\_id": "optional",

"recipient\_wallet\_address": "optional",

"source\_account\_id": "acct\_xxx",

"source\_account\_no": "00000022",

"currency": "USDC",

"amount": "500\.00",

"fee\_amount": "0\.00",

"network\_fee\_amount": null,

"batch\_id": "optional",

"claim\_id": "optional",

"invite\_id": "optional",

"created\_at": "2026\-06\-10T10:00:00Z",

"started\_at": "optional",

"completed\_at": "optional",

"canceled\_at": "optional",

"failed\_at": "optional",

"expires\_at": "optional",

"failure\_code": null,

"failure\_message": null,

"metadata": \{\}

\}

# Payout 主状态机

|**主状态原则**<br>Payout\.status 采用 Stripe\-like 但 StablePay 自有命名口径，只表示主对象对外阶段。Claim、Invite、Batch item 的细分状态不提升为 Payout 主状态。批量部分成功/失败时，Payout\.status = completed，Result 展示成功/失败明细。||||
|---|---|---|---|
|**主状态**|**定义**|**典型场景**||
|pending|Payout 已创建，但尚未进入最终支付完成状态。|未注册 recipient 等待 claim；wallet batch 已创建但未开始执行；风控等待处理。||
|in\_transit|Payout 已进入执行链路，尚未完成。|Wallet address payout 链上广播/确认中；batch 执行中。StablePay Account 内部即时转账通常不长时间停留。||
|completed|Payout 主流程已结束。|StablePay Account 已内部入账；wallet payout 链上成功；batch 聚合执行完成，包括全部成功或部分成功/失败。||
|canceled|Payout 被 sender 或系统取消。|Pending claim 被 sender 取消；过期自动释放资金；claim link 失效。||
|failed|Payout 整体处理失败。|系统失败、风控/合规拒绝、recipient 不可收款、链上执行失败且无法完成。||

## 5\.1 不作为 Payout 主状态的值

|**不作为主状态**|**处理方式**|
|---|---|
|paid|替换为 completed。UI、API view model、筛选项均不再使用 paid。|
|pending\_claim|作为 Payout\.status\_reason = waiting\_for\_recipient\_claim 或 Claim\.status，而不是主状态。|
|claimed\_processing|作为 Claim 子状态或内部处理状态，不进入 Payouts list。|
|expired|Payout\.status = canceled，status\_reason = expired。|
|partial\_success|Payout\.status = completed，status\_reason/result\_summary 展示 partial\_success 与数量。|

# 6\. 入口与 Create Payout 表单

## 6\.1 Create payout type

点击 Create payout 后展示两个未默认选中的选项。标题建议：How would you like to send stablecoins?

|**选项**|**标题**|**说明**|**备注**|
|---|---|---|---|
|1|Send to wallet address|Send stablecoins to one or multiple external wallet addresses\. Batch upload supported\.|可能涉及 network / network fee。|
|2|Send to StablePay Account|Send stablecoins by email or StablePay Account No\. Free when the recipient receives funds through a StablePay Account\.|展示 Free badge；弱提示 referral tracking may apply。|

## 6\.2 Source account 与币种

- StablePay Account 一户一币种：一个 source account 只绑定 USDC 或 USDT。

- Create payout 时不单独提供 payout currency 下拉。Amount 输入框右侧展示 source account currency，例如 500\.00 USDC。

- Change source account 页面展示 account name、Account No\.、available balance、currency。切换 source account 后，amount currency 后缀和 summary currency 同步变化。

- 如果通过 Account No\. 转账，recipient account currency 必须与 source account currency 一致，否则阻断并提示 Switch source account。

## 6\.3 表单字段

|**字段**|**规则**|
|---|---|
|Source account|必选。默认展示最近/默认 Operating Account，可切换。展示 account name、available balance、currency。|
|Recipient email or Account No\.|必填。带 @ 或字母按 email 处理；纯数字按 Account No\. 处理。Account No\. 必须为 8 位数字且存在。|
|Amount|必填，\> 0，不能超过 available balance。输入框后展示 source account currency。未注册 email 单笔上限 1,000 USD equivalent。|
|Memo \(optional\)|可选。需要在 payout detail、invitation email、claim page / dashboard pending claim 中展示。|
|Fee|StablePay Account payout = Free；不展示 network / network fee。|

# Recipient Lookup 规则

## 7\.1 输入类型识别

|**输入**|**识别方式**|**处理**|
|---|---|---|
|包含 @ 或字母|email|校验 email 格式后查询 StablePay Account 绑定关系；未注册 email 可创建 pending claim payout。|
|纯数字|account\_no|校验 8 位数字后查询 Account No\.；Account No\. 不存在或币种不匹配时阻断。|
|其他格式|invalid|提示格式错误，不能继续。|

## 7\.2 Email lookup 状态

|**状态**|**展示与处理**|
|---|---|
|not\_checked|用户尚未输入或未触发查询。Continue 前必须强制查询。|
|account\_found|展示 StablePay Account found 与脱敏公司名，例如 A\*\*\* T\*\*\*\*\* Ltd\.；不展示完整商户名、KYB、余额。可进入 review。|
|not\_registered|展示 Recipient is not registered yet。允许创建 pending claim payout，说明 7 天有效期、email OTP、claim code、sender 独立分享。|
|cannot\_receive|该 email 已有关联账户但暂不可收款。阻断创建，可 Notify recipient 或 Cancel。|
|self\_recipient|不能向自己的同一 StablePay Account 发起 payout。|
|invalid\_email|提示邮箱格式错误。|

## 7\.3 Account No lookup 状态

|**状态**|**展示与处理**|
|---|---|
|account\_found|展示 StablePay Account No\. found、脱敏公司名、Account No\. 与 account currency。若币种匹配，可进入 review。|
|not\_found|展示 No StablePay Account found。Account No\. 路径不支持邀请未注册用户，不允许继续。|
|currency\_mismatch|展示 Currency mismatch。说明 recipient account receives USDT/USDC，需要切换同币种 source account 后继续。|
|cannot\_receive|账户存在但不可收款，阻断创建。|
|self\_recipient|不能向自己的同一 account no\. 发起 payout。|
|invalid\_account\_no|非 8 位纯数字，提示 Check account no\.。|

# Review 与安全校验

## 8\.1 已注册 recipient review

- 适用于 email account\_found 或 account\_no account\_found 且币种匹配。

- 展示 recipient 脱敏公司名、identifier 类型、source account、amount \+ currency、fee = Free、memo。

- 不展示 invitation email preview，因为已注册 recipient 不需要邀请邮件。

- 点击 Confirm payout 后弹出 Security verification modal。校验通过后完成内部划转。

- 资金结果：sender available \- amount；recipient available \+ amount；Payout\.status = completed。

## 8\.2 未注册 email review

- 仅 email not\_registered 支持进入该 review。Account No\. not\_found 不支持创建邀请。

- Review 页面完整展示 recipient email，避免 sender 最后确认时看不到自己输入的邮箱。

- 右侧展示 invitation email preview，便于 sender 理解 recipient 会收到什么。

- 页面说明 funds will be held until recipient claims, payout expires, or sender cancels it。

- Limit 文案不放在 review 主卡片；金额超过 1,000 USD equivalent 应在上一步 amount 校验时阻断。

- 点击 Create payout and send invitation 后弹出 Security verification modal。校验通过后创建 pending claim payout。

## 8\.3 Security verification modal

|**字段/动作**|**规则**|
|---|---|
|StablePay Portal account password|使用登录 StablePay Portal 的 account password，不存在独立 fund password。|
|Forgot password|提供入口，沿用现有忘记密码流程，本 PRD 不重新设计。|
|Email verification code|发送到当前 sender 登录邮箱，用于确认敏感操作。|
|Confirm / Submit|校验通过后提交 payout。registered 与 not\_registered 两类创建都需要该 modal。|
|Cancel / Back|关闭 modal，保留 review 页面内容。|

# 9\. 已注册 Recipient 处理逻辑

|**步骤**|**处理**|
|---|---|
|创建|Security verification 通过后创建 Payout 主对象。|
|账务|sender available 减少；recipient available 增加；记录 sender debit 与 recipient credit transactions。|
|状态|Payout\.status = completed；mode = single；type = stablepay\_account。|
|通知|可通知 sender/recipient 转账完成；不发送 invitation email，不生成 claim code。|
|详情页|展示 completed detail；不提供 Download receipt。|

# 10\. 未注册 Recipient Payout 规则

## 10\.1 创建成功后的状态

Payout\.status = pending

Payout\.type = stablepay\_account

Payout\.mode = claim

Payout\.status\_reason = waiting\_for\_recipient\_claim

Claim\.status = pending

Invite\.status = active

Sender available \-= amount

Sender held \+= amount

## 10\.2 Claim period

默认 claim period = 7 days。过期时间从 payout 创建成功时开始计算。V1 不向 sender 开放自定义有效期。

## 10\.3 Sender 成功页

- 标题：Waiting for recipient to claim / Invitation sent。

- 展示 amount、recipient email、expiry、memo、claim code。

- 主操作：Create / Share poster。Poster 中 recipient email 脱敏，包含 QR code 与 claim link。

- 次级操作：Copy claim link、Copy claim code、Resend email、Cancel payout。

- 强调 claim code must be shared separately；email/link/poster 本身不包含 claim code。

## 10\.4 Claim code

|**规则**|**说明**|
|---|---|
|生成方式|系统在 pending claim payout 创建成功后生成 6 位数字 claim code，例如 482913。|
|存储|后端只保存 hash，不保存明文；明文仅在 sender 成功页 / detail 中可查看或复制。|
|分享|Sender 需要在邮件外通过微信、chat、电话等方式单独分享给 recipient。|
|验证时机|Recipient 完成 email OTP，并登录/注册 StablePay Account 后，在 dashboard pending claim 点击 Claim funds，再输入 claim code。|
|错误处理|claim code 错误或过期时展示简单错误提示；超过尝试次数进入风控或人工审核。|
|适用范围|仅未注册 email pending claim payout 需要 claim code；已注册 recipient payout 不需要。|

# Payout Invite、Email 与 Poster

## 11\.1 Invitation email

邮件内容保持简单，避免复杂交互在邮箱客户端展示失败。邮件不包含 claim code。

|**模块**|**内容**|
|---|---|
|Subject|Apex Trading Ltd\. sent you 500 USDC|
|Body|Apex Trading Ltd\. sent 500 USDC to this email through StablePay\. Claim before: 2026\-06\-17\.|
|Memo|如果 sender 填写 memo，展示 Memo: \{memo\}。|
|CTA|Claim stablecoins|
|Security note|You must verify this email and enter the claim code shared by the sender\.|

## 11\.2 Claim link 安全规则

- Claim link 只是 landing page 入口，不是领取凭证。

- 即使链接被转发，也必须满足 invite\.status = active、claim\.status = pending、payout\.status = pending、payout 未过期且未取消。

- 领取用户必须完成 recipient\_email 的 email OTP。

- Email OTP 后，如果该邮箱已有 StablePay Account，系统直接登录/进入 portal，不再要求用户输入密码。

- 如果该邮箱没有 StablePay Account，引导注册；注册完成后进入 dashboard pending claim。

- 最终领取前必须输入 sender 单独分享的 claim code。

## 11\.3 Share claim poster

- Poster 作为 pending claim success 和 pending claim detail 的主要分享能力。

- Poster 展示 StablePay 能为 recipient 解决的问题、amount、sender、expiry、QR code。

- Poster 上 recipient email 必须脱敏。

- Poster 不展示 claim code。

- Poster 适合 sender 通过微信、chat 或线下渠道发给 recipient。

- 如果 sender 想开放式邀请客户注册，而不是针对本次 payout 的特定 email，应使用顶部导航栏的 Invite link 入口。

# Claim Flow

|**步骤**|**页面/状态**|**规则**||
|---|---|---|---|
|1|Claim landing / email verification pending|展示 sender、amount、masked recipient email、memo。Send code 按钮与脱敏邮箱放在一起；邮箱不可修改。||
|2|Email OTP verification|Recipient 输入发送到该邮箱的 6 位 OTP。错误时展示简单错误文案，可重发。||
|3A|Existing StablePay Account|OTP 验证通过后自动登录/进入 portal dashboard，跳过密码登录。||
|3B|No StablePay Account|OTP 验证通过后进入注册第二步，填写商户信息并完成注册。||
|4|Dashboard pending claim|Dashboard 展示 pending claim card：amount、sender、memo、expires。用户点击 Claim funds。||
|5|Claim code verification|输入 sender 单独分享的 6 位 claim code。正确后领取；错误展示简单错误状态。||
|6|Succeeded|资金入账 recipient StablePay Account；Payout\.status = completed；Claim\.status = succeeded；sender 收到 claimed notification。||
|**用户绕过 claim link 的情况**<br>如果 recipient 在 7 天有效期内先自己注册或登录 StablePay，只要其 verified email 等于 payout\.recipient\_email，portal dashboard 应主动发现 pending claim，并展示待领取资金卡片。用户仍需输入 sender 单独分享的 claim code 才能入账。||||

# 13\. 取消、失败与过期

|**场景**|**状态变化**|**资金处理**|**备注**|
|---|---|---|---|
|Sender cancel|Payout\.status = canceled; status\_reason = sender\_canceled; Claim/Invite = canceled|sender held \- amount; sender available \+ amount|需要确认弹窗，不需要 Portal password 校验。|
|Expired|Payout\.status = canceled; status\_reason = expired; Claim/Invite = expired|sender held \- amount; sender available \+ amount|系统定时任务处理；claim link invalid。|
|Claim failed attempts|Claim\.status 可进入 locked / pending\_review；Payout\.status 仍 pending|资金继续 hold|超过阈值转人工或风控。|
|Risk rejected|Payout\.status = failed 或 canceled，取决于资金是否已进入执行处理|按账务结果释放或冲正|需记录 failure\_code / failure\_message。|

# Payouts List

Payouts list 基于统一 Payout 主对象展示，兼容 StablePay Account payout 与 wallet address / batch payout。列表仅展示 Payout 主状态，不展示 claim status、invite status、batch item status 或 transactions。

|**字段**|**说明**|
|---|---|
|Payout ID|统一 payout id，例如 po\_xxx。|
|Recipient|StablePay Account 显示脱敏公司名；未注册 email 可显示完整 email；wallet 显示短地址；batch 显示 120 recipients。|
|Type|仅两种：StablePay Account / Wallet address。Batch 属于 Wallet address type 的执行方式，不作为第三种 type。|
|Amount|展示金额 \+ currency，例如 500\.00 USDC。Batch 可展示 total amount。|
|Status|pending / in\_transit / completed / canceled / failed。|
|Result|展示主状态下的业务结果，例如 Waiting for claim、Completed、8 completed, 2 failed、Expired、Failed。|
|Updated at|根据状态显示 created/completed/canceled/failed/latest updated time。|
|Actions|View；pending claim detail 可进入后执行 poster/copy/resend/cancel。|

## 14\.1 搜索、筛选与分页

- Search 支持 payout ID、recipient email、recipient company、Account No\.、wallet address、batch ID。

- Status filter：All statuses、pending、in\_transit、completed、canceled、failed。

- Type filter：All payout types、StablePay Account、Wallet address。

- 列表底部提供 rows per page、结果区间、页码、上一页/下一页。

## 14\.2 批量部分成功展示

|**场景**|**Payout\.status**|**Result**|**详情页**|
|---|---|---|---|
|全部成功|completed|Completed|展示全部 item completed。|
|部分成功 / 部分失败|completed|8 completed, 2 failed|详情页展示每个 recipient item 的结果、失败原因与可重试动作。|
|全部失败且无任何成功|failed|Failed|详情页展示 failure summary。|
|执行中|in\_transit|Processing 8/10|详情页展示 item progress。|

# 15\. 资金与 Transactions

|**动作**|**Sender transaction**|**Recipient transaction**|
|---|---|---|
|Create pending claim|Hold / debit available to held balance|无|
|Claim succeeded|Held amount released as payout completed|Credit available balance|
|Registered recipient completed|Debit available balance|Credit available balance|
|Cancel / expired|Release held amount back to available|无|
|Failed after hold|Release or reversal based on accounting result|无或冲正|

Transactions 页面只展示影响 balance 的 accounting entries，不展示 email sent、poster copied、claim link copied、resend email 等非账务事件。

# Detail 页面与操作

|**Detail 类型**|**核心信息**|**操作**|
|---|---|---|
|Pending claim detail|Status pending、recipient email、amount、memo、expires、claim code、timeline。|Share poster、Copy claim link、Copy claim code、Resend email、Cancel payout。|
|Completed detail|Status completed、recipient、amount、source account、memo、completed time、transactions。|View only；不提供 Download receipt。|
|Canceled / expired detail|Status canceled、reason sender\_canceled/expired、amount returned。|View only。|
|Failed detail|Status failed、failure code/message、amount handling。|View only 或按业务提供 retry。|

# 17\. 通知模板

|**通知**|**收件人**|**内容要点**|
|---|---|---|
|Invitation email|Recipient|Sender、amount、asset、claim before、memo、Claim stablecoins CTA；不包含 claim code。|
|Invitation sent|Sender|Recipient email、amount、expires、claim code、poster/share actions。|
|Claim succeeded|Sender|Recipient、amount、status completed。|
|Expired|Sender|Payout was not claimed and funds returned to available balance。|
|Canceled|Recipient optional|The payout invitation from sender has been canceled。|

# 18\. 后端与数据要求

## 18\.1 Payouts List View Model

\{

"id": "po\_123",

"recipient": "A\*\*\* Trading Ltd\.",

"type": "StablePay Account",

"amount": "500\.00 USDC",

"status": "completed",

"result": "Completed",

"updated\_at": "2026\-06\-10T10:00:00Z",

"action": "view"

\}

## 18\.2 Lookup API 建议

POST /api/payouts/recipient\_lookup

\{

"source\_account\_id": "acct\_source\_usdc",

"recipient\_identifier": "00000022"

\}



Response examples:

\{

"identifier\_type": "account\_no",

"status": "account\_found",

"recipient\_account\_no": "00000022",

"recipient\_account\_id": "acct\_recipient\_usdc",

"recipient\_currency": "USDC",

"recipient\_display": "A\*\*\* T\*\*\*\*\* Ltd\.",

"can\_receive": true,

"currency\_matches\_source": true

\}



\{

"identifier\_type": "account\_no",

"status": "currency\_mismatch",

"recipient\_currency": "USDT",

"source\_currency": "USDC",

"recipient\_display": "A\*\*\* T\*\*\*\*\* Ltd\."

\}

# 19\. 验收标准

- Create type 页面无默认选中，StablePay Account 选项说明支持 email 或 Account No\.。

- Create form 中 source account 决定 amount currency，所有 create payout 相关页面 amount 后均展示币种。

- Email 与 Account No\. lookup 按规则分支；Account No\. 不存在或币种不匹配均不能进入 review。

- 未注册 email review 展示完整 email、memo、invitation email preview；超过 1,000 USD equivalent 在上一步阻断。

- Confirm payout 使用 modal 做 StablePay Portal account password \+ email code 校验，并提供 Forgot password 入口。

- 未注册 claim flow 拆分为 email OTP \-\> existing auto login 或 new registration \-\> dashboard pending claim \-\> claim code verification \-\> succeeded。

- Claim code 不出现在 recipient email、claim link、poster 中；sender 需单独分享。

- Payouts list 使用 pending / in\_transit / completed / canceled / failed；不出现 paid；batch 部分成功主状态为 completed，Result 展示数量。

- Completed payout detail 不提供 Download receipt。

- 所有旧命名面向用户文案统一为 StablePay Account。

