import type Anthropic from '@anthropic-ai/sdk';
import { ModelAnalysisSchema, type ModelAnalysis } from '@sniff/core';

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaContent = BetaMessage['content'];

/** An analysis failure whose message is safe to show to end users. */
export class AnalysisError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AnalysisError';
  }
}

/** Text emitted after the last tool block — that is where the structured answer lives. */
function finalText(content: BetaContent): string {
  const lastToolIndex = content.findLastIndex((block) => block.type !== 'text');
  return content
    .slice(lastToolIndex + 1)
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
}

export function extractModelAnalysis(response: BetaMessage): ModelAnalysis {
  if (response.stop_reason === 'refusal') {
    throw new AnalysisError('이 제품은 안전 정책상 분석할 수 없어요.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AnalysisError('분석 결과가 너무 길어 잘렸어요. 다시 시도해 주세요.');
  }

  let json: unknown;
  try {
    json = JSON.parse(finalText(response.content));
  } catch (error) {
    throw new AnalysisError('분석 결과를 해석하지 못했어요.', { cause: error });
  }

  const parsed = ModelAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalysisError('분석 결과 형식이 올바르지 않아요.', { cause: parsed.error });
  }
  return parsed.data;
}

/**
 * Adds a paused (pause_turn) assistant response so the next request resumes it.
 * Consecutive paused turns are merged into one assistant message.
 */
export function appendAssistantTurn(
  messages: readonly BetaMessageParam[],
  content: BetaContent,
): BetaMessageParam[] {
  const last = messages.at(-1);
  if (last?.role === 'assistant' && Array.isArray(last.content)) {
    return [...messages.slice(0, -1), { role: 'assistant', content: [...last.content, ...content] }];
  }
  return [...messages, { role: 'assistant', content }];
}
