import { faker } from '@faker-js/faker'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Set deterministic seed for reproducibility
faker.seed(123)

// Types
interface Demographics {
  age: number
  gender: 'M' | 'F' | 'Non-binary'
  annual_income: number
  ethnicity: string
  location: {
    state: string
    city: string
  }
  household_size: number
}

interface Account {
  account_id: string
  type: string
  subtype: string
  balances: {
    available: number
    current: number
    limit?: number
  }
  iso_currency_code: string
  holder_category?: string
}

interface Transaction {
  account_id: string // Reference to account account_id
  date: string
  amount: number
  merchant_name: string
  payment_channel: string
  personal_finance_category: {
    primary: string
    detailed: string
  }
  pending: boolean
}

interface Liability {
  type: string
  apr?: number
  interest_rate?: number
  min_payment?: number
  last_payment?: number
  overdue: boolean
  next_due?: string
  last_balance?: number
}

interface UserWithData {
  id: string
  fake_name: string
  demographics: Demographics
  accounts: Account[]
  transactions: Transaction[]
  liabilities: Liability[]
}

// Weighted random function
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }
  return items[items.length - 1]
}

// Generate weighted age distribution
function generateAge(): number {
  const rand = Math.random()
  if (rand < 0.4) {
    // 40% 18-34
    return faker.number.int({ min: 18, max: 34 })
  } else if (rand < 0.7) {
    // 30% 35-54
    return faker.number.int({ min: 35, max: 54 })
  } else {
    // 30% 55+
    return faker.number.int({ min: 55, max: 65 })
  }
}

// Generate demographics
function generateDemographics(): Demographics {
  const gender = weightedRandom(['M', 'F', 'Non-binary'] as const, [0.5, 0.45, 0.05])
  const age = generateAge()
  
  // Income brackets: 20% <$30k, 50% $30-80k, 30% >$80k
  const incomeBrackets = [20000, 50000, 100000, 150000]
  const incomeWeights = [0.2, 0.5, 0.2, 0.1]
  const baseIncome = weightedRandom(incomeBrackets, incomeWeights)
  const annual_income = baseIncome + faker.number.int({ min: -5000, max: 5000 })
  
  const ethnicity = weightedRandom(
    ['White', 'Black', 'Hispanic', 'Asian', 'Other'],
    [0.6, 0.13, 0.19, 0.06, 0.02]
  )
  
  // Household size: 40% singles, 40% couples, 20% families
  const householdSizeRand = Math.random()
  let household_size: number
  if (householdSizeRand < 0.4) {
    household_size = 1
  } else if (householdSizeRand < 0.8) {
    household_size = 2
  } else {
    household_size = faker.number.int({ min: 3, max: 6 })
  }
  
  return {
    age,
    gender,
    annual_income,
    ethnicity,
    location: {
      state: faker.location.state(),
      city: faker.location.city()
    },
    household_size
  }
}

// Generate accounts
function generateAccounts(demographics: Demographics): Account[] {
  const accounts: Account[] = []
  const numAccounts = faker.number.int({ min: 1, max: 3 })
  
  // Always have at least a checking account
  accounts.push({
    account_id: faker.string.uuid(),
    type: 'depository',
    subtype: 'checking',
    balances: {
      available: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
      current: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 })
    },
    iso_currency_code: 'USD',
    holder_category: 'individual'
  })
  
  // 70% have savings account
  if (Math.random() < 0.7) {
    accounts.push({
      account_id: faker.string.uuid(),
      type: 'depository',
      subtype: 'savings',
      balances: {
        available: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 }),
        current: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 })
      },
      iso_currency_code: 'USD',
      holder_category: 'individual'
    })
  }
  
  // 60% have credit card
  if (Math.random() < 0.6) {
    const creditLimit = demographics.annual_income * (faker.number.float({ min: 0.1, max: 0.3, fractionDigits: 2 }))
    const currentBalance = creditLimit * faker.number.float({ min: 0, max: 0.9, fractionDigits: 2 })
    
    accounts.push({
      account_id: faker.string.uuid(),
      type: 'credit',
      subtype: 'credit card',
      balances: {
        available: creditLimit - currentBalance,
        current: currentBalance,
        limit: creditLimit
      },
      iso_currency_code: 'USD',
      holder_category: 'individual'
    })
  }
  
  return accounts
}

