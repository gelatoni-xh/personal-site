---
title: "StablePay Fee Management and Merchant Billing: Technical Design"
date: "2026-08-11"
category: "StablePay"
summary: "A cross-system design for fee configuration, calculation, execution records, merchant bills, auditability, migration, and rollout verification."
published: true
---

# StablePay Fee Management and Merchant Billing: Technical Design

This is a proposed technical design, informed by existing code paths and a production settlement sample. It is not a statement that `chargecore` or every downstream integration was deployed. The related cross-system impact assessment documents the observed business flows in more detail. Here the focus is the **target ownership, runtime contract, persistence model, rollout, and validation**.

## 1. Problem, Scope, and Ownership

Merchant-specific pricing already existed, but fee configuration and results were split among `merchantcore`, T+1 settlement, FX quotation, funding, Payouts, legacy billing, and Portal. The existing `billprod` query returned old bill summaries and downloads, not a transaction-level fee fact. A June 2026 production settlement sample showed fees in `settlement_summary.payment_fee_amount` while `settlement_detail.fee_amount` and its snapshots could still be zero or empty. That observation is a reason to create per-event fee records, not to copy the detail's old fee field.

The proposed `chargecore` owns **which fee items apply, their amounts, configuration lineage, execution-result records, and fee queries**. `merchantcore` continues to own merchant identity, product enrollment, and charge eligibility. `settleplatform`, `fundprod`, and `payout` continue to own actual holds, debits, credits, transfers, failure releases, and business state. `exchangerate` continues to price On/Off Ramp product fees through spreads. The design does not centralize money movement or redesign FX configuration.

| Component | Target role |
| --- | --- |
| `payadmin` | Product and channel fee management, fee-record investigation, and permissioned audit views. |
| `chargecore` | Configuration matching, calculation, itemized result records, merchant bill aggregation, and query APIs. |
| `settleplatform` | T+1 fee execution for payment products and settlement accounting. |
| `fundprod` | Realtime funding/withdrawal execution and spread-result recording. |
| `payout` | Realtime batch fee execution and successful-item settlement. |
| `merchantportal` | Merchant fee bill display via `chargecore`, without implementing fee rules locally. |
| `agencyprod` | Consumer of succeeded fee facts for its own commission logic. |
| `billprod` | Existing summary/download path retained during this release. |

Included work is the new charge service and configuration models, PayAdmin configuration and detail UI, integration of the three executors, and a new Merchant Portal fee-query page. Excluded work includes replacing `billprod.billing_detail`, rewriting existing hold/release intermediate states, complete historical backfill, and detailed dual-write migration scripts. Payroll is reserved in configuration and product enums but had no existing flow to migrate in this assessment.

## 2. Design Decisions

**One fee item per result row.** One business event may match product, risk-control, platform, and other channel fees. A row per item retains the classification needed by finance, merchant bills, operations, and commissions. A merchant bill row is an *aggregation* of those facts, not the fact's storage grain.

**Configuration and result storage are different.** `product_service_fee_package`, `merchant_product_service_fee_config`, and `channel_service_fee_rule` belong in ChargeCore's MongoDB configuration store. `transaction_fee_record` belongs in MySQL; MySQL also holds `fee_config_audit_log`. Logical references do not require cross-store foreign keys.

**Configuration price and charged currency are distinct.** The initial rule set prices fixed fees and monetary conditions in USD. Result rows separately store the business base currency and the actual fee currency, such as USD, USDT, or USDC. A conversion from configuration currency to charged currency must be reconstructible from `fee_snapshot`. Money is stored as `bigint` in currency minor units; percentages and FX rates use decimal types.

**Do not add `visible_to_merchant` as a physical column in this release.** The merchant bill query includes ordinary product and channel fees but excludes On/Off Ramp product fees embedded in FX spreads. This is a fixed query rule. Those spread fees still enter the unified result stream and retain `exchange_rate_quote` lineage.

**Version configuration and freeze charged facts.** Editing a configuration creates a new version under the same business ID and marks the old one `SUPERSEDED`. A status-only change updates the latest version and writes an audit event without incrementing version. A result row contains both `fee_source_ref_type/id/version` and a full `fee_snapshot`; it must never recalculate historical fees against the current configuration. Exchange-rate quotes can use quote ID plus snapshot when they have no version.

