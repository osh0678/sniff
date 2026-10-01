import type { ModelAnalysis, ProductReport } from './schemas';
import { computeSourceReliability, computeVerdict } from './scoring';

/** Combines the model's analysis with the deterministic verdict. */
export function buildReport(query: string, analysis: ModelAnalysis, now: Date): ProductReport {
  const { subscores, adClaims, ingredients } = analysis;
  const sourceReliability = computeSourceReliability(
    analysis.sources,
    analysis.reviews.authenticityFlags.length,
  );
  const ingredientsApply = ingredients.applicable;

  const verdict = computeVerdict({
    subscores: {
      reviews: subscores.reviews.score,
      adHonesty: subscores.adHonesty.score,
      ingredients: ingredientsApply ? subscores.ingredients.score : null,
      value: subscores.value.score,
      sourceReliability: sourceReliability.score,
    },
    hasFalseAdClaim: adClaims.some((claim) => claim.assessment === 'false'),
    hasHighConcernIngredient:
      ingredientsApply && ingredients.items.some((item) => item.concern === 'high'),
  });

  return { ...analysis, query, sourceReliability, verdict, analyzedAt: now.toISOString() };
}
