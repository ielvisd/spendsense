<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-[#1D3557]">Your Financial Dashboard</h1>
        <div class="flex gap-2 w-full sm:w-auto">
          <UButton to="/settings" variant="solid" color="primary" aria-label="Go to settings page" class="flex-1 sm:flex-none">
            Settings
          </UButton>
          <UButton 
            variant="solid" 
            color="error" 
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
            <div class="border-b border-[#A8DADC] pb-4">
              <h2 class="text-2xl font-bold text-[#1D3557] mb-3">Your Financial Profile</h2>
              <div class="flex items-center gap-3">
                <UBadge 
                  :color="getPersonaBadgeColor(persona.persona_type) as any" 
                  size="xl" 
                  variant="solid" 
                  class="text-base px-4 py-2 !text-white font-bold"
                  :style="getPersonaBadgeStyle(persona.persona_type)"
                >
                  {{ personaTypeLabel }}
                </UBadge>
                <span class="text-sm text-[#457B9D] font-medium">{{ getPersonaIcon(persona.persona_type) }}</span>
              </div>
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
                :items="[{ label: 'Learn more about financial profiles', content: personaExplanation, value: 'persona-explanation' }]"
                class="[&_button]:text-[#1D3557] [&_button]:font-semibold [&_button:hover]:text-[#457B9D]"
                :unmount-on-hide="false"
              />
            </div>
          </div>
        </UCard>
        
        <!-- 2. Account Summary -->
        <div v-if="accounts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <UCard class="bg-gradient-to-br from-[#457B9D] to-[#1D3557] text-white">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <p class="text-sm opacity-90">Total Balance</p>
                  <UBadge :color="balanceHealth.color as any" size="sm" variant="solid" class="text-xs">
                    {{ balanceHealth.status }}
                  </UBadge>
                </div>
                <p class="text-2xl font-bold mb-1">${{ formatCurrency(totalBalance) }}</p>
                <p class="text-xs opacity-80">{{ balanceHealth.message }}</p>
              </div>
              <div class="flex flex-col items-center">
                <svg class="w-8 h-8 opacity-80 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-2xl">{{ balanceHealth.icon }}</span>
              </div>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md hover:shadow-lg transition-shadow duration-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-semibold mb-1">Accounts</p>
                <p class="text-2xl font-bold text-[#1D3557]">{{ accounts.length }}</p>
                <p class="text-xs text-[#457B9D] font-medium mt-1">{{ accountTypesSummary }}</p>
              </div>
              <svg class="w-8 h-8 text-[#457B9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md hover:shadow-lg transition-shadow duration-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-semibold mb-1">Recent Activity</p>
                <p class="text-2xl font-bold text-[#1D3557]">{{ transactions.length }}</p>
                <p class="text-xs text-[#457B9D] font-medium mt-1">Last 30 days</p>
              </div>
              <svg class="w-8 h-8 text-[#457B9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
          </UCard>
          
          <UCard class="!bg-white shadow-md hover:shadow-lg transition-shadow duration-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[#1D3557] font-semibold mb-1">Key Insight</p>
                <p class="text-sm font-bold text-[#1D3557]">{{ topInsight }}</p>
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
                  :class="selectedTransactionFilter === filter.value ? '' : '!text-[#1D3557] !border-[#1D3557] hover:!bg-[#1D3557] hover:!text-white'"
                >
                  {{ filter.label }}
                </UButton>
              </div>
            </div>
          </template>
          <div v-if="tableData.length > 0">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm text-[#1D3557] font-medium">Show:</span>
                <USelect
                  v-model="pageSize"
                  :items="[
                    { label: '10', value: 10 },
                    { label: '25', value: 25 },
                    { label: '50', value: 50 }
                  ]"
                  value-key="value"
                  class="w-20"
                />
                <span class="text-sm text-[#457B9D]">per page</span>
              </div>
              <span class="text-sm text-[#457B9D]">
                <template v-if="table?.tableApi">
                  Showing {{ ((table.tableApi?.getState()?.pagination?.pageIndex || 0) * (table.tableApi?.getState()?.pagination?.pageSize || 25)) + 1 }} - 
                  {{ Math.min(((table.tableApi?.getState()?.pagination?.pageIndex || 0) + 1) * (table.tableApi?.getState()?.pagination?.pageSize || 25), table.tableApi?.getFilteredRowModel()?.rows.length || 0) }} 
                  of {{ table.tableApi?.getFilteredRowModel()?.rows.length || 0 }} transactions
                </template>
                <template v-else>
                  Showing {{ tableData.length }} transactions
                </template>
              </span>
            </div>
            <div class="overflow-x-auto">
              <UTable
                ref="table"
                v-model:sorting="sorting"
                v-model:pagination="pagination"
                :data="tableData"
                :columns="transactionColumns as any"
                :pagination-options="{
                  getPaginationRowModel: getPaginationRowModel()
                }"
                class="w-full"
              >
                <template #date-cell="{ row }">
                  <span class="text-sm text-[#1D3557] font-medium">{{ formatDate(row.original.date) }}</span>
                </template>
                <template #merchant-cell="{ row }">
                  <span class="text-sm font-semibold text-[#1D3557]">{{ row.original.merchant }}</span>
                </template>
                <template #category-cell="{ row }">
                  <span
                    v-if="row.original.category && row.original.category !== '—'"
                    data-category-badge
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                    :style="getCategoryBadgeStyle({ primary: row.original.category })"
                  >
                    {{ row.original.category }}
                  </span>
                  <span v-else class="text-sm text-[#1D3557] font-medium">—</span>
                </template>
                <template #account-cell="{ row }">
                  <span class="text-sm text-[#1D3557] font-medium capitalize">{{ row.original.account }}</span>
                </template>
                <template #amount-cell="{ row }">
                  <div class="flex items-center justify-end gap-1">
                    <span v-if="isIncomeTransaction(row.original)" class="text-green-600">↑</span>
                    <span v-else class="text-red-600">↓</span>
                    <span
                      :class="[
                        'text-sm font-semibold',
                        isIncomeTransaction(row.original) ? 'text-green-600' : 'text-red-600'
                      ]"
                    >
                      {{ isIncomeTransaction(row.original) ? '+' : '-' }}${{ formatCurrency(row.original.amount) }}
                    </span>
                  </div>
                </template>
              </UTable>
              <!-- Pagination Controls -->
              <div class="mt-4 flex justify-center border-t border-[#A8DADC] pt-4">
                <UPagination
                  :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
                  :items-per-page="table?.tableApi?.getState().pagination.pageSize"
                  :total="table?.tableApi?.getFilteredRowModel().rows.length"
                  @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-[#1D3557] font-medium">No transactions yet. Upload your data to see your transaction history.</p>
            <p class="text-sm text-[#457B9D] mt-2">Debug: transactions.length = {{ transactions.length }}, filteredTransactions.length = {{ filteredTransactions.length }}</p>
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
              class="h-full !bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <template #header>
                <h3 class="font-bold text-[#1D3557] text-lg">{{ item.title || 'Financial Tip' }}</h3>
              </template>
              <div class="space-y-3 flex flex-col h-full">
                <p class="text-[#1D3557] leading-relaxed flex-grow">{{ item.rationale }}</p>
                <UAccordion
                  :items="[{
                    label: 'Why you\'re seeing this',
                    content: `This tip is personalized for ${personaTypeLabel} profiles. ${item.rationale}`,
                    value: `edu-why-${index}`
                  }]"
                  size="sm"
                  class="[&_button]:text-[#1D3557] [&_button]:font-semibold [&_.text-gray-400]:!text-[#1D3557] [&_.text-gray-500]:!text-[#1D3557] [&_.text-gray-600]:!text-[#1D3557] [&_div]:!text-[#1D3557] [&_p]:!text-[#1D3557] [&_span]:!text-[#1D3557]"
                  :unmount-on-hide="false"
                />
                <div v-if="item.disclaimer" class="pt-3 border-t-2 border-[#A8DADC]">
                  <p class="text-xs text-[#457B9D] italic">
                    {{ item.disclaimer }}
                  </p>
                </div>
                <div class="pt-3 border-t-2 border-[#A8DADC] flex gap-2">
                  <UButton
                    size="xs"
                    variant="outline"
                    color="primary"
                    @click="submitRecommendationFeedback(item.content_id || `edu-${index}`, 'education', 'helpful', item)"
                    :disabled="!!feedbackSubmitted[`edu-${index}`]"
                    class="flex-1 !text-[#1D3557] !border-[#1D3557] hover:!bg-[#1D3557] hover:!text-white"
                  >
                    {{ feedbackSubmitted[`edu-${index}`] === 'helpful' ? '✓ Helpful' : 'Helpful' }}
                  </UButton>
                  <UButton
                    size="xs"
                    variant="outline"
                    color="primary"
                    @click="submitRecommendationFeedback(item.content_id || `edu-${index}`, 'education', 'not_helpful', item)"
                    :disabled="!!feedbackSubmitted[`edu-${index}`]"
                    class="flex-1 !text-[#1D3557] !border-[#1D3557] !bg-white hover:!bg-[#1D3557] hover:!text-white"
                  >
                    {{ feedbackSubmitted[`edu-${index}`] === 'not_helpful' ? '✓ Not Helpful' : 'Not Helpful' }}
                  </UButton>
                </div>
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
              class="h-full !bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <template #header>
                <h3 class="font-bold text-[#1D3557] text-lg">{{ offer.offer_data?.provider || 'Offer' }}</h3>
              </template>
              <div class="space-y-3 flex flex-col h-full">
                <p class="text-[#1D3557] leading-relaxed flex-grow">{{ offer.offer_data?.description }}</p>
                <p class="text-sm text-[#1D3557] font-semibold">{{ offer.rationale }}</p>
                <UAccordion
                  :items="[{
                    label: 'Why you\'re seeing this',
                    content: `This offer matches your ${personaTypeLabel} profile. ${offer.rationale}`,
                    value: `offer-why-${index}`
                  }]"
                  size="sm"
                  class="[&_button]:text-[#1D3557] [&_button]:font-semibold"
                  :unmount-on-hide="false"
                />
                <div class="pt-3 border-t-2 border-[#A8DADC] space-y-2">
                  <UButton 
                    variant="outline" 
                    size="sm" 
                    color="primary"
                    block
                    :aria-label="`Learn more about ${offer.offer_data?.provider || 'this offer'}`"
                    class="!text-[#1D3557] !border-[#1D3557] hover:!bg-[#1D3557] hover:!text-white"
                  >
                    Learn More
                  </UButton>
                  <div class="flex gap-2">
                    <UButton
                      size="xs"
                      variant="outline"
                      color="primary"
                      @click="submitRecommendationFeedback(`offer-${index}`, 'offer', 'helpful', offer)"
                      :disabled="!!feedbackSubmitted[`offer-${index}`]"
                      class="flex-1 !text-[#1D3557] !border-[#1D3557] hover:!bg-[#1D3557] hover:!text-white"
                    >
                      {{ feedbackSubmitted[`offer-${index}`] === 'helpful' ? '✓ Helpful' : 'Helpful' }}
                    </UButton>
                    <UButton
                      size="xs"
                      variant="outline"
                      color="primary"
                      @click="submitRecommendationFeedback(`offer-${index}`, 'offer', 'not_helpful', offer)"
                      :disabled="!!feedbackSubmitted[`offer-${index}`]"
                      class="flex-1 !text-[#1D3557] !border-[#1D3557] !bg-white hover:!bg-[#1D3557] hover:!text-white"
                    >
                      {{ feedbackSubmitted[`offer-${index}`] === 'not_helpful' ? '✓ Not Helpful' : 'Not Helpful' }}
                    </UButton>
                  </div>
                </div>
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
        
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import { ref, computed, onMounted, watch } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'
import { usePersonas } from '~/composables/usePersonas'
import { useRecommendations } from '~/composables/useRecommendations'
import { useSignals } from '~/composables/useSignals'
import { useTransactions } from '~/composables/useTransactions'
import { useToast } from '#imports'
import { format, parseISO, subDays } from 'date-fns'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import DebtPayoffCalculator from '~/components/calculators/DebtPayoffCalculator.vue'
import SavingsGoalCalculator from '~/components/calculators/SavingsGoalCalculator.vue'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

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
const sorting = ref([{ id: 'date', desc: true }])
const pageSize = ref(25)
const pagination = ref({
  pageIndex: 0,
  pageSize: 25
})

