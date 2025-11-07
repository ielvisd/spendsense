<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white shadow rounded-lg p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Welcome to SpendSense</h1>
        
        <!-- Registration Form -->
        <UForm v-if="!user" @submit="handleRegister" class="space-y-6">
          <UFormField label="Email" name="email" required>
            <UInput v-model="registerForm.email" type="email" placeholder="your@email.com" />
          </UFormField>
          
          <UFormField label="Password" name="password" required>
            <UInput v-model="registerForm.password" type="password" placeholder="••••••••" />
          </UFormField>
          
          <UButton type="submit" :loading="registering" block>
            Create Account
          </UButton>
        </UForm>
        
        <!-- Data Upload -->
        <div v-else class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold mb-4">Upload Your Data</h2>
            <p class="text-gray-600 mb-4">
              Upload your synthetic transaction data (JSON format) to get started.
            </p>
            
            <input
              type="file"
              accept=".json"
              @change="handleFileUpload"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <div v-if="uploadProgress" class="mt-4">
              <div class="bg-gray-200 rounded-full h-2.5">
                <div
                  class="bg-blue-600 h-2.5 rounded-full"
                  :style="{ width: uploadProgress + '%' }"
                ></div>
              </div>
              <p class="text-sm text-gray-600 mt-2">{{ uploadProgress }}% complete</p>
            </div>
          </div>
          
          <!-- Consent Checkbox -->
          <div class="border-t pt-6">
            <UCheckbox
              v-model="consentGranted"
              label="I consent to SpendSense analyzing my financial data to provide personalized recommendations"
            />
            <p class="text-sm text-gray-500 mt-2">
              You can revoke this consent at any time in your settings.
            </p>
          </div>
          
          <UButton
            @click="handleConsent"
            :disabled="!consentGranted || !dataUploaded"
            :loading="processing"
            block
          >
            Complete Onboarding
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const router = useRouter()

const user = ref(null)
const registering = ref(false)
const processing = ref(false)
const dataUploaded = ref(false)
const consentGranted = ref(false)
const uploadProgress = ref(0)

const registerForm = ref({
  email: '',
  password: ''
})

const handleRegister = async () => {
  registering.value = true
  try {
    const { data, error } = await supabase.auth.signUp({
      email: registerForm.value.email,
      password: registerForm.value.password
    })
    
    if (error) throw error
    
    user.value = data.user
  } catch (error: any) {
    alert('Registration failed: ' + error.message)
  } finally {
    registering.value = false
  }
}

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  processing.value = true
  uploadProgress.value = 10
  
  try {
    // Read file
    const text = await file.text()
    const data = JSON.parse(text)
    
    uploadProgress.value = 30
    
    // Upload to server
    const response = await $fetch('/api/ingest', {
      method: 'POST',
      body: { data }
    })
    
    uploadProgress.value = 100
    dataUploaded.value = true
    
    alert(`Successfully uploaded data for ${response.results.users} users`)
  } catch (error: any) {
    alert('Upload failed: ' + error.message)
  } finally {
    processing.value = false
    uploadProgress.value = 0
  }
}

const handleConsent = async () => {
  if (!user.value || !consentGranted.value) return
  
  processing.value = true
  try {
    const currentUser = user.value
    if (!currentUser?.id) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('User not authenticated')
      currentUser.id = authUser.id
    }
    
    await $fetch('/api/consent', {
      method: 'POST',
      body: {
        user_id: currentUser.id,
        consent_status: true
      }
    })
    
    // Trigger signal detection and persona assignment
    await $fetch('/api/signals', {
      method: 'GET',
      params: { user_id: currentUser.id }
    })
    
    await $fetch('/api/personas', {
      method: 'POST',
      body: { user_id: currentUser.id }
    })
    
    router.push('/')
  } catch (error: any) {
    alert('Error: ' + error.message)
  } finally {
    processing.value = false
  }
}
</script>

