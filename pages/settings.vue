<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-[#1D3557] mb-8">Settings</h1>
      
      <!-- Consent Management -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold">Data Consent</h2>
        </template>
        <div class="space-y-4">
          <div>
            <p class="text-[#457B9D] mb-4">
              You can revoke your consent to data processing at any time. Revoking consent will:
            </p>
            <ul class="list-disc list-inside text-[#1D3557] space-y-2 mb-4">
              <li>Stop generating new recommendations</li>
              <li>Delete your financial data from our system</li>
              <li>Remove your assigned persona</li>
            </ul>
          </div>
          
          <div v-if="consentStatus" class="flex items-center gap-4">
            <UBadge color="green">Consent Active</UBadge>
            <UButton
              color="red"
              variant="outline"
              @click="showRevokeDialog = true"
              :loading="revoking"
            >
              Revoke Consent
            </UButton>
          </div>
          <div v-else class="flex items-center gap-4">
            <UBadge color="gray">No Active Consent</UBadge>
            <UButton
              color="primary"
              @click="grantConsent"
              :loading="granting"
            >
              Grant Consent
            </UButton>
          </div>
        </div>
      </UCard>
      
      <!-- Account Information -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Account Information</h2>
        </template>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-[#457B9D] mb-1">Email</p>
            <p class="text-[#1D3557]">{{ userEmail }}</p>
          </div>
          <div>
            <p class="text-sm text-[#457B9D] mb-1">User ID</p>
            <p class="text-[#1D3557] font-mono text-sm">{{ currentUserId }}</p>
          </div>
        </div>
      </UCard>
      
      <!-- Revoke Consent Dialog -->
      <UModal v-model="showRevokeDialog">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-red-600">Revoke Consent</h3>
          </template>
          <div class="space-y-4">
            <p class="text-[#1D3557]">
              Are you sure you want to revoke your consent? This action will:
            </p>
            <ul class="list-disc list-inside text-[#1D3557] space-y-2">
              <li>Delete all your financial data</li>
              <li>Remove your persona assignment</li>
              <li>Stop generating recommendations</li>
            </ul>
            <p class="text-sm text-[#457B9D] italic">
              This action cannot be undone.
            </p>
            <div class="flex gap-4 justify-end">
              <UButton variant="outline" @click="showRevokeDialog = false">
                Cancel
              </UButton>
              <UButton color="red" @click="revokeConsent" :loading="revoking">
                Revoke Consent
              </UButton>
            </div>
          </div>
        </UCard>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'
import { useToast } from '#imports'

const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

const consentStatus = ref(false)
const currentUserId = ref<string | null>(null)
const userEmail = ref<string>('')
const revoking = ref(false)
const granting = ref(false)
const showRevokeDialog = ref(false)

const checkConsent = async () => {
  if (!currentUserId.value) return
  
  try {
    const { data } = await supabase
      .from('consent')
      .select('consent_status')
      .eq('user_id', currentUserId.value)
      .single()
    
    consentStatus.value = data?.consent_status || false
  } catch (error) {
    consentStatus.value = false
  }
}

const revokeConsent = async () => {
  if (!currentUserId.value) return
  
  revoking.value = true
  try {
    // Revoke consent
    await supabase
      .from('consent')
      .update({ consent_status: false })
      .eq('user_id', currentUserId.value)
    
    // Delete user data (transactions, accounts, liabilities, signals, personas, recommendations)
    const tables = ['transactions', 'accounts', 'liabilities', 'signals', 'personas', 'recommendations']
    
    for (const table of tables) {
      // Get related records first
      if (table === 'transactions') {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', currentUserId.value)
        
        if (accounts && accounts.length > 0) {
          const accountIds = accounts.map(a => a.id)
          await supabase
            .from('transactions')
            .delete()
            .in('account_id', accountIds)
        }
      } else {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', currentUserId.value)
      }
    }
    
    // Delete accounts last (after transactions)
    await supabase
      .from('accounts')
      .delete()
      .eq('user_id', currentUserId.value)
    
    consentStatus.value = false
    showRevokeDialog.value = false
    
    toast.add({
      title: 'Consent revoked',
      description: 'Your data has been deleted. Redirecting to onboarding...',
      color: 'green'
    })
    
    setTimeout(() => {
      router.push('/onboarding')
    }, 2000)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'red'
    })
  } finally {
    revoking.value = false
  }
}

const grantConsent = async () => {
  if (!currentUserId.value) return
  
  granting.value = true
  try {
    await supabase
      .from('consent')
      .upsert({
        user_id: currentUserId.value,
        consent_status: true,
        granted_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
    
    consentStatus.value = true
    
    toast.add({
      title: 'Consent granted',
      description: 'You can now receive personalized recommendations.',
      color: 'green'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'red'
    })
  } finally {
    granting.value = false
  }
}

onMounted(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/onboarding')
      return
    }
    
    currentUserId.value = user.id
    userEmail.value = user.email || ''
    await checkConsent()
  } catch (error) {
    router.push('/onboarding')
  }
})
</script>

