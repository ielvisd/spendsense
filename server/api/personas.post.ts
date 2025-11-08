import { createClient } from '@supabase/supabase-js'
import { assignPersona } from '~/utils/personaAssignment'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const userId = body.user_id as string
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'user_id is required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    // Use service role key for server-side operations (bypasses RLS)
    const config = useRuntimeConfig()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey
    const supabaseKey = serviceRoleKey || supabaseAnonKey
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check consent first
    const { data: consent } = await supabase
      .from('consent')
      .select('consent_status')
      .eq('user_id', userId)
      .single()
    
    if (!consent || !consent.consent_status) {
      throw createError({
        statusCode: 403,
        message: 'User has not granted consent'
      })
    }
    
    // Get signals
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .eq('user_id', userId)
    
    // Get accounts and liabilities
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
    
    const { data: liabilities } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', userId)
    
    // Get transactions for impulse spender detection
    const accountIds = accounts?.map(acc => acc.id) || []
    let transactions = []
    if (accountIds.length > 0) {
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds)
        .limit(1000) // Get recent transactions
      transactions = transactionsData || []
    }
    
    // Assign persona based on priority rules (using extracted function)
    const persona = assignPersona(signals || [], accounts || [], liabilities || [], transactions)
    
    // Store persona assignment
    const { error: personaError } = await supabase
      .from('personas')
      .upsert({
        user_id: userId,
        persona_type: persona.type,
        rationale: persona.rationale
      }, {
        onConflict: 'user_id'
      })
    
    if (personaError) throw personaError
    
    // Log decision trace
    await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action_type: 'persona_assignment',
        decision_trace: {
          persona_type: persona.type,
          rationale: persona.rationale,
          signals_used: signals?.map(s => s.signal_type) || [],
          timestamp: new Date().toISOString()
        }
      })
    
    return { persona }
  } catch (error: any) {
    console.error('[PERSONAS] Error:', error)
    console.error('[PERSONAS] Error stack:', error.stack)
    console.error('[PERSONAS] Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Persona assignment failed: ${error.message || 'Unknown error'}`
    })
  }
})

