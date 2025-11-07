import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const userId = body.user_id as string
    const consentStatus = body.consent_status as boolean
    
    if (!userId || typeof consentStatus !== 'boolean') {
      throw createError({
        statusCode: 400,
        message: 'user_id and consent_status (boolean) are required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    // Use service role key if available (bypasses RLS for server-side operations)
    // This is REQUIRED for creating user records due to RLS policies
    // Try both process.env and runtimeConfig for Nuxt 3 compatibility
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    
    // Debug: Log environment variable status (without exposing the key)
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set - user creation may fail due to RLS')
      console.warn('Environment check:', {
        'process.env.SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        'config.SUPABASE_SERVICE_ROLE_KEY': !!config.SUPABASE_SERVICE_ROLE_KEY,
        'config.supabaseServiceRoleKey': !!config.supabaseServiceRoleKey,
        'All env vars': Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      })
    } else {
      console.log('✓ Service role key found and will be used')
    }
    
    // Get user's access token and refresh token from request for consent operations
    const authHeader = getHeader(event, 'authorization')
    const accessToken = authHeader?.replace('Bearer ', '') || null
    const refreshToken = getHeader(event, 'x-refresh-token') || null
    
    console.log('Consent request:', {
      userId,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasServiceRoleKey: !!serviceRoleKey
    })
    
    // Use service role key for user table operations (bypasses RLS)
    const supabaseForUsers = serviceRoleKey 
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, supabaseAnonKey)
    
    // Create separate client for consent operations
    // Use service role key if available (bypasses RLS), otherwise use user's token
    let supabaseForConsent: ReturnType<typeof createClient>
    
    if (serviceRoleKey) {
      // Use service role key - bypasses RLS
      supabaseForConsent = createClient(supabaseUrl, serviceRoleKey)
    } else if (accessToken) {
      // Create client with anon key and set the session with user's token
      // This allows RLS policies to work correctly
      supabaseForConsent = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
      
      // Set the session so RLS policies can check auth.uid()
      // This is important for RLS to work properly
      try {
        if (refreshToken) {
          const { data: sessionData, error: sessionError } = await supabaseForConsent.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (sessionError) {
            console.warn('Could not set session:', sessionError)
          } else {
            const tokenUserId = sessionData.user?.id
            console.log('Session set successfully for user:', tokenUserId)
            
            // Verify the user ID from token matches the request
            if (tokenUserId && tokenUserId !== userId) {
              throw createError({
                statusCode: 403,
                message: `User ID mismatch: token user (${tokenUserId}) does not match request user (${userId})`
              })
            }
          }
        } else {
          // Try to verify the token works by getting the user
          const { data: { user }, error: userError } = await supabaseForConsent.auth.getUser(accessToken)
          if (userError || !user) {
            console.warn('Could not verify user from token:', userError)
          } else {
            console.log('Verified user from token:', user.id)
            
            // Verify the user ID from token matches the request
            if (user.id !== userId) {
              throw createError({
                statusCode: 403,
                message: `User ID mismatch: token user (${user.id}) does not match request user (${userId})`
              })
            }
          }
        }
      } catch (sessionError: any) {
        // If it's our custom error, re-throw it
        if (sessionError.statusCode) {
          throw sessionError
        }
        console.warn('Error setting/verifying session:', sessionError)
      }
    } else {
      // No token available - this will likely fail with RLS
      supabaseForConsent = createClient(supabaseUrl, supabaseAnonKey)
    }
    
    // First, check if user exists in users table
    // This might fail with RLS if service role key is not set, so we catch the error
    let existingUser = null
    try {
      const { data, error } = await supabaseForUsers
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
      
      if (!error) {
        existingUser = data
      }
    } catch (error) {
      // RLS might block this query - that's okay, we'll try to create the user
      console.warn('Could not check if user exists (RLS may be blocking):', error)
    }
    
    // Only try to create user if it doesn't exist
    if (!existingUser) {
      if (!serviceRoleKey) {
        // Without service role key, we can't create users due to RLS
        // Log a warning but continue - the user record will be created when they upload data
        console.warn(`Cannot create user ${userId} - SUPABASE_SERVICE_ROLE_KEY not set. User will be created on data upload.`)
      } else {
        // Create user record with service role key (bypasses RLS)
        const { error: userInsertError } = await supabaseForUsers
          .from('users')
          .insert({
            id: userId,
            fake_name: `User ${userId.slice(0, 8)}`, // Default name, can be updated later
            consent_status: consentStatus,
            demographics: null
          })
        
        if (userInsertError) {
          // If insert fails, try upsert as fallback
          const { error: userUpsertError } = await supabaseForUsers
            .from('users')
            .upsert({
              id: userId,
              fake_name: `User ${userId.slice(0, 8)}`,
              consent_status: consentStatus,
              demographics: null
            }, {
              onConflict: 'id'
            })
          
          if (userUpsertError) {
            console.error('Failed to create/update user:', userUpsertError)
            // Don't throw - continue with consent update
            // User record will be created when they upload data via /api/ingest
          }
        }
      }
    } else {
      // User exists, update consent_status
      const { error: updateError } = await supabaseForUsers
        .from('users')
        .update({ consent_status: consentStatus })
        .eq('id', userId)
      
      if (updateError && serviceRoleKey) {
        // Only log if we have service role key (otherwise RLS might block this)
        console.error('Failed to update user consent_status:', updateError)
      }
    }
    
    if (consentStatus) {
      // Grant consent
      const { error } = await supabaseForConsent
        .from('consent')
        .upsert({
          user_id: userId,
          consent_status: true,
          granted_at: new Date().toISOString(),
          revoked_at: null
        }, {
          onConflict: 'user_id'
        })
      
      if (error) {
        // If RLS is blocking, provide helpful error message
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          console.error('RLS policy violation:', error)
          throw createError({
            statusCode: 403,
            message: `Consent update failed due to RLS policy. ${!serviceRoleKey ? 'Please set SUPABASE_SERVICE_ROLE_KEY environment variable, or update RLS policies to allow users to insert their own consent records.' : 'RLS policy may need to be updated.'}`
          })
        }
        throw error
      }
      
      // Also update users table (only if we have service role key, otherwise RLS will block)
      if (serviceRoleKey) {
        const { error: updateError } = await supabaseForUsers
          .from('users')
          .update({ consent_status: true })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Failed to update users.consent_status:', updateError)
          // Don't throw - consent table was updated successfully
        }
      }
    } else {
      // Revoke consent - trigger data purge
      const { error } = await supabaseForConsent
        .from('consent')
        .upsert({
          user_id: userId,
          consent_status: false,
          revoked_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) {
        // If RLS is blocking, provide helpful error message
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          console.error('RLS policy violation:', error)
          throw createError({
            statusCode: 403,
            message: `Consent update failed due to RLS policy. ${!serviceRoleKey ? 'Please set SUPABASE_SERVICE_ROLE_KEY environment variable, or update RLS policies to allow users to insert their own consent records.' : 'RLS policy may need to be updated.'}`
          })
        }
        throw error
      }
      
      // Update users table (only if we have service role key, otherwise RLS will block)
      if (serviceRoleKey) {
        const { error: updateError } = await supabaseForUsers
          .from('users')
          .update({ consent_status: false })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Failed to update users.consent_status:', updateError)
          // Don't throw - consent table was updated successfully
        }
      }
      
      // Note: In production, you would purge user data here
      // For now, we just update the consent status
    }
    
    return { success: true, consent_status: consentStatus }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Consent update failed: ${error.message}`
    })
  }
})

