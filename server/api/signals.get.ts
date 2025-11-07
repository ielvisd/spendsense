import { createClient } from '@supabase/supabase-js'
import { subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'user_id is required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const signals: any[] = []
    
    // Get user accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
    
    if (accountsError) throw accountsError
    if (!accounts || accounts.length === 0) {
      return { signals: [] }
    }
    
    // Get account IDs for this user
    const accountIds = accounts.map(acc => acc.id)
    
    // Get user transactions (last 6 months)
    const sixMonthsAgo = subMonths(new Date(), 6)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    if (transactionsError) throw transactionsError
    
    // Get user liabilities
    const { data: liabilities, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', userId)
    
    if (liabilitiesError) throw liabilitiesError
    
    // 1. Subscription Signal Detection
    const subscriptionSignal = detectSubscriptions(transactions || [])
    if (subscriptionSignal) {
      signals.push(subscriptionSignal)
    }
    
    // 2. Savings Signal Detection
    const savingsSignal = detectSavings(accounts, transactions || [])
    if (savingsSignal) {
      signals.push(savingsSignal)
    }
    
    // 3. Credit Signal Detection
    const creditSignals = detectCredit(accounts, liabilities || [])
    signals.push(...creditSignals)
    
    // 4. Income Signal Detection
    const incomeSignal = detectIncome(transactions || [])
    if (incomeSignal) {
      signals.push(incomeSignal)
    }
    
    // Store signals in database (upsert)
    for (const signal of signals) {
      await supabase
        .from('signals')
        .upsert({
          user_id: userId,
          signal_type: signal.signal_type,
          signal_data: signal.signal_data
        }, {
          onConflict: 'user_id,signal_type'
        })
    }
    
    return { signals }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Signal detection failed: ${error.message}`
    })
  }
})

// Subscription Detection: ≥3 recurring merchants, monthly spend, % of total
function detectSubscriptions(transactions: any[]): any | null {
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

// Savings Detection: net inflow, growth rate, emergency coverage
function detectSavings(accounts: any[], transactions: any[]): any | null {
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

// Credit Detection: utilization tiers, min-payment flag, interest >0, overdue
function detectCredit(accounts: any[], liabilities: any[]): any[] {
  const signals: any[] = []
  
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

// Income Detection: payroll detection, frequency variability, cash-flow buffer
function detectIncome(transactions: any[]): any | null {
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

