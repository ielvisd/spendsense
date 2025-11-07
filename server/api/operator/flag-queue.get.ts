import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all flagged recommendations from logs
    const { data: flagLogs, error } = await supabase
      .from('logs')
      .select('*')
      .eq('action_type', 'recommendation_flagged')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Get the actual recommendations for flagged items
    const flaggedRecIds = flagLogs
      ?.map(log => (log.decision_trace as any)?.recommendation_id)
      .filter(Boolean) || []
    
    if (flaggedRecIds.length === 0) {
      return { flagged_recommendations: [] }
    }
    
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*, users!recommendations_user_id_fkey(fake_name)')
      .in('id', flaggedRecIds)
    
    // Combine flag logs with recommendations
    const flaggedItems = (recommendations || []).map(rec => {
      const flagLog = flagLogs?.find(log => 
        (log.decision_trace as any)?.recommendation_id === rec.id
      )
      return {
        ...rec,
        flagged_at: flagLog?.created_at,
        flag_reason: (flagLog?.decision_trace as any)?.reason || 'No reason provided',
        flagged_by: flagLog?.user_id
      }
    })
    
    return {
      flagged_recommendations: flaggedItems,
      total_count: flaggedItems.length
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Failed to fetch flag queue: ${error.message}`
    })
  }
})

