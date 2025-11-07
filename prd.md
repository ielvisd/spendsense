Here is the Product Requirements Document with all timeframes and dates removed.

-----

# SpendSense Product Requirements Document (PRD)

# 1\. Executive Summary

**Product Name:** SpendSense
**Version:** 1.0
**Author:** Grok (with input from @ElToritoElvis)

**Overview:** SpendSense is an explainable, consent-driven financial education platform that analyzes synthetic transaction data (mimicking Plaid integrations) to detect user behaviors, assign personas, and deliver personalized learning recommendations. It emphasizes transparency, user control, and ethical guardrails to avoid regulated financial advice. Built as a web app using Nuxt.js for the frontend and Supabase for backend storage, authentication, and real-time features. No live Plaid integration—focus on synthetic data for demo/evaluation purposes.

**Key Differentiators:**

  * Persona-based personalization with clear, data-backed rationales.
  * Built-in consent, eligibility, and tone checks for trust and compliance.
  * Operator dashboard for oversight.
  * Evaluation harness for metrics like coverage and explainability.

**Target Users:**

  * **End Users:** Individuals seeking financial education (50-100 synthetic users for testing).
  * **Operators:** Admins reviewing signals and recommendations.

**Success Metrics (High-Level):**

| Category | Metric | Target |
| :--- | :--- | :--- |
| Coverage | % of users with persona + ≥3 behaviors | 100% |
| Explainability | % of recommendations with rationales | 100% |
| Auditability | % of recommendations with decision traces | 100% |
| Code Quality | Passing unit/integration tests | ≥10 tests |

**Scope:** Full MVP including data ingestion, signal detection, personas, recommendations, guardrails, operator view, and evaluation. Optional AI for content generation (e.g., via Supabase Edge Functions with OpenAI integration). Excludes live Plaid, mobile app (web-first, responsive design).

-----

# 2\. Problem Statement & Objectives

## Background

Banks collect vast transaction data via Plaid but can't easily convert it into personalized insights without risking regulatory issues. SpendSense solves this by:

  * Generating synthetic data for safe prototyping.
  * Detecting patterns (e.g., high credit utilization) without PII.
  * Assigning one of 5 personas for tailored education.
  * Providing rationales like "Your Visa at 68% utilization ($3,400/$5,000) could save $87/month in interest."

## Business Objectives

  * **Primary:** Build a trustworthy, auditable system for financial education (education \> sales).
  * **Secondary:** Demonstrate explainability and fairness in AI-driven personalization.
  * **Tertiary:** Create a modular, local-run prototype for portfolio/demo purposes.

## User Objectives

  * **End Users:** Gain actionable, jargon-free insights with full consent control.
  * **Operators:** Easily oversee and intervene in recommendations.

-----

# 3\. User Personas & Journeys

(Note: These are app user personas, distinct from the financial behavior personas in Section 5.)

| Persona | Description | Goals | Pain Points | Journey Touchpoints |
| :--- | :--- | :--- | :--- | :--- |
| **Curious Learner (End User)** | Tech-savvy, variable income freelancer. | Build emergency fund; audit subscriptions. | Overwhelmed by jargon; fears data privacy. | Onboard → Opt-in consent → Dashboard with persona insights → Interact with recommendations → Revoke consent if needed. |
| **Oversight Admin (Operator)**| Product manager at a fintech. | Review signals; approve overrides. | Manual audits are time-consuming. | Login → Operator dashboard → Filter users → View traces → Bulk approve/flag. |

## Key Flows:

  * **Onboarding:** User registers (Supabase Auth), uploads synthetic data CSV/JSON, opts in via checkbox.
  * **Dashboard:** Nuxt page showing persona, 3-5 education items, 1-3 offers with "because" rationales.
  * **Operator Review:** Protected route (`/operator`) with Supabase RLS for auth.
  * **Feedback Loop:** `POST /feedback` endpoint to log interactions.

-----

# 4\. Features & Requirements

Features are prioritized. All features must include:

  * **Consent Enforcement:** Supabase table for consent status; block processing without opt-in.
  * **Tone Guardrail:** Regex/LLM checks for shaming language (e.g., block "overspending"); append disclaimer: "This is educational content, not financial advice. Consult a licensed advisor."
  * **Eligibility Checks:** Rule-based (e.g., no HYSA offer if user has savings account).
  * **Explainability:** Every output cites data (e.g., "Based on 3 recurring merchants totaling $120/month").

