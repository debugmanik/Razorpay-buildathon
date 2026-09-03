# RecoverX

### AI Revenue Recovery Engine for Razorpay

An autonomous, policy-bounded revenue operations engine that detects revenue-risk events, diagnoses root causes, scores expected recovery value, executes targeted interventions, and verifies actual recovered revenue with a full audit trail.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-59%20Passed%20%7C%2011%20Suites-brightgreen?style=flat)](https://github.com/debugmanik/Razorpay-buildathon)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode%20%26%20Simulation-0C2340?style=flat&logo=razorpay)](https://razorpay.com/)
[![Buildathon](https://img.shields.io/badge/Razorpay%20Buildathon-Track%2003%20%C2%B7%20AI%20Revenue%20Recovery-blueviolet?style=flat)](https://razorpay.com/)

---

## The Problem

Revenue doesn't only disappear when a single checkout transaction fails. In modern fintech and commerce operations, revenue leaks across multiple touchpoints:

- **Payment Failures:** Temporary bank downtime, network timeouts, and soft card declines.
- **Checkout Abandonment:** High-intent shoppers dropping off before payment completion.
- **Subscription Renewal Failures:** Expired cards and billing processing glitches causing involuntary churn.
- **Mandate Failures:** Recurring auto-debit failures and authorization limit delays.
- **Overdue Invoices:** B2B receivables slipping past due dates without structured follow-up.

Most existing systems stop at detection: they send an error notification or fire uncoordinated retries. 

**RecoverX closes the loop.** It detects revenue at risk, diagnoses why it failed, calculates the expected recoverable value, checks merchant-defined safety policies, executes a bounded intervention, and stops immediately once the outcome is verified.

---

## The Solution

RecoverX operates as a disciplined, policy-governed recovery loop:

1. **Detect Revenue-Risk Opportunities:** Ingest failure signals from payment gateways, subscriptions, mandates, checkout sessions, and invoices.
2. **Diagnose & Score Recovery Potential:** Categorize the failure mode and calculate **Expected Recovery Value = Amount at Risk × Recovery Probability**.
3. **Select & Policy-Check Interventions:** Match the optimal recovery action against merchant policy guardrails (max attempts, cooldown periods, recovery windows, and escalation limits).
4. **Execute, Verify & Record:** Execute approved actions via Razorpay Test Mode or simulation, verify captured funds, halt further automation immediately upon success, and record an immutable audit trail.

> **Core Philosophy:** The primary metric of RecoverX is not "AI activity." The primary metric is **actual money recovered**.

---

## Why RecoverX

- **Unified Revenue Recovery Engine:** One consistent architecture across checkout, cards, subscriptions, mandates, and B2B receivables.
- **Multiple Revenue-Risk Scenarios:** Purpose-built workflows for payment failures, checkout drop-offs, subscriptions, mandates, and promise-to-pay.
- **Explainable Root Cause Diagnosis:** Clear evidence-backed summaries rather than opaque black-box reasoning.
- **Financial Prioritization:** Queues prioritized by Expected Recovery Value rather than raw transaction amount alone.
- **Merchant-Defined Guardrails:** Configurable limits preventing uncontrolled retries or customer spam.
- **Bounded Autonomy:** Automation that knows when to act, when to stop, and when to escalate to merchant review.
- **Razorpay Test Mode Integration:** Real order generation, checkout modal processing, webhook verification, and test payment capture.
- **Financial Integrity:** Actual recovered revenue strictly updates only upon confirmed payment capture.
- **Complete Auditability:** Every decision, policy evaluation, execution, and outcome is permanently logged.

---

## Revenue Recovery Scenarios

| Revenue Risk Scenario | Diagnosis | Recommended Intervention | Execution Channel |
|---|---|---|---|
| **Payment Failure** | Temporary Bank / Network Timeout | Create Recovery Payment | Razorpay Test Mode Checkout |
| **Checkout Drop-off** | Cart / Checkout Session Abandonment | Send Checkout Recovery | Bounded Customer Notification |
| **Subscription Failure** | Card Renewal / Processing Error | Retry Subscription | Recurring Billing Sequencer |
| **Mandate Failure** | Mandate Limit / Authorization Delay | Retry Mandate | Auto-Debit Retry Sequencer |
| **Overdue B2B Invoice** | Unpaid Invoice Exceeding Terms | Start Promise to Pay | Receivable Tracker & Payment Link |

---

## How It Works

### Architecture & Workflow Loop

```mermaid
flowchart TD
    A[Revenue Event / Failure Signal] --> B[Opportunity Detection]
    B --> C[AI Diagnosis & Root Cause]
    C --> D[Recovery Scoring\nAmount × Probability]
    D --> E[Intervention Selection]
    E --> F{Merchant Policy Check}
    F -- Blocked / Limit Reached --> G[Escalate to Manual Review]
    F -- Approved --> H[Bounded Recovery Execution]
    H --> I{Customer / Payment Outcome}
    I -- Payment Succeeded --> J[Stop Automation & Capture Funds]
    J --> K[Verified Recovered Revenue]
    I -- Retry / Reminder --> L{Policy Limit Reached?}
    L -- Yes --> G
    L -- No --> M[Schedule Next Step]
    G --> N[Audit Trail & Ledger]
    K --> N
    M --> N
```

### 1. Detection
Every failure signal creates a structured revenue opportunity with customer history, failure reasons, and monetary value.

### 2. Diagnosis
The system categorizes the failure root cause (e.g., `Temporary Payment Failure`, `Card Expired`, `Checkout Drop-off`, or `Overdue Receivable`).

### 3. Economic Recovery Scoring & Decisioning
Cases are evaluated using counterfactual economic decisioning:

- **Estimated Natural Recovery Probability:** Baseline likelihood of recovery without automated intervention (control baseline).
- **Estimated Recovery Probability with Intervention:** Model score under the proposed intervention.
- **Estimated Incremental Lift:** $\text{Intervention Probability} - \text{Baseline Probability}$ (e.g., $24\% \to 78\% = +54\text{pp}$).
- **Expected Incremental Recovery Value:** $\text{Amount at Risk} \times \text{Incremental Lift}$.
- **Expected Net Recovery Value:** $\text{Expected Incremental Recovery Value} - \text{Estimated Intervention Cost}$.

#### Tri-State Decisioning:
- **`ACT`:** Expected Net Recovery Value $> 0$ and merchant policy permits automation.
- **`ABSTAIN`:** Expected Net Recovery Value $\le 0$ (intervention costs exceed incremental lift, preventing customer spam and gateway fees).
- **`ESCALATE`:** Merchant policy threshold exceeded (e.g., $> ₹50,000$) or retry limits reached, routing directly to merchant operations.

> **Strict Policy Precedence:** Merchant policy always constrains automation. High expected value can **never** bypass merchant guardrails.
> **Financial Integrity:** Neither expected recovery, incremental recovery, nor net value ever count as actual recovered revenue. Only confirmed captured payments increment recovered revenue.

### 4. Intervention Selection
The engine determines the best recovery action based on opportunity type, diagnosis, past attempt count, and recovery scoring.

### 5. Policy Guardrails
Every automated action must pass through the merchant policy engine:
- **Maximum Attempts:** Halts further retries once threshold is reached (e.g., maximum 2 retries).
- **Cooldown Period:** Enforces time delays between successive recovery attempts.
- **Recovery Window:** Stops automation if the opportunity exceeds its validity window (e.g., 24 hours).
- **Escalation Threshold:** Automatically routes high-value or high-risk cases to manual review.
- **Idempotency:** Protects against duplicate attempts, duplicate customer intents, and concurrent webhooks.

### 6. Execution
Approved actions execute via the configured provider:
- **Razorpay Provider:** Creates real Razorpay test orders, initiates customer checkout, and receives webhooks.
- **Simulation Provider:** Deterministic execution for offline testing and controlled hackathon demonstrations.

### 7. Outcome Verification
**Financial integrity rule:** Actual recovered revenue only increases when a payment is captured and verified.
- Creating a recovery order does **not** count as recovered revenue.
- Sending a checkout recovery message does **not** count as recovered revenue.
- Customer selecting "Already Paid" or "Promise to Pay" does **not** count as recovered revenue.
- Only confirmed captured funds update the recovered revenue ledger.

### 8. Audit Trail
Every decision point, policy check, customer response, and payment event is immutably recorded with timestamps and context.

---

## Example Recovery Flow

### Hero Scenario: Aarav Sharma (Temporary Payment Failure)

- **Customer:** Aarav Sharma
- **Amount at Risk:** ₹12,500
- **Prior History:** 4 successful payments, 1 failure
- **Diagnosis:** Temporary Payment Failure (`"Temporary network timeout"`)
- **Recovery Probability:** 78%
- **Expected Recovery Value:** ₹9,750
- **Recommended Action:** Create Recovery Payment

**Lifecycle Progression:**
1. Failure detected: ₹12,500 placed into Recovery Queue.
2. Engine diagnoses temporary failure and calculates ₹9,750 expected recovery.
3. Merchant policy approves recovery action (Attempt 1 of 2; within ₹50,000 threshold).
4. Razorpay recovery order is created (`order_...`).
5. Customer completes payment via Razorpay Test Mode checkout.
6. Webhook / payment handler captures transaction (`pay_...`).
7. **₹12,500 moves to Verified Recovered Revenue.**
8. Automation halts immediately; case is closed with full audit history.

---

## Merchant Controls

Merchants configure their recovery guardrails under **Settings**:

- **Maximum Recovery Attempts:** 1 to 5 automated attempts.
- **Retry Cooldown:** Minutes to wait between recovery actions.
- **Recovery Window:** Maximum hours an opportunity remains open for automated recovery.
- **Escalation Threshold:** Monetary limit above which transactions are flagged for manual review.
- **Policy Snapshotting:** In-flight cases maintain the policy under which they were initiated, while new opportunities inherit updated merchant policies.

---

## Audit Trail Lifecycle

Audit events provide transparency for operations teams:

| Audit Event | Human-Readable Description |
|---|---|
| `RECOVERY_DETECTED` | Revenue opportunity detected with amount at risk |
| `DIAGNOSIS_COMPLETED` | Root cause diagnosed with supporting failure signal |
| `RECOVERY_SCORED` | Recovery probability and expected recovery value computed |
| `INTERVENTION_RECOMMENDED` | Recommended recovery action selected |
| `POLICY_APPROVED` | Merchant policy validated; action permitted |
| `POLICY_ESCALATED` | Policy threshold exceeded; routed to manual review |
| `ACTION_EXECUTED` | Recovery action dispatched via provider |
| `CUSTOMER_INTENT_RECEIVED` | Customer response recorded (`Pay Now`, `Remind Me Later`, `Already Paid`) |
| `PAYMENT_VERIFICATION_REQUIRED` | Customer reported payment already made; awaiting confirmation |
| `RAZORPAY_PAYMENT_CAPTURED` | Verified payment capture reference recorded |
| `RECOVERY_COMPLETED` | Revenue officially marked as recovered; workflow stopped |
| `RECOVERY_STOPPED` | Automation permanently halted by stopping rule |

---

## Dashboard Pages

- **Overview (`/`):** High-level financial KPIs (Revenue at Risk, Expected Recovery, Actual Recovered Revenue, Recovery Rate), active recovery pipeline, and prioritized recovery opportunities.
- **Recovery Queue (`/recovery`):** Real-time operational table of all revenue-risk opportunities with multi-scenario filtering (Payment Failures, Checkout Drop-off, Subscriptions, Mandates, Receivables).
- **Recovery Case (`/recovery/[id]`):** Operational cockpit displaying case metrics, root-cause diagnosis, decision trace, Razorpay payment action, and full audit trail.
- **Analytics (`/analytics`):** Financial intelligence tracking recovered revenue over time, recovery rates by scenario, intervention efficiency, and failure reasons.
- **Audit Log (`/audit`):** Chronological, searchable compliance log of all system decisions and state transitions.
- **Settings (`/settings`):** Merchant policy editor, provider mode toggle (`simulation` vs `razorpay`), and environment status.

---

## Decision Engine Architecture

RecoverX implements a deterministic, explainable decision engine in TypeScript:

- **Signal Ingestion:** Normalizes webhook payloads, invoice states, and checkout drop-offs into a unified `CaseContext`.
- **Heuristic Diagnosis:** Evaluates customer transaction history, gateway error codes, and time-lapse indicators.
- **Mathematical Scoring:** Computes bounded probabilities based on prior customer success rate and error severity.
- **Policy Engine:** Evaluates allowed actions, attempt ceilings, cooldown windows, and monetary thresholds.
- **Provider Abstraction:** `PaymentProvider` interface decoupling recovery orchestration from execution adapters (`RazorpayActionProvider` and `SimulationActionProvider`).

---

## Razorpay Integration

RecoverX integrates directly with Razorpay's APIs:

- **Order Creation (`/v1/orders`):** Generates scoped recovery payment orders in paise.
- **Razorpay Checkout JS:** Dynamic client-side checkout modal supporting test Cards, UPI, Netbanking, and Wallets.
- **Webhook Processing (`/api/webhooks/razorpay`):** Cryptographically validates incoming webhooks using HMAC-SHA256 signatures (`RAZORPAY_WEBHOOK_SECRET`).
- **Payment Verification:** Listens for `payment.captured` and transitions case state only upon authentic gateway confirmation.
- **Simulation Provider:** Built-in fallback that ensures full demo functionality even when external network tunnels (e.g. ngrok) are unavailable.

---

## Local Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/debugmanik/Razorpay-buildathon.git
cd Razorpay-buildathon

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Running Locally

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Configure `.env` using `.env.example`:

```ini
# Database (PostgreSQL with Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/recoverx?schema=public"

# Provider Mode: "simulation" or "razorpay"
RECOVERX_PROVIDER=simulation

# Razorpay Test Mode Credentials (Required if RECOVERX_PROVIDER=razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## Verification & Testing

RecoverX includes unit, engine, and end-to-end integration tests:

```bash
# Run unit and integration tests
npm test

# Run ESLint validation
npm run lint

# Run TypeScript type check
npx tsc --noEmit

# Run Next.js production build
npm run build
```

**Verified Test Results:**
- **9 test suites passed, 9 total**
- **41 tests passed, 41 total**
- **ESLint:** 0 errors, 0 warnings
- **TypeScript:** 0 type errors
- **Next.js Build:** Production build generated successfully

---

## Demo Walkthrough

See RecoverX detect revenue at risk, make a bounded recovery decision, execute recovery through Razorpay, and verify actual recovered revenue.

### 1. Overview

Start on the Overview dashboard.

Review the key financial metrics:

- Revenue at Risk
- Expected Recovery Value
- Actual Recovered Revenue
- Active Opportunities

The recovery pipeline shows how RecoverX moves from a revenue-risk event to a verified recovery outcome.

### 2. Recovery Queue

Open the **Revenue Recovery Queue** to view prioritized recovery opportunities.

Filter opportunities by scenario, including:

- Payment Failure
- Checkout Drop-off
- Subscription Failure
- Mandate Failure
- Receivable

Opportunities are prioritized using Expected Recovery Value rather than simply sorting by transaction size.

### 3. Hero Recovery Case

Open the primary payment-recovery case.

Review:

- **Amount at Risk:** ₹12,500
- **Diagnosis:** Temporary network timeout
- **Recovery Probability:** 78%
- **Expected Recovery Value:** ₹9,750
- **Recommended Intervention:** Create Recovery Payment

The case also shows the operational decision trace, including diagnosis, scoring, intervention selection, and merchant policy approval.

### 4. Execute Recovery

Select **Create Recovery Payment**.

RecoverX creates a new Razorpay Test Mode recovery order for the full original amount.

The case then moves to **Recovering** and presents the customer with:

**Pay ₹12,500**

The Razorpay Checkout experience opens directly inside RecoverX.

### 5. Verify Recovery

Complete the Razorpay Test Mode payment.

RecoverX does not treat order creation or a frontend success callback as recovered revenue.

Instead, the existing `payment.captured` webhook confirms the payment and transitions the case to **Recovered**.

Verify:

- Payment Captured
- Recovery Confirmed by Webhook
- Actual Recovered Revenue = ₹12,500

### 6. Bounded Autonomy

Open a high-risk recovery opportunity such as the ₹84,000 Priya Kapoor case.

Review the recovery probability and merchant policy.

When policy boundaries are reached, RecoverX stops automated recovery and sends the opportunity to **Manual Review** rather than retrying indefinitely.

This demonstrates:

- Maximum Attempts
- Cooldown
- Recovery Window
- Escalation Threshold
- Policy-based stopping

### 7. Customer Intent Handling

Open the Acme Industries receivable opportunity.

Select **Already Paid**.

RecoverX records the customer intent and moves the case to:

**Payment Verification Required**

The customer response does not automatically increase recovered revenue.

Recovered revenue is only recorded after an actual payment is confirmed.

Repeated identical customer-intent clicks are handled without unnecessarily duplicating the audit trail.

### 8. Multi-Scenario Recovery

Use **Simulate Revenue Event** to explore the other supported revenue-risk scenarios:

- Payment Failure
- Checkout Drop-off
- Subscription Failure
- Mandate Failure
- Overdue Invoice

Each scenario enters the same Recovery Engine flow:

**Detect → Diagnose → Score → Select Intervention → Apply Policy → Execute → Verify → Recover**

Where customer payment or external confirmation is required, RecoverX does not mark the opportunity as recovered until the outcome is actually confirmed.

### 9. Audit Trail

Open the **Audit Log** to trace the complete recovery lifecycle.

Typical events include:
```text
Recovery Detected
Diagnosis Completed
Recovery Scored
Intervention Recommended
Policy Checked
Action Approved / Action Blocked
Action Executed
Recovery Payment Created
Payment Captured
Recovery Completed
```
---

## License

MIT License. Developed for the **Razorpay Buildathon 2026** (Track 03 — AI Revenue Recovery).
