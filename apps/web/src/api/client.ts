import type { ApiError } from '@bastion/shared';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ApiRequestError';
  }
}

/**
 * Same-origin JSON requests to our API. Cookies are sent automatically
 * (HttpOnly session cookie — never readable from JavaScript).
 */
export async function api<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: hasBody ? { 'content-type': 'application/json' } : {},
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (data as Partial<ApiError> | null)?.error?.code ?? 'internal_error';
    throw new ApiRequestError(res.status, code);
  }
  return data as T;
}

const MESSAGES: Record<string, string> = {
  unauthorized: 'That didn’t work. Check what you entered and try again.',
  rate_limited: 'Too many attempts. For your security, please wait 15 minutes and try again.',
  validation_failed: 'Please check what you entered.',
  not_found: 'This link is invalid or has expired. Ask your admin for a new invitation.',
  conflict: 'This already exists.',
  forbidden: 'You don’t have permission to do that.',
};

/** Turns any error into a short, safe sentence for the user. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return MESSAGES[err.code] ?? 'Something went wrong. Please try again.';
  if (err instanceof DOMException && err.name === 'NotAllowedError') return 'The passkey request was cancelled.';
  return 'Something went wrong. Please check your connection and try again.';
}
