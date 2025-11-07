# SpendSense Demo Video Script

## Overview
This script outlines the key flows to demonstrate in a demo video showcasing SpendSense's core features.

**Duration:** 5-7 minutes  
**Target Audience:** Technical evaluators, product stakeholders

---

## Scene 1: Onboarding & Data Upload (1-2 min)

### Setup
- Open browser to `http://localhost:3000/onboarding`
- Show clean, accessible onboarding page

### Actions
1. **User Registration**
   - Enter email: `demo@spendsense.com`
   - Enter password: `demo123456`
   - Click "Create Account"
   - Show toast notification: "Account created!"

2. **Data Upload**
   - Click "Choose File" or drag-and-drop
   - Select `public/synthetic-data.json` (or CSV file)
   - Show upload progress bar
   - Show success toast: "Successfully uploaded data for X users. File stored: [filename]"

3. **Consent Grant**
   - Check consent checkbox
   - Read consent text aloud: "I consent to SpendSense analyzing my financial data..."
   - Click "Complete Onboarding"
   - Show success message

### Key Points to Highlight
- ✅ Clean, accessible UI with ARIA labels
- ✅ File storage confirmation (Supabase Storage)
- ✅ Explicit consent flow (GDPR-compliant)

---

## Scene 2: Dashboard & Recommendations (2-3 min)

### Setup
- Automatically redirected to `/` (dashboard)
- Show loading state briefly

### Actions
1. **Persona Display**
   - Point out persona card: "Your Financial Persona"
   - Read persona type (e.g., "High Utilization")
   - Read rationale: "We detected credit utilization above 50%..."
   - Explain: "This is based on actual transaction analysis"

2. **Educational Resources**
   - Scroll to "Educational Resources" section
   - Show 3-5 education cards
   - Click on one card to show full content
   - Point out disclaimer: "This is educational content, not financial advice..."
   - Explain: "Each recommendation includes a rationale explaining why it was shown"

3. **Personalized Offers**
   - Scroll to "Personalized Offers" section
   - Show 1-3 offer cards
   - Read rationale: "Because you have high credit utilization, a balance transfer card could help..."
   - Explain: "Offers are filtered by eligibility - we won't show HYSA if user already has savings"

4. **Financial Calculators**
   - Scroll to "Financial Calculators"
   - Show Debt Payoff Calculator
   - Enter example: $5,000 balance, 18% APR, $200/month payment
   - Show calculated payoff time and total interest
   - Show Savings Goal Calculator
   - Enter example: $10,000 goal, $2,000 current, 12 months
   - Show monthly savings needed

### Key Points to Highlight
- ✅ Personalized recommendations with data-backed rationales
- ✅ 100% explainability (every recommendation has a rationale)
- ✅ Guardrails: disclaimers, eligibility checks, tone validation
- ✅ Interactive financial tools

---

## Scene 3: Operator Dashboard (2 min)

### Setup
- Navigate to `/operator`
- Show operator authentication check

### Actions
1. **User Overview**
   - Show table of all users
   - Point out columns: Name, Persona, Signals, Recommendations, Actions
   - Explain: "Operators can see all users for review and oversight"

2. **Filtering & Search**
   - Filter by persona: Select "High Utilization"
   - Show filtered results
   - Search by name: Type "John"
   - Show search results
   - Reset filters

3. **Expand User Details**
   - Click "Expand" on a user row
   - Show signals: subscriptions, savings, credit, income
   - Show persona rationale
   - Show recommendations with approve/flag buttons

4. **Bulk Actions**
   - Select multiple recommendations (checkboxes)
   - Show bulk action bar appears
   - Click "Bulk Approve"
   - Show success toast
   - Explain: "Operators can approve or flag recommendations for quality control"

5. **Flag Queue**
   - Switch to "Flag Queue" tab
   - Show flagged recommendations
   - Explain: "Problematic recommendations are flagged for review"
   - Show real-time updates (if applicable)

### Key Points to Highlight
- ✅ Operator access control (role-based)
- ✅ Comprehensive user review interface
- ✅ Bulk operations for efficiency
- ✅ Flag queue for quality control
- ✅ Real-time updates via Supabase Realtime

---

## Scene 4: Settings & Consent Management (1 min)

### Setup
- Navigate to `/settings`
- Show settings page

### Actions
1. **Consent Status**
   - Show current consent status: "Granted"
   - Read consent information

2. **Consent Revocation**
   - Click "Revoke Consent"
   - Show confirmation modal
   - Explain: "Revoking consent will delete all financial data"
   - Click "Confirm"
   - Show success message
   - Explain: "User data is purged per GDPR requirements"

### Key Points to Highlight
- ✅ User control over data
- ✅ GDPR-compliant consent management
- ✅ Data deletion on revocation

---

## Scene 5: Evaluation Metrics (30 sec - optional)

### Setup
- Open terminal
- Show evaluation harness

### Actions
1. **Run Evaluation**
   - Run: `npm run eval`
   - Show metrics output:
     - Coverage: 100% (all users have personas)
     - Explainability: 100% (all recommendations have rationales)
     - Auditability: 100% (all decisions are logged)
   - Show generated files: `eval-metrics.json`, `eval-report.md`

### Key Points to Highlight
- ✅ Automated evaluation metrics
- ✅ 100% coverage, explainability, auditability targets met
- ✅ Fairness analysis included

---

## Closing Summary (30 sec)

### Key Features Demonstrated
1. **Consent-Driven**: Explicit opt-in, revocable consent
2. **Explainable**: Every recommendation includes rationale
3. **Auditable**: All decisions logged with traces
4. **Guarded**: Tone validation, eligibility checks, disclaimers
5. **Operator Oversight**: Review and approval workflow
6. **Accessible**: ARIA labels, screen reader support
7. **Responsive**: Works on mobile, tablet, desktop

### Technical Highlights
- Nuxt 4 + TypeScript
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- 84 passing tests
- 99%+ code coverage on core logic
- Database indexes and validation triggers

---

## Tips for Recording

1. **Browser Setup**
   - Use Chrome DevTools responsive mode
   - Show mobile view briefly (375px width)
   - Show tablet view (768px width)
   - Show desktop view (1920px width)

2. **Screen Recording**
   - Record at 1080p minimum
   - Use clear, readable fonts
   - Highlight cursor movements
   - Add text overlays for key points

3. **Narration**
   - Speak clearly and at moderate pace
   - Explain technical decisions briefly
   - Emphasize guardrails and ethics
   - Mention test coverage and quality metrics

4. **Editing**
   - Add chapter markers for each scene
   - Include text overlays for key metrics
   - Add transitions between scenes
   - Keep total duration under 7 minutes

---

## Alternative: Quick Demo (3 min)

If time is limited, focus on:
1. Onboarding + Data Upload (30 sec)
2. Dashboard Recommendations (1 min)
3. Operator Dashboard (1 min)
4. Settings/Consent (30 sec)

