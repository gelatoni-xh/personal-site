---
title: "2026-04-01-Merchant-Portal-Payment-Links-PRD"
date: "2026-04-01"
category: "StablePay"
tags: []
published: true
---

# Merchant Portal – Payment Links\-PRD

## **文档信息**



- 模块：Payment Links

- 产品形态：Merchant Portal（创建/管理） \+ Hosted Checkout（客户支付）

- v1 定位：**非订阅（one\-time pricing model）的 Payment Link；链接可重复使用**、可公开分享、不要求预先绑定 customer

---



## **背景与问题**



### **1\.1 为什么要做 Payment Links（而不是只用 Invoice）**



StablePay 目前有 Invoices，但 Invoices 更适合“对已知客户的应收账单”。Payment Links 是“公开可分享的托管支付页链接”，适合营销与一对多销售。



**Payment Links vs Invoice 对照**

payment Links vs 单纯的 URL

Payment Links 是一个功能丰富的对象，而不仅仅是一个 URL，因为它：

1. 可以管理和跟踪：

    - 可以启用/禁用

    - 可以更新配置

    - 可以通过 API 检索使用数据

2. 包含完整的支付配置：

    - 价格和商品

    - 税费设置

    - 支付方式选项

    - 客户信息收集设置

    - 成功/取消重定向 URL

3. 支持后续交互：

    - 可以查询关联的支付和客户

    - 可以分析转化率

    - 可以应用不同的营销追踪参数



---

Payment Links 与其他 对象的区别

1. 与 Checkout Session 的区别：

    - Checkout Session 是一次性的，创建后不能修改

    - Payment Link 是持久的，可以随时更新或禁用

    - Checkout Session 通常需要通过代码创建，而 Payment Link 可以通过 Dashboard 创建并分享

2. 与产品/价格的区别：

    - 产品和价格定义"什么"在售卖

    - Payment Link 定义"如何"售卖并提供现成的支付页面

3. 与发票的区别：

    - 发票是针对特定客户的具体账单

    - Payment Link 是通用的，任何人都可以访问并支付

最佳实践

1. 使用元数据进行追踪：添加元数据以便于分析和报告

2. 添加 URL 参数：可以在 URL 末尾添加 `?prefilled_email=customer@example.com` 等参数

3. 考虑使用不同的 Payment Links：为不同渠道或活动创建不同的链接以便跟踪

4. 定期检查活跃链接：禁用不再需要的链接，保持安全性

5. 自定义成功页面：使用 `after_completion` 设置适当的成功体验

总结，Payment Links 是一个完整的对象，它生成并管理一个可分享的支付 URL，但它的功能远不止提供一个链接那么简单。它是一个功能齐全的支付解决方案，可以跟踪、更新和管理。

---

### Payment Links 域名解析

Payment Links 的域名

Payment Links 使用的域名确实是 `buy.stablepay.co`，而非 `checkout.stablepay.co`。

例如，一个典型的 Payment Link URL 看起来像这样：

https://buy\.stablepay\.co/test\_14k5lFfE89NS3eg001

StablePay 不同域名的用途区分

StablePay 使用不同的子域名来区分不同类型的客户面向页面：

为什么使用不同域名

stablepay 使用不同域名有几个原因：

1. 功能区分：

    - `buy.stablepay.co` 表示公开可分享的商业链接

    - `checkout.stablepay.co` 表示单次结账体验

2. 品牌和用户体验：

    - "buy" 传达简单直接的购买行为

    - "checkout" 更暗示结账流程的一部分

3. 内部系统架构：

    - 不同产品可能由不同的后端服务支持

    - 分离域名允许独立的基础设施和部署

4. 安全与隔离：

    - 将不同功能在域名级别分离提高了安全性

    - 允许为不同功能应用不同的安全策略

5. 使用自定义域名（暂不支持）

如果商家不希望显示 StablePay 的品牌，可以设置自定义域名来托管这些页面



