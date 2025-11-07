import { createClient } from '@supabase/supabase-js'
import { runEvaluation } from '~/utils/evalHarness'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    // Use service role key for server-side operations (bypasses RLS)
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    const supabaseKey = serviceRoleKey || supabaseAnonKey
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Run evaluation to get fairness metrics
    const metrics = await runEvaluation()
    
    return {
      fairness: metrics.fairness,
      latency: metrics.latency,
      relevance: metrics.relevance
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch fairness metrics: ${error.message}`
    })
  }
})

