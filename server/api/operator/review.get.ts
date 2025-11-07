import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all users with their data
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(100)
    
    if (!users) {
      return { users: [] }
    }
    
    // For each user, get signals, persona, and recommendations
    const usersWithData = await Promise.all(
      users.map(async (user) => {
        const [signals, persona, recommendations] = await Promise.all([
          supabase.from('signals').select('*').eq('user_id', user.id),
          supabase.from('personas').select('*').eq('user_id', user.id).single(),
          supabase.from('recommendations').select('*').eq('user_id', user.id)
        ])
        
        return {
          user,
          signals: signals.data || [],
          persona: persona.data,
          recommendations: recommendations.data || []
        }
      })
    )
    
    return { users: usersWithData }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Operator review failed: ${error.message}`
    })
  }
})

