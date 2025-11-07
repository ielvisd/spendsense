import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Set content type to JSON
  setHeader(event, 'Content-Type', 'application/json')
  
  try {
    // Get the authorization header
    const authHeader = getHeader(event, 'authorization')
    const accessToken = authHeader?.replace('Bearer ', '')
    
    if (!accessToken) {
      setResponseStatus(event, 401, 'Unauthorized')
      return {
        error: true,
        message: 'No access token provided',
        statusCode: 401
      }
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    if (!supabaseUrl || !supabaseKey) {
      setResponseStatus(event, 500, 'Internal Server Error')
      return {
        error: true,
        message: 'Supabase credentials not configured',
        statusCode: 500
      }
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    })
    
    // Sign out the user
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('Logout error:', signOutError)
      setResponseStatus(event, 500, 'Internal Server Error')
      return {
        error: true,
        message: signOutError.message || 'Failed to sign out',
        statusCode: 500
      }
    }
    
    return {
      success: true,
      message: 'Successfully signed out'
    }
  } catch (error: any) {
    console.error('Logout endpoint error:', {
      message: error.message,
      stack: error.stack
    })
    
    setResponseStatus(event, 500, 'Internal Server Error')
    return {
      error: true,
      message: error.message || 'Logout failed',
      statusCode: 500
    }
  }
})

