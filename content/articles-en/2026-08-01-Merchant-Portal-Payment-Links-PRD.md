---
title: "Merchant Portal Payment Links: V1 Product Requirements"
date: "2026-08-01"
category: "stablepay"
summary: "A scoped product specification for reusable payment links, hosted checkout, merchant analytics, data capture, and acceptance criteria."
published: true
---

# Merchant Portal Payment Links: V1 Product Requirements

This is a product requirements document, not a claim that every proposed feature was shipped. It defines a reusable, publicly shareable **one-time-payment** link that a merchant can create and manage in Merchant Portal, with a hosted checkout for buyers. A link does not need a customer assigned when it is created. The specifications and acceptance criteria below describe the intended v1 boundary.

## Problem and Product Boundary

An invoice addresses a known customer's receivable. A Payment Link addresses a different workflow: a merchant publishes one checkout URL for many potential buyers, without building a custom checkout or creating an invoice per buyer. The link is a persistent resource with its own configuration, status, URL, analytics, and associated payments. Each buyer visit can start a new checkout session; a successful checkout creates a separate payment or payment intent.

This distinction matters in the data model and UI:

| Object | Role |
| --- | --- |
| Product and price | Describe what is sold and at what price. |
| Payment Link | Defines a reusable way to sell those items and exposes a hosted page. It can be edited or deactivated. |
| Checkout Session | Represents one buyer's checkout attempt. |
| Invoice | Represents a bill addressed to a specific customer. |

The proposed public URL uses the `buy.stablepay.co` host, separate from a one-off `checkout.stablepay.co` experience. The host and route in the source document are product-design examples, not evidence of a live deployment. Custom merchant domains are outside v1.

The broader Payment Links concept could eventually support campaign parameters, email prefill, success-page configuration, taxes, and payment-method configuration. **Those are not v1 commitments here**; the explicit exclusions below take precedence over generic product examples in the discovery notes.

## V1 Goals, Exclusions, and Roles

The proposed v1 lets a merchant create and share a reusable link, attach up to ten product line items, control quantities, collect the information needed for fulfillment, copy a URL or download a QR code, and inspect visits, checkout starts, successful payments, GMV, and payment details in Portal. Support staff should be able to copy a URL from the list; operations and finance users should be able to inspect a payment and its customer, shipping, order, and technical context without leaving the link detail page.

Explicitly excluded from v1 are subscription links, taxes or automatic tax, invoice PDFs, merchant-selected payment methods, prefilled or locked email, configurable after-payment pages or redirects, and buy-button or embed components. StablePay controls available payment methods in this version.

| Role | Proposed access |
| --- | --- |
| Admin and Operator | Create, edit, activate or deactivate, view, and download QR codes. |
| Analyst and Readonly | View lists, link details, analytics, and payment details. |

The UI and API must enforce the same limits: at most **10 line items** per link; adjustable quantity maximum at most **100**; product description at most **5,000 characters**; product name at most **250 characters**; positive unit price with the currency's minor-unit precision. Portal-only link names use the same 250-character limit.

## Merchant Portal Experience

### List and link detail

The list has a Create payment link action and Name, Price, Status, Created, and Actions columns. Hovering a row exposes Copy URL and a confirmation toast. Its menu provides Copy URL, Edit, and Deactivate. Status distinguishes Active from Deactivated.

The detail header presents the link's Portal name, a shareable URL with copy action, a QR action, and Change name, Edit, and Deactivate actions. Overview is the default tab; Payments and analytics is the other tab. Overview shows products with images, quantities, and adjustable-quantity flags, then status, creation date, address, phone, and name collection settings. It should not imply that v1 merchants can configure an after-payment confirmation page.

The Payments and analytics tab presents unique visits, checkout starts, paid count, and GMV, followed by a payment table with ID, amount and currency, status, and creation time. Selecting an ID opens a side drawer rather than navigating away. The drawer groups:

- Payment ID, status, amount, currency, and creation time in its header.
- Customer ID when available, email, full name, phone, and locale.
- Recipient, phone, and address when shipping was collected.
- Order line items with names, unit prices, quantities, and total.
- Payment Link ID, Checkout Session ID, network, transaction hash, and confirmations where applicable.
- Metadata and collapsible raw JSON for investigation.

