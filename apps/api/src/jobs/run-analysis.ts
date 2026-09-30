import { buildReport, type AnalysisJob, type ProductQuery } from '@sniff/core';

import type { ProductAnalyzer } from '../analysis/claude-analyzer';
import { AnalysisError } from '../analysis/response';
import type { Logger } from '../logger';
import type { JobStore } from './job-store';

export interface RunAnalysisDeps {
  store: JobStore;
  analyzer: ProductAnalyzer;
  logger: Logger;
  now: () => Date;
}

const GENERIC_FAILURE = '분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';

/** Runs the analysis for a pending job and records the outcome. Never throws. */
export async function runAnalysis(
  deps: RunAnalysisDeps,
  job: AnalysisJob,
  query: ProductQuery,
  cacheKey: string,
): Promise<void> {
  const base = { id: job.id, query: job.query, createdAt: job.createdAt };
  try {
    const analysis = await deps.analyzer.analyze(query);
    const report = buildReport(job.query, analysis, deps.now());
    deps.store.save({ ...base, status: 'completed', report }, cacheKey);
  } catch (error: unknown) {
    deps.logger.error('analysis failed', { jobId: job.id, error });
    const message = error instanceof AnalysisError ? error.message : GENERIC_FAILURE;
    deps.store.save({ ...base, status: 'failed', error: message }, cacheKey);
  }
}
