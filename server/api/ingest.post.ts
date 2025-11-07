import { createClient } from '@supabase/supabase-js'
import type { UserWithData } from '~/utils/generateData'

// Simple CSV parser for transaction data
function parseCSV(csvText: string): UserWithData[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  // Expected CSV format: user_id, fake_name, email, date, amount, merchant_name, account_type, category
  // Group transactions by user
  const userMap = new Map<string, any>()
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    
    const userId = row.user_id || row['user id'] || `user_${i}`
    const fakeName = row.fake_name || row.name || `User ${i}`
    
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        id: userId,
        fake_name: fakeName,
        demographics: {
          age: parseInt(row.age) || 30,
          gender: row.gender || 'other',
          income_range: row.income_range || '$50k-$75k',
          ethnicity: row.ethnicity || 'prefer_not_to_say'
        },
        accounts: [],
        transactions: [],
        liabilities: []
      })
    }
    
    const user = userMap.get(userId)
    
    // Create account if not exists
    const accountType = row.account_type || row.type || 'checking'
    let account = user.accounts.find((a: any) => a.type === accountType)
    if (!account) {
      account = {
        account_id: `${userId}_${accountType}`,
        type: accountType,
        subtype: null,
        balances: {
          current: 0,
          available: 0
        },
        iso_currency_code: 'USD'
      }
      user.accounts.push(account)
    }
    
    // Add transaction
    if (row.date && row.amount) {
      user.transactions.push({
        account_id: account.account_id,
        date: row.date,
        amount: parseFloat(row.amount) || 0,
        merchant_name: row.merchant_name || row.merchant || null,
        payment_channel: row.payment_channel || 'other',
        personal_finance_category: row.category || row.personal_finance_category || null,
        pending: false
      })
    }
  }
  
  return Array.from(userMap.values())
}

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        message: 'Supabase credentials not configured'
      })
    }
    
    // Use service role key for server-side operations (bypasses RLS)
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    const supabaseKey = serviceRoleKey || supabaseAnonKey
    
    if (!serviceRoleKey) {
      console.warn('[INGEST] Service role key not found, using anon key (may fail with RLS)')
    } else {
      console.log('[INGEST] Using service role key for database operations')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if storage bucket exists (file storage is optional)
    const bucketName = 'data-uploads'
    let bucketExists = false
    try {
      const { data: bucket, error: bucketCheckError } = await supabase.storage.getBucket(bucketName)
      bucketExists = !!bucket && !bucketCheckError
      
      // Only try to create if it doesn't exist and we have permission
      // Note: Creating buckets requires service role key, so this will fail with anon key
      // This is fine - file storage is optional for the demo
      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
          public: false, // Private bucket for user data
          fileSizeLimit: 52428800, // 50MB max file size
          allowedMimeTypes: ['application/json', 'text/csv', 'application/csv']
        })
        if (bucketError) {
          // Bucket creation requires admin permissions - this is expected with anon key
          // File storage will be skipped, but data ingestion will continue
          if (!bucketError.message.includes('already exists') && !bucketError.message.includes('row-level security')) {
            console.warn('Storage bucket not available (requires admin setup):', bucketError.message)
          }
        } else {
          bucketExists = true
        }
      }
    } catch (e) {
      // Bucket check/creation failed - continue without file storage
      console.warn('Storage bucket check failed, continuing without file storage')
    }
    
    // Check if this is a multipart form upload (CSV file)
    const contentType = getHeader(event, 'content-type') || ''
    let usersData: UserWithData[]
    let storedFilePath: string | null = null
    let fileName: string | null = null
    
    // Get user ID from query or body if available
    const query = getQuery(event)
    const userId = query.user_id as string || null
    
    // Debug logging
    console.log('[INGEST] Received request with userId:', userId)
    console.log('[INGEST] Query params:', query)
    
    if (contentType.includes('multipart/form-data')) {
      // Handle CSV file upload
      const formData = await readMultipartFormData(event)
      const filePart = formData?.find(part => part.name === 'file')
      
      if (!filePart || !filePart.data) {
        throw createError({
          statusCode: 400,
          message: 'No file provided in upload'
        })
      }
      
      fileName = filePart.filename || `upload_${Date.now()}.csv`
      
      // Store file in Supabase Storage
      // Only try to store file if bucket exists
      if (bucketExists) {
        const filePath = userId
          ? `users/${userId}/${Date.now()}_${fileName}`
          : `uploads/${Date.now()}_${fileName}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, filePart.data, {
            contentType: filePart.type || 'text/csv',
            upsert: false
          })
        
        if (uploadError) {
          console.warn('File storage failed (continuing without file storage):', uploadError.message)
          // Continue with processing even if storage fails
        } else {
          storedFilePath = uploadData.path
        }
      } else {
        console.warn('Storage bucket not available - file will not be stored, but data will be processed')
      }
      
      // Parse CSV
      const csvText = Buffer.from(filePart.data).toString('utf-8')
      usersData = parseCSV(csvText)
    } else {
      // Handle JSON body
      const body = await readBody(event)
      
      // If JSON data is provided as a file, try to store it
      if (body.file && body.file.data) {
        fileName = body.file.name || `upload_${Date.now()}.json`
        const filePath = userId 
          ? `users/${userId}/${Date.now()}_${fileName}`
          : `uploads/${Date.now()}_${fileName}`
        
        const fileBuffer = Buffer.from(body.file.data, 'base64')
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: 'application/json',
            upsert: false
          })
        
        if (!uploadError) {
          storedFilePath = uploadData.path
        }
      }
      
      if (body.data) {
        usersData = body.data
      } else if (Array.isArray(body)) {
        usersData = body
      } else {
        throw createError({
          statusCode: 400,
          message: 'Invalid request format. Expected array of user data or { data: [...] }'
        })
      }
      
      // Store JSON data as file if we have it and bucket exists
      if (usersData && !storedFilePath && userId && bucketExists) {
        fileName = `data_${Date.now()}.json`
        const filePath = `users/${userId}/${fileName}`
        const jsonBuffer = Buffer.from(JSON.stringify(usersData, null, 2))
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, jsonBuffer, {
            contentType: 'application/json',
            upsert: false
          })
        
        if (!uploadError) {
          storedFilePath = uploadData.path
        } else {
          console.warn('File storage failed (continuing without file storage):', uploadError.message)
        }
      }
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
    
    // If userId is provided, assign ONE user's data from the synthetic file (for authenticated user uploads)
    // Otherwise, process each user separately (for bulk imports)
    console.log('[INGEST] Processing with userId:', userId, 'usersData length:', usersData?.length)
    if (userId) {
      console.log('[INGEST] Assigning single user data for authenticated user:', userId)
      // Select ONE user's data randomly from the synthetic file for realistic demo
      const selectedUser = usersData[Math.floor(Math.random() * usersData.length)]
      
      if (!selectedUser) {
        throw createError({
          statusCode: 400,
          message: 'No user data available to assign'
        })
      }
      
      // Assign the selected user's data to the authenticated user
      const assignedUserData = {
        id: userId,
        fake_name: selectedUser.fake_name || 'User',
        demographics: selectedUser.demographics || {
          age: 30,
          gender: 'other',
          income_range: '$50k-$75k',
          ethnicity: 'prefer_not_to_say'
        },
        accounts: selectedUser.accounts || [],
        transactions: selectedUser.transactions || [],
        liabilities: selectedUser.liabilities || []
      }
      
      // Process the assigned user data
      usersData = [assignedUserData]
      console.log('[INGEST] Assigned user data - accounts:', assignedUserData.accounts.length, 'transactions:', assignedUserData.transactions.length)
    }
    
    // Process users in batches
    const batchSize = 10
    console.log('[INGEST] Starting to process', usersData.length, 'users')
    for (let i = 0; i < usersData.length; i += batchSize) {
      const batch = usersData.slice(i, i + batchSize)
      
      for (const userData of batch) {
        try {
          // Validate required fields
          if (!userData.id || !userData.fake_name || !userData.demographics) {
            results.errors.push(`User ${i + 1}: Missing required fields`)
            console.warn('[INGEST] Skipping user - missing required fields')
            continue
          }
          
          console.log('[INGEST] Processing user:', userData.id, 'with', userData.accounts?.length || 0, 'accounts and', userData.transactions?.length || 0, 'transactions')
          
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
            console.error('[INGEST] User insertion error:', userError)
            continue
          }
          
          results.users++
          console.log('[INGEST] User inserted successfully:', userData.id)
          
          // Insert accounts
          if (userData.accounts && Array.isArray(userData.accounts)) {
            console.log('[INGEST] Preparing to insert', userData.accounts.length, 'accounts for user:', userData.id)
            const accountsToInsert = userData.accounts.map(account => ({
              user_id: userData.id,
              account_id: account.account_id,
              type: account.type,
              subtype: account.subtype || null,
              balances: account.balances,
              iso_currency_code: account.iso_currency_code || 'USD',
              holder_category: account.holder_category || null
            }))
            
            console.log('[INGEST] Inserting accounts batch...')
            const { data: insertedAccounts, error: accountsError } = await supabase
              .from('accounts')
              .upsert(accountsToInsert, {
                onConflict: 'user_id,account_id'
              })
              .select()
            
            if (accountsError) {
              results.errors.push(`User ${userData.fake_name} accounts: ${accountsError.message}`)
              console.error('[INGEST] Account insertion error:', accountsError)
            } else {
              results.accounts += accountsToInsert.length
              console.log('[INGEST] Successfully inserted', accountsToInsert.length, 'accounts for user:', userData.id)
              if (insertedAccounts) {
                console.log('[INGEST] Sample account IDs:', insertedAccounts.slice(0, 3).map(a => ({ id: a.id, account_id: a.account_id })))
              }
            }
          } else {
            console.warn('[INGEST] No accounts to insert for user:', userData.id)
          }
          
          // Insert transactions (map by account_id)
          if (userData.transactions && Array.isArray(userData.transactions)) {
            console.log('[INGEST] Fetching accounts for user:', userData.id, 'to map transactions')
            const { data: userAccounts, error: accountsFetchError } = await supabase
              .from('accounts')
              .select('id, account_id')
              .eq('user_id', userData.id)
            
            if (accountsFetchError) {
              console.error('[INGEST] Error fetching accounts for transaction mapping:', accountsFetchError)
              results.errors.push(`User ${userData.fake_name} - failed to fetch accounts: ${accountsFetchError.message}`)
            } else if (userAccounts && userAccounts.length > 0) {
              console.log('[INGEST] Found', userAccounts.length, 'accounts for transaction mapping')
              // Create account_id to database id mapping
              const accountMap = new Map<string, string>()
              userAccounts.forEach(acc => {
                accountMap.set(acc.account_id, acc.id)
              })
              console.log('[INGEST] Account mapping created. Sample mappings:', Array.from(accountMap.entries()).slice(0, 3))
              
              // Map transactions to account IDs
              const transactionsToInsert = []
              let skippedCount = 0
              for (const txn of userData.transactions) {
                // Validate transaction
                if (!txn.date || !txn.amount || !txn.account_id) {
                  skippedCount++
                  continue
                }
                
                // Find matching account by account_id
                const dbAccountId = accountMap.get(txn.account_id)
                if (!dbAccountId) {
                  skippedCount++
                  continue // Skip if account not found
                }
                
                // Validate date range (last 2 years)
                const txnDate = new Date(txn.date)
                const twoYearsAgo = new Date()
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
                
                if (txnDate < twoYearsAgo || txnDate > new Date()) {
                  skippedCount++
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
              
              console.log('[INGEST] Prepared', transactionsToInsert.length, 'transactions to insert (skipped', skippedCount, 'invalid/missing)')
              
              if (transactionsToInsert.length > 0) {
                // Insert in batches of 1000
                const txnBatchSize = 1000
                for (let j = 0; j < transactionsToInsert.length; j += txnBatchSize) {
                  const txnBatch = transactionsToInsert.slice(j, j + txnBatchSize)
                  console.log('[INGEST] Inserting transaction batch', Math.floor(j / txnBatchSize) + 1, 'of', Math.ceil(transactionsToInsert.length / txnBatchSize))
                  const { error: txnError } = await supabase
                    .from('transactions')
                    .insert(txnBatch)
                  
                  if (txnError) {
                    results.errors.push(`User ${userData.fake_name} transactions batch ${j}: ${txnError.message}`)
                    console.error('[INGEST] Transaction insertion error:', txnError)
                  } else {
                    results.transactions += txnBatch.length
                    console.log('[INGEST] Successfully inserted', txnBatch.length, 'transactions (batch', Math.floor(j / txnBatchSize) + 1, ') for user:', userData.id)
                  }
                }
              } else {
                console.warn('[INGEST] No valid transactions to insert for user:', userData.id)
              }
            } else {
              console.warn('[INGEST] No accounts found for user:', userData.id, '- cannot insert transactions')
            }
          } else {
            console.warn('[INGEST] No transactions to insert for user:', userData.id)
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
    
    console.log('[INGEST] Final results:', {
      users: results.users,
      accounts: results.accounts,
      transactions: results.transactions,
      liabilities: results.liabilities,
      errors: results.errors.length
    })
    
    return {
      success: true,
      message: `Ingested ${results.users} users`,
      results,
      file_stored: storedFilePath ? true : false,
      file_path: storedFilePath,
      file_name: fileName
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Ingestion failed: ${error.message}`
    })
  }
})