// Watch pageSize and update pagination
watch(pageSize, (newSize) => {
  pagination.value = {
    ...pagination.value,
    pageSize: newSize,
    pageIndex: 0
  }
})
const feedbackSubmitted = ref<Record<string, string>>({})

const table = useTemplateRef('table')

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

const balanceHealth = computed(() => {
  // Calculate average monthly expenses from transactions
  const monthlyExpenses = transactions.value
    .filter(txn => !isIncomeTransaction(txn))
    .reduce((sum, txn) => sum + txn.amount, 0) / 6 // Approximate 6 months of data
  
  // Get savings account balance
  const savingsBalance = accounts.value
    .filter(acc => acc.type === 'depository' && (acc.subtype === 'savings' || acc.subtype === 'money market'))
    .reduce((sum, acc) => {
      const balances = acc.balances as any
      return sum + (balances?.current || 0)
    }, 0)
  
  // Check for high utilization signals
  const hasHighUtil = signals.value.some(s => 
    s.signal_type === 'credit_high_utilization' || 
    s.signal_type === 'credit_moderate_utilization'
  )
  
  // Calculate emergency fund coverage (months)
  const emergencyMonths = monthlyExpenses > 0 ? savingsBalance / monthlyExpenses : 0
  
  if (hasHighUtil || totalBalance.value < 0) {
    return {
      status: 'Needs Attention',
      color: 'red',
      icon: '⚠️',
      message: 'High credit utilization or negative balance detected'
    }
  } else if (emergencyMonths >= 3 && savingsBalance > 0) {
    return {
      status: 'Healthy',
      color: 'green',
      icon: '✅',
      message: `${emergencyMonths.toFixed(1)} months emergency fund`
    }
  } else if (emergencyMonths >= 1 || savingsBalance > 0) {
    return {
      status: 'Building',
      color: 'yellow',
      icon: '📈',
      message: 'Building your emergency fund'
    }
  } else {
    return {
      status: 'Building',
      color: 'yellow',
      icon: '💡',
      message: 'Start building your emergency fund'
    }
  }
})