## 4.1 Data Ingestion (Plaid-Style Synthetic Generator)

  * **Input:** CSV/JSON upload via Nuxt form (store in Supabase Storage).
  * **Schema (Supabase Tables):**
      * **users:** `id` (UUID), `fake_name`, `consent_status` (boolean), `demographics` (JSON for fairness eval).
      * **accounts:** `user_id` (FK), `account_id`, `type/subtype`, `balances` (JSON: {available, current, limit}), `iso_currency_code`, `holder_category`.
      * **transactions:** `id`, `account_id` (FK), `date`, `amount`, `merchant_name`, `payment_channel`, `personal_finance_category` (JSON: {primary, detailed}), `pending`.
      * **liabilities:** `user_id` (FK), `type` (credit/mortgage/loan), `apr/interest_rate`, `min_payment`, `last_payment`, `overdue`, `next_due`, `last_balance`.
  * **Generator:** Nuxt composable using Faker.js for 50-100 users; diverse scenarios (e.g., low-income high-utilization). Seed for determinism.
  * **Validation:** Supabase triggers for schema enforcement.

### Demographics Details

To mimic real US banking apps (e.g., Plaid users skew younger/digital-savvy), we'll generate:

| Field | Typical Range/Distribution | Rationale/Source |
| :--- | :--- | :--- |
| **age** | 18-65 (weighted: 40% 18-34 Millennials/Gen Z, 30% 35-54 Gen X, 30% 55+ Boomers) | Younger users dominate mobile/app banking (64-68% primary for Gen Z/Millennials). |
| **gender** | M/F/Non-binary (50/45/5%) | Balanced, slight male skew in fintech. |
| **annual\_income** | $20k-$200k (brackets: 20% \<$30k low, 50% $30-80k middle, 30% >$80k high) | Income correlates with app usage/digital payments. |
| **ethnicity** | White (60%), Black (13%), Hispanic (19%), Asian (6%), Other (2%) | US Census-aligned for fairness; Plaid surveys break out ethnicity. |
| **location** | US states/cities (e.g., 20% CA/NY/TX urban, 30% suburban, 50% rural mix) | Region/urbanicity affects behaviors (e.g., higher spend in urban). |
| **household\_size** | 1-6 (avg 2.5; 40% singles, 40% couples, 20% families) | Influences spending patterns (e.g., family = higher groceries). |

**Fairness Eval:** In eval harness, check persona parity (e.g., % High Utilization by age/gender/income) to flag biases.

### 4.1.1 Synthetic Data Generation Method

We'll build a deterministic generator as a Nuxt utility (`~/utils/generateData.ts`) using Faker.js (`npm i @faker-js/faker`). Seed for reproducibility (e.g., `faker.seed(123)`). Run via `npm run generate` to output `synthetic-data.json` (50-100 users), then ingest via server route.

**High-Level Logic (Pseudocode):**

```ts
// ~/utils/generateData.ts
import { faker } from '@faker-js/faker';
import { writeFileSync } from 'fs';

faker.seed(123); // Deterministic

const numUsers = 75; // Mid-range
const users: UserWithData[] = [];

for (let i = 0; i < numUsers; i++) {
  const demographics = {
    age: faker.number.int({ min: 18, max: 65 }), // Weighted distro via custom fn
    gender: weightedRandom(['M', 'F', 'Non-binary'], [0.5, 0.45, 0.05]),
    annual_income: weightedRandom([20000, 50000, 100000, 150000], [0.2, 0.5, 0.2, 0.1]), // Brackets
    ethnicity: weightedRandom(['White', 'Black', 'Hispanic', 'Asian', 'Other'], [0.6, 0.13, 0.19, 0.06, 0.02]),
    location: { state: faker.location.state(), city: faker.location.city() },
    household_size: faker.number.int({ min: 1, max: 6 }),
  };

  const fakeName = faker.person.fullName({ gender: demographics.gender === 'M' ? 'male' : 'female' }); // Gender-aware

  // Generate 1-3 accounts (checking/savings/credit) with balances
  const accounts = generateAccounts(demographics); // E.g., low-income = lower limits

  // Generate 50-200 txns per account (past X days), diverse merchants/categories
  const transactions = generateTransactions(accounts, demographics); // E.g., high household = more groceries

  // Liabilities if applicable (e.g., 60% have credit cards)
  const liabilities = Math.random() > 0.4 ? generateLiabilities(demographics) : [];

  // Inject behaviors for personas (e.g., 20% high util: set balances high)
  injectPersonaBehaviors(i % 5, accounts, transactions, liabilities); // Cycle through 5 personas

  users.push({ id: faker.string.uuid(), fake_name: fakeName, demographics, accounts, transactions, liabilities });
}

writeFileSync('./public/synthetic-data.json', JSON.stringify(users, null, 2));

// Helpers: weightedRandom(arr, weights), generateAccounts() with Plaid schema, etc.
```

