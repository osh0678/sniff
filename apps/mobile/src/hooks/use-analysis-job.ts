import type { AnalysisJob } from '@sniff/core';
import { useEffect, useState } from 'react';

import { ApiError, getAnalysis } from '@/lib/api';

const POLL_INTERVAL_MS = 3_000;
/** Web research can take a few minutes; stop polling well after that. */
const MAX_POLL_DURATION_MS = 8 * 60 * 1000;

export type AnalysisJobState =
  | { kind: 'loading' }
  | { kind: 'job'; job: AnalysisJob }
  | { kind: 'error'; message: string };

const LOADING: AnalysisJobState = { kind: 'loading' };

/** Polls an analysis job until it completes, fails, or polling times out. */
export function useAnalysisJob(id: string): AnalysisJobState {
  // Tag state with the id it belongs to, so a new id reads as loading without a reset.
  const [state, setState] = useState<{ id: string; value: AnalysisJobState } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const update = (value: AnalysisJobState) => {
      if (!cancelled) setState({ id, value });
    };

    const poll = async () => {
      try {
        const job = await getAnalysis(id);
        update({ kind: 'job', job });
        if (cancelled || job.status !== 'pending') return;
      } catch (error: unknown) {
        const message = error instanceof ApiError ? error.message : '결과를 불러오지 못했어요.';
        update({ kind: 'error', message });
        return;
      }

      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        update({ kind: 'error', message: '분석이 너무 오래 걸리고 있어요. 잠시 후 다시 확인해 주세요.' });
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return state?.id === id ? state.value : LOADING;
}
