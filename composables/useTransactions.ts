export const useTransactions = () => {
  const fetchTransactions = async (userId: string, options?: {
    limit?: number
    days?: number
  }) => {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        ...(options?.limit && { limit: options.limit.toString() }),
        ...(options?.days && { days: options.days.toString() })
      })
      
      const response = await $fetch<{
        transactions: any[]
        accounts: any[]
      }>(`/api/transactions?${params.toString()}`)
      
      return response
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  }
  
  return {
    fetchTransactions
  }
}

