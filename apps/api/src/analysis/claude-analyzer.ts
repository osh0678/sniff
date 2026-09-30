import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ModelAnalysisSchema, type ModelAnalysis, type ProductQuery } from '@sniff/core';

import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { AnalysisError, appendAssistantTurn, extractModelAnalysis } from './response';

export interface ProductAnalyzer {
  analyze(query: ProductQuery): Promise<ModelAnalysis>;
}

const MODEL = 'claude-opus-5-5';
const MAX_OUTPUT_TOKENS = 64_000;
/** Server-side tool loops pause after ~10 iterations; resume at most this many times. */
const MAX_CONTINUATIONS = 4;
const MAX_WEB_SEARCHES = 8;
const MAX_WEB_FETCHES = 5;

// Use the JSON schema only; we parse ourselves because tool-heavy responses can
// contain several text blocks and the SDK auto-parser would try each of them.
const { parse: _autoParse, ...outputFormat } = betaZodOutputFormat(ModelAnalysisSchema);

const TOOLS: Anthropic.Beta.Messages.BetaToolUnion[] = [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: MAX_WEB_SEARCHES,
    user_location: { type: 'approximate', country: 'KR', city: 'Seoul', timezone: 'Asia/Seoul' },
  },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: MAX_WEB_FETCHES },
];

export class ClaudeProductAnalyzer implements ProductAnalyzer {
  constructor(private readonly client: Anthropic) {}

  async analyze(query: ProductQuery): Promise<ModelAnalysis> {
    let messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
      { role: 'user', content: buildUserPrompt(query) },
    ];

    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt += 1) {
      const response = await this.request(messages);
      if (response.stop_reason !== 'pause_turn') {
        return extractModelAnalysis(response);
      }
      messages = appendAssistantTurn(messages, response.content);
    }
    throw new AnalysisError('분석에 너무 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.');
  }

  private async request(messages: Anthropic.Beta.Messages.BetaMessageParam[]) {
    try {
      return await this.client.beta.messages
        .stream({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          // Opus 5.5 defaults to "medium"; set explicitly — research quality vs. latency.
          output_config: { effort: 'medium', format: outputFormat },
          // On a safety decline, rerun on Anthropic's recommended fallback model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        })
        .finalMessage();
    } catch (error: unknown) {
      throw toAnalysisError(error);
    }
  }
}

function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof Anthropic.RateLimitError) {
    return new AnalysisError('요청이 많아 잠시 후 다시 시도해 주세요.', { cause: error });
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new AnalysisError('분석 서버 설정에 문제가 있어요.', { cause: error });
  }
  if (error instanceof Anthropic.APIError) {
    return new AnalysisError('분석 서비스에 일시적인 문제가 있어요.', { cause: error });
  }
  return new AnalysisError('알 수 없는 오류로 분석하지 못했어요.', { cause: error });
}
