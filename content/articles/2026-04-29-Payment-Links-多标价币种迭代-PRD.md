---
title: "2026-04-29-Payment-Links-多标价币种迭代-PRD"
date: "2026-04-29"
category: "StablePay"
tags: []
published: true
---

# Payment Links 多标价币种迭代 PRD

## **文档信息**



**模块**：Merchant Portal – Payment Links

**迭代主题**：支持非 USD 标价币种创建 Payment Link

**适用范围**：Payment Links 创建、编辑、列表、详情、Payment drawer、数据模型、金额校验

**不包含范围**：Hosted Checkout 展示与支付流程，另行项目处理



---



## **背景**





当前 StablePay Payment Link 仅支持商家创建 **USD 标价** 的商品，不允许创建其他币种的商品。



随着 StablePay 面向跨境电商、SaaS、教育、游戏、娱乐、服务贸易等全球业务场景扩展，商家希望直接使用本地法币创建 Payment Link，例如 EUR、GBP、JPY、HKD、SGD、KRW、AED 等。



本次迭代目标是在 Merchant Portal 的 Payment Links 创建与管理流程中，支持商家选择指定标价币种，并按照该币种创建商品价格。

---



## **产品目标**





本期目标：

1. 支持商家创建非 USD 标价的 Payment Link。

2. 同一个 Payment Link 只能使用一个标价币种。

3. 同一个 Payment Link 下所有商品必须使用同一个币种。

4. 支持多商品，但多商品金额必须统一币种。

5. 支持不同币种的小数位规则。

6. 支持按 **订单总金额** 校验最低创建金额。

7. 每个币种配置固定的最小订单金额，前端和后端都使用同一份配置。

8. Payment Links 列表、详情、Payment drawer 正确展示原始标价币种。

