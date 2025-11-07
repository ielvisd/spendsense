/**
 * Tone Validation Utility
 * 
 * Ensures recommendations don't contain shaming language, judgmental phrases,
 * or other inappropriate content that could harm user trust.
 */

export interface ToneValidationResult {
  isValid: boolean
  issues: string[]
  sanitizedText: string
}

/**
 * List of shaming keywords that should be avoided
 */
const SHAMING_KEYWORDS = [
  'reckless',
  'overspending',
  'wasteful',
  'irresponsible',
  'stupid',
  'dumb',
  'idiot',
  'foolish',
  'careless',
  'negligent',
  'frivolous',
  'squandering',
  'blowing money',
  'throwing away',
  'bad with money',
  'terrible at',
  'awful',
  'horrible',
  'disgusting',
  'pathetic'
]

/**
 * List of judgmental phrases that should be avoided
 */
const JUDGMENTAL_PHRASES = [
  'you should be ashamed',
  'you should know better',
  'what were you thinking',
  'you clearly don\'t understand',
  'obviously you',
  'anyone can see',
  'it\'s obvious that',
  'everyone knows',
  'you\'re doing it wrong',
  'you\'re making a mistake'
]

/**
 * Regex patterns for shaming language patterns
 */
const SHAMING_PATTERNS = [
  // Patterns like "you're so [negative adjective]"
  /\byou'?re\s+(so|too|very|really|extremely)\s+(reckless|wasteful|irresponsible|stupid|dumb|foolish|careless)\b/gi,
  
  // Patterns like "your [negative] behavior"
  /\byour\s+(reckless|wasteful|irresponsible|stupid|foolish|careless)\s+(behavior|spending|habits|decisions)\b/gi,
  
  // Patterns like "stop being [negative]"
  /\bstop\s+being\s+(so|too|very|really|extremely)?\s*(reckless|wasteful|irresponsible|stupid|dumb|foolish|careless)\b/gi,
  
  // Patterns like "you need to stop [negative action]"
  /\byou\s+need\s+to\s+stop\s+(wasting|squandering|blowing|throwing\s+away)\b/gi,
  
  // Patterns like "how could you [negative action]"
  /\bhow\s+could\s+you\s+(be\s+so|do\s+something\s+so|spend\s+so\s+much)\b/gi,
  
  // Patterns with exclamation marks indicating judgment
  /\b(reckless|wasteful|irresponsible|stupid|dumb|foolish|careless)!\s*/gi
]

/**
 * Replacement mappings for shaming language
 */
const REPLACEMENT_MAP: Record<string, string> = {
  'reckless': 'opportunities to optimize',
  'overspending': 'spending patterns',
  'wasteful': 'areas for improvement',
  'irresponsible': 'optimization opportunities',
  'stupid': 'suboptimal',
  'dumb': 'suboptimal',
  'idiot': 'user',
  'foolish': 'suboptimal',
  'careless': 'opportunities to improve',
  'negligent': 'areas to focus on',
  'frivolous': 'discretionary',
  'squandering': 'allocating',
  'blowing money': 'spending',
  'throwing away': 'allocating',
  'bad with money': 'learning about money management',
  'terrible at': 'opportunities to improve',
  'awful': 'suboptimal',
  'horrible': 'suboptimal',
  'disgusting': 'concerning',
  'pathetic': 'suboptimal'
}

/**
 * Validates text for tone issues and returns sanitized version
 */
export function validateTone(text: string): ToneValidationResult {
  const issues: string[] = []
  let sanitizedText = text
  
  // Check for shaming keywords
  const foundKeywords: string[] = []
  for (const keyword of SHAMING_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    if (regex.test(text)) {
      foundKeywords.push(keyword)
      issues.push(`Contains shaming keyword: "${keyword}"`)
    }
  }
  
  // Check for judgmental phrases
  for (const phrase of JUDGMENTAL_PHRASES) {
    const regex = new RegExp(phrase, 'gi')
    if (regex.test(text)) {
      issues.push(`Contains judgmental phrase: "${phrase}"`)
    }
  }
  
  // Check for shaming patterns
  for (const pattern of SHAMING_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Matches shaming pattern: ${pattern.source}`)
    }
  }
  
  // Sanitize text by replacing problematic terms
  if (issues.length > 0) {
    // Replace keywords
    for (const [keyword, replacement] of Object.entries(REPLACEMENT_MAP)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      sanitizedText = sanitizedText.replace(regex, replacement)
    }
    
    // Replace judgmental phrases with neutral alternatives
    sanitizedText = sanitizedText.replace(
      /\byou\s+should\s+be\s+ashamed\b/gi,
      'consider reviewing'
    )
    sanitizedText = sanitizedText.replace(
      /\byou\s+should\s+know\s+better\b/gi,
      'it may be helpful to know'
    )
    sanitizedText = sanitizedText.replace(
      /\bwhat\s+were\s+you\s+thinking\b/gi,
      'consider evaluating'
    )
    sanitizedText = sanitizedText.replace(
      /\byou\s+clearly\s+don'?t\s+understand\b/gi,
      'you may want to learn more about'
    )
    sanitizedText = sanitizedText.replace(
      /\bobviously\s+you\b/gi,
      'you may'
    )
    sanitizedText = sanitizedText.replace(
      /\bit'?s\s+obvious\s+that\b/gi,
      'it appears that'
    )
    sanitizedText = sanitizedText.replace(
      /\beveryone\s+knows\b/gi,
      'many people find'
    )
    sanitizedText = sanitizedText.replace(
      /\byou'?re\s+doing\s+it\s+wrong\b/gi,
      'there may be a more effective approach'
    )
    sanitizedText = sanitizedText.replace(
      /\byou'?re\s+making\s+a\s+mistake\b/gi,
      'consider reviewing your approach'
    )
    
    // Clean up any remaining shaming patterns
    for (const pattern of SHAMING_PATTERNS) {
      sanitizedText = sanitizedText.replace(pattern, (match) => {
        // Replace with neutral language
        return match.replace(/\b(reckless|wasteful|irresponsible|stupid|dumb|foolish|careless)\b/gi, 'suboptimal')
      })
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    sanitizedText
  }
}

/**
 * Validates multiple texts and returns results
 */
export function validateTones(texts: string[]): ToneValidationResult[] {
  return texts.map(text => validateTone(text))
}

/**
 * Checks if text contains any tone issues without sanitizing
 */
export function hasToneIssues(text: string): boolean {
  const result = validateTone(text)
  return !result.isValid
}

