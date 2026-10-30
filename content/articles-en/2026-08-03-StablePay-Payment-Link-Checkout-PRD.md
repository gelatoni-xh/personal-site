---
title: "StablePay Payment Link Checkout: Buyer Experience PRD"
date: "2026-08-03"
category: "stablepay"
summary: "Buyer-side requirements for a reusable payment link: order display, data collection, payment execution, snapshots, edge cases, and acceptance tests."
published: true
---

# StablePay Payment Link Checkout: Buyer Experience PRD

This proposed v1 buyer experience completes the Payment Links flow described in the Merchant Portal PRD. A Payment Link is publicly shareable and reusable; it is not an invoice for a named customer. The buyer-facing page reads the merchant's link configuration, collects required information, and hands payment execution to a reusable StablePay payment module. The document describes requirements and suggested work packages, not a verified launch.

## Scope and Design Principle

The page needs three responsibilities: show the order and amount accurately, collect only the configured buyer fields, and let the buyer pay using StablePay's stablecoin payment capability. The payment component should be modular enough for a later Invoice hosted checkout. The proposed Payment Link URL uses `buy.stablepay.co`; this URL describes the intended product route rather than proving the service is live.

V1 supports one or multiple products and adjustable quantities, a checkout session for each attempt, link-level visits and payment analytics, and a payment snapshot for reconciliation. It excludes subscription links, tax calculation, merchant-defined payment-method lists, email prefill or locked prefill, custom after-payment redirects and confirmation pages, and embedded buy buttons.

The page layout has a merchant name, language switcher, detail control, and a Sandbox marker in test mode; then order information, buyer fields, payment module, and a persistent Pay action with legal links. The payment module covers wallet selection, network/currency guidance, initiation, and status feedback. Its routes are implementation choices: the draft sketches separate crypto-transfer and wallet routes but does not prescribe their misspelled example paths as an API contract.

## Order and Amount Display

For one product, show its image when available, name, amount, unit-price explanation where relevant, and quantity. If the merchant enabled adjustable quantity, the buyer can change it within the configured range, never above **100**. For multiple products, keep the initial view concise with the total and a View details control. Expanded details show every item, image, name, quantity, unit price, subtotal, and total; the link permits at most **10** items.

Any quantity change must update the line-item subtotal, total, and amount passed to the payment module together. Product name is limited to **250 characters**, description to **5,000**, and unit price must be positive and obey currency precision. These are inherited Payment Link constraints; checkout must not assume a trusted browser value is valid simply because Portal validated creation.

## Buyer Information and Transaction Snapshots

Fields derive from the Payment Link's `options` or `required_customer_fields`. The established Portal configuration covers email, full name, phone, and shipping. This checkout draft also proposes business name for B2B collection; that proposal requires a matching Portal option and payment field before it can be considered in scope.

| Field | Intended behavior |
| --- | --- |
| Email | Visible and required; validate before Pay. |
| Full name | Required, optional, or hidden according to link settings. |
| Phone | At least required or hidden in v1; validate a required number as E.164. |
| Business name | Proposed as optional or required for B2B use; contract with Portal remains to be agreed. |
| Shipping address | When required, collect line 1, city, state/province where applicable, postal code, and country; do not proceed with an incomplete required address. |

Only configured fields appear, required labels are clear, and inline errors appear below fields without preventing further typing. Validate all required values before starting payment. Preserve entered data in the checkout session and, after success, copy it into the Payment or Payment Intent. A reusable Customer can hold longer-lived identity details, but a **payment snapshot** is the authoritative historical record for that purchase even if the Customer is later edited. Customer creation/association follows the configured `always` or `if_required` policy; the Portal v1 proposal defaults to `if_required`.

The proposed Checkout Session contains its ID, `payment_link_id`, line items, customer details, shipping, locale, metadata, client reference, UTM attribution, and status. The Payment or Payment Intent stores optional `customer_id`; `customer_details` with email, name, business name, phone, and locale; shipping recipient, phone, and address; `payment_link_id` and `checkout_session_id`; client reference and UTM source/medium/campaign/term/content; and a purchased line-item snapshot of name, description, unit amount, currency, quantity, and image URL. Storing the order at payment time prevents later link edits from changing historical reconciliation.

## Flow and Failure Handling

1. On open, resolve the link and require that it exists and is active. Show a clear inactive state when it is unavailable.
2. Load the configured products, quantities, buyer fields, and available payment module. Let the buyer inspect details and edit permitted quantities.
3. On Pay, recheck the link's active state and the form, quantity range, and amount. Create or update the checkout session, then invoke the selected payment flow. Rechecking matters because a merchant may deactivate the link after the page was opened.
4. On success, create the payment record and its link, buyer, shipping, order, and checkout snapshots; optionally associate a Customer; show success.
5. On failure or cancellation, show the outcome while retaining the form and selected options for retry.

An invalid or deactivated link must not continue to payment. Validation includes malformed email or phone, incomplete address, missing payment method, and quantity outside the configured range. A wallet or network that becomes unavailable should be disabled or fall back without hiding other viable methods. The draft also calls out region restrictions, 404, unsupported currency, and a test-mode banner; precise regional policy and unsupported-currency behavior require implementation decisions, not assumptions from this PRD.

## Measurement and Acceptance

Proposed page events are `payment_link.visited`, `checkout.started`, `checkout.detail_expanded`, `checkout.quantity_updated`, `checkout.field_validation_failed`, `payment_method.selected`, `pay.clicked`, and payment success, failure, or cancellation. Merchant Portal aggregates unique visits, checkout starts, paid count, and GMV per link. Implementations need a consistent definition of unique visit and currency-aware GMV.

The proposed acceptance tests cover both single- and multi-product rendering, correct quantity and payment-amount updates, exact adherence to configured fields, rejection of incomplete required fields before Pay, reusable payment-module integration, and a successful Payment or Payment Intent containing `payment_link_id`, `checkout_session_id`, `customer_details`, `shipping`, and `line_items`. The Portal metrics must reflect the buyer-side events correctly.

The suggested work sequence is page container and states; quantity/amount coupling; dynamic buyer fields and validation; reusable payment-module contract; then payment-model extensions and analytics. Each item is a planned delivery slice, not a completion claim.