// Generate transactions
function generateTransactions(accounts: Account[], demographics: Demographics): Transaction[] {
  const transactions: Transaction[] = []
  const categories = [
    { primary: 'FOOD_AND_DRINK', detailed: 'RESTAURANTS' },
    { primary: 'GENERAL_MERCHANDISE', detailed: 'ONLINE_MARKETPLACES' },
    { primary: 'GENERAL_MERCHANDISE', detailed: 'DEPARTMENT_STORES' },
    { primary: 'TRANSPORTATION', detailed: 'GAS_STATIONS' },
    { primary: 'TRANSPORTATION', detailed: 'PUBLIC_TRANSPORTATION' },
    { primary: 'FOOD_AND_DRINK', detailed: 'GROCERIES' },
    { primary: 'ENTERTAINMENT', detailed: 'MUSIC_AND_AUDIO' },
    { primary: 'ENTERTAINMENT', detailed: 'MOVIES_AND_DVDS' },
    { primary: 'GENERAL_SERVICES', detailed: 'ACCOUNTING_AND_FINANCIAL_PLANNING' },
    { primary: 'GENERAL_MERCHANDISE', detailed: 'SUPERSTORES' }
  ]
  
  const subscriptionMerchants = [
    'Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'Hulu',
    'Adobe Creative Cloud', 'Microsoft 365', 'Gym Membership', 'Apple iCloud'
  ]
  
  const payrollMerchants = ['PAYROLL', 'DIRECT DEPOSIT', 'EMPLOYER PAYROLL']
  
  for (const account of accounts) {
    if (account.type === 'credit') continue // Skip credit accounts for now
    
    const numTransactions = faker.number.int({ min: 50, max: 200 })
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 6) // Last 6 months
    
    for (let i = 0; i < numTransactions; i++) {
      const date = faker.date.between({ from: startDate, to: new Date() })
      const category = faker.helpers.arrayElement(categories)
      
      // Adjust amounts based on household size and income
      let baseAmount = faker.number.float({ min: 5, max: 200, fractionDigits: 2 })
      if (category.primary === 'FOOD_AND_DRINK' && category.detailed === 'GROCERIES') {
        baseAmount = baseAmount * demographics.household_size * 1.5
      }
      
      // 5% chance of payroll (check first)
      const isPayroll = Math.random() < 0.05
      let merchant_name: string
      if (isPayroll) {
        merchant_name = faker.helpers.arrayElement(payrollMerchants)
        baseAmount = demographics.annual_income / 24 // Bi-weekly pay
      } else {
        // 10% chance of subscription
        const isSubscription = Math.random() < 0.1
        merchant_name = isSubscription
          ? faker.helpers.arrayElement(subscriptionMerchants)
          : faker.company.name()
      }
      
      // 10% chance of pending
      const pending = Math.random() < 0.1
      
      transactions.push({
        account_id: account.account_id,
        date: date.toISOString().split('T')[0],
        amount: -Math.abs(baseAmount), // Negative for expenses
        merchant_name,
        payment_channel: faker.helpers.arrayElement(['online', 'in store', 'other']),
        personal_finance_category: category,
        pending
      })
    }
  }
  
  return transactions
}

// Generate liabilities
function generateLiabilities(demographics: Demographics, accounts: Account[]): Liability[] {
  const liabilities: Liability[] = []
  
  // Find credit card account
  const creditAccount = accounts.find(acc => acc.type === 'credit')
  
  if (creditAccount && creditAccount.balances.limit) {
    const utilization = creditAccount.balances.current! / creditAccount.balances.limit
    const apr = faker.number.float({ min: 15, max: 29, fractionDigits: 2 })
    const minPayment = creditAccount.balances.current! * 0.02 // 2% minimum
    
    liabilities.push({
      type: 'credit',
      apr,
      interest_rate: apr / 12, // Monthly
      min_payment: minPayment,
      last_payment: minPayment,
      overdue: utilization > 0.9 && Math.random() < 0.2, // 20% chance if high util
      next_due: faker.date.future({ years: 0.1 }).toISOString().split('T')[0],
      last_balance: creditAccount.balances.current
    })
  }
  
  // 30% have mortgage or loan
  if (Math.random() < 0.3) {
    const loanAmount = demographics.annual_income * faker.number.float({ min: 1, max: 3, fractionDigits: 1 })
    liabilities.push({
      type: Math.random() < 0.5 ? 'mortgage' : 'loan',
      apr: faker.number.float({ min: 3, max: 7, fractionDigits: 2 }),
      interest_rate: faker.number.float({ min: 0.25, max: 0.6, fractionDigits: 2 }),
      min_payment: loanAmount * 0.01, // 1% monthly
      last_payment: loanAmount * 0.01,
      overdue: Math.random() < 0.1,
      next_due: faker.date.future({ years: 0.1 }).toISOString().split('T')[0],
      last_balance: loanAmount * faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 })
    })
  }
  
  return liabilities
}

