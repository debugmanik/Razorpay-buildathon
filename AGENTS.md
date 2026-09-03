# RecoverX — Agent Instructions

## 1. Product Context

RecoverX is a revenue recovery operations platform for merchants.

Its purpose is to:

Detect revenue at risk → Diagnose the problem → Decide the right intervention → Execute a bounded recovery workflow → Verify the outcome → Stop when appropriate → Record an audit trail

The product should focus on measurable financial outcomes.

The primary metric is not “AI activity.”

The primary metric is:

money recovered.

Primary recovery scenarios:

* Failed payments
* Payment degradation
* Checkout abandonment
* Failed subscriptions
* Overdue B2B receivables
* Promise-to-pay workflows

Payment failure recovery should remain the hero workflow.

⸻

## 2. Product Philosophy

RecoverX should feel like a real fintech/revenue-operations product.

It must NOT feel like a generic AI demo.

The intelligence should be demonstrated through:

* good prioritization
* recovery probability
* expected recovery value
* sensible intervention selection
* policy enforcement
* stopping rules
* measurable outcomes
* auditability

Do not add AI terminology merely for appearance.

Avoid unnecessary phrases such as:

* AI-powered
* AI magic
* autonomous intelligence
* next-generation AI
* revolutionary AI

Use practical product language instead:

* Revenue at risk
* Expected recovery
* Recovery probability
* Recovery policy
* Recovery action
* Recovered
* Stopped by policy
* Escalated
* Audit trail

⸻

## 3. Critical Design Rule

The final UI must NOT look AI-generated.

Avoid:

* excessive gradients
* glowing UI
* excessive glassmorphism
* giant rounded cards
* robot illustrations
* generic AI graphics
* excessive purple/blue gradients
* “AI” badges everywhere
* chatbot-first interfaces
* meaningless animations
* giant marketing hero sections
* stock illustrations
* generic SaaS dashboard boilerplate

Prefer:

* restrained fintech aesthetics
* strong typography
* dense but readable information
* subtle borders
* compact status badges
* useful tables
* meaningful charts
* financial figures
* clear hierarchy
* deliberate whitespace
* practical operations-oriented layouts

The design should feel like:

Fintech operations console + revenue intelligence platform

not:

AI startup landing page.

⸻

## 4. Engineering Principles

Write production-quality prototype code.

Prefer:

* small reusable components
* clear separation of concerns
* typed data models
* predictable state management
* reusable UI primitives
* service abstractions
* deterministic business logic
* testable functions
* meaningful names

Avoid:

* giant components
* duplicated logic
* business logic inside presentation components
* hardcoded values scattered throughout the application
* unnecessary dependencies
* placeholder TODO implementations
* fake buttons
* dead routes
* mock logic embedded directly in UI

Before adding a dependency, check whether the existing project already provides an equivalent capability.

⸻

## 5. Architecture

Keep these conceptual layers separate:

UI
↓
Application / orchestration
↓
Recovery engine
↓
Policy engine
↓
Payment provider abstraction
↓
Data layer

Business rules should not live inside React/UI components.

Create clear services/modules for:

Detection

Identifies revenue-risk signals.

Diagnosis

Determines likely causes using transaction and customer context.

Do not expose hidden chain-of-thought.

Only expose concise reasoning summaries and supporting evidence.

Recovery Scoring

Calculate:

Expected Recovery =
Payment Amount × Recovery Probability

Prioritize cases using expected recoverable value rather than transaction amount alone.

Policy Engine

Every automated action must pass through a recovery policy.

Policies should define:

* allowed actions
* maximum attempts
* cooldown period
* recovery window
* escalation threshold
* stop conditions

Recovery Executor

Executes only actions approved by the policy engine.

Outcome Verification

Determines whether the action resulted in:

* recovered
* failed
* pending
* stopped
* escalated

Audit Service

Every meaningful recovery decision and action must be recorded.

⸻

## 6. Bounded Autonomy

This is a core product requirement.

RecoverX must never behave as an unrestricted autonomous agent.

Every action must follow:

Risk detected
↓
Diagnosis
↓
Recovery recommendation
↓
Policy validation
↓
Allowed?
├── No → Escalate
└── Yes
     ↓
Execute
     ↓
Verify
     ↓
Recovered?
├── Yes → STOP
└── No → Next bounded step

