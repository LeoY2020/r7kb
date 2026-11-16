/** 与服务端交互的薄封装。 */
import type { ContentSnapshot, PublishStatus } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error || `请求失败（${response.status}）`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export type SessionInfo = {
  authed: boolean;
  configured: boolean;
  repo: string;
  webRepo: string;
  workBranch: string;
};

export const api = {
  session: () => request<SessionInfo>('/api/session'),
  login: (password: string) =>
    request<{ ok: true }>('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>('/api/logout', { method: 'POST' }),
  content: (refresh = false) =>
    request<ContentSnapshot>(`/api/content${refresh ? '?refresh=1' : ''}`),
  publish: (payload: {
    message: string;
    files: { path: string; text: string }[];
    uploads: { path: string; base64: string }[];
    deletions: string[];
  }) =>
    request<{
      ok: true;
      commit: { sha: string; html_url: string };
      dispatched: boolean;
      warning: string;
    }>('/api/publish', { method: 'POST', body: JSON.stringify(payload) }),
  publishStatus: () => request<PublishStatus>('/api/publish/status'),
};