---



### **1\.2 v1 解决的问题**



- 商户无需开发即可创建收款链接，分享给客户完成支付

- 支持收集必要的客户信息用于履约/对账（email/name/phone/shipping）

- 在 Portal 侧可查看链接表现与该链接产生的 payments，并能点击某笔 payment 查看完整信息（drawer）



---



## **目标与非目标**





### **2\.1 产品目标（v1）**



1. 创建 Payment Link（可复用、可公开访问）

2. 支持多商品 line items（最多 10 个）

3. 支持数量配置 \& 客户可调数量（max 100）

4. 支持在收银台强制/可选收集信息（email/full name/phone/shipping address）

5. 支持 Copy URL、QR Code（下载）

6. 支持详情页与 Payments \& analytics（Visits/Checkout started/Paid/GMV）

7. 点击 payment\_id 打开 drawer，查看 customer/shipping/order/technical/tracking/metadata





### **2\.2 非目标（v1 明确不做）**



- 订阅 payment links（subscription）

- tax / automatic tax / invoice PDF

- 商户管理支付方式（payment methods 由 StablePay 统一控制）

- prefilled\_email（以及任何 email prefill/locked prefill）

- after payment 配置（确认页/redirect）暂不做

- buy button / embed 组件暂不做



---



## **核心概念与定义**



### **3\.1 Payment Link 的本质**



- 一个 Payment Link 是长期存在的资源（plink\_xxx）

- 它可以被分享并被**多人多次使用**

- 每次客户打开并开始支付，会生成新的 **checkout session**；支付成功生成新的 **payment/payment intent**



### **3\.2 Payment Links 与 Customer 的关系（v1 规则）**



- Payment Link **不要求预先指定 customer**（支持匿名）

- 当客户在收银台填写 email/name/phone/shipping 等信息时：

- 

    - **Payment（Payment Intent）对象必须保存“交易快照信息”**（用于审计/对账/售后）

    - Customer 对象是否创建/关联：v1 推荐默认策略 **if\_required**（仅当收集了 email 等信息时才尝试创建/关联；否则不主动创建，避免 Customers 列表噪音）



---



## **范围与约束（硬规则）**





### **4\.1 硬性限制（必须实现）**



1. 每个 Payment Link 最多 **10** 个 product（line\_items ≤ 10）

2. 若开启 “Let customers adjust quantity”，adjustable max ≤ **100**

3. product description ≤ **5000** 字符

4. product name ≤ **250** 字符（与 Change name modal 计数一致）

5. unit price \> 0，遵循币种小数位规则



---



## **用户角色与权限**



- Admin：创建/编辑/启停/查看/下载 QR

- Operator：创建/编辑/启停/查看/下载 QR

- Analyst/Readonly：仅查看（列表/详情/analytics/payment drawer）



---



## **用户故事（User Stories）**



1. 作为商户，我要创建一个可复用的收款链接并分享给客户

2. 作为客服，我要在列表里 hover 一键 Copy URL 快速发给客户

3. 作为运营/财务，我要在 Payment Link 详情页查看 GMV 与 Paid，并点开某笔 payment 查看客户信息与收货地址

4. 作为商户，我希望配置“必须填写的信息”，确保我能履约或联系客户



---



## **交互与页面规格（原型）**

https://cookie\-both\-18702477\.figma\.site/

### **7\.1 Payment Links 列表页**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NDI5ZTRhMGU2NjZiMWFjNmFmZTA1MjY2NGMzN2RiODJfYzUzMjRkODQ5YTNmZTdjMjdiMGNkYjE1ZjAzZDM0ZWFfSUQ6NzYxNDEzMjEyNzQ5OTkxNDc3NF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



**布局**



- Title：Payment Links

- CTA：\+ Create payment link

- Table columns：Name / Price / Status / Created / Actions\(…\)





**交互**



- Row hover：出现 Copy URL 按钮（复制成功 toast）

- Kebab menu：



