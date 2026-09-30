import { describe, expect, it } from 'vitest';

import { computeVerdict, type VerdictInput } from './scoring';

const baseInput: VerdictInput = {
  subscores: { reviews: 80, adHonesty: 80, ingredients: 80, value: 80 },
  hasFalseAdClaim: false,
  hasHighConcernIngredient: false,
};

describe('computeVerdict', () => {
  it('averages sub-scores with weights and recommends high scores', () => {
    const verdict = computeVerdict(baseInput);

    expect(verdict.overallScore).toBe(80);
    expect(verdict.rating).toBe('recommended');
  });

  it('weights reviews more heavily than value', () => {
    const reviewHeavy = computeVerdict({
      ...baseInput,
      subscores: { reviews: 100, adHonesty: 50, ingredients: 50, value: 0 },
    });
    const valueHeavy = computeVerdict({
      ...baseInput,
      subscores: { reviews: 0, adHonesty: 50, ingredients: 50, value: 100 },
    });

    expect(reviewHeavy.overallScore).toBeGreaterThan(valueHeavy.overallScore ?? 0);
  });

  it('renormalizes weights when a sub-score is not applicable', () => {
    const verdict = computeVerdict({
      ...baseInput,
      subscores: { reviews: 70, adHonesty: 70, ingredients: null, value: 70 },
    });

    expect(verdict.overallScore).toBe(70);
  });

  it('returns insufficient_data when too few sub-scores are available', () => {
    const verdict = computeVerdict({
      ...baseInput,
      subscores: { reviews: null, adHonesty: null, ingredients: 90, value: null },
    });

    expect(verdict.overallScore).toBeNull();
    expect(verdict.rating).toBe('insufficient_data');
  });

  it('caps the score when an ad claim is judged false', () => {
    const verdict = computeVerdict({ ...baseInput, hasFalseAdClaim: true });

    expect(verdict.overallScore).toBeLessThanOrEqual(60);
    expect(verdict.rating).toBe('consider');
    expect(verdict.caps).toContain('false_ad_claim');
  });

  it('caps the score when a high-concern ingredient is present', () => {
    const verdict = computeVerdict({ ...baseInput, hasHighConcernIngredient: true });

    expect(verdict.overallScore).toBeLessThanOrEqual(60);
    expect(verdict.caps).toContain('high_concern_ingredient');
  });

  it('does not recommend low scores', () => {
    const verdict = computeVerdict({
      ...baseInput,
      subscores: { reviews: 30, adHonesty: 40, ingredients: 50, value: 40 },
    });

    expect(verdict.rating).toBe('not_recommended');
  });
});
