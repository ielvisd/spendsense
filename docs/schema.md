# Database Schema Documentation

This document describes the SpendSense database schema, including tables, relationships, indexes, and validation rules.

## Overview

The SpendSense database uses PostgreSQL via Supabase with Row Level Security (RLS) enabled on all tables. The schema is designed to support:

- User data ingestion and storage
- Behavioral signal detection
- Persona assignment
- Recommendation generation
- Consent management
- Audit logging

## Tables

### users

Stores user information and demographics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique user identifier |
| `fake_name` | TEXT | Synthetic user name |
| `consent_status` | BOOLEAN | User consent status |
| `demographics` | JSONB | Age, gender, income, ethnicity, location |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_users_id` on `id`
- `idx_users_consent_status` on `consent_status` (partial, WHERE consent_status = true)

**Relationships:**
- One-to-many with `accounts`
- One-to-many with `transactions` (via accounts)
- One-to-many with `liabilities`
- One-to-many with `signals`
- One-to-one with `personas`
- One-to-one with `consent`
- One-to-many with `recommendations`
- One-to-many with `logs`

---

### accounts

Stores user financial accounts (checking, savings, credit cards).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique account identifier |
| `user_id` | UUID (FK) | Reference to users.id |
| `account_id` | TEXT | External account identifier |
| `type` | TEXT | Account type (checking, savings, credit, etc.) |
| `subtype` | TEXT | Account subtype (optional) |
| `balances` | JSONB | Current and available balances |
| `iso_currency_code` | TEXT | Currency code (default: USD) |
| `holder_category` | TEXT | Account holder category |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_accounts_user_id` on `user_id`
- `idx_accounts_account_id` on `account_id`

**Relationships:**
- Many-to-one with `users`
- One-to-many with `transactions`

---

### transactions

Stores individual financial transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique transaction identifier |
| `account_id` | UUID (FK) | Reference to accounts.id |
| `date` | DATE | Transaction date |
| `amount` | NUMERIC | Transaction amount (negative for debits) |
| `merchant_name` | TEXT | Merchant name (optional) |
| `payment_channel` | TEXT | Payment channel (online, in-store, etc.) |
| `personal_finance_category` | JSONB | Transaction category |
| `pending` | BOOLEAN | Whether transaction is pending |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

**Indexes:**
- `idx_transactions_account_id` on `account_id`
- `idx_transactions_date` on `date` (DESC)
- `idx_transactions_user_account` on `account_id, date` (DESC)

**Validation Triggers:**
- `check_transaction_amount`: Ensures amount > 0
- `check_transaction_date`: Ensures date is not in future and not more than 10 years old

**Relationships:**
- Many-to-one with `accounts`

---

### liabilities

Stores user liabilities (credit cards, loans).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique liability identifier |
| `user_id` | UUID (FK) | Reference to users.id |
| `type` | TEXT | Liability type (credit_card, loan, etc.) |
| `apr` | NUMERIC | Annual percentage rate (0-100) |
| `interest_rate` | NUMERIC | Interest rate (0-100) |
| `min_payment` | NUMERIC | Minimum payment amount |
| `last_payment` | NUMERIC | Last payment amount |
| `overdue` | BOOLEAN | Whether account is overdue |
| `next_due` | DATE | Next payment due date |
| `last_balance` | NUMERIC | Last known balance |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Validation Triggers:**
- `check_liability_amounts`: Ensures amounts are non-negative, rates are 0-100
- `check_liability_dates`: Warns if next_due is in the past

**Relationships:**
- Many-to-one with `users`

---

### signals

Stores detected behavioral signals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique signal identifier |
| `user_id` | UUID (FK) | Reference to users.id |
| `signal_type` | TEXT | Signal type (subscriptions, savings, credit_high_utilization, income) |
| `signal_data` | JSONB | Signal-specific data |
| `detected_at` | TIMESTAMPTZ | When signal was detected |

**Indexes:**
- `idx_signals_user_id` on `user_id`
- `idx_signals_type` on `signal_type`
- `idx_signals_detected_at` on `detected_at` (DESC)

**Relationships:**
- Many-to-one with `users`

---

### personas

