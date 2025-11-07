import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Set content type to JSON
  setHeader(event, 'Content-Type', 'application/json')
  
  try {
    const body = await readBody(event)
    console.log('Signup request body:', { email: body?.email, hasPassword: !!body?.password })
    
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
    
    // Validate password length (Supabase requires at least 6 characters)
    if (password.length < 6) {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Password must be at least 6 characters long',
        statusCode: 400
      }
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    console.log('Supabase config:', {
      url: supabaseUrl,
      hasKey: !!supabaseKey,
      keyLength: supabaseKey?.length
    })
    
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
    
    // Sign up the user - simplified options for demo
    console.log('Attempting signup for:', email.trim().toLowerCase())
    
    try {
      const { data, error: supabaseError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            email: email.trim().toLowerCase()
          }
        }
      })
      
      if (supabaseError) {
        console.error('Supabase signup error details:', {
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
        let errorMessage = supabaseError.message || 'Failed to create account'
        
        if (supabaseError.message?.includes('already registered') || supabaseError.message?.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.'
        } else if (supabaseError.message?.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please use at least 6 characters.'
        } else if (supabaseError.message?.includes('email')) {
          errorMessage = 'Invalid email address. Please check your email and try again.'
        }
        
        setResponseStatus(event, 400, 'Bad Request')
        return {
          error: true,
          message: errorMessage,
          statusCode: 400
        }
      }
      
      console.log('Signup successful:', { userId: data.user?.id, hasSession: !!data.session })
      
      return {
        user: data.user,
        session: data.session,
        needsEmailConfirmation: !data.session
      }
    } catch (signupError: any) {
      console.error('Signup catch error:', {
        message: signupError.message,
        stack: signupError.stack,
        name: signupError.name
      })
      
      // If we get an HTML parsing error, it means Supabase returned HTML
      if (signupError.message?.includes('<!DOCTYPE') || signupError.message?.includes('Unexpected token')) {
        setResponseStatus(event, 500, 'Internal Server Error')
        return {
          error: true,
          message: 'Supabase authentication service configuration issue. Please verify your Supabase project settings.',
          statusCode: 500
        }
      }
      
      throw signupError // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Signup endpoint error:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    
    setResponseStatus(event, 500, 'Internal Server Error')
    return {
      error: true,
      message: error.message || 'Signup failed',
      statusCode: 500
    }
  }
})
