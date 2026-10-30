---
title: "Payout to StablePay Business Account: Technical Design"
date: "2026-08-27"
category: "StablePay"
summary: "A proposed cross-service design for account payouts, recipient eligibility, invited claims, real fund movements, compensation, and rollout checks."
published: true
---

# Payout to StablePay Business Account: Technical Design

This is a design for adding **Send to StablePay Business account** to a Portal that already supported wallet-address Payouts. It is based on the product flow, existing service contracts, and account-model inspection; it does not assert that the proposed transfer, claim, or deployment was completed. The design keeps one Payouts entry, list, and detail model, while providing a separate creation and execution path for an email-addressed, single-recipient account payout.

## 1. Requirement and Scope

The sender chooses a source Balance Account, recipient email, currency, amount, and optional memo. Recipient lookup branches into: a registered and eligible Business account; an unregistered recipient who may be invited to claim later; or a registered account that cannot currently receive, which blocks creation. The product review also required a missing-name check for registered merchants and a name challenge when an unregistered recipient claims.

The wallet-address flow continues through its existing batch creation path. The new account flow stays in the Payouts module but uses its own create, review, result, detail, share, and claim pages. It is a single-recipient interaction, although the backend can reuse **one `payout_batches` row and one `payout_items` row** so unified list and detail views remain coherent. It must not force email and claim semantics into the old address-based `PayoutItemInput` contract.

The Merchant Portal displays this account payout as **Free** and the new path does not consume the legacy Payout quota. It still must check balance, an unregistered-recipient amount cap, merchant account limits, risk limits, compliance limits, and product payout limits. The design includes platform-internal fee-account routing in its movement examples; merchant-facing fee semantics, amount received, and that internal routing must be reconciled with the approved commercial policy before implementation. The illustrative `10 USD -> 1 USD fee route + 9 USD recipient` diagram is a proposed accounting example, **not** a published price or observed charge.

In scope are Portal UI/BFF; payout lookup, execution, claim and invite states; merchant and account lookup; account holds and transfers; existing OSL custody and chain-address capabilities; invitation mail; and IDL changes. Out of scope are rewriting wallet Payouts, commission or reward rules, claiming to an external wallet, a new custody product, invitation-attribution result storage, and pixel-level design detail.

## 2. Service Boundaries and Two Kinds of Movement

The design deliberately distinguishes **Account actions** (balances, freezes, unfreezes, debits, credits) from **real fund movements** between custody or chain addresses. A transfer is successful only when the actions required for its scenario have completed. `merchantportal` is the UI and BFF; `stablepay-payout` owns the payout, lookup orchestration, invite/claim lifecycle, and movement state. `merchantcore` owns merchant identity, KYB/account eligibility, registration, and account mapping. `accountcore` owns ledger primitives and atomic balance transfer. `channelcore` supplies existing OSL custody operations; `chaincore` supplies existing platform chain-address holding and release operations. `communication` sends the invitations and outcome messages.

The inspected account model used Global Account Phase 1 **Balance Accounts**: the sender explicitly selects an available source; the recipient receives into the default Balance Account for that currency. Older naming left in comments or IDL should not override the live account contract. At design time there was no dedicated recipient-email eligibility RPC and no complete account-to-account transfer API, so both are proposed additions. Existing account primitives included `AdjustBalance`, `BatchAdjustBalance`, `FreezeBalance`, `UnfreezeBalance`, and `ConsumeFrozenBalance`.

### Registered-recipient movement matrix

| Sender → recipient | Proposed real fund route | Account action |
| --- | --- | --- |
| OSL → OSL | Sender custody address → StablePay OSL shared address → recipient custody address | Sender selected Balance Account debit; recipient default Balance Account credit. |
| Non-OSL → non-OSL | Sender address → StablePay chain address → recipient address | Same account transfer. |
| OSL → non-OSL | Sender custody address → StablePay OSL shared address → StablePay chain address → recipient address | Same account transfer. |
| Non-OSL → OSL | Sender address → StablePay chain address → recipient custody address | Same account transfer. |

