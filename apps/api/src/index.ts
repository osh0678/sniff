import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';

import { ClaudeProductAnalyzer } from './analysis/claude-analyzer';
import { createApp } from './app';
import { loadConfig } from './config';
import { InMemoryJobStore } from './jobs/job-store';
import { jsonLogger } from './logger';
import { createRateLimiter } from './rate-limit';

const HOUR_MS = 60 * 60 * 1000;

const config = loadConfig(process.env);

const app = createApp({
  store: new InMemoryJobStore(),
  analyzer: new ClaudeProductAnalyzer(new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })),
  logger: jsonLogger,
  rateLimiter: createRateLimiter(config.RATE_LIMIT_PER_HOUR, HOUR_MS),
  // Socket address, not X-Forwarded-For: headers are client-controlled unless a
  // trusted proxy sets them. Revisit when deploying behind a load balancer.
  clientKey: (c) => getConnInfo(c).remote.address ?? 'unknown',
});

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  jsonLogger.info('api listening', { port: info.port });
});
