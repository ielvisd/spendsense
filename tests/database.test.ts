import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Database Connection', () => {
  it('should connect to Supabase', async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test connection by querying users table
    const { error } = await supabase.from('users').select('count').limit(1)
    
    expect(error).toBeNull()
  })
})

