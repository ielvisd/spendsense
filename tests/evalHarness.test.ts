import { describe, it, expect } from 'vitest'
import { generateReport } from '~/utils/evalHarness'

// Note: Testing runEvaluation requires actual Supabase connection
// These tests verify the report generation and metric calculations

describe('Evaluation Harness', () => {
  describe('generateReport', () => {
    it('should generate a markdown report with all metrics', async () => {
      const mockMetrics = {
        coverage: {
          total_users: 10,
          users_with_persona: 10,
          percentage: 100,
          users_with_3plus_behaviors: 10,
          behaviors_percentage: 100
        },
        explainability: {
          total_recommendations: 20,
          recommendations_with_rationales: 20,
          percentage: 100
        },
        auditability: {
          total_recommendations: 20,
          recommendations_with_traces: 20,
          percentage: 100
        },
        fairness: {
          persona_distribution: {
            high_utilization: 2,
            variable_income_budgeter: 2,
            subscription_heavy: 2,
            savings_builder: 2,
            impulse_spender: 2
          },
          demographic_breakdown: {
            by_age: {},
            by_gender: {},
            by_income: {},
            by_ethnicity: {}
          }
        }
      }

      const report = await generateReport(mockMetrics)

      expect(report).toContain('# SpendSense Evaluation Report')
      expect(report).toContain('Coverage Metrics')
      expect(report).toContain('Explainability Metrics')
      expect(report).toContain('Auditability Metrics')
      expect(report).toContain('100%')
      expect(report).toContain('✅ PASS')
    })

    it('should show FAIL status when metrics are below 100%', async () => {
      const mockMetrics = {
        coverage: {
          total_users: 10,
          users_with_persona: 5,
          percentage: 50,
          users_with_3plus_behaviors: 5,
          behaviors_percentage: 50
        },
        explainability: {
          total_recommendations: 10,
          recommendations_with_rationales: 5,
          percentage: 50
        },
        auditability: {
          total_recommendations: 10,
          recommendations_with_traces: 5,
          percentage: 50
        },
        fairness: {
          persona_distribution: {},
          demographic_breakdown: {
            by_age: {},
            by_gender: {},
            by_income: {},
            by_ethnicity: {}
          }
        }
      }

      const report = await generateReport(mockMetrics)

      expect(report).toContain('❌ FAIL')
      expect(report).toContain('50.0%')
    })

    it('should include persona distribution in report', async () => {
      const mockMetrics = {
        coverage: {
          total_users: 5,
          users_with_persona: 5,
          percentage: 100,
          users_with_3plus_behaviors: 5,
          behaviors_percentage: 100
        },
        explainability: {
          total_recommendations: 5,
          recommendations_with_rationales: 5,
          percentage: 100
        },
        auditability: {
          total_recommendations: 5,
          recommendations_with_traces: 5,
          percentage: 100
        },
        fairness: {
          persona_distribution: {
            savings_builder: 2,
            high_utilization: 1,
            impulse_spender: 2
          },
          demographic_breakdown: {
            by_age: {},
            by_gender: {},
            by_income: {},
            by_ethnicity: {}
          }
        }
      }

      const report = await generateReport(mockMetrics)

      expect(report).toContain('savings_builder: 2')
      expect(report).toContain('high_utilization: 1')
      expect(report).toContain('impulse_spender: 2')
    })
  })
})