All registered routes use a platform transit point, including same-system routes. The draft's internal fee split uses an OSL Fee address for OSL-origin routes, a chain Fee address for non-OSL-origin routes, and a common Transit/Fee Global Account representation. The exact fee source, recipient net amount, merchant-visible Free label, and ledger reconciliation require a single signed-off rule; the design example alone cannot establish them.

For an **unregistered** recipient, creation freezes the sender's account funds and moves real funds only to the platform holding point in the sender's system: OSL shared address or StablePay chain address. No internal fee split occurs while the claim is pending. On a successful claim, consume the frozen balance, credit the now-eligible recipient, and release real funds along the appropriate registered route. On cancel or expiry, return real funds to the sender's original address and unfreeze the account balance. The payout cannot be called fully canceled or expired while a required return movement has failed.

## 3. Recipient Lookup and Portal Flow

From the Payouts list, Create payout first asks for Wallet address or StablePay Business account. The latter opens its own form. A proposed `merchantcore.LookupRecipientByEmailForStablePayPayout` aggregates registration, merchant status, KYB, Business-account presence, default Balance Account, legal/business name, missing-name state, and an eligibility reason. This avoids scattering the policy across multiple Payout calls. The public lookup response should be deliberately limited and masked to reduce email-enumeration risk.

An eligible registered recipient must pass a name challenge based on `legal_business_name` before the sender reaches review. If that name is absent, blank, or unsuitable for a challenge, the provisional rule **blocks creation** and asks the recipient to update their profile; the sender cannot supply the authoritative registered name. A registered but ineligible recipient also blocks review. Examples include an inactive Business account, pending/rejected KYB, unsupported region, restriction, or closed account. `KYB pending` is treated as `cannot_receive`, not as an invitation claim path.

For an unregistered email, the sender supplies `expected_recipient_name`, which becomes the later claim challenge source. The review page explains the invitation and pending outcome. On confirm, Payout creates the payout, freezes funds, moves funds to the holding point, creates claim/invite records, and sends an invitation. The result and detail pages show Pending claim, with share poster, Copy claim link, Resend email, and Cancel payout actions. The source PRD's proposed cap is **USD 1,000 equivalent** for an unregistered recipient; currency conversion and risk-limit sources must be agreed with the business-validation contract.

The recipient opens the claim link, verifies control of the intended email using the existing email/OTP capability, signs in or registers, and establishes a Business account through the existing activation flow. Claim mode should simplify the registration UI while reusing backend activation and account-mapping creation. Before release, the backend checks that the logged-in verified email equals the payout recipient, the merchant and default account are eligible, the claim and invite remain valid, and the name challenge matches. A link is an entry point, **not** proof of entitlement by itself.

The proposed name challenge normalizes whitespace, ignores English case, and normalizes full-/half-width brackets. For two effective characters it reveals the first and asks for the last; for longer names it masks two consecutive characters near the middle while avoiding business suffixes such as `LIMITED`, `LLC`, or `PTE. LTD.` where possible. The backend returns a masked name and validates the answer; Portal does not independently generate the puzzle. This fixed algorithm is a first-release proposal and needs real multilingual name samples in tests.

## 4. Persistence and State Model

The account flow stores exactly one batch and one item per creation. The batch remains the sender-level order and contains selected source account, currency, total/debit/frozen amounts, `payout_scene` (`onchain_wallet` or `stablepay_account`), execution mode (`direct_transfer` or `invite_claim`), sender custody snapshot, fund-movement mode/status, and overall state. The item remains the recipient-level fact and adds email, merchant/account IDs when known, recipient status, custody snapshot when known, and the expected legal name for an invitation. Legacy wallet fields such as `network`, `address`, and `tx_hash` stay for compatibility but do not define an account recipient.

The proposed `payout_claims` row links to the item and holds recipient email, expected name, resolved merchant/account, `pending/claimed/canceled/expired/failed` status, expiry and outcome times. `payout_invites` links to the claim and holds email, **token hash only**, `active/used/expired/canceled` status and expiry/use/cancel times. Copy link reuses a still-valid invitation; resend is rate limited through send logs, cache, or shared rate-limit capability rather than counters added to the invite row. Invitation attribution is explicitly deferred because it is not needed for the money/claim lifecycle.