**Key Features:**

  * **Diversity:** Weighted randoms ensure realistic spreads (e.g., more young/low-income for edge cases like Variable Income).
  * **Persona Injection:** Post-gen, tweak data to force \~20% per persona for 100% coverage testing.
  * **Volume:** 50-100 users; \~10k total txns for performance testing.
  * **Ingest:** Nuxt server route (`server/api/ingest.post.ts`): Parse JSON → Supabase bulk upserts (use `supabase.from('transactions').upsert()` in batches).
  * **Validation:** Post-ingest trigger checks schema (e.g., amounts \>0, dates in range).
  * **Edge Cases:** 10% "noisy" data (e.g., pending txns, overdrafts) for robustness.

Run once for eval dataset; regenerate with new seed for variety.

## 4.2 Behavioral Signal Detection

  * **Signals (Stored in `signals` table):**
      * **Subscriptions:** Recurring merchants (e.g., ≥3 occurrences), monthly spend, % of total.
      * **Savings:** Net inflow, growth rate, emergency coverage (savings / avg expenses).
      * **Credit:** Utilization tiers (e.g., ≥30%, ≥50%), min-payment flag, interest \>0, overdue.
      * **Income:** Payroll detection (`merchant_name` like "PAYROLL"), frequency variability, cash-flow buffer.
  * **Implementation:** Nuxt server API routes querying Supabase; use `date-fns` for windows.

## 4.3 Persona Assignment

  * **Max 5 Personas:** Rules-based priority (e.g., High Utilization overrides others). Stored in `personas` table.
  * **Persona 1: High Utilization** – Criteria: Utilization ≥50% OR interest \>0 OR min-payment OR overdue. Focus: Debt reduction, autopay tips.
  * **Persona 2: Variable Income Budgeter** – Criteria: Significant pay gap AND low cash buffer. Focus: % budgets, emergency basics.
  * **Persona 3: Subscription-Heavy** – Criteria: ≥3 recurring AND (e.g., \>$50 monthly OR ≥10% share). Focus: Audit checklists, alerts.
  * **Persona 4: Savings Builder** – Criteria: Positive savings growth OR regular inflow AND all util \<30%. Focus: Goals, automation, HYSA.
  * **Persona 5: Impulse Spender (Custom)** – Criteria: ≥20% of transactions are small (\<$20) impulse buys (e.g., `merchant_category`="food\_dining" with high frequency/variability) AND total impulse spend ≥15% of income. Rationale: Impulse spending erodes savings subtly; common in young adults. Focus: Mindful spending trackers, spending-pause rules, alternative rewards (e.g., cashback apps). Prioritization: Assign if no higher-priority match; deprioritize if utilization is low.
  * **Logic:** If multiple matches, prioritize by severity (e.g., Utilization \> Income \> Subscriptions).

## 4.4 Personalization & Recommendations

  * **Output (via `GET /recommendations/{user_id}`):** JSON with 3-5 education items, 1-3 offers.
  * **Content Catalog:** Supabase table `content` with pre-written articles/templates (e.g., "Debt Snowball Guide"). Optional: LLM (via Supabase Edge Function) for dynamic plain-language generation.
  * **Rationale Format:** Always include "because [data cite]." E.g., "We noticed [specific fact]. [Benefit]."
  * **Offers:** Rule-mapped (e.g., balance transfer if high util); eligibility via signals (e.g., minimum income). Partners: Mock (e.g., "Chase Slate" for transfers).
  * **Examples:**
      * **Education:** Budget template link for Variable Income.
      * **Offer:** "Try Rocket Money for subs (eligible: you have 4 recurring)."

