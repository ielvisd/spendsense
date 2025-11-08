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
    
    // Get all flag logs to find the ones matching our recommendation IDs
    const { data: flagLogs, error: fetchError } = await supabase
      .from('logs')
      .select('id, decision_trace')
      .eq('action_type', 'recommendation_flagged')
    
    if (fetchError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch flag logs: ${fetchError.message}`
      })
    }
    
    // Find log IDs that match the recommendation IDs
    const logIdsToDelete = flagLogs
      ?.filter(log => {
        const recId = (log.decision_trace as any)?.recommendation_id
        return recId && recommendation_ids.includes(recId)
      })
      .map(log => log.id) || []
    
    if (logIdsToDelete.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No flag logs found for the specified recommendation IDs'
      })
    }
    
    // Delete the flag logs
    const { error: deleteError } = await supabase
      .from('logs')
      .delete()
      .in('id', logIdsToDelete)
    
    if (deleteError) {
      throw createError({
        statusCode: 500,
        message: `Failed to remove flags: ${deleteError.message}`
      })
    }
    
    // Log the unflag action
    for (const recId of recommendation_ids) {
      await supabase
        .from('logs')
        .insert({
          user_id: operator_id,
          action_type: 'recommendation_unflagged',
          decision_trace: {
            recommendation_id: recId,
            unflagged_at: new Date().toISOString()
          }
        })
    }
    
    return {
      success: true,
      unflagged_count: logIdsToDelete.length
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Unflagging failed: ${error.message}`
    })
  }
})

