import type { SourceReliability, SourceType } from './schemas';

export type Rating = 'recommended' | 'consider' | 'not_recommended' | 'insufficient_data';
export type ScoreCap = 'false_ad_claim' | 'high_concern_ingredient';

export interface Subscores {
  reviews: number | null;
  adHonesty: number | null;
  ingredients: number | null;
  value: number | null;
  /** Computed in code from source diversity, not by the model. */
  sourceReliability: number | null;
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
  reviews: 0.3,
  adHonesty: 0.25,
  ingredients: 0.15,
  value: 0.15,
  sourceReliability: 0.15,
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

const REVIEW_SOURCE_TYPES: readonly SourceType[] = ['shop_review', 'blog', 'community'];
const RELIABILITY_BASE = 30;
const POINTS_PER_REVIEW_TYPE = 15;
const COMMUNITY_BONUS = 15;
const POINTS_PER_REVIEW_SOURCE = 3;
const MAX_COUNTED_REVIEW_SOURCES = 6;
const PENALTY_PER_FLAG = 5;
const MAX_COUNTED_FLAGS = 4;

/**
 * How trustworthy the review evidence is, judged from where it came from:
 * more kinds of independent review sources (shop / blog / community), actual
 * community discussion, and fewer sponsorship/manipulation flags score higher.
 * Null when no review-type source was found at all.
 */
export function computeSourceReliability(
  sources: readonly { type: SourceType }[],
  authenticityFlagCount: number,
): SourceReliability {
  const sourceCounts: Record<SourceType, number> = {
    shop_review: 0,
    blog: 0,
    community: 0,
    official: 0,
    news: 0,
    other: 0,
  };
  for (const source of sources) sourceCounts[source.type] += 1;

  const reviewTypes = REVIEW_SOURCE_TYPES.filter((type) => sourceCounts[type] > 0);
  const reviewSourceCount = reviewTypes.reduce((sum, type) => sum + sourceCounts[type], 0);
  const communityFound = sourceCounts.community > 0;
  if (reviewSourceCount === 0) return { score: null, communityFound, sourceCounts };

  const raw =
    RELIABILITY_BASE +
    reviewTypes.length * POINTS_PER_REVIEW_TYPE +
    (communityFound ? COMMUNITY_BONUS : 0) +
    Math.min(reviewSourceCount, MAX_COUNTED_REVIEW_SOURCES) * POINTS_PER_REVIEW_SOURCE -
    Math.min(authenticityFlagCount, MAX_COUNTED_FLAGS) * PENALTY_PER_FLAG;

  return { score: Math.max(0, Math.min(100, raw)), communityFound, sourceCounts };
}
