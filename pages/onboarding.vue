<template>
  <div class="min-h-screen bg-[#F1FAEE] py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white shadow-lg rounded-lg p-8 border border-[#A8DADC]">
        <h1 class="text-3xl font-bold text-[#1D3557] mb-6">Welcome to SpendSense</h1>
        
        <!-- Registration Form -->
        <UForm v-if="!user" :state="registerForm" @submit="handleRegister" class="space-y-6" aria-label="Registration form">
          <UFormField label="Email" name="email" required>
            <UInput 
              v-model="registerForm.email" 
              type="email" 
              placeholder="your@email.com"
              color="primary"
              aria-label="Email address"
              aria-required="true"
              aria-describedby="email-description"
            />
          </UFormField>
          <p id="email-description" class="sr-only">Enter your email address to create an account</p>
          
          <UFormField label="Password" name="password" required>
            <UInput 
              v-model="registerForm.password" 
              type="password" 
              placeholder="••••••••"
              color="primary"
              aria-label="Password"
              aria-required="true"
              aria-describedby="password-description"
            />
          </UFormField>
          <p id="password-description" class="sr-only">Enter a secure password for your account</p>
          
          <UButton 
            type="submit" 
            :loading="registering" 
            :aria-busy="registering"
            block 
            color="primary" 
            class="bg-[#457B9D] hover:bg-[#3d6d8d] text-white"
            aria-label="Create account"
          >
            Create Account
          </UButton>
        </UForm>
        
        <!-- Data Upload -->
        <div v-else class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold mb-4 text-[#1D3557]">Upload Your Data</h2>
            <p class="text-[#457B9D] mb-4">
              Upload your synthetic transaction data (JSON or CSV format) to get started.
            </p>
            
            <input
              type="file"
              accept=".json,.csv"
              @change="handleFileUpload"
              class="block w-full text-sm text-[#1D3557] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#A8DADC] file:text-[#1D3557] hover:file:bg-[#457B9D] hover:file:text-white"
              aria-label="Upload financial data file"
              aria-describedby="file-upload-description"
            />
            <p id="file-upload-description" class="text-sm text-[#457B9D] mt-2">Supported formats: JSON, CSV</p>
            
            <div v-if="uploadProgress" class="mt-4" role="progressbar" aria-valuenow="uploadProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress">
              <div class="bg-[#A8DADC] rounded-full h-2.5">
                <div
                  class="bg-[#457B9D] h-2.5 rounded-full transition-all duration-300"
                  :style="{ width: uploadProgress + '%' }"
                  aria-hidden="true"
                ></div>
              </div>
              <p class="text-sm text-[#457B9D] mt-2" aria-live="polite">{{ uploadProgress }}% complete</p>
            </div>
          </div>
          
          <!-- Consent Checkbox -->
          <div class="border-t pt-6">
            <UCheckbox
              v-model="consentGranted"
              label="I consent to SpendSense analyzing my financial data to provide personalized recommendations"
              aria-label="Consent to data analysis"
              aria-describedby="consent-description"
            />
            <p id="consent-description" class="text-sm text-[#1D3557]/70 mt-2">
              You can revoke this consent at any time in your settings.
            </p>
          </div>
          
          <UButton
            @click="handleConsent"
            :disabled="!consentGranted || !dataUploaded"
            :loading="processing"
            :aria-busy="processing"
            :aria-disabled="!consentGranted || !dataUploaded"
            block
            color="primary"
            class="bg-[#457B9D] hover:bg-[#3d6d8d] text-white disabled:opacity-50"
            aria-label="Complete onboarding and grant consent"
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
import { useToast } from '#imports'

definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

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

const handleRegister = async (event: any) => {
  registering.value = true
  try {
    const formData = event.data || registerForm.value
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password
    })
    
    if (error) throw error
    
    user.value = data.user
    toast.add({
      title: 'Account created!',
      description: 'Please upload your data to continue.',
      color: 'green'
    })
  } catch (error: any) {
    toast.add({
      title: 'Registration failed',
      description: error.message,
      color: 'red'
    })
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
    const text = await file.text()
    let data: any
    
    // Handle CSV files
    if (file.name.endsWith('.csv')) {
      uploadProgress.value = 20
      // Send CSV file to server for parsing
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await $fetch('/api/ingest', {
        method: 'POST',
        body: formData
      })
      
      uploadProgress.value = 100
      dataUploaded.value = true
      
      toast.add({
        title: 'Upload successful!',
        description: `Successfully uploaded data for ${response.results.users} users`,
        color: 'green'
      })
      return
    }
    
    // Handle JSON files
    uploadProgress.value = 20
    data = JSON.parse(text)
    
    uploadProgress.value = 30
    
    // Upload to server
    const response = await $fetch('/api/ingest', {
      method: 'POST',
      body: { data }
    })
    
    uploadProgress.value = 100
    dataUploaded.value = true
    
    toast.add({
      title: 'Upload successful!',
      description: `Successfully uploaded data for ${response.results.users} users`,
      color: 'green'
    })
  } catch (error: any) {
    toast.add({
      title: 'Upload failed',
      description: error.message,
      color: 'red'
    })
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
    
    toast.add({
      title: 'Onboarding complete!',
      description: 'Redirecting to your dashboard...',
      color: 'green'
    })
    
    // Small delay to show toast before redirect
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'red'
    })
  } finally {
    processing.value = false
  }
}
</script>

