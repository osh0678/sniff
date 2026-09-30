import type { AnalysisJob } from '@sniff/core';

export interface JobStore {
  get(id: string): AnalysisJob | null;
  /** Inserts or replaces a job. `cacheKey` groups jobs for the same product query. */
  save(job: AnalysisJob, cacheKey: string): void;
  /** A pending or fresh completed job for the same query, so we don't pay twice. */
  findReusable(cacheKey: string, now: Date): AnalysisJob | null;
}

interface Entry {
  job: AnalysisJob;
  cacheKey: string;
}

export const RESULT_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_STORED_JOBS = 1000;

/** Process-local store. Swap for Redis/Postgres when running more than one instance. */
export class InMemoryJobStore implements JobStore {
  private readonly entries = new Map<string, Entry>();
  private readonly latestByKey = new Map<string, string>();

  constructor(private readonly maxJobs: number = MAX_STORED_JOBS) {}

  get(id: string): AnalysisJob | null {
    return this.entries.get(id)?.job ?? null;
  }

  save(job: AnalysisJob, cacheKey: string): void {
    // Delete first so Map insertion order reflects recency for eviction.
    this.entries.delete(job.id);
    this.entries.set(job.id, { job, cacheKey });
    this.latestByKey.set(cacheKey, job.id);
    this.evictOverflow();
  }

  findReusable(cacheKey: string, now: Date): AnalysisJob | null {
    const id = this.latestByKey.get(cacheKey);
    const job = id ? this.get(id) : null;
    if (!job || job.status === 'failed') return null;

    const ageMs = now.getTime() - new Date(job.createdAt).getTime();
    return ageMs <= RESULT_TTL_MS ? job : null;
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxJobs) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) return;
      const [id, entry] = oldest;
      this.entries.delete(id);
      if (this.latestByKey.get(entry.cacheKey) === id) {
        this.latestByKey.delete(entry.cacheKey);
      }
    }
  }
}