## 4.5 Consent, Eligibility & Tone Guardrails

  * **Consent:** Supabase Auth + `consent` table; `POST /consent` endpoint. Revocation triggers data purge (Supabase policy).
  * **Eligibility:** JS rules in Nuxt middleware (e.g., `if (has_savings_account) skip HYSA`).
  * **Tone:** Pre/post-generation checks (e.g., scan for keywords like "reckless"); rewrite if needed.

## 4.6 Operator View

  * **Nuxt Pages:** `/operator` (auth-guarded via Supabase).
  * **Features:** Table view of users/signals/personas; expandable traces; approve/override buttons (update `recommendations` table); flag queue.
  * **Real-Time:** Supabase Realtime for live updates.

## 4.7 Evaluation & Metrics

  * **Harness:** Nuxt script (`npm run eval`) querying Supabase for metrics.
  * **Outputs:** JSON/CSV export; 1-2 page Markdown report (fairness: parity across synthetic demographics like age/income).
  * **Traces:** Log all decisions in `logs` table (e.g., "Persona assigned due to util=68%").

-----

# 5\. Technical Architecture

## Stack

  * **Frontend:** Nuxt 4 (Vue 3, TypeScript) – Pages for dashboard, operator, onboarding; Composables for signals/personas.
  * **Backend:** Supabase – Postgres for storage, Auth for users/consent, Storage for CSVs, Edge Functions for heavy compute (e.g., signal detection if SQL limits hit).
  * **Data Gen:** Faker.js in Nuxt utility.
  * **Other:** `date-fns` (dates), `lodash` (utils); Vitest for ≥10 tests. No external deps beyond npm installs.
  * **Deployment:** Local dev (one-command: `npm install && npm run dev`); optional Vercel for demo.

## Modules (Folder Structure)

```
spendsense/
├── pages/          # Nuxt routes: index.vue (dashboard), operator.vue
├── composables/    # useSignals(), usePersonas(), useRecommendations()
├── server/api/     # Routes: /users.post.ts, /recommendations.get.ts
├── stores/         # (Unused; composables only)
├── utils/          # dataGenerator.ts (Faker), evalHarness.ts
├── supabase/       # Client config, schema migrations
├── tests/          # Vitest suites
├── docs/           # README.md, schema.sql, decision-log.md
└── nuxt.config.ts
```

## API Endpoints (Supabase + Nuxt Server Routes)

  * `POST /api/users` – Create user + ingest data.
  * `POST /api/consent` – Update consent.
  * `GET /api/profile/:id` – Signals + persona.
  * `GET /api/recommendations/:id` – Personalized output.
  * `POST /api/feedback` – Log interactions.
  * `GET /api/operator/review` – Approval queue.

## Security/Compliance

  * RLS on all tables (e.g., users see only own data).
  * No PII; synthetic only.
  * Disclaimer on all recs.

-----

# 6\. Non-Functional Requirements

  * **Performance:** Queries optimized for reasonable response times.
  * **Accessibility:** Nuxt defaults + ARIA labels.
  * **UX:** Responsive (Tailwind CSS); simple dashboard with cards for recs. Creative: Embed calculators (Vue components).
  * **Testing:** 5 unit (e.g., persona logic), 5 integration (e.g., API flows).
  * **Determinism:** Seed Faker; fixed eval dataset.

-----

# 7\. Risks & Assumptions

  * **Risks:** Supabase query complexity for signals → Mitigate with Edge Functions. LLM costs if used → Stick to rules-based.
  * **Assumptions:** Individual dev; no regulatory review needed (educational prototype). Synthetic data covers edge cases.

-----

# 8\. Submission Artifacts

  * GitHub repo with code/docs.
  * 1-2 page writeup (this PRD + tech notes).
  * Demo video (Loom: onboarding → recs → operator override).
  * Metrics JSON/CSV + report.
  * Schema docs (Supabase export).
  * Test results (Vitest coverage).