# SpendSense Architecture Diagrams

## System Architecture & Data Flow

```mermaid
graph TB
    subgraph "MCP Integrations"
        VueMCP[Vue MCP<br/>Frontend Dev]
        NuxtUIMCP[Nuxt UI MCP<br/>Component Library]
        SupabaseMCP[Supabase MCP<br/>Backend Operations]
    end

    subgraph "Frontend - Nuxt 4"
        Onboarding[Onboarding Page<br/>Auth + Data Upload]
        Dashboard[Dashboard<br/>Persona + Recommendations]
        OperatorDash[Operator Dashboard<br/>Review & Override]
        Composables[Composables<br/>useSignals, usePersonas,<br/>useRecommendations]
    end

    subgraph "Backend - Nuxt Server Routes"
        IngestAPI[POST /api/ingest<br/>Data Ingestion]
        ConsentAPI[POST /api/consent<br/>Consent Management]
        ProfileAPI[GET /api/profile/:id<br/>Signals + Persona]
        RecAPI[GET /api/recommendations/:id<br/>Personalized Output]
        FeedbackAPI[POST /api/feedback<br/>User Interactions]
        OperatorAPI[GET /api/operator/review<br/>Approval Queue]
    end

    subgraph "Data Generation"
        DataGen[generateData.ts<br/>Faker.js Utility]
        SyntheticData[Synthetic Data JSON<br/>50-100 Users]
    end

    subgraph "Supabase Backend"
        Auth[Supabase Auth<br/>User Registration]
        Storage[Supabase Storage<br/>CSV/JSON Files]
        EdgeFuncs[Edge Functions<br/>Optional LLM]
        Realtime[Supabase Realtime<br/>Live Updates]
        
        subgraph "PostgreSQL Database"
            UsersTbl[(users<br/>id, fake_name,<br/>consent_status,<br/>demographics)]
            AccountsTbl[(accounts<br/>user_id, account_id,<br/>type, balances)]
            TransactionsTbl[(transactions<br/>account_id, date,<br/>amount, merchant)]
            LiabilitiesTbl[(liabilities<br/>user_id, type,<br/>apr, overdue)]
            SignalsTbl[(signals<br/>user_id, signal_type,<br/>signal_data)]
            PersonasTbl[(personas<br/>user_id, persona_type,<br/>rationale)]
            ContentTbl[(content<br/>id, title, type,<br/>persona_target)]
            RecsTbl[(recommendations<br/>user_id, content_id,<br/>rationale)]
            ConsentTbl[(consent<br/>user_id, status,<br/>granted_at)]
            LogsTbl[(logs<br/>user_id, action_type,<br/>decision_trace)]
        end
    end

    subgraph "Processing Pipeline"
        SignalDetect[Signal Detection<br/>Subscriptions, Savings,<br/>Credit, Income]
        PersonaAssign[Persona Assignment<br/>5 Personas with Priority]
        RecEngine[Recommendations Engine<br/>3-5 Education + 1-3 Offers]
        Guardrails[Guardrails<br/>Consent, Eligibility, Tone]
    end

    subgraph "Evaluation"
        EvalHarness[Eval Harness<br/>Coverage, Explainability,<br/>Auditability, Fairness]
        Metrics[Metrics Export<br/>JSON/CSV + Report]
    end

    %% MCP Connections
    VueMCP -.->|Assist| Onboarding
    VueMCP -.->|Assist| Dashboard
    NuxtUIMCP -.->|Components| Dashboard
    NuxtUIMCP -.->|Components| OperatorDash
    SupabaseMCP -.->|Migrations| UsersTbl
    SupabaseMCP -.->|Operations| AccountsTbl
    SupabaseMCP -.->|Operations| TransactionsTbl

    %% Data Generation Flow
    DataGen --> SyntheticData
    SyntheticData --> IngestAPI

    %% User Flow
    Onboarding --> Auth
    Onboarding --> Storage
    Onboarding --> ConsentAPI
    ConsentAPI --> ConsentTbl

    %% Data Ingestion Flow
    IngestAPI --> UsersTbl
    IngestAPI --> AccountsTbl
    IngestAPI --> TransactionsTbl
    IngestAPI --> LiabilitiesTbl

    %% Signal Detection Flow
    TransactionsTbl --> SignalDetect
    AccountsTbl --> SignalDetect
    LiabilitiesTbl --> SignalDetect
    SignalDetect --> SignalsTbl

    %% Persona Assignment Flow
    SignalsTbl --> PersonaAssign
    AccountsTbl --> PersonaAssign
    LiabilitiesTbl --> PersonaAssign
    PersonaAssign --> PersonasTbl
    PersonaAssign --> LogsTbl

    %% Recommendations Flow
    PersonasTbl --> RecEngine
    ContentTbl --> RecEngine
    SignalsTbl --> RecEngine
    Guardrails --> RecEngine
    RecEngine --> RecsTbl
    RecEngine --> LogsTbl

    %% Frontend Access
    Dashboard --> Composables
    Composables --> ProfileAPI
    Composables --> RecAPI
    ProfileAPI --> SignalsTbl
    ProfileAPI --> PersonasTbl
    RecAPI --> RecsTbl
    RecAPI --> ContentTbl

    %% Operator Flow
    OperatorDash --> OperatorAPI
    OperatorAPI --> UsersTbl
    OperatorAPI --> SignalsTbl
    OperatorAPI --> PersonasTbl
    OperatorAPI --> RecsTbl
    OperatorDash --> Realtime

    %% Feedback Loop
    Dashboard --> FeedbackAPI
    FeedbackAPI --> LogsTbl

    %% Evaluation
    UsersTbl --> EvalHarness
    PersonasTbl --> EvalHarness
    RecsTbl --> EvalHarness
    LogsTbl --> EvalHarness
    EvalHarness --> Metrics

    %% RLS Security
    UsersTbl -.->|RLS Policies| Auth
    AccountsTbl -.->|RLS Policies| Auth
    TransactionsTbl -.->|RLS Policies| Auth

    style VueMCP fill:#e1f5ff
    style NuxtUIMCP fill:#e1f5ff
    style SupabaseMCP fill:#e1f5ff
    style Dashboard fill:#c8e6c9
    style OperatorDash fill:#fff9c4
    style SignalDetect fill:#ffccbc
    style PersonaAssign fill:#ffccbc
    style RecEngine fill:#ffccbc
    style Guardrails fill:#f8bbd0
```

