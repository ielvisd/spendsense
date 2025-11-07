/**
 * Signal Detection Logic
 * 
 * This module contains the core signal detection logic extracted from the API endpoint
 * for testability. It detects behavioral patterns in financial data.
 */

import { subMonths, differenceInDays } from 'date-fns'

export interface Transaction {
  amount: number
  merchant_name?: string
  date: string
}

export interface Account {
  id?: string
  account_id?: string
  type: string
  subtype?: string
  balances?: {
    current?: number
    limit?: number
  }
}

export interface Liability {
  type: string
  overdue?: boolean
  min_payment?: boolean
  interest_rate?: number
  apr?: number
}

export interface Signal {
  signal_type: string
  signal_data: any
}

/**
 * Subscription Detection: ≥3 recurring merchants, monthly spend, % of total
 */
export function detectSubscriptions(transactions: Transaction[]): Signal | null {
  const merchantCounts = new Map<string, number>()
  const merchantAmounts = new Map<string, number>()
  
  // Count occurrences and amounts per merchant
  transactions.forEach(txn => {
    if (txn.merchant_name && txn.amount < 0) {
      const merchant = txn.merchant_name
      merchantCounts.set(merchant, (merchantCounts.get(merchant) || 0) + 1)
      merchantAmounts.set(merchant, (merchantAmounts.get(merchant) || 0) + Math.abs(txn.amount))
    }
  })
  
  // Find recurring merchants (≥3 occurrences)
  const recurringMerchants: Array<{ merchant: string; count: number; monthlySpend: number }> = []
  const totalSpend = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  merchantCounts.forEach((count, merchant) => {
    if (count >= 3) {
      const monthlySpend = (merchantAmounts.get(merchant) || 0) / 6 // Average over 6 months
      recurringMerchants.push({ merchant, count, monthlySpend })
    }
  })
  
  if (recurringMerchants.length >= 3) {
    const totalMonthlySubscriptions = recurringMerchants.reduce((sum, m) => sum + m.monthlySpend, 0)
    const percentageOfTotal = totalSpend > 0 ? (totalMonthlySubscriptions / totalSpend) * 100 : 0
    
    return {
      signal_type: 'subscriptions',
      signal_data: {
        recurring_merchants: recurringMerchants,
        total_monthly_spend: totalMonthlySubscriptions,
        percentage_of_total: percentageOfTotal,
        count: recurringMerchants.length
      }
    }
  }
  
  return null
}

/**
 * Savings Detection: net inflow, growth rate, emergency coverage
 */
export function detectSavings(accounts: Account[], transactions: Transaction[]): Signal | null {
  const savingsAccounts = accounts.filter(acc => acc.subtype === 'savings')
  if (savingsAccounts.length === 0) return null
  
  const totalSavings = savingsAccounts.reduce((sum, acc) => {
    const current = acc.balances?.current || 0
    return sum + current
  }, 0)
  
  // Calculate average monthly expenses
  const expenses = transactions
    .filter(t => t.amount < 0)
    .map(t => Math.abs(t.amount))
  const avgMonthlyExpenses = expenses.length > 0
    ? expenses.reduce((sum, e) => sum + e, 0) / 6
    : 0
  
  const emergencyCoverage = avgMonthlyExpenses > 0 ? totalSavings / avgMonthlyExpenses : 0
  
  // Calculate growth rate (simplified - compare current vs 3 months ago)
  const threeMonthsAgo = subMonths(new Date(), 3)
  const recentTransactions = transactions.filter(t => 
    new Date(t.date) >= threeMonthsAgo && t.amount > 0
  )
  const netInflow = recentTransactions.reduce((sum, t) => sum + t.amount, 0)
  
  return {
    signal_type: 'savings',
    signal_data: {
      total_savings: totalSavings,
      net_inflow_3mo: netInflow,
      average_monthly_expenses: avgMonthlyExpenses,
      emergency_coverage_months: emergencyCoverage,
      growth_rate: netInflow > 0 ? 'positive' : 'negative'
    }
  }
}

