import type { AdClaimAssessment, IngredientConcern, ProductReport, ScoreCap } from '@sniff/core';

import {
  CheckIcon,
  QuestionIcon,
  SealCheckIcon,
  SealWarningIcon,
  WarningIcon,
  XCircleIcon,
  type Icon,
} from '@/components/icons';
import type { Tone } from '@/constants/theme';

type Rating = ProductReport['verdict']['rating'];

interface Label {
  text: string;
  tone: Tone;
  icon: Icon;
}

export const RATING_LABELS: Record<Rating, Label> = {
  recommended: { text: '구매 추천', tone: 'pass', icon: SealCheckIcon },
  consider: { text: '신중히 검토', tone: 'caution', icon: SealWarningIcon },
  not_recommended: { text: '구매 비추천', tone: 'fail', icon: XCircleIcon },
  insufficient_data: { text: '판정 보류', tone: 'unknown', icon: QuestionIcon },
};

export const CLAIM_LABELS: Record<AdClaimAssessment, Label> = {
  supported: { text: '근거 확인', tone: 'pass', icon: CheckIcon },
  exaggerated: { text: '과장', tone: 'caution', icon: WarningIcon },
  misleading: { text: '오인 소지', tone: 'caution', icon: WarningIcon },
  false: { text: '허위', tone: 'fail', icon: XCircleIcon },
  unverifiable: { text: '확인 불가', tone: 'unknown', icon: QuestionIcon },
};

export const CONCERN_LABELS: Record<IngredientConcern, Label> = {
  none: { text: '문제 없음', tone: 'pass', icon: CheckIcon },
  low: { text: '낮은 우려', tone: 'pass', icon: CheckIcon },
  moderate: { text: '주의', tone: 'caution', icon: WarningIcon },
  high: { text: '경고', tone: 'fail', icon: XCircleIcon },
};

export const CAP_LABELS: Record<ScoreCap, string> = {
  false_ad_claim: '허위로 판정된 광고 주장이 있어 점수를 60점 이하로 제한했어요.',
  high_concern_ingredient: '경고 수준의 성분이 있어 점수를 60점 이하로 제한했어요.',
};

export const SUBSCORE_LABELS = {
  reviews: '리뷰 신뢰도',
  adHonesty: '광고 정직도',
  ingredients: '성분 안전성',
  value: '가격 대비 가치',
} as const;

/** Mirrors the thresholds in @sniff/core scoring. */
export function toneForScore(score: number | null): Tone {
  if (score === null) return 'unknown';
  if (score >= 75) return 'pass';
  if (score >= 55) return 'caution';
  return 'fail';
}
