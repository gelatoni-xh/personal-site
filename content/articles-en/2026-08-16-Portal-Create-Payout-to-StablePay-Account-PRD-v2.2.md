---
title: "StablePay Portal: Create Payout to StablePay Account PRD V2.2"
date: "2026-08-16"
category: "stablepay"
summary: "A revised product specification for email and account-number payouts, recipient claims, unified payout states, batch results, and balance records."
published: true
---

# Create Payout to StablePay Account: PRD V2.2

This PRD reflects the Clean V2 prototype and revises the earlier Payouts/Claim/Transactions addendum. **V2.2 uses `completed` as the main payout state, replacing the earlier `paid` label.** It also adds transfers by eight-digit Account No., separates email verification from the later claim-code step, and represents partial batch success in `Result` rather than a new main status. These are specified requirements, not a claim that every flow was shipped.

## 1. Background and Goals

StablePay merchants could send stablecoins to external wallet addresses through Payouts. The proposed feature would also let a merchant send USDC or USDT to another StablePay Account, identified by recipient email or an eight-digit StablePay Account No. A registered and eligible recipient would receive an internal transfer. For an unregistered email, the sender could create a pending claim payout, hold the funds, and invite the recipient through email, a link, or a poster. A claim code would be shared separately.

The product goals were free, immediate internal transfer for eligible registered recipients; one currency per account, with the source account determining payout currency; a staged email OTP, registration/login, dashboard pending-claim, and code-verification flow for unregistered recipients; and a unified Payouts list that shows only the main payout object. Legacy wallet-address and batch execution would continue under their own subobjects.

This PRD did not design referral commissions, agency settlement, or a new external-wallet execution engine. It did not allow an unregistered recipient to claim directly to an external wallet or redesign forgot-password. The Payouts list would not show network, network fee, claim code/status, invitation status, batch-item status, or accounting entries. A completed detail page would not offer Download receipt.

## 2. Objects and Ownership

| Object | Meaning |
| --- | --- |
| StablePay Account | Internal merchant funds account with a distinct eight-digit Account No. and one currency, USDC or USDT |
| Source account | Sender's selected account; its currency is the payout currency |
| Account No. | Eight-digit numeric recipient identifier, for example `00000022`; only for an existing account |
| Recipient identifier | Email when input contains `@` or letters; Account No. when input is all digits |
| Payout | Unified external-facing object for Portal list, detail, filters, export, and webhooks |
| PayoutClaim | Unregistered-email claim state, hashed code, and validation attempts |
| PayoutInvite | Unregistered-email invitation, email, link, and poster |
| Transaction | Balance-affecting accounting entry, not an email or share event |

The proposed model mapped both new account payouts and older wallet/batch payouts into one `payouts` main object. New `stablepay_account_payouts`, `payout_claims`, and `payout_invites` held their subflow data; legacy `payout_batches` and `payout_items` retained wallet/batch execution detail. Subflow status should not become a Payout main status.

## 3. Proposed Unified Payout Record

The suggested Payout fields were `id`, `object`, `merchant_id`, `type` (`stablepay_account | wallet_address`), `mode` (`single | batch | claim`), `status`, `status_reason`, and optional `result_summary`. Recipient fields included identifier type and value, privacy-safe display text, and optional email, account number, account ID, or wallet address. Funding fields included source account ID and number, currency, amount, fee, and a nullable network fee. Optional `batch_id`, `claim_id`, and `invite_id` linked subflows. Creation, start, completion, cancellation, failure, and expiry timestamps, failure code/message, and metadata completed the object.

```json
{
  "id": "po_xxx",
  "object": "payout",
  "merchant_id": "xxx",
  "type": "stablepay_account",
  "mode": "claim",
  "status": "pending",
  "status_reason": "waiting_for_recipient_claim",
  "result_summary": null,
  "recipient_identifier_type": "email",
  "recipient_identifier": "new.user@example.com",
  "recipient_display": "new.user@example.com",
  "recipient_email": "new.user@example.com",
  "recipient_account_no": null,
  "recipient_account_id": null,
  "recipient_wallet_address": null,
  "source_account_id": "acct_xxx",
  "source_account_no": "00000022",
  "currency": "USDC",
  "amount": "500.00",
  "fee_amount": "0.00",
  "network_fee_amount": null,
  "batch_id": null,
  "claim_id": "claim_xxx",
  "invite_id": "invite_xxx",
  "created_at": "2026-06-10T10:00:00Z",
  "started_at": null,
  "completed_at": null,
  "canceled_at": null,
  "failed_at": null,
  "expires_at": "2026-06-17T10:00:00Z",
  "failure_code": null,
  "failure_message": null,
  "metadata": {}
}
```