9. Payment Link 创建后 不允许修改币种。[Payment Link 创建后币种不可修改](https://qjpkawdabe9q.jp.larksuite.com/wiki/TadXw1YWmilAFYkXkIbjBjGjpme)



---



## **支持币种范围**



完整币种列表：

```Plain Text
USD
EUR, GBP, AUD, CAD
JPY, HKD, SGD, KRW
IDR, PHP, VND, THB, MYR
MXN, BRL
AED, SAR, QAR, KWD, OMR, BHD
```



---



## **非目标**





本期不做：

1. 不支持同一个 Payment Link 内创建多币种商品。

2. 不支持买家侧 Checkout 页面展示与支付逻辑改造。

3. 不支持买家在支付页切换标价币种。

4. 不支持根据买家 IP / 浏览器语言自动展示本地币种。

5. 不支持多币种 Price Book。

6. 不支持商家自定义汇率。

7. 不支持税费、automatic tax。

8. 不支持订阅类 Payment Link。

9. 不支持商家设置默认币种。

10. 不支持在 Payment Link 创建时配置结算币种。

11. 不支持前端实时查汇率计算最低金额。



---



# **核心业务规则**





## **6\.1 一个 Payment Link 只能有一个币种**





同一个 Payment Link 下，所有商品必须使用同一个 currency。



允许：

不允许：

规则：

1. Payment Link 创建时选择一个 currency。

2. 所有 line items 自动使用该 currency。

3. 新增商品时，不允许单独选择其他币种。

4. API 层必须校验所有 line\_items\.currency 与 Payment Link 顶层 currency 一致。

5. 如传入混合币种，接口返回错误。





错误码：

```Plain Text
mixed_currency_not_allowed
```

错误文案：

```Plain Text
All products in one payment link must use the same currency.
```

中文：

```Plain Text
同一个 Payment Link 下的所有商品必须使用同一个币种。
```



---



## **6\.2 新建 Payment Link 的默认币种**





新建 Payment Link 时：

```Plain Text
默认币种 = USD
```

商家可以从 Currency dropdown 中选择其他支持币种。

---



## **6\.3 Currency dropdown 展示**





建议按地区分组展示：

```Plain Text
Default
- USD

Europe and North America
- EUR
- GBP
- AUD
- CAD

Asia-Pacific
- JPY
- HKD
- SGD
- KRW

Southeast Asia
- IDR
- PHP
- VND
- THB
- MYR

Latin America
- MXN
- BRL

Middle East
- AED
- SAR
- QAR
- KWD
- OMR
- BHD
```



---



## **6\.4 多商品场景下的币种规则**





当前 Payment Links 已支持一个 Payment Link 最多 10 个 product / line items。



本次迭代后：

1. Currency 不放在每个 Product block 内单独选择。

2. Currency 提升到 Products card 顶部，作为整个 Payment Link 的统一配置。

3. 每个商品的 Unit price 输入框右侧展示当前 currency suffix。

4. 新增商品时自动继承当前 currency。





推荐结构：

```Plain Text
Products

Payment currency
[ EUR ▼ ]
All products in one payment link must use the same currency.

Product 1
Product name *
Unit price *
[ 10.00 ] EUR

Product 2
Product name *
Unit price *
[ 20.00 ] EUR
```



---



# **最小订单金额规则**





## **7\.1 校验口径**





本期最小金额校验按 **整个订单总金额**，不是按单个商品。



也就是说：

```Plain Text
min_order_amount = 所有商品最低购买金额之和
```

订单总金额必须大于或等于当前币种配置的最小订单金额。

---



## **7\.2 为什么不按单个商品校验**





Payment Link 支持多商品。如果按单个商品校验，会导致一些合理场景被误拦截。



例如：

如果按单个商品校验，Product A / B 可能不满足最低金额。



但如果按订单总金额校验，只要总金额满足该币种最小订单金额，就允许创建。

---



## **7\.3 最小订单金额计算方式**





### **普通商品**





如果商品不支持 adjustable quantity：

```Plain Text
line_item_amount = unit_price × quantity
```



### **支持客户调整数量的商品**





如果商品开启 adjustable quantity：

```Plain Text
line_item_min_amount = unit_price × adjustable_quantity.min
```



### **整个 Payment Link 的最低订单金额**



```Plain Text
min_order_amount = Σ(line_item_min_amount)
```

必须满足：

```Plain Text
min_order_amount >= currency_min_order_amount
```



---



## **7\.4 示例**





### **示例 1：单商品**



```Plain Text
Currency: KRW
Unit price: 100 KRW
Quantity: 1
Order total: 100 KRW
KRW minimum order amount: 200 KRW
```

结果：

```Plain Text
不允许保存
```



---



### **示例 2：多商品**



```Plain Text
Currency: KRW

Product A: 50 KRW × 1
Product B: 50 KRW × 1
Product C: 100 KRW × 1

Order total: 200 KRW
KRW minimum order amount: 200 KRW
```

结果：

```Plain Text
允许保存
```



---



### **示例 3：可调数量**



```Plain Text
Currency: JPY

Product A
Unit price: 5 JPY
Adjustable quantity min: 1
Adjustable quantity max: 100

Minimum order amount = 5 JPY
JPY minimum order amount = 20 JPY
```

结果：

```Plain Text
不允许保存
```

如果商家修改为：

```Plain Text
Unit price: 5 JPY
Adjustable quantity min: 4
```

则：

```Plain Text
Minimum order amount = 20 JPY
```

结果：

```Plain Text
允许保存
```



---



# **固定最小订单金额配置**





## **8\.1 设计原则**





StablePay Checkout 支持的最小支付金额是：

```Plain Text
0.01 USDT / USDC
```

但 Payment Link 创建侧不建议允许过低金额。



Payment Link 的最小订单金额按以下原则设计：

1. 每个币种配置一个固定的最小订单金额。

2. 不依赖前端实时汇率查询。

3. 固定金额整体不低于约 0\.10 USD 等值。

4. 预留一定汇率波动 buffer。

5. 金额尽量易理解、易输入、符合币种常见金额习惯。

6. 该配置由后端统一维护，前端通过配置接口读取。

7. 后端保存时必须再次校验，前端仅做即时提示。



---



## **8\.2 建议最小订单金额表**



说明：

1. 以上金额是 Payment Link 创建侧的固定最小订单金额。

2. 不是实时汇率换算结果。

3. 不是 Checkout 实际支付最小金额。

4. 后续可由运营、风控或财务根据汇率和业务情况调整。

5. 建议配置表支持后台配置或后端配置文件管理，不要写死在前端。



---



## **8\.3 前端展示方式**





当商家选择 currency 后，在 Unit price / Products card 附近展示当前币种最低订单金额提示。



示例：

```Plain Text
Minimum order total: ₩200 KRW
```

中文：

```Plain Text
最低订单总金额：₩200 KRW
```

或者更完整：

```Plain Text
The minimum order total for KRW payment links is ₩200 KRW.
```

中文：

```Plain Text
KRW 币种的 Payment Link 最低订单总金额为 ₩200 KRW。
```



---



## **8\.4 校验失败提示**





当订单总金额低于该币种最低订单金额时，展示错误。



英文：

```Plain Text
The minimum order total for KRW is ₩200 KRW.
```

中文：

```Plain Text
KRW 币种的最低订单总金额为 ₩200 KRW。
```

如果希望更通用：

```Plain Text
The order total is below the minimum amount for this currency.
```

中文：

```Plain Text
订单总金额低于当前币种的最低金额要求。
```

推荐组合展示：

```Plain Text
The order total is below the minimum amount for this currency. Minimum: ₩200 KRW.
```

中文：

```Plain Text
订单总金额低于当前币种的最低金额要求。最低金额：₩200 KRW。
```



---



# **币种小数位规则**





不同币种的小数位不同，前后端都必须校验。



## **9\.1 小数位规则**





---



## **9\.2 示例**





JPY / KRW / VND / IDR：

```Plain Text
1000    允许
1000.5  不允许
```

USD / EUR / HKD：

```Plain Text
10       允许
10.5     允许
10.55    允许
10.555   不允许
```

KWD / OMR / BHD：

```Plain Text
1.234    允许
1.2345   不允许
```



---



## **9\.3 输入框交互**





当商家选择不同 currency 后：

1. Unit price 输入框自动调整允许的小数位。

2. 价格格式化规则同步更新。

3. 已输入价格如不符合新币种小数位规则，需要展示错误。

4. 保存时后端再次校验。





错误文案：



### **0 小数位币种**



```Plain Text
This currency does not support decimal amounts. Please enter a whole number.
```

中文：

```Plain Text
该币种不支持小数金额，请输入整数。
```



### **超过小数位**



```Plain Text
Too many decimal places for this currency.
```

中文：

```Plain Text
该币种的小数位数过多。
```



---



# **创建 / 编辑页面改动**





## **10\.1 Products card**





新增或调整字段：

```Plain Text
Payment currency *
[ USD ▼ ]

All products in one payment link must use the same currency.
Minimum order total: $0.10 USD
```

当选择 KRW：

```Plain Text
Payment currency *
[ KRW ▼ ]

All products in one payment link must use the same currency.
Minimum order total: ₩200 KRW
```



---



## **10\.2 Unit price 输入框**





原：

```Plain Text
Unit price *
[ 10.00 ]
Currency [ USD ▼ ]
```

调整为：

```Plain Text
Unit price *
[ 10.00 ] USD
```

KRW：

```Plain Text
Unit price *
[ 15000 ] KRW
```

KWD：

```Plain Text
Unit price *
[ 1.500 ] KWD
```



---



## **10\.3 新增商品**





点击 \+ Add another product 后：

1. 新商品不展示独立 currency dropdown。

2. Unit price 自动使用当前 Payment currency。

3. 如已达到 10 个商品，沿用现有限制。



---



## **10\.4 订单总金额提示**





在 Products card 底部展示当前最低订单金额校验结果。



### **正常状态**



```Plain Text
Order total: ₩15,000 KRW
Minimum order total: ₩200 KRW
```



### **错误状态**



```Plain Text
Order total: ₩100 KRW
Minimum order total: ₩200 KRW
```

错误提示：

```Plain Text
Order total must be at least ₩200 KRW.
```

中文：

```Plain Text
订单总金额需不低于 ₩200 KRW。
```



---



# **编辑 Payment Link 时的币种规则**

[Payment Link 创建后币种不可修改](https://qjpkawdabe9q.jp.larksuite.com/wiki/TadXw1YWmilAFYkXkIbjBjGjpme)



---



## **11\.2 已产生成功支付**





如果 Payment Link 已经产生至少一笔成功支付，不允许修改 currency。



原因：

1. 避免历史 Payment 记录与当前 Payment Link 配置不一致。

2. 避免 Payment Link 详情页 GMV 统计口径混乱。

3. 避免同一个 Payment Link 前后出现不同币种的支付记录。

4. 有利于商家对账和客服查询。





UI 规则：

1. Currency dropdown 置灰。

2. 不允许点击修改。

3. 展示 helper text 或 tooltip。





文案：

```Plain Text
Currency can’t be changed after this payment link has received a successful payment. Create a new payment link to use another currency.
```

中文：

```Plain Text
该 Payment Link 已产生成功支付，不能再修改币种。如需使用其他币种，请创建新的 Payment Link。
```



---



# **Preview 区域**





右侧 Preview 展示金额时，需要使用所选 currency。



示例：

```Plain Text
Product name
€10.00

Total
€10.00 EUR
```

KRW 示例：

```Plain Text
Online Korean Class
₩150,000

Total
₩150,000 KRW
```

多商品示例：

```Plain Text
Product A
€10.00

Product B
€20.00

Total
€30.00 EUR
```

如果订单总金额低于最低金额，可以在 Preview 下方同步展示轻量错误提示：

```Plain Text
Order total must be at least ₩200 KRW.
```

中文：

```Plain Text
订单总金额需不低于 ₩200 KRW。
```



---



# **Payment Links 列表页**





当前列表页 Price 列需要从只展示 USD 改为展示原始标价币种。



## **13\.1 单商品**



```Plain Text
€10.00 EUR
₩150,000 KRW
¥1,500 JPY
```



## **13\.2 多商品**





建议展示：

```Plain Text
Multiple items · EUR
Multiple items · KRW
```

如果没有 adjustable quantity，且总价固定，也可以展示：

```Plain Text
€30.00 EUR
```

建议规则：

1. 单商品：展示该商品价格 \+ currency。

2. 多商品且总价固定：展示 total \+ currency。

3. 多商品且存在 adjustable quantity：展示 Multiple items · \{currency\}，避免误导。



---



# **Payment Link 详情页**





## **14\.1 Header**





标题需要展示原始标价币种。



示例：

```Plain Text
PAYMENT LINK / kiwi for €10.00 EUR
```

KRW 示例：

```Plain Text
PAYMENT LINK / Korean class for ₩150,000 KRW
```

多商品示例：

```Plain Text
PAYMENT LINK / Multiple items · EUR
```



---



## **14\.2 Overview \- Products card**





Products table 建议展示：

Unit price 示例：

```Plain Text
€10.00 EUR
₩150,000 KRW
¥1,500 JPY
AED 500.00
```



---



## **14\.3 Details card**





新增或展示 Payment currency：

```Plain Text
Payment currency
KRW
```

新增或展示 Minimum order total：

```Plain Text
Minimum order total
₩200 KRW
```



---



# **Payment drawer**





Payment drawer 中已有 Order、Payment technical 等信息区。本次需要明确展示商家原始标价金额。



## **15\.1 Order 区域**





展示商家原始标价金额：

```Plain Text
Order total
₩150,000 KRW
```

Line items：

```Plain Text
Online Korean Class
₩150,000 KRW × 1
```



## **15\.2 Payment technical 区域**





如已有稳定币实际支付金额、网络、tx hash 等信息，保持原有展示。



本 PRD 不扩展支付流程，只要求 drawer 中不要把原始标价币种错误展示为 USD。

---



# **数据模型改动**





## **16\.1 PaymentLink 对象**





建议在 PaymentLink 顶层增加统一币种字段：

```Plain Text
{
  "id": "plink_xxx",
  "currency": "EUR",
  "minimum_order_amount": 10,
  "line_items": [
    {
      "name": "Kiwi",
      "unit_amount": 1000,
      "currency": "EUR",
      "quantity": 1
    }
  ]
}
```

说明：

1. payment\_link\.currency 是该 Payment Link 的统一标价币种。

2. line\_items\[\]\.currency 必须等于 payment\_link\.currency。

3. minimum\_order\_amount 可选保存，也可以运行时从 currency config 中读取。

4. 后端保存时必须校验一致性。

5. 如果后端希望减少冗余，也可以只在 PaymentLink 顶层保存 currency，line\_items 不保存 currency。

6. 对外 API 返回时建议仍带上 line\_items\.currency，方便开发者理解。



---



## **16\.2 Currency config**





建议新增统一配置：

```Plain Text
{
  "USD": {
    "minor_unit": 2,
    "minimum_order_amount": 10,
    "display_minimum_order_amount": "0.10"
  },
  "KRW": {
    "minor_unit": 0,
    "minimum_order_amount": 200,
    "display_minimum_order_amount": "200"
  },
  "KWD": {
    "minor_unit": 3,
    "minimum_order_amount": 50,
    "display_minimum_order_amount": "0.050"
  }
}
```

说明：

1. minimum\_order\_amount 使用 minor unit 存储。

2. USD 0\.10 存储为 10。

3. KRW 200 存储为 200。

4. KWD 0\.050 存储为 50。

5. 前端展示使用 display\_minimum\_order\_amount 或自行根据 minor unit 格式化。



---



## **16\.3 Payment / Payment Intent 快照**





Payment 成功后，需要保存当时 Payment Link 的商品快照。



补充要求：

```Plain Text
{
  "payment_link_id": "plink_xxx",
  "presentment_currency": "KRW",
  "presentment_amount": 150000,
  "line_items": [
    {
      "name": "Online Korean Class",
      "unit_amount": 150000,
      "currency": "KRW",
      "quantity": 1
    }
  ]
}
```

说明：

1. presentment\_currency 表示商家配置的标价币种。

2. presentment\_amount 表示商家标价总金额。

3. line\_items\[\]\.currency 保存交易发生时的商品币种快照。

4. 即使后续 Payment Link 商品名称、价格发生变化，历史 Payment 不受影响。



---



# **GMV 与统计口径**





## **17\.1 单个 Payment Link 详情页**





由于同一个 Payment Link 只能有一个 currency，因此该 Payment Link 的 GMV 可以直接按原 currency 展示。



示例：

```Plain Text
GMV
€1,240.00 EUR
```

KRW 示例：

```Plain Text
GMV
₩8,500,000 KRW
```



---



## **17\.2 Payment Links 列表 / 全局统计**





如果页面需要跨多个 Payment Links 汇总 GMV，需要避免直接把不同币种相加。



本期建议：



### **当前如果没有全局 GMV 汇总**





不需要改。



### **如果已有全局 GMV 汇总**





建议展示 USD equivalent，并明确标注：

```Plain Text
GMV
$12,430.00 USD equivalent
```

或者按 currency 分组展示：

```Plain Text
GMV by currency
USD 4,200.00
EUR 3,100.00
KRW 8,500,000
```



---



# **API 校验与错误码**





## **18\.1 新增校验**





---



## **18\.2 错误码建议**



```Plain Text
unsupported_currency
mixed_currency_not_allowed
invalid_currency_precision
order_total_below_minimum
currency_change_not_allowed
```



---



## **18\.3 错误文案**





### **Unsupported currency**



```Plain Text
This currency is not supported for payment links.
```

中文：

```Plain Text
Payment Link 暂不支持该币种。
```



---



### **Mixed currency**



```Plain Text
All products in one payment link must use the same currency.
```

中文：

```Plain Text
同一个 Payment Link 下的所有商品必须使用同一个币种。
```



---



### **Order total below minimum**



```Plain Text
The order total is below the minimum amount for this currency. Minimum: ₩200 KRW.
```

中文：

```Plain Text
订单总金额低于当前币种的最低金额要求。最低金额：₩200 KRW。
```



---



### **Invalid precision**



```Plain Text
Too many decimal places for this currency.
```

中文：

```Plain Text
该币种的小数位数过多。
```



---



### **Currency cannot be changed**



```Plain Text
Currency can’t be changed after this payment link has received a successful payment.
```

中文：

```Plain Text
该 Payment Link 已产生成功支付，不能再修改币种。
```



---



# **埋点**





新增或扩展以下埋点：

```Plain Text
payment_link.currency_selected
payment_link.currency_changed
payment_link.amount_validation_failed
payment_link.created
payment_link.updated
```

埋点属性建议：

```Plain Text
{
  "payment_link_id": "plink_xxx",
  "currency": "KRW",
  "line_item_count": 2,
  "order_total": 150000,
  "minimum_order_amount": 200,
  "error_code": "order_total_below_minimum"
}
```



---



# **权限规则**





沿用现有 Payment Links 权限：

本次新增币种字段不单独引入新权限。

---



# **兼容性与迁移**





## **21\.1 历史 Payment Links**





历史已创建的 Payment Links：

```Plain Text
currency = USD
```

迁移规则：

1. 所有历史 Payment Links 默认补齐 currency = USD。

2. 历史 line\_items 如已有 currency，则保持 USD。

3. 如果历史 line\_items 没有 currency，展示和接口返回时按 USD 处理。

4. 历史 Payment 记录不做反向修改。



---



## **21\.2 API 兼容**





如果 API 当前不传 currency：

```Plain Text
默认 currency = USD
```

但建议后续 API 文档中明确：

```Plain Text
currency is optional. If not provided, it defaults to USD.
```



---



# **验收标准**





## **22\.1 创建 Payment Link**



1. 新建 Payment Link 默认 currency 为 USD。

2. 商家可以选择支持列表中的其他 currency。

3. 创建 KRW、JPY、EUR、AED、KWD 等币种 Payment Link 成功。

4. 不支持列表外 currency，保存失败。

5. 所有商品自动使用同一个 currency。

6. 不允许同一个 Payment Link 内保存多个 currency。



---



## **22\.2 多商品**



1. 新增第二个商品时，自动继承 Payment Link currency。

2. 多商品场景不展示独立 currency dropdown。

3. 最多仍支持 10 个商品。

4. 达到 10 个商品后，Add another product disabled。



---



## **22\.3 最小订单金额**



1. 最小金额按订单总金额校验，不按单个商品校验。

2. 普通商品按 unit\_price × quantity 计入订单总金额。

3. adjustable quantity 商品按 unit\_price × adjustable\_quantity\.min 计入最低订单金额。

4. 订单总金额低于当前币种固定最小订单金额时，不允许保存。

5. 前端展示当前币种的 Minimum order total。

6. 后端保存时必须再次校验。



---



## **22\.4 小数位校验**



1. JPY、KRW、VND、IDR 输入小数，不允许保存。

2. KWD、OMR、BHD 超过 3 位小数，不允许保存。

3. USD、EUR、HKD 等 2 位小数币种超过 2 位小数，不允许保存。

4. 前端和后端校验规则一致。



---



## **22\.5 编辑 Payment Link**



1. 未产生成功支付的 Payment Link 可以修改 currency。

2. 修改 currency 后，所有商品 currency 一起变化。

3. 修改 currency 不自动换算价格数字。

4. 修改 currency 后，按新 currency 的最小订单金额重新校验。

5. 已产生成功支付的 Payment Link，currency dropdown disabled。

6. 已产生成功支付后，通过 API 修改 currency 返回错误。



---



## **22\.6 列表与详情**



1. Payment Links 列表 Price 列展示原始标价币种。

2. Payment Link 详情页 Header 展示原始标价币种。

3. Products table 展示每个商品的原始币种金额。

4. Details card 展示 Payment currency。

5. 单个 Payment Link GMV 按该 Link 的 currency 展示。



---



## **22\.7 Payment drawer**



1. Payment drawer 的 Order 区域展示原始标价币种。

2. Payment 快照中包含 presentment\_currency、presentment\_amount、line\_items\.currency。

3. 历史 Payment 记录不受 Payment Link 后续修改影响。



---



# **研发拆分建议**





## **Epic 1：PaymentLink currency 数据模型**



- PaymentLink 顶层 currency 字段

- line\_items currency 一致性校验

- 历史数据默认 USD

- API 返回兼容





## **Epic 2：Currency config 配置**



- 支持币种列表

- minor unit 配置

- minimum\_order\_amount 配置

- 前端读取配置

- 后端保存校验





## **Epic 3：Create / Edit 页面改造**



- Products card 顶部 Payment currency

- Unit price currency suffix

- 多商品统一 currency

- Minimum order total 展示

- Currency change warning

- 已支付后 currency disabled





## **Epic 4：金额与小数位校验**



- 小数位规则

- 订单总金额计算

- 最小订单金额校验

- 前端错误提示

- 后端错误码





## **Epic 5：列表、详情、Payment drawer 展示**



- 列表 Price 列币种展示

- 详情 Header 展示

- Products table 展示

- Details card 展示 Payment currency

- Payment drawer presentment amount 展示





## **Epic 6：统计与埋点**



- 单个 Payment Link GMV currency 展示

- currency selected / changed 埋点

- amount validation failed 埋点

- 跨币种 GMV 口径确认，如有全局汇总再处理

