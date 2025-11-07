import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const userId = body.user_id as string
    const consentStatus = body.consent_status as boolean
    
    if (!userId || typeof consentStatus !== 'boolean') {
      throw createError({
        statusCode: 400,
        message: 'user_id and consent_status (boolean) are required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    if (consentStatus) {
      // Grant consent
      const { error } = await supabase
        .from('consent')
        .upsert({
          user_id: userId,
          consent_status: true,
          granted_at: new Date().toISOString(),
          revoked_at: null
        }, {
          onConflict: 'user_id'
        })
      
      if (error) throw error
      
      // Also update users table
      await supabase
        .from('users')
        .update({ consent_status: true })
        .eq('id', userId)
    } else {
      // Revoke consent - trigger data purge
      const { error } = await supabase
        .from('consent')
        .upsert({
          user_id: userId,
          consent_status: false,
          revoked_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) throw error
      
      // Update users table
      await supabase
        .from('users')
        .update({ consent_status: false })
        .eq('id', userId)
      
      // Note: In production, you would purge user data here
      // For now, we just update the consent status
    }
    
    return { success: true, consent_status: consentStatus }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Consent update failed: ${error.message}`
    })
  }
})

