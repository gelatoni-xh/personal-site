---
title: "StablePay Portal: Payouts, Claims, and Transactions PRD Addendum"
date: "2026-08-19"
category: "StablePay"
summary: "Product rules and acceptance criteria for email-based stablecoin payouts, unregistered-recipient claims, balance holds, and accounting entries."
published: true
---

# Payouts, Claims, and Transactions: PRD Addendum

**Source version:** V2.0, May 21, 2026. **Scope:** StablePay Portal Payouts, Claim, and Transactions. This is a product requirements document updated from a Clean V2 Figma prototype. It specifies intended behavior; it does not establish that every screen or rule was shipped.

The revision standardized the name **StablePay Account**; limited the main payout statuses to `paid`, `pending`, `in_transit`, `canceled`, and `failed`; added a system-generated claim code for an unregistered recipient; used the sender's Portal account password for security verification; and added a claim poster, claim errors, and an accounting Transactions page.

## 1. Problem and Scope

The Portal needed to let a merchant send USDC or USDT by email to a StablePay Account. Unlike a payout to an external wallet, this transfer does not ask for a blockchain network, network fee, or recipient wallet address. For an unregistered recipient, the sender can create a payout that holds funds from the source account. Email, a claim link, or a claim poster guides the recipient to register and claim.

The intended controls were an email one-time password (OTP) **and** a separately shared claim code, reducing the chance of a forwarded invitation or mistyped address leading to an incorrect claim. The Payouts list shows only the main payout state. A separate Transactions page explains balance-affecting holds, debits, credits, and releases.

This document did not design referral rewards or settlement, change the core external-wallet flow, support claiming to an external wallet, redesign forgot-password, or place claim status or accounting entries on the Payouts list. It only noted referral tracking and that external wallet payouts could be batched.

## 2. Terms and Prototype Coverage

| Object | Definition |
| --- | --- |
| StablePay Account | Merchant-side internal stablecoin account; one account holds one currency |
| Source account | Sender's selected funding account; determines payout currency |
| Payout | Payment object with `paid`, `pending`, `in_transit`, `canceled`, or `failed` as its main status |
| Claim / Invitation | Unregistered-recipient flow covering link, poster, code, email OTP, and claiming |
| Claim code | Six-digit number generated after creating an unregistered payout; sender shares it outside email |
| Held balance | Sender funds reserved for a pending claim payout, returned to available balance on cancellation, failure, or expiry |
| Transactions | Accounting entries for hold, debit, credit, and release |

The Clean V2 prototype covered the Payouts list and its search/filter/pagination states; creation and recipient lookup; registered and unregistered review and success; amount-limit, cannot-receive, and payout-detail states; claim invitation, verification, errors, registration and credited dashboard; Transactions; and verification, cancellation, sharing, resend and leave-flow modals. These were design frames, not implementation evidence.

## 3. Entry Points and Payouts List

The Payouts list displays payout objects with search, filtering, and pagination. It includes payout ID (single or batch), recipient (masked company or email for an account; address or recipient count for a wallet), type (`StablePay Account` or `Wallet address`), amount with currency, main status, relevant status date, and View action. A pending claim's poster, link, resend, and cancellation actions belong in its detail page.

Search should cover payout ID, email, company name, and wallet address. Status filters are All, paid, pending, in transit, canceled, and failed. Type filters are All, StablePay Account, and Wallet address. Pagination includes rows per page, result range, page number, previous, and next.

After Create payout, neither type is preselected. The two choices are:

| Choice | Customer-facing explanation |
| --- | --- |
| Send to wallet address | Send stablecoins to an external crypto wallet; batch payouts are supported |
| Send to StablePay Account | Send stablecoins by email; free when received through a StablePay Account |

The account option can have a Free badge and a modest referral-tracking hint.

## 4. Create-Payout Form

One StablePay Account is bound to one currency, so there is no separate payout-currency selector. The source account sets the currency suffix on the amount field, for example `500.00 USDC`. Change account shows each account name, currency, and available balance; changing accounts changes the suffix. An internal payout has no network selector or network fee, and the form does not show reserve balance.

