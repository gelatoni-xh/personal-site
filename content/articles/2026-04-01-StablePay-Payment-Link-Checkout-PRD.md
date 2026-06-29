---
title: "2026-04-01-StablePay-Payment-Link-Checkout-PRD"
date: "2026-04-01"
category: "StablePay"
tags: []
published: true
---

# StablePay Payment Link Checkout PRD

# 版本管理

|序号|文档|时间|说明|
|---|---|---|---|
|1|[Payment Links 多标价币种迭代 PRD](https://qjpkawdabe9q.jp.larksuite.com/wiki/IqbuwcVIQiKtiUk1Uv1jwquSp7c)|26\.4\.29|增加多币种|
|2||||

# **StablePay Payment Link Checkout PRD**

# **1\.文档信息**

**模块名称**：Payment Link Checkout

**产品形态**：Hosted Checkout（买家支付页）

**适用范围**：Payment Links v1

**关联模块**：Merchant Portal – Payment Links、Payment / Payment Intent、Customer、Hosted Payment Module

**域名**：buy\.stablepay\.co 用于 Payment Link Hosted Checkout。 



---

# **2\.背景**



StablePay Merchant Portal 已支持商家创建可复用、可公开分享的 Payment Link。Payment Link 与 Invoice 不同，它不是针对特定客户的账单，而是一个可被多人多次访问和支付的托管支付链接。每次买家打开 Payment Link 并开始支付时，会生成新的 checkout session；支付成功后生成新的 payment / payment intent。   



为了支撑 Payment Links 的完整闭环，StablePay 需要提供一个面向终端买家的 Hosted Checkout 页面。该页面既要承接 Payment Link 中定义的商品和字段收集配置，也要复用 StablePay 现有的稳定币支付能力，并为后续 Invoice Hosted Checkout 提供统一的支付模块能力。 

---



# **3\.产品目标**



### **3\.1 v1 目标**



1. 承接 Payment Link 配置，在 Hosted Checkout 中展示商品、价格、数量及总价。

2. 根据 Payment Link 配置，收集必要的买家信息，用于履约、联系、对账与售后。

3. 提供 StablePay 的支付模块，支持稳定币支付流程。

4. 支持多商品展示，支持指定商品数量可调。

5. 支持 Portal 后台对该 Payment Link 的 visits、checkout started、paid、GMV 统计。

6. 支持 payment 成功后，在 Payment 详情中查看本次交易的 customer details、shipping、line items 快照。     



### **3\.2 非目标**



1. 不支持 subscription payment links。

2. 不支持 tax / automatic tax。

3. 不支持商家自定义支付方式列表，支付方式仍由 StablePay 统一控制。

4. 不支持 prefilled\_email / locked prefill。

5. 不支持 after payment redirect / confirmation page 自定义配置。

6. 不支持 buy button / embed 组件。 



---

# **4\.页面定位**



Payment Link Checkout 是一个公开可访问的 Hosted Checkout 页面，主要分为 3 个区域：



### **4\.1 第一部分：商品和价格信息区**



用于展示本次支付对应的商品信息、数量、价格和总金额。



### **4\.2 第二部分：用户信息收集区**





用于收集商家要求买家填写的信息，例如 email、full name、phone、business name、shipping address。



### **4\.3 第三部分：支付模块区**



用于承接 StablePay 的实际支付能力，包括钱包选择、网络/币种提示、支付发起、支付状态反馈等。该区域必须模块化设计，后续 Invoice Hosted Checkout 也复用同一支付模块。这个要求是本 PRD 的关键设计原则。

---

# **5\.用户故事**



### **买家侧**



1. 作为买家，我希望打开支付链接后能快速看懂我要支付什么、多少钱。

2. 作为买家，我希望在支付前知道是否需要填写邮箱、姓名、电话、收货地址等信息。

3. 作为买家，我希望支付方式选择清晰、简单，能快速完成稳定币支付。

4. 作为买家，如果商品支持改数量，我希望在收银台直接调整数量并看到总价变化。





### **商家侧**



1. 作为商家，我希望 Payment Link Checkout 能准确展示我在 Portal 中配置的商品和价格信息。

2. 作为商家，我希望收银台严格执行我配置的字段收集规则。

3. 作为商家，我希望支付成功后，这笔 Payment 能保留交易快照信息，避免后续 customer 信息变化影响历史订单对账。   



---

# **6\.页面结构与交互**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=ODYwNjU0MmZjNjQyZGUwZDk2ZGI0MDM2YjNjNjg2ZTNfYmQ3NzM4MDdkNmU2MzU5YTUzZjc2YmE4YWJmMjNlYWJfSUQ6NzYyODIwNzQzNDUxOTMwMTY1OF8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

## **页面整体布局**



页面从上到下分为：

1. 顶部基础信息区

- Merchant name

- Language switcher

- Detail / Close 入口

- Test mode 时可展示 Sandbox 标识



2. 商品和价格信息区

3. 用户信息收集区

4. 支付模块区

5. 底部固定 CTA 区

- Pay 按钮

- Powered by StablePay / Terms / Privacy



---

## **第一部分：商品和价格信息区**

### **目标**

在不打断支付转化的前提下，向买家清晰展示正在购买的商品与金额信息。

### **展示内容**



**单商品场景**

默认展示：

- 商品主图（如有）

- 商品名称

- 总金额

- 单价说明（如有）

- 数量信息（Qty）

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=ZDdjYzA3MzNhYjdkYmRkNmU5MzQ4YWRlZjEzYjllZGJfOTJkYTlmZGY0ZThlZjA5NWI1MWM0MTI5MzZlOWZjMTZfSUQ6NzYyNDM1NzY2ODUzMDIxMjM3Nl8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



如果该商品允许调整数量，则展示数量选择入口。数量变化后，总金额实时更新。Payment Link 支持客户可调数量，且最大值不能超过 100。 



### **多商品场景**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NThlNTAyZDJjODEyNzY4MjVhMTUxOTVlMzI1NmY5ZTJfZmUyODY1ZDVhZTdjODNiZDNkYzExMjY5NWQyNTgyMzJfSUQ6NzYyNDM1NzgxMDI2OTk0OTQ2NF8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



默认折叠展示：

- 总金额

- “Detail / View details” 入口

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NDcxYWMyMzRmMDA5ZDA2YzhmOGJjOTFmMTA2YTk5YTZfYTc0ZGNlMjQyOTkxMzRkMmI2MzAzYjhlZTk1YmY5OTRfSUQ6NzYyNDM1Nzk2MjM1NzgzNzMzNV8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NWU5MTZiYzFmY2UxYjgzNTVmNDY1ODA0NzBhMjk3MTVfNjU0Y2M5ODJmYmRiOTJlMjczM2M2NDBlNGJkYTBhMDVfSUQ6NzYyNDM1ODAzMDUzMjA1NDU1Ml8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=YTllM2VlOWE2ZmY5ZjI2ZDRhMjg1M2RmMjhkOTMyM2JfYmZkYWVhMzUzNjVjZjBjM2M3MzEwYjFhNDViMTA1NGZfSUQ6NzYyNDM1ODI5NzM2OTQ2NDM0M18xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



展开后展示：

- 每个 line item 的图片、名称、数量、单价、小计

- Total 总金额



### **交互规则**



1. 默认态下，商品信息区优先展示简化摘要，避免首屏过长。

2. 点击 “Detail / View details” 后，展开订单明细。

3. 多商品场景下，展开层应列出所有 line items。

4. 若某个商品开启 adjustable quantity，则可在商品区直接调整数量；更新后应同步刷新：

- line item 小计

- total

- 后续支付模块中的支付金额







### **校验与限制**



1. line items 最大 10 个。

2. adjustable quantity 的 max ≤ 100。

3. 商品名称 ≤ 250 字符。

4. 商品描述 ≤ 5000 字符。

5. unit price \> 0，并遵循对应币种小数位规则。 



---



## **第二部分：用户信息收集区**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=Yzk0OWI4N2I1YmZhYjgyNzk5MTBlMjViMmRjNjE2YjZfZjI2MzhiZjczNjRjZWI3NDM4ZGQyOTY4ZTI5ZDljYzVfSUQ6NzYyNDM1ODYxMDA4MTU0OTg0N18xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NjFhMjYyZTJhZjU2MzBkYWEwMTc4ZjlmNWZmNGViOTZfZDc4MWRhNGM1OGJhMWVjOWRiODU3ZDQ3NDJiYjM0MzlfSUQ6NzYyNDM1ODk2MTQ3MzUyMzIyNl8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



### **目标**



根据 Payment Link 配置，收集交易所需的用户信息，用于履约、联系、对账和售后。



### **字段来源**



该区域的字段显示与校验逻辑，完全由 Payment Link 的 options / required\_customer\_fields 决定。Portal 创建 Payment Link 时，商家可配置：

- email

- full name

- phone

- business name

- shipping address





其中 email、full name、phone、shipping address 在现有 PRD 中已有明确配置逻辑；business name 建议在本期 Checkout 一并支持，并在 Payment 对象中落快照。   



### **字段定义**



### **Email**



- 默认显示

- 必填

- 用于联系、收据、客户关联等



### **Full name**



- 可配置为 required / optional / disabled

- 若商家开启且未勾选 optional，则为必填



### **Phone number**



- 可配置为 required / optional / disabled

- v1 至少支持 required / disabled

- 若启用必填，则需做 E\.164 格式校验。 



### **Business name**



- 可配置为 required / optional / disabled

- v1 建议支持 optional 或 required

- 主要服务 B2B 收款场景



### **Shipping address**



- 可配置为 required / optional / disabled

- 至少包含：

- line1

- city

- state / province

- postal code

- country



- 若启用为必填，则未填写完整不可进入支付步骤。 





## **8\.4 交互规则**



1. 仅展示当前 Payment Link 要求收集的字段。

2. 必填字段需在 UI 上给出明确提示。

3. 校验失败时，在字段下展示红字错误提示，不阻断用户输入。

4. 所有字段需在点击 Pay 前完成校验。

5. 表单填写完成后，数据先绑定到当前 checkout session；支付成功后写入 Payment 对象快照。





## **8\.5 数据落库原则**



### **Customer 对象**



保存可复用、长期的身份信息：

- email

- full\_name

- phone

- business\_name

- default address 等





### **Payment / Payment Intent 对象**

[Payment对象 改动prd（payment link）](https://qjpkawdabe9q.jp.larksuite.com/wiki/LWznwBF9aiGVnGkY19aj72Ylpsb)



保存该笔交易的快照信息，用于审计、对账、售后：

- customer\_details

- shipping

- payment\_link\_id

- checkout\_session\_id

- line\_items 快照

- 这样即使 customer 后续修改资料，也不影响历史订单。   



---



## **第三部分：支付模块区**

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OWY2YjNiOTgxNmUyZDBjMjJjYjEyZTFiZGYzYWFiZGZfYjY3ZGUwZWZiNjIzZTVmY2YzM2U2OTQzMzIyOGY4OGNfSUQ6NzYyODIwODEzMDg3NDMzMDY0OF8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

点击pay，创建checkout session，跳转到收银台去支付。

Checkout url 路径

|方式||备注|
|---|---|---|
|Transfer crypto to pay|/trasfer/sessioin=?|开发可自定|
|Pay with wallets|/paywithwallets/sessioin=?|开发可自定|



---



# **页面业务流程**



## **10\.1 打开页面**



1. 用户访问 buy\.stablepay\.co/\{payment\_link\}

2. 系统校验 link 是否存在且 active

3. 若无效或已停用，展示 inactive 页面

4. 若有效，加载 Payment Link 配置与 Hosted Checkout 页面

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=NTI1NDcxOTU4Y2M3ZTFkNThiY2I5MjJiMTJiYjA3MDdfYWJkMzc4Yzk1MmU1MDA2NzRmZDZkZWIyZDdlNGFjNDFfSUQ6NzYyNDM1OTgyMTI2NTI0MzY3MV8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

点击pay的时候，要校验paymentlink status

## **10\.2 填写信息**



1. 用户查看商品与金额

2. 展开 detail 查看 line items（如需要）

3. 填写用户信息

4. 如商品支持 adjustable quantity，可修改数量并刷新金额





## **10\.3 发起支付**



1. 用户选择支付方式

2. 点击 Pay

3. 系统校验必填字段

4. 校验通过后，创建 / 更新 checkout session

5. 调起支付模块执行支付流程





## **10\.4 支付完成**



### **成功**



- 生成 payment / payment intent

- 写入 payment\_link\_id、customer\_details、shipping、line\_items 快照

- 若满足策略，则创建/关联 customer\_id

- 展示支付成功页。   





### **失败 / 取消**



- 返回失败或取消态

- 保留表单内容和当前选择，支持重试



---



# **数据模型要求**



## **11\.1 Checkout Session**





建议新增或确保包含：

- id

- payment\_link\_id

- line\_items

- customer\_details

- shipping

- locale

- metadata

- client\_reference\_id / reference

- utm

- status





## **11\.2 Payment / Payment Intent**





必须支持以下扩展字段：



### **Customer 关联**



- customer\_id

- customer\_creation = always \| if\_required





### **Customer details 快照**



- email

- full\_name

- business\_name

- phone

- locale





### **Shipping 快照**



- name

- phone

- address\.line1

- address\.line2

- city

- state

- postal\_code

- country





### **Link / Checkout 归因**



- payment\_link\_id

- checkout\_session\_id

- client\_reference\_id / reference

- utm\_source / utm\_medium / utm\_campaign / utm\_term / utm\_content





### **Order 快照**



- line\_items\[\]：

- 

    - name

    - description

    - unit\_amount

    - currency

    - quantity

    - image\_url

- 





这些字段是 Payment Link Checkout 成功闭环的必要基础。 

---



# **埋点与指标**





## **12\.1 页面埋点**



- payment\_link\.visited

- checkout\.started

- checkout\.detail\_expanded

- checkout\.quantity\_updated

- checkout\.field\_validation\_failed

- payment\_method\.selected

- pay\.clicked

- payment\.succeeded

- payment\.failed

- payment\.canceled





## **12\.2 Portal 指标**





Portal 需要基于 Payment Link 聚合展示：

- Visits（unique）

- Checkout started

- Paid（count）

- GMV（sum） 



---



# **异常与边界情况**

## 13\.0 Ban中国IP, 404, 币种不支持，测试黄条

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=OTVmYTVlZTNmYzMyMzNhMTMyNGIwMTgyMjliMGI1ZDFfMDdjNzUxNzE2YmZmODc2NmZmMGI4MGJhOGJlOGQ4ZGVfSUQ6NzYyNDM2MDUzMDIwNDYxMDA3Ml8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=YmE3YWE4ODA2YmFiOWJhYjY5M2M5NDUzYzdjNDJkOGZfYzEwNzg5NDJhMzU4NWUyOGEwNTNhZGEwNGU5OGE1ZTNfSUQ6NzYyNDM2MTAwMTI5MDk0NDAyNl8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)

## **13\.1 Link 无效 / 已停用**





展示：

- The link is no longer active\.

- 不可继续支付。 

![Image](https://internal-api-drive-stream-jp.larksuite.com/space/api/box/stream/download/authcode/?code=MDQ3MzM2ZTlkODViZWM3NDcyMzY1ZDQxNmE1Yzk5MTdfOWJiYmI5ZDlkYmRiYmYwYmU1NTI1MGZiOTMyNjhkZjlfSUQ6NzYyNDM2MDAyMjAzMzczMTA5OF8xNzgxNTg1MjM4OjE3ODE2NzE2MzhfVjM)



## **13\.2 字段校验失败**



- email 非法

- phone 非法

- shipping 地址不完整

- 未选择支付方式

- 数量超出范围





## **13\.3 商品数量变化**



- 数量调整后总金额需实时刷新

- 若超过 merchant 配置上限，不允许提交





## **13\.4 支付方式不可用**



- 当前钱包 / 网络不可用时，展示 disabled 态或 fallback 逻辑

- 不影响其他支付方式展示



---



# **验收标准**



1. Payment Link Checkout 可正确读取并展示 Payment Link 配置。

2. 单商品与多商品场景都可正确展示商品、数量、总价。

3. adjustable quantity 商品可在 checkout 内修改，且 total 正确刷新。

4. 用户信息区严格遵循 Payment Link 配置显示和校验。

5. 点击 Pay 前，所有 required 字段必须完成校验。

6. 支付模块可以作为独立模块接入本页面，并满足 Invoice Checkout 复用要求。

7. 支付成功后，Payment / Payment Intent 中包含：

8. 

    - payment\_link\_id

    - customer\_details

    - shipping

    - line\_items

    - checkout\_session\_id

9. 

10. Portal 的 Payments \& analytics 页面可以基于该页面产生正确的 visits、checkout started、paid、GMV 数据。   



---



# **研发拆分建议**





## **Epic 1：Payment Link Checkout 页面容器**



- Link 校验

- 商品区

- 用户信息区

- 成功 / 失效 / 错误态





## **Epic 2：数量与价格联动**



- adjustable quantity

- total 刷新

- 多商品 detail 展开





## **Epic 3：用户信息收集与校验**



- 字段动态展示

- required / optional / disabled

- 表单校验

- checkout context 组装





## **Epic 4：支付模块抽象**



- Payment Module 接口定义

- Payment Link Checkout 接入

- Invoice Checkout 复用方案





## **Epic 5：Payment 对象扩展与埋点**



- Payment / Payment Intent 字段扩展

- customer\_details / shipping / line\_items 快照

- payment\_link\_id / checkout\_session\_id / utm

- analytics 埋点与聚合