Successful payment must immediately stop further recovery actions.

Retry limits must always be enforced.

The agent must know when to stop.

⸻

## 7. Demo/Test Mode

The application must work without real Razorpay credentials.

Create a clean provider abstraction:

PaymentProvider
├── RazorpayProvider
└── SimulationProvider

When credentials are unavailable, use SimulationProvider.

Never pretend simulated payments are real.

The UI should clearly indicate test/demo environment where appropriate.

Demo mode should be deterministic so the hackathon presentation is reliable.

⸻

## 8. Demo Scenario

The project must contain a deterministic hero scenario.

Example:

Customer:
Aarav Sharma

Amount:
₹12,500

Problem:
Temporary payment/network failure

Previous successful payments:
4

Recovery probability:
78%

Expected recovery:
₹9,750

Recommended action:
Retry once

Demo outcome:
Payment succeeds.

After execution:

* ₹12,500 becomes recovered
* recovery metrics update
* case closes
* no additional retry occurs
* audit event is created

Also create a deliberate failure scenario where the retry limit is reached and RecoverX stops automatically and escalates.

The second scenario is important because it demonstrates bounded autonomy.

⸻

## 9. Data

Use realistic Indian merchant/payment data.

Use believable amounts such as:

* ₹799
* ₹1,499
* ₹2,999
* ₹4,999
* ₹12,500
* ₹25,000
* ₹84,000

Avoid unrealistic fake enterprise numbers.

Seed enough data to make the application feel populated.

The dataset should contain a realistic mixture of:

* recovered
* pending
* failed
* abandoned
* escalated
* stopped

Do not make all transactions successful.

⸻

## 10. Dashboard Rules

The dashboard should answer these questions immediately:

1. How much revenue is at risk?
2. How much is actually recoverable?
3. How much has RecoverX recovered?
4. What is the recovery rate?
5. What cases need attention?

Primary metrics:

* Revenue at Risk
* Recoverable Revenue
* Recovered Revenue
* Recovery Rate
* Active Recovery Cases

Financial impact must be more prominent than AI-related information.

⸻

## 11. Recovery Queue

The Recovery Queue is the operational heart of the product.

Cases should be prioritizable by:

Expected recovery value

A case should expose:

* customer
* amount
* issue
* risk
* recovery probability
* expected recovery
* status
* recommended action
* attempts
* last activity

Provide practical filters.

Avoid unnecessary visual decoration.

⸻

## 12. Recovery Case

The case page should explain:

* What happened?
* Why did it happen?
* How much money is at risk?
* What does RecoverX recommend?
* Why?
* What is RecoverX allowed to do?
* What has already happened?
* When will automation stop?

Show a timeline of the recovery workflow.

Do not expose chain-of-thought.

Show concise evidence-based explanations instead.

⸻

## 13. Analytics

Analytics must measure actual recovery outcomes.

Track:

* Revenue at risk
* Revenue recovered
* Recovery rate
* Average recovery time
* Recovery by intervention
* Recovery by failure reason
* Recovery by payment method
* Recovery by customer segment

The key question should always be:

Which intervention recovered the most money?

⸻

## 14. Auditability

Every automated decision must be traceable.

Record:

* timestamp
* case ID
* event
* decision
* policy
* action
* result
* actor

Audit logs should clearly explain why automation stopped.

Example:

Retry executed
↓
Payment successful
↓
Recovery confirmed
↓
Case closed
↓
Stop condition: payment successful

or:

Retry #1 failed
↓
Retry #2 failed
↓
Policy limit reached
↓
Automation stopped
↓
Merchant escalation created

⸻

## 15. Security & Safety

Never expose secrets in source code.

Never commit API keys.

Use environment variables for credentials.

Do not log sensitive payment/customer information unnecessarily.

Mask customer contact information in UI where appropriate.

Do not create uncontrolled payment retries.

Do not create customer-spam workflows.

Every automated customer-facing action must have a policy and stopping condition.

⸻

## 16. UI Interaction Rules

Buttons must perform real actions.

Do not create decorative buttons that do nothing.

Loading states must correspond to actual operations.

Error states must be handled.

Empty states must be intentional.

Navigation must work.

Routes must not be dead ends.

If an operation is simulated, communicate that appropriately.

⸻

## 17. Code Style