// Inject persona behaviors
function injectPersonaBehaviors(
  personaIndex: number,
  accounts: Account[],
  transactions: Transaction[],
  liabilities: Liability[]
): void {
  const persona = personaIndex % 5
  
  switch (persona) {
    case 0: // High Utilization
      {
        const creditAccount = accounts.find(acc => acc.type === 'credit')
        if (creditAccount && creditAccount.balances.limit) {
          // Set utilization to 68%
          creditAccount.balances.current = creditAccount.balances.limit * 0.68
          creditAccount.balances.available = creditAccount.balances.limit * 0.32
        }
        // Add overdue liability
        if (liabilities.length > 0) {
          liabilities[0].overdue = true
        }
      }
      break
      
    case 1: // Variable Income Budgeter
      // Add irregular payroll transactions
      const payrollTxns = transactions.filter(t => 
        t.merchant_name.includes('PAYROLL') || t.merchant_name.includes('DEPOSIT')
      )
      if (payrollTxns.length > 0) {
        // Make some payrolls larger, some smaller
        payrollTxns.forEach((txn, idx) => {
          if (idx % 2 === 0) {
            txn.amount = txn.amount * 1.5
          } else {
            txn.amount = txn.amount * 0.6
          }
        })
      }
      // Lower cash buffer
      const checking = accounts.find(acc => acc.subtype === 'checking')
      if (checking) {
        checking.balances.available = checking.balances.available * 0.3
        checking.balances.current = checking.balances.current * 0.3
      }
      break
      
    case 2: // Subscription-Heavy
      // Add more subscription transactions
      const subscriptionMerchants = ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'Hulu', 'Adobe Creative Cloud']
      const checkingAccount = accounts.find(acc => acc.subtype === 'checking')
      if (checkingAccount) {
        for (let i = 0; i < 8; i++) {
          transactions.push({
            account_id: checkingAccount.account_id,
            date: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
            amount: -faker.number.float({ min: 9.99, max: 29.99, fractionDigits: 2 }),
            merchant_name: faker.helpers.arrayElement(subscriptionMerchants),
            payment_channel: 'online',
            personal_finance_category: { primary: 'GENERAL_SERVICES', detailed: 'SOFTWARE' },
            pending: false
          })
        }
      }
      break
      
    case 3: // Savings Builder
      // Increase savings balance
      const savings = accounts.find(acc => acc.subtype === 'savings')
      if (savings) {
        savings.balances.available = savings.balances.available * 3
        savings.balances.current = savings.balances.current * 3
      }
      // Keep utilization low
      const creditAccount = accounts.find(acc => acc.type === 'credit')
      if (creditAccount && creditAccount.balances.limit) {
        creditAccount.balances.current = creditAccount.balances.limit * 0.15
        creditAccount.balances.available = creditAccount.balances.limit * 0.85
      }
      break
      
    case 4: // Impulse Spender
      // Add many small transactions
      const impulseAccount = accounts.find(acc => acc.subtype === 'checking')
      if (impulseAccount) {
        for (let i = 0; i < 30; i++) {
          transactions.push({
            account_id: impulseAccount.account_id,
            date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
            amount: -faker.number.float({ min: 3, max: 20, fractionDigits: 2 }),
            merchant_name: faker.company.name(),
            payment_channel: faker.helpers.arrayElement(['online', 'in store']),
            personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'RESTAURANTS' },
            pending: false
          })
        }
      }
      break
  }
}

// Main generation function
function generateData(): void {
  const numUsers = 75 // Mid-range
  const users: UserWithData[] = []
  
  for (let i = 0; i < numUsers; i++) {
    const demographics = generateDemographics()
    const fakeName = faker.person.fullName({
      sex: demographics.gender === 'M' ? 'male' : demographics.gender === 'F' ? 'female' : undefined
    })
    
    const accounts = generateAccounts(demographics)
    const transactions = generateTransactions(accounts, demographics)
    const liabilities = generateLiabilities(demographics, accounts)
    
    // Inject persona behaviors
    injectPersonaBehaviors(i, accounts, transactions, liabilities)
    
    users.push({
      id: faker.string.uuid(),
      fake_name: fakeName,
      demographics,
      accounts,
      transactions,
      liabilities
    })
  }
  
  // Write to file
  const outputPath = join(process.cwd(), 'public', 'synthetic-data.json')
  writeFileSync(outputPath, JSON.stringify(users, null, 2))
  console.log(`Generated ${numUsers} users with synthetic data`)
  console.log(`Output written to: ${outputPath}`)
}

// Run if executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  generateData()
}

export { generateData, type UserWithData, type Demographics, type Account, type Transaction, type Liability }

