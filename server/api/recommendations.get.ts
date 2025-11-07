import { createClient } from '@supabase/supabase-js'
import { validateTone } from '~/utils/toneValidation'

/**
 * Recommendations API Endpoint
 * 
 * Generates personalized financial education recommendations based on:
 * - User's assigned persona (determines content type)
 * - Detected behavioral signals (used for rationale generation)
 * - User's account types (for eligibility filtering)
 * 
 * Guardrails applied:
 * - Consent enforcement (must have granted consent)
 * - Eligibility checks (skip offers user already has)
 * - Tone validation (sanitize shaming language)
 * - Disclaimer enforcement (add to all recommendations)
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'user_id is required'
      })
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Guardrail 1: Consent enforcement - block processing without opt-in
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
    
    // Get persona - required for content targeting
    const { data: persona } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!persona) {
      throw createError({
        statusCode: 404,
        message: 'Persona not assigned. Please assign persona first.'
      })
    }
    
    // Get signals for rationale generation (data citations)
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .eq('user_id', userId)
    
    // Get accounts for eligibility checks (e.g., skip HYSA if user has savings)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
    
    // Get content catalog filtered by persona type
    // Content can be persona-specific or general (persona_target = null)
    const { data: content } = await supabase
      .from('content')
      .select('*')
      .or(`persona_target.eq.${persona.persona_type},persona_target.is.null`)
      .limit(10)
    
    // Generate recommendations: 3-5 education items + 1-3 offers
    const recommendations = generateRecommendations(
      persona,
      signals || [],
      accounts || [],
      content || []
    )
    
    // Apply guardrails: eligibility + tone validation + disclaimer
    const filteredRecommendations = applyGuardrails(recommendations, accounts || [])
    
    // Store recommendations
    for (const rec of filteredRecommendations) {
      await supabase
        .from('recommendations')
        .insert({
          user_id: userId,
          content_id: rec.content_id || null,
          offer_data: rec.offer_data || null,
          rationale: rec.rationale
        })
    }
    
    // Calculate latency
    const latency = Date.now() - startTime
    
    // Log latency for evaluation metrics
    await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action_type: 'recommendation_generation',
        decision_trace: {
          latency_ms: latency,
          recommendation_count: filteredRecommendations.length
        }
      })
    
    return {
      education_items: filteredRecommendations.filter(r => r.type === 'education').slice(0, 5),
      offers: filteredRecommendations.filter(r => r.type === 'offer').slice(0, 3),
      latency_ms: latency
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Recommendation generation failed: ${error.message}`
    })
  }
})

function generateRecommendations(
  persona: any,
  signals: any[],
  accounts: any[],
  content: any[]
): Array<{ type: string; content_id?: string; offer_data?: any; rationale: string }> {
  const recommendations: Array<{ type: string; content_id?: string; offer_data?: any; rationale: string }> = []
  
  // Generate education items from content
  const educationContent = content.filter(c => c.type === 'education')
  for (const item of educationContent.slice(0, 5)) {
    const rationale = generateRationale(persona, signals, item)
    recommendations.push({
      type: 'education',
      content_id: item.id,
      rationale: `${rationale} ${item.content_text.substring(0, 200)}...`
    })
  }
  
  // Generate offers based on persona
  const offers = generateOffers(persona, signals, accounts)
  recommendations.push(...offers)
  
  return recommendations
}

function generateRationale(persona: any, signals: any[], content: any): string {
  const signalData = signals.find(s => s.signal_type === persona.persona_type.replace('_', '_')) || signals[0]
  
  let dataCite = ''
  if (signalData) {
    switch (persona.persona_type) {
      case 'high_utilization':
        dataCite = `Your credit utilization is ${signalData.signal_data?.utilization_percentage?.toFixed(1)}%`
        break
      case 'subscription_heavy':
        dataCite = `You have ${signalData.signal_data?.count} recurring subscriptions totaling $${signalData.signal_data?.total_monthly_spend?.toFixed(2)}/month`
        break
      case 'variable_income_budgeter':
        dataCite = `Your income varies by ${signalData.signal_data?.variability_percentage?.toFixed(1)}%`
        break
      default:
        dataCite = 'Based on your financial profile'
    }
  }
  
  return `We noticed ${dataCite}. `
}

function generateOffers(persona: any, signals: any[], accounts: any[]): Array<{ type: string; offer_data: any; rationale: string }> {
  const offers: Array<{ type: string; offer_data: any; rationale: string }> = []
  
  switch (persona.persona_type) {
    case 'high_utilization':
      {
        const highUtilSignal = signals.find(s => s.signal_type === 'credit_high_utilization')
        if (highUtilSignal) {
          const utilization = highUtilSignal.signal_data.utilization_percentage
          const currentBalance = highUtilSignal.signal_data.current_balance
          const estimatedInterest = currentBalance * 0.20 / 12 // Rough estimate
          
          offers.push({
            type: 'offer',
            offer_data: {
              type: 'balance_transfer',
              provider: 'Chase Slate',
              description: 'Balance transfer credit card with 0% APR for 18 months'
            },
            rationale: `Your Visa at ${utilization.toFixed(1)}% utilization ($${(currentBalance / 1000).toFixed(1)}k) could save $${estimatedInterest.toFixed(0)}/month in interest with a balance transfer.`
          })
        }
      }
      break
      
    case 'subscription_heavy':
      {
        const subSignal = signals.find(s => s.signal_type === 'subscriptions')
        if (subSignal) {
          offers.push({
            type: 'offer',
            offer_data: {
              type: 'subscription_manager',
              provider: 'Rocket Money',
              description: 'Track and cancel unused subscriptions'
            },
            rationale: `You have ${subSignal.signal_data.count} recurring subscriptions. Try Rocket Money to audit and manage them (eligible: you have ${subSignal.signal_data.count} recurring).`
          })
        }
      }
      break
      
    case 'savings_builder':
      {
        const hasSavingsAccount = accounts.some(acc => acc.subtype === 'savings')
        if (!hasSavingsAccount) {
          offers.push({
            type: 'offer',
            offer_data: {
              type: 'high_yield_savings',
              provider: 'Ally Bank',
              description: 'High-yield savings account with 4.25% APY'
            },
            rationale: 'Based on your positive savings growth, a high-yield savings account could help maximize your returns.'
          })
        }
      }
      break
  }
  
  return offers
}

function applyGuardrails(
  recommendations: Array<{ type: string; content_id?: string; offer_data?: any; rationale: string }>,
  accounts: any[]
): Array<{ type: string; content_id?: string; offer_data?: any; rationale: string }> {
  // Eligibility check: Skip HYSA if user already has savings account
  const hasSavingsAccount = accounts.some(acc => acc.subtype === 'savings')
  
  let filtered = recommendations.filter(rec => {
    if (rec.type === 'offer' && rec.offer_data?.type === 'high_yield_savings' && hasSavingsAccount) {
      return false // Skip HYSA offer if user has savings account
    }
    return true
  })
  
  // Tone guardrail: Validate and sanitize all rationales
  filtered = filtered.map(rec => {
    let rationale = rec.rationale
    
    // Use comprehensive tone validation
    const toneResult = validateTone(rationale)
    
    if (!toneResult.isValid) {
      // Use sanitized version if tone issues were found
      rationale = toneResult.sanitizedText
      
      // Log tone issues for operator review (in production, this would go to logs table)
      console.warn('Tone guardrail triggered:', {
        original: rec.rationale,
        issues: toneResult.issues,
        sanitized: toneResult.sanitizedText
      })
    }
    
    // Add disclaimer to all recommendations (if not already present)
    if (!rationale.includes('This is educational content')) {
      rationale += ' This is educational content, not financial advice. Consult a licensed advisor.'
    }
    
    return {
      ...rec,
      rationale
    }
  })
  
  return filtered
}

