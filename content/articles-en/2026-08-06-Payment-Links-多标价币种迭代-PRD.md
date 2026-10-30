---
title: "Payment Links: Multi-Currency Pricing Iteration PRD"
date: "2026-08-06"
category: "stablepay"
summary: "A proposed Merchant Portal iteration for single-currency links across multiple products, minor-unit rules, minimum order amounts, and historical payment consistency."
published: true
---

# Payment Links: Multi-Currency Pricing Iteration PRD

This proposal extends Merchant Portal Payment Links beyond USD presentment. It covers creation, editing, lists, details, payment drawers, amount validation, and data models. **Buyer-side Hosted Checkout and payment execution are separate work**; this PRD does not claim they were updated or deployed. The intended users include merchants selling across regions who need to price products directly in EUR, GBP, JPY, KRW, AED, and other local currencies.

## Release Boundary and Supported Currencies

One Payment Link has **one presentment currency**. Every line item uses it, including newly added items. A buyer cannot switch the link's presentment currency, and a merchant cannot mix currencies within its ten-product limit. This iteration does not add localized pricing by IP or browser language, a multi-currency price book, merchant exchange-rate controls, tax, subscription links, merchant default currency, settlement-currency selection, or live FX conversion for minimum amounts.

The proposed supported set is USD; EUR, GBP, AUD, CAD; JPY, HKD, SGD, KRW; IDR, PHP, VND, THB, MYR; MXN, BRL; and AED, SAR, QAR, KWD, OMR, BHD. USD remains the default for a new link. The UI can group these by region, but the backend-supported set is authoritative.

Move the Currency selector from each product block to the top of the Products section. Unit-price inputs show the chosen currency as a suffix; a new product inherits it. The API must reject a line-item currency that differs from the link-level currency with `mixed_currency_not_allowed`. The creation UI and backend must share the same currency and limit configuration, rather than each maintaining an independent list.

## Minimum Order Amount

The validation unit is the **lowest possible total order for the whole link**, not each item's price. This lets multiple inexpensive products form a valid order while preventing a buyer-adjustable quantity from taking an order below the limit.

```text
fixed item minimum = unit_price * quantity
adjustable item minimum = unit_price * adjustable_quantity.min
link minimum total = sum(item minimums)
require link minimum total >= configured minimum for its currency
```

For example, three KRW items of 50, 50, and 100 pass a KRW 200 minimum even though each is below 200. A single KRW 100 item fails. A JPY 5 item with adjustable minimum quantity one fails a JPY 20 minimum; changing its minimum quantity to four passes. Calculation must use exact integer minor units, not floating-point totals.

The proposed currency minimum is fixed configuration, served by the backend and enforced again on save. It is deliberately higher than the hosted checkout's cited 0.01 USDT/USDC payment floor, roughly targets at least USD 0.10 equivalent with a buffer, and is **not** recalculated from a live FX quote. Operations, risk, or finance can revise it. Example configuration in the source uses USD 0.10 as 10 minor units, KRW 200 as 200, and KWD 0.050 as 50. These are proposed values, not a verified production rate table. The UI shows the current minimum beside products and the order total; when invalid it gives a specific message such as `Order total must be at least ₩200 KRW.`

## Precision and Form Behavior

Both browser and API enforce the currency's minor-unit scale. The proposed examples are zero decimal places for JPY, KRW, VND, and IDR; two for USD, EUR, and HKD; and three for KWD, OMR, and BHD. Thus `1000.5` is invalid for JPY; `10.55` is valid but `10.555` is invalid for USD; `1.234` is valid but `1.2345` is invalid for KWD. The complete currency configuration must define the scale for every supported code.

Changing currency adjusts the input's allowed precision and formatting. If an existing numeric price violates the new precision, show an error and block save. **Do not silently convert the price number or use an exchange rate.** Re-evaluate the link's lowest possible order against the new currency minimum. A new item displays the link currency automatically. The preview shows the selected symbol, amount, and ISO code, and can reflect a minimum-total error without claiming the amount is payable.

