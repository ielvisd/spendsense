import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL || 'https://uiheuojorgugxboadzas.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaGV1b2pvcmd1Z3hib2FkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzc4MjQsImV4cCI6MjA3ODA1MzgyNH0.s4NOKH-9t2CfgNhhzNITwHqNNx4nf-FYVDEItYy4YcI'

interface Metrics {
  coverage: {
    users_with_persona: number
    users_with_3plus_behaviors: number
    total_users: number
    percentage: number
  }
  explainability: {
    recommendations_with_rationales: number
    total_recommendations: number
    percentage: number
  }
  auditability: {
    recommendations_with_traces: number
    total_recommendations: number
    percentage: number
  }
  fairness: {
    persona_distribution: Record<string, number>
    demographic_breakdown: {
      by_age: Record<string, Record<string, number>>
      by_gender: Record<string, Record<string, number>>
      by_income: Record<string, Record<string, number>>
      by_ethnicity: Record<string, Record<string, number>>
    }
  }
}

async function runEvaluation(): Promise<Metrics> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get all users
  const { data: users } = await supabase.from('users').select('*')
  const totalUsers = users?.length || 0
  
  // Get all personas
  const { data: personas } = await supabase.from('personas').select('*')
  const usersWithPersona = personas?.length || 0
  
  // Get all signals and count users with 3+ behaviors
  const { data: signals } = await supabase.from('signals').select('user_id, signal_type')
  const signalCounts = new Map<string, number>()
  signals?.forEach(s => {
    const count = signalCounts.get(s.user_id) || 0
    signalCounts.set(s.user_id, count + 1)
  })
  const usersWith3PlusBehaviors = Array.from(signalCounts.values()).filter(c => c >= 3).length
  
  // Get all recommendations
  const { data: recommendations } = await supabase.from('recommendations').select('*')
  const totalRecommendations = recommendations?.length || 0
  const recommendationsWithRationales = recommendations?.filter(r => r.rationale && r.rationale.length > 0).length || 0
  
  // Get all logs for auditability
  const { data: logs } = await supabase
    .from('logs')
    .select('user_id, action_type')
    .eq('action_type', 'persona_assignment')
  
  const usersWithTraces = new Set(logs?.map(l => l.user_id) || [])
  const recommendationsWithTraces = recommendations?.filter(r =>
    usersWithTraces.has(r.user_id)
  ).length || 0
  
  // Calculate persona distribution
  const personaDistribution: Record<string, number> = {}
  personas?.forEach(p => {
    personaDistribution[p.persona_type] = (personaDistribution[p.persona_type] || 0) + 1
  })
  
  // Calculate fairness metrics by demographics
  const demographicBreakdown = {
    by_age: {} as Record<string, Record<string, number>>,
    by_gender: {} as Record<string, Record<string, number>>,
    by_income: {} as Record<string, Record<string, number>>,
    by_ethnicity: {} as Record<string, Record<string, number>>
  }
  
  // Get users with demographics and personas
  const usersWithDemographics = users?.filter(u => u.demographics) || []
  
  for (const user of usersWithDemographics) {
    const persona = personas?.find(p => p.user_id === user.id)
    if (!persona) continue
    
    const demo = user.demographics as any
    
    // Age brackets
    const ageBracket = demo.age < 35 ? '18-34' : demo.age < 55 ? '35-54' : '55+'
    if (!demographicBreakdown.by_age[ageBracket]) {
      demographicBreakdown.by_age[ageBracket] = {}
    }
    demographicBreakdown.by_age[ageBracket][persona.persona_type] =
      (demographicBreakdown.by_age[ageBracket][persona.persona_type] || 0) + 1
    
    // Gender
    if (!demographicBreakdown.by_gender[demo.gender]) {
      demographicBreakdown.by_gender[demo.gender] = {}
    }
    demographicBreakdown.by_gender[demo.gender][persona.persona_type] =
      (demographicBreakdown.by_gender[demo.gender][persona.persona_type] || 0) + 1
    
    // Income brackets
    const incomeBracket = demo.annual_income < 30000 ? 'low' :
      demo.annual_income < 80000 ? 'middle' : 'high'
    if (!demographicBreakdown.by_income[incomeBracket]) {
      demographicBreakdown.by_income[incomeBracket] = {}
    }
    demographicBreakdown.by_income[incomeBracket][persona.persona_type] =
      (demographicBreakdown.by_income[incomeBracket][persona.persona_type] || 0) + 1
    
    // Ethnicity
    if (!demographicBreakdown.by_ethnicity[demo.ethnicity]) {
      demographicBreakdown.by_ethnicity[demo.ethnicity] = {}
    }
    demographicBreakdown.by_ethnicity[demo.ethnicity][persona.persona_type] =
      (demographicBreakdown.by_ethnicity[demo.ethnicity][persona.persona_type] || 0) + 1
  }
  
  const metrics: Metrics = {
    coverage: {
      users_with_persona: usersWithPersona,
      users_with_3plus_behaviors: usersWith3PlusBehaviors,
      total_users: totalUsers,
      percentage: totalUsers > 0 ? (usersWithPersona / totalUsers) * 100 : 0
    },
    explainability: {
      recommendations_with_rationales: recommendationsWithRationales,
      total_recommendations: totalRecommendations,
      percentage: totalRecommendations > 0 ? (recommendationsWithRationales / totalRecommendations) * 100 : 0
    },
    auditability: {
      recommendations_with_traces: recommendationsWithTraces,
      total_recommendations: totalRecommendations,
      percentage: totalRecommendations > 0 ? (recommendationsWithTraces / totalRecommendations) * 100 : 0
    },
    fairness: {
      persona_distribution: personaDistribution,
      demographic_breakdown: demographicBreakdown
    }
  }
  
  return metrics
}

