import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const userId = body.user_id as string
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'user_id is required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check consent first
    const { data: consent } = await supabase
      .from('consent')
      .select('consent_status')
      .eq('user_id', userId)
      .single()
    
    if (!consent || !consent.consent_status) {
      throw createError({
        statusCode: 403,
        message: 'User has not granted consent'
      })
    }
    
    // Get signals
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .eq('user_id', userId)
    
    // Get accounts and liabilities
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
    
    const { data: liabilities } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', userId)
    
    // Get transactions for impulse spender detection
    const accountIds = accounts?.map(acc => acc.id) || []
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .limit(1000) // Get recent transactions
    
    // Assign persona based on priority rules
    const persona = assignPersona(signals || [], accounts || [], liabilities || [], transactions || [])
    
    // Store persona assignment
    const { error: personaError } = await supabase
      .from('personas')
      .upsert({
        user_id: userId,
        persona_type: persona.type,
        rationale: persona.rationale
      }, {
        onConflict: 'user_id'
      })
    
    if (personaError) throw personaError
    
    // Log decision trace
    await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action_type: 'persona_assignment',
        decision_trace: {
          persona_type: persona.type,
          rationale: persona.rationale,
          signals_used: signals?.map(s => s.signal_type) || [],
          timestamp: new Date().toISOString()
        }
      })
    
    return { persona }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Persona assignment failed: ${error.message}`
    })
  }
})

function assignPersona(signals: any[], accounts: any[], liabilities: any[], transactions: any[]): { type: string; rationale: string } {
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
    const incomeSignal = signals.find(s => s.signal_type === 'income')
    const estimatedMonthlyIncome = incomeSignal?.signal_data?.average_amount || 3000
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

