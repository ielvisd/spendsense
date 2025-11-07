import { describe, it, expect } from 'vitest'
import { assignPersona } from '../utils/personaAssignment'
import type { Signal, Account, Liability, Transaction } from '../utils/types'

describe('Persona Assignment Logic', () => {
  describe('Persona 1: High Utilization', () => {
    it('should assign high_utilization when utilization >= 50%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        balances: { current: 5000, limit: 10000 }
      }]
      
      const result = assignPersona([], accounts, [], [])
      
      expect(result.type).toBe('high_utilization')
      expect(result.rationale).toContain('High credit utilization detected')
    })
    
    it('should assign high_utilization when credit interest signal exists', () => {
      const signals: Signal[] = [{
        signal_type: 'credit_interest',
        signal_data: { interest_rate: 18.5 }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('high_utilization')
      expect(result.rationale).toContain('Paying interest on credit balance')
    })
    
    it('should assign high_utilization when overdue signal exists', () => {
      const signals: Signal[] = [{
        signal_type: 'credit_overdue',
        signal_data: { overdue: true }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('high_utilization')
      expect(result.rationale).toContain('Account is overdue')
    })
    
    it('should assign high_utilization when liability is overdue', () => {
      const liabilities: Liability[] = [{
        type: 'credit',
        overdue: true
      }]
      
      const result = assignPersona([], [], liabilities, [])
      
      expect(result.type).toBe('high_utilization')
    })
    
    it('should assign high_utilization when liability has min_payment flag', () => {
      const liabilities: Liability[] = [{
        type: 'credit',
        min_payment: true
      }]
      
      const result = assignPersona([], [], liabilities, [])
      
      expect(result.type).toBe('high_utilization')
    })
    
    it('should use utilization from high_utilization signal if account data missing', () => {
      const signals: Signal[] = [{
        signal_type: 'credit_high_utilization',
        signal_data: { utilization_percentage: 75 }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('high_utilization')
      expect(result.rationale).toContain('75.0%')
    })
  })
  
  describe('Persona 2: Variable Income Budgeter', () => {
    it('should assign variable_income_budgeter when income is variable and cash buffer < 1 month', () => {
      const signals: Signal[] = [
        {
          signal_type: 'income',
          signal_data: {
            is_variable: true,
            variability_percentage: 35.5
          }
        },
        {
          signal_type: 'savings',
          signal_data: {
            emergency_coverage_months: 0.5
          }
        }
      ]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('variable_income_budgeter')
      expect(result.rationale).toContain('Variable income detected')
      expect(result.rationale).toContain('low cash buffer')
    })
    
    it('should NOT assign variable_income_budgeter if cash buffer >= 1 month', () => {
      const signals: Signal[] = [
        {
          signal_type: 'income',
          signal_data: {
            is_variable: true,
            variability_percentage: 35.5
          }
        },
        {
          signal_type: 'savings',
          signal_data: {
            emergency_coverage_months: 2.0
          }
        }
      ]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).not.toBe('variable_income_budgeter')
    })
    
    it('should NOT assign variable_income_budgeter if income is not variable', () => {
      const signals: Signal[] = [
        {
          signal_type: 'income',
          signal_data: {
            is_variable: false,
            variability_percentage: 5.0
          }
        },
        {
          signal_type: 'savings',
          signal_data: {
            emergency_coverage_months: 0.5
          }
        }
      ]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).not.toBe('variable_income_budgeter')
    })
  })
  
  describe('Persona 3: Subscription-Heavy', () => {
    it('should assign subscription_heavy when >= 3 subscriptions and monthly spend > $50', () => {
      const signals: Signal[] = [{
        signal_type: 'subscriptions',
        signal_data: {
          count: 5,
          total_monthly_spend: 75.50,
          percentage_of_total: 8.0
        }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('subscription_heavy')
      expect(result.rationale).toContain('5 recurring subscriptions')
      expect(result.rationale).toContain('$75.50')
    })
    
    it('should assign subscription_heavy when >= 3 subscriptions and percentage >= 10%', () => {
      const signals: Signal[] = [{
        signal_type: 'subscriptions',
        signal_data: {
          count: 4,
          total_monthly_spend: 45.00,
          percentage_of_total: 12.5
        }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('subscription_heavy')
    })
    
    it('should NOT assign subscription_heavy when count < 3', () => {
      const signals: Signal[] = [{
        signal_type: 'subscriptions',
        signal_data: {
          count: 2,
          total_monthly_spend: 100.00,
          percentage_of_total: 15.0
        }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).not.toBe('subscription_heavy')
    })
  })
  
  describe('Persona 4: Savings Builder', () => {
    it('should assign savings_builder when positive growth and all util < 30%', () => {
      const signals: Signal[] = [{
        signal_type: 'savings',
        signal_data: {
          growth_rate: 'positive',
          emergency_coverage_months: 3.5
        }
      }]
      
      const accounts: Account[] = [{
        type: 'credit',
        balances: { current: 2000, limit: 10000 } // 20% utilization
      }]
      
      const result = assignPersona(signals, accounts, [], [])
      
      expect(result.type).toBe('savings_builder')
      expect(result.rationale).toContain('Positive savings growth')
    })
    
    it('should NOT assign savings_builder when utilization >= 30%', () => {
      const signals: Signal[] = [{
        signal_type: 'savings',
        signal_data: {
          growth_rate: 'positive',
          emergency_coverage_months: 3.5
        }
      }]
      
      const accounts: Account[] = [{
        type: 'credit',
        balances: { current: 3500, limit: 10000 } // 35% utilization
      }]
      
      const result = assignPersona(signals, accounts, [], [])
      
      // Should not be savings_builder because utilization is >= 30%
      // Will default to savings_builder if no other conditions match, but that's acceptable
      // The key is that the savings_builder condition (util < 30%) should not be met
      // Since default is savings_builder, we check that the rationale doesn't mention the specific condition
      if (result.type === 'savings_builder') {
        // If it's default, that's okay - the condition wasn't met
        expect(result.rationale).toContain('Default persona assigned')
      } else {
        expect(result.type).not.toBe('savings_builder')
      }
    })
    
    it('should NOT assign savings_builder when growth is negative', () => {
      const signals: Signal[] = [{
        signal_type: 'savings',
        signal_data: {
          growth_rate: 'negative',
          emergency_coverage_months: 3.5
        }
      }]
      
      const result = assignPersona(signals, [], [], [])
      
      // Should not be savings_builder because growth is negative
      // Will default to savings_builder if no other conditions match
      // The key is that the savings_builder condition (positive growth) should not be met
      if (result.type === 'savings_builder') {
        // If it's default, that's okay - the condition wasn't met
        expect(result.rationale).toContain('Default persona assigned')
      } else {
        expect(result.type).not.toBe('savings_builder')
      }
    })
  })
  
  describe('Persona 5: Impulse Spender', () => {
    it('should assign impulse_spender when >= 20% small transactions and >= 15% of income', () => {
      const transactions: Transaction[] = []
      
      // Create 30 transactions: 10 small (<$20) = 33.3% of transactions
      // Need impulse spend >= 15% of income: 15% of $3000 = $450
      // So need at least $450 in small transactions: $450 / 10 = $45 per transaction
      // But wait, small transactions are <$20, so let's use more transactions
      // Let's do 20 small transactions out of 30 = 66.7%
      // And make them total >= $450: 20 * $20 = $400, need more
      // Actually, let's use 25 small transactions: 25/30 = 83.3%
      // 25 * $18 = $450, which is exactly 15% of $3000
      for (let i = 0; i < 25; i++) {
        transactions.push({
          amount: -18.00, // Small transaction, totals $450
          merchant_name: 'Coffee Shop',
          date: new Date().toISOString()
        })
      }
      for (let i = 0; i < 5; i++) {
        transactions.push({
          amount: -100.00,
          merchant_name: 'Grocery Store',
          date: new Date().toISOString()
        })
      }
      
      const signals: Signal[] = [{
        signal_type: 'income',
        signal_data: {
          average_amount: 3000
        }
      }]
      
      const result = assignPersona(signals, [], [], transactions)
      
      expect(result.type).toBe('impulse_spender')
      expect(result.rationale).toContain('impulse purchases')
    })
    
    it('should NOT assign impulse_spender when small transaction percentage < 20%', () => {
      const transactions: Transaction[] = []
      
      // Create 30 transactions: 5 small (<$20) and 25 large (16.7% small)
      for (let i = 0; i < 5; i++) {
        transactions.push({
          amount: -15.00,
          merchant_name: 'Coffee Shop',
          date: new Date().toISOString()
        })
      }
      for (let i = 0; i < 25; i++) {
        transactions.push({
          amount: -100.00,
          merchant_name: 'Grocery Store',
          date: new Date().toISOString()
        })
      }
      
      const signals: Signal[] = [{
        signal_type: 'income',
        signal_data: {
          average_amount: 3000
        }
      }]
      
      const result = assignPersona(signals, [], [], transactions)
      
      expect(result.type).not.toBe('impulse_spender')
    })
    
    it('should NOT assign impulse_spender when impulse spend < 15% of income', () => {
      const transactions: Transaction[] = []
      
      // Create transactions with small amount but low total
      for (let i = 0; i < 20; i++) {
        transactions.push({
          amount: -5.00, // Small transactions but low total
          merchant_name: 'Coffee Shop',
          date: new Date().toISOString()
        })
      }
      
      const signals: Signal[] = [{
        signal_type: 'income',
        signal_data: {
          average_amount: 5000 // High income makes percentage low
        }
      }]
      
      const result = assignPersona(signals, [], [], transactions)
      
      expect(result.type).not.toBe('impulse_spender')
    })
  })
  
  describe('Priority Rules', () => {
    it('should prioritize High Utilization over Variable Income', () => {
      const signals: Signal[] = [
        {
          signal_type: 'credit_high_utilization',
          signal_data: { utilization_percentage: 60 }
        },
        {
          signal_type: 'income',
          signal_data: {
            is_variable: true,
            variability_percentage: 40
          }
        },
        {
          signal_type: 'savings',
          signal_data: { emergency_coverage_months: 0.5 }
        }
      ]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('high_utilization')
    })
    
    it('should prioritize Variable Income over Subscriptions', () => {
      const signals: Signal[] = [
        {
          signal_type: 'income',
          signal_data: {
            is_variable: true,
            variability_percentage: 35
          }
        },
        {
          signal_type: 'savings',
          signal_data: { emergency_coverage_months: 0.5 }
        },
        {
          signal_type: 'subscriptions',
          signal_data: {
            count: 5,
            total_monthly_spend: 100,
            percentage_of_total: 15
          }
        }
      ]
      
      const result = assignPersona(signals, [], [], [])
      
      expect(result.type).toBe('variable_income_budgeter')
    })
  })
  
  describe('Default Persona', () => {
    it('should assign savings_builder as default when no conditions match', () => {
      const result = assignPersona([], [], [], [])
      
      expect(result.type).toBe('savings_builder')
      expect(result.rationale).toContain('Default persona assigned')
    })
    
    it('should ensure 100% coverage (always returns a persona)', () => {
      const testCases = [
        { signals: [], accounts: [], liabilities: [], transactions: [] },
        { signals: [{ signal_type: 'unknown', signal_data: {} }], accounts: [], liabilities: [], transactions: [] },
        { signals: [], accounts: [{ type: 'checking' }], liabilities: [], transactions: [] }
      ]
      
      testCases.forEach(testCase => {
        const result = assignPersona(
          testCase.signals,
          testCase.accounts,
          testCase.liabilities,
          testCase.transactions
        )
        expect(result.type).toBeDefined()
        expect(result.rationale).toBeDefined()
      })
    })
  })
})