## Editing and Historical Consistency

The source's high-level goal says currency cannot change after link creation, while its detailed editing rules and acceptance criteria allow a change **until the first successful payment**. This document follows the detailed acceptance rule provisionally; product and engineering should resolve the contradiction before implementation. Under that rule, a link with no successful payment can change currency, propagate the new code to every item, and revalidate all prices and minimum totals without converting numbers. After the first successful payment, both UI and API reject a currency change with `currency_change_not_allowed`; the UI explains that a new link is needed. This prevents a link's historical payments and GMV from spanning currencies unexpectedly.

## List, Detail, Drawer, and Statistics

The list's Price column and the detail header show the **original presentment currency**, not an assumed USD amount. For a fixed single item or fixed multi-item order, display the price or total with symbol and ISO code. Where adjustable quantity makes one total misleading, use `Multiple items · EUR` or its localized equivalent. Overview shows each unit price, Payment currency, and Minimum order total.

The payment drawer's Order section shows the purchased item amounts and original order total, such as `₩150,000 KRW`. Its technical section may still show the actual stablecoin amount, network, and transaction hash. These represent different facts and should not be mislabeled as the merchant's presentment amount.

A single link's GMV can be shown in its one currency. A global total across links **must not add different currencies directly**. If global GMV exists, either group it by currency or show a clearly labeled USD equivalent with a defined conversion source and time. If the current UI has no global aggregate, this release need not add one.

## Proposed Data Contract and Migration

The Payment Link has a top-level `currency`, with every `line_items[].currency` matching it when that field is present. `minimum_order_amount` can be stored on the link or read from versioned currency configuration; the implementation must decide which value governs existing links after configuration changes. The public API may return item currency even if persistence only stores the top-level value. Currency configuration includes the supported code, `minor_unit`, and `minimum_order_amount` in minor units; the frontend formats the value using that scale.

On successful payment, preserve `payment_link_id`, `presentment_currency`, `presentment_amount`, and a line-item snapshot with amount and currency. Later edits to product names or prices must not rewrite old payment facts. Existing Payment Links default to USD; missing historical item currency is interpreted as USD. Existing Payment records are **not** backfilled or reinterpreted. An API request omitting currency defaults to USD for compatibility, and the public API documentation should state that default.

The API validates supported currency, homogeneous item currencies, precision, minimum total, and the post-payment edit lock. Suggested errors are `unsupported_currency`, `mixed_currency_not_allowed`, `invalid_currency_precision`, `order_total_below_minimum`, and `currency_change_not_allowed`. Proposed events include currency selection/change, amount-validation failure, and link creation/update, with currency, item count, order total, configured minimum, and error code where relevant. They are event definitions, not evidence that instrumentation was deployed.

## Acceptance Checks and Delivery Slices

1. A new link defaults to USD; supported currencies including KRW, JPY, EUR, AED, and KWD can be selected; unsupported codes fail at save.
2. Every new item inherits the one link currency; mixed-currency payloads fail at the API; the existing ten-item maximum still applies.
3. The minimum uses the sum of fixed quantities or adjustable minimum quantities. The browser gives immediate feedback and the server rejects invalid saves.
4. Zero-, two-, and three-decimal example currencies follow the same rule in UI and API.
5. Before a successful payment, changing currency propagates and revalidates without FX conversion under the provisional detailed rule. After one succeeds, UI and API lock it.
6. List, detail, product table, payment drawer, and link GMV show the correct original currency; global statistics never combine unlike amounts without a stated conversion.
7. Historical USD links remain readable and old payment snapshots remain unchanged.

Suggested work packages cover the link model and migration, shared currency configuration, Create/Edit UI, amount validation, display surfaces, and metrics. The buyer-side checkout iteration must be coordinated separately before merchants can use new presentment currencies end to end.