| Field | Requirement |
| --- | --- |
| Recipient email | Required; valid input triggers lookup |
| Source account | Required; defaults in the design to Operating Account, USDC; can be changed |
| Amount | Required; cannot exceed available balance; an unregistered recipient has a per-payout limit of USD 1,000 equivalent |
| Memo | Optional; appears in review, detail, email, and claim views |
| Fee | StablePay Account payout displays Free; standard external payout fee may be shown for comparison |

Recipient lookup has three distinct results:

1. **Account found:** the email is linked to a receivable StablePay Account. Show a masked company name, not the full email as lookup identification, and allow review.
2. **Not registered:** explain that the payout will be held, email invitation sent, and email verification plus claim code required; allow review.
3. **Cannot receive:** an existing associated account is restricted by business, compliance, risk, region, or freeze state. Block creation and offer Notify recipient or Cancel.

## 5. Review and Sender Verification

For an unregistered recipient, review shows the **full email** so the sender can check what they entered. The USD 1,000-equivalent limit should already block at the amount step, rather than appear as the main review warning. An invitation-email preview shows what the recipient will receive. The code note says a code will be generated after creation and must be shared separately.

Both registered and unregistered payouts require sender verification on Confirm payout. The modal asks for the existing StablePay Portal **account password**, not a separate funds password, and an email verification code sent to the sender's login or security email. Forgot password uses the existing flow. Cancel returns to review; a successful check creates or submits the payout.

## 6. Unregistered Recipient: Creation and Sharing

The success page says that the invitation was sent and the recipient must register and claim. It displays amount, recipient, expiry, and the generated six-digit claim code with Copy code. Create poster is the primary action; Resend email, Copy claim link, and Cancel payout are secondary.

The claim code is generated only after payout creation. The sender shares it through a different channel. It must **not** appear in the invitation email, claim link, QR code, or poster. A recipient must prove control of the specified email through OTP and enter this code before registration and claim. An invalid code gets a local error such as “Claim code is incorrect. Ask the sender to share the latest code.” This is a risk-reduction measure, not a guarantee against every misdirected payment.

The poster supports messaging channels such as WeChat, WhatsApp, Telegram, or direct chat. It masks the recipient email, is bound to one payout and email, and is distinct from the open invitation link. An open invitation link is for general registration, with no designated email or held funds.

## 7. Recipient Claim Flow

The invitation email should use a simple layout that works in email clients. Its example subject is “Apex Trading Ltd. sent you 500 USDC via StablePay.” The body states the amount and deadline, asks the recipient to use the addressed email to create or access an account, and uses “Claim stablecoins” as its action. If present, a short memo appears. A security note explains that both email verification and the separately shared code are needed. The code itself is never emailed.

The claim page shows “Verify email to claim,” the amount, sender, masked recipient email, and Send code. The email OTP helper identifies the masked address; the claim-code helper explains that the sender shares a separate six-digit code. Incorrect OTP or code produces a local field error rather than a new exception flow. After successful verification, the user enters the existing StablePay Account registration path; on completion the Portal dashboard shows credited or withdrawable funds according to the final claim behavior. Whether an additional explicit “Claim to my StablePay Account” click is required remained open.

## 8. States

| Payout status | Meaning |
| --- | --- |
| `pending` | Processing; for an unregistered recipient this may include waiting for claim |
| `in_transit` | Moving through payment, bank, or internal processing |
| `paid` | Payment completed |
| `canceled` | Canceled by sender or system |
| `failed` | System, risk, or compliance failure |

Only these main statuses appear in the Payouts list and detail. Claim or invitation has its own state:

| Claim status | Meaning |
| --- | --- |
| `pending` | Invitation sent; awaits email verification, code, registration, and claim |
| `verified` | Email OTP and code passed; recipient proceeds to registration or login |
| `claimed` | Recipient completed claim; system proceeds toward paid |
| `expired` | Link and poster no longer valid |
| `canceled` | Sender canceled before claim |
| `failed` | Claim failed or went to manual review |

Claim state belongs in payout detail, the claim page, or internal operations, not in the Payouts list where it would make `pending` ambiguous.

## 9. Funds and Accounting Transactions