### Create, edit, and preview

The editor places product and option controls beside a live hosted-checkout preview, with Create link or Save changes in the top bar. Each product has required name and positive unit price, optional description and image, a currency selector from the supported set, and a quantity defaulting to one. Enabling customer-adjustable quantity exposes a min/max range, initially 1 to 100. At ten products, Add another product is disabled and explains the limit.

Email is required at checkout. The editor can additionally collect full name, mark it optional, require phone, collect shipping address, and limit the number of payments. The prototype notes describe a maximum of ten payments for the optional payment-count limit; the API contract and exact exhaustion behavior need to be settled together before implementation. Each option controls both form display and required validation, and determines which fields must be saved on the payment snapshot.

The preview reflects merchant, products, total, selected buyer fields, and a Pay action. Its payment-method area is informational; v1 does not expose a merchant payment-method picker.

### Management dialogs

Deactivate requires confirmation and tells the merchant that buyers will no longer be able to purchase through the URL. The hosted page then shows an inactive-link state and Portal marks the link Deactivated. Change name accepts up to 250 characters and explains that this name is visible only in Portal. The QR dialog shows the code and URL, with copy and download actions.

## Persistence and Checkout Contract

The proposed `PaymentLink` resource contains `id` (`plink_` prefix), `active`, Portal `name`, `url`, `line_items[]`, `options`, timestamps, creator, and metadata. Each line item stores its name, description, image URL, unit amount, currency, quantity, and `adjustable_quantity { enabled, min, max }`. Options represent email, full-name collection and optionality, required phone, and shipping-address collection. A payment-count limit is shown in the editor prototype and needs a corresponding persisted, enforced field if included in the release.

The link is anonymous at creation. When a buyer checks out, the payment or payment intent must preserve a **transaction-time snapshot** of `payment_link_id`, collected customer details, shipping details, and purchased line items. This supports audit, reconciliation, and after-sales investigation even if the link is subsequently edited. A Customer object is optional: the proposed `if_required` strategy creates or associates one only when collected details justify it, avoiding an unwanted Customer record for every anonymous visit. The decision to create a Customer must never be a prerequisite for saving the payment snapshot.

Checkout renders fields from link options. Email is required; full name is required unless the merchant explicitly marks it optional; required phone uses E.164 validation; enabled shipping collection requires at least the necessary address fields such as line 1, city, and country. Starting checkout records a start event. On success, the system creates the payment or payment intent, writes the link, order, customer, and shipping snapshots, and optionally associates a Customer under the chosen policy.

## Validation, Analytics, and Acceptance

The UI prevents adding an eleventh product, saving a description beyond 5,000 characters, saving a nonpositive price, or setting adjustable maximum above 100. The API enforces the same rules. Suggested API error codes are `payment_link_too_many_products`, `adjustable_quantity_max_exceeded`, `product_description_too_long`, and `invalid_unit_amount`. Error messages should identify the offending input and limit.

Proposed events include `payment_link.created`, `.updated`, `.deactivated`, `.copied`, `.qr_downloaded`, and `.visited`, plus `checkout.started` and `payment.succeeded` or `.failed`. Portal aggregates unique visits, checkout starts, paid count, and GMV for each link. The measurement definition for a unique visit and any cross-currency GMV display need a precise implementation contract; the later multi-currency iteration addresses currency presentation explicitly.

Acceptance checks for the proposed release:

1. One link can produce multiple payments by multiple buyers without a preassigned Customer.
2. A payment detail drawer still shows the collected buyer and shipping snapshot when no Customer was created.
3. UI and API both reject an eleventh product; UI and checkout enforce adjustable maximum 100; UI and API enforce the 5,000-character description limit.
4. Deactivation changes Portal status and makes the public page unavailable for new purchases.
5. Link detail shows the defined metrics and payment table; selecting a payment opens a complete drawer.
6. Persisted payment or payment-intent data includes `payment_link_id`, customer details, shipping, and purchased line-item snapshots.

The suggested delivery split is: link CRUD and management; editor, preview, and limits; analytics and payment-detail UI; and payment API, snapshot fields, and webhook propagation. These are work packages, not a statement that they were completed.
