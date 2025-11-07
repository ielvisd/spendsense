import { describe, it, expect } from 'vitest'
import { detectSubscriptions, detectSavings, detectCredit, detectIncome } from '../utils/signalDetection'
import type { Transaction, Account, Liability } from '../utils/signalDetection'
import { subMonths } from 'date-fns'

describe('Signal Detection Logic', () => {
  describe('Subscription Detection', () => {
    it('should detect subscriptions when >= 3 recurring merchants', () => {
      const transactions: Transaction[] = []
      
      // Create 3+ recurring merchants with 3+ occurrences each
      const merchants = ['Netflix', 'Spotify', 'Amazon Prime']
      merchants.forEach(merchant => {
        for (let i = 0; i < 4; i++) {
          transactions.push({
            amount: -15.99,
            merchant_name: merchant,
            date: new Date().toISOString()
          })
        }
      })
      
      const result = detectSubscriptions(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_type).toBe('subscriptions')
      expect(result?.signal_data.count).toBeGreaterThanOrEqual(3)
      expect(result?.signal_data.total_monthly_spend).toBeGreaterThan(0)
    })
    
    it('should NOT detect subscriptions when < 3 recurring merchants', () => {
      const transactions: Transaction[] = []
      
      // Only 2 recurring merchants
      const merchants = ['Netflix', 'Spotify']
      merchants.forEach(merchant => {
        for (let i = 0; i < 4; i++) {
          transactions.push({
            amount: -15.99,
            merchant_name: merchant,
            date: new Date().toISOString()
          })
        }
      })
      
      const result = detectSubscriptions(transactions)
      
      expect(result).toBeNull()
    })
    
    it('should calculate percentage_of_total correctly', () => {
      const transactions: Transaction[] = []
      
      // 3 subscriptions totaling $50/month
      const merchants = ['Netflix', 'Spotify', 'Amazon']
      merchants.forEach(merchant => {
        for (let i = 0; i < 6; i++) {
          transactions.push({
            amount: -16.67, // ~$100 over 6 months per merchant
            merchant_name: merchant,
            date: new Date().toISOString()
          })
        }
      })
      
      // Add other expenses totaling $500
      for (let i = 0; i < 10; i++) {
        transactions.push({
          amount: -50.00,
          merchant_name: 'Grocery Store',
          date: new Date().toISOString()
        })
      }
      
      const result = detectSubscriptions(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.percentage_of_total).toBeGreaterThan(0)
    })
  })
  
  describe('Savings Detection', () => {
    it('should detect savings when savings accounts exist', () => {
      const accounts: Account[] = [{
        type: 'depository',
        subtype: 'savings',
        balances: { current: 5000 }
      }]
      
      const transactions: Transaction[] = [
        { amount: 1000, merchant_name: 'DEPOSIT', date: new Date().toISOString() },
        { amount: -500, merchant_name: 'Expense', date: new Date().toISOString() }
      ]
      
      const result = detectSavings(accounts, transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_type).toBe('savings')
      expect(result?.signal_data.total_savings).toBe(5000)
      expect(result?.signal_data.emergency_coverage_months).toBeGreaterThan(0)
    })
    
    it('should return null when no savings accounts exist', () => {
      const accounts: Account[] = [{
        type: 'depository',
        subtype: 'checking',
        balances: { current: 1000 }
      }]
      
      const result = detectSavings(accounts, [])
      
      expect(result).toBeNull()
    })
    
    it('should calculate emergency coverage months correctly', () => {
      const accounts: Account[] = [{
        type: 'depository',
        subtype: 'savings',
        balances: { current: 6000 }
      }]
      
      // Average monthly expenses of $2000
      const transactions: Transaction[] = []
      for (let i = 0; i < 6; i++) {
        transactions.push({
          amount: -2000,
          merchant_name: 'Expense',
          date: new Date().toISOString()
        })
      }
      
      const result = detectSavings(accounts, transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.emergency_coverage_months).toBe(3.0) // 6000 / 2000
    })
    
    it('should detect positive growth rate when net inflow > 0', () => {
      const accounts: Account[] = [{
        type: 'depository',
        subtype: 'savings',
        balances: { current: 5000 }
      }]
      
      const threeMonthsAgo = subMonths(new Date(), 2)
      const transactions: Transaction[] = [
        {
          amount: 1000,
          merchant_name: 'DEPOSIT',
          date: threeMonthsAgo.toISOString()
        }
      ]
      
      const result = detectSavings(accounts, transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.growth_rate).toBe('positive')
    })
  })
  
  describe('Credit Detection', () => {
    it('should detect high utilization when >= 50%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        account_id: 'cc-123',
        balances: { current: 5000, limit: 10000 }
      }]
      
      const result = detectCredit(accounts, [])
      
      expect(result.length).toBeGreaterThan(0)
      const highUtilSignal = result.find(s => s.signal_type === 'credit_high_utilization')
      expect(highUtilSignal).toBeDefined()
      expect(highUtilSignal?.signal_data.utilization_percentage).toBe(50)
    })
    
    it('should detect moderate utilization when >= 30% and < 50%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        account_id: 'cc-123',
        balances: { current: 3500, limit: 10000 }
      }]
      
      const result = detectCredit(accounts, [])
      
      const moderateUtilSignal = result.find(s => s.signal_type === 'credit_moderate_utilization')
      expect(moderateUtilSignal).toBeDefined()
      expect(moderateUtilSignal?.signal_data.utilization_percentage).toBe(35)
    })
    
    it('should NOT detect utilization when < 30%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        account_id: 'cc-123',
        balances: { current: 2000, limit: 10000 }
      }]
      
      const result = detectCredit(accounts, [])
      
      const utilSignals = result.filter(s => 
        s.signal_type === 'credit_high_utilization' || 
        s.signal_type === 'credit_moderate_utilization'
      )
      expect(utilSignals.length).toBe(0)
    })
    
    it('should detect credit overdue from liabilities', () => {
      const liabilities: Liability[] = [{
        type: 'credit',
        overdue: true,
        last_balance: 5000
      }]
      
      const result = detectCredit([], liabilities)
      
      const overdueSignal = result.find(s => s.signal_type === 'credit_overdue')
      expect(overdueSignal).toBeDefined()
      expect(overdueSignal?.signal_data.overdue).toBe(true)
    })
    
    it('should detect credit interest when interest_rate > 0', () => {
      const liabilities: Liability[] = [{
        type: 'credit',
        interest_rate: 18.5,
        apr: 18.5,
        min_payment: 50
      }]
      
      const result = detectCredit([], liabilities)
      
      const interestSignal = result.find(s => s.signal_type === 'credit_interest')
      expect(interestSignal).toBeDefined()
      expect(interestSignal?.signal_data.interest_rate).toBe(18.5)
    })
    
    it('should assign critical tier when utilization >= 80%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        account_id: 'cc-123',
        balances: { current: 8500, limit: 10000 }
      }]
      
      const result = detectCredit(accounts, [])
      
      const highUtilSignal = result.find(s => s.signal_type === 'credit_high_utilization')
      expect(highUtilSignal?.signal_data.tier).toBe('critical')
    })
    
    it('should assign high tier when utilization >= 50% and < 80%', () => {
      const accounts: Account[] = [{
        type: 'credit',
        account_id: 'cc-123',
        balances: { current: 6000, limit: 10000 }
      }]
      
      const result = detectCredit(accounts, [])
      
      const highUtilSignal = result.find(s => s.signal_type === 'credit_high_utilization')
      expect(highUtilSignal?.signal_data.tier).toBe('high')
    })
  })
  
  describe('Income Detection', () => {
    it('should detect income from payroll keywords', () => {
      const transactions: Transaction[] = [
        {
          amount: 3000,
          merchant_name: 'PAYROLL DEPOSIT',
          date: new Date().toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'EMPLOYER SALARY',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_type).toBe('income')
      expect(result?.signal_data.payroll_count).toBe(2)
    })
    
    it('should return null when no payroll transactions found', () => {
      const transactions: Transaction[] = [
        {
          amount: 100,
          merchant_name: 'Gift',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).toBeNull()
    })
    
    it('should calculate variability percentage correctly', () => {
      const transactions: Transaction[] = [
        {
          amount: 2000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: 4000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.variability_percentage).toBeGreaterThan(0)
      // Variability = (4000 - 2000) / 3000 * 100 = 66.67%
      expect(result?.signal_data.variability_percentage).toBeCloseTo(66.67, 1)
    })
    
    it('should mark as variable when variability > 20%', () => {
      const transactions: Transaction[] = [
        {
          amount: 2000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      // Variability = (3000 - 2000) / 2500 * 100 = 40%
      expect(result?.signal_data.is_variable).toBe(true)
    })
    
    it('should mark as NOT variable when variability <= 20%', () => {
      const transactions: Transaction[] = [
        {
          amount: 2900,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: 3100,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      // Variability = (3100 - 2900) / 3000 * 100 = 6.67%
      expect(result?.signal_data.is_variable).toBe(false)
    })
    
    it('should calculate average days between payrolls', () => {
      const baseDate = new Date('2024-01-01')
      const transactions: Transaction[] = [
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: baseDate.toISOString()
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days later
        },
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date(baseDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString() // 28 days later
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.average_days_between).toBe(14)
      expect(result?.signal_data.estimated_frequency).toBe('bi-weekly')
    })
    
    it('should calculate cash flow buffer', () => {
      const transactions: Transaction[] = [
        {
          amount: 3000,
          merchant_name: 'PAYROLL',
          date: new Date().toISOString()
        },
        {
          amount: -2000,
          merchant_name: 'Expense',
          date: new Date().toISOString()
        }
      ]
      
      const result = detectIncome(transactions)
      
      expect(result).not.toBeNull()
      expect(result?.signal_data.cash_flow_buffer).toBe(1000) // 3000 - 2000
    })
  })
})

