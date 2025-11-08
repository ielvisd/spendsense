import { createClient } from '@supabase/supabase-js'
import { subDays } from 'date-fns'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    const limit = query.limit ? parseInt(query.limit as string) : undefined // No default limit - let pagination handle it
    const days = parseInt(query.days as string) || 90
    
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
    
    // Get user's accounts first
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, account_id, type, subtype')
      .eq('user_id', userId)
    
    if (accountsError) throw accountsError
    if (!accounts || accounts.length === 0) {
      console.log('[TRANSACTIONS] No accounts found for user:', userId)
      return { transactions: [], accounts: [] }
    }
    
    // Get account IDs (database UUIDs)
    const accountIds = accounts.map(acc => acc.id)
    console.log('[TRANSACTIONS] Found', accounts.length, 'accounts for user:', userId, 'Account IDs:', accountIds.slice(0, 3))
    
    // Calculate date range
    const startDate = subDays(new Date(), days)
    console.log('[TRANSACTIONS] Querying transactions from', startDate.toISOString().split('T')[0], 'to today')
    
    // Get transactions for these accounts
    let transactionsQuery = supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    // Only apply limit if specified
    if (limit) {
      transactionsQuery = transactionsQuery.limit(limit)
    }
    
    const { data: transactions, error: transactionsError } = await transactionsQuery
    
    if (transactionsError) {
      console.error('[TRANSACTIONS] Error fetching transactions:', transactionsError)
      throw transactionsError
    }
    
    console.log('[TRANSACTIONS] Found', transactions?.length || 0, 'transactions for user:', userId)
    
    // Create account map for easy lookup
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]))
    
    // Format transactions with account names
    const formattedTransactions = (transactions || []).map(txn => ({
      ...txn,
      account_name: accountMap.get(txn.account_id)?.type || 'Unknown Account',
      account_type: accountMap.get(txn.account_id)?.type || 'unknown'
    }))
    
    return {
      transactions: formattedTransactions,
      accounts: accounts.map(acc => ({
        id: acc.id,
        type: acc.type,
        subtype: acc.subtype
      }))
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch transactions: ${error.message}`
    })
  }
})

