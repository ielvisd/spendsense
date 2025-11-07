<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-[#1D3557]">Your Financial Dashboard</h1>
        <div class="flex gap-2 w-full sm:w-auto">
          <UButton to="/settings" variant="outline" color="primary" aria-label="Go to settings page" class="flex-1 sm:flex-none">
            Settings
          </UButton>
          <UButton 
            variant="outline" 
            color="red" 
            @click="handleLogout"
            :loading="loggingOut"
            :aria-busy="loggingOut"
            aria-label="Sign out of your account"
            class="flex-1 sm:flex-none"
          >
            Sign Out
          </UButton>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12" role="status" aria-live="polite" aria-busy="true">
        <p class="text-[#1D3557] font-medium">Loading your dashboard...</p>
      </div>
      
      <!-- Error State -->
      <UAlert v-if="error" color="error" variant="soft" class="mb-8" role="alert" aria-live="assertive">
        {{ error }}
      </UAlert>
      
      <!-- Main Content -->
      <div v-if="!loading && !error">
        <!-- 1. Financial Profile (Persona) -->
        <UCard v-if="persona" class="mb-8 !bg-white shadow-lg">
          <template #header>
            <div class="flex items-center justify-between border-b border-[#A8DADC] pb-3">
              <h2 class="text-xl font-bold text-[#1D3557]">Your Financial Profile</h2>
              <UBadge :color="getPersonaBadgeColor(persona.persona_type)" size="lg" variant="subtle">
                {{ personaTypeLabel }}
              </UBadge>
            </div>
          </template>
          <div class="space-y-4 pt-4">
            <div>
              <p class="text-base text-[#1D3557] mb-3 leading-relaxed">
                We analyzed your financial patterns and identified you as a <strong class="text-[#1D3557] font-bold">{{ personaTypeLabel }}</strong>.
              </p>
              <p class="text-sm text-[#1D3557] mb-4 leading-relaxed font-medium">{{ persona.rationale }}</p>
            </div>
            
            <!-- Why Assigned Section -->
            <div v-if="signals.length > 0" class="bg-[#A8DADC]/30 rounded-lg p-4 border-2 border-[#A8DADC]">
              <h3 class="text-sm font-bold text-[#1D3557] mb-3">Based on your financial data:</h3>
              <ul class="space-y-2 text-sm text-[#1D3557]">
                <li v-for="(signal, idx) in keySignals" :key="idx" class="flex items-start">
                  <span class="mr-2 text-[#457B9D] font-bold">•</span>
                  <span class="font-medium">{{ formatSignal(signal) }}</span>
                </li>
              </ul>
            </div>
            
            <!-- What This Means -->
            <div class="border-t-2 border-[#A8DADC] pt-4">
              <p class="text-sm text-[#1D3557] leading-relaxed">
                <strong class="font-bold text-[#1D3557]">Note:</strong> Your profile is automatically updated as your financial patterns change. This helps us provide personalized recommendations tailored to your situation.
              </p>
            </div>
            
            <!-- Learn More (Expandable) -->
            <div class="pt-2">
              <UAccordion 
                :items="[{ label: 'Learn more about financial profiles', content: personaExplanation }]"
                class="[&_button]:text-[#1D3557] [&_button]:font-semibold [&_button:hover]:text-[#457B9D]"
              />
            </div>
          </div>
        </UCard>
        
        <!-- 2. Account Summary -->
        <div v-if="accounts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <UCard class="bg-gradient-to-br from-[#457B9D] to-[#1D3557] text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-90 mb-1">Total Balance</p>
                <p class="text-2xl font-bold">${{ formatCurrency(totalBalance) }}</p>
              </div>
              <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-medium mb-1">Accounts</p>
                <p class="text-2xl font-bold text-[#1D3557]">{{ accounts.length }}</p>
                <p class="text-xs text-[#1D3557] font-medium mt-1">{{ accountTypesSummary }}</p>
              </div>
              <svg class="w-8 h-8 text-[#457B9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-medium mb-1">Recent Activity</p>
                <p class="text-2xl font-bold text-[#1D3557]">{{ transactions.length }}</p>
                <p class="text-xs text-[#1D3557] font-medium mt-1">Last 30 days</p>
              </div>
              <svg class="w-8 h-8 text-[#457B9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-medium mb-1">Key Insight</p>
                <p class="text-sm font-bold text-[#1D3557] line-clamp-2">{{ topInsight }}</p>
              </div>
              <svg class="w-8 h-8 text-[#457B9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </UCard>
        </div>
        
        <!-- 3. Recent Transactions -->
        <UCard class="mb-8 !bg-white shadow-lg">
          <template #header>
            <div class="flex items-center justify-between border-b border-[#A8DADC] pb-3">
              <h2 class="text-xl font-bold text-[#1D3557]">Recent Transactions</h2>
              <div class="flex gap-2">
                <UButton
                  v-for="filter in transactionFilters"
                  :key="filter.value"
                  :variant="selectedTransactionFilter === filter.value ? 'solid' : 'outline'"
                  size="xs"
                  @click="selectedTransactionFilter = filter.value"
                >
                  {{ filter.label }}
                </UButton>
              </div>
            </div>
          </template>
          <div v-if="filteredTransactions.length > 0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-[#A8DADC]">
                    <th class="text-left py-3 px-4 text-sm font-semibold text-[#1D3557]">Date</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-[#1D3557]">Merchant</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-[#1D3557]">Category</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-[#1D3557]">Account</th>
                    <th class="text-right py-3 px-4 text-sm font-semibold text-[#1D3557]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="txn in filteredTransactions"
                    :key="txn.id"
                    class="border-b border-[#A8DADC]/50 hover:bg-[#A8DADC]/10 transition-colors"
                  >
                    <td class="py-3 px-4 text-sm text-[#1D3557] font-medium">{{ formatDate(txn.date) }}</td>
                    <td class="py-3 px-4 text-sm font-semibold text-[#1D3557]">
                      {{ txn.merchant_name || 'Transfer' }}
                    </td>
                    <td class="py-3 px-4">
                      <UBadge
                        v-if="getCategoryName(txn.personal_finance_category)"
                        size="xs"
                        color="gray"
                        variant="subtle"
                      >
                        {{ getCategoryName(txn.personal_finance_category) }}
                      </UBadge>
                      <span v-else class="text-sm text-[#1D3557]/60">—</span>
                    </td>
                    <td class="py-3 px-4 text-sm text-[#1D3557] font-medium capitalize">
                      {{ txn.account_name || 'Unknown' }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span
                        :class="[
                          'text-sm font-semibold',
                          txn.amount < 0 ? 'text-red-600' : 'text-green-600'
                        ]"
                      >
                        {{ txn.amount < 0 ? '-' : '+' }}${{ formatCurrency(Math.abs(txn.amount)) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-[#1D3557] font-medium">No transactions yet. Upload your data to see your transaction history.</p>
          </div>
        </UCard>
        
        <!-- 4. Personalized Tips (Educational Resources) -->
        <div v-if="recommendations?.education_items?.length" class="mb-8">
          <div class="mb-4">
            <h2 class="text-2xl font-semibold text-[#1D3557] mb-2">
              Personalized Tips for {{ personaTypeLabel }}
            </h2>
            <p class="text-[#1D3557] font-medium">
              Based on your financial profile, here are tips to help you {{ getPersonaGoal(persona?.persona_type) }}.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UCard
              v-for="(item, index) in recommendations.education_items"
              :key="index"
              class="h-full !bg-white shadow-md"
            >
              <template #header>
                <h3 class="font-bold text-[#1D3557] text-lg">{{ item.title || 'Financial Tip' }}</h3>
              </template>
              <div class="space-y-3">
                <p class="text-[#1D3557] leading-relaxed">{{ item.rationale }}</p>
                <UAccordion
                  :items="[{
                    label: 'Why you\'re seeing this',
                    content: `This tip is personalized for ${personaTypeLabel} profiles. ${item.rationale}`
                  }]"
                  size="sm"
                  class="[&_button]:text-[#1D3557] [&_button]:font-semibold"
                />
                <p class="text-xs text-[#1D3557] font-medium pt-2 border-t-2 border-[#A8DADC]">
                  This is educational content, not financial advice. Consult a licensed advisor.
                </p>
              </div>
            </UCard>
          </div>
        </div>
        
        <!-- 5. Opportunities (Offers) -->
        <div v-if="recommendations?.offers?.length" class="mb-8">
          <div class="mb-4">
            <h2 class="text-2xl font-semibold text-[#1D3557] mb-2">
              Opportunities for {{ personaTypeLabel }}
            </h2>
            <p class="text-[#1D3557] font-medium">
              We identified these offers based on: {{ formatKeySignalsForOffers() }}
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UCard
              v-for="(offer, index) in recommendations.offers"
              :key="index"
              class="h-full !bg-white shadow-md"
            >
              <template #header>
                <h3 class="font-bold text-[#1D3557] text-lg">{{ offer.offer_data?.provider || 'Offer' }}</h3>
              </template>
              <div class="space-y-3">
                <p class="text-[#1D3557] leading-relaxed">{{ offer.offer_data?.description }}</p>
                <p class="text-sm text-[#1D3557] font-semibold">{{ offer.rationale }}</p>
                <UAccordion
                  :items="[{
                    label: 'Why you\'re seeing this',
                    content: `This offer matches your ${personaTypeLabel} profile. ${offer.rationale}`
                  }]"
                  size="sm"
                  class="[&_button]:text-[#1D3557] [&_button]:font-semibold"
                />
                <UButton 
                  variant="outline" 
                  size="sm" 
                  color="primary"
                  block
                  :aria-label="`Learn more about ${offer.offer_data?.provider || 'this offer'}`"
                >
                  Learn More
                </UButton>
              </div>
            </UCard>
          </div>
        </div>
        
        <!-- 6. Financial Tools (Calculators) -->
        <div class="mb-8">
          <div class="mb-4">
            <h2 class="text-2xl font-semibold text-[#1D3557] mb-2">Financial Tools</h2>
            <p class="text-[#1D3557] font-medium">Use these tools to plan and track your financial goals</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DebtPayoffCalculator />
            <SavingsGoalCalculator />
          </div>
        </div>
        
        <!-- 7. Feedback Section -->
        <UCard class="mt-8 !bg-white shadow-lg">
          <template #header>
            <div class="border-b border-[#A8DADC] pb-3">
              <h2 class="text-xl font-bold text-[#1D3557]">Help Us Improve</h2>
            </div>
          </template>
          <div class="space-y-4 pt-4">
            <p class="text-[#1D3557] font-medium">How helpful are these recommendations?</p>
            <div class="flex gap-2 flex-wrap">
              <UButton
                v-for="rating in [1, 2, 3, 4, 5]"
                :key="rating"
                variant="outline"
                size="sm"
                @click="submitFeedback('rating', { rating })"
                :aria-label="`Rate ${rating} out of 5 stars`"
              >
                {{ rating }} ⭐
              </UButton>
            </div>
            <div class="flex gap-2 mt-4">
              <UButton
                variant="outline"
                size="sm"
                @click="submitFeedback('helpful', { helpful: true })"
                aria-label="Mark recommendations as helpful"
              >
                Helpful
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                @click="submitFeedback('not_helpful', { helpful: false })"
                aria-label="Mark recommendations as not helpful"
              >
                Not Helpful
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'
import { usePersonas } from '~/composables/usePersonas'
import { useRecommendations } from '~/composables/useRecommendations'
import { useSignals } from '~/composables/useSignals'
import { useTransactions } from '~/composables/useTransactions'
import { useToast } from '#imports'
import { format, parseISO, subDays } from 'date-fns'
import DebtPayoffCalculator from '~/components/calculators/DebtPayoffCalculator.vue'
import SavingsGoalCalculator from '~/components/calculators/SavingsGoalCalculator.vue'

const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()
const { fetchRecommendations } = useRecommendations()
const { fetchSignals } = useSignals()
const { fetchTransactions } = useTransactions()

const persona = ref<any>(null)
const recommendations = ref<any>(null)
const signals = ref<any[]>([])
const transactions = ref<any[]>([])
const accounts = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const currentUserId = ref<string | null>(null)
const selectedTransactionFilter = ref('all')
const loggingOut = ref(false)

const transactionFilters = [
  { label: 'All', value: 'all' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' }
]

const personaTypeLabel = computed(() => {
  if (!persona.value) return ''
  const labels: Record<string, string> = {
    'high_utilization': 'High Utilization',
    'variable_income_budgeter': 'Variable Income Budgeter',
    'subscription_heavy': 'Subscription-Heavy',
    'savings_builder': 'Savings Builder',
    'impulse_spender': 'Impulse Spender'
  }
  return labels[persona.value.persona_type] || persona.value.persona_type
})

const keySignals = computed(() => {
  if (!signals.value || signals.value.length === 0) return []
  // Deduplicate signals by type and return top 3-4 most relevant
  const seen = new Set<string>()
  const unique = signals.value.filter(signal => {
    if (seen.has(signal.signal_type)) {
      return false
    }
    seen.add(signal.signal_type)
    return true
  })
  return unique.slice(0, 4)
})

const totalBalance = computed(() => {
  return accounts.value.reduce((sum, acc) => {
    const balances = acc.balances as any
    if (balances && typeof balances.current === 'number') {
      return sum + balances.current
    }
    return sum
  }, 0)
})

const accountTypesSummary = computed(() => {
  const types = accounts.value.map(acc => acc.type)
  const typeCounts: Record<string, number> = {}
  types.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })
  return Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')
})

const topInsight = computed(() => {
  if (signals.value && signals.value.length > 0) {
    const topSignal = signals.value[0]
    return formatSignal(topSignal)
  }
  return 'Analyzing your financial patterns...'
})

const filteredTransactions = computed(() => {
  if (selectedTransactionFilter.value === 'all') {
    return transactions.value
  }
  const days = parseInt(selectedTransactionFilter.value)
  const cutoffDate = subDays(new Date(), days)
  return transactions.value.filter(txn => {
    const txnDate = parseISO(txn.date)
    return txnDate >= cutoffDate
  })
})

const personaExplanation = 'Financial profiles help us understand your unique financial situation and provide personalized recommendations. Your profile is automatically assigned based on patterns we detect in your transaction data, such as credit utilization, income patterns, spending habits, and savings behavior. This profile updates automatically as your financial patterns change, ensuring you always receive relevant advice.'

const formatSignal = (signal: any): string => {
  if (!signal) return ''
  const data = signal.signal_data || {}
  
  switch (signal.signal_type) {
    case 'subscription':
      return `$${formatCurrency(data.monthly_spend || 0)}/month in recurring subscriptions`
    case 'credit_utilization':
      return `${data.utilization_percentage || 0}% credit card utilization`
    case 'savings':
      return `$${formatCurrency(data.emergency_coverage || 0)} in emergency savings`
    case 'income_variability':
      return 'Variable income patterns detected'
    default:
      return signal.signal_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

const formatKeySignalsForOffers = (): string => {
  if (keySignals.value.length === 0) return 'your financial profile'
  return keySignals.value.map(s => formatSignal(s)).join(', ')
}

const getPersonaBadgeColor = (personaType: string): string => {
  const colors: Record<string, string> = {
    'high_utilization': 'red',
    'variable_income_budgeter': 'orange',
    'subscription_heavy': 'yellow',
    'savings_builder': 'green',
    'impulse_spender': 'purple'
  }
  return colors[personaType] || 'gray'
}

const getPersonaGoal = (personaType?: string): string => {
  const goals: Record<string, string> = {
    'high_utilization': 'reduce debt and improve credit health',
    'variable_income_budgeter': 'manage variable income and build stability',
    'subscription_heavy': 'optimize recurring expenses',
    'savings_builder': 'continue building your savings',
    'impulse_spender': 'develop mindful spending habits'
  }
  return goals[personaType || ''] || 'improve your financial wellness'
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

const getCategoryName = (category: any): string | null => {
  if (!category) return null
  if (typeof category === 'object') {
    return category.primary || category.detailed || null
  }
  return String(category)
}

const submitFeedback = async (actionType: string, feedbackData: any) => {
  if (!currentUserId.value) return
  
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        user_id: currentUserId.value,
        action_type: actionType,
        feedback_data: feedbackData
      }
    })
    
    toast.add({
      title: 'Thank you!',
      description: 'Your feedback helps us improve.',
      color: 'green'
    })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: 'Failed to submit feedback',
      color: 'red'
    })
  }
}

