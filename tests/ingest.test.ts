import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { UserWithData } from '../utils/generateData'

describe('Data Ingestion', () => {
  it('should validate user data structure', () => {
    // Load generated data
    const dataPath = join(process.cwd(), 'public', 'synthetic-data.json')
    const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as UserWithData[]
    
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    
    // Validate first user structure
    const user = data[0]
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('fake_name')
    expect(user).toHaveProperty('demographics')
    expect(user).toHaveProperty('accounts')
    expect(user).toHaveProperty('transactions')
    expect(user).toHaveProperty('liabilities')
    
    // Validate demographics
    expect(user.demographics).toHaveProperty('age')
    expect(user.demographics).toHaveProperty('gender')
    expect(user.demographics).toHaveProperty('annual_income')
    
    // Validate accounts have account_id
    if (user.accounts.length > 0) {
      expect(user.accounts[0]).toHaveProperty('account_id')
    }
    
    // Validate transactions have account_id
    if (user.transactions.length > 0) {
      expect(user.transactions[0]).toHaveProperty('account_id')
    }
  })
  
  it('should have transactions mapped to accounts', () => {
    const dataPath = join(process.cwd(), 'public', 'synthetic-data.json')
    const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as UserWithData[]
    
    const user = data[0]
    if (user.accounts.length > 0 && user.transactions.length > 0) {
      const accountIds = new Set(user.accounts.map(acc => acc.account_id))
      const transactionAccountIds = new Set(user.transactions.map(txn => txn.account_id))
      
      // At least some transactions should reference valid accounts
      const hasValidReferences = Array.from(transactionAccountIds).some(id => accountIds.has(id))
      expect(hasValidReferences).toBe(true)
    }
  })
})