/**
 * Credit Detection: utilization tiers, min-payment flag, interest >0, overdue
 */
export function detectCredit(accounts: Account[], liabilities: Liability[]): Signal[] {
  const signals: Signal[] = []
  
  // Check credit accounts
  const creditAccounts = accounts.filter(acc => acc.type === 'credit')
  
  for (const account of creditAccounts) {
    const limit = account.balances?.limit || 0
    const current = account.balances?.current || 0
    
    if (limit > 0) {
      const utilization = (current / limit) * 100
      
      if (utilization >= 50) {
        signals.push({
          signal_type: 'credit_high_utilization',
          signal_data: {
            account_id: account.account_id,
            utilization_percentage: utilization,
            current_balance: current,
            credit_limit: limit,
            tier: utilization >= 80 ? 'critical' : utilization >= 50 ? 'high' : 'moderate'
          }
        })
      } else if (utilization >= 30) {
        signals.push({
          signal_type: 'credit_moderate_utilization',
          signal_data: {
            account_id: account.account_id,
            utilization_percentage: utilization,
            current_balance: current,
            credit_limit: limit
          }
        })
      }
    }
  }
  
  // Check liabilities
  for (const liability of liabilities) {
    if (liability.type === 'credit') {
      if (liability.overdue) {
        signals.push({
          signal_type: 'credit_overdue',
          signal_data: {
            type: 'credit',
            overdue: true,
            last_balance: liability.last_balance
          }
        })
      }
      
      if (liability.interest_rate && liability.interest_rate > 0) {
        signals.push({
          signal_type: 'credit_interest',
          signal_data: {
            interest_rate: liability.interest_rate,
            apr: liability.apr,
            min_payment: liability.min_payment
          }
        })
      }
    }
  }
  
  return signals
}

/**
 * Income Detection: payroll detection, frequency variability, cash-flow buffer
 */
export function detectIncome(transactions: Transaction[]): Signal | null {
  const payrollKeywords = ['PAYROLL', 'DEPOSIT', 'EMPLOYER', 'SALARY', 'WAGE']
  const payrollTransactions = transactions.filter(txn =>
    txn.amount > 0 && payrollKeywords.some(keyword =>
      txn.merchant_name?.toUpperCase().includes(keyword)
    )
  )
  
  if (payrollTransactions.length === 0) return null
  
  // Calculate frequency and variability
  const amounts = payrollTransactions.map(t => t.amount).sort((a, b) => a - b)
  const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
  const minAmount = amounts[0]
  const maxAmount = amounts[amounts.length - 1]
  const variability = maxAmount - minAmount
  const variabilityPercentage = avgAmount > 0 ? (variability / avgAmount) * 100 : 0
  
  // Estimate frequency (days between payrolls)
  const dates = payrollTransactions
    .map(t => new Date(t.date))
    .sort((a, b) => a.getTime() - b.getTime())
  
  let avgDaysBetween = 0
  if (dates.length > 1) {
    const daysBetween: number[] = []
    for (let i = 1; i < dates.length; i++) {
      daysBetween.push(differenceInDays(dates[i], dates[i - 1]))
    }
    avgDaysBetween = daysBetween.reduce((sum, d) => sum + d, 0) / daysBetween.length
  }
  
  // Calculate cash flow buffer (simplified)
  const expenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const income = payrollTransactions.reduce((sum, t) => sum + t.amount, 0)
  const cashFlowBuffer = income - expenses
  
  return {
    signal_type: 'income',
    signal_data: {
      payroll_count: payrollTransactions.length,
      average_amount: avgAmount,
      min_amount: minAmount,
      max_amount: maxAmount,
      variability_percentage: variabilityPercentage,
      average_days_between: avgDaysBetween,
      estimated_frequency: avgDaysBetween < 20 ? 'bi-weekly' : avgDaysBetween < 35 ? 'monthly' : 'irregular',
      cash_flow_buffer: cashFlowBuffer,
      is_variable: variabilityPercentage > 20
    }
  }
}

