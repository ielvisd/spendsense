import { createClient } from '@supabase/supabase-js'
import { subMonths } from 'date-fns'
import { detectSubscriptions, detectSavings, detectCredit, detectIncome } from '~/utils/signalDetection'

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
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    // Use service role key for server-side operations (bypasses RLS)
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    const supabaseKey = serviceRoleKey || supabaseAnonKey
    
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
    
    // 1. Subscription Signal Detection (using extracted function)
    const subscriptionSignal = detectSubscriptions(transactions || [])
    if (subscriptionSignal) {
      signals.push(subscriptionSignal)
    }
    
    // 2. Savings Signal Detection (using extracted function)
    const savingsSignal = detectSavings(accounts, transactions || [])
    if (savingsSignal) {
      signals.push(savingsSignal)
    }
    
    // 3. Credit Signal Detection (using extracted function)
    const creditSignals = detectCredit(accounts, liabilities || [])
    signals.push(...creditSignals)
    
    // 4. Income Signal Detection (using extracted function)
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