const handleLogout = async () => {
  loggingOut.value = true
  try {
    // Get the current session to extract the access token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      // Call the logout API endpoint
      try {
        await $fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      } catch (apiError) {
        // Log but don't fail if API call fails - we'll still sign out client-side
        console.warn('Logout API call failed:', apiError)
      }
    }
    
    // Sign out from Supabase client-side
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      throw signOutError
    }
    
    toast.add({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
      color: 'green'
    })
    
    // Redirect to onboarding page
    setTimeout(() => {
      router.push('/onboarding')
    }, 1000)
  } catch (error: any) {
    console.error('Logout error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to sign out',
      color: 'red'
    })
  } finally {
    loggingOut.value = false
  }
}

onMounted(async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Please log in to view your dashboard'
      loading.value = false
      return
    }
    
    currentUserId.value = user.id
    
    // Get persona
    const { data: personaData } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    persona.value = personaData
    
    // Get signals for persona explanation
    try {
      const signalsData = await fetchSignals(user.id)
      signals.value = signalsData || []
    } catch (err) {
      console.warn('Could not fetch signals:', err)
    }
    
    // Get accounts
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
    
    accounts.value = accountsData || []
    
    // Get transactions
    try {
      const transactionsData = await fetchTransactions(user.id, { limit: 30, days: 90 })
      transactions.value = transactionsData.transactions || []
    } catch (err) {
      console.warn('Could not fetch transactions:', err)
    }
    
    // Get recommendations
    const recs = await fetchRecommendations(user.id)
    recommendations.value = recs
    
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
})
</script>
