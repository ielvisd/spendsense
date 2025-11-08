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
    
    // Check for existing flags to prevent duplicates
    const { data: existingFlags, error: checkError } = await supabase
      .from('logs')
      .select('decision_trace')
      .eq('action_type', 'recommendation_flagged')
    
    if (checkError) {
      throw createError({
        statusCode: 500,
        message: `Failed to check existing flags: ${checkError.message}`
      })
    }
    
    const flaggedRecIds = new Set(
      existingFlags
        ?.map(log => (log.decision_trace as any)?.recommendation_id)
        .filter(Boolean) || []
    )
    
    // Filter out already flagged recommendations
    const newRecIds = recommendation_ids.filter(recId => !flaggedRecIds.has(recId))
    const alreadyFlagged = recommendation_ids.filter(recId => flaggedRecIds.has(recId))
    
    if (newRecIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: `All recommendations are already flagged. Already flagged: ${alreadyFlagged.join(', ')}`
      })
    }
    
    if (alreadyFlagged.length > 0) {
      console.warn(`Some recommendations were already flagged: ${alreadyFlagged.join(', ')}`)
    }
    
    // Create flag queue entries for new flags only
    // Since we don't have a flagged field, we'll use the logs table to track flags
    // In production, you'd want a dedicated flag_queue table
    for (const recId of newRecIds) {
      // Log the flag action
      const { error: insertError } = await supabase
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
      
      if (insertError) {
        throw createError({
          statusCode: 500,
          message: `Failed to flag recommendation ${recId}: ${insertError.message}`
        })
      }
    }
    
    return {
      success: true,
      flagged_count: newRecIds.length,
      already_flagged: alreadyFlagged.length > 0 ? alreadyFlagged : undefined,
      message: alreadyFlagged.length > 0 
        ? `${newRecIds.length} recommendation(s) flagged. ${alreadyFlagged.length} were already flagged.`
        : `${newRecIds.length} recommendation(s) flagged successfully.`
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Flagging failed: ${error.message}`
    })
  }
})

