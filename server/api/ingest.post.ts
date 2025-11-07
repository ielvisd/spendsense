import { createClient } from '@supabase/supabase-js'
import type { UserWithData } from '~/utils/generateData'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({
        statusCode: 500,
        message: 'Supabase credentials not configured'
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the request body
    const body = await readBody(event)
    
    // Support both file upload and direct JSON
    let usersData: UserWithData[]
    
    if (body.file) {
      // Handle file upload (would need multipart form handling)
      throw createError({
        statusCode: 400,
        message: 'File upload not yet implemented. Please send JSON data directly.'
      })
    } else if (body.data) {
      usersData = body.data
    } else if (Array.isArray(body)) {
      usersData = body
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid request format. Expected array of user data or { data: [...] }'
      })
    }
    
    // Validate data structure
    if (!Array.isArray(usersData) || usersData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Data must be a non-empty array'
      })
    }
    
    const results = {
      users: 0,
      accounts: 0,
      transactions: 0,
      liabilities: 0,
      errors: [] as string[]
    }
    
    // Process users in batches
    const batchSize = 10
    for (let i = 0; i < usersData.length; i += batchSize) {
      const batch = usersData.slice(i, i + batchSize)
      
      for (const userData of batch) {
        try {
          // Validate required fields
          if (!userData.id || !userData.fake_name || !userData.demographics) {
            results.errors.push(`User ${i + 1}: Missing required fields`)
            continue
          }
          
          // Insert user
          const { data: user, error: userError } = await supabase
            .from('users')
            .upsert({
              id: userData.id,
              fake_name: userData.fake_name,
              consent_status: false, // Default to false
              demographics: userData.demographics
            }, {
              onConflict: 'id'
            })
            .select()
            .single()
          
          if (userError) {
            results.errors.push(`User ${userData.fake_name}: ${userError.message}`)
            continue
          }
          
          results.users++
          
          // Insert accounts
          if (userData.accounts && Array.isArray(userData.accounts)) {
            const accountsToInsert = userData.accounts.map(account => ({
              user_id: userData.id,
              account_id: account.account_id,
              type: account.type,
              subtype: account.subtype || null,
              balances: account.balances,
              iso_currency_code: account.iso_currency_code || 'USD',
              holder_category: account.holder_category || null
            }))
            
            const { error: accountsError } = await supabase
              .from('accounts')
              .upsert(accountsToInsert, {
                onConflict: 'user_id,account_id'
              })
            
            if (accountsError) {
              results.errors.push(`User ${userData.fake_name} accounts: ${accountsError.message}`)
            } else {
              results.accounts += accountsToInsert.length
            }
          }
          
          // Insert transactions (map by account_id)
          if (userData.transactions && Array.isArray(userData.transactions)) {
            const { data: userAccounts } = await supabase
              .from('accounts')
              .select('id, account_id')
              .eq('user_id', userData.id)
            
            if (userAccounts && userAccounts.length > 0) {
              // Create account_id to database id mapping
              const accountMap = new Map<string, string>()
              userAccounts.forEach(acc => {
                accountMap.set(acc.account_id, acc.id)
              })
              
              // Map transactions to account IDs
              const transactionsToInsert = []
              for (const txn of userData.transactions) {
                // Validate transaction
                if (!txn.date || !txn.amount || !txn.account_id) {
                  continue
                }
                
                // Find matching account by account_id
                const dbAccountId = accountMap.get(txn.account_id)
                if (!dbAccountId) {
                  continue // Skip if account not found
                }
                
                // Validate date range (last 2 years)
                const txnDate = new Date(txn.date)
                const twoYearsAgo = new Date()
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
                
                if (txnDate < twoYearsAgo || txnDate > new Date()) {
                  continue // Skip invalid dates
                }
                
                transactionsToInsert.push({
                  account_id: dbAccountId,
                  date: txn.date,
                  amount: txn.amount,
                  merchant_name: txn.merchant_name || null,
                  payment_channel: txn.payment_channel || null,
                  personal_finance_category: txn.personal_finance_category || null,
                  pending: txn.pending || false
                })
              }
              
              if (transactionsToInsert.length > 0) {
                // Insert in batches of 1000
                const txnBatchSize = 1000
                for (let j = 0; j < transactionsToInsert.length; j += txnBatchSize) {
                  const txnBatch = transactionsToInsert.slice(j, j + txnBatchSize)
                  const { error: txnError } = await supabase
                    .from('transactions')
                    .insert(txnBatch)
                  
                  if (txnError) {
                    results.errors.push(`User ${userData.fake_name} transactions batch ${j}: ${txnError.message}`)
                  } else {
                    results.transactions += txnBatch.length
                  }
                }
              }
            }
          }
          
          // Insert liabilities
          if (userData.liabilities && Array.isArray(userData.liabilities)) {
            const liabilitiesToInsert = userData.liabilities.map(liability => ({
              user_id: userData.id,
              type: liability.type,
              apr: liability.apr || null,
              interest_rate: liability.interest_rate || null,
              min_payment: liability.min_payment || null,
              last_payment: liability.last_payment || null,
              overdue: liability.overdue || false,
              next_due: liability.next_due || null,
              last_balance: liability.last_balance || null
            }))
            
            const { error: liabilitiesError } = await supabase
              .from('liabilities')
              .insert(liabilitiesToInsert)
            
            if (liabilitiesError) {
              results.errors.push(`User ${userData.fake_name} liabilities: ${liabilitiesError.message}`)
            } else {
              results.liabilities += liabilitiesToInsert.length
            }
          }
        } catch (error: any) {
          results.errors.push(`User ${i + 1}: ${error.message}`)
        }
      }
    }
    
    return {
      success: true,
      message: `Ingested ${results.users} users`,
      results
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Ingestion failed: ${error.message}`
    })
  }
})

