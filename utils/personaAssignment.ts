/**
 * Persona Assignment Logic
 * 
 * This module contains the core persona assignment logic extracted from the API endpoint
 * for testability. It implements the priority-based persona assignment rules.
 */

export interface PersonaResult {
  type: string
  rationale: string
}

export interface Signal {
  signal_type: string
  signal_data: any
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

export interface Transaction {
  amount: number
  merchant_name?: string
  date: string
}

/**
 * Assigns a persona to a user based on signals, accounts, liabilities, and transactions.
 * Uses priority rules: Utilization > Income > Subscriptions > Savings > Impulse > Default
 */
export function assignPersona(
  signals: Signal[],
  accounts: Account[],
  liabilities: Liability[],
  transactions: Transaction[]
): PersonaResult {
  // Priority 1: High Utilization
  const highUtilSignal = signals.find(s => s.signal_type === 'credit_high_utilization')
  const creditInterest = signals.find(s => s.signal_type === 'credit_interest')
  const overdue = signals.find(s => s.signal_type === 'credit_overdue')
  const creditAccount = accounts.find(acc => acc.type === 'credit')
  
  // Check utilization from account or signal
  let utilization = 0
  if (creditAccount && creditAccount.balances?.limit && creditAccount.balances?.current) {
    utilization = (creditAccount.balances.current / creditAccount.balances.limit) * 100
  } else if (highUtilSignal) {
    utilization = highUtilSignal.signal_data.utilization_percentage
  }
  
  if (utilization >= 50 || creditInterest || overdue || 
      (liabilities.length > 0 && liabilities.some(l => l.overdue || l.min_payment))) {
    return {
      type: 'high_utilization',
      rationale: `High credit utilization detected (${utilization.toFixed(1)}%). ${overdue ? 'Account is overdue.' : ''} ${creditInterest ? 'Paying interest on credit balance.' : ''} Focus on debt reduction and autopay tips.`
    }
  }
  
  // Priority 2: Variable Income Budgeter
  const incomeSignal = signals.find(s => s.signal_type === 'income')
  const savingsSignal = signals.find(s => s.signal_type === 'savings')
  
  if (incomeSignal && incomeSignal.signal_data.is_variable) {
    const cashBuffer = savingsSignal?.signal_data?.emergency_coverage_months || 0
    if (cashBuffer < 1) { // Less than 1 month emergency coverage
      return {
        type: 'variable_income_budgeter',
        rationale: `Variable income detected (${incomeSignal.signal_data.variability_percentage.toFixed(1)}% variability) with low cash buffer (${cashBuffer.toFixed(1)} months). Focus on percentage-based budgets and emergency fund basics.`
      }
    }
  }
  
  // Priority 3: Subscription-Heavy
  const subscriptionSignal = signals.find(s => s.signal_type === 'subscriptions')
  if (subscriptionSignal) {
    const monthlySpend = subscriptionSignal.signal_data.total_monthly_spend
    const percentage = subscriptionSignal.signal_data.percentage_of_total
    
    if (subscriptionSignal.signal_data.count >= 3 && (monthlySpend > 50 || percentage >= 10)) {
      return {
        type: 'subscription_heavy',
        rationale: `${subscriptionSignal.signal_data.count} recurring subscriptions totaling $${monthlySpend.toFixed(2)}/month (${percentage.toFixed(1)}% of total spending). Focus on subscription audit checklists and alerts.`
      }
    }
  }
  
  // Priority 4: Savings Builder
  if (savingsSignal) {
    const growthRate = savingsSignal.signal_data.growth_rate
    const allUtilLow = !highUtilSignal && utilization < 30
    
    if (growthRate === 'positive' && allUtilLow) {
      return {
        type: 'savings_builder',
        rationale: `Positive savings growth detected with ${savingsSignal.signal_data.emergency_coverage_months.toFixed(1)} months emergency coverage. All credit utilization below 30%. Focus on savings goals, automation, and HYSA options.`
      }
    }
  }
  
  // Priority 5: Impulse Spender
  // Check for ≥20% small <$20 transactions AND total impulse spend ≥15% of income
  if (transactions.length > 0) {
    const smallTransactions = transactions.filter(t => 
      t.amount < 0 && Math.abs(t.amount) < 20
    )
    const smallTransactionPercentage = (smallTransactions.length / transactions.length) * 100
    
    const totalImpulseSpend = smallTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    // Estimate income from signals or use a default
    const incomeSignalForImpulse = signals.find(s => s.signal_type === 'income')
    const estimatedMonthlyIncome = incomeSignalForImpulse?.signal_data?.average_amount || 3000
    const impulseSpendPercentage = (totalImpulseSpend / estimatedMonthlyIncome) * 100
    
    if (smallTransactionPercentage >= 20 && impulseSpendPercentage >= 15) {
      return {
        type: 'impulse_spender',
        rationale: `${smallTransactionPercentage.toFixed(1)}% of transactions are small impulse purchases (<$20), totaling ${impulseSpendPercentage.toFixed(1)}% of estimated income. Focus on mindful spending trackers, spending-pause rules, and alternative rewards.`
      }
    }
  }
  
  // Default: Savings Builder
  return {
    type: 'savings_builder',
    rationale: 'Default persona assigned. Focus on building savings and financial wellness.'
  }
}

