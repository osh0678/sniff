import { describe, expect, it } from 'vitest';

import { buildReport } from './report';
import type { ModelAnalysis } from './schemas';

function makeAnalysis(overrides: Partial<ModelAnalysis> = {}): ModelAnalysis {
  return {
    product: { name: '테스트 토너', brand: '테스트', category: '화장품', priceText: '15,000원' },
    headline: '무난한 선택',
    summary: '요약',
    subscores: {
      reviews: { score: 80, rationale: '' },
      adHonesty: { score: 80, rationale: '' },
      ingredients: { score: 80, rationale: '' },
      value: { score: 80, rationale: '' },
    },
    reviews: { summary: '', pros: [], cons: [], authenticityFlags: [], communityFindings: [] },
    adClaims: [],
    ingredients: { applicable: true, summary: '', items: [] },
    sources: [],
    ...overrides,
  };
}

const NOW = new Date('2026-09-30T08:00:00.000Z');

describe('buildReport', () => {
  it('attaches the query, timestamp and computed verdict', () => {
    const report = buildReport('테스트 토너', makeAnalysis(), NOW);

    expect(report.query).toBe('테스트 토너');
    expect(report.analyzedAt).toBe('2026-09-30T08:00:00.000Z');
    expect(report.verdict).toEqual({ overallScore: 80, rating: 'recommended', caps: [] });
  });

  it('flags a false ad claim as a score cap', () => {
    const analysis = makeAnalysis({
      adClaims: [{ claim: '아토피 치료', assessment: 'false', explanation: '의약품 오인 표현' }],
    });

    const report = buildReport('q', analysis, NOW);

    expect(report.verdict.caps).toEqual(['false_ad_claim']);
    expect(report.verdict.rating).toBe('consider');
  });

  it('flags high-concern ingredients only when ingredients apply', () => {
    const item = { name: 'X', purpose: '', concern: 'high' as const, note: '' };
    const applicable = makeAnalysis({ ingredients: { applicable: true, summary: '', items: [item] } });
    const notApplicable = makeAnalysis({ ingredients: { applicable: false, summary: '', items: [item] } });

    expect(buildReport('q', applicable, NOW).verdict.caps).toContain('high_concern_ingredient');
    expect(buildReport('q', notApplicable, NOW).verdict.caps).toEqual([]);
  });

  it('ignores the ingredient sub-score when ingredients do not apply', () => {
    const analysis = makeAnalysis({
      subscores: {
        reviews: { score: 70, rationale: '' },
        adHonesty: { score: 70, rationale: '' },
        ingredients: { score: 0, rationale: '' },
        value: { score: 70, rationale: '' },
      },
      ingredients: { applicable: false, summary: '', items: [] },
    });

    expect(buildReport('q', analysis, NOW).verdict.overallScore).toBe(70);
  });

  it('does not mutate the model analysis', () => {
    const analysis = makeAnalysis();
    const snapshot = structuredClone(analysis);

    buildReport('q', analysis, NOW);

    expect(analysis).toEqual(snapshot);
  });
});
