# SpendSense Evaluation Report

Generated: 2025-11-08T04:19:09.783Z

## Coverage Metrics

- Users with persona: 48 / 76 (63.2%)
- Users with 3+ behaviors: 24 / 76
- **Target: 100%** - ❌ FAIL

## Explainability Metrics

- Recommendations with rationales: 146 / 146 (100.0%)
- **Target: 100%** - ✅ PASS

## Auditability Metrics

- Recommendations with decision traces: 146 / 146 (100.0%)
- **Target: 100%** - ✅ PASS

## Latency Metrics

- Average: 809.3ms
- Min: 630ms
- Max: 1324ms
- P95: 993ms
- Total requests: 274

## Relevance Metrics

- Score: 85/100
- Note: Manual review recommended for production. Score based on persona-content alignment.

## Fairness Analysis

### Fairness Score: 83.3/100

### Persona Distribution

- high_utilization: 34 users
- savings_builder: 11 users
- variable_income_budgeter: 3 users

### Demographic Breakdown

#### By Age

**55+:**
- high_utilization: 13 (81.3%)
- savings_builder: 2 (12.5%)
- variable_income_budgeter: 1 (6.3%)

**18-34:**
- variable_income_budgeter: 1 (5.3%)
- high_utilization: 14 (73.7%)
- savings_builder: 4 (21.1%)

**35-54:**
- high_utilization: 7 (53.8%)
- savings_builder: 5 (38.5%)
- variable_income_budgeter: 1 (7.7%)

#### By Gender

**M:**
- high_utilization: 14 (66.7%)
- variable_income_budgeter: 3 (14.3%)
- savings_builder: 4 (19.0%)

**F:**
- savings_builder: 7 (28.0%)
- high_utilization: 18 (72.0%)

**Non-binary:**
- high_utilization: 2 (100.0%)

#### By Income

**high:**
- high_utilization: 16 (69.6%)
- savings_builder: 5 (21.7%)
- variable_income_budgeter: 2 (8.7%)

**middle:**
- variable_income_budgeter: 1 (5.3%)
- high_utilization: 14 (73.7%)
- savings_builder: 4 (21.1%)

**low:**
- savings_builder: 2 (33.3%)
- high_utilization: 4 (66.7%)

#### By Ethnicity

**Asian:**
- high_utilization: 4 (57.1%)
- variable_income_budgeter: 1 (14.3%)
- savings_builder: 2 (28.6%)

**White:**
- high_utilization: 18 (75.0%)
- savings_builder: 5 (20.8%)
- variable_income_budgeter: 1 (4.2%)

**Black:**
- high_utilization: 3 (60.0%)
- savings_builder: 2 (40.0%)

**Other:**
- high_utilization: 2 (66.7%)
- variable_income_budgeter: 1 (33.3%)

**Hispanic:**
- high_utilization: 7 (77.8%)
- savings_builder: 2 (22.2%)

### Potential Bias Flags

The following persona-demographic combinations show >20% difference from expected distribution:

- **high_utilization** in **gender** (Non-binary): 100.0% (expected 70.8%, difference: 29.2%)
- **variable_income_budgeter** in **ethnicity** (Other): 33.3% (expected 6.3%, difference: 27.1%)