The JSON is an illustrative proposed record; values such as IDs and timestamps are examples.

## 4. Main Payout State Machine

`Payout.status` indicates the main object's externally visible phase. Claim, invitation, and batch-item details stay below it. A batch with partial success uses `completed` plus a result summary.

| Main status | Meaning | Typical case |
| --- | --- | --- |
| `pending` | Created, not yet finally paid out | Awaiting recipient claim, queued wallet batch, or risk review |
| `in_transit` | In execution, not yet complete | Wallet broadcast/confirmation or batch processing; internal account transfer usually spends little time here |
| `completed` | Main process ended | Internal credit, successful wallet payout, or finished batch with all or some items successful |
| `canceled` | Sender or system canceled it | Pending claim canceled; expiry released funds and invalidated link |
| `failed` | Overall payout failed | System, risk/compliance, recipient-eligibility, or unrecoverable chain failure |

The following are **not** main statuses:

| Value | V2.2 representation |
| --- | --- |
| `paid` | Replaced by `completed` in UI, API view model, and filters |
| `pending_claim` | `status_reason = waiting_for_recipient_claim` or `Claim.status` |
| `claimed_processing` | Claim or internal processing state |
| `expired` | `Payout.status = canceled`, `status_reason = expired` |
| `partial_success` | `Payout.status = completed`, with `status_reason` or `result_summary` showing counts |

## 5. Create-Payout Entry and Form

After Create payout, neither option is preselected. The choices are “Send to wallet address” (one or several external addresses, with batch upload; network and network fee may apply) and “Send to StablePay Account” (by email or Account No., free when received internally). The latter can show a Free badge and a light referral-tracking hint.

An account holds one currency. There is no separate payout-currency dropdown: the amount field shows the selected source account's currency suffix, such as `500.00 USDC`. Change account shows name, Account No., available balance, and currency; switching updates both amount and summary. An Account No. recipient must hold the **same currency** as the source, or creation is blocked with a prompt to switch source account.

| Form field | Rule |
| --- | --- |
| Source account | Required; show recent/default Operating Account and allow switching, with name, available balance, and currency |
| Recipient email or Account No. | Required; input with `@` or letters is treated as email, all-digit input as Account No.; Account No. must be eight digits and exist |
| Amount | Required, greater than zero, no more than available balance; show source currency; unregistered email capped at USD 1,000 equivalent per payout |
| Memo | Optional; propagate to detail, invitation email, claim page, and pending-claim dashboard |
| Fee | Internal account payout is Free; do not display network or network fee |

## 6. Recipient Lookup

Input containing `@` or letters follows email validation and account lookup. All-digit input follows eight-digit Account No. validation. Other formats cannot proceed. Lookup must run before Continue.

| Email lookup state | UI and action |
| --- | --- |
| `not_checked` | No input or lookup; force lookup before continuing |
| `account_found` | Show account found with a masked company name, not full merchant name, KYB details, or balance; allow review |
| `not_registered` | Allow pending claim; explain seven-day expiry, email OTP, separate claim code, and sender sharing |
| `cannot_receive` | Associated account cannot receive; block and offer Notify recipient or Cancel |
| `self_recipient` | Block sending to the sender's same account |
| `invalid_email` | Show format error |

| Account No. lookup state | UI and action |
| --- | --- |
| `account_found` | Show masked company, number, and currency; allow review only on currency match |
| `not_found` | No account; block, since Account No. cannot invite an unregistered user |
| `currency_mismatch` | Show recipient and source currencies, ask sender to switch source account |
| `cannot_receive` | Existing account cannot receive; block |
| `self_recipient` | Block sending to the same account number |
| `invalid_account_no` | Not eight digits; show Check account no. |

## 7. Review and Sender Verification

The **registered** review applies to an eligible email or Account No. match with matching currency. It shows masked company, identifier type, source account, amount and currency, Free fee, and memo. No invitation preview is needed. Confirm payout opens a verification modal; on success, the internal transfer reduces sender available balance, increases recipient available balance, and sets `Payout.status = completed`.

