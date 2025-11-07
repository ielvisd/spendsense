<template>
  <div class="min-h-screen bg-[#F1FAEE]">
    <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-[#1D3557] mb-8">Settings</h1>
      
      <!-- Consent Management -->
      <UCard class="mb-6 !bg-white shadow-lg">
        <template #header>
          <div class="border-b border-[#A8DADC] pb-3">
            <h2 class="text-xl font-bold text-[#1D3557]">Data Consent</h2>
          </div>
        </template>
        <div class="space-y-4 pt-4">
          <div>
            <p class="text-[#1D3557] font-medium mb-4">
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
              :aria-busy="revoking"
              aria-label="Revoke consent to data processing"
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
              :aria-busy="granting"
              aria-label="Grant consent to data processing"
            >
              Grant Consent
            </UButton>
          </div>
        </div>
      </UCard>
      
      <!-- Account Information -->
      <UCard class="!bg-white shadow-lg">
        <template #header>
          <div class="border-b border-[#A8DADC] pb-3">
            <h2 class="text-xl font-bold text-[#1D3557]">Account Information</h2>
          </div>
        </template>
        <div class="space-y-4 pt-4">
          <div>
            <p class="text-sm text-[#1D3557] font-semibold mb-1">Email</p>
            <p class="text-[#1D3557] font-medium">{{ userEmail }}</p>
          </div>
          <div>
            <p class="text-sm text-[#1D3557] font-semibold mb-1">User ID</p>
            <p class="text-[#1D3557] font-mono text-sm font-medium">{{ currentUserId }}</p>
          </div>
          <div class="pt-4 border-t border-[#A8DADC]">
            <UButton
              color="red"
              variant="outline"
              @click="handleLogout"
              :loading="loggingOut"
              :aria-busy="loggingOut"
              aria-label="Sign out of your account"
              block
            >
              Sign Out
            </UButton>
          </div>
        </div>
      </UCard>
      
      <!-- Revoke Consent Dialog -->
      <UModal v-model="showRevokeDialog">
        <UCard class="!bg-white">
          <template #header>
            <div class="border-b border-red-200 pb-3">
              <h3 class="text-lg font-bold text-red-600">Revoke Consent</h3>
            </div>
          </template>
          <div class="space-y-4 pt-4">
            <p class="text-[#1D3557] font-medium">
              Are you sure you want to revoke your consent? This action will:
            </p>
            <ul class="list-disc list-inside text-[#1D3557] space-y-2 font-medium">
              <li>Delete all your financial data</li>
              <li>Remove your persona assignment</li>
              <li>Stop generating recommendations</li>
            </ul>
            <p class="text-sm text-[#1D3557] font-semibold">
              This action cannot be undone.
            </p>
            <div class="flex gap-4 justify-end">
              <UButton 
                variant="outline" 
                @click="showRevokeDialog = false"
                aria-label="Cancel revoking consent"
              >
                Cancel
              </UButton>
              <UButton 
                color="red" 
                @click="revokeConsent" 
                :loading="revoking"
                :aria-busy="revoking"
                aria-label="Confirm revoke consent and delete data"
              >
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
const loggingOut = ref(false)

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