Stores assigned financial personas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique persona identifier |
| `user_id` | UUID (FK, UNIQUE) | Reference to users.id |
| `persona_type` | TEXT | Persona type (high_utilization, variable_income_budgeter, subscription_heavy, savings_builder, impulse_spender) |
| `assigned_at` | TIMESTAMPTZ | When persona was assigned |
| `rationale` | TEXT | Explanation for persona assignment |

**Indexes:**
- `idx_personas_user_id` on `user_id`
- `idx_personas_type` on `persona_type`

**Relationships:**
- One-to-one with `users`

---

### content

Stores educational content and offers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique content identifier |
| `title` | TEXT | Content title |
| `type` | TEXT | Content type (education, offer) |
| `category` | TEXT | Content category (optional) |
| `content_text` | TEXT | Full content text |
| `persona_target` | TEXT | Target persona (optional, null for general) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Relationships:**
- One-to-many with `recommendations`

---

### recommendations

Stores generated recommendations for users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique recommendation identifier |
| `user_id` | UUID (FK) | Reference to users.id |
| `content_id` | UUID (FK) | Reference to content.id (optional) |
| `offer_data` | JSONB | Offer details (for offers) |
| `rationale` | TEXT | Explanation for recommendation |
| `created_at` | TIMESTAMPTZ | When recommendation was created |
| `approved_by_operator` | UUID (FK) | Operator who approved (optional) |

**Indexes:**
- `idx_recommendations_user_id` on `user_id`
- `idx_recommendations_approved` on `approved_by_operator` (partial, WHERE approved_by_operator IS NULL)
- `idx_recommendations_created_at` on `created_at` (DESC)

**Relationships:**
- Many-to-one with `users`
- Many-to-one with `content`
- Many-to-one with `users` (approved_by_operator)

---

### consent

Stores user consent records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique consent identifier |
| `user_id` | UUID (FK, UNIQUE) | Reference to users.id |
| `consent_status` | BOOLEAN | Consent status |
| `granted_at` | TIMESTAMPTZ | When consent was granted |
| `revoked_at` | TIMESTAMPTZ | When consent was revoked |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_consent_user_id` on `user_id`
- `idx_consent_status` on `consent_status` (partial, WHERE consent_status = true)

**Relationships:**
- One-to-one with `users`

---

### logs

Stores audit logs for all actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique log identifier |
| `user_id` | UUID (FK) | Reference to users.id (optional) |
| `action_type` | TEXT | Action type (persona_assignment, recommendation_generated, recommendation_flagged, etc.) |
| `decision_trace` | JSONB | Decision trace data |
| `created_at` | TIMESTAMPTZ | When action occurred |

**Indexes:**
- `idx_logs_user_id` on `user_id`
- `idx_logs_action_type` on `action_type`
- `idx_logs_created_at` on `created_at` (DESC)

**Relationships:**
- Many-to-one with `users`

---

## Row Level Security (RLS)

All tables have RLS enabled with policies:

1. **Users can only see their own data**: `auth.uid() = user_id`
2. **Operators can see all data**: `auth.jwt() ->> 'role' = 'operator'` (or similar)

## Validation Rules

### Transactions
- Amount must be > 0
- Date cannot be in the future
- Date cannot be more than 10 years in the past

### Liabilities
- Amounts (min_payment, last_payment, last_balance) must be >= 0
- Rates (apr, interest_rate) must be between 0 and 100
- next_due date warnings for past dates

## Performance Optimizations

### Indexes
All frequently queried columns have indexes:
- Foreign keys (user_id, account_id)
- Date columns (date, created_at, detected_at)
- Filter columns (consent_status, signal_type, persona_type)
- Composite indexes for common query patterns

### Query Patterns
- User lookups by ID (indexed)
- Transaction date range queries (indexed)
- Signal detection queries (indexed by user_id and type)
- Recommendation queries (indexed by user_id and approval status)

## TypeScript Types

TypeScript types are auto-generated from the schema and available in `types/database.types.ts`. These types are kept in sync with the database schema via Supabase CLI.

## Migration History

All schema changes are tracked via Supabase migrations. The current schema includes:

1. Initial schema creation
2. Index creation for performance
3. Validation triggers for data integrity

