# Decision Log

This document records key architectural and implementation decisions for SpendSense.

## Database Design

### Why PostgreSQL via Supabase?

- **Rationale**: Supabase provides a managed PostgreSQL database with built-in authentication, real-time features, and Row Level Security (RLS) policies, which are essential for user data privacy.
- **Alternatives Considered**: Direct PostgreSQL, MongoDB, Firebase
- **Trade-offs**: Managed service reduces operational overhead but adds vendor dependency

### Schema Design Decisions

1. **JSONB for Flexible Data**
   - Used JSONB for `demographics`, `balances`, `signal_data`, `decision_trace`
   - Allows flexible schema without migrations for frequently changing fields
   - Enables efficient querying with GIN indexes

2. **Separate Signals Table**
   - Signals stored separately from users for better querying and indexing
   - Allows multiple signals per user with unique constraint on (user_id, signal_type)
   - Enables efficient filtering and aggregation

3. **Consent Table Separate from Users**
   - Tracks consent history (granted_at, revoked_at)
   - Enables audit trail for compliance
   - Allows for future consent versioning

## Persona Assignment Logic

### Priority Rules

1. **High Utilization** (Priority 1)
   - Most urgent financial issue
   - Directly impacts credit score and interest payments
   - Overrides all other personas

2. **Variable Income Budgeter** (Priority 2)
   - Income stability is fundamental to financial planning
   - Takes precedence over spending patterns

3. **Subscription-Heavy** (Priority 3)
   - Recurring expenses are easier to optimize
   - Less urgent than credit or income issues

4. **Savings Builder** (Priority 4)
   - Positive behavior, lower priority for intervention
   - Default persona if no issues detected

5. **Impulse Spender** (Priority 5)
   - Behavioral pattern, less urgent than financial obligations
   - Only assigned if no higher-priority matches

### Rationale for Priority Order

The priority order reflects financial urgency:
- **Obligations** (credit, income) > **Habits** (spending patterns)
- **Negative** (high utilization) > **Positive** (savings builder)
- **Urgent** (overdue) > **Optimization** (subscriptions)

## Synthetic Data Generation

### Why Faker.js?

- **Rationale**: Industry-standard library for generating realistic test data
- **Deterministic Seeding**: Using `faker.seed(123)` ensures reproducible datasets
- **Realistic Distributions**: Weighted random functions match US demographic data

### Data Volume Decisions

- **75 Users**: Balance between realistic testing and performance
- **50-200 Transactions per Account**: Represents 6 months of typical activity
- **10% Noisy Data**: Includes edge cases (pending transactions, overdrafts)

## Guardrails Implementation

### Consent Enforcement

- **Location**: Checked at API level before any processing
- **Storage**: Separate consent table with timestamps
- **Revocation**: Updates consent status; in production would trigger data purge

### Tone Guardrail

- **Method**: Keyword scanning with regex
- **Action**: Automatic rewriting of shaming language
- **Disclaimer**: Always appended to recommendations
- **Limitation**: Simple keyword matching; could be enhanced with LLM

### Eligibility Checks

- **Rule-based**: JavaScript logic in recommendation engine
- **Examples**: Skip HYSA offer if user has savings account
- **Extensible**: Easy to add new eligibility rules

## Frontend Architecture

### Why Nuxt 4?

- **Rationale**: Full-stack framework with built-in SSR, API routes, and TypeScript support
- **Composables**: Reusable logic for signals, personas, recommendations
- **File-based Routing**: Intuitive page structure

### Component Library: Nuxt UI

- **Rationale**: Built for Nuxt, provides accessible components out of the box
- **Tailwind CSS**: Utility-first styling for rapid development
- **Accessibility**: ARIA labels and semantic HTML included

## Testing Strategy

### Test Coverage Goals

- **Unit Tests**: Core logic (persona assignment, signal detection)
- **Integration Tests**: API flows (ingestion → signals → personas → recommendations)
- **Target**: ≥10 tests as specified in PRD

### Test Framework: Vitest

- **Rationale**: Fast, Vite-native, compatible with Nuxt
- **TypeScript**: Native TypeScript support
- **Mocking**: Easy mocking of Supabase client

## Evaluation Metrics

### Coverage Metric

- **Definition**: % of users with persona + ≥3 behaviors
- **Target**: 100%
- **Calculation**: (users_with_persona AND users_with_3plus_behaviors) / total_users

### Explainability Metric

- **Definition**: % of recommendations with rationales
- **Target**: 100%
- **Rationale Format**: "We noticed [data cite]. [Benefit]."

### Auditability Metric

- **Definition**: % of recommendations with decision traces
- **Target**: 100%
- **Storage**: Logs table with decision_trace JSONB field

### Fairness Evaluation

- **Method**: Demographic breakdown of persona assignments
- **Dimensions**: Age, gender, income, ethnicity
- **Purpose**: Detect potential biases in persona assignment

## Future Enhancements

1. **LLM Integration**: Use Supabase Edge Functions with OpenAI for dynamic content generation
2. **Real-time Updates**: Leverage Supabase Realtime for live dashboard updates
3. **Mobile App**: React Native wrapper for mobile access
4. **Advanced Analytics**: More sophisticated signal detection using ML
5. **A/B Testing**: Framework for testing recommendation effectiveness