const filteredTransactions = computed(() => {
  let filtered = transactions.value
  if (selectedTransactionFilter.value !== 'all') {
    const days = parseInt(selectedTransactionFilter.value)
    const cutoffDate = subDays(new Date(), days)
    filtered = transactions.value.filter(txn => {
      const txnDate = parseISO(txn.date)
      return txnDate >= cutoffDate
    })
  }
  return filtered
})

// Reset pagination when filter changes
watch(selectedTransactionFilter, () => {
  pagination.value.pageIndex = 0
})

type TransactionRow = {
  id: string
  date: string
  merchant: string
  category: string
  account: string
  amount: number
  merchant_name?: string
  personal_finance_category?: any
  account_name?: string
  account_id?: string
}

const transactionColumns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'date',
    header: ({ column }: { column: Column<TransactionRow> }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Date',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5 !text-[#1D3557] font-semibold hover:!text-[#1D3557] hover:!bg-[#A8DADC]/20',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'merchant',
    header: ({ column }: { column: Column<TransactionRow> }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Merchant',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5 !text-[#1D3557] font-semibold hover:!text-[#1D3557] hover:!bg-[#A8DADC]/20',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'category',
    header: ({ column }: { column: Column<TransactionRow> }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Category',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5 !text-[#1D3557] font-semibold hover:!text-[#1D3557] hover:!bg-[#A8DADC]/20',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'account',
    header: ({ column }: { column: Column<TransactionRow> }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Account',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5 !text-[#1D3557] font-semibold hover:!text-[#1D3557] hover:!bg-[#A8DADC]/20',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }: { column: Column<TransactionRow> }) => {
      const isSorted = column.getIsSorted()
      return h('div', { class: 'text-right' }, h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Amount',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5 !text-[#1D3557] font-semibold hover:!text-[#1D3557] hover:!bg-[#A8DADC]/20',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      }))
    }
  }
] as any