**Calculate percentage fees once.** ChargeCore rounds each percentage fee **up to the smallest currency unit** with `ceil(base_amount * percentage_rate)`; a fixed amount enters at its configured value. Callers use returned fee components and totals for display, holds, transfer, persistence, and tests. FX-spread product fees are calculated by the FX path and retain its own rounding rule. Past records are not repriced.

## 3. Configuration Models and Rules

| Model | Matching and lifecycle |
| --- | --- |
| `product_service_fee_package` | One standard package for a product; latest ACTIVE version is the fallback when no merchant-specific configuration matches. It can contain percentage and fixed components. No effective interval or rule-conflict check is proposed. |
| `merchant_product_service_fee_config` | Direct merchant/product override with `effective_at` and optional `expires_at`; it does not reference a standard package. Current and future ACTIVE intervals for one merchant/product must not overlap. Historical rules are not edited. |
| `channel_service_fee_rule` | Product plus fee item and optional conditions. Multiple matching ACTIVE rules may stack, even with identical conditions; there is no conflict suppression. Edits create versions; status changes do not. |

The proposed product codes include `payment`, `payment_link`, `invoice`, `subscription`, `payouts`, `on_ramp`, and `off_ramp`, with `payroll` reserved. The source PRD's *baseline examples* include Payments at 1%, Payment Links at the Payments rate, Invoicing at 0.1%, Subscription at 1.3%, Payouts at 0.1% plus USD 3 per batch, and On/Off Ramp at 0.5% through exchange-rate spread. They are design inputs to confirm during release initialization, not a current public price list. The then-current Invoice settlement mode also differed from its desired realtime mode, so it must not be silently treated as migrated.

Channel rules have `fee_item` values such as `platform_service_fee`, `channel_fee`, `bank_fee`, and `risk_control_fee`. `charge_mode=default` requires empty conditions; `conditional` requires nonempty conditions combined with AND. Conditions are structured `field + operator + value + optional currency`, validated through server DTOs and enums rather than arbitrary JSON. The first release opens `channel` equality and `transaction_amount` comparison (`eq`, `lt`, `lte`, `gt`, `gte`); an inclusive range is represented by one `gte` and one `lte`. `source_biz_type` is reserved for later matching. Each rule permits at most one channel condition and one amount expression/range, and amount conditions in this release use USD. Two or more matching channel rules intentionally produce separate fee items and a summed fee.

Percentage and fixed fields cannot both be empty. A fixed amount requires a currency. The standard package, merchant override, and channel rule IDs are string business IDs, independent of their version; physical MySQL result rows use a bigint primary key for index cost. PayAdmin retains its existing permission framework and legacy fee-entry permissions while adding specific access for standard product fees, merchant overrides, channel rules, and detail queries.

## 4. Result Record and Runtime Contract

`transaction_fee_record` has one row per fee item. Its important dimensions are merchant, product, fee category/item/channel, `source_system`, `source_biz_type`, business ID, charging-event ID, base amount/currency, percentage and fixed components, final fee/currency, `realtime` or `t1` timing, source reference, immutable calculation snapshot, status, and charge/creation times. The result may be `pending`, `succeeded`, or `failed`; status describes the fee record's execution outcome, **not** the business order's intermediate state. Merchant and commission queries default to succeeded rows.

The proposed idempotency key is:

```text
source_system + source_biz_type + source_biz_id + source_event_id
  + fee_category + fee_item + fee_channel
```

The event ID distinguishes charging events under one business object. T+1 payment fees use a payment ID as the business ID and a `settlement_detail.id` as event ID. A Payout batch uses the batch ID as its business ID; the fixed fee uses the batch ID as event ID, while per-recipient percentage and risk fees use `payout_item.id`. On/Off Ramp normally use their deposit or withdrawal request ID for both. A unique database index enforces the key; additional indexes support merchant/date bill queries, product/category, fee-source investigation, and charge-time windows.

The main callable contract has three steps:

1. `CalculateFees` accepts request-level merchant, source system, charge timing, fee currency, and context, plus one or more per-event items with product, source identities, base amount/currency, and channel context. It returns every matched component, totals, allocation where relevant, and snapshots. It **does not** write a fee record or claim money was charged. A request cannot mix merchants.
2. `CreatePendingFeeRecords` creates one pending record per component **before** real money movement. It fixes amount, currency, source reference, and snapshot at creation and is idempotent on the event/item key.
3. The business executor performs its money movement, then calls `UpdateFeeRecordStatus` to move each row only from pending to succeeded or failed. Status update can add `charged_at` but cannot rewrite amount, currency, or source reference.

