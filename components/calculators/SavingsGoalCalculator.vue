<template>
  <UCard class="!bg-white shadow-md">
    <template #header>
      <div class="border-b border-[#A8DADC] pb-2">
        <h3 class="text-lg font-bold text-[#1D3557]">Savings Goal Calculator</h3>
      </div>
    </template>
    
    <div class="space-y-4">
      <p class="text-sm text-[#1D3557] font-medium">
        Calculate how much you need to save monthly to reach your savings goal.
      </p>
      
      <UFormField label="Goal Amount ($)" name="goalAmount" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="goalAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="10000"
          :disabled="calculating"
          aria-label="Savings goal amount in dollars"
          aria-required="true"
        />
      </UFormField>
      
      <UFormField label="Current Savings ($)" name="currentSavings" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="currentSavings"
          type="number"
          min="0"
          step="0.01"
          placeholder="1000"
          :disabled="calculating"
          aria-label="Current savings amount in dollars"
        />
      </UFormField>
      
      <UFormField label="Annual Interest Rate (%)" name="interestRate" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="interestRate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="2.5"
          :disabled="calculating"
          aria-label="Annual interest rate percentage"
        />
      </UFormField>
      
      <UFormField label="Target Date (months from now)" name="months" class="[&_label]:text-[#1D3557]">
        <UInput
          v-model.number="months"
          type="number"
          min="1"
          step="1"
          placeholder="12"
          :disabled="calculating"
          aria-label="Target date in months from now"
          aria-required="true"
        />
      </UFormField>
      
      <UButton
        @click="calculate"
        :loading="calculating"
        :aria-busy="calculating"
        color="primary"
        block
        aria-label="Calculate monthly savings needed"
      >
        Calculate
      </UButton>
      
      <div v-if="result" class="mt-6 p-4 bg-[#A8DADC] rounded-lg space-y-2" role="region" aria-label="Savings goal calculation results">
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Monthly Savings Needed:</span>
          <span class="text-[#1D3557] font-bold">${{ result.monthlyPayment.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Total Saved:</span>
          <span class="text-[#1D3557] font-bold">${{ result.totalSaved.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#1D3557] font-medium">Interest Earned:</span>
          <span class="text-[#1D3557] font-bold">${{ result.interestEarned.toFixed(2) }}</span>
        </div>
        <div class="mt-4 pt-4 border-t border-[#457B9D]">
          <p class="text-sm text-[#1D3557]">
            <strong>Tip:</strong> Saving ${{ (result.monthlyPayment * 1.1).toFixed(2) }} per month 
            would help you reach your goal {{ Math.max(1, Math.floor(months * 0.9)) }} months earlier.
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

const goalAmount = ref<number>(0)
const currentSavings = ref<number>(0)
const interestRate = ref<number>(0)
const months = ref<number>(0)
const calculating = ref(false)
const error = ref<string | null>(null)

interface CalculationResult {
  monthlyPayment: number
  totalSaved: number
  interestEarned: number
}

const result = ref<CalculationResult | null>(null)

function calculate() {
  error.value = null
  result.value = null
  
  // Validation
  if (goalAmount.value <= 0) {
    error.value = 'Please enter a valid goal amount greater than 0'
    return
  }
  
  if (currentSavings.value < 0) {
    error.value = 'Current savings cannot be negative'
    return
  }
  
  if (currentSavings.value >= goalAmount.value) {
    error.value = 'You already have enough savings to reach your goal!'
    return
  }
  
  if (interestRate.value < 0 || interestRate.value > 100) {
    error.value = 'Please enter a valid interest rate between 0 and 100'
    return
  }
  
  if (months.value <= 0) {
    error.value = 'Please enter a valid number of months greater than 0'
    return
  }
  
  const monthlyRate = interestRate.value / 100 / 12
  const needed = goalAmount.value - currentSavings.value
  
  let monthlyPayment = 0
  let totalSaved = currentSavings.value
  let interestEarned = 0
  
  if (monthlyRate > 0) {
    // Future value of current savings with compound interest
    const futureValueOfCurrent = currentSavings.value * Math.pow(1 + monthlyRate, months.value)
    
    // Amount needed from monthly payments
    const neededFromPayments = goalAmount.value - futureValueOfCurrent
    
    if (neededFromPayments <= 0) {
      // Current savings with interest will exceed goal
      monthlyPayment = 0
      totalSaved = futureValueOfCurrent
      interestEarned = futureValueOfCurrent - currentSavings.value
    } else {
      // Calculate monthly payment needed using annuity formula
      // PMT = PV * r * (1 + r)^n / ((1 + r)^n - 1)
      const numerator = neededFromPayments * monthlyRate * Math.pow(1 + monthlyRate, months.value)
      const denominator = Math.pow(1 + monthlyRate, months.value) - 1
      monthlyPayment = numerator / denominator
      
      // Calculate total saved and interest
      totalSaved = currentSavings.value
      interestEarned = 0
      
      for (let i = 0; i < months.value; i++) {
        const monthlyInterest = totalSaved * monthlyRate
        interestEarned += monthlyInterest
        totalSaved = totalSaved + monthlyPayment + monthlyInterest
      }
    }
  } else {
    // No interest - simple calculation
    monthlyPayment = needed / months.value
    totalSaved = currentSavings.value + (monthlyPayment * months.value)
    interestEarned = 0
  }
  
  if (monthlyPayment < 0) {
    error.value = 'Your current savings with interest will exceed your goal. No monthly savings needed!'
    return
  }
  
  result.value = {
    monthlyPayment: Math.max(0, Math.round(monthlyPayment * 100) / 100),
    totalSaved: Math.round(totalSaved * 100) / 100,
    interestEarned: Math.round(interestEarned * 100) / 100
  }
}
</script>

