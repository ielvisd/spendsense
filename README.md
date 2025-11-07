# SpendSense

An explainable, consent-driven financial education platform that analyzes synthetic transaction data to detect user behaviors, assign personas, and deliver personalized learning recommendations.

## Overview

SpendSense is built as a web application using Nuxt 4 for the frontend and Supabase for backend storage, authentication, and real-time features. It emphasizes transparency, user control, and ethical guardrails to avoid regulated financial advice.

## Key Features

- **Persona-based Personalization**: Assigns one of 5 financial personas based on user behavior
- **Behavioral Signal Detection**: Detects subscriptions, savings patterns, credit utilization, and income variability
- **Personalized Recommendations**: Generates 3-5 education items and 1-3 offers per user with data-backed rationales
- **Consent Management**: Built-in consent system with revocation support
- **Guardrails**: Eligibility checks, tone validation, and disclaimer enforcement
- **Operator Dashboard**: Admin interface for reviewing and managing recommendations
- **Evaluation Harness**: Metrics for coverage, explainability, auditability, and fairness

## Tech Stack

- **Frontend**: Nuxt 4 (Vue 3, TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Nuxt UI
- **Data Generation**: Faker.js
- **Testing**: Vitest
- **Date Utilities**: date-fns

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spendsense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   The database schema is automatically created via Supabase migrations. All tables, RLS policies, and indexes are set up when you run the migrations.

5. **Generate synthetic data**
   ```bash
   npm run generate
   ```
   
   This creates `public/synthetic-data.json` with 75 synthetic users.

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Project Structure

```
spendsense/
├── pages/              # Nuxt routes
│   ├── index.vue       # Main dashboard
│   ├── onboarding.vue  # User registration and data upload
│   └── operator.vue   # Operator dashboard
├── composables/        # Vue composables
│   ├── useSignals.ts
│   ├── usePersonas.ts
│   └── useRecommendations.ts
├── server/api/         # API endpoints
│   ├── ingest.post.ts
│   ├── signals.get.ts
│   ├── personas.post.ts
│   ├── recommendations.get.ts
│   ├── consent.post.ts
│   ├── feedback.post.ts
│   └── operator/
│       └── review.get.ts
├── utils/              # Utility functions
│   ├── generateData.ts # Synthetic data generator
│   └── evalHarness.ts  # Evaluation metrics
├── tests/              # Test files
├── middleware/         # Route middleware
│   └── auth.ts        # Authentication guard
└── nuxt.config.ts     # Nuxt configuration
```

## API Endpoints

### Data Ingestion
- `POST /api/ingest` - Upload and ingest synthetic user data

### Signals
- `GET /api/signals?user_id={id}` - Get detected behavioral signals for a user

### Personas
- `POST /api/personas` - Assign persona to a user
  ```json
  {
    "user_id": "uuid"
  }
  ```

### Recommendations
- `GET /api/recommendations?user_id={id}` - Get personalized recommendations

### Consent
- `POST /api/consent` - Update user consent status
  ```json
  {
    "user_id": "uuid",
    "consent_status": true
  }
  ```

### Feedback
- `POST /api/feedback` - Log user interactions
  ```json
  {
    "user_id": "uuid",
    "action_type": "click",
    "feedback_data": {}
  }
  ```

### Operator
- `GET /api/operator/review` - Get all users with signals, personas, and recommendations

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate synthetic data
- `npm run eval` - Run evaluation harness
- `npm run test` - Run tests

## Database Schema

The application uses the following main tables:

- **users** - User accounts with demographics
- **accounts** - Bank accounts (checking, savings, credit)
- **transactions** - Transaction history
- **liabilities** - Credit cards, loans, mortgages
- **signals** - Detected behavioral signals
- **personas** - Assigned financial personas
- **content** - Educational content and articles
- **recommendations** - Generated recommendations
- **consent** - User consent records
- **logs** - Decision traces and audit logs

## Personas

1. **High Utilization** - Credit utilization ≥50% or overdue accounts
2. **Variable Income Budgeter** - Irregular income with low cash buffer
3. **Subscription-Heavy** - ≥3 recurring subscriptions
4. **Savings Builder** - Positive savings growth with low credit utilization
5. **Impulse Spender** - ≥20% small transactions, ≥15% of income

## Evaluation Metrics

Run the evaluation harness to generate metrics:

```bash
npm run eval
```

This generates:
- `eval-metrics.json` - Full metrics in JSON format
- `eval-metrics.csv` - Summary metrics in CSV format
- `eval-report.md` - Detailed Markdown report

Metrics include:
- **Coverage**: % of users with persona + ≥3 behaviors
- **Explainability**: % of recommendations with rationales
- **Auditability**: % of recommendations with decision traces
- **Fairness**: Persona distribution by demographics

## Testing

Run tests with:
```bash
npm run test
```

Test coverage includes:
- Database connection tests
- Data generation tests
- Signal detection tests
- Persona assignment tests
- Integration tests for API flows

## Deployment

The application can be deployed to Vercel, Netlify, or any Node.js hosting platform.

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables in your hosting platform

3. Deploy the `.output` directory

## License

[Your License Here]

## Contributing

[Contributing Guidelines Here]
