<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Your Financial Dashboard</h1>
      
      <!-- Persona Card -->
      <UCard v-if="persona" class="mb-8">
        <template #header>
          <h2 class="text-xl font-semibold">Your Financial Persona</h2>
        </template>
        <div>
          <p class="text-lg font-medium mb-2">{{ personaTypeLabel }}</p>
          <p class="text-gray-600">{{ persona.rationale }}</p>
        </div>
      </UCard>
      
      <!-- Education Items -->
      <div v-if="recommendations?.education_items?.length" class="mb-8">
        <h2 class="text-2xl font-semibold mb-4">Educational Resources</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UCard
            v-for="(item, index) in recommendations.education_items"
            :key="index"
            class="h-full"
          >
            <template #header>
              <h3 class="font-semibold">{{ item.title || 'Financial Tip' }}</h3>
            </template>
            <p class="text-gray-600 mb-4">{{ item.rationale }}</p>
            <p class="text-sm text-gray-500 italic">
              This is educational content, not financial advice. Consult a licensed advisor.
            </p>
          </UCard>
        </div>
      </div>
      
      <!-- Offers -->
      <div v-if="recommendations?.offers?.length" class="mb-8">
        <h2 class="text-2xl font-semibold mb-4">Personalized Offers</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UCard
            v-for="(offer, index) in recommendations.offers"
            :key="index"
            class="h-full"
          >
            <template #header>
              <h3 class="font-semibold">{{ offer.offer_data?.provider || 'Offer' }}</h3>
            </template>
            <p class="text-gray-600 mb-2">{{ offer.offer_data?.description }}</p>
            <p class="text-sm text-gray-700 font-medium mb-4">{{ offer.rationale }}</p>
            <UButton variant="outline" size="sm">Learn More</UButton>
          </UCard>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading your recommendations...</p>
      </div>
      
      <!-- Error State -->
      <UAlert v-if="error" color="red" variant="soft" class="mb-8">
        {{ error }}
      </UAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { usePersonas } from '~/composables/usePersonas'
import { useRecommendations } from '~/composables/useRecommendations'

const supabase = useSupabaseClient()
const { getPersona } = usePersonas()
const { fetchRecommendations } = useRecommendations()

const persona = ref<any>(null)
const recommendations = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

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

onMounted(async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Please log in to view your dashboard'
      loading.value = false
      return
    }
    
    // Get persona
    const { data: personaData } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    persona.value = personaData
    
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

