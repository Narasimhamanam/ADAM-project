import { describe, it, expect } from 'vitest'
import { AIRA_EVALUATION_QUESTIONS } from './scripts/test_aira_questions.mjs'

describe('AIRA Evaluation Questions and Negative Test Cases', () => {
  it('contains at least 30 total structured evaluation queries', () => {
    expect(AIRA_EVALUATION_QUESTIONS.length).toBeGreaterThanOrEqual(30)
  })

  it('contains at least 10 negative out-of-scope cases requiring insufficient evidence', () => {
    const neg = AIRA_EVALUATION_QUESTIONS.filter(q => q.type === 'negative')
    expect(neg.length).toBeGreaterThanOrEqual(10)
    for (const q of neg) {
      expect(q.expectedBehavior).toBe('must_state_insufficient_evidence')
      expect(q.forbiddenClaims.length).toBeGreaterThan(0)
    }
  })

  it('contains at least 10 plausible distractor cases preventing citation hallucination', () => {
    const dis = AIRA_EVALUATION_QUESTIONS.filter(q => q.type === 'distractor')
    expect(dis.length).toBeGreaterThanOrEqual(10)
    for (const q of dis) {
      expect(q.requiredCaveat).toBeDefined()
    }
  })

  it('contains valid ground truth PMIDs for positive factual cases', () => {
    const pos = AIRA_EVALUATION_QUESTIONS.filter(q => q.type === 'positive')
    expect(pos.length).toBeGreaterThanOrEqual(15)
    for (const q of pos) {
      expect(q.expectedPmid).toMatch(/^\d{8}$/)
    }
  })
})