## User Journey Flow

```mermaid
sequenceDiagram
    participant User as End User
    participant Onboarding as Onboarding Page
    participant Auth as Supabase Auth
    participant API as Nuxt API Routes
    participant DB as Supabase DB
    participant Signals as Signal Detection
    participant Persona as Persona Assignment
    participant Recs as Recommendations Engine
    participant Dashboard as Dashboard

    User->>Onboarding: Register Account
    Onboarding->>Auth: Create User
    Auth-->>Onboarding: User Created
    
    User->>Onboarding: Upload Synthetic Data (CSV/JSON)
    Onboarding->>API: POST /api/ingest
    API->>DB: Bulk Upsert (users, accounts, transactions, liabilities)
    DB-->>API: Data Stored
    
    User->>Onboarding: Grant Consent (Checkbox)
    Onboarding->>API: POST /api/consent
    API->>DB: Update consent table
    DB-->>API: Consent Granted
    
    API->>Signals: Trigger Signal Detection
    Signals->>DB: Analyze transactions, accounts, liabilities
    Signals->>DB: Store detected signals
    
    Signals->>Persona: Trigger Persona Assignment
    Persona->>DB: Evaluate signals against 5 personas
    Persona->>DB: Assign persona with rationale
    Persona->>DB: Log decision trace
    
    Persona->>Recs: Generate Recommendations
    Recs->>DB: Query content by persona
    Recs->>DB: Apply guardrails (consent, eligibility, tone)
    Recs->>DB: Store recommendations with rationales
    
    User->>Dashboard: View Dashboard
    Dashboard->>API: GET /api/profile/:id
    API->>DB: Fetch signals + persona
    DB-->>API: Return data
    API-->>Dashboard: Display persona
    
    Dashboard->>API: GET /api/recommendations/:id
    API->>DB: Fetch recommendations
    DB-->>API: Return recommendations
    API-->>Dashboard: Display 3-5 education + 1-3 offers
    
    User->>Dashboard: Interact with Recommendations
    Dashboard->>API: POST /api/feedback
    API->>DB: Log interaction
```

## Database Schema Relationships

```mermaid
erDiagram
    users ||--o{ accounts : "has"
    users ||--o{ liabilities : "has"
    users ||--o{ signals : "generates"
    users ||--o{ personas : "assigned"
    users ||--o{ recommendations : "receives"
    users ||--|| consent : "grants"
    users ||--o{ logs : "generates"
    
    accounts ||--o{ transactions : "contains"
    
    content ||--o{ recommendations : "used_in"
    
    users {
        uuid id PK
        string fake_name
        boolean consent_status
        jsonb demographics
    }
    
    accounts {
        uuid id PK
        uuid user_id FK
        string account_id
        string type
        string subtype
        jsonb balances
        string iso_currency_code
    }
    
    transactions {
        uuid id PK
        uuid account_id FK
        date date
        decimal amount
        string merchant_name
        string payment_channel
        jsonb personal_finance_category
        boolean pending
    }
    
    liabilities {
        uuid id PK
        uuid user_id FK
        string type
        decimal apr
        decimal interest_rate
        decimal min_payment
        boolean overdue
    }
    
    signals {
        uuid id PK
        uuid user_id FK
        string signal_type
        jsonb signal_data
        timestamp detected_at
    }
    
    personas {
        uuid id PK
        uuid user_id FK
        string persona_type
        timestamp assigned_at
        text rationale
    }
    
    content {
        uuid id PK
        string title
        string type
        string category
        text content_text
        string persona_target
    }
    
    recommendations {
        uuid id PK
        uuid user_id FK
        uuid content_id FK
        jsonb offer_data
        text rationale
        timestamp created_at
        uuid approved_by_operator
    }
    
    consent {
        uuid id PK
        uuid user_id FK
        boolean consent_status
        timestamp granted_at
        timestamp revoked_at
    }
    
    logs {
        uuid id PK
        uuid user_id FK
        string action_type
        jsonb decision_trace
        timestamp created_at
    }
```

