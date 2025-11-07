import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { recommendation_ids, operator_id, reason } = body
    
    if (!recommendation_ids || !Array.isArray(recommendation_ids) || recommendation_ids.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'recommendation_ids array is required'
      })
    }
    
    if (!operator_id) {
      throw createError({
        statusCode: 400,
        message: 'operator_id is required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create or update flag queue entries
    // Since we don't have a flagged field, we'll use the logs table to track flags
    // In production, you'd want a dedicated flag_queue table
    for (const recId of recommendation_ids) {
      // Log the flag action
      await supabase
        .from('logs')
        .insert({
          user_id: operator_id,
          action_type: 'recommendation_flagged',
          decision_trace: {
            recommendation_id: recId,
            reason: reason || 'Flagged by operator',
            flagged_at: new Date().toISOString(),
            bulk: recommendation_ids.length > 1
          }
        })
      
      // Optionally, you could also update the recommendation to mark it as flagged
      // This would require adding a flagged field to the recommendations table
    }
    
    return {
      success: true,
      flagged_count: recommendation_ids.length
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Flagging failed: ${error.message}`
    })
  }
})

