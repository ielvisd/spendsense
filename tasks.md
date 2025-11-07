# SpendSense Implementation Tasks

This document breaks down the PRD into actionable tasks organized by feature area.

## 1. Project Setup & Infrastructure

### MCP Setup (Do First - Required for Development)

- [ ] Research and document Vue MCP capabilities for frontend development
- [ ] Set up MCP server configuration for Vue MCP (frontend development)
- [ ] Research and document Nuxt UI MCP component library
- [ ] Set up MCP server configuration for Nuxt UI MCP (component library)
- [ ] Research and document Supabase MCP capabilities
- [ ] Set up MCP server configuration for Supabase MCP (backend operations)
- [ ] Test MCP integrations work correctly
- [ ] Document MCP usage patterns for the project

### Project Initialization

- [ ] Initialize Nuxt 4 project with TypeScript
- [ ] Install core dependencies: `@faker-js/faker`, `date-fns`, `lodash`, `vitest`
- [ ] Install Nuxt UI for components
- [ ] Install Supabase client libraries (`@supabase/supabase-js`, `@nuxtjs/supabase`)
- [ ] Set up project folder structure (pages, composables, server/api, utils, supabase, tests, docs)
- [ ] Configure `nuxt.config.ts` with necessary modules
- [ ] Create `.env.example` file for environment variables
- [ ] Configure TypeScript paths and aliases
- [ ] Set up Vitest configuration for testing
- [ ] Create `package.json` scripts: `dev`, `build`, `generate`, `eval`, `test`

## 2. Database Schema & Supabase Setup

- [ ] Create Supabase project using Supabase MCP (list projects, create if needed)
- [ ] Configure Supabase connection and get credentials via Supabase MCP
- [ ] Design and create `users` table (id UUID, fake_name, consent_status boolean, demographics JSONB) - use Supabase MCP for migrations
- [ ] Design and create `accounts` table (user_id FK, account_id, type, subtype, balances JSONB, iso_currency_code, holder_category) - use Supabase MCP for migrations
- [ ] Design and create `transactions` table (id, account_id FK, date, amount, merchant_name, payment_channel, personal_finance_category JSONB, pending) - use Supabase MCP for migrations
- [ ] Design and create `liabilities` table (user_id FK, type, apr, interest_rate, min_payment, last_payment, overdue, next_due, last_balance) - use Supabase MCP for migrations
- [ ] Design and create `signals` table (user_id FK, signal_type, signal_data JSONB, detected_at) - use Supabase MCP for migrations
- [ ] Design and create `personas` table (user_id FK, persona_type, assigned_at, rationale) - use Supabase MCP for migrations
- [ ] Design and create `content` table (id, title, type, category, content_text, persona_target) - use Supabase MCP for migrations
- [ ] Design and create `recommendations` table (user_id FK, content_id FK, offer_data JSONB, rationale, created_at, approved_by_operator) - use Supabase MCP for migrations
- [ ] Design and create `consent` table (user_id FK, consent_status, granted_at, revoked_at) - use Supabase MCP for migrations
- [ ] Design and create `logs` table (id, user_id FK, action_type, decision_trace JSONB, created_at) - use Supabase MCP for migrations
- [ ] Create foreign key relationships - use Supabase MCP for migrations
- [ ] Set up Row Level Security (RLS) policies for all tables - use Supabase MCP
- [ ] Create RLS policy: users can only see their own data - use Supabase MCP
- [ ] Create RLS policy: operators can see all data (admin role) - use Supabase MCP
- [ ] Create database triggers for schema validation (amounts >0, dates in range) - use Supabase MCP for migrations
- [ ] Create indexes on frequently queried columns (user_id, account_id, date) - use Supabase MCP for migrations
- [ ] Export schema documentation (SQL export via Supabase MCP)

## 3. Synthetic Data Generation

