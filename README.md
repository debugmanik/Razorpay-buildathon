# RecoverX

### AI Revenue Recovery Engine for Razorpay

An autonomous, policy-bounded revenue operations engine that detects revenue-risk events, diagnoses root causes, scores expected recovery value, executes targeted interventions, and verifies actual recovered revenue with a full audit trail.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-41%20Passed%20%7C%209%20Suites-brightgreen?style=flat)](file:///Users/vipuljain/Desktop/RecoverX)
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

### 3. Recovery Scoring
Cases are prioritized by mathematical expectation:

$$\text{Expected Recovery Value} = \text{Amount at Risk} \times \text{Recovery Probability}$$

*Example:*  
₹12,500 at risk with a 78% recovery probability yields **₹9,750 Expected Recovery Value**.

> **Important:** Expected Recovery is an operational estimate used for queue prioritization. It is **never** counted as revenue recovered.

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

## Hackathon Demo Walkthrough (For Judges)

1. **Overview Dashboard:** Review the top-level financial metrics and notice the clear separation between **Revenue at Risk**, **Expected Recovery**, and **Verified Recovered Revenue**.
2. **Explore the Pipeline:** View the 7-stage operational pipeline tracking cases from failure detection to verified recovery.
3. **Open the Recovery Queue:** Filter by scenario (e.g. *Payment Failure*, *Subscription*, *Receivable*) to see multi-scenario coverage.
4. **Inspect the Hero Case (`case_aarav_hero`):**
   - Review the failure reason: *"Temporary network timeout"*.
   - Check the mathematical scoring: **78% Probability → ₹9,750 Expected Recovery**.
   - Review the **Operational Decision Trace** showing policy approval.
5. **Execute Recovery:**
   - Click **"Create Recovery Payment"** to generate the Razorpay test order.
   - Click **"Pay ₹12,500"** to trigger the Razorpay test payment modal.
6. **Verify Revenue Recovery:**
   - Complete the test payment.
   - The page updates to the green **"Payment Recovered"** celebration banner.
   - Verify that **₹12,500** has moved into **Recovered Revenue**.
7. **Inspect Bounded Autonomy (Priya Kapoor - `case_priya_fail`):**
   - High-value ₹84,000 transaction with insufficient funds.
   - Observe that RecoverX **halts automated retries** and escalates to **Manual Review** because policy limits were reached.
8. **Test Customer Intent Handling (Acme Industries - `case_acme_b2b`):**
   - Select **"Already Paid"** and see the UI transition cleanly to **"Payment Verification Required"**.
   - Check that duplicate clicks do not spam the audit trail.
   - Verify that **recovered revenue does not increase** without confirmed payment capture.
9. **Review Audit Log:** Open `/audit` to verify the complete, human-readable traceability for every action taken.
10. **Merchant Policy Settings:** Visit `/settings` to view and adjust policy guardrails.

---

## License

MIT License. Developed for the **Razorpay Buildathon 2026** (Track 03 — AI Revenue Recovery).
