<template>
  <div class="min-h-screen bg-gradient-to-br from-[#F1FAEE] via-[#E8F5E9] to-[#F1FAEE] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-[#A8DADC] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-[#457B9D] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#E63946] rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
    </div>

    <div class="max-w-lg mx-auto relative z-10">
      <!-- Logo/Brand Section -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#457B9D] to-[#1D3557] rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-[#1D3557] mb-2 tracking-tight">
          Welcome to <span class="bg-gradient-to-r from-[#457B9D] to-[#1D3557] bg-clip-text text-transparent">SpendSense</span>
        </h1>
        <p class="text-[#457B9D] text-sm font-medium">Take control of your finances</p>
      </div>

      <!-- Registration Form Card -->
      <div class="max-w-sm mx-auto bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-[#A8DADC]/50 transform transition-all duration-300 hover:shadow-3xl">
        <UForm v-if="!user" :state="registerForm" @submit="handleRegister" class="space-y-5 w-full" aria-label="Registration form">
          <UFormField label="Email" name="email" required class="w-full">
            <UInput 
              v-model="registerForm.email" 
              type="email" 
              placeholder="your@email.com"
              color="primary"
              size="lg"
              icon="i-lucide-mail"
              aria-label="Email address"
              aria-required="true"
              aria-describedby="email-description"
              class="transition-all duration-200 w-full"
            />
          </UFormField>
          <p id="email-description" class="sr-only">Enter your email address to create an account</p>
          
          <UFormField label="Password" name="password" required class="w-full">
            <UInput 
              v-model="registerForm.password" 
              type="password" 
              placeholder="••••••••"
              color="primary"
              size="lg"
              icon="i-lucide-lock"
              aria-label="Password"
              aria-required="true"
              aria-describedby="password-description"
              class="transition-all duration-200 w-full"
            />
          </UFormField>
          <p id="password-description" class="sr-only">Enter a secure password for your account</p>
          
          <div class="pt-3 w-full">
            <UButton 
              type="submit" 
              :loading="registering" 
              :aria-busy="registering"
              block 
              size="lg"
              color="primary" 
              class="bg-gradient-to-r from-[#457B9D] to-[#3d6d8d] hover:from-[#3d6d8d] hover:to-[#345a7a] text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 w-full"
              aria-label="Create account"
            >
              <span v-if="!registering">Create Account</span>
              <span v-else>Creating...</span>
            </UButton>
          </div>
        </UForm>
        
        <!-- Data Upload -->
        <div v-else class="space-y-6">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#A8DADC] to-[#457B9D] rounded-xl mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-2 text-[#1D3557]">Upload Your Data</h2>
            <p class="text-[#457B9D] text-sm">
              Upload your transaction data to get personalized insights
            </p>
          </div>
          
          <div class="border-2 border-dashed border-[#A8DADC] rounded-xl p-6 hover:border-[#457B9D] transition-colors duration-200 bg-[#F1FAEE]/30">
            <input
              type="file"
              accept=".json,.csv"
              @change="handleFileUpload"
              class="block w-full text-sm text-[#1D3557] file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-[#457B9D] file:to-[#3d6d8d] file:text-white hover:file:from-[#3d6d8d] hover:file:to-[#345a7a] file:cursor-pointer file:transition-all file:duration-200 file:shadow-md hover:file:shadow-lg"
              aria-label="Upload financial data file"
              aria-describedby="file-upload-description"
            />
            <p id="file-upload-description" class="text-xs text-[#457B9D] mt-3 text-center">Supported formats: JSON, CSV</p>
          </div>
          
          <div v-if="uploadProgress" class="space-y-2" role="progressbar" aria-valuenow="uploadProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress">
            <div class="bg-[#A8DADC]/30 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                class="bg-gradient-to-r from-[#457B9D] to-[#3d6d8d] h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                :style="{ width: uploadProgress + '%' }"
                aria-hidden="true"
              ></div>
            </div>
            <p class="text-sm text-[#457B9D] font-medium text-center" aria-live="polite">{{ uploadProgress }}% complete</p>
          </div>
          
          <!-- Consent Checkbox -->
          <div class="border-t border-[#A8DADC] pt-6 mt-6">
            <div class="bg-[#F1FAEE]/50 rounded-lg p-4 border border-[#A8DADC]/30">
              <UCheckbox
                v-model="consentGranted"
                label="I consent to SpendSense analyzing my financial data to provide personalized recommendations"
                aria-label="Consent to data analysis"
                aria-describedby="consent-description"
                class="text-[#1D3557]"
              />
              <p id="consent-description" class="text-xs text-[#1D3557]/70 mt-2 ml-6">
                You can revoke this consent at any time in your settings.
              </p>
            </div>
          </div>
          
          <div class="pt-2">
            <UButton
              @click="handleConsent"
              :disabled="!consentGranted || !dataUploaded"
              :loading="processing"
              :aria-busy="processing"
              :aria-disabled="!consentGranted || !dataUploaded"
              block
              size="lg"
              color="primary"
              class="bg-gradient-to-r from-[#457B9D] to-[#3d6d8d] hover:from-[#3d6d8d] hover:to-[#345a7a] text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Complete onboarding and grant consent"
            >
              <span v-if="!processing">Complete Onboarding</span>
              <span v-else>Processing...</span>
            </UButton>
          </div>
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

const user = ref<any>(null)
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
    
    // Use server-side endpoint to avoid CORS issues
    const response = await $fetch<any>('/api/auth/signup', {
      method: 'POST',
      body: {
        email: formData.email,
        password: formData.password
      }
    })
    
    // Check if the response contains an error
    if (response.error) {
      throw new Error(response.message || 'Registration failed')
    }
    
    // Check if email confirmation is required
    if (response.user && !response.session) {
      // Email confirmation required
      toast.add({
        title: 'Check your email!',
        description: 'We sent you a confirmation link. Please check your email to verify your account.',
        color: 'info'
      })
      // Still set user to allow them to proceed (they'll need to confirm later)
      user.value = response.user
    } else if (response.user && response.session) {
      // No email confirmation required, user is logged in
      // Set the session in the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token
      })
      
      if (sessionError) throw sessionError
      
      user.value = response.user
      toast.add({
        title: 'Account created!',
        description: 'Please upload your data to continue.',
        color: 'success'
      })
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    // Extract error message from various possible locations
    let errorMessage = 'An error occurred during registration. Please try again.'
    
    if (error.data) {
      // Nuxt $fetch error structure
      errorMessage = error.data.message || errorMessage
    } else if (error.response) {
      // Standard fetch error structure
      errorMessage = error.response._data?.message || error.response.message || errorMessage
    } else if (error.message) {
      errorMessage = error.message
    }
    
    console.error('Error details:', {
      error,
      data: error.data,
      response: error.response,
      message: errorMessage
    })
    
    toast.add({
      title: 'Registration failed',
      description: errorMessage,
      color: 'error'
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
    // Get current user ID for file storage
    let currentUserId: string | null = null
    if (user.value?.id) {
      currentUserId = user.value.id
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      currentUserId = authUser?.id || null
    }
    
    // Handle CSV files
    if (file.name.endsWith('.csv')) {
      uploadProgress.value = 20
      // Send CSV file to server for parsing and storage
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await $fetch('/api/ingest', {
        method: 'POST',
        body: formData,
        params: currentUserId ? { user_id: currentUserId } : {}
      })
      
      uploadProgress.value = 100
      dataUploaded.value = true
      
      const fileInfo = response.file_stored 
        ? ` File stored: ${response.file_name || 'uploaded file'}`
        : ''
      
      toast.add({
        title: 'Upload successful!',
        description: `Successfully uploaded data for ${response.results.users} users.${fileInfo}`,
        color: 'success'
      })
      return
    }
    
    // Handle JSON files
    uploadProgress.value = 20
    const text = await file.text()
    const data = JSON.parse(text)
    
    uploadProgress.value = 30
    
    // Upload to server (will store file automatically)
    const response = await $fetch('/api/ingest', {
      method: 'POST',
      body: { data },
      params: currentUserId ? { user_id: currentUserId } : {}
    })
    
    uploadProgress.value = 100
    dataUploaded.value = true
    
    const fileInfo = response.file_stored 
      ? ` File stored: ${response.file_name || 'uploaded file'}`
      : ''
    
    toast.add({
      title: 'Upload successful!',
      description: `Successfully uploaded data for ${response.results.users} users.${fileInfo}`,
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Upload failed',
      description: error.message,
      color: 'error'
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
      color: 'success'
    })
    
    // Small delay to show toast before redirect
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'error'
    })
  } finally {
    processing.value = false
  }
}
</script>

