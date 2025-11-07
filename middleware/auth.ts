export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return navigateTo('/onboarding')
  }
  
  // Check if user has completed onboarding (granted consent)
  const { data: consentData } = await supabase
    .from('consent')
    .select('consent_status')
    .eq('user_id', user.id)
    .single()
  
  // If no consent record exists or consent_status is false/null, redirect to onboarding
  if (!consentData || !consentData.consent_status) {
    return navigateTo('/onboarding')
  }
})