- [ ] Create `~/utils/generateData.ts` utility file
- [ ] Implement weighted random function for demographics
- [ ] Implement age distribution (40% 18-34, 30% 35-54, 30% 55+)
- [ ] Implement gender distribution (50% M, 45% F, 5% Non-binary)
- [ ] Implement income brackets (20% <$30k, 50% $30-80k, 30% >$80k)
- [ ] Implement ethnicity distribution (60% White, 13% Black, 19% Hispanic, 6% Asian, 2% Other)
- [ ] Implement location generation (state, city with urban/suburban/rural mix)
- [ ] Implement household size generation (1-6, weighted distribution)
- [ ] Create `generateAccounts()` function with Plaid-style schema
- [ ] Create `generateTransactions()` function (50-200 txns per account)
- [ ] Create `generateLiabilities()` function (60% have credit cards)
- [ ] Implement `injectPersonaBehaviors()` to force ~20% per persona
- [ ] Add deterministic seeding (`faker.seed(123)`)
- [ ] Generate 50-100 users with diverse scenarios
- [ ] Include 10% "noisy" data (pending txns, overdrafts)
- [ ] Export to `public/synthetic-data.json`
- [ ] Create `npm run generate` script to execute data generation
- [ ] Test data generation produces valid JSON structure

## 4. Data Ingestion

- [ ] Create `server/api/ingest.post.ts` endpoint
- [ ] Implement CSV file upload handling
- [ ] Implement JSON file upload handling
- [ ] Store uploaded files in Supabase Storage
- [ ] Parse JSON data structure
- [ ] Implement bulk upsert for users table (batched)
- [ ] Implement bulk upsert for accounts table (batched)
- [ ] Implement bulk upsert for transactions table (batched)
- [ ] Implement bulk upsert for liabilities table (batched)
- [ ] Add validation for required fields
- [ ] Add error handling for malformed data
- [ ] Create upload progress feedback
- [ ] Test ingestion with sample synthetic data
- [ ] Verify data integrity after ingestion

## 5. Behavioral Signal Detection

- [ ] Create `server/api/signals.get.ts` endpoint
- [ ] Implement subscription signal detection (≥3 recurring merchants, monthly spend, % of total)
- [ ] Implement savings signal detection (net inflow, growth rate, emergency coverage)
- [ ] Implement credit signal detection (utilization tiers ≥30%, ≥50%, min-payment flag, interest >0, overdue)
- [ ] Implement income signal detection (payroll detection, frequency variability, cash-flow buffer)
- [ ] Use `date-fns` for time window calculations
- [ ] Store detected signals in `signals` table
- [ ] Create composable `useSignals()` for frontend access
- [ ] Add signal refresh/update logic
- [ ] Test signal detection with various user scenarios
- [ ] Optimize queries for performance

## 6. Persona Assignment

- [ ] Create `server/api/personas.post.ts` endpoint for assignment
- [ ] Implement Persona 1: High Utilization logic (utilization ≥50% OR interest >0 OR min-payment OR overdue)
- [ ] Implement Persona 2: Variable Income Budgeter logic (significant pay gap AND low cash buffer)
- [ ] Implement Persona 3: Subscription-Heavy logic (≥3 recurring AND >$50 monthly OR ≥10% share)
- [ ] Implement Persona 4: Savings Builder logic (positive savings growth OR regular inflow AND all util <30%)
- [ ] Implement Persona 5: Impulse Spender logic (≥20% small <$20 transactions AND total impulse spend ≥15% of income)
- [ ] Implement priority rules (Utilization > Income > Subscriptions)
- [ ] Store persona assignment in `personas` table with rationale
- [ ] Log persona assignment decisions in `logs` table
- [ ] Create composable `usePersonas()` for frontend access
- [ ] Test persona assignment with all 5 personas
- [ ] Verify 100% coverage (all users get a persona)

## 7. Recommendations Engine

- [ ] Create `GET /api/recommendations/:id` endpoint
- [ ] Create `content` table seed data with pre-written articles
- [ ] Implement content catalog querying by persona
- [ ] Implement rationale generation with data citations ("because [data cite]")
- [ ] Create offer mapping logic (e.g., balance transfer for high util)
- [ ] Implement eligibility checks for offers (e.g., minimum income)
- [ ] Generate 3-5 education items per user
- [ ] Generate 1-3 offers per user
- [ ] Format recommendations with "We noticed [fact]. [Benefit]." structure
- [ ] Store recommendations in `recommendations` table
- [ ] Create composable `useRecommendations()` for frontend access
- [ ] Optional: Set up Supabase Edge Function for LLM content generation (deploy via Supabase MCP)
- [ ] Test recommendation generation for each persona
- [ ] Verify all recommendations include rationales (100% explainability)

## 8. Guardrails

