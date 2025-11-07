/**
 * Shared Type Definitions
 * 
 * Common types used across multiple utility modules to avoid duplication.
 */

export interface Transaction {
  amount: number
  merchant_name?: string
  date: string
}

export interface Account {
  id?: string
  account_id?: string
  type: string
  subtype?: string
  balances?: {
    current?: number
    limit?: number
  }
}

export interface Liability {
  type: string
  overdue?: boolean
  min_payment?: boolean
  interest_rate?: number
  apr?: number
  last_balance?: number
}

export interface Signal {
  signal_type: string
  signal_data: any
}

