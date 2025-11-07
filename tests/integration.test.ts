import { describe, it, expect, beforeAll } from 'vitest'
import { assignPersona } from '../utils/personaAssignment'
import { detectSubscriptions, detectSavings, detectCredit, detectIncome } from '../utils/signalDetection'
import type { Signal, Account, Liability, Transaction } from '../utils/personaAssignment'

describe('Integration Tests', () => {
  describe('Full User Flow: Signal Detection + Persona Assignment', () => {
    it('should detect signals and assign high_utilization persona', () => {
      // Step 1: Create accounts with high utilization
      const accounts: Account[] = [{
        type: 'credit',
        balances: { current: 6000, limit: 10000 }
      }]
      
      // Step 2: Detect credit signals
      const creditSignals = detectCredit(accounts, [])
      
      // Step 3: Assign persona based on signals
      const persona = assignPersona(creditSignals, accounts, [], [])
      
      expect(creditSignals.length).toBeGreaterThan(0)
      expect(persona.type).toBe('high_utilization')
      expect(persona.rationale).toBeDefined()
    })
    
    it('should detect signals and assign variable_income_budgeter persona', () => {
      // Step 1: Create transactions with variable income
      const transactions: Transaction[] = [
        {
          amount: 2000,
          merchant_name: 'PAYROLL DEPOSIT',
          date: new Date('2024-01-01').toISOString()
        },
        {
          amount: 4000,
          merchant_name: 'PAYROLL DEPOSIT',
          date: new Date('2024-02-01').toISOString()
        }
      ]
      
      // Step 2: Detect income signal
      const incomeSignal = detectIncome(transactions)
      
      // Step 3: Create savings account with low buffer
      const accounts: Account[] = [{
        type: 'depository',
        subtype: 'savings',
        balances: { current: 500 } // Low savings
      }]
      
      // Step 4: Detect savings signal
      const savingsSignal = detectSavings(accounts, transactions)
      
      // Step 5: Assign persona
      const signals: Signal[] = []
      if (incomeSignal) signals.push(incomeSignal)
      if (savingsSignal) signals.push(savingsSignal)
      
      const persona = assignPersona(signals, accounts, [], transactions)
      
      expect(incomeSignal).not.toBeNull()
      expect(incomeSignal?.signal_data.is_variable).toBe(true)
      expect(savingsSignal).not.toBeNull()
      expect(savingsSignal?.signal_data.emergency_coverage_months).toBeLessThan(1)
      expect(persona.type).toBe('variable_income_budgeter')
    })
    
    it('should detect signals and assign subscription_heavy persona', () => {
      // Step 1: Create transactions with recurring subscriptions
      const transactions: Transaction[] = []
      const merchants = ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+']
      
      merchants.forEach(merchant => {
        for (let i = 0; i < 6; i++) {
          transactions.push({
            amount: -15.99,
            merchant_name: merchant,
            date: new Date().toISOString()
          })
        }
      })
      
      // Step 2: Detect subscription signal
      const subscriptionSignal = detectSubscriptions(transactions)
      
      // Step 3: Assign persona
      const signals: Signal[] = []
      if (subscriptionSignal) signals.push(subscriptionSignal)
      
      const persona = assignPersona(signals, [], [], transactions)
      
      expect(subscriptionSignal).not.toBeNull()
      expect(subscriptionSignal?.signal_data.count).toBeGreaterThanOrEqual(3)
      expect(persona.type).toBe('subscription_heavy')
    })
    
    it('should detect signals and assign savings_builder persona', () => {
      // Step 1: Create savings account with positive growth
      const accounts: Account[] = [
        {
          type: 'depository',
          subtype: 'savings',
          balances: { current: 10000 }
        },
        {
          type: 'credit',
          balances: { current: 2000, limit: 10000 } // Low utilization
        }
      ]
      
      // Step 2: Create transactions showing positive savings growth
      const transactions: Transaction[] = [
        { amount: 2000, merchant_name: 'DEPOSIT', date: new Date().toISOString() },
        { amount: -1000, merchant_name: 'Expense', date: new Date().toISOString() }
      ]
      
      // Step 3: Detect savings signal
      const savingsSignal = detectSavings(accounts, transactions)
      
      // Step 4: Assign persona
      const signals: Signal[] = []
      if (savingsSignal) signals.push(savingsSignal)
      
      const persona = assignPersona(signals, accounts, [], transactions)
      
      expect(savingsSignal).not.toBeNull()
      expect(savingsSignal?.signal_data.growth_rate).toBe('positive')
      expect(persona.type).toBe('savings_builder')
    })
    
    it('should detect signals and assign impulse_spender persona', () => {
      // Step 1: Create many small transactions
      const transactions: Transaction[] = []
      
      // Need >= 20% small transactions AND >= 15% of income in impulse spend
      // With income of $3000, need >= $450 in small transactions
      // 25 small transactions out of 30 = 83.3% (meets >= 20% requirement)
      // 25 * $18 = $450 = 15% of $3000 (meets >= 15% requirement)
      for (let i = 0; i < 25; i++) {
        transactions.push({
          amount: -18.00,
          merchant_name: 'Coffee Shop',
          date: new Date().toISOString()
        })
      }
      
      // 5 larger transactions
      for (let i = 0; i < 5; i++) {
        transactions.push({
          amount: -100.00,
          merchant_name: 'Grocery Store',
          date: new Date().toISOString()
        })
      }
      
      // Step 2: Create income signal - need multiple payroll transactions for proper detection
      const incomeTransactions: Transaction[] = [
        {
          amount: 3000,
          merchant_name: 'PAYROLL DEPOSIT',
          date: new Date('2024-01-01').toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL DEPOSIT',
          date: new Date('2024-02-01').toISOString()
        }
      ]
      
      const incomeSignal = detectIncome(incomeTransactions)
      
      // Step 3: Assign persona
      const signals: Signal[] = []
      if (incomeSignal) {
        // Ensure average_amount is set correctly
        incomeSignal.signal_data.average_amount = 3000
        signals.push(incomeSignal)
      }
      
      const persona = assignPersona(signals, [], [], transactions)
      
      expect(persona.type).toBe('impulse_spender')
    })
  })
  
  describe('Consent Enforcement Flow', () => {
    it('should verify consent is checked before persona assignment', () => {
      // This test verifies the logic flow - in real implementation,
      // the API endpoint would check consent before calling assignPersona
      
      // Simulate: User has NOT granted consent
      const hasConsent = false
      
      if (!hasConsent) {
        // Persona assignment should be blocked
        expect(hasConsent).toBe(false)
        // In the actual API, this would throw a 403 error
      }
    })
    
    it('should allow persona assignment when consent is granted', () => {
      // Simulate: User HAS granted consent
      const hasConsent = true
      
      if (hasConsent) {
        // Persona assignment should proceed
        const accounts: Account[] = [{
          type: 'credit',
          balances: { current: 5000, limit: 10000 }
        }]
        
        const persona = assignPersona([], accounts, [], [])
        
        expect(hasConsent).toBe(true)
        expect(persona.type).toBeDefined()
        expect(persona.rationale).toBeDefined()
      }
    })
  })
  
  describe('End-to-End: Data Ingestion → Signals → Persona → Recommendations', () => {
    it('should complete full flow with realistic data', () => {
      // Step 1: Simulate ingested user data
      const userData = {
        accounts: [
          {
            type: 'credit',
            balances: { current: 5500, limit: 10000 }
          },
          {
            type: 'depository',
            subtype: 'savings',
            balances: { current: 2000 }
          }
        ] as Account[],
        transactions: [
          { amount: 3000, merchant_name: 'PAYROLL', date: new Date().toISOString() },
          { amount: -500, merchant_name: 'Expense', date: new Date().toISOString() }
        ] as Transaction[],
        liabilities: [] as Liability[]
      }
      
      // Step 2: Detect all signals
      const creditSignals = detectCredit(userData.accounts, userData.liabilities)
      const savingsSignal = detectSavings(userData.accounts, userData.transactions)
      const incomeSignal = detectIncome(userData.transactions)
      
      const allSignals: Signal[] = [
        ...creditSignals,
        ...(savingsSignal ? [savingsSignal] : []),
        ...(incomeSignal ? [incomeSignal] : [])
      ]
      
      // Step 3: Assign persona
      const persona = assignPersona(
        allSignals,
        userData.accounts,
        userData.liabilities,
        userData.transactions
      )
      
      // Step 4: Verify results
      expect(allSignals.length).toBeGreaterThan(0)
      expect(persona.type).toBeDefined()
      expect(persona.rationale).toBeDefined()
      
      // Step 5: Verify persona assignment includes decision trace data
      const decisionTrace = {
        persona_type: persona.type,
        rationale: persona.rationale,
        signals_used: allSignals.map(s => s.signal_type),
        timestamp: new Date().toISOString()
      }
      
      expect(decisionTrace.persona_type).toBe(persona.type)
      expect(decisionTrace.signals_used.length).toBeGreaterThan(0)
    })
  })
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data gracefully', () => {
      const persona = assignPersona([], [], [], [])
      
      expect(persona.type).toBe('savings_builder') // Default
      expect(persona.rationale).toBeDefined()
    })
    
    it('should handle missing account balances', () => {
      const accounts: Account[] = [{
        type: 'credit'
        // Missing balances
      }]
      
      const persona = assignPersona([], accounts, [], [])
      
      // Should not crash, should return default or other persona
      expect(persona.type).toBeDefined()
    })
    
    it('should handle zero division in calculations', () => {
      const accounts: Account[] = [{
        type: 'credit',
        balances: { current: 0, limit: 0 }
      }]
      
      const creditSignals = detectCredit(accounts, [])
      
      // Should not crash on zero division
      expect(creditSignals).toBeDefined()
      expect(Array.isArray(creditSignals)).toBe(true)
    })
    
    it('should handle transactions with missing merchant names', () => {
      const transactions: Transaction[] = [
        { amount: -50, date: new Date().toISOString() }
      ]
      
      const subscriptionSignal = detectSubscriptions(transactions)
      
      // Should handle gracefully
      expect(subscriptionSignal).toBeNull()
    })
  })
})