The **unregistered-email** review is available only for `not_registered`, never for a missing Account No. It shows the full email for a final sender check, memo, and an invitation-email preview. It explains that funds remain held until claim, expiry, or sender cancellation. The USD 1,000-equivalent limit is enforced at amount entry instead of being the main review warning. “Create payout and send invitation” opens the same security modal.

The modal requires the sender's existing **StablePay Portal account password**, not a separate funds password, and an email verification code sent to the sender's login email. It offers the existing Forgot password route without redesigning it. Cancel or Back closes the modal and preserves review content. Both registered and unregistered creation require verification.

## 8. Registered Recipient Execution

After verification, the system creates the Payout main object; debits sender available balance and credits recipient available balance; and writes sender debit and recipient credit transactions. The Payout is `completed`, `mode = single`, `type = stablepay_account`. It can notify both parties of completion, but sends no invitation and creates no claim code. Completed detail is view-only and has no Download receipt.

## 9. Unregistered Email: Hold and Invitation

Successful creation establishes:

```text
Payout.status = pending
Payout.type = stablepay_account
Payout.mode = claim
Payout.status_reason = waiting_for_recipient_claim
Claim.status = pending
Invite.status = active
Sender available -= amount
Sender held += amount
```

The default claim period is **seven days from successful payout creation**. V1 does not let the sender change it. The success page shows amount, recipient email, expiry, memo, and claim code; its main action is Create/Share poster. It also offers Copy claim link, Copy claim code, Resend email, and Cancel payout. The poster includes a QR code and masked recipient email. Email, link, and poster must not contain the claim code.

The system generates a six-digit code after creating a pending claim, for example `482913`. The backend stores only its **hash**. The source PRD also says the sender can view or copy the plaintext on success and detail screens; implementing that detail view would require an explicit secure retrieval or regeneration design, since a hash alone cannot recover the code. The sender shares it through another channel, such as chat or phone. Only an unregistered-email claim requires it. Wrong or expired codes get a simple error; too many attempts trigger risk or manual review.

## 10. Invitation Email, Link, and Poster

The invitation email should remain simple enough for email clients. An example subject is “Apex Trading Ltd. sent you 500 USDC.” The body identifies the sender, amount, email and claim deadline, shows a short memo if provided, and offers “Claim stablecoins.” A security note says that the user must verify this email and enter the sender-shared code. The email itself never includes the code.

The claim link is an **entry point**, not a credential to receive funds. A forwarded link can succeed only when the invitation is active, the claim and payout are pending, the payout has not expired or been canceled, the user proves control of the designated email by OTP, and the user enters the separately shared code. The proposed flow said an existing account holder would enter Portal after OTP without another password prompt; an unregistered user would complete registration before seeing a pending-claim card. That authentication shortcut needs security review during implementation.

The poster is a prominent sharing option from pending-claim success and detail. It can show the recipient benefit, amount, sender, expiry, and QR code, but must mask email and omit claim code. It is tied to a particular payout and email. A general open registration invitation belongs under the separate Invite link entry and holds no funds.

## 11. Recipient Claim Journey

| Step | Intended page and rule |
| --- | --- |
| 1. Landing | Show sender, amount, memo, and masked fixed recipient email; place Send code beside that email |
| 2. Email OTP | Enter a six-digit code delivered to the designated email; offer local error and resend |
| 3A. Existing account | After OTP, enter the Portal dashboard through the proposed existing-account path |
| 3B. New account | After OTP, complete merchant registration, then open dashboard |
| 4. Pending claim | Dashboard card shows amount, sender, memo, and expiry; user chooses Claim funds |
| 5. Claim code | Enter sender-shared six-digit code; show a simple error when invalid |
| 6. Success | Credit recipient account; `Payout.status = completed`, `Claim.status = succeeded`; notify sender |

The recipient need not arrive through the original claim link. If they register or log in within the seven-day period and their verified email matches `payout.recipient_email`, the dashboard should discover the pending claim. The separately shared code remains required before credit.

## 12. Cancellation, Failure, and Expiry

| Scenario | State change | Funds handling |
| --- | --- | --- |
| Sender cancels | Payout `canceled`, reason `sender_canceled`; claim and invitation canceled | Decrease held, increase available; confirmation modal but no Portal password |
| Claim expires | Payout `canceled`, reason `expired`; claim and invitation expired | Scheduled job releases held funds; link becomes invalid |
| Too many code attempts | Claim can be `locked` or `pending_review`; Payout stays `pending` | Keep funds held; escalate to risk or manual review |
| Risk rejects | Payout `failed` or `canceled`, depending on execution stage | Release or reverse according to accounting outcome; record failure code/message |