Follow the conventions already present in the repository.

Do not rewrite the entire project simply because another architecture is preferred.

Prefer incremental changes.

Before modifying an existing component:

1. Understand it.
2. Reuse it if appropriate.
3. Extend it when possible.
4. Replace it only when necessary.

Do not introduce unnecessary abstractions.

⸻

## 18. Agent Workflow

Before implementing a feature:

1. Inspect the repository.
2. Understand the existing architecture.
3. Identify affected files.
4. Plan the smallest coherent change.
5. Implement.
6. Run the application.
7. Check for compile/runtime errors.
8. Verify the actual UI.
9. Fix issues.
10. Only then move to the next feature.

Never assume code works simply because it was generated successfully.

⸻

## 19. Prioritization

When time is limited, prioritize in this order:

P0

* Dashboard
* Recovery Queue
* Recovery Case
* Recovery engine
* Policy engine
* Recovery simulation
* Audit trail
* Measurable recovered revenue

P1

* Checkout abandonment
* Subscription recovery
* Receivables
* Analytics
* Settings

P2

* Additional visual polish
* Advanced configuration
* Secondary edge cases

Never sacrifice the core recovery loop for secondary features.

⸻

## 20. Hackathon Demo Principle

The entire product should support one extremely clear demonstration:

Revenue at risk
↓
RecoverX detects it
↓
RecoverX diagnoses it
↓
RecoverX calculates expected recovery
↓
RecoverX chooses an intervention
↓
Policy allows the action
↓
Action executes
↓
Money is recovered
↓
Automation stops
↓
Dashboard updates
↓
Audit trail records everything

A judge should be able to understand the value without needing a technical explanation.

⸻

## 21. Definition of Done

A feature is not complete when the code compiles.

It is complete when:

* the UI works
* the underlying logic works
* the happy path works
* the failure path works
* stopping rules work
* state updates correctly
* audit events are created
* the experience looks intentional
* there are no obvious placeholders
* there are no console errors
* the feature contributes to the overall recovery story

⸻

## 22. Final Instruction to Agents

Build RecoverX as if a small, highly capable fintech engineering team is shipping a polished hackathon prototype under time pressure.

Make practical engineering decisions.

Prefer simple working systems over elaborate architecture.

Prefer believable product behavior over impressive-looking AI terminology.

Every feature should answer:

“Does this help RecoverX find, recover, measure, or safely manage lost revenue?”

If not, question whether the feature belongs in the project.

Do not over-engineer.

Do not generate generic AI boilerplate.

Do not rebuild working infrastructure unnecessarily.

The product should look human-built, financially credible, technically grounded, and demo-ready.

⸻

## 23. Locked Technology Stack

* Framework: Next.js
* Language: TypeScript — do NOT use JavaScript for application code
* Frontend: React via Next.js
* Styling: Tailwind CSS
* UI Components: shadcn/ui
* Charts: Recharts
* Backend: Next.js Route Handlers / Server Actions where appropriate
* Database: PostgreSQL
* ORM: Prisma
* Validation: Zod
* Payment Integration: Razorpay Test APIs
* Payment Abstraction: PaymentProvider with RazorpayProvider and SimulationProvider
* Deployment target: Vercel

## 24. Stack Rules

1. TypeScript is mandatory for all new application code.
2. Do not introduce JavaScript files unless required by a third-party configuration/tool.
3. Do not replace Next.js with another frontend framework.
4. Do not introduce Express as a separate backend unless there is a demonstrated technical requirement.
5. Do not introduce MongoDB; use PostgreSQL for application data.
6. Use Prisma for database access.
7. Prefer existing dependencies over adding new ones.
8. Do not add an AI/LLM framework simply to make the product appear agentic.
9. The recovery engine, scoring logic, policy engine, simulation engine, and audit logic should primarily be deterministic TypeScript business logic.
10. External AI/LLM functionality may only be introduced when it provides a genuine product benefit and must never bypass RecoverX’s policy and safety controls.

## 25. Architecture Constraint

Keep the architecture conceptually separated:

Next.js UI
    ↓
Application / API Layer
    ↓
Recovery Engine
    ↓
Policy Engine
    ↓
PaymentProvider
    ├── RazorpayProvider
    └── SimulationProvider
    ↓
Prisma
    ↓
PostgreSQL

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