const tableData = computed(() => {
  const filtered = filteredTransactions.value
  console.log('[DASHBOARD] filteredTransactions length:', filtered.length)
  if (filtered.length > 0) {
    console.log('[DASHBOARD] Sample transaction:', JSON.parse(JSON.stringify(filtered[0])))
  }
  
  // Transform data to match column keys for UTable
  const transformed = filtered.map(txn => {
    const transformedTxn = {
      id: txn.id,
      date: txn.date,
      merchant: txn.merchant_name || 'Transfer',
      category: getCategoryName(txn.personal_finance_category) || '—',
      account: txn.account_name || 'Unknown',
      amount: txn.amount,
      // Keep original data for template access
      merchant_name: txn.merchant_name,
      personal_finance_category: txn.personal_finance_category,
      account_name: txn.account_name,
      account_id: txn.account_id
    }
    return transformedTxn
  })
  
  console.log('[DASHBOARD] tableData length:', transformed.length)
  return transformed
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
      return signal.signal_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
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

const getPersonaBadgeStyle = (personaType: string): Record<string, string> => {
  const styles: Record<string, Record<string, string>> = {
    'high_utilization': { backgroundColor: '#DC2626', color: '#FFFFFF' }, // dark red
    'variable_income_budgeter': { backgroundColor: '#EA580C', color: '#FFFFFF' }, // dark orange
    'subscription_heavy': { backgroundColor: '#CA8A04', color: '#FFFFFF' }, // dark yellow/amber
    'savings_builder': { backgroundColor: '#16A34A', color: '#FFFFFF' }, // dark green
    'impulse_spender': { backgroundColor: '#9333EA', color: '#FFFFFF' } // dark purple
  }
  return styles[personaType] || { backgroundColor: '#6B7280', color: '#FFFFFF' } // dark gray
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

const getPersonaIcon = (personaType: string): string => {
  const icons: Record<string, string> = {
    'high_utilization': '⚠️ High credit utilization detected',
    'variable_income_budgeter': '📊 Variable income patterns',
    'subscription_heavy': '🔄 Multiple recurring subscriptions',
    'savings_builder': '💰 Building savings',
    'impulse_spender': '🛒 Impulse spending patterns'
  }
  return icons[personaType] || '📈 Financial profile'
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

const getCategoryColor = (category: any): string => {
  if (!category) return 'gray'
  const categoryName = getCategoryName(category)?.toUpperCase() || ''
  
  if (categoryName.includes('FOOD') || categoryName.includes('DRINK') || categoryName.includes('RESTAURANT') || categoryName.includes('GROCERIES')) {
    return 'green'
  } else if (categoryName.includes('TRANSPORTATION') || categoryName.includes('GAS') || categoryName.includes('PUBLIC')) {
    return 'blue'
  } else if (categoryName.includes('ENTERTAINMENT') || categoryName.includes('MUSIC') || categoryName.includes('MOVIES')) {
    return 'purple'
  } else if (categoryName.includes('MERCHANDISE') || categoryName.includes('DEPARTMENT') || categoryName.includes('MARKETPLACE')) {
    return 'orange'
  } else if (categoryName.includes('SERVICES') || categoryName.includes('ACCOUNTING') || categoryName.includes('FINANCIAL')) {
    return 'indigo'
  }
  return 'gray'
}

const getCategoryBadgeStyle = (category: any): Record<string, string> => {
  if (!category) return { 
    backgroundColor: '#9ca3af',
    color: '#ffffff',
    border: 'none'
  }
  const categoryName = getCategoryName(category)?.toUpperCase() || ''
  
  if (categoryName.includes('FOOD') || categoryName.includes('DRINK') || categoryName.includes('RESTAURANT') || categoryName.includes('GROCERIES')) {
    return { 
      backgroundColor: '#10b981',
      color: '#ffffff',
      border: 'none'
    }
  } else if (categoryName.includes('TRANSPORTATION') || categoryName.includes('GAS') || categoryName.includes('PUBLIC')) {
    return { 
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none'
    }
  } else if (categoryName.includes('ENTERTAINMENT') || categoryName.includes('MUSIC') || categoryName.includes('MOVIES')) {
    return { 
      backgroundColor: '#a855f7',
      color: '#ffffff',
      border: 'none'
    }
  } else if (categoryName.includes('MERCHANDISE') || categoryName.includes('DEPARTMENT') || categoryName.includes('MARKETPLACE')) {
    return { 
      backgroundColor: '#f97316',
      color: '#ffffff',
      border: 'none'
    }
  } else if (categoryName.includes('SERVICES') || categoryName.includes('ACCOUNTING') || categoryName.includes('FINANCIAL')) {
    return { 
      backgroundColor: '#6366f1',
      color: '#ffffff',
      border: 'none'
    }
  }
  return { 
    backgroundColor: '#9ca3af',
    color: '#ffffff',
    border: 'none'
  }
}

const isIncomeTransaction = (txn: any): boolean => {
  if (!txn.merchant_name) return false
  const merchant = txn.merchant_name.toUpperCase()
  return ['PAYROLL', 'DIRECT DEPOSIT', 'EMPLOYER PAYROLL'].some(keyword => merchant.includes(keyword))
}

const submitRecommendationFeedback = async (recommendationId: string, recommendationType: string, actionType: string, recommendation: any) => {
  if (!currentUserId.value) return
  
  const feedbackKey = recommendationId
  
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        user_id: currentUserId.value,
        action_type: actionType,
        feedback_data: {
          recommendation_id: recommendationId,
          recommendation_type: recommendationType,
          content_id: recommendation.content_id,
          ...recommendation
        }
      }
    })
    
    feedbackSubmitted.value[feedbackKey] = actionType
    
    toast.add({
      title: 'Thank you!',
      description: 'Your feedback helps us improve.',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: 'Failed to submit feedback',
      color: 'error'
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
      color: 'success'
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
      color: 'error'
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
    
    // Get transactions - no limit, let pagination handle it
    try {
      const transactionsData = await fetchTransactions(user.id, { days: 90 })
      transactions.value = transactionsData.transactions || []
      console.log('[DASHBOARD] Loaded transactions:', transactions.value.length)
      console.log('[DASHBOARD] Sample transaction data:', transactions.value[0])
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
