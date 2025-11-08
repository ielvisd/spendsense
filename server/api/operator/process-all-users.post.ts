import { createClient } from '@supabase/supabase-js'

/**
 * Operator endpoint to process all users:
 * - Detect signals
 * - Assign personas
 * - Generate recommendations
 * 
 * This is useful after bulk importing users via /api/ingest
 */
export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    const supabaseKey = serviceRoleKey || supabaseAnonKey
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1000)
    
    if (usersError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch users: ${usersError.message}`
      })
    }
    
    if (!users || users.length === 0) {
      return {
        message: 'No users found',
        processed: 0,
        errors: []
      }
    }
    
    const results = {
      processed: 0,
      errors: [] as Array<{ userId: string; error: string }>
    }
    
    // Process each user
    for (const user of users) {
      try {
        // 1. Ensure consent exists (required for signals/personas/recommendations)
        const { data: existingConsent, error: consentCheckError } = await supabase
          .from('consent')
          .select('id, consent_status')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (consentCheckError && consentCheckError.code !== 'PGRST116') {
          throw new Error(`Failed to check consent: ${consentCheckError.message}`)
        }
        
        if (!existingConsent || !existingConsent.consent_status) {
          const { error: consentInsertError } = await supabase
            .from('consent')
            .upsert({
              user_id: user.id,
              consent_status: true,
              granted_at: new Date().toISOString(),
              revoked_at: null
            }, {
              onConflict: 'user_id'
            })
          
          if (consentInsertError) {
            throw new Error(`Failed to create consent: ${consentInsertError.message}`)
          }
          
          // Wait a bit to ensure consent is committed
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // 2. Detect signals (doesn't require consent, but we'll do it anyway)
        try {
          await $fetch('/api/signals', {
            method: 'GET',
            params: { user_id: user.id }
          })
        } catch (signalError: any) {
          console.warn(`[PROCESS-ALL] Signal detection failed for user ${user.id}:`, signalError.message)
          // Continue even if signals fail
        }
        
        // 3. Assign persona (requires consent)
        try {
          await $fetch('/api/personas', {
            method: 'POST',
            body: { user_id: user.id }
          })
        } catch (personaError: any) {
          // If persona fails due to consent, try creating consent again
          if (personaError.statusCode === 403 && personaError.message?.includes('consent')) {
            const { error: retryConsentError } = await supabase
              .from('consent')
              .upsert({
                user_id: user.id,
                consent_status: true,
                granted_at: new Date().toISOString(),
                revoked_at: null
              }, {
                onConflict: 'user_id'
              })
            
            if (!retryConsentError) {
              // Retry persona assignment
              await $fetch('/api/personas', {
                method: 'POST',
                body: { user_id: user.id }
              })
            } else {
              throw personaError
            }
          } else {
            throw personaError
          }
        }
        
        // 4. Generate recommendations (requires consent and persona)
        try {
          await $fetch('/api/recommendations', {
            method: 'GET',
            params: { user_id: user.id }
          })
        } catch (recError: any) {
          console.warn(`[PROCESS-ALL] Recommendation generation failed for user ${user.id}:`, recError.message)
          // Continue even if recommendations fail
        }
        
        results.processed++
      } catch (error: any) {
        results.errors.push({
          userId: user.id,
          error: error.message || 'Unknown error'
        })
        console.error(`[PROCESS-ALL] Error processing user ${user.id}:`, error)
      }
    }
    
    return {
      message: `Processed ${results.processed} of ${users.length} users`,
      processed: results.processed,
      total: users.length,
      errors: results.errors
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to process users: ${error.message}`
    })
  }
})

