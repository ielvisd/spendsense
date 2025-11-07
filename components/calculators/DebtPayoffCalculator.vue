<template>
  <UCard class="!bg-white shadow-md">
    <template #header>
      <div class="border-b border-[#A8DADC] pb-2">
        <h3 class="text-lg font-bold text-[#1D3557]">Debt Payoff Calculator</h3>
      </div>
    </template>
    
    <div class="space-y-4">
      <p class="text-sm text-[#1D3557] font-medium">
        Calculate how long it will take to pay off your debt and how much interest you'll pay.
      </p>
      
      <UFormField label="Current Balance ($)" name="balance" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="balance"
          type="number"
          min="0"
          step="0.01"
          placeholder="5000"
          :disabled="calculating"
          aria-label="Current debt balance in dollars"
          aria-required="true"
        />
      </UFormField>
      
      <UFormField label="Annual Interest Rate (%)" name="interestRate" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="interestRate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="18.99"
          :disabled="calculating"
          aria-label="Annual interest rate percentage"
          aria-required="true"
        />
      </UFormField>
      
      <UFormField label="Monthly Payment ($)" name="monthlyPayment" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="monthlyPayment"
          type="number"
          min="0"
          step="0.01"
          placeholder="200"
          :disabled="calculating"
          aria-label="Monthly payment amount in dollars"
          aria-required="true"
        />
      </UFormField>
      
      <UButton
        @click="calculate"
        :loading="calculating"
        :aria-busy="calculating"
        color="primary"
        block
        aria-label="Calculate debt payoff timeline"
      >
        Calculate
      </UButton>
      
      <div v-if="result" class="mt-6 p-4 bg-[#A8DADC] rounded-lg space-y-2" role="region" aria-label="Debt payoff calculation results">
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Months to Pay Off:</span>
          <span class="text-[#1D3557] font-bold">{{ result.months }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Total Interest Paid:</span>
          <span class="text-[#1D3557] font-bold">${{ result.totalInterest.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Total Amount Paid:</span>
          <span class="text-[#1D3557] font-bold">${{ result.totalPaid.toFixed(2) }}</span>
        </div>
        <div v-if="result.months > 0" class="mt-4 pt-4 border-t border-[#457B9D]">
          <p class="text-sm text-[#1D3557]">
            <strong>Tip:</strong> Paying an extra ${{ (monthlyPayment * 0.1).toFixed(2) }} per month 
            would save you approximately ${{ (result.totalInterest * 0.15).toFixed(2) }} in interest.
          </p>
        </div>
      </div>
      
      <UAlert
        v-if="error"
        color="red"
        variant="soft"
        :title="error"
        class="mt-4"
        role="alert"
        aria-live="assertive"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const balance = ref<number>(0)
const interestRate = ref<number>(0)
const monthlyPayment = ref<number>(0)
const calculating = ref(false)
const error = ref<string | null>(null)

interface CalculationResult {
  months: number
  totalInterest: number
  totalPaid: number
}

const result = ref<CalculationResult | null>(null)

function calculate() {
  error.value = null
  result.value = null
  
  // Validation
  if (balance.value <= 0) {
    error.value = 'Please enter a valid balance greater than 0'
    return
  }
  
  if (interestRate.value < 0 || interestRate.value > 100) {
    error.value = 'Please enter a valid interest rate between 0 and 100'
    return
  }
  
  if (monthlyPayment.value <= 0) {
    error.value = 'Please enter a valid monthly payment greater than 0'
    return
  }
  
  const monthlyRate = interestRate.value / 100 / 12
  let currentBalance = balance.value
  let totalInterest = 0
  let months = 0
  const maxMonths = 600 // 50 years max
  
  // Calculate using amortization formula
  if (monthlyRate > 0) {
    // If payment is less than interest, debt will never be paid off
    if (monthlyPayment.value <= currentBalance * monthlyRate) {
      error.value = 'Monthly payment is too low. You need to pay at least the interest each month.'
      return
    }
    
    // Use amortization formula: n = -log(1 - (PV * r) / PMT) / log(1 + r)
    const numerator = Math.log(1 - (currentBalance * monthlyRate) / monthlyPayment.value)
    const denominator = Math.log(1 + monthlyRate)
    months = Math.ceil(-numerator / denominator)
    
    // Calculate total interest by simulating payments
    currentBalance = balance.value
    totalInterest = 0
    
    for (let i = 0; i < months && currentBalance > 0.01; i++) {
      const interestPayment = currentBalance * monthlyRate
      const principalPayment = monthlyPayment.value - interestPayment
      totalInterest += interestPayment
      currentBalance -= principalPayment
    }
  } else {
    // No interest - simple division
    months = Math.ceil(balance.value / monthlyPayment.value)
    totalInterest = 0
  }
  
  if (months > maxMonths) {
    error.value = `This would take over ${maxMonths / 12} years to pay off. Consider increasing your monthly payment.`
    return
  }
  
  result.value = {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: balance.value + Math.round(totalInterest * 100) / 100
  }
}
</script>

