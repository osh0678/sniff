import { z } from 'zod';

import { QUERY_MAX_LENGTH, QUERY_MIN_LENGTH } from './query';

const score = z.number().int().min(0).max(100);

export const AdClaimAssessmentSchema = z.enum([
  'supported',
  'exaggerated',
  'misleading',
  'false',
  'unverifiable',
]);
export type AdClaimAssessment = z.infer<typeof AdClaimAssessmentSchema>;

export const IngredientConcernSchema = z.enum(['none', 'low', 'moderate', 'high']);
export type IngredientConcern = z.infer<typeof IngredientConcernSchema>;

export const RatingSchema = z.enum(['recommended', 'consider', 'not_recommended', 'insufficient_data']);

export const SourceTypeSchema = z.enum([
  'shop_review',
  'blog',
  'community',
  'official',
  'news',
  'other',
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const StanceSchema = z.enum(['positive', 'mixed', 'negative']);
export type Stance = z.infer<typeof StanceSchema>;

const SubscoreSchema = z.object({
  score: score.nullable().describe('0-100, null이면 근거 부족 또는 해당 없음'),
  rationale: z.string(),
});

/** Shape the model is asked to produce. The overall verdict is computed from it. */
export const ModelAnalysisSchema = z.object({
  product: z.object({
    name: z.string(),
    brand: z.string().nullable(),
    category: z.string(),
    priceText: z.string().nullable(),
  }),
  headline: z.string().describe('한 줄 결론'),
  summary: z.string().describe('2-4문장 종합 의견'),
  subscores: z.object({
    reviews: SubscoreSchema,
    adHonesty: SubscoreSchema,
    ingredients: SubscoreSchema,
    value: SubscoreSchema,
  }),
  reviews: z.object({
    summary: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    authenticityFlags: z.array(z.string()).describe('협찬/체험단/조작 리뷰 의심 신호'),
    communityFindings: z
      .array(
        z.object({
          community: z.string().describe('클리앙, 디시인사이드, 뽐뿌 등 실제로 확인한 커뮤니티 이름'),
          stance: StanceSchema,
          summary: z.string().describe('그 커뮤니티에서 확인한 의견 요약'),
        }),
      )
      .describe('커뮤니티에서 실제로 확인한 의견. 찾지 못했으면 빈 배열'),
  }),
  adClaims: z.array(
    z.object({
      claim: z.string(),
      assessment: AdClaimAssessmentSchema,
      explanation: z.string(),
    }),
  ),
  ingredients: z.object({
    applicable: z.boolean(),
    summary: z.string(),
    items: z.array(
      z.object({
        name: z.string(),
        purpose: z.string(),
        concern: IngredientConcernSchema,
        note: z.string(),
      }),
    ),
  }),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      type: SourceTypeSchema.describe('출처 유형'),
      community: z.string().nullable().describe('type이 community일 때 커뮤니티 이름, 아니면 null'),
    }),
  ),
});
export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>;

export const SourceReliabilitySchema = z.object({
  score: score.nullable(),
  communityFound: z.boolean(),
  sourceCounts: z.record(SourceTypeSchema, z.number().int()),
});
export type SourceReliability = z.infer<typeof SourceReliabilitySchema>;

export const ProductReportSchema = ModelAnalysisSchema.extend({
  query: z.string(),
  sourceReliability: SourceReliabilitySchema,
  verdict: z.object({
    overallScore: score.nullable(),
    rating: RatingSchema,
    caps: z.array(z.enum(['false_ad_claim', 'high_concern_ingredient'])),
  }),
  analyzedAt: z.iso.datetime(),
});
export type ProductReport = z.infer<typeof ProductReportSchema>;

export const AnalyzeRequestSchema = z.object({
  query: z.string().trim().min(QUERY_MIN_LENGTH).max(QUERY_MAX_LENGTH),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

const JobBase = z.object({
  id: z.string(),
  query: z.string(),
  createdAt: z.iso.datetime(),
});

export const AnalysisJobSchema = z.discriminatedUnion('status', [
  JobBase.extend({ status: z.literal('pending') }),
  JobBase.extend({ status: z.literal('completed'), report: ProductReportSchema }),
  JobBase.extend({ status: z.literal('failed'), error: z.string() }),
]);
export type AnalysisJob = z.infer<typeof AnalysisJobSchema>;

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export function apiResponseSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data, error: z.null() }),
    z.object({ success: z.literal(false), data: z.null(), error: z.string() }),
  ]);
}
