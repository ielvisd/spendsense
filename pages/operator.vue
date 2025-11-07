<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-[#1D3557]">Operator Dashboard</h1>
        <UButton @click="refreshData" :loading="loading" color="primary">Refresh</UButton>
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
      
      <!-- Users Table -->
      <UCard>
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
                  >
                    <div>
                      <p class="font-medium text-[#1D3557]">{{ rec.rationale.substring(0, 100) }}...</p>
                      <p class="text-xs text-[#457B9D]/70">{{ new Date(rec.created_at).toLocaleDateString() }}</p>
                    </div>
                    <div class="flex gap-2">
                      <UButton
                        size="xs"
                        color="primary"
                        @click="approveRecommendation(rec.id)"
                      >
                        Approve
                      </UButton>
                      <UButton
                        size="xs"
                        color="error"
                        variant="outline"
                        @click="flagRecommendation(rec.id)"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const loading = ref(false)
const users = ref<any[]>([])
const expandedRows = ref(new Set<string>())

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

const approveRecommendation = async (recId: string) => {
  try {
    // In a real implementation, this would update the recommendation
    alert('Recommendation approved (implementation pending)')
  } catch (error: any) {
    alert('Error: ' + error.message)
  }
}

const flagRecommendation = async (recId: string) => {
  try {
    // In a real implementation, this would flag the recommendation
    alert('Recommendation flagged (implementation pending)')
  } catch (error: any) {
    alert('Error: ' + error.message)
  }
}

onMounted(() => {
  loadUsers()
})
</script>