- Copy URL

- Edit

- Deactivate（红色）

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NTM4YTYzYmY3ZGFjYzY3YjdkMTYzYTc1ZmRjYzQxZjVfODA0ZWIxZmI2MDAyODQ5M2EyMTE3ZmEwNDJhNzIzZDZfSUQ6NzYxNDEzMjQzMjk2MjMyNjAzNl8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=ZjcyN2VjOGU1MTdkNDcwMmZhZjQzZDgyNmIxY2YyMjFfZmQ1NWZiYmEzNzRhZjJmYjBiMWFhYjFkZWQzODQ1M2NfSUQ6NzYxNDEzMjg0NTc0NDgwMzM0OV8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



**状态**



- Active（绿）

- Deactivated（灰）



---



### **7\.2 Payment Links 详情页（Header \+ Tabs）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MjY1NWVkMzdlZjRlNGQ4MWVkNWFjODcyODAyZjg1MThfNzY1MWQxNDYwY2E0NTE0NTNkNTIwYmM0OThlYTU1NDZfSUQ6NzYxNDEzMzE0MjQ1NDAyOTg0Nl8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

**Header**



- 标题：PAYMENT LINK / kiwi for €10\.00 EUR

- 描述：Copy and share to start accepting payments with this link\.

- URL bar：链接 \+ copy icon

- QR icon：打开 QR Code modal

- kebab：Change name / Edit / Deactivate

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=Y2M5NGViY2NhOTZkYzgwNjM3MWVkNzBhYjQ5ZDQ4YTVfODQ3YWJiMGNjZWVmNTY2MGZhYjk0MDE1ZDFiMzAwYjdfSUQ6NzYxNDEzNTM4NzYyNzI3Nzg0NF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



**Tabs**



- Overview（默认）

- Payments and analytics



---



### **7\.3 Overview Tab**





**Products card**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MzhlNmI1YmUzYzhiYTE2NWI4N2RhNjRjNjEwYWNmYzZfNDBhNDVmMDE5NjE1NThkMWRhZjQxZWRiZjE2YTlmMzlfSUQ6NzYxNDEzNDMzNTExMjkyNDY5M18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

- Table：Name\(含图\) / Quantity / Adjustable quantity\(Yes/No\)





**Details card**



- Status

- Date created

- Collect addresses（None required / Shipping）

- Collect phone numbers（Yes/No）

- Collect full names（Yes/No）

- Call to action button（Pay）





> v1 不做 after payment 配置：不展示 Confirmation page 等字段（或显示 Default 但不可编辑，二选一；推荐直接移除以避免误导）
> 
> 



---



### **7\.4 Payments and analytics Tab**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OTM3N2I2YjU3NmYzNTVkMTNiMDlmZGFjMjkwMzM5OTZfYTlkOWFjYWZlMTUxNDlmM2JjOWMwMzE5MTc0ZTdiMzdfSUQ6NzYxNDEzNjI1MTY1MzkwMTg0NF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

**Metrics**



- Visits

- Checkout started

- Paid

- GMV





**Payments table**



- Payment ID（可点击）

- Amount \(USD\)（按原型）

- Status（Succeeded badge）

- Created





**交互**



- 点击 Payment ID → 打开右侧 Payment drawer（不跳转页面）

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OGFiZjA0NzUzMjMyZmIxNWE5MjE5NzkxNmExNTUyZDBfZGU0ZTU1NDA1MjBmYjIwNzFkMjAyNmRiNmIwNDFjMWJfSUQ6NzYxNDEzNjQ4Mzk0Mjg2MjM1N18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MDczMzdmN2Y4MTE4ZTYwNzRjMWQwZjE0YjA5NjU4MzhfZTEyNGYzZDQ5OTBhNDI1YjdkM2YzZmJjZmMxNTE2MjhfSUQ6NzYxNDEzNzAzNzk5MzYyNzE1N18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



---



