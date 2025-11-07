import { describe, it, expect } from 'vitest'
import { validateTone, hasToneIssues, validateTones } from '~/utils/toneValidation'

describe('Tone Validation', () => {
  describe('validateTone', () => {
    it('should pass clean, neutral text', () => {
      const result = validateTone('We noticed your credit utilization is 65%. Consider paying down your balance to improve your credit score.')
      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
      expect(result.sanitizedText).toBe('We noticed your credit utilization is 65%. Consider paying down your balance to improve your credit score.')
    })
    
    it('should detect shaming keywords', () => {
      const result = validateTone('You are being reckless with your spending.')
      expect(result.isValid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some(issue => issue.includes('reckless'))).toBe(true)
    })
    
    it('should sanitize shaming keywords', () => {
      const result = validateTone('You are being reckless with your spending.')
      expect(result.sanitizedText).toContain('opportunities to optimize')
      expect(result.sanitizedText).not.toContain('reckless')
    })
    
    it('should detect multiple shaming keywords', () => {
      const result = validateTone('Your wasteful and irresponsible spending habits are concerning.')
      expect(result.isValid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(1)
    })
    
    it('should sanitize multiple keywords', () => {
      const result = validateTone('Your wasteful and irresponsible spending habits are concerning.')
      expect(result.sanitizedText).not.toContain('wasteful')
      expect(result.sanitizedText).not.toContain('irresponsible')
    })
    
    it('should detect judgmental phrases', () => {
      const result = validateTone('You should be ashamed of your spending habits.')
      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('ashamed'))).toBe(true)
    })
    
    it('should sanitize judgmental phrases', () => {
      const result = validateTone('You should be ashamed of your spending habits.')
      expect(result.sanitizedText).not.toContain('ashamed')
      expect(result.sanitizedText).toContain('consider reviewing')
    })
    
    it('should detect shaming patterns', () => {
      const result = validateTone("You're so reckless with your money!")
      expect(result.isValid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })
    
    it('should handle case-insensitive detection', () => {
      const result1 = validateTone('You are RECKLESS')
      const result2 = validateTone('You are reckless')
      const result3 = validateTone('You are Reckless')
      
      expect(result1.isValid).toBe(false)
      expect(result2.isValid).toBe(false)
      expect(result3.isValid).toBe(false)
    })
    
    it('should not flag words that contain keywords but are different', () => {
      // "careless" contains "care" but shouldn't be flagged unless it's the actual word
      const result = validateTone('Take care of your finances.')
      expect(result.isValid).toBe(true)
    })
    
    it('should handle edge cases with punctuation', () => {
      const result = validateTone('You are reckless!')
      expect(result.isValid).toBe(false)
      expect(result.sanitizedText).not.toContain('reckless')
    })
    
    it('should preserve original text structure when sanitizing', () => {
      const original = 'We noticed your reckless spending. Consider optimizing your budget.'
      const result = validateTone(original)
      
      // Should maintain sentence structure
      expect(result.sanitizedText).toContain('We noticed')
      expect(result.sanitizedText).toContain('Consider optimizing')
      expect(result.sanitizedText).not.toContain('reckless')
    })
  })
  
  describe('hasToneIssues', () => {
    it('should return false for clean text', () => {
      expect(hasToneIssues('This is a helpful recommendation.')).toBe(false)
    })
    
    it('should return true for text with shaming language', () => {
      expect(hasToneIssues('You are being wasteful.')).toBe(true)
    })
    
    it('should return true for judgmental phrases', () => {
      expect(hasToneIssues('You should know better.')).toBe(true)
    })
  })
  
  describe('validateTones', () => {
    it('should validate multiple texts', () => {
      const texts = [
        'This is clean text.',
        'You are being reckless.',
        'Another clean recommendation.'
      ]
      
      const results = validateTones(texts)
      expect(results).toHaveLength(3)
      expect(results[0].isValid).toBe(true)
      expect(results[1].isValid).toBe(false)
      expect(results[2].isValid).toBe(true)
    })
  })
  
  describe('real-world scenarios', () => {
    it('should handle recommendation with shaming language', () => {
      const text = 'Your reckless spending on subscriptions is wasteful. You need to stop being so irresponsible.'
      const result = validateTone(text)
      
      expect(result.isValid).toBe(false)
      expect(result.sanitizedText).not.toContain('reckless')
      expect(result.sanitizedText).not.toContain('wasteful')
      expect(result.sanitizedText).not.toContain('irresponsible')
    })
    
    it('should handle recommendation with judgmental tone', () => {
      const text = 'You should be ashamed of your overspending. What were you thinking?'
      const result = validateTone(text)
      
      expect(result.isValid).toBe(false)
      expect(result.sanitizedText).not.toContain('ashamed')
      expect(result.sanitizedText).not.toContain('overspending')
      expect(result.sanitizedText).not.toContain('What were you thinking')
    })
    
    it('should preserve helpful, constructive language', () => {
      const text = 'We noticed your credit utilization is high. Consider paying down your balance to improve your credit score and reduce interest charges.'
      const result = validateTone(text)
      
      expect(result.isValid).toBe(true)
      expect(result.sanitizedText).toBe(text)
    })
  })
})

