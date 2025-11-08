<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-[#1D3557]">Operator Dashboard</h1>
        <div class="flex gap-2 w-full sm:w-auto">
          <UButton 
            @click="processAllUsers" 
            :loading="processingAllUsers" 
            :aria-busy="processingAllUsers"
            color="secondary"
            aria-label="Process all users (signals, personas, recommendations)"
            class="flex-1 sm:flex-none"
          >
            Process All Users
          </UButton>
          <UButton 
            @click="refreshData" 
            :loading="loading" 
            :aria-busy="loading"
            color="primary"
            aria-label="Refresh user data"
            class="flex-1 sm:flex-none"
          >
            Refresh
          </UButton>
        </div>
      </div>
      
      <!-- Filters -->
      <UCard class="mb-6 bg-white">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormField label="Filter by Persona" class="[&_label]:text-gray-900">
            <USelect
              v-model="filters.persona"
              :items="personaOptions"
              placeholder="All Personas"
              value-key="value"
              class="w-full [&_button]:text-gray-900 [&_button]:bg-white"
              :ui="{ item: 'text-gray-900 bg-white hover:bg-gray-100' }"
            />
          </UFormField>
          
          <UFormField label="Filter by Signal Type" class="[&_label]:text-gray-900">
            <USelect
              v-model="filters.signalType"
              :items="signalTypeOptions"
              placeholder="All Signals"
              value-key="value"
              class="w-full [&_button]:text-gray-900 [&_button]:bg-white"
              :ui="{ item: 'text-gray-900 bg-white hover:bg-gray-100' }"
            />
          </UFormField>
          
          <UFormField label="Search Users" class="[&_label]:text-gray-900">
            <UInput
              v-model="filters.search"
              placeholder="Search by name..."
              @input="applyFilters"
              class="[&_input]:text-gray-900 [&_input]:bg-white"
            />
          </UFormField>
        </div>
      </UCard>
      
      <!-- Tabs for Users and Flag Queue -->
      <UTabs :items="tabs" v-model="activeTab" :content="true" class="mb-6">
        <template #users>
          <!-- Users Table -->
          <UCard>
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8 text-[#457B9D]">
              <p>Loading users...</p>
            </div>
            
            <!-- Error State -->
            <UAlert
              v-else-if="loadError"
              color="red"
              variant="soft"
              class="mb-4"
            >
              <template #title>Error Loading Users</template>
              <template #description>
                {{ loadError }}
                <div class="mt-2 text-sm">
                  This might be due to Row Level Security (RLS) policies. Operators need special permissions to view all users.
                </div>
              </template>
            </UAlert>
            
            <!-- Content when data is loaded -->
            <div v-else>
              <!-- Bulk Actions Bar -->
              <div v-if="selectedRecommendations.size > 0" class="mb-4 p-4 bg-[#A8DADC] rounded-lg flex justify-between items-center">
                <span class="text-[#1D3557] font-medium">
                  {{ selectedRecommendations.size }} recommendation(s) selected
                </span>
                <div class="flex gap-2">
                  <UButton
                    size="sm"
                    color="primary"
                    @click="bulkApprove"
                    :loading="bulkProcessing"
                    :aria-busy="bulkProcessing"
                    :aria-label="`Approve ${selectedRecommendations.size} selected recommendations`"
                  >
                    Bulk Approve
                  </UButton>
                  <UButton
                    size="sm"
                    color="error"
                    variant="outline"
                    @click="bulkFlag"
                    :loading="bulkProcessing"
                    :aria-busy="bulkProcessing"
                    :aria-label="`Flag ${selectedRecommendations.size} selected recommendations`"
                  >
                    Bulk Flag
                  </UButton>
                  <UButton
                    size="sm"
                    variant="ghost"
                    @click="clearSelection"
                    aria-label="Clear selected recommendations"
                  >
                    Clear Selection
                  </UButton>
                </div>
              </div>
              
              <!-- Empty State -->
              <div v-if="filteredUsers.length === 0" class="text-center py-8 text-[#457B9D]">
                <p class="text-lg font-medium mb-2">No users found</p>
                <p class="text-sm">Users will appear here after they upload data and complete onboarding.</p>
              </div>
              
              <!-- Users Table -->
              <div v-if="filteredUsers.length > 0" class="mt-4">
                <div class="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow">
                  <table class="w-full min-w-[640px]">
                    <thead>
                      <tr class="bg-[#1D3557]">
                        <th class="px-4 py-3 text-left text-white font-semibold" style="color: white !important; background-color: #1D3557 !important;">Name</th>
                        <th class="px-4 py-3 text-left text-white font-semibold" style="color: white !important; background-color: #1D3557 !important;">Persona</th>
                        <th class="px-4 py-3 text-left text-white font-semibold" style="color: white !important; background-color: #1D3557 !important;">Signals</th>
                        <th class="px-4 py-3 text-left text-white font-semibold" style="color: white !important; background-color: #1D3557 !important;">Recommendations</th>
                        <th class="px-4 py-3 text-left text-white font-semibold" style="color: white !important; background-color: #1D3557 !important;">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white">
                      <template v-for="userData in filteredUsers" :key="userData.user.id">
                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                          <td class="px-4 py-3 font-medium text-gray-900">{{ userData.user.fake_name }}</td>
                          <td class="px-4 py-3 text-gray-900">
                            <UBadge v-if="userData.persona?.persona_type" :color="getPersonaColor(userData.persona.persona_type)">
                              {{ userData.persona.persona_type }}
                            </UBadge>
                            <span v-else class="text-gray-500">Not Assigned</span>
                          </td>
                          <td class="px-4 py-3 text-gray-900">{{ userData.signals_count }}</td>
                          <td class="px-4 py-3 text-gray-900">{{ userData.recommendations_count }}</td>
                          <td class="px-4 py-3">
                            <UButton
                              size="xs"
                              variant="ghost"
                              @click="toggleExpand(userData)"
                            >
                              {{ expandedRows.has(userData.user.id) ? 'Collapse' : 'Expand' }}
                            </UButton>
                          </td>
                        </tr>
                        <!-- Expanded Row Content - directly under the user row -->
                        <tr v-if="expandedRows.has(userData.user.id)">
                          <td colspan="5" class="px-4 py-4 bg-gray-50">
                            <UCard class="!bg-white">
                              <div class="space-y-4">
                                <!-- Signals -->
                                <div>
                                  <h3 class="font-semibold mb-2 text-gray-900">Signals</h3>
                                  <div class="space-y-2">
                                    <div
                                      v-for="signal in userData.signals"
                                      :key="signal.id"
                                      class="p-3 bg-white rounded border-2 border-gray-300 shadow-sm"
                                    >
                                      <p class="font-semibold text-gray-900 mb-2">{{ signal.signal_type }}</p>
                                      <pre class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">{{ JSON.stringify(signal.signal_data, null, 2) }}</pre>
                                    </div>
                                    <div v-if="userData.signals.length === 0" class="text-sm text-gray-500 italic">
                                      No signals detected
                                    </div>
                                  </div>
                                </div>
                                
                                <!-- Persona Rationale -->
                                <div v-if="userData.persona">
                                  <h3 class="font-semibold mb-2 text-gray-900">Persona Rationale</h3>
                                  <p class="text-gray-700">{{ userData.persona.rationale }}</p>
                                </div>
                                
                                <!-- Recommendations -->
                                <div>
                                  <h3 class="font-semibold mb-2 text-gray-900">Recommendations</h3>
                                  <div class="space-y-2">
                                    <div
                                      v-for="rec in userData.recommendations"
                                      :key="rec.id"
                                      class="p-2 rounded flex justify-between items-center bg-white"
                                      :class="{
                                        'ring-2 ring-[#457B9D]': selectedRecommendations.has(rec.id),
                                        'border-2 border-red-400 bg-red-50': rec.is_flagged,
                                        'border border-[#A8DADC]': !rec.is_flagged
                                      }"
                                    >
                                      <div class="flex items-center gap-3 flex-1">
                                        <UCheckbox
                                          :model-value="selectedRecommendations.has(rec.id)"
                                          @update:model-value="toggleRecommendationSelection(rec.id)"
                                          :label="''"
                                          :aria-label="`Select recommendation: ${rec.rationale.substring(0, 50)}`"
                                        />
                                        <div class="flex-1">
                                          <div class="flex items-center gap-2 mb-1">
                                            <p class="font-medium text-gray-900">{{ rec.rationale.substring(0, 100) }}...</p>
                                            <UBadge v-if="rec.is_flagged" color="red" size="xs">
                                              Flagged
                                            </UBadge>
                                          </div>
                                          <p class="text-xs text-gray-500">{{ new Date(rec.created_at).toLocaleDateString() }}</p>
                                          <div class="flex gap-2 mt-1">
                                            <UBadge v-if="rec.approved_by_operator" color="green" size="xs">
                                              Approved
                                            </UBadge>
                                          </div>
                                        </div>
                                      </div>
                                      <div class="flex gap-2">
                                        <UButton
                                          size="xs"
                                          color="primary"
                                          @click="approveRecommendation(rec.id)"
                                          :disabled="!!rec.approved_by_operator"
                                          :aria-label="rec.approved_by_operator ? 'Recommendation already approved' : 'Approve this recommendation'"
                                          :aria-disabled="!!rec.approved_by_operator"
                                        >
                                          Approve
                                        </UButton>
                                        <UButton
                                          size="xs"
                                          color="error"
                                          variant="outline"
                                          @click="flagRecommendation(rec.id)"
                                          :disabled="rec.is_flagged"
                                          :aria-label="rec.is_flagged ? 'Recommendation already flagged' : 'Flag this recommendation for review'"
                                          :aria-disabled="rec.is_flagged"
                                        >
                                          {{ rec.is_flagged ? 'Flagged' : 'Flag' }}
                                        </UButton>
                                      </div>
                                    </div>
                                    <div v-if="userData.recommendations.length === 0" class="text-sm text-gray-500 italic">
                                      No recommendations generated
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </UCard>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
                <div v-if="filteredUsers.length > 0" class="mt-2 text-sm text-gray-600 text-center">
                  Showing {{ filteredUsers.length }} user{{ filteredUsers.length !== 1 ? 's' : '' }}
                </div>
              </div>
            </div>
          </UCard>
        </template>
        
        <template #flag-queue>
          <!-- Flag Queue -->
          <UCard>
            <div class="mb-4 flex justify-between items-center">
              <h2 class="text-xl font-semibold text-[#1D3557]">Flagged Recommendations</h2>
              <UButton 
                @click="loadFlagQueue" 
                :loading="loadingFlagQueue" 
                :aria-busy="loadingFlagQueue"
                color="primary" 
                size="sm"
                aria-label="Refresh flag queue"
              >
                Refresh
              </UButton>
            </div>
            
            <div v-if="flaggedRecommendations.length === 0" class="text-center py-8 text-[#457B9D]">
              No flagged recommendations
            </div>
            
            <div v-else class="space-y-4">
              <div
                v-for="rec in flaggedRecommendations"
                :key="rec.id"
                class="p-4 border border-red-300 rounded-lg bg-red-50"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <p class="font-medium text-[#1D3557]">{{ rec.rationale }}</p>
                    <p class="text-sm text-[#457B9D]/70 mt-1">
                      User: {{ (rec.users as any)?.fake_name || 'Unknown' }} | 
                      Flagged: {{ new Date(rec.flagged_at).toLocaleString() }}
                    </p>
                    <p class="text-sm text-red-600 mt-1">
                      Reason: {{ rec.flag_reason }}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      size="xs"
                      color="primary"
                      @click="approveRecommendation(rec.id)"
                      aria-label="Approve this flagged recommendation anyway"
                    >
                      Approve Anyway
                    </UButton>
                    <UButton
                      size="xs"
                      color="error"
                      variant="outline"
                      @click="removeFromFlagQueue(rec.id)"
                      aria-label="Dismiss this flagged recommendation"
                    >
                      Dismiss
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
        
        <template #fairness>
          <!-- Fairness Analysis -->
          <UCard>
            <div class="mb-4 flex justify-between items-center">
              <h2 class="text-xl font-semibold text-[#1D3557]">Fairness & Demographic Parity</h2>
              <UButton 
                @click="loadFairnessMetrics" 
                :loading="loadingFairness" 
                :aria-busy="loadingFairness"
                color="primary" 
                size="sm"
                aria-label="Refresh fairness metrics"
              >
                Refresh
              </UButton>
            </div>
            
            <div v-if="loadingFairness" class="text-center py-8 text-[#457B9D]">
              Loading fairness metrics...
            </div>
            
            <div v-else-if="fairnessMetrics" class="space-y-6">
              <!-- Fairness Score -->
              <UCard class="!bg-white">
                <div class="text-center">
                  <h3 class="text-lg font-semibold text-[#1D3557] mb-2">Overall Fairness Score</h3>
                  <div class="text-4xl font-bold" :class="getScoreColor(fairnessMetrics.fairness_score)">
                    {{ fairnessMetrics.fairness_score.toFixed(1) }}/100
                  </div>
                  <p class="text-sm text-[#457B9D] mt-2">
                    {{ fairnessMetrics.bias_flags?.length || 0 }} potential bias flag(s) detected
                  </p>
                </div>
              </UCard>
              
              <!-- Bias Flags -->
              <div v-if="fairnessMetrics.bias_flags && fairnessMetrics.bias_flags.length > 0">
                <h3 class="text-lg font-semibold text-[#1D3557] mb-3">Potential Bias Flags</h3>
                <div class="space-y-2">
                  <UAlert
                    v-for="(flag, idx) in fairnessMetrics.bias_flags"
                    :key="idx"
                    color="warning"
                    variant="soft"
                  >
                    <template #title>
                      {{ flag.persona_type }} - {{ flag.demographic_dimension }} ({{ flag.demographic_value }})
                    </template>
                    <template #description>
                      {{ flag.percentage.toFixed(1) }}% (expected {{ flag.expected_percentage.toFixed(1) }}%, 
                      difference: {{ flag.difference.toFixed(1) }}%)
                    </template>
                  </UAlert>
                </div>
              </div>
              
              <!-- Demographic Breakdown Tables -->
              <div class="space-y-6">
                <!-- By Age -->
                <div>
                  <h3 class="text-lg font-semibold text-[#1D3557] mb-3">By Age</h3>
                  <div class="overflow-x-auto">
                    <UTable
                      :rows="formatDemographicTable(fairnessMetrics.demographic_breakdown?.by_age)"
                      :columns="demographicColumns"
                      class="w-full"
                    />
                  </div>
                </div>
                
                <!-- By Gender -->
                <div>
                  <h3 class="text-lg font-semibold text-[#1D3557] mb-3">By Gender</h3>
                  <div class="overflow-x-auto">
                    <UTable
                      :rows="formatDemographicTable(fairnessMetrics.demographic_breakdown?.by_gender)"
                      :columns="demographicColumns"
                      class="w-full"
                    />
                  </div>
                </div>
                
                <!-- By Income -->
                <div>
                  <h3 class="text-lg font-semibold text-[#1D3557] mb-3">By Income</h3>
                  <div class="overflow-x-auto">
                    <UTable
                      :rows="formatDemographicTable(fairnessMetrics.demographic_breakdown?.by_income)"
                      :columns="demographicColumns"
                      class="w-full"
                    />
                  </div>
                </div>
                
                <!-- By Ethnicity -->
                <div>
                  <h3 class="text-lg font-semibold text-[#1D3557] mb-3">By Ethnicity</h3>
                  <div class="overflow-x-auto">
                    <UTable
                      :rows="formatDemographicTable(fairnessMetrics.demographic_breakdown?.by_ethnicity)"
                      :columns="demographicColumns"
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="text-center py-8 text-[#457B9D]">
              No fairness metrics available. Run evaluation to generate metrics.
            </div>
          </UCard>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient, useToast } from '#imports'

