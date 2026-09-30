import { AnalysisJobSchema, apiResponseSchema, type AnalysisJob } from '@sniff/core';
import Constants from 'expo-constants';

const DEFAULT_API_PORT = 8787;
const REQUEST_TIMEOUT_MS = 15_000;

const JobResponseSchema = apiResponseSchema(AnalysisJobSchema);

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * EXPO_PUBLIC_API_URL wins. In development we fall back to the machine running
 * Metro so a physical device on the same network reaches the local API.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:${DEFAULT_API_PORT}`;
}

const BASE_URL = resolveBaseUrl();

async function request(path: string, init?: RequestInit): Promise<AnalysisJob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError('서버에 연결할 수 없어요. 네트워크를 확인해 주세요.');
  } finally {
    clearTimeout(timeout);
  }

  const json: unknown = await response.json().catch(() => null);
  const parsed = JobResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('서버 응답을 이해하지 못했어요.');
  }
  if (!parsed.data.success) {
    throw new ApiError(parsed.data.error);
  }
  return parsed.data.data;
}

export function createAnalysis(query: string): Promise<AnalysisJob> {
  return request('/v1/analyses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
}

export function getAnalysis(id: string): Promise<AnalysisJob> {
  return request(`/v1/analyses/${encodeURIComponent(id)}`);
}