## Persona Assignment Logic Flow

```mermaid
flowchart TD
    Start([User Data Ingested]) --> CheckConsent{Consent<br/>Granted?}
    CheckConsent -->|No| Block[Block Processing]
    CheckConsent -->|Yes| DetectSignals[Detect Signals]
    
    DetectSignals --> SubSignals[Subscription Signals<br/>≥3 recurring, >$50/month]
    DetectSignals --> SavingsSignals[Savings Signals<br/>Growth rate, emergency coverage]
    DetectSignals --> CreditSignals[Credit Signals<br/>Utilization ≥30%, ≥50%, overdue]
    DetectSignals --> IncomeSignals[Income Signals<br/>Payroll detection, variability]
    
    SubSignals --> PersonaEval[Persona Evaluation]
    SavingsSignals --> PersonaEval
    CreditSignals --> PersonaEval
    IncomeSignals --> PersonaEval
    
    PersonaEval --> CheckUtil{High Utilization?<br/>≥50% OR interest >0<br/>OR overdue}
    CheckUtil -->|Yes| Persona1[Persona 1:<br/>High Utilization]
    
    CheckUtil -->|No| CheckIncome{Variable Income?<br/>Pay gap AND<br/>low cash buffer}
    CheckIncome -->|Yes| Persona2[Persona 2:<br/>Variable Income Budgeter]
    
    CheckIncome -->|No| CheckSubs{Subscription-Heavy?<br/>≥3 recurring AND<br/>>$50/month OR ≥10%}
    CheckSubs -->|Yes| Persona3[Persona 3:<br/>Subscription-Heavy]
    
    CheckSubs -->|No| CheckSavings{Savings Builder?<br/>Positive growth AND<br/>util <30%}
    CheckSavings -->|Yes| Persona4[Persona 4:<br/>Savings Builder]
    
    CheckSavings -->|No| CheckImpulse{Impulse Spender?<br/>≥20% small txns AND<br/>≥15% of income}
    CheckImpulse -->|Yes| Persona5[Persona 5:<br/>Impulse Spender]
    
    CheckImpulse -->|No| Default[Default Persona<br/>Savings Builder]
    
    Persona1 --> StorePersona[Store Persona<br/>with Rationale]
    Persona2 --> StorePersona
    Persona3 --> StorePersona
    Persona4 --> StorePersona
    Persona5 --> StorePersona
    Default --> StorePersona
    
    StorePersona --> LogDecision[Log Decision Trace]
    LogDecision --> GenerateRecs[Generate Recommendations]
    GenerateRecs --> ApplyGuardrails[Apply Guardrails]
    
    ApplyGuardrails --> CheckEligibility{Eligibility<br/>Check}
    CheckEligibility -->|Pass| CheckTone{Tone<br/>Validation}
    CheckEligibility -->|Fail| FilterRec[Filter Recommendation]
    
    CheckTone -->|Pass| AddDisclaimer[Add Disclaimer]
    CheckTone -->|Fail| RewriteRec[Rewrite Recommendation]
    
    RewriteRec --> AddDisclaimer
    AddDisclaimer --> StoreRec[Store Recommendations]
    FilterRec --> StoreRec
    StoreRec --> End([Recommendations Ready])
```

## MCP Integration Architecture

```mermaid
graph LR
    subgraph "Development Environment"
        Dev[Developer]
        Cursor[Cursor IDE]
    end
    
    subgraph "MCP Servers"
        VueMCP[Vue MCP Server<br/>Frontend Assistance]
        NuxtUIMCP[Nuxt UI MCP Server<br/>Component Discovery]
        SupabaseMCP[Supabase MCP Server<br/>Backend Operations]
    end
    
    subgraph "SpendSense Project"
        Frontend[Nuxt 4 Frontend]
        Backend[Nuxt Server Routes]
        Database[(Supabase Database)]
    end
    
    Dev -->|Uses| Cursor
    Cursor -->|Connects to| VueMCP
    Cursor -->|Connects to| NuxtUIMCP
    Cursor -->|Connects to| SupabaseMCP
    
    VueMCP -.->|Assists with| Frontend
    NuxtUIMCP -.->|Discovers components for| Frontend
    SupabaseMCP -.->|Manages| Database
    SupabaseMCP -.->|Deploys to| Backend
    
    style VueMCP fill:#e3f2fd
    style NuxtUIMCP fill:#e3f2fd
    style SupabaseMCP fill:#e3f2fd
    style Frontend fill:#c8e6c9
    style Backend fill:#fff9c4
    style Database fill:#ffccbc
```