- [ ] Implement consent enforcement check (block processing without opt-in)
- [ ] Create `POST /api/consent` endpoint
- [ ] Implement consent revocation with data purge policy
- [ ] Create eligibility check middleware (e.g., skip HYSA if user has savings account)
- [ ] Implement tone guardrail: regex checks for shaming language
- [ ] Implement tone guardrail: keyword scanning (e.g., "reckless", "overspending")
- [ ] Add disclaimer to all recommendations: "This is educational content, not financial advice. Consult a licensed advisor."
- [ ] Create tone validation function
- [ ] Test consent enforcement blocks unauthorized access
- [ ] Test eligibility checks filter inappropriate offers
- [ ] Test tone guardrail blocks shaming language

## 9. Frontend Pages

- [ ] Create onboarding page (`pages/onboarding.vue`)
- [ ] Implement Supabase Auth registration flow
- [ ] Create file upload form for CSV/JSON data
- [ ] Add consent checkbox with clear explanation
- [ ] Create main dashboard page (`pages/index.vue`)
- [ ] Display user persona with explanation
- [ ] Display 3-5 education items as cards
- [ ] Display 1-3 offers with "because" rationales
- [ ] Add responsive design with Tailwind CSS
- [ ] Use Nuxt UI components (discover and implement via Nuxt UI MCP)
- [ ] Create authentication guard middleware
- [ ] Add loading states and error handling
- [ ] Implement feedback collection UI
- [ ] Add consent revocation option in settings
- [ ] Create calculators as Vue components (e.g., debt payoff, savings goal)
- [ ] Add ARIA labels for accessibility
- [ ] Test responsive design on mobile/tablet/desktop

## 10. Operator Dashboard

- [ ] Create protected route `/operator` with auth guard
- [ ] Implement operator role check (Supabase RLS)
- [ ] Create table view of all users
- [ ] Display user signals in expandable rows
- [ ] Display assigned personas with rationales
- [ ] Show recommendation traces in expandable format
- [ ] Implement filter functionality (by persona, by signal type)
- [ ] Add approve/override buttons for recommendations
- [ ] Create flag queue for problematic recommendations
- [ ] Implement bulk approve/flag actions
- [ ] Set up Supabase Realtime for live updates
- [ ] Add search functionality for users
- [ ] Create operator-specific composables
- [ ] Test operator access control
- [ ] Test real-time updates

## 11. Evaluation & Metrics

- [ ] Create `~/utils/evalHarness.ts` script
- [ ] Implement coverage metric calculation (% users with persona + ≥3 behaviors)
- [ ] Implement explainability metric (% recommendations with rationales)
- [ ] Implement auditability metric (% recommendations with decision traces)
- [ ] Implement fairness evaluation (persona parity by age/gender/income/ethnicity)
- [ ] Create JSON export for metrics
- [ ] Create CSV export for metrics
- [ ] Generate 1-2 page Markdown report
- [ ] Include fairness analysis in report (demographic breakdowns)
- [ ] Create `npm run eval` script
- [ ] Test eval harness produces accurate metrics
- [ ] Verify 100% coverage target
- [ ] Verify 100% explainability target
- [ ] Verify 100% auditability target

## 12. Testing

- [ ] Set up Vitest test configuration
- [ ] Write unit test: persona assignment logic (High Utilization)
- [ ] Write unit test: persona assignment logic (Variable Income)
- [ ] Write unit test: persona assignment logic (Subscription-Heavy)
- [ ] Write unit test: persona assignment logic (Savings Builder)
- [ ] Write unit test: persona assignment logic (Impulse Spender)
- [ ] Write unit test: signal detection (subscriptions)
- [ ] Write unit test: signal detection (credit utilization)
- [ ] Write integration test: user creation + data ingestion flow
- [ ] Write integration test: signal detection + persona assignment flow
- [ ] Write integration test: recommendation generation flow
- [ ] Write integration test: consent enforcement flow
- [ ] Write integration test: operator dashboard access
- [ ] Achieve ≥10 passing tests
- [ ] Generate test coverage report

## 13. Documentation & Deployment

- [ ] Create comprehensive README.md with setup instructions
- [ ] Document environment variables
- [ ] Document API endpoints
- [ ] Create schema documentation (Supabase export)
- [ ] Create decision-log.md for architectural decisions
- [ ] Document MCP server setup and usage (reference MCP usage patterns from section 1)
- [ ] Add inline code comments for complex logic
- [ ] Create one-command setup: `npm install && npm run dev`
- [ ] Test local deployment
- [ ] Optional: Set up Vercel deployment configuration
- [ ] Create demo video script (onboarding → recs → operator override)
- [ ] Prepare submission artifacts checklist