For a T+1 settlement summary, `settleplatform` can send all of that merchant's `settlement_detail` items in one `CalculateFees` request. Realtime funding can send one item. Payout sends one top-level batch item with `fee_allocation_items[]`: ChargeCore calculates the percentage component per recipient, while a product fixed fee is applied once per batch; Payout later charges successful-item fees only. An externally calculated FX-spread fee skips `CalculateFees` but still uses pending-record creation and final-status update, with quote provenance in the snapshot.

`GetEffectiveProductServiceFeeConfig` and `MatchChannelServiceFeeRules` are diagnostic APIs, not calls for business systems to reassemble prices locally. `QueryTransactionFeeRecords` supports operations filters across merchant, origin, product, category, item, timing, status, currency, and time. `QueryMerchantFeeBills` filters to succeeded, merchant-visible fees and aggregates by source transaction, returning product, channel, and total fees, original transaction amount/currency, settlement amount, items, and pagination. Merchant Portal's proposed `GET /api/v1/merchant-fee-bills` delegates to that query. `agencyprod` can consume succeeded fee facts but decides its own commissionable categories; channel fees must not become commission revenue by accident.

If recording a result fails, the executor logs compensation work and retries or sends it to a controlled manual repair flow. It must not mark a row succeeded before money movement and hope an asynchronous debit later works. Idempotent replay by source system and business ID supports repair.

## 5. Audit, Monitoring, and Rollout

`fee_config_audit_log` stores configuration type, business ID, action (`create`, `update`, `inactivate`, `delete`), before/after versions and complete snapshots, operator, request ID, and time. A supersession caused by an edit is represented within one update event, not as an extra audit action. FX configuration audit stays in its existing system.

Proposed monitoring covers calculation count/failures, result-write count/failures, channel-rule match count/failures, merchant-bill query count/latency, abnormal pending-to-final transition failures, any `fundprod` fallback to legacy Mongo channel fees, and Portal query errors. These are proposed observability signals, not measured outcomes.

Release initialization writes only **confirmed launch rates** as ChargeCore `version=1`. This version means the first ChargeCore release, not a reconstructed historical rate. Merchant-specific configuration is initialized only when explicitly confirmed. Historical charged results are not a deployment prerequisite; later backfill should include only rows whose actual amount, currency, and classification can be established. The old billing route remains available.

The proposed sequence is ChargeCore schema and RPC, then PayAdmin configuration/query, then staged `settleplatform`, `fundprod`, and `payout` integration with reconciliation, then Merchant Portal bill display, followed by merchantcore boundary cleanup. ChargeCore can be deployed before executors switch. Rollback is by business-system integration code or prepared hotfix branch, with the new merchant page released after fee records are stable; the design does not rely on a large toggle matrix.

## 6. Verification Plan and Open Contract

Unit tests should cover fixed-fee currency requirements, matching and stacking channel rules, rounded percentage components, merchant override precedence and interval overlap, result-status transitions, idempotency, and merchant-bill aggregation and spread filtering. Integration tests cover PayAdmin to ChargeCore, T+1 settlement batch calculation and record lifecycle, realtime funding and FX-spread record lifecycle, Payout batch allocation, and Portal bill queries. Regression checks protect Payout totals, FX quotation, and commission category selection.

During staged rollout, compare each executor's actual debit or fee transfer with the sum of succeeded ChargeCore records and compare Portal rows with merchant-visible records. For T+1, use completed settlement samples to preserve summary fee/net relationships, pending samples to verify no premature charge, and pipeline records to verify calculate → pending record → balance update → final status ordering. Refund details should stay outside `CalculateFees` under the observed zero-refund-fee path. On/Off Ramp rows must retain quote lineage while hiding spread fees from merchant bills; channel fees must remain distinguishable from product fees. These are **planned checks**, not a report that a rollout passed.

The remaining model-level question is to freeze `source_biz_type` values for each payment, Payout, and funding flow so the same business event is identified consistently across execution, query, and idempotent replay. Detailed business-context gaps and production comparison queries belong to the related impact assessment.
