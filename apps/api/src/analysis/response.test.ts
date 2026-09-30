import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { AnalysisError, appendAssistantTurn, extractModelAnalysis } from './response';

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;

const validAnalysis = {
  product: { name: '토너', brand: null, category: '화장품', priceText: null },
  headline: 'h',
  summary: 's',
  subscores: {
    reviews: { score: 70, rationale: '' },
    adHonesty: { score: null, rationale: '' },
    ingredients: { score: 60, rationale: '' },
    value: { score: 50, rationale: '' },
  },
  reviews: { summary: '', pros: [], cons: [], authenticityFlags: [] },
  adClaims: [],
  ingredients: { applicable: true, summary: '', items: [] },
  sources: [{ title: 'src', url: 'https://example.com' }],
};

function message(overrides: Partial<BetaMessage>): BetaMessage {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [],
    stop_reason: 'end_turn',
    stop_sequence: null,
    ...overrides,
  } as BetaMessage;
}

function text(value: string) {
  return { type: 'text', text: value, citations: null } as const;
}

describe('extractModelAnalysis', () => {
  it('parses the JSON text that follows tool activity', () => {
    const response = message({
      content: [
        { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: {} },
        text(JSON.stringify(validAnalysis)),
      ] as BetaMessage['content'],
    });

    expect(extractModelAnalysis(response).product.name).toBe('토너');
  });

  it('joins JSON split across several text blocks', () => {
    const json = JSON.stringify(validAnalysis);
    const response = message({
      content: [text(json.slice(0, 20)), text(json.slice(20))] as BetaMessage['content'],
    });

    expect(extractModelAnalysis(response).headline).toBe('h');
  });

  it('throws a refusal error when the model declines', () => {
    const response = message({ stop_reason: 'refusal', content: [] });

    expect(() => extractModelAnalysis(response)).toThrow(AnalysisError);
  });

  it('throws when output was cut off', () => {
    const response = message({ stop_reason: 'max_tokens', content: [text('{"product":')] as BetaMessage['content'] });

    expect(() => extractModelAnalysis(response)).toThrow(/너무 길어/);
  });

  it('throws when the JSON does not match the schema', () => {
    const response = message({ content: [text('{"product": {}}')] as BetaMessage['content'] });

    expect(() => extractModelAnalysis(response)).toThrow(AnalysisError);
  });
});

describe('appendAssistantTurn', () => {
  it('appends a new assistant turn after the user turn', () => {
    const messages = [{ role: 'user' as const, content: 'q' }];
    const content = [text('a')] as BetaMessage['content'];

    const next = appendAssistantTurn(messages, content);

    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ role: 'assistant', content });
    expect(messages).toHaveLength(1);
  });

  it('merges consecutive paused assistant turns into one', () => {
    const first = [text('a')] as BetaMessage['content'];
    const second = [text('b')] as BetaMessage['content'];
    const once = appendAssistantTurn([{ role: 'user' as const, content: 'q' }], first);

    const twice = appendAssistantTurn(once, second);

    expect(twice).toHaveLength(2);
    expect(twice[1]?.content).toEqual([...first, ...second]);
  });
});