### **7\.5 Create / Edit payment link（左配置 \+ 右 Preview）**





**Top bar**



- 左：X

- 右：Create link / Save changes





#### **7\.5\.1 Products（支持多商品，最多10个）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MGQ3YzEwM2U1Nzg2NTYzNGY3Zjg4MjZlNjRkNmM4YjZfNDAyMzFjOWIwZmUyYWIzNmJiNjYxZjNiMTJkODRiNDlfSUQ6NzYxNDEzODU2MjM1MDQ4NTAxNF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

每个 product block：

- Product name \*（≤250）

- Description（≤5000）

- Image upload \+ Remove

- Unit price \*（\>0）

- Currency dropdown（币种集合来自 auto\-currency conversion 支持列表；v1 不展示自动换汇说明）

- Quantity stepper（默认 1）

- Let customers adjust quantity（checkbox）

- 

    - 勾选后出现 Between min and max（默认 1\~100，max 不可\>100）

- 





按钮：\+ Add another product

- 达到 10 个后 disable，并显示提示 “Maximum 10 products per payment link\.”



![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=Nzc4NGY0MjdhOWJhNTA1OTY4YzI5OGY5MmFhMzA5OTFfNGMzOTk5ZTYxOTljMWZhMjc1MzFmZDBlZDA1YmNmZDNfSUQ6NzYxNDEzODk5MTEwMDY5NDAzN18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

#### **7\.5\.2 Options（决定收银台必填字段）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=YWNjMGZjMGY1NzliMjY5MzcwN2ZlOGE0NTRkZGI2ODNfZjI0MGE4MTc3NWE1OTg4OTA3YWJhODJhYzk5YzVlNDlfSUQ6NzYxNTUwNDc0MzQ1NjMxMjg1M18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

- 邮箱用户必填

- Collect full name（toggle）



- Mark as optional（checkbox）



- Require phone number（toggle）

- Collect shipping address（toggle）

- Limit the number of payments （toggle）

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NGI2MGNmODQ1OWZiYWFlYjI2NDE4ZmZkZTYwMzllZDFfMmRhYTlkMGJiZmVhMWIzNzlkNDBkMzA5NDNhMDVkNGVfSUQ6NzYxNTUwNjYyOTIyNTQ4Mzc5OF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

最大10payments

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NTYzZTEyOTI1ODRjNGY2MjNjNTEwNTBhZTQ0NjMwYzhfYjc2YWEzM2I4ODZmOTI0YzVhNjMwNzE5N2I2NzU1YTlfSUQ6NzYxNTUwNjg3NDUwMzA0MDUzM18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

Learn more 说明放到官网

[Limit the number of times a payment link can be paid](https://qjpkawdabe9q.jp.larksuite.com/wiki/PBxcwgX4Wi17mykzC58jSHdrpPf)
[https://stablepay\-a1f5fa99\.mintlify\.app/zh/product/Payment\-Links\-Limit\-Payment\-Count](https://stablepay-a1f5fa99.mintlify.app/zh/product/Payment-Links-Limit-Payment-Count)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OWQ3ZWVlZGNlMGIzMmNmYzAyZDhkZTliYjJjYzAyYjdfYjdmNzZhNGYwOGU0MzIxMDY3NGUyMmNkZmRmOTNmNDRfSUQ6NzYxNDEzOTM2MDc1MzAxMjI0Nl8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



> 这些开关会影响 Hosted Checkout 表单字段显示与校验，并决定 Payment 对象需要落哪些字段。
> 
> 



#### **7\.5\.3 Preview（右侧）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=Njc1MDMzMGVkZDg1YzY5NmZhZDI3MGM2YTJkYTQ0NWJfNzdhMWU3NmRhNmE1N2IxMzM3MmM2N2U5NmVlNGJmMDZfSUQ6NzYxNDEzOTU0OTQ0NjQ0MjUxOF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

- 展示 merchant、line items、total

- 展示表单字段（Email/Full name/Phone/Shipping address）按 options 显示

- Payment method：只读说明 “AI\-powered payment suggestions…”

- CTA：Pay



---



### **7\.6 Modals**





#### **7\.6\.1 Deactivate modal**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MGQyM2M5MzQzYWVlYzUyMDEzODM0OWYyMzUzNTM0NDJfNGVmMjljN2Q2YjE0NGEyZDc3ZmIwZDZlYTM4ZGI2OWZfSUQ6NzYxNDE0MDc1NTMzNDAwODM0MV8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=YzlkNDY1Y2NhYmI2OTRhOTVkMWUxMzRkMzNmMGYwMmRfNDIzYWI0NGJjY2FjOWFiYjMzZTEzNzc4ZTIxNjhhNDRfSUQ6NzYxNDE0MDAwODAxMzkwOTUyNV8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

- 标题：Deactivate payment link?

- 文案：Customers will no longer be able to make a purchase using this link…

- Buttons：Cancel / Deactivate

- 右侧预览：buy\.stablepay\.co 显示 “The link is no longer active\.”

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MTNmYmJjNjgwZmFkOGU2NjU2ZDhkNDAyY2JjZTE1ZTdfNzE0OWZjYjgwMzllMTRmYTE4OTg0MjA0NzhiYzU0NzNfSUQ6NzYxNDE0MDg4NTE4NTU2NDE4Ml8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



#### **7\.6\.2 Change name modal**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MzFkZmE0NGQ3YjZkMGMyMjk2Y2M5MDdkNDY0MDUwY2NfNTgzNWVhMGYxYjhjMjYzZDM0ZWE0OGQzNzNjNzMyMWRfSUQ6NzYxNDE0MTAxNzMzMTA3NjYzMF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)

- Name input（\<=250，计数）

- 文案：仅 Portal 可见，客户不可见

- Buttons：Cancel / Save

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OTAwZGU5M2MwNGFjMTJiNjc0ZGQ3Y2YwNmUwYTg2MDlfYzlhOTBkZThkNDkxYzgzNDU3NGVhYWI4YzBmMDVhMzlfSUQ6NzYxNDE0MTA2OTYyNTcyNDQzN18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



#### **7\.6\.3 QR Code modal**



- QR 图

- URL input \+ copy

- Buttons：Close / Download

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MzE5ZGZmNzVhODljMTA3ZTNiMGM2YmYwZWM2MDRkNTZfMGUyYTA0ZWIyZWZjNWQyMDllYTFiN2IxZWIxZTNlZjVfSUQ6NzYxNDEzNTU2MzQ3MDg4NDM3M18xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



---



### **7\.7 Payment Detail  Popup（点击 payment\_id）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NTMwNWIxYWExZTMyNWZkNzgxNGY3MmZiMjE3ZmY4NDRfYmQ3NTViNTkyMjIxNGVkMTg1YjdjY2MwMGQ3ZjIzZThfSUQ6NzYxNTUwNDQxMzg0ODcwMjQ4Nl8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)



Drawer Header：

- pay\_xxx \+ copy icon

- Status badge

- Amount \+ currency

- Created timestamp

- Close X





Sections（按原型）：

1. Customer

- Customer ID（link \+ copy；可为空）

- Email（copy）

- Full name

- Phone

- Locale





2. Shipping address（仅当收集时出现）

- Recipient / Phone / Address



3. Order

- Line items（name、unit price、qty）

- Total





4. Payment technical

- Payment link ID

- Checkout session ID

- Network

- Tx hash（copy）

- Confirmations





6. Metadata（k/v）

7. Raw JSON（折叠）



---



## **数据模型与对象（v1 必须落地）**





### **8\.1 PaymentLink 对象**





关键字段：

- id（plink\_）

- active（bool）

- name（Portal 名称）

- url

- line\_items\[\]（≤10）

- 

    - name\(≤250\), description\(≤5000\), image\_url, unit\_amount, currency, quantity

    - adjustable\_quantity \{ enabled, min, max\(≤100\) \}

- 

- options

- 

    - collect\_email

    - collect\_full\_name \{ enabled, optional \}

    - collect\_phone \{ enabled, required \}（如果你希望区分 required/optional，v1 phone 只有 require toggle 即可）

    - collect\_shipping\_address \{ enabled \}

- 

- created\_at/updated\_at/created\_by

- metadata





### **8\.2 Payment / Payment Intent 对象（必须扩展）**

[Payment对象 改动prd（payment link）](https://qjpkawdabe9q.jp.larksuite.com/wiki/LWznwBF9aiGVnGkY19aj72Ylpsb)



---



## **Hosted Checkout 行为（关键业务逻辑）**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OThkYjIxNjJkODBkMTQxMTQxM2IxMjk5MjMyNzhiNGVfODgxY2JmYzUwMGQwNjM2NzBmMjA3NGU2ZGYzYzBmNGJfSUQ6NzYxNDE1MjIxOTg3ODM3OTAzMF8xNzgxNTg1MjE4OjE3ODE2NzE2MThfVjM)





### **9\.1 字段显示与校验**





根据 payment link options：

- collect\_email=ON → email 必填

- collect\_full\_name=ON → name required（若 Mark optional 勾选则 optional）

- require\_phone=ON → phone 必填（E\.164 格式校验）

- collect\_shipping\_address=ON → shipping address 必填（最少 line1/city/country 等）





### **9\.2 事件与落库**



- checkout started：记录 visits / checkout started

- payment succeeded：

- 

    - 生成 payment/payment intent

    - 写入 payment\_link\_id \+ customer\_details \+ shipping \+ line\_items 快照

    - 如果有 customer 模块：按策略创建/关联 customer\_id（v1 默认 if\_required）

- 



---



## **校验、错误码与文案**





### **10\.1 UI 校验**



- 超过 10 product：Add another product disabled \+ helper text

- adjustable max\>100：输入框红字 “Maximum quantity is 100\.”

- description\>5000：红字 \+ 禁止保存

- unit price ≤0：红字 \+ 禁止保存





### **10\.2 API 错误码建议**



- payment\_link\_too\_many\_products

- adjustable\_quantity\_max\_exceeded

- product\_description\_too\_long

- invalid\_unit\_amount



---



## **埋点与指标（v1）**



- payment\_link\.created / updated / deactivated

- payment\_link\.copied / qr\_downloaded

- payment\_link\.visited（visits）

- checkout\.started

- payment\.succeeded / failed





Portal Metrics：

- Visits（unique）

- Checkout started

- Paid（count）

- GMV（sum）



---



## **验收标准（Acceptance Criteria）**



1. Payment link 可重复使用：同一个 link 可产生多笔 payment（多用户多次支付）

2. payment link 可匿名：创建时不指定 customer；支付后 payment drawer 仍能展示收集到的信息

3. Create/Edit 支持最多 10 个 product；第 11 个无法添加（UI\+API）

4. adjustable quantity max ≤100（UI\+checkout）

5. description ≤5000（UI\+API）

6. Deactivate 后 buy 页面提示 link inactive；Portal 状态变 Deactivated

7. Payments \& analytics 可看到 metrics 与 payments table；点击 payment\_id 打开 drawer 且字段齐全

8. Payment intent/payment 对象实际包含：customer\_details/shipping/line\_items/payment\_link\_id 等必要字段



---







## **研发拆分建议（Epic）**



- E1：PaymentLink CRUD \+ List/Details（Overview）\+ Change name / Deactivate \+ QR

- E2：Create/Edit \+ Preview \+ 校验限制（10 items / 100 qty / 5000 desc）

- E3：Analytics 埋点 \+ payments list \+ payment drawer

- E4：Payment API / Payment object 扩字段 \+ webhook 回传（customer/shipping/line\_items/tracking）









