export const useSignals = () => {
  const fetchSignals = async (userId: string) => {
    try {
      const response = await $fetch<{ signals: any[] }>(`/api/signals?user_id=${userId}`)
      return response.signals
    } catch (error) {
      console.error('Error fetching signals:', error)
      throw error
    }
  }
  
  return {
    fetchSignals
  }
}

