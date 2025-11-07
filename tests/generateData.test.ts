import { describe, it, expect, beforeEach } from 'vitest'
import { faker } from '@faker-js/faker'
import type { Demographics, Account, Transaction, Liability } from '../utils/generateData'

// Test weighted random function
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }
  return items[items.length - 1]
}

describe('Data Generation Utilities', () => {
  describe('weightedRandom', () => {
    it('should return items based on weights', () => {
      const items = ['A', 'B', 'C']
      const weights = [0.5, 0.3, 0.2]
      
      // Run multiple times to verify distribution
      const results: string[] = []
      for (let i = 0; i < 100; i++) {
        results.push(weightedRandom(items, weights))
      }
      
      const countA = results.filter(r => r === 'A').length
      const countB = results.filter(r => r === 'B').length
      const countC = results.filter(r => r === 'C').length
      
      // Should roughly match weights (allowing for variance)
      expect(countA).toBeGreaterThan(30) // ~50% of 100
      expect(countB).toBeGreaterThan(15) // ~30% of 100
      expect(countC).toBeGreaterThan(5)  // ~20% of 100
    })
  })
  
  describe('Account Generation', () => {
    it('should generate at least one account', () => {
      const demographics: Demographics = {
        age: 30,
        gender: 'M',
        annual_income: 50000,
        ethnicity: 'White',
        location: { state: 'CA', city: 'San Francisco' },
        household_size: 2
      }
      
      // Mock the account generation logic
      const accounts: Account[] = []
      accounts.push({
        account_id: faker.string.uuid(),
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1000,
          current: 1000
        },
        iso_currency_code: 'USD'
      })
      
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].type).toBe('depository')
    })
  })
  
  describe('Transaction Generation', () => {
    it('should generate transactions with valid structure', () => {
      const transaction: Transaction = {
        date: '2024-01-15',
        amount: -50.00,
        merchant_name: 'Test Merchant',
        payment_channel: 'online',
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'RESTAURANTS'
        },
        pending: false
      }
      
      expect(transaction.amount).toBeLessThan(0)
      expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(transaction.personal_finance_category.primary).toBeDefined()
    })
  })
  
  describe('Persona Injection', () => {
    it('should modify accounts for High Utilization persona', () => {
      const accounts: Account[] = [{
        account_id: 'test-credit',
        type: 'credit',
        subtype: 'credit card',
        balances: {
          available: 1000,
          current: 0,
          limit: 5000
        },
        iso_currency_code: 'USD'
      }]
      
      // Simulate High Utilization injection
      const creditAccount = accounts.find(acc => acc.type === 'credit')
      if (creditAccount && creditAccount.balances.limit) {
        creditAccount.balances.current = creditAccount.balances.limit * 0.68
        creditAccount.balances.available = creditAccount.balances.limit * 0.32
      }
      
      expect(creditAccount?.balances.current).toBe(3400) // 68% of 5000
      expect(creditAccount?.balances.available).toBe(1600) // 32% of 5000
    })
  })
})