Lookup response states (`account_found`, `not_registered`, `cannot_receive`, `self_recipient`, `invalid_email`) map to more precise persisted recipient states (`registered_eligible`, `registered_missing_name`, `registered_cannot_receive`, `not_registered`). Payout, claim, and invite state machines remain distinct:

| Event | Payout | Claim | Invite |
| --- | --- | --- | --- |
| Invitation created | pending | pending | active |
| Successful claim and completed movements | succeeded | claimed | used |
| Sender cancellation and completed return | canceled | canceled | canceled |
| Expiry and completed return | expired | expired | expired |
| Terminal claim failure | failed | failed | Invalidate under the final failure policy. |

The existing item status stays `pending/processing/succeeded/failed`; cancel and expiry are represented at payout/claim/invite level so old item consumers do not need new states. Real fund movement needs its own `pending/holding/completed/refunded/failed` state and route snapshot, separate from ledger state.

Migration must begin with additive DDL. Historical wallet batches receive `payout_scene=onchain_wallet` and `fund_movement_status=not_applicable`; the new reader must continue to show them. The old schema includes non-null address and legacy fee fields, so a new account-payout repository path needs explicit compatibility values until constraints are safely revised. Application and IDL validation must condition old address requirements on `payout_scene`; merely adding email columns would not make new writes valid.

## 5. API, Idempotency, and Compensation

The account flow needs dedicated lookup, create/confirm, claim, resend, cancel, and detail contracts rather than forcing it through `CreateBatch/PatchBatch/SubmitBatch`. `merchantcore` should return one eligibility judgment for an email and currency/account context. `accountcore` should add `TransferBalance(from, to, currency, amount, biz_id, idem_key, ...)` for registered transfers and `ConsumeFrozenAndTransferBalance(...)` for successful claims, so sender debit and recipient credit are one ledger action. `FreezeBalance` and `UnfreezeBalance` remain the pending-claim and rollback primitives.

Use request idempotency for create, payout/batch idempotency for confirm, `claim_id + idem_key` for claim, and stable idempotency keys for every account and custody/chain action. Persist phase outcomes so retries do not replay a real transfer twice. Mark payout succeeded only after the ledger and required fund movements finish. If ledger transfer succeeds but the real-fund route fails, leave the claim out of final success and schedule a compensating retry or controlled investigation. If the return from a platform holding point fails, cancellation/expiry must remain unresolved until it is reconciled. No synchronous DB transaction spans these services; the workflow needs recoverable state and operational visibility.

Validation includes recipient email format, self-send, positive amount, source-account/currency compatibility, available balance, registered-recipient eligibility, unregistered cap, verified claimant email, active claim and invite, and the proper name challenge. Suggested errors include `recipient_invalid_email`, `recipient_self_forbidden`, `recipient_not_eligible`, `recipient_name_missing`, `recipient_name_mismatch`, `unregistered_amount_limit_exceeded`, `claim_email_mismatch`, `claim_email_not_verified`, `claim_not_eligible`, `claim_expired`, `claim_canceled`, and `claim_already_used`. These are proposed contract names, not evidence that endpoints already return them.

## 6. Rollout and Verification

Proposed deployment covers Portal routes/BFF, Payout subdomain and expiry scanner, MerchantCore lookup registration, AccountCore transfer APIs, communication templates, and IDL. OSL custody APIs in `channelcore` and platform chain-address functions in `chaincore` are intended reuse and integration dependencies; the draft does not require new product semantics in either. The account-payout path must explicitly bypass legacy merchant Payout fee and quota calls while retaining the separate business-limit checks and any approved internal movement accounting.

Tests should cover all four registered custody combinations, both unregistered holding points, missing-name and ineligible lookup, name normalization, email verification, claim after registration, resend, cancellation, expiry, duplicate requests, and partial failure after a ledger or real-fund step. Reconcile sender, transit, recipient, and fee ledger balances with custody or chain movement for each scenario. Regression checks must keep wallet-address Payout creation and mixed-type list/detail rendering working.

Operations would need counts and outcomes for lookup states, invites, claims, expiries, resends, each holding point's in-flight/refunded balances, movement failures and retries, and mismatches between payout and claim states. Alerts should cover invitation failure, post-claim credit failure, expiry-job failure, and state inconsistency. These are verification and observability requirements; the source design does not provide measured launch results.
