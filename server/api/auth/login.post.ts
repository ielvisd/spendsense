import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Set content type to JSON
  setHeader(event, 'Content-Type', 'application/json')
  
  try {
    const body = await readBody(event)
    console.log('Login request body:', { email: body?.email, hasPassword: !!body?.password })
    
    if (!body || typeof body !== 'object') {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Invalid request body',
        statusCode: 400
      }
    }
    
    const { email, password } = body
    
    if (!email || !password) {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Email and password are required',
        statusCode: 400
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Invalid email format',
        statusCode: 400
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
    
    // Create Supabase client with explicit auth options
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // We're handling sessions manually
        detectSessionInUrl: false,
        flowType: 'pkce' // Use PKCE flow
      },
      global: {
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    })
    
    // Sign in the user
    console.log('Attempting login for:', email.trim().toLowerCase())
    
    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })
      
      if (supabaseError) {
        console.error('Supabase login error details:', {
          message: supabaseError.message,
          status: supabaseError.status,
          name: supabaseError.name,
          cause: supabaseError.cause
        })
        
        // Check if the error message indicates HTML response
        if (supabaseError.message?.includes('<!DOCTYPE') || supabaseError.message?.includes('Unexpected token')) {
          setResponseStatus(event, 500, 'Internal Server Error')
          return {
            error: true,
            message: 'Supabase authentication service returned an unexpected response. Please check your Supabase project configuration.',
            statusCode: 500
          }
        }
        
        // Provide more specific error messages
        let errorMessage = supabaseError.message || 'Failed to sign in'
        
        if (supabaseError.message?.includes('Invalid login credentials') || 
            supabaseError.message?.includes('Invalid credentials') ||
            supabaseError.message?.includes('Email not confirmed')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (supabaseError.message?.includes('User not found')) {
          errorMessage = 'No account found with this email. Please sign up instead.'
        } else if (supabaseError.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.'
        }
        
        setResponseStatus(event, 401, 'Unauthorized')
        return {
          error: true,
          message: errorMessage,
          statusCode: 401
        }
      }
      
      console.log('Login successful:', { userId: data.user?.id, hasSession: !!data.session })
      
      return {
        user: data.user,
        session: data.session
      }
    } catch (loginError: any) {
      console.error('Login catch error:', {
        message: loginError.message,
        stack: loginError.stack,
        name: loginError.name
      })
      
      // If we get an HTML parsing error, it means Supabase returned HTML
      if (loginError.message?.includes('<!DOCTYPE') || loginError.message?.includes('Unexpected token')) {
        setResponseStatus(event, 500, 'Internal Server Error')
        return {
          error: true,
          message: 'Supabase authentication service configuration issue. Please verify your Supabase project settings.',
          statusCode: 500
        }
      }
      
      throw loginError // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Login endpoint error:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    
    setResponseStatus(event, 500, 'Internal Server Error')
    return {
      error: true,
      message: error.message || 'Login failed',
      statusCode: 500
    }
  }
})

