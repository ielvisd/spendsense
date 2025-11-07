export const usePersonas = () => {
  const assignPersona = async (userId: string) => {
    try {
      const response = await $fetch<{ persona: { type: string; rationale: string } }>('/api/personas', {
        method: 'POST',
        body: { user_id: userId }
      })
      return response.persona
    } catch (error) {
      console.error('Error assigning persona:', error)
      throw error
    }
  }
  
  const getPersona = async (userId: string) => {
    try {
      // This would fetch from database - for now return null
      // In a real implementation, query the personas table
      return null
    } catch (error) {
      console.error('Error fetching persona:', error)
      throw error
    }
  }
  
  return {
    assignPersona,
    getPersona
  }
}