## 13. Unified Payouts List and Batch Results

The list uses the unified Payout main object for both account and wallet/batch payouts. It does not expose claim, invitation, batch-item, or transaction states.

| Column | Content |
| --- | --- |
| Payout ID | Unified ID, for example `po_xxx` |
| Recipient | Masked company for a registered account, email for unregistered claim, shortened wallet address, or batch count |
| Type | `StablePay Account` or `Wallet address`; batch is a wallet execution mode, not a third type |
| Amount | Amount and currency; total for batch where appropriate |
| Status | `pending`, `in_transit`, `completed`, `canceled`, or `failed` |
| Result | Waiting for claim, Completed, `8 completed, 2 failed`, Expired, or Failed |
| Updated at | Relevant creation, completion, cancellation, failure, or latest-update time |
| Actions | View; pending-claim actions live in detail |

Search covers payout ID, recipient email/company, Account No., wallet address, and batch ID. Filters cover the five main statuses and the two payout types. Pagination offers rows per page, range, page number, previous, and next.

| Batch outcome | Main status | Result and detail |
| --- | --- | --- |
| All succeed | `completed` | Completed; all items completed |
| Some succeed, some fail | `completed` | Counts such as `8 completed, 2 failed`; per-recipient outcome, failure reason, and retry action in detail |
| All fail, none succeed | `failed` | Failure summary in detail |
| Still executing | `in_transit` | Progress such as `Processing 8/10` and item progress in detail |

## 14. Transactions, Details, and Notifications

Accounting entries are limited to balance-affecting events:

| Event | Sender accounting | Recipient accounting |
| --- | --- | --- |
| Pending claim created | Move available to held | None |
| Claim succeeds | Consume held amount as completed payout | Credit available balance |
| Registered recipient transfer | Debit available balance | Credit available balance |
| Canceled or expired | Release held back to available | None |
| Failed after hold | Release or reverse according to accounting result | None or reversal |

Transactions excludes email sent, poster copied, link copied, and resend events. A pending-claim detail shows status, email, amount, memo, expiry, code, and timeline, with poster/link/code sharing, resend, and cancellation. Completed detail shows recipient, amount, source account, memo, completion time, and transactions, without Download receipt. Canceled/expired detail explains the returned funds; failed detail includes failure information and may offer a business-specific retry.

Notifications cover the recipient invitation (without the code), sender invitation confirmation with code and sharing options, sender claim-success confirmation, sender expiry and returned-funds notice, and optional recipient cancellation notice.

## 15. Backend View Model and Lookup API

A list view model could be:

```json
{
  "id": "po_123",
  "recipient": "A*** Trading Ltd.",
  "type": "StablePay Account",
  "amount": "500.00 USDC",
  "status": "completed",
  "result": "Completed",
  "updated_at": "2026-06-10T10:00:00Z",
  "action": "view"
}
```

The proposed `POST /api/payouts/recipient_lookup` takes `source_account_id` and `recipient_identifier`. An Account No. match returns `identifier_type`, `status`, recipient number and ID, currency, a masked display name, receivability, and whether currency matches the source. A mismatch response identifies both currencies and blocks review. Lookup must avoid exposing full merchant identity or account balance.

## 16. Acceptance Criteria

1. Create type has no default selection; the account option mentions email and Account No.
2. Source account determines currency throughout creation; every amount has a currency suffix.
3. Email and Account No. lookup branch correctly; unknown or wrong-currency Account No. cannot reach review.
4. Unregistered-email review shows the full email, memo, and invitation preview; the USD 1,000-equivalent limit blocks at the amount step.
5. Confirm uses a modal with Portal account password, email code, and Forgot password.
6. Unregistered claim proceeds through email OTP, existing-account entry or registration, dashboard pending claim, code verification, and success.
7. Claim code is absent from recipient email, link, and poster; sender shares it separately.
8. The list uses `pending`, `in_transit`, `completed`, `canceled`, and `failed`, never `paid`; a partially successful batch is `completed` with counts in Result.
9. Completed detail has no Download receipt.
10. User-facing copy consistently says StablePay Account.

These are acceptance checks defined by the PRD, not reported test outcomes.