definePageMeta({
  middleware: ['auth', 'operator']
})

const supabase = useSupabaseClient()
const toast = useToast()

const loading = ref(false)
const loadingFlagQueue = ref(false)
const loadingFairness = ref(false)
const processingAllUsers = ref(false)
const users = ref<any[]>([])
const expandedRows = ref(new Set<string>())
const selectedRecommendations = ref(new Set<string>())
const bulkProcessing = ref(false)
const activeTab = ref('users')
const flaggedRecommendations = ref<any[]>([])
const fairnessMetrics = ref<any>(null)
const currentOperatorId = ref<string | null>(null)
const loadError = ref<string | null>(null)

const demographicColumns = [
  { id: 'demographic', key: 'demographic', label: 'Demographic' },
  { id: 'persona', key: 'persona', label: 'Persona' },
  { id: 'count', key: 'count', label: 'Count' },
  { id: 'percentage', key: 'percentage', label: 'Percentage' }
]

const tabs = [
  { label: 'Users', value: 'users', slot: 'users' },
  { label: 'Flag Queue', value: 'flag-queue', slot: 'flag-queue' },
  { label: 'Fairness Analysis', value: 'fairness', slot: 'fairness' }
]

const filters = ref({
  persona: null,
  signalType: null,
  search: ''
})

