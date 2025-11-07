import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const userId = body.user_id as string
    const actionType = body.action_type as string
    const feedbackData = body.feedback_data || {}
    
    if (!userId || !actionType) {
      throw createError({
        statusCode: 400,
        message: 'user_id and action_type are required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Log feedback
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        decision_trace: feedbackData
      })
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Feedback logging failed: ${error.message}`
    })
  }
})

