import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Set content type to JSON
  setHeader(event, 'Content-Type', 'application/json')
  
  try {
    const body = await readBody(event)
    console.log('Password reset request body:', { email: body?.email })
    
    if (!body || typeof body !== 'object') {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Invalid request body',
        statusCode: 400
      }
    }
    
    const { email } = body
    
    if (!email) {
      setResponseStatus(event, 400, 'Bad Request')
      return {
        error: true,
        message: 'Email is required',
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
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    })
    
    // Send password reset email
    console.log('Attempting password reset for:', email.trim().toLowerCase())
    
    try {
      const { data, error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/onboarding?reset=true`
        }
      )
      
      if (supabaseError) {
        console.error('Supabase password reset error details:', {
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
        let errorMessage = supabaseError.message || 'Failed to send password reset email'
        
        setResponseStatus(event, 400, 'Bad Request')
        return {
          error: true,
          message: errorMessage,
          statusCode: 400
        }
      }
      
      // Note: Supabase doesn't reveal if email exists for security reasons
      // Always return success message
      console.log('Password reset email sent successfully')
      
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link shortly.'
      }
    } catch (resetError: any) {
      console.error('Password reset catch error:', {
        message: resetError.message,
        stack: resetError.stack,
        name: resetError.name
      })
      
      // If we get an HTML parsing error, it means Supabase returned HTML
      if (resetError.message?.includes('<!DOCTYPE') || resetError.message?.includes('Unexpected token')) {
        setResponseStatus(event, 500, 'Internal Server Error')
        return {
          error: true,
          message: 'Supabase authentication service configuration issue. Please verify your Supabase project settings.',
          statusCode: 500
        }
      }
      
      throw resetError // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Password reset endpoint error:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    
    setResponseStatus(event, 500, 'Internal Server Error')
    return {
      error: true,
      message: error.message || 'Password reset failed',
      statusCode: 500
    }
  }
})

