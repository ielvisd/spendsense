import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { recommendation_ids, operator_id } = body
    
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
    
    // Bulk approve recommendations
    const { error } = await supabase
      .from('recommendations')
      .update({ approved_by_operator: operator_id })
      .in('id', recommendation_ids)
    
    if (error) throw error
    
    // Log the action
    for (const recId of recommendation_ids) {
      await supabase
        .from('logs')
        .insert({
          user_id: operator_id,
          action_type: 'recommendation_approved',
          decision_trace: { recommendation_id: recId, bulk: true }
        })
    }
    
    return {
      success: true,
      approved_count: recommendation_ids.length
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Approval failed: ${error.message}`
    })
  }
})