async function generateReport(metrics: Metrics): Promise<string> {
  let report = '# SpendSense Evaluation Report\n\n'
  report += `Generated: ${new Date().toISOString()}\n\n`
  
  report += '## Coverage Metrics\n\n'
  report += `- Users with persona: ${metrics.coverage.users_with_persona} / ${metrics.coverage.total_users} (${metrics.coverage.percentage.toFixed(1)}%)\n`
  report += `- Users with 3+ behaviors: ${metrics.coverage.users_with_3plus_behaviors} / ${metrics.coverage.total_users}\n`
  report += `- **Target: 100%** - ${metrics.coverage.percentage >= 100 ? '✅ PASS' : '❌ FAIL'}\n\n`
  
  report += '## Explainability Metrics\n\n'
  report += `- Recommendations with rationales: ${metrics.explainability.recommendations_with_rationales} / ${metrics.explainability.total_recommendations} (${metrics.explainability.percentage.toFixed(1)}%)\n`
  report += `- **Target: 100%** - ${metrics.explainability.percentage >= 100 ? '✅ PASS' : '❌ FAIL'}\n\n`
  
  report += '## Auditability Metrics\n\n'
  report += `- Recommendations with decision traces: ${metrics.auditability.recommendations_with_traces} / ${metrics.auditability.total_recommendations} (${metrics.auditability.percentage.toFixed(1)}%)\n`
  report += `- **Target: 100%** - ${metrics.auditability.percentage >= 100 ? '✅ PASS' : '❌ FAIL'}\n\n`
  
  report += '## Fairness Analysis\n\n'
  report += '### Persona Distribution\n\n'
  for (const [persona, count] of Object.entries(metrics.fairness.persona_distribution)) {
    report += `- ${persona}: ${count} users\n`
  }
  
  report += '\n### Demographic Breakdown\n\n'
  report += '#### By Age\n\n'
  for (const [age, personas] of Object.entries(metrics.fairness.demographic_breakdown.by_age)) {
    report += `**${age}:**\n`
    for (const [persona, count] of Object.entries(personas)) {
      report += `- ${persona}: ${count}\n`
    }
    report += '\n'
  }
  
  report += '#### By Gender\n\n'
  for (const [gender, personas] of Object.entries(metrics.fairness.demographic_breakdown.by_gender)) {
    report += `**${gender}:**\n`
    for (const [persona, count] of Object.entries(personas)) {
      report += `- ${persona}: ${count}\n`
    }
    report += '\n'
  }
  
  report += '#### By Income\n\n'
  for (const [income, personas] of Object.entries(metrics.fairness.demographic_breakdown.by_income)) {
    report += `**${income}:**\n`
    for (const [persona, count] of Object.entries(personas)) {
      report += `- ${persona}: ${count}\n`
    }
    report += '\n'
  }
  
  return report
}

async function main() {
  console.log('Running evaluation harness...')
  
  const metrics = await runEvaluation()
  
  // Export JSON
  const jsonPath = join(process.cwd(), 'eval-metrics.json')
  writeFileSync(jsonPath, JSON.stringify(metrics, null, 2))
  console.log(`Metrics exported to: ${jsonPath}`)
  
  // Export CSV
  const csvLines = [
    'Metric,Value,Percentage,Target,Status'
  ]
  csvLines.push(`Coverage,${metrics.coverage.users_with_persona}/${metrics.coverage.total_users},${metrics.coverage.percentage.toFixed(1)}%,100%,${metrics.coverage.percentage >= 100 ? 'PASS' : 'FAIL'}`)
  csvLines.push(`Explainability,${metrics.explainability.recommendations_with_rationales}/${metrics.explainability.total_recommendations},${metrics.explainability.percentage.toFixed(1)}%,100%,${metrics.explainability.percentage >= 100 ? 'PASS' : 'FAIL'}`)
  csvLines.push(`Auditability,${metrics.auditability.recommendations_with_traces}/${metrics.auditability.total_recommendations},${metrics.auditability.percentage.toFixed(1)}%,100%,${metrics.auditability.percentage >= 100 ? 'PASS' : 'FAIL'}`)
  
  const csvPath = join(process.cwd(), 'eval-metrics.csv')
  writeFileSync(csvPath, csvLines.join('\n'))
  console.log(`CSV exported to: ${csvPath}`)
  
  // Generate Markdown report
  const report = await generateReport(metrics)
  const reportPath = join(process.cwd(), 'eval-report.md')
  writeFileSync(reportPath, report)
  console.log(`Report exported to: ${reportPath}`)
  
  console.log('\nEvaluation complete!')
}

// Run if executed directly (Node.js ESM check)
if (typeof process !== 'undefined' && process.argv && import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(console.error)
}

export { runEvaluation, generateReport }

