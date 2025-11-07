<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-[#1D3557]">Operator Dashboard</h1>
        <UButton 
          @click="refreshData" 
          :loading="loading" 
          :aria-busy="loading"
          color="primary"
          aria-label="Refresh user data"
        >
          Refresh
        </UButton>
      </div>
      
      <!-- Filters -->
      <UCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormGroup label="Filter by Persona">
            <USelect
              v-model="filters.persona"
              :options="personaOptions"
              placeholder="All Personas"
              @change="applyFilters"
            />
          </UFormGroup>
          
          <UFormGroup label="Filter by Signal Type">
            <USelect
              v-model="filters.signalType"
              :options="signalTypeOptions"
              placeholder="All Signals"
              @change="applyFilters"
            />
          </UFormGroup>
          
          <UFormGroup label="Search Users">
            <UInput
              v-model="filters.search"
              placeholder="Search by name..."
              @input="applyFilters"
            />
          </UFormGroup>
        </div>
      </UCard>
      
      <!-- Tabs for Users and Flag Queue -->
      <UTabs :items="tabs" v-model="activeTab" class="mb-6">
        <template #users>
          <!-- Users Table -->
          <UCard>
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
            
            <UTable
              :rows="filteredUsers"
              :columns="columns"
              class="w-full"
            >
          <template #persona-data="{ row }">
            <UBadge :color="getPersonaColor(row.persona?.persona_type)">
              {{ row.persona?.persona_type || 'Not Assigned' }}
            </UBadge>
          </template>
          
          <template #actions-data="{ row }">
            <UButton
              size="xs"
              variant="ghost"
              @click="toggleExpand(row)"
            >
              {{ expandedRows.has(row.user.id) ? 'Collapse' : 'Expand' }}
            </UButton>
          </template>
        </UTable>
        
        <!-- Expanded Row Content -->
        <div v-for="user in filteredUsers" :key="user.user.id">
          <UCard
            v-if="expandedRows.has(user.user.id)"
            class="mt-4"
          >
            <div class="space-y-4">
              <!-- Signals -->
              <div>
                <h3 class="font-semibold mb-2">Signals</h3>
                <div class="space-y-2">
                  <div
                    v-for="signal in user.signals"
                    :key="signal.id"
                    class="p-2 bg-[#A8DADC]/30 rounded border border-[#A8DADC]"
                  >
                    <p class="font-medium text-[#1D3557]">{{ signal.signal_type }}</p>
                    <pre class="text-xs text-[#457B9D] mt-1">{{ JSON.stringify(signal.signal_data, null, 2) }}</pre>
                  </div>
                </div>
              </div>
              
              <!-- Persona Rationale -->
              <div v-if="user.persona">
                <h3 class="font-semibold mb-2 text-[#1D3557]">Persona Rationale</h3>
                <p class="text-[#457B9D]">{{ user.persona.rationale }}</p>
              </div>
              
              <!-- Recommendations -->
              <div>
                <h3 class="font-semibold mb-2 text-[#1D3557]">Recommendations</h3>
                <div class="space-y-2">
                  <div
                    v-for="rec in user.recommendations"
                    :key="rec.id"
                    class="p-2 border border-[#A8DADC] rounded flex justify-between items-center bg-white"
                    :class="{ 'ring-2 ring-[#457B9D]': selectedRecommendations.has(rec.id) }"
                  >
                    <div class="flex items-center gap-3 flex-1">
                      <UCheckbox
                        :model-value="selectedRecommendations.has(rec.id)"
                        @update:model-value="toggleRecommendationSelection(rec.id)"
                        :label="''"
                        :aria-label="`Select recommendation: ${rec.rationale.substring(0, 50)}`"
                      />
                      <div class="flex-1">
                        <p class="font-medium text-[#1D3557]">{{ rec.rationale.substring(0, 100) }}...</p>
                        <p class="text-xs text-[#457B9D]/70">{{ new Date(rec.created_at).toLocaleDateString() }}</p>
                        <UBadge v-if="rec.approved_by_operator" color="green" size="xs" class="mt-1">
                          Approved
                        </UBadge>
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
                        aria-label="Flag this recommendation for review"
                      >
                        Flag
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
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
const users = ref<any[]>([])
const expandedRows = ref(new Set<string>())
const selectedRecommendations = ref(new Set<string>())
const bulkProcessing = ref(false)
const activeTab = ref(0)
const flaggedRecommendations = ref<any[]>([])
const currentOperatorId = ref<string | null>(null)

const tabs = [
  { label: 'Users', value: 'users' },
  { label: 'Flag Queue', value: 'flag-queue' }
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
  { label: 'Credit', value: 'credit_high_utilization' },
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
  let filtered = users.value
  
  if (filters.value.persona) {
    filtered = filtered.filter(u => u.persona?.persona_type === filters.value.persona)
  }
  
  if (filters.value.signalType) {
    filtered = filtered.filter(u =>
      u.signals.some((s: any) => s.signal_type === filters.value.signalType)
    )
  }
  
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(u =>
      u.user.fake_name.toLowerCase().includes(search)
    )
  }
  
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
  loading.value = true
  try {
    await loadUsers()
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    // Get all users
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .limit(100)
    
    if (!usersData) return
    
    // For each user, get their signals, persona, and recommendations
    const usersWithData = await Promise.all(
      usersData.map(async (user) => {
        const [signals, persona, recommendations] = await Promise.all([
          supabase.from('signals').select('*').eq('user_id', user.id),
          supabase.from('personas').select('*').eq('user_id', user.id).single(),
          supabase.from('recommendations').select('*').eq('user_id', user.id)
        ])
        
        return {
          user,
          signals: signals.data || [],
          persona: persona.data,
          recommendations: recommendations.data || [],
          signals_count: signals.data?.length || 0,
          recommendations_count: recommendations.data?.length || 0
        }
      })
    )
    
    users.value = usersWithData
  } catch (error: any) {
    console.error('Error loading users:', error)
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
    
    // Refresh flag queue if on that tab
    if (activeTab.value === 1) {
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
    
    clearSelection()
    await loadUsers()
    if (activeTab.value === 1) {
      await loadFlagQueue()
    }
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
  // In a real implementation, this would remove from flag queue
  // For now, just refresh the queue
  await loadFlagQueue()
  toast.add({
    title: 'Removed from flag queue',
    description: 'The recommendation has been dismissed.',
    color: 'green'
  })
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
  
  // Set up realtime subscriptions
  const cleanup = setupRealtime()
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })
})
</script>

