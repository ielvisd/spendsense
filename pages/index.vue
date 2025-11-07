<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-[#1D3557]">Your Financial Dashboard</h1>
        <UButton to="/settings" variant="outline" color="primary" aria-label="Go to settings page" class="w-full sm:w-auto">
          Settings
        </UButton>
      </div>
      
      <!-- Persona Card -->
      <UCard v-if="persona" class="mb-8">
        <template #header>
          <h2 class="text-xl font-semibold">Your Financial Persona</h2>
        </template>
        <div>
          <p class="text-lg font-medium mb-2">{{ personaTypeLabel }}</p>
          <p class="text-[#457B9D]">{{ persona.rationale }}</p>
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
            <p class="text-[#457B9D] mb-4">{{ item.rationale }}</p>
            <p class="text-sm text-[#1D3557]/70 italic">
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
            <p class="text-[#457B9D] mb-2">{{ offer.offer_data?.description }}</p>
            <p class="text-sm text-[#1D3557] font-medium mb-4">{{ offer.rationale }}</p>
            <UButton 
              variant="outline" 
              size="sm" 
              color="primary"
              :aria-label="`Learn more about ${offer.offer_data?.provider || 'this offer'}`"
            >
              Learn More
            </UButton>
          </UCard>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12" role="status" aria-live="polite" aria-busy="true">
        <p class="text-[#457B9D]">Loading your recommendations...</p>
      </div>
      
      <!-- Error State -->
      <UAlert v-if="error" color="error" variant="soft" class="mb-8" role="alert" aria-live="assertive">
        {{ error }}
      </UAlert>
      
      <!-- Financial Calculators -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4">Financial Calculators</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DebtPayoffCalculator />
          <SavingsGoalCalculator />
        </div>
      </div>
      
      <!-- Feedback Section -->
      <UCard class="mt-8">
        <template #header>
          <h2 class="text-xl font-semibold">Help Us Improve</h2>
        </template>
        <div class="space-y-4">
          <p class="text-[#457B9D]">How helpful are these recommendations?</p>
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
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { usePersonas } from '~/composables/usePersonas'
import { useRecommendations } from '~/composables/useRecommendations'
import { useToast } from '#imports'

const supabase = useSupabaseClient()
const toast = useToast()
const { getPersona } = usePersonas()
const { fetchRecommendations } = useRecommendations()

const persona = ref<any>(null)
const recommendations = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const currentUserId = ref<string | null>(null)

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

