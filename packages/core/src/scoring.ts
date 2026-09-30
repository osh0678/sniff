export type Rating = 'recommended' | 'consider' | 'not_recommended' | 'insufficient_data';
export type ScoreCap = 'false_ad_claim' | 'high_concern_ingredient';

export interface Subscores {
  reviews: number | null;
  adHonesty: number | null;
  ingredients: number | null;
  value: number | null;
}

export interface VerdictInput {
  subscores: Subscores;
  hasFalseAdClaim: boolean;
  hasHighConcernIngredient: boolean;
}

export interface Verdict {
  overallScore: number | null;
  rating: Rating;
  caps: ScoreCap[];
}

export const SUBSCORE_WEIGHTS: Readonly<Record<keyof Subscores, number>> = {
  reviews: 0.35,
  adHonesty: 0.25,
  ingredients: 0.2,
  value: 0.2,
};

/** Below this share of total weight we refuse to give a verdict. */
export const MIN_AVAILABLE_WEIGHT = 0.5;
/** A false ad claim or a high-concern ingredient can never be "recommended". */
export const RED_FLAG_SCORE_CAP = 60;
export const RECOMMENDED_THRESHOLD = 75;
export const CONSIDER_THRESHOLD = 55;

function weightedAverage(subscores: Subscores): { score: number; weight: number } | null {
  const available = (Object.keys(SUBSCORE_WEIGHTS) as (keyof Subscores)[])
    .map((key) => ({ score: subscores[key], weight: SUBSCORE_WEIGHTS[key] }))
    .filter((entry): entry is { score: number; weight: number } => entry.score !== null);

  const weight = available.reduce((sum, entry) => sum + entry.weight, 0);
  if (weight === 0) return null;

  const total = available.reduce((sum, entry) => sum + entry.score * entry.weight, 0);
  return { score: total / weight, weight };
}

function ratingFor(score: number): Rating {
  if (score >= RECOMMENDED_THRESHOLD) return 'recommended';
  if (score >= CONSIDER_THRESHOLD) return 'consider';
  return 'not_recommended';
}

/**
 * Deterministic verdict from model-provided sub-scores. Kept out of the LLM so
 * the final number is explainable and consistent across products.
 */
export function computeVerdict(input: VerdictInput): Verdict {
  const average = weightedAverage(input.subscores);
  if (!average || average.weight < MIN_AVAILABLE_WEIGHT) {
    return { overallScore: null, rating: 'insufficient_data', caps: [] };
  }

  const caps: ScoreCap[] = [
    ...(input.hasFalseAdClaim ? (['false_ad_claim'] as const) : []),
    ...(input.hasHighConcernIngredient ? (['high_concern_ingredient'] as const) : []),
  ];
  const rounded = Math.round(average.score);
  const overallScore = caps.length > 0 ? Math.min(rounded, RED_FLAG_SCORE_CAP) : rounded;

  return { overallScore, rating: ratingFor(overallScore), caps };
}
