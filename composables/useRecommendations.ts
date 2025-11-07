export const useRecommendations = () => {
  const fetchRecommendations = async (userId: string) => {
    try {
      const response = await $fetch<{
        education_items: any[]
        offers: any[]
      }>(`/api/recommendations?user_id=${userId}`)
      return response
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw error
    }
  }
  
  return {
    fetchRecommendations
  }
}