const personaOptions = [
  { label: 'All Personas', value: null },
  { label: 'High Utilization', value: 'high_utilization' },
  { label: 'Variable Income Budgeter', value: 'variable_income_budgeter' },
  { label: 'Subscription-Heavy', value: 'subscription_heavy' },
  { label: 'Savings Builder', value: 'savings_builder' },
  { label: 'Impulse Spender', value: 'impulse_spender' }
]

const signalTypeOptions = [
  { label: 'All Signals', value: null },
  { label: 'Subscriptions', value: 'subscriptions' },
  { label: 'Savings', value: 'savings' },
  { label: 'Credit High Utilization', value: 'credit_high_utilization' },
  { label: 'Credit Overdue', value: 'credit_overdue' },
  { label: 'Credit Moderate Utilization', value: 'credit_moderate_utilization' },
  { label: 'Income', value: 'income' }
]

const columns = [
  { key: 'user.fake_name', label: 'Name' },
  { key: 'persona', label: 'Persona' },
  { key: 'signals_count', label: 'Signals' },
  { key: 'recommendations_count', label: 'Recommendations' },
  { key: 'actions', label: 'Actions' }
]

const filteredUsers = computed(() => {
  console.log('[FILTERED] Computing filteredUsers, users.value.length:', users.value.length)
  let filtered = users.value
  
  if (filters.value.persona) {
    filtered = filtered.filter(u => u.persona?.persona_type === filters.value.persona)
    console.log('[FILTERED] After persona filter:', filtered.length)
  }
  
  if (filters.value.signalType) {
    filtered = filtered.filter(u =>
      u.signals.some((s: any) => s.signal_type === filters.value.signalType)
    )
    console.log('[FILTERED] After signalType filter:', filtered.length)
  }
  
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(u =>
      u.user.fake_name.toLowerCase().includes(search)
    )
    console.log('[FILTERED] After search filter:', filtered.length)
  }
  
  console.log('[FILTERED] Final filtered count:', filtered.length)
  return filtered
})