| Event | Sender available | Sender held | Recipient balance |
| --- | --- | --- | --- |
| Create pending claim payout | Decrease by amount | Increase by amount | No change |
| Payout paid | No change | Decrease by amount | Increase by amount |
| Canceled, failed, or expired | Increase by amount | Decrease by amount | No change |

Transactions shows entries that affect balances, not a general event history. Sending email or copying a poster is excluded.

| Entry | Accounting effect |
| --- | --- |
| `hold` | Available -500; held +500 when a pending claim payout is created |
| `debit` | Held -500 when the sender's payout is paid |
| `credit` | Recipient balance +500 |
| `release` | Held -500; available +500 after cancellation, failure, or expiry |

## 10. Detail Views and Actions

A pending-claim detail shows the claim code and poster, and offers resend email, copy link, and cancel. Cancel requires a confirmation modal but not the sender's Portal password. A successful payout detail shows amount, recipient, source account, memo, and timeline, without a download-receipt action. Expired and canceled details explain that the held amount returned to available balance; an expired link is invalid. The open invitation link is separately explained as general registration with no reserved funds.

## 11. Risk Limits and Notifications

| Control | Proposed value or behavior |
| --- | --- |
| Unregistered-recipient payout limit | USD 1,000 equivalent per payout; block at amount entry |
| Default expiry | Seven days; release held funds on expiry |
| Maximum expiry | Not sender-configurable in V1; backend maximum could be 14 days |
| Sender's unregistered payouts | Suggested daily limit of 10 |
| Invitations to one recipient email | Suggested daily limit of three |
| Resend email | Suggested minimum interval of 10 minutes |
| OTP attempts | Suggested limit of five |
| Claim-code attempts | Escalate after a threshold to risk review or manual handling |
| Near-limit or rapid invitations | Pending or manual review |

Notification templates covered the recipient invitation, sender confirmation with claim code and cancellation guidance, claimed/paid confirmation, expiry with released funds, and optional cancellation notice to the recipient.

## 12. API and Data Requirements

Recipient lookup should return `found`, `not_registered`, or `cannot_receive` plus a privacy-safe display name. Payout creation must check source-account ownership, currency, available balance, recipient limits, and risk rules. Sender verification uses the Portal account password and email OTP. Claim validation checks token, recipient email OTP, claim code, account eligibility, and that the payout has not been canceled, failed, or expired.

The suggested records were:

| Object | Key fields |
| --- | --- |
| Payout | ID; sender and recipient account IDs; recipient email; source account; currency, amount, fee, status, type, memo, and lifecycle timestamps |
| PayoutClaim | Payout ID; recipient email; **hashed** claim token and code; status, expiry, verification and claim timestamps, failed-attempt count |
| Transaction | Account and payout IDs; type, currency, amount, direction, balance bucket, counterparty, timestamp, description |
| Notification | Payout ID; template, recipient, channel, status, sent timestamp |

## 13. Acceptance Criteria

1. Create payout requires an explicit choice between wallet address and StablePay Account.
2. The account form has no network or network-fee selector; amount shows the source-account currency.
3. Found-recipient lookup masks business identity rather than exposing full details.
4. An unregistered-recipient payout can be created and moves sender funds into held balance.
5. Creation generates a claim link, poster, and code; the code is absent from email, link, and poster.
6. Claim verifies the addressed email by OTP and then the sender-shared code.
7. The list exposes only the five main payout statuses, never claim state.
8. The list supports search, status/type filtering, and pagination.
9. Canceling a pending claim requires confirmation, not a Portal password.
10. Sender verification uses the Portal account password and offers Forgot password.
11. Successful payout detail has no download-receipt action.
12. Transactions contains balance-affecting accounting entries only.

These are acceptance criteria in the PRD, not a report of test results.

## 14. Open Questions

- Does the claim code expire with the link, or can it be refreshed separately?
- Does registration automatically credit the recipient, or does the recipient make one final explicit claim? The prototype leaned toward an explicit action.
- Should Transactions support CSV export, and should the sender see recipient-side credits?
- How much of a failed payout's reason should be exposed: risk, compliance, system, or balance failure?
