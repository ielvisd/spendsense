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
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({
        statusCode: 500,
        message: 'Supabase credentials not configured'
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Ensure storage bucket exists (create if it doesn't)
    const bucketName = 'data-uploads'
    const { data: bucketExists } = await supabase.storage.getBucket(bucketName)
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
        public: false, // Private bucket for user data
        fileSizeLimit: 52428800, // 50MB max file size
        allowedMimeTypes: ['application/json', 'text/csv', 'application/csv']
      })
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.warn('Could not create storage bucket:', bucketError.message)
      }
    }
    
    // Check if this is a multipart form upload (CSV file)
    const contentType = getHeader(event, 'content-type') || ''
    let usersData: UserWithData[]
    let storedFilePath: string | null = null
    let fileName: string | null = null
    
    // Get user ID from query or body if available
    const query = getQuery(event)
    const userId = query.user_id as string || null
    
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
        console.warn('File storage failed:', uploadError.message)
        // Continue with processing even if storage fails
      } else {
        storedFilePath = uploadData.path
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
      
      // Store JSON data as file if we have it
      if (usersData && !storedFilePath && userId) {
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