const getPersonaColor = (personaType: string) => {
  const colors: Record<string, string> = {
    'high_utilization': 'red',
    'variable_income_budgeter': 'yellow',
    'subscription_heavy': 'orange',
    'savings_builder': 'green',
    'impulse_spender': 'purple'
  }
  return colors[personaType] || 'gray'
}

const toggleExpand = (row: any) => {
  const userId = row.user.id
  if (expandedRows.value.has(userId)) {
    expandedRows.value.delete(userId)
  } else {
    expandedRows.value.add(userId)
  }
}

const refreshData = async () => {
  await loadUsers()
}

const processAllUsers = async () => {
  processingAllUsers.value = true
  try {
    const result = await $fetch('/api/operator/process-all-users', {
      method: 'POST'
    })
    
    toast.add({
      title: 'Processing Complete',
      description: `Processed ${result.processed} of ${result.total} users. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
      color: result.errors.length > 0 ? 'warning' : 'success',
      timeout: 5000
    })
    
    // Refresh the user list to show updated data
    await loadUsers()
  } catch (error: any) {
    toast.add({
      title: 'Processing Failed',
      description: error.message || 'Failed to process users',
      color: 'error',
      timeout: 5000
    })
  } finally {
    processingAllUsers.value = false
  }
}

const loadUsers = async () => {
  loading.value = true
  loadError.value = null
  try {
    // Refresh session to get updated JWT with operator role
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.warn('Session error:', sessionError)
    }
    
    // Get current user to verify operator status
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (user) {
      console.log('Current user:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
        is_operator: user.user_metadata?.is_operator,
        all_metadata: user.user_metadata
      })
    }
    
    // Get all users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(100)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      console.error('Error details:', {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      })
      loadError.value = `Failed to load users: ${usersError.message}. This might be due to Row Level Security (RLS) policies. Operators need permissions to view all users. If you just set your operator role, try logging out and back in.`
      users.value = []
      return
    }
    
    console.log('Loaded users:', usersData?.length || 0)
    
    if (!usersData || usersData.length === 0) {
      users.value = []
      return
    }
    
    // Get all flagged recommendation IDs to mark them in the UI
    const { data: flagLogs } = await supabase
      .from('logs')
      .select('decision_trace')
      .eq('action_type', 'recommendation_flagged')
    
    const flaggedRecIds = new Set(
      flagLogs
        ?.map(log => (log.decision_trace as any)?.recommendation_id)
        .filter(Boolean) || []
    )
    
    // For each user, get their signals, persona, and recommendations
    const usersWithData = await Promise.all(
      usersData.map(async (user) => {
        try {
          const [signals, persona, recommendations] = await Promise.all([
            supabase.from('signals').select('*').eq('user_id', user.id),
            supabase.from('personas').select('*').eq('user_id', user.id).maybeSingle(), // Use maybeSingle to avoid 406 errors
            supabase.from('recommendations').select('*').eq('user_id', user.id)
          ])
          
          // Mark flagged recommendations
          const recommendationsWithFlags = (recommendations.data || []).map((rec: any) => ({
            ...rec,
            is_flagged: flaggedRecIds.has(rec.id)
          }))
          
          return {
            user,
            signals: signals.data || [],
            persona: persona.data || null,
            recommendations: recommendationsWithFlags,
            signals_count: signals.data?.length || 0,
            recommendations_count: recommendations.data?.length || 0
          }
        } catch (error: any) {
          console.error(`Error loading data for user ${user.id}:`, error)
          // Return user with empty data if there's an error
          return {
            user,
            signals: [],
            persona: null,
            recommendations: [],
            signals_count: 0,
            recommendations_count: 0
          }
        }
      })
    )
    
    console.log('Processed users with data:', usersWithData.length)
    console.log('Sample user data:', usersWithData[0] ? {
      user: usersWithData[0].user?.fake_name,
      signals_count: usersWithData[0].signals_count,
      persona: usersWithData[0].persona?.persona_type,
      recommendations_count: usersWithData[0].recommendations_count
    } : 'No users')
    
    users.value = usersWithData
    console.log('users.value set, length:', users.value.length)
    console.log('filteredUsers computed would return:', filteredUsers.value.length)
  } catch (error: any) {
    console.error('Error loading users:', error)
    loadError.value = `Unexpected error: ${error.message || 'Unknown error occurred'}`
    users.value = []
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  // Filters are applied via computed property
}

const toggleRecommendationSelection = (recId: string) => {
  if (selectedRecommendations.value.has(recId)) {
    selectedRecommendations.value.delete(recId)
  } else {
    selectedRecommendations.value.add(recId)
  }
}

const clearSelection = () => {
  selectedRecommendations.value.clear()
}

const approveRecommendation = async (recId: string) => {
  if (!currentOperatorId.value) {
    toast.add({
      title: 'Error',
      description: 'Operator ID not found',
      color: 'red'
    })
    return
  }
  
  try {
    await $fetch('/api/operator/approve', {
      method: 'POST',
      body: {
        recommendation_ids: [recId],
        operator_id: currentOperatorId.value
      }
    })
    
    toast.add({
      title: 'Recommendation approved',
      description: 'This recommendation has been marked as approved.',
      color: 'green'
    })
    
    // Refresh data
    await loadUsers()
    selectedRecommendations.value.delete(recId)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to approve recommendation',
      color: 'red'
    })
  }
}

const flagRecommendation = async (recId: string) => {
  if (!currentOperatorId.value) {
    toast.add({
      title: 'Error',
      description: 'Operator ID not found',
      color: 'red'
    })
    return
  }
  
  try {
    await $fetch('/api/operator/flag', {
      method: 'POST',
      body: {
        recommendation_ids: [recId],
        operator_id: currentOperatorId.value,
        reason: 'Flagged by operator'
      }
    })
    
    toast.add({
      title: 'Recommendation flagged',
      description: 'This recommendation has been flagged for review.',
      color: 'orange'
    })
    
    // Refresh current user view to show flagged state
    await loadUsers()
    
    // Refresh flag queue if on that tab
    if (activeTab.value === 'flag-queue') {
      await loadFlagQueue()
    }
    selectedRecommendations.value.delete(recId)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to flag recommendation',
      color: 'red'
    })
  }
}

const bulkApprove = async () => {
  if (selectedRecommendations.value.size === 0 || !currentOperatorId.value) return
  
  bulkProcessing.value = true
  try {
    await $fetch('/api/operator/approve', {
      method: 'POST',
      body: {
        recommendation_ids: Array.from(selectedRecommendations.value),
        operator_id: currentOperatorId.value
      }
    })
    
    toast.add({
      title: 'Bulk approval successful',
      description: `${selectedRecommendations.value.size} recommendation(s) approved.`,
      color: 'green'
    })
    
    clearSelection()
    await loadUsers()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to approve recommendations',
      color: 'red'
    })
  } finally {
    bulkProcessing.value = false
  }
}

const bulkFlag = async () => {
  if (selectedRecommendations.value.size === 0 || !currentOperatorId.value) return
  
  bulkProcessing.value = true
  try {
    await $fetch('/api/operator/flag', {
      method: 'POST',
      body: {
        recommendation_ids: Array.from(selectedRecommendations.value),
        operator_id: currentOperatorId.value,
        reason: 'Bulk flagged by operator'
      }
    })
    
    toast.add({
      title: 'Bulk flagging successful',
      description: `${selectedRecommendations.value.size} recommendation(s) flagged.`,
      color: 'orange'
    })
    
    // Refresh current user view to show flagged state
    await loadUsers()
    
    // Refresh flag queue if on that tab
    if (activeTab.value === 'flag-queue') {
      await loadFlagQueue()
    }
    clearSelection()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to flag recommendations',
      color: 'red'
    })
  } finally {
    bulkProcessing.value = false
  }
}

const loadFlagQueue = async () => {
  loadingFlagQueue.value = true
  try {
    const response = await $fetch('/api/operator/flag-queue')
    flaggedRecommendations.value = response.flagged_recommendations || []
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to load flag queue',
      color: 'red'
    })
  } finally {
    loadingFlagQueue.value = false
  }
}

const removeFromFlagQueue = async (recId: string) => {
  if (!currentOperatorId.value) {
    toast.add({
      title: 'Error',
      description: 'Operator ID not found',
      color: 'red'
    })
    return
  }
  
  try {
    await $fetch('/api/operator/unflag', {
      method: 'POST',
      body: {
        recommendation_ids: [recId],
        operator_id: currentOperatorId.value
      }
    })
    
    toast.add({
      title: 'Removed from flag queue',
      description: 'The recommendation has been dismissed.',
      color: 'green'
    })
    
    // Refresh flag queue and user view
    await loadFlagQueue()
    await loadUsers()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to remove flag',
      color: 'red'
    })
  }
}

const loadFairnessMetrics = async () => {
  loadingFairness.value = true
  try {
    const response = await $fetch('/api/operator/fairness')
    fairnessMetrics.value = response.fairness
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to load fairness metrics',
      color: 'red'
    })
  } finally {
    loadingFairness.value = false
  }
}

const formatDemographicTable = (breakdown: any): any[] => {
  if (!breakdown) return []
  const rows: any[] = []
  for (const [demoValue, personas] of Object.entries(breakdown)) {
    for (const [personaType, data] of Object.entries(personas as any)) {
      rows.push({
        demographic: demoValue,
        persona: personaType,
        count: (data as any).count || 0,
        percentage: `${((data as any).percentage || 0).toFixed(1)}%`
      })
    }
  }
  return rows
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

// Set up Supabase Realtime for live updates
const setupRealtime = () => {
  // Subscribe to recommendations changes
  const recommendationsChannel = supabase
    .channel('recommendations-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recommendations'
      },
      (payload) => {
        console.log('Recommendations changed:', payload)
        // Refresh data when recommendations change
        loadUsers()
        if (activeTab.value === 1) {
          loadFlagQueue()
        }
      }
    )
    .subscribe()
  
  // Subscribe to logs changes (for flag queue)
  const logsChannel = supabase
    .channel('logs-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'logs',
        filter: 'action_type=eq.recommendation_flagged'
      },
      (payload) => {
        console.log('Flag queue changed:', payload)
        if (activeTab.value === 1) {
          loadFlagQueue()
        }
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(recommendationsChannel)
    supabase.removeChannel(logsChannel)
  }
}

const checkOperatorAccess = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return false
    }
    
    // Verify operator access by attempting to query all users
    // RLS policies should restrict this to operators only
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Operator access check failed:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Operator access check error:', error)
    return false
  }
}

// Store cleanup function for realtime subscriptions
let cleanupRealtime: (() => void) | null = null

// Register cleanup hook at top level (before any async operations)
onUnmounted(() => {
  if (cleanupRealtime) {
    cleanupRealtime()
  }
})

onMounted(async () => {
  // Check operator access
  const hasAccess = await checkOperatorAccess()
  if (!hasAccess) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to access the operator dashboard.',
      color: 'red'
    })
    await navigateTo('/')
    return
  }
  
  // Get current user (operator)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    currentOperatorId.value = user.id
  }
  
  await loadUsers()
  await loadFlagQueue()
  await loadFairnessMetrics()
  
  // Set up realtime subscriptions
  cleanupRealtime = setupRealtime()
})
</script>

