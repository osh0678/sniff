import type { ModelAnalysis, ProductQuery } from '@sniff/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAnalyzer } from './analysis/claude-analyzer';
import { AnalysisError } from './analysis/response';
import { createApp } from './app';
import { InMemoryJobStore } from './jobs/job-store';
import type { Logger } from './logger';
import { createRateLimiter } from './rate-limit';

const analysis: ModelAnalysis = {
  product: { name: '독도 토너', brand: '라운드랩', category: '화장품', priceText: '15,000원' },
  headline: '자극 적은 기본 토너',
  summary: '요약',
  subscores: {
    reviews: { score: 82, rationale: '' },
    adHonesty: { score: 78, rationale: '' },
    ingredients: { score: 85, rationale: '' },
    value: { score: 80, rationale: '' },
  },
  reviews: { summary: '', pros: ['순함'], cons: [], authenticityFlags: [] },
  adClaims: [],
  ingredients: { applicable: true, summary: '', items: [] },
  sources: [],
};

const silentLogger: Logger = { info: vi.fn(), error: vi.fn() };

function setup(options: { analyzer?: ProductAnalyzer; limit?: number } = {}) {
  const analyzer: ProductAnalyzer = options.analyzer ?? { analyze: vi.fn(async () => analysis) };
  const tasks: Promise<void>[] = [];
  let counter = 0;
  const app = createApp({
    store: new InMemoryJobStore(),
    analyzer,
    logger: silentLogger,
    rateLimiter: createRateLimiter(options.limit ?? 10, 60_000),
    clientKey: () => 'client-1',
    now: () => new Date('2026-09-30T08:00:00.000Z'),
    generateId: () => `job-${(counter += 1)}`,
    schedule: (task) => {
      tasks.push(task());
    },
  });
  const settle = () => Promise.all(tasks);
  const post = (body: unknown) =>
    app.request('/v1/analyses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  return { app, analyzer, post, settle };
}

describe('POST /v1/analyses', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('accepts a product name and returns a pending job', async () => {
    const res = await ctx.post({ query: '라운드랩 독도 토너' });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, data: { id: 'job-1', status: 'pending' } });
  });

  it('passes a parsed url query to the analyzer', async () => {
    await ctx.post({ query: 'https://www.coupang.com/vp/products/1' });
    await ctx.settle();

    expect(ctx.analyzer.analyze).toHaveBeenCalledWith<[ProductQuery]>({
      kind: 'url',
      value: 'https://www.coupang.com/vp/products/1',
    });
  });

  it('rejects an empty query', async () => {
    const res = await ctx.post({ query: ' ' });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false, data: null });
  });

  it('rejects links to private hosts', async () => {
    const res = await ctx.post({ query: 'http://127.0.0.1/admin' });

    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const res = await ctx.app.request('/v1/analyses', { method: 'POST', body: '{not json' });

    expect(res.status).toBe(400);
  });

  it('reuses the existing job for the same query', async () => {
    await ctx.post({ query: '독도 토너' });
    const res = await ctx.post({ query: '  독도   토너 ' });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('job-1');
    expect(ctx.analyzer.analyze).toHaveBeenCalledTimes(1);
  });

  it('rate limits new analyses per client', async () => {
    const limited = setup({ limit: 1 });
    await limited.post({ query: '제품 하나' });

    const res = await limited.post({ query: '제품 둘' });

    expect(res.status).toBe(429);
  });
});

describe('GET /v1/analyses/:id', () => {
  it('returns the completed report with a computed verdict', async () => {
    const { app, post, settle } = setup();
    await post({ query: '독도 토너' });
    await settle();

    const res = await app.request('/v1/analyses/job-1');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('completed');
    expect(body.data.report.verdict).toEqual({ overallScore: 81, rating: 'recommended', caps: [] });
  });

  it('records a user-facing error when analysis fails', async () => {
    const analyzer: ProductAnalyzer = {
      analyze: vi.fn(async () => {
        throw new AnalysisError('이 제품은 안전 정책상 분석할 수 없어요.');
      }),
    };
    const { app, post, settle } = setup({ analyzer });
    await post({ query: '독도 토너' });
    await settle();

    const body = await (await app.request('/v1/analyses/job-1')).json();

    expect(body.data).toMatchObject({ status: 'failed', error: '이 제품은 안전 정책상 분석할 수 없어요.' });
  });

  it('hides internal error details from clients', async () => {
    const analyzer: ProductAnalyzer = {
      analyze: vi.fn(async () => {
        throw new Error('ECONNRESET at 10.0.0.3');
      }),
    };
    const { app, post, settle } = setup({ analyzer });
    await post({ query: '독도 토너' });
    await settle();

    const body = await (await app.request('/v1/analyses/job-1')).json();

    expect(body.data.error).not.toContain('10.0.0.3');
  });

  it('allows retrying after a failure', async () => {
    const analyze = vi
      .fn<ProductAnalyzer['analyze']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(analysis);
    const { post, settle } = setup({ analyzer: { analyze } });
    await post({ query: '독도 토너' });
    await settle();

    const res = await post({ query: '독도 토너' });

    expect(res.status).toBe(202);
    await settle();
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for an unknown job', async () => {
    const { app } = setup();

    const res = await app.request('/v1/analyses/nope');

    expect(res.status).toBe(404);
  });
});
