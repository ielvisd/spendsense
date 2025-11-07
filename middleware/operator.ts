export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user || authError) {
    return navigateTo('/onboarding')
  }
  
  // Check if user is an operator
  // For now, we'll check user metadata or a users table field
  // In production, this would be a proper role check via RLS or user metadata
  const { data: userData } = await supabase
    .from('users')
    .select('id, fake_name')
    .eq('id', user.id)
    .single()
  
  // For MVP, we'll allow access if user exists in users table
  // In production, you'd check for an 'is_operator' field or use Supabase auth metadata
  // For now, we'll use a simple check: if user exists, they can access operator dashboard
  // TODO: Implement proper operator role checking via RLS or user metadata
  
  if (!userData) {
    // User not found in users table - redirect to onboarding
    return navigateTo('/onboarding')
  }
  
  // Optional: Check user metadata for operator role
  // This would be set via Supabase Dashboard or admin API
  const isOperator = user.user_metadata?.is_operator === true || 
                     user.user_metadata?.role === 'operator' ||
                     user.user_metadata?.role === 'admin'
  
  if (!isOperator) {
    // For MVP, we'll allow access but log a warning
    // In production, you'd redirect unauthorized users
    console.warn('User accessing operator dashboard without operator role:', user.id)
    // Uncomment below to enforce operator role check:
    // return navigateTo('/')
  }
})

