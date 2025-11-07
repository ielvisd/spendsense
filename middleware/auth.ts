export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return navigateTo('/onboarding')
  }
})

