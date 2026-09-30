import { randomUUID } from 'node:crypto';

import {
  AnalyzeRequestSchema,
  InvalidQueryError,
  parseQuery,
  type AnalysisJob,
  type ApiResponse,
  type ProductQuery,
} from '@sniff/core';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { ProductAnalyzer } from './analysis/claude-analyzer';
import type { JobStore } from './jobs/job-store';
import { runAnalysis } from './jobs/run-analysis';
import type { Logger } from './logger';
import type { RateLimiter } from './rate-limit';

export interface AppDeps {
  store: JobStore;
  analyzer: ProductAnalyzer;
  logger: Logger;
  rateLimiter: RateLimiter;
  clientKey: (c: Context) => string;
  now?: () => Date;
  generateId?: () => string;
  /** Runs work after the response is sent. Tests inject a collector to await it. */
  schedule?: (task: () => Promise<void>) => void;
}

const MAX_BODY_BYTES = 10 * 1024;

function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return c.json(body, status);
}

function fail(c: Context, error: string, status: ContentfulStatusCode) {
  const body: ApiResponse<never> = { success: false, data: null, error };
  return c.json(body, status);
}

function cacheKeyFor(query: ProductQuery): string {
  return `${query.kind}:${query.value.toLowerCase()}`;
}

export function createApp(deps: AppDeps): Hono {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? randomUUID;
  const schedule = deps.schedule ?? ((task) => void task());

  const app = new Hono();
  app.use('*', cors());

  app.get('/health', (c) => ok(c, { status: 'ok' }));

  app.post(
    '/v1/analyses',
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => fail(c, '요청이 너무 커요.', 413) }),
    async (c) => {
      const body: unknown = await c.req.json().catch(() => null);
      const request = AnalyzeRequestSchema.safeParse(body);
      if (!request.success) {
        return fail(c, '제품명이나 링크를 입력해 주세요.', 400);
      }

      let query: ProductQuery;
      try {
        query = parseQuery(request.data.query);
      } catch (error: unknown) {
        if (error instanceof InvalidQueryError) return fail(c, error.message, 400);
        throw error;
      }

      const cacheKey = cacheKeyFor(query);
      const reusable = deps.store.findReusable(cacheKey, now());
      if (reusable) return ok(c, reusable);

      if (!deps.rateLimiter(deps.clientKey(c), now())) {
        return fail(c, '분석 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', 429);
      }

      const job: AnalysisJob = {
        id: generateId(),
        query: query.value,
        createdAt: now().toISOString(),
        status: 'pending',
      };
      deps.store.save(job, cacheKey);
      schedule(() => runAnalysis({ ...deps, now }, job, query, cacheKey));

      return ok(c, job, 202);
    },
  );

  app.get('/v1/analyses/:id', (c) => {
    const job = deps.store.get(c.req.param('id'));
    return job ? ok(c, job) : fail(c, '분석 결과를 찾을 수 없어요.', 404);
  });

  app.notFound((c) => fail(c, '존재하지 않는 경로예요.', 404));
  app.onError((error, c) => {
    deps.logger.error('unhandled request error', { path: c.req.path, error });
    return fail(c, '서버 오류가 발생했어요.', 500);
  });

  return app;
}
